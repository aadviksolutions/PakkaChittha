import { NextRequest, NextResponse } from 'next/server';
import { requireCommercialAccess, NON_VIEWER_ROLES, AuthError } from '@/lib/auth/guards';
import { getCustomers, createCustomer } from '@/lib/services/customerService';

export async function GET(req: NextRequest) {
  try {
    const { business } = await requireCommercialAccess();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const lightweight = searchParams.get('lightweight') === 'true' || searchParams.get('mode') === 'selector';
    const limitParam = searchParams.get('limit');
    const pageParam = searchParams.get('page');
    const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10)), 100) : undefined;
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
    const offset = limit && page ? (page - 1) * limit : undefined;

    const customers = await getCustomers(business.id, search, { lightweight, limit, offset });

    return NextResponse.json({
      success: true,
      customers,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to fetch customers.';
    const status = message.includes('Authentication') ? 401 : message.includes('Access Denied') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { business } = await requireCommercialAccess(undefined, NON_VIEWER_ROLES);
    const body = await req.json();

    const customer = await createCustomer(business.id, body);

    return NextResponse.json(
      {
        success: true,
        customer,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to create customer.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
