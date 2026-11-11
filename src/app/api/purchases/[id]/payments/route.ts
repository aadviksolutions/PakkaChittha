import { NextRequest, NextResponse } from 'next/server';
import { requireGrowthAccess } from '@/lib/auth/guards';
import {
  recordSupplierPayment,
  updateSupplierPayment,
  deleteSupplierPayment,
} from '@/lib/services/purchaseService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business, session } = await requireGrowthAccess();
    const { id } = await params;
    const body = await req.json();

    const result = await recordSupplierPayment(
      business.id,
      {
        purchaseId: id,
        amount: body.amount,
        paymentMethod: body.paymentMethod,
        paymentDate: body.paymentDate,
        referenceNumber: body.referenceNumber,
        notes: body.notes,
        idempotencyKey: body.idempotencyKey,
      },
      session.user.name || 'Staff'
    );

    return NextResponse.json(
      {
        success: true,
        payment: result.payment,
        purchase: result.updatedPurchase,
        isDuplicate: result.isDuplicate,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record supplier payment.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireGrowthAccess();
    const { id } = await params;
    const body = await req.json();

    if (!body.paymentId) {
      return NextResponse.json(
        { success: false, error: 'Payment ID is required.' },
        { status: 400 }
      );
    }

    const result = await updateSupplierPayment(business.id, id, body.paymentId, {
      amount: body.amount,
      paymentMethod: body.paymentMethod,
      paymentDate: body.paymentDate,
      referenceNumber: body.referenceNumber,
      notes: body.notes,
    });

    return NextResponse.json({
      success: true,
      payment: result.payment,
      purchase: result.updatedPurchase,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update supplier payment.';
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
    const { business } = await requireGrowthAccess();
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

    const result = await deleteSupplierPayment(business.id, id, paymentId);

    return NextResponse.json({
      success: true,
      purchase: result.updatedPurchase,
      message: 'Supplier payment deleted and purchase balance updated.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete supplier payment.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
