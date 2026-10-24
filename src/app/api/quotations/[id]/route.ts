import { NextRequest, NextResponse } from 'next/server';
import { requireEntitlement, AuthError } from '@/lib/auth/guards';
import {
  getQuotationById,
  updateQuotation,
  deleteQuotation,
} from '@/lib/services/quotationService';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireEntitlement('canCreateQuotations');
    const { id } = await params;

    const quotation = await getQuotationById(business.id, id);

    if (!quotation) {
      return NextResponse.json({ success: false, error: 'Quotation not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      quotation,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to fetch quotation.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireEntitlement('canCreateQuotations');
    const { id } = await params;
    const body = await req.json();

    const updated = await updateQuotation(business.id, id, body);

    return NextResponse.json({
      success: true,
      quotation: updated,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to update quotation.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireEntitlement('canCreateQuotations');
    const { id } = await params;

    await deleteQuotation(business.id, id);

    return NextResponse.json({
      success: true,
      message: 'Quotation deleted successfully.',
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to delete quotation.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
