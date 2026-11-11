import { NextRequest, NextResponse } from 'next/server';
import { requireGrowthAccess } from '@/lib/auth/guards';
import {
  getPurchaseById,
  updatePurchase,
  deletePurchase,
} from '@/lib/services/purchaseService';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireGrowthAccess();
    const { id } = await params;

    const purchase = await getPurchaseById(business.id, id);

    if (!purchase) {
      return NextResponse.json({ success: false, error: 'Purchase not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      purchase,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch purchase.';
    const status = message.includes('Authentication') ? 401 : message.includes('Access Denied') || message.includes('Feature not available') ? 403 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business, session } = await requireGrowthAccess();
    const { id } = await params;
    const body = await req.json();

    const purchase = await updatePurchase(
      business.id,
      id,
      body,
      session.user.name || 'Staff'
    );
    return NextResponse.json({ success: true, purchase });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update purchase.';
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
    const { business, session } = await requireGrowthAccess();
    const { id } = await params;

    const result = await deletePurchase(
      business.id,
      id,
      session.user.name || 'Staff'
    );
    return NextResponse.json({
      success: true,
      ...result,
      message: `Purchase ${result.purchaseNumber} deleted successfully.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete purchase.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
