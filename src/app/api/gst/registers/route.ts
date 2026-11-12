import { NextRequest, NextResponse } from 'next/server';
import {
  AuthError,
  TenantIsolationError,
  requireScaleErpAccess,
} from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/rbac';
import {
  ALLOWED_ITC_ELIGIBILITY,
  ItcEligibilityCode,
  getPurchaseItcRegister,
  getSalesTaxRegister,
  updatePurchaseItcEligibility,
} from '@/lib/gst';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBusinessId = searchParams.get('businessId') || undefined;
    const type = searchParams.get('type') || 'sales';
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');

    const month = monthParam ? parseInt(monthParam, 10) : null;
    const year = yearParam ? parseInt(yearParam, 10) : null;

    const { business } = await requireScaleErpAccess(
      requestedBusinessId,
      PERMISSIONS.GST_VIEW
    );

    if (type === 'purchase') {
      const register = await getPurchaseItcRegister(
        business.id,
        month && !Number.isNaN(month) ? month : null,
        year && !Number.isNaN(year) ? year : null
      );
      return NextResponse.json({ success: true, type: 'purchase', register });
    }

    const register = await getSalesTaxRegister(
      business.id,
      month && !Number.isNaN(month) ? month : null,
      year && !Number.isNaN(year) ? year : null
    );
    return NextResponse.json({ success: true, type: 'sales', register });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[GET /api/gst/registers] Error:', error);
    return NextResponse.json({ error: 'Failed to load GST register.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const requestedBusinessId =
      typeof body?.businessId === 'string' ? body.businessId : undefined;
    const purchaseId = typeof body?.purchaseId === 'string' ? body.purchaseId.trim() : '';
    const itcEligibility = body?.itcEligibility as ItcEligibilityCode | undefined;

    if (
      !purchaseId ||
      !itcEligibility ||
      !ALLOWED_ITC_ELIGIBILITY.includes(itcEligibility)
    ) {
      return NextResponse.json(
        { error: 'Valid purchaseId and itcEligibility classification are required.' },
        { status: 400 }
      );
    }

    const { business, session } = await requireScaleErpAccess(
      requestedBusinessId,
      PERMISSIONS.GST_RECONCILE
    );

    const updated = await updatePurchaseItcEligibility({
      businessId: business.id,
      purchaseId,
      itcEligibility,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      actorName: session.user.name,
      actorRole: business.erpRole,
    });

    return NextResponse.json({ success: true, purchase: updated });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const msg = error instanceof Error ? error.message : 'Failed to update ITC eligibility.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
