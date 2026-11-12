import { NextRequest, NextResponse } from 'next/server';
import {
  AuthError,
  TenantIsolationError,
  requireScaleErpAccess,
} from '@/lib/auth/guards';
import { PERMISSIONS, listAuditEvents } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBusinessId = searchParams.get('businessId') || undefined;
    const entityType = searchParams.get('entityType') || undefined;
    const action = searchParams.get('action') || undefined;
    const limit = Number(searchParams.get('limit') || '50');
    const offset = Number(searchParams.get('offset') || '0');

    const { business } = await requireScaleErpAccess(
      requestedBusinessId,
      PERMISSIONS.AUDIT_VIEW
    );

    const data = await listAuditEvents({
      businessId: business.id,
      entityType,
      action,
      limit: Number.isFinite(limit) ? limit : 50,
      offset: Number.isFinite(offset) ? offset : 0,
    });

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[GET /api/audit] Error:', error);
    return NextResponse.json({ error: 'Failed to load audit trail' }, { status: 500 });
  }
}

