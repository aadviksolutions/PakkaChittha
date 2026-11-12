import { NextRequest, NextResponse } from 'next/server';
import {
  AuthError,
  TenantIsolationError,
  requireScaleErpAccess,
} from '@/lib/auth/guards';
import {
  PERMISSIONS,
  createApprovalRequest,
  isOwnerRole,
  parseIndianFyCode,
} from '@/lib/rbac';
import {
  executeFinancialYearClosing,
  getClosingPreview,
  lockAccountingPeriod,
  reopenFinancialYear,
} from '@/lib/accounting';

export const dynamic = 'force-dynamic';

type ClosingAction =
  | 'REQUEST_CLOSE'
  | 'REQUEST_LOCK'
  | 'CLOSE_FY'
  | 'LOCK_PERIOD'
  | 'REOPEN_FY';

const VALID_ACTIONS: ClosingAction[] = [
  'REQUEST_CLOSE',
  'REQUEST_LOCK',
  'CLOSE_FY',
  'LOCK_PERIOD',
  'REOPEN_FY',
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBusinessId = searchParams.get('businessId') || undefined;
    const fyCode = parseIndianFyCode(searchParams.get('fyCode')).code;

    const { business } = await requireScaleErpAccess(
      requestedBusinessId,
      PERMISSIONS.ACCOUNTING_VIEW
    );

    const preview = await getClosingPreview(business.id, fyCode);

    return NextResponse.json({
      success: true,
      erpRole: business.erpRole,
      canExecuteClosing: isOwnerRole(business.erpRole),
      preview,
    });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[GET /api/accounting/closing] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load closing preview.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const requestedBusinessId =
      typeof body?.businessId === 'string' ? body.businessId : undefined;
    const action = body?.action as ClosingAction | undefined;
    const fyCode = parseIndianFyCode(
      typeof body?.fyCode === 'string' ? body.fyCode : undefined
    ).code;
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : undefined;

    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: 'Valid closing action is required.' },
        { status: 400 }
      );
    }

    if (action === 'REQUEST_CLOSE' || action === 'REQUEST_LOCK') {
      const { business, session } = await requireScaleErpAccess(
        requestedBusinessId,
        PERMISSIONS.ACCOUNTING_PERIOD_CLOSE
      );

      let lockedUntilStr: string | undefined;
      if (action === 'REQUEST_LOCK') {
        const rawDate = typeof body?.lockedUntil === 'string' ? body.lockedUntil.trim() : '';
        const parsed = new Date(rawDate);
        if (!rawDate || Number.isNaN(parsed.getTime())) {
          return NextResponse.json(
            { error: 'Valid lockedUntil date (YYYY-MM-DD) is required for period lock request.' },
            { status: 400 }
          );
        }
        lockedUntilStr = parsed.toISOString().slice(0, 10);
      }

      const approval = await createApprovalRequest({
        businessId: business.id,
        requestType: action === 'REQUEST_CLOSE' ? 'YEAR_END_CLOSING' : 'PERIOD_LOCK',
        entityType: 'FinancialYear',
        entityId: fyCode,
        title:
          action === 'REQUEST_CLOSE'
            ? `Year-End Closing for ${fyCode}`
            : `Lock Accounting Period up to ${lockedUntilStr} (${fyCode})`,
        summary: reason || null,
        payload: lockedUntilStr ? { fyCode, lockedUntil: lockedUntilStr } : { fyCode },
        requestedByUserId: session.user.id,
        actorEmail: session.user.email,
        actorName: session.user.name,
        actorRole: business.erpRole,
      });

      return NextResponse.json({ success: true, approval }, { status: 201 });
    }

    const { business, session } = await requireScaleErpAccess(
      requestedBusinessId,
      PERMISSIONS.ACCOUNTING_PERIOD_CLOSE,
      ['BUSINESS_OWNER', 'OWNER']
    );

    if (action === 'CLOSE_FY') {
      const result = await executeFinancialYearClosing({
        businessId: business.id,
        fyCode,
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        actorName: session.user.name,
        actorRole: business.erpRole,
        reason,
      });
      return NextResponse.json({ success: true, result });
    }

    if (action === 'LOCK_PERIOD') {
      const rawDate = typeof body?.lockedUntil === 'string' ? body.lockedUntil.trim() : '';
      const lockedUntil = new Date(rawDate);
      if (!rawDate || Number.isNaN(lockedUntil.getTime())) {
        return NextResponse.json(
          { error: 'Valid lockedUntil date (YYYY-MM-DD) is required.' },
          { status: 400 }
        );
      }
      const result = await lockAccountingPeriod({
        businessId: business.id,
        fyCode,
        lockedUntil,
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        actorName: session.user.name,
        actorRole: business.erpRole,
        reason,
      });
      return NextResponse.json({ success: true, financialYear: result });
    }

    const result = await reopenFinancialYear({
      businessId: business.id,
      fyCode,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      actorName: session.user.name,
      actorRole: business.erpRole,
      reason,
    });
    return NextResponse.json({ success: true, financialYear: result });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to execute closing action.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
