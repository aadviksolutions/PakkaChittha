import prisma from '@/lib/prisma';
import { PaymentMethod } from '@prisma/client';
import { createKhataTransaction } from '@/lib/services/khataService';
import { recordPayment } from '@/lib/services/paymentService';
import { recordSupplierPayment } from '@/lib/services/purchaseService';
import { autoPostExpenseVoucher, autoPostPaymentVoucher, autoPostSupplierPaymentVoucher } from '@/lib/accounting';
import { VoiceTransactionType, VoicePaymentMode } from '@/lib/voice/smartVoiceParser';

export interface SaveVoiceTransactionInput {
  type: VoiceTransactionType;
  amount: number;
  partyName?: string | null;
  partyId?: string | null;
  partyType?: 'CUSTOMER' | 'SUPPLIER' | 'KHATA_CONTACT' | null;
  paymentMode: VoicePaymentMode;
  date?: string | Date;
  category?: string | null;
  description?: string | null;
  notes?: string | null;
  idempotencyKey?: string | null;
}

export async function executeVoiceTransaction(
  businessId: string,
  userId: string,
  input: SaveVoiceTransactionInput
) {
  const amount = Number(input.amount);
  if (!amount || isNaN(amount) || amount <= 0) {
    throw new Error('Valid transaction amount is required.');
  }

  const txDate = input.date ? new Date(input.date) : new Date();

  // Map voice payment mode to Prisma PaymentMethod
  let method: PaymentMethod = PaymentMethod.CASH;
  if (input.paymentMode === 'UPI') method = PaymentMethod.UPI;
  else if (input.paymentMode === 'BANK') method = PaymentMethod.BANK_TRANSFER;

  // 1. EXPENSE TRANSACTION
  if (input.type === 'EXPENSE') {
    const categoryName = input.category || 'General Expense';
    const payee = input.partyName || 'General Outlay';

    const expense = await prisma.expense.create({
      data: {
        businessId,
        category: categoryName,
        payee,
        amount,
        paymentMethod: method,
        expenseDate: txDate,
        notes: input.description || input.notes || 'Voice Expense Entry',
      },
    });

    // Auto-post double entry voucher if available
    try {
      await autoPostExpenseVoucher(expense.id, businessId, undefined, userId);
    } catch (err) {
      console.warn('[executeVoiceTransaction] Non-blocking expense voucher notice:', err);
    }

    return {
      success: true,
      kind: 'EXPENSE',
      recordId: expense.id,
      message: `Expense of ₹${amount.toLocaleString('en-IN')} recorded successfully under ${categoryName}.`,
    };
  }

  // 2. PAYMENT RECEIVED (From Customer / Khata)
  if (input.type === 'PAYMENT_RECEIVED') {
    // If partyId is a Commercial Customer, check if they have any pending unpaid invoices
    if (input.partyType === 'CUSTOMER' && input.partyId) {
      const oldestUnpaidInvoice = await prisma.invoice.findFirst({
        where: {
          businessId,
          customerId: input.partyId,
          status: { in: ['UNPAID', 'PARTIAL'] },
          balanceDue: { gt: 0 },
        },
        orderBy: { invoiceDate: 'asc' },
      });

      if (oldestUnpaidInvoice) {
        const paymentRes = await recordPayment(businessId, {
          invoiceId: oldestUnpaidInvoice.id,
          amount: Math.min(amount, oldestUnpaidInvoice.balanceDue),
          paymentMethod: method,
          paymentDate: txDate,
          notes: input.description || `Voice Payment Received against ${oldestUnpaidInvoice.invoiceNumber}`,
          idempotencyKey: input.idempotencyKey,
        });

        if (paymentRes.payment?.id) {
          try {
            await autoPostPaymentVoucher(paymentRes.payment.id, businessId, undefined, userId);
          } catch (autoErr) {
            console.warn('[executeVoiceTransaction] Voucher notice:', autoErr);
          }
        }

        return {
          success: true,
          kind: 'CUSTOMER_PAYMENT',
          recordId: paymentRes.payment.id,
          message: `Payment of ₹${amount.toLocaleString('en-IN')} applied to Invoice ${oldestUnpaidInvoice.invoiceNumber}.`,
        };
      }
    }

    // Otherwise record as Khata Transaction (RECEIVED)
    const khataTx = await createKhataTransaction(businessId, userId, {
      contactId: input.partyType === 'KHATA_CONTACT' && input.partyId ? input.partyId : undefined,
      personName: input.partyName || 'Customer',
      type: 'RECEIVED',
      amount,
      date: txDate,
      paymentMode: method,
      description: input.description || 'Voice Payment Received',
    });

    return {
      success: true,
      kind: 'KHATA_RECEIVED',
      recordId: khataTx.id,
      message: `Payment of ₹${amount.toLocaleString('en-IN')} received and recorded in ledger.`,
    };
  }

  // 3. PAYMENT GIVEN (To Supplier / Khata)
  if (input.type === 'PAYMENT_GIVEN') {
    // If partyId is a Commercial Supplier, check if they have any pending purchases
    if (input.partyType === 'SUPPLIER' && input.partyId) {
      const oldestUnpaidPurchase = await prisma.purchase.findFirst({
        where: {
          businessId,
          supplierId: input.partyId,
          status: 'RECEIVED',
          balanceDue: { gt: 0 },
        },
        orderBy: { purchaseDate: 'asc' },
      });

      if (oldestUnpaidPurchase) {
        const supPaymentRes = await recordSupplierPayment(
          businessId,
          {
            purchaseId: oldestUnpaidPurchase.id,
            amount: Math.min(amount, oldestUnpaidPurchase.balanceDue),
            paymentMethod: method,
            paymentDate: txDate,
            notes: input.description || `Voice Supplier Payment for ${oldestUnpaidPurchase.purchaseNumber}`,
            idempotencyKey: input.idempotencyKey,
          },
          'Voice Entry'
        );

        if (supPaymentRes.payment?.id) {
          try {
            await autoPostSupplierPaymentVoucher(supPaymentRes.payment.id, businessId, undefined, userId);
          } catch (autoErr) {
            console.warn('[executeVoiceTransaction] Voucher notice:', autoErr);
          }
        }

        return {
          success: true,
          kind: 'SUPPLIER_PAYMENT',
          recordId: supPaymentRes.payment.id,
          message: `Payment of ₹${amount.toLocaleString('en-IN')} recorded for Supplier against ${oldestUnpaidPurchase.purchaseNumber}.`,
        };
      }
    }

    // Otherwise record as Khata Transaction (GAVE)
    const khataTx = await createKhataTransaction(businessId, userId, {
      contactId: input.partyType === 'KHATA_CONTACT' && input.partyId ? input.partyId : undefined,
      personName: input.partyName || 'Supplier / Contact',
      type: 'GAVE',
      amount,
      date: txDate,
      paymentMode: method,
      description: input.description || 'Voice Payment Given',
    });

    return {
      success: true,
      kind: 'KHATA_GAVE',
      recordId: khataTx.id,
      message: `Payment of ₹${amount.toLocaleString('en-IN')} paid and recorded in ledger.`,
    };
  }

  // 4. TO RECEIVE / UDHAAR DIYA
  if (input.type === 'TO_RECEIVE') {
    const khataTx = await createKhataTransaction(businessId, userId, {
      contactId: input.partyType === 'KHATA_CONTACT' && input.partyId ? input.partyId : undefined,
      personName: input.partyName || 'Customer',
      type: 'GAVE', // GAVE in Khata = You gave goods/money, you will get back
      amount,
      date: txDate,
      paymentMode: method,
      description: input.description || 'Voice Udhar / Money to Receive',
    });

    return {
      success: true,
      kind: 'KHATA_GAVE',
      recordId: khataTx.id,
      message: `Udhaar of ₹${amount.toLocaleString('en-IN')} to receive from ${input.partyName || 'party'} recorded.`,
    };
  }

  // 5. TO PAY / UDHAAR LIYA
  if (input.type === 'TO_PAY') {
    const khataTx = await createKhataTransaction(businessId, userId, {
      contactId: input.partyType === 'KHATA_CONTACT' && input.partyId ? input.partyId : undefined,
      personName: input.partyName || 'Supplier',
      type: 'RECEIVED', // RECEIVED in Khata = You received goods/credit, you will give back
      amount,
      date: txDate,
      paymentMode: method,
      description: input.description || 'Voice Udhar / Money to Pay',
    });

    return {
      success: true,
      kind: 'KHATA_RECEIVED',
      recordId: khataTx.id,
      message: `Udhaar of ₹${amount.toLocaleString('en-IN')} to pay to ${input.partyName || 'party'} recorded.`,
    };
  }

  // 6. PURCHASE ENTRY
  if (input.type === 'PURCHASE') {
    // Record as Khata transaction (GAVE / Money owed or payment) or purchase outlay
    const khataTx = await createKhataTransaction(businessId, userId, {
      contactId: input.partyType === 'KHATA_CONTACT' && input.partyId ? input.partyId : undefined,
      personName: input.partyName || 'Supplier',
      type: 'RECEIVED',
      amount,
      date: txDate,
      paymentMode: method,
      description: input.description || 'Voice Purchase Entry',
    });

    return {
      success: true,
      kind: 'PURCHASE',
      recordId: khataTx.id,
      message: `Purchase of ₹${amount.toLocaleString('en-IN')} recorded in ledger.`,
    };
  }

  // 7. SALE ENTRY
  if (input.type === 'SALE') {
    const khataTx = await createKhataTransaction(businessId, userId, {
      contactId: input.partyType === 'KHATA_CONTACT' && input.partyId ? input.partyId : undefined,
      personName: input.partyName || 'Customer',
      type: 'GAVE',
      amount,
      date: txDate,
      paymentMode: method,
      description: input.description || 'Voice Sale Entry',
    });

    return {
      success: true,
      kind: 'SALE',
      recordId: khataTx.id,
      message: `Sale of ₹${amount.toLocaleString('en-IN')} recorded in ledger.`,
    };
  }

  throw new Error(`Unsupported voice transaction type: ${input.type}`);
}

