import { NextRequest, NextResponse } from 'next/server';
import { requireEntitlement, AuthError } from '@/lib/auth/guards';
import { getQuotations, createQuotation } from '@/lib/services/quotationService';
import { QuotationStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { business } = await requireEntitlement('canCreateQuotations');
    const { searchParams } = new URL(req.url);

    const search = searchParams.get('search') || undefined;
    const customerId = searchParams.get('customerId') || undefined;
    const status = (searchParams.get('status') as QuotationStatus) || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const quotations = await getQuotations(business.id, {
      search,
      customerId,
      status,
      startDate,
      endDate,
    });

    return NextResponse.json({
      success: true,
      quotations,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to fetch quotations.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { business } = await requireEntitlement('canCreateQuotations');
    const body = await req.json();

    const quotation = await createQuotation(business.id, body);

    return NextResponse.json(
      {
        success: true,
        quotation,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to create quotation.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
