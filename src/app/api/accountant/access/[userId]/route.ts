import { NextRequest, NextResponse } from 'next/server';
import { AccessScopeType } from '@prisma/client';
import {
  AuthError,
  TenantIsolationError,
  requireScaleErpAccess,
} from '@/lib/auth/guards';
import {
  PERMISSIONS,
  revokeAccountantAccess,
  updateAccountantAccess,
} from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { business, session } = await requireScaleErpAccess(
      undefined,
      PERMISSIONS.ACCOUNTANT_MANAGE,
      ['BUSINESS_OWNER', 'OWNER']
    );

    const { userId } = await params;
    const body = await req.json();

    const updated = await updateAccountantAccess({
      businessId: business.id,
      accountantUserId: userId,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      actorName: session.user.name,
      branchScope:
        body?.branchScope === AccessScopeType.SELECTED
          ? AccessScopeType.SELECTED
          : body?.branchScope === AccessScopeType.ALL
            ? AccessScopeType.ALL
            : undefined,
      branchIds: Array.isArray(body?.branchIds)
        ? body.branchIds.filter((v: unknown): v is string => typeof v === 'string')
        : undefined,
      fyScope:
        body?.fyScope === AccessScopeType.SELECTED
          ? AccessScopeType.SELECTED
          : body?.fyScope === AccessScopeType.ALL
            ? AccessScopeType.ALL
            : undefined,
      financialYears: Array.isArray(body?.financialYears)
        ? body.financialYears.filter((v: unknown): v is string => typeof v === 'string')
        : undefined,
      permissions: Array.isArray(body?.permissions)
        ? body.permissions.filter((v: unknown): v is string => typeof v === 'string')
        : undefined,
      canApproveSensitive:
        typeof body?.canApproveSensitive === 'boolean' ? body.canApproveSensitive : undefined,
      canFileGst: typeof body?.canFileGst === 'boolean' ? body.canFileGst : undefined,
    });

    return NextResponse.json({ success: true, access: updated });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to update accountant access';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { business, session } = await requireScaleErpAccess(
      undefined,
      PERMISSIONS.ACCOUNTANT_MANAGE,
      ['BUSINESS_OWNER', 'OWNER']
    );

    const { userId } = await params;
    let reason: string | null = null;
    try {
      const body = await req.json();
      if (typeof body?.reason === 'string') reason = body.reason;
    } catch {
      // Optional JSON body on DELETE
    }

    await revokeAccountantAccess({
      businessId: business.id,
      accountantUserId: userId,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      actorName: session.user.name,
      reason,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to revoke accountant access';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

