import { NextRequest, NextResponse } from 'next/server';
import { requireCommercialAccess, AuthError } from '@/lib/auth/guards';
import {
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
} from '@/lib/services/invoiceService';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireCommercialAccess();
    const { id } = await params;

    const invoice = await getInvoiceById(business.id, id);

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      invoice,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to retrieve invoice.';
    const status = message.includes('Authentication') ? 401 : message.includes('Access Denied') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business, session } = await requireCommercialAccess();
    const { id } = await params;
    const body = await req.json();

    const invoice = await updateInvoice(business.id, session.user.name || session.user.id, id, body);
    return NextResponse.json({ success: true, invoice });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to update invoice.';
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
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business, session } = await requireCommercialAccess();
    const { id } = await params;

    const result = await deleteInvoice(business.id, session.user.name || session.user.id, id);
    return NextResponse.json({
      success: true,
      ...result,
      message: `Invoice ${result.invoiceNumber} deleted successfully.`,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to delete invoice.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
