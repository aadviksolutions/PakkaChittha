import { NextRequest, NextResponse } from 'next/server';
import { requireGrowthAccess, AuthError } from '@/lib/auth/guards';
import { getSupplierById, updateSupplier, deleteSupplier } from '@/lib/services/supplierService';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireGrowthAccess();
    const { id } = await params;

    const supplier = await getSupplierById(business.id, id);

    if (!supplier) {
      return NextResponse.json({ success: false, error: 'Supplier not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      supplier,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch supplier.';
    const status = message.includes('Authentication') ? 401 : message.includes('Access Denied') || message.includes('Feature not available') ? 403 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
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

    const updated = await updateSupplier(business.id, id, {
      name: body.name,
      phone: body.phone,
      email: body.email,
      address: body.address,
      gstin: body.gstin,
      openingBalance: body.openingBalance,
      notes: body.notes,
    });

    return NextResponse.json({
      success: true,
      supplier: updated,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to update supplier.';
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
    const { business } = await requireGrowthAccess();
    const { id } = await params;

    const result = await deleteSupplier(business.id, id);

    return NextResponse.json({
      success: true,
      ...result,
      message: `Supplier "${result.name}" deleted successfully.`,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to delete supplier.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
