import { NextRequest, NextResponse } from 'next/server';
import { ApprovalStatus } from '@prisma/client';
import {
  AuthError,
  TenantIsolationError,
  requireScaleErpAccess,
} from '@/lib/auth/guards';
import {
  PERMISSIONS,
  createApprovalRequest,
  decideApprovalRequest,
  listApprovalRequests,
} from '@/lib/rbac';
import {
  executeFinancialYearClosing,
  lockAccountingPeriod,
} from '@/lib/accounting';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBusinessId = searchParams.get('businessId') || undefined;
    const rawStatus = searchParams.get('status') as ApprovalStatus | null;

    const { business } = await requireScaleErpAccess(
      requestedBusinessId,
      PERMISSIONS.ACCOUNTING_VIEW
    );

    const status =
      rawStatus && Object.values(ApprovalStatus).includes(rawStatus) ? rawStatus : undefined;
    const approvals = await listApprovalRequests(business.id, status);

    return NextResponse.json({
      success: true,
      canDecide: business.erpRole === 'OWNER',
      approvals,
    });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[GET /api/approvals] Error:', error);
    return NextResponse.json({ error: 'Failed to load approvals' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const requestedBusinessId =
      typeof body?.businessId === 'string' ? body.businessId : undefined;

    const { business, session } = await requireScaleErpAccess(
      requestedBusinessId,
      PERMISSIONS.APPROVAL_REQUEST
    );

    const requestType = typeof body?.requestType === 'string' ? body.requestType.trim() : '';
    const entityType = typeof body?.entityType === 'string' ? body.entityType.trim() : '';
    const title = typeof body?.title === 'string' ? body.title.trim() : '';

    if (!requestType || !entityType || !title) {
      return NextResponse.json(
        { error: 'requestType, entityType, and title are required' },
        { status: 400 }
      );
    }

    const request = await createApprovalRequest({
      businessId: business.id,
      requestedByUserId: session.user.id,
      actorEmail: session.user.email,
      actorName: session.user.name,
      actorRole: business.erpRole,
      requestType,
      entityType,
      entityId: typeof body?.entityId === 'string' ? body.entityId : null,
      title,
      summary: typeof body?.summary === 'string' ? body.summary : null,
      payload: typeof body?.payload === 'object' && body.payload ? body.payload : undefined,
    });

    return NextResponse.json({ success: true, approval: request });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to create approval request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const requestedBusinessId =
      typeof body?.businessId === 'string' ? body.businessId : undefined;
    const approvalId = typeof body?.id === 'string' ? body.id.trim() : '';
    const decision = body?.decision as 'APPROVED' | 'REJECTED' | 'CANCELLED' | undefined;

    if (!approvalId || !decision || !['APPROVED', 'REJECTED', 'CANCELLED'].includes(decision)) {
      return NextResponse.json(
        { error: 'Approval id and valid decision (APPROVED, REJECTED, CANCELLED) are required.' },
        { status: 400 }
      );
    }

    const requiredPerm =
      decision === 'CANCELLED' ? PERMISSIONS.APPROVAL_REQUEST : PERMISSIONS.APPROVAL_DECIDE;
    const allowedRoles =
      decision === 'CANCELLED' ? undefined : (['BUSINESS_OWNER', 'OWNER'] as string[]);

    const { business, session } = await requireScaleErpAccess(
      requestedBusinessId,
      requiredPerm,
      allowedRoles
    );

    const updated = await decideApprovalRequest({
      businessId: business.id,
      approvalId,
      decidedByUserId: session.user.id,
      deciderEmail: session.user.email,
      deciderName: session.user.name,
      deciderRole: business.erpRole,
      decision,
      decisionNotes: typeof body?.decisionNotes === 'string' ? body.decisionNotes : null,
    });

    let executionResult: unknown = null;
    if (decision === 'APPROVED') {
      const payload =
        updated.payload && typeof updated.payload === 'object' && !Array.isArray(updated.payload)
          ? (updated.payload as Record<string, unknown>)
          : {};

      if (updated.requestType === 'YEAR_END_CLOSING') {
        const fyCode =
          typeof payload.fyCode === 'string' && payload.fyCode.trim()
            ? payload.fyCode.trim()
            : updated.entityId || '';
        if (!fyCode) {
          return NextResponse.json(
            { error: 'Approved YEAR_END_CLOSING request is missing target fyCode.' },
            { status: 400 }
          );
        }
        executionResult = await executeFinancialYearClosing({
          businessId: business.id,
          fyCode,
          actorUserId: session.user.id,
          actorEmail: session.user.email,
          actorName: session.user.name,
          actorRole: business.erpRole,
          reason:
            typeof body?.decisionNotes === 'string' && body.decisionNotes.trim()
              ? body.decisionNotes.trim()
              : updated.summary || `Approved request ${updated.id}`,
        });
      } else if (updated.requestType === 'PERIOD_LOCK') {
        const fyCode =
          typeof payload.fyCode === 'string' && payload.fyCode.trim()
            ? payload.fyCode.trim()
            : updated.entityId || '';
        const lockedUntilRaw =
          typeof payload.lockedUntil === 'string' ? payload.lockedUntil.trim() : '';
        const lockedUntil = lockedUntilRaw ? new Date(lockedUntilRaw) : new Date();
        if (!fyCode || Number.isNaN(lockedUntil.getTime())) {
          return NextResponse.json(
            { error: 'Approved PERIOD_LOCK request is missing valid fyCode or lockedUntil date.' },
            { status: 400 }
          );
        }
        executionResult = await lockAccountingPeriod({
          businessId: business.id,
          fyCode,
          lockedUntil,
          actorUserId: session.user.id,
          actorEmail: session.user.email,
          actorName: session.user.name,
          actorRole: business.erpRole,
          reason:
            typeof body?.decisionNotes === 'string' && body.decisionNotes.trim()
              ? body.decisionNotes.trim()
              : updated.summary || `Approved request ${updated.id}`,
        });
      }
    }

    return NextResponse.json({ success: true, approval: updated, executionResult });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to decide approval request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

