import { NextRequest, NextResponse } from 'next/server';
import { requireCommercialAccess, AuthError } from '@/lib/auth/guards';
import { convertQuotationToInvoice } from '@/lib/services/quotationService';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business, session } = await requireCommercialAccess();
    const { id } = await params;

    const result = await convertQuotationToInvoice(
      business.id,
      session.user.id,
      id
    );

    return NextResponse.json({
      success: true,
      message: `Quotation successfully converted to Invoice ${result.invoice.invoiceNumber}.`,
      invoice: result.invoice,
      quotation: result.quotation,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to convert quotation to invoice.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
