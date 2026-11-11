import { NextRequest, NextResponse } from 'next/server';
import { requireCommercialAccess, AuthError } from '@/lib/auth/guards';
import { getCustomerById, updateCustomer, deleteCustomer } from '@/lib/services/customerService';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireCommercialAccess();
    const { id } = await params;

    const customer = await getCustomerById(business.id, id);

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      customer,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to retrieve customer.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
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

    const customer = await updateCustomer(business.id, id, body);

    return NextResponse.json({
      success: true,
      customer,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to update customer.';
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
    const { business } = await requireCommercialAccess();
    const { id } = await params;

    const result = await deleteCustomer(business.id, id);

    return NextResponse.json({
      success: true,
      ...result,
      message: `Customer "${result.name}" deleted successfully.`,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to delete customer.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
