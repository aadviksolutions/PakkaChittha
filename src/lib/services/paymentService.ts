import prisma from '@/lib/prisma';
import { round2 } from '@/lib/billing/calculator';
import { InvoiceStatus, PaymentMethod } from '@prisma/client';

export interface RecordPaymentInput {
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate?: string | Date;
  referenceNumber?: string | null;
  notes?: string | null;
  idempotencyKey?: string | null;
}

/**
 * Records an invoice payment in an atomic transaction.
 * Supports partial payments and prevents duplicate submissions via idempotency keys.
 */
export async function recordPayment(businessId: string, input: RecordPaymentInput) {
  const payAmount = round2(Number(input.amount));

  if (payAmount <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }

  // Idempotency check: if key supplied, check if already recorded
  if (input.idempotencyKey) {
    const existingPayment = await prisma.payment.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existingPayment) {
      const currentInvoice = await prisma.invoice.findFirstOrThrow({
        where: { id: existingPayment.invoiceId, businessId },
      });
      return {
        payment: existingPayment,
        updatedInvoice: currentInvoice,
        isDuplicate: true,
      };
    }
  }

  return prisma.$transaction(async (tx) => {
    // 1. Fetch target invoice with tenant verification
    const invoice = await tx.invoice.findFirst({
      where: { id: input.invoiceId, businessId },
    });

    if (!invoice) {
      throw new Error('Invoice not found or unauthorized.');
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new Error('Cannot record payments on a cancelled invoice.');
    }

    if (invoice.status === InvoiceStatus.PAID || invoice.balanceDue <= 0) {
      throw new Error('This invoice is already fully paid.');
    }

    if (payAmount > invoice.balanceDue) {
      throw new Error(
        `Payment amount (₹${payAmount}) exceeds invoice balance due (₹${invoice.balanceDue}).`
      );
    }

    // 2. Create Payment record
    const payment = await tx.payment.create({
      data: {
        businessId,
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        amount: payAmount,
        paymentDate: input.paymentDate ? new Date(input.paymentDate) : new Date(),
        paymentMethod: input.paymentMethod || PaymentMethod.CASH,
        referenceNumber: input.referenceNumber?.trim() || null,
        notes: input.notes?.trim() || null,
        idempotencyKey: input.idempotencyKey?.trim() || null,
      },
    });

    // 3. Update invoice financial balance and payment status
    const newPaidAmount = round2(invoice.paidAmount + payAmount);
    const newBalanceDue = round2(Math.max(0, invoice.total - newPaidAmount));
    const newStatus: InvoiceStatus =
      newBalanceDue <= 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIAL;

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: newPaidAmount,
        balanceDue: newBalanceDue,
        status: newStatus,
      },
    });

    return {
      payment,
      updatedInvoice,
      isDuplicate: false,
    };
  });
}

async function recomputeInvoiceBalance(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  invoiceId: string,
  invoiceTotal: number,
  currentStatus: InvoiceStatus
) {
  const allPayments = await tx.payment.findMany({
    where: { invoiceId },
    select: { amount: true },
  });
  const paidAmount = round2(allPayments.reduce((sum, p) => sum + p.amount, 0));
  const balanceDue = round2(Math.max(0, invoiceTotal - paidAmount));
  const status: InvoiceStatus =
    currentStatus === InvoiceStatus.CANCELLED
      ? InvoiceStatus.CANCELLED
      : currentStatus === InvoiceStatus.DRAFT && paidAmount === 0
      ? InvoiceStatus.DRAFT
      : balanceDue <= 0
      ? InvoiceStatus.PAID
      : paidAmount > 0
      ? InvoiceStatus.PARTIAL
      : InvoiceStatus.UNPAID;

  return tx.invoice.update({
    where: { id: invoiceId },
    data: { paidAmount, balanceDue, status },
  });
}

export async function updatePayment(
  businessId: string,
  invoiceId: string,
  paymentId: string,
  input: {
    amount?: number;
    paymentMethod?: PaymentMethod;
    paymentDate?: string | Date;
    referenceNumber?: string | null;
    notes?: string | null;
  }
) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { id: paymentId, invoiceId, businessId },
      include: { invoice: true },
    });

    if (!payment) {
      throw new Error('Payment record not found or unauthorized.');
    }

    if (payment.invoice.status === InvoiceStatus.CANCELLED) {
      throw new Error('Cannot modify payments on a cancelled invoice.');
    }

    const newAmount =
      input.amount !== undefined ? round2(Number(input.amount)) : payment.amount;
    if (isNaN(newAmount) || newAmount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    const otherPayments = await tx.payment.findMany({
      where: { invoiceId, id: { not: paymentId } },
      select: { amount: true },
    });
    const otherPaid = round2(otherPayments.reduce((sum, p) => sum + p.amount, 0));

    if (otherPaid + newAmount > payment.invoice.total + 0.01) {
      const maxAllowed = round2(Math.max(0, payment.invoice.total - otherPaid));
      throw new Error(
        `Updated payment (₹${newAmount}) exceeds remaining invoice balance (max ₹${maxAllowed}).`
      );
    }

    const updatedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        amount: newAmount,
        paymentMethod: input.paymentMethod || payment.paymentMethod,
        paymentDate: input.paymentDate ? new Date(input.paymentDate) : payment.paymentDate,
        referenceNumber:
          input.referenceNumber !== undefined
            ? input.referenceNumber?.trim() || null
            : payment.referenceNumber,
        notes:
          input.notes !== undefined ? input.notes?.trim() || null : payment.notes,
      },
    });

    const updatedInvoice = await recomputeInvoiceBalance(
      tx,
      invoiceId,
      payment.invoice.total,
      payment.invoice.status
    );

    return { payment: updatedPayment, updatedInvoice };
  });
}

export async function deletePayment(
  businessId: string,
  invoiceId: string,
  paymentId: string
) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { id: paymentId, invoiceId, businessId },
      include: { invoice: true },
    });

    if (!payment) {
      throw new Error('Payment record not found or unauthorized.');
    }

    await tx.payment.delete({ where: { id: paymentId } });

    const updatedInvoice = await recomputeInvoiceBalance(
      tx,
      invoiceId,
      payment.invoice.total,
      payment.invoice.status
    );

    return { updatedInvoice };
  });
}
