import { NextRequest, NextResponse } from 'next/server';
import { requireGrowthAccess } from '@/lib/auth/guards';
import { receivePurchase } from '@/lib/services/purchaseService';
import { autoPostPurchaseVoucher } from '@/lib/accounting';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business, session } = await requireGrowthAccess();
    const { id } = await params;

    const purchase = await receivePurchase(business.id, id, session.user.name || 'Staff');

    try {
      await autoPostPurchaseVoucher(purchase.id, business.id, undefined, session.user.id);
    } catch (autoErr) {
      console.error('[autoPostPurchaseVoucher] Non-blocking hook error:', autoErr);
    }

    return NextResponse.json({
      success: true,
      purchase,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to receive purchase.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
