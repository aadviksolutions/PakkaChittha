import { NextRequest, NextResponse } from 'next/server';
import { requireCommercialAccess, NON_VIEWER_ROLES, AuthError } from '@/lib/auth/guards';
import prisma from '@/lib/prisma';
import { createInvoice } from '@/lib/services/invoiceService';
import { autoPostSalesVoucher, autoPostPaymentVoucher } from '@/lib/accounting';
import { LineItemInput, GstType } from '@/lib/billing/calculator';
import { PaymentMethod } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { business, session } = await requireCommercialAccess(undefined, NON_VIEWER_ROLES);
    const body = await req.json();

    let targetCustomerId = body.customerId;

    // If customerId is not provided, look up or create customer by name
    if (!targetCustomerId) {
      const partyName = body.customerName?.trim();
      if (!partyName) {
        throw new Error('Customer name or customer ID is required to generate an invoice.');
      }

      // Check if existing customer matches
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          businessId: business.id,
          name: { equals: partyName, mode: 'insensitive' },
        },
      });

      if (existingCustomer) {
        targetCustomerId = existingCustomer.id;
      } else {
        // Create new customer record
        const newCustomer = await prisma.customer.create({
          data: {
            businessId: business.id,
            name: partyName,
            mobile: body.customerMobile?.trim() || '',
            openingBalance: 0,
            notes: 'Created via Voice Entry',
          },
        });
        targetCustomerId = newCustomer.id;
      }
    }

    const rawItems = body.items || [];
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw new Error('At least one item is required to generate an invoice.');
    }

    const items: LineItemInput[] = rawItems.map((it: any) => ({
      productId: it.productId || null,
      description: it.name || it.description || 'Item',
      quantity: Math.max(0.01, Number(it.quantity) || 1),
      unit: it.unit || 'Pcs',
      rate: Math.max(0, Number(it.rate) || 0),
      discount: Math.max(0, Number(it.discount) || 0),
      discountType: it.discountType || 'AMOUNT',
      taxRate: Math.max(0, Number(it.taxRate) || 0),
      hsnCode: it.hsnCode || null,
    }));

    // Map payment method
    let paymentMethod: PaymentMethod = PaymentMethod.CASH;
    if (body.paymentMode === 'UPI') paymentMethod = PaymentMethod.UPI;
    else if (body.paymentMode === 'BANK') paymentMethod = PaymentMethod.BANK_TRANSFER;

    const paidAmount = Math.max(0, Number(body.paidAmount || body.cashReceived || 0));

    // Calculate due date (default: 15 days from today)
    const today = new Date();
    const dueDate = body.dueDate ? new Date(body.dueDate) : new Date(today.getTime() + 15 * 86400000);

    const invoice = await createInvoice(business.id, session.user.id, {
      customerId: targetCustomerId,
      dueDate,
      gstType: (body.gstType as GstType) || 'CGST_SGST',
      isTaxInclusive: false,
      isGstInvoice: body.isGstInvoice ?? true,
      items,
      paidAmount,
      paymentMethod,
      notes: body.notes || 'Created via Smart Voice Entry',
      termsAndConditions: '1. Goods once sold will not be taken back.\n2. Subject to local jurisdiction.',
    });

    // Auto-post double entry vouchers
    try {
      await autoPostSalesVoucher(invoice.id, business.id, undefined, session.user.id);
      if (invoice.paidAmount > 0) {
        const initPayments = await prisma.payment.findMany({
          where: { invoiceId: invoice.id },
          select: { id: true },
        });
        for (const p of initPayments) {
          await autoPostPaymentVoucher(p.id, business.id, undefined, session.user.id);
        }
      }
    } catch (autoErr) {
      console.warn('[VoiceInvoice] Non-blocking auto-post voucher notice:', autoErr);
    }

    return NextResponse.json({
      success: true,
      invoice,
      message: `Invoice #${invoice.invoiceNumber} created successfully!`,
    }, { status: 201 });

  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to create voice invoice.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
