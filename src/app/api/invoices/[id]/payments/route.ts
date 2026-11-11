import { NextRequest, NextResponse } from 'next/server';
import { requireCommercialAccess, AuthError } from '@/lib/auth/guards';
import {
  recordPayment,
  updatePayment,
  deletePayment,
} from '@/lib/services/paymentService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireCommercialAccess();
    const { id } = await params;
    const body = await req.json();

    const result = await recordPayment(business.id, {
      invoiceId: id,
      amount: body.amount,
      paymentMethod: body.paymentMethod,
      paymentDate: body.paymentDate,
      referenceNumber: body.referenceNumber,
      notes: body.notes,
      idempotencyKey: body.idempotencyKey,
    });

    return NextResponse.json(
      {
        success: true,
        payment: result.payment,
        invoice: result.updatedInvoice,
        isDuplicate: result.isDuplicate,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to record payment.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireCommercialAccess();
    const { id } = await params;
    const body = await req.json();

    if (!body.paymentId) {
      return NextResponse.json(
        { success: false, error: 'Payment ID is required.' },
        { status: 400 }
      );
    }

    const result = await updatePayment(business.id, id, body.paymentId, {
      amount: body.amount,
      paymentMethod: body.paymentMethod,
      paymentDate: body.paymentDate,
      referenceNumber: body.referenceNumber,
      notes: body.notes,
    });

    return NextResponse.json({
      success: true,
      payment: result.payment,
      invoice: result.updatedInvoice,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to update payment.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PUT(req, context);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireCommercialAccess();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    let paymentId = searchParams.get('paymentId');

    if (!paymentId) {
      try {
        const body = await req.json();
        paymentId = body.paymentId;
      } catch {
        // Ignore empty body
      }
    }

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: 'Payment ID is required.' },
        { status: 400 }
      );
    }

    const result = await deletePayment(business.id, id, paymentId);

    return NextResponse.json({
      success: true,
      invoice: result.updatedInvoice,
      message: 'Payment deleted and invoice balance updated.',
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to delete payment.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
