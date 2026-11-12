import { NextResponse } from 'next/server';
import { AccessScopeType, AccountantInvitationStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { AuthError, requireAuth } from '@/lib/auth/guards';
import { normalizePlanKey } from '@/lib/subscription/plans';
import {
  ensureBusinessWorkspaceDefaults,
  normalizeErpRole,
} from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireAuth();

    const [memberships, accesses, pendingInvitations] = await Promise.all([
      prisma.businessMembership.findMany({
        where: {
          userId: session.user.id,
          isActive: true,
        },
        include: {
          business: {
            include: {
              subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
              branches: {
                where: { isActive: true },
                orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
              },
              financialYears: {
                where: { isActive: true },
                orderBy: { startDate: 'desc' },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.accountantBusinessAccess.findMany({
        where: { userId: session.user.id },
      }),
      prisma.accountantInvitation.findMany({
        where: {
          invitedEmail: session.user.email.toLowerCase(),
          status: AccountantInvitationStatus.PENDING,
          expiresAt: { gt: new Date() },
        },
        include: {
          business: { select: { id: true, name: true, gstin: true, city: true, state: true } },
          invitedBy: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const accessMap = new Map(accesses.map((a) => [a.businessId, a]));
    const businesses = [];

    for (const m of memberships) {
      const acc = accessMap.get(m.businessId);
      const erpRole = normalizeErpRole(m.role);
      if (erpRole === 'ACCOUNTANT' && acc && !acc.isActive) {
        continue;
      }

      const latestSub = m.business.subscriptions[0] || null;
      const planKey = normalizePlanKey(latestSub?.plan);
      const isScalePlan = planKey === 'SCALE';

      let branches = m.business.branches;
      let financialYears = m.business.financialYears;
      if (isScalePlan && (branches.length === 0 || financialYears.length === 0)) {
        const seeded = await ensureBusinessWorkspaceDefaults(m.business.id);
        branches = seeded.branches;
        financialYears = seeded.financialYears;
      }

      const scopedBranches =
        erpRole === 'ACCOUNTANT' && acc?.branchScope === AccessScopeType.SELECTED
          ? branches.filter((b) => acc.branchIds.includes(b.id))
          : branches;

      const scopedFys =
        erpRole === 'ACCOUNTANT' && acc?.fyScope === AccessScopeType.SELECTED
          ? financialYears.filter((f) => acc.financialYears.includes(f.code))
          : financialYears;

      businesses.push({
        businessId: m.business.id,
        name: m.business.name,
        legalName: m.business.legalName,
        gstin: m.business.gstin,
        city: m.business.city,
        state: m.business.state,
        role: m.role,
        erpRole,
        plan: latestSub?.plan ?? null,
        planKey,
        isScalePlan,
        isActiveWorkspace: session.activeBusiness?.id === m.business.id,
        branchScope: acc?.branchScope ?? AccessScopeType.ALL,
        fyScope: acc?.fyScope ?? AccessScopeType.ALL,
        canApproveSensitive: erpRole === 'OWNER' ? true : Boolean(acc?.canApproveSensitive),
        canFileGst: erpRole === 'OWNER' ? true : Boolean(acc?.canFileGst),
        branches: scopedBranches.map((b) => ({
          id: b.id,
          name: b.name,
          code: b.code,
          isDefault: b.isDefault,
        })),
        financialYears: scopedFys.map((f) => ({
          id: f.id,
          code: f.code,
          label: f.label,
          isClosed: f.isClosed,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      activeBusinessId: session.activeBusiness?.id ?? null,
      businesses,
      pendingInvitations: pendingInvitations.map((inv) => ({
        id: inv.id,
        businessId: inv.businessId,
        businessName: inv.business.name,
        businessGstin: inv.business.gstin,
        invitedByName: inv.invitedBy.name,
        invitedByEmail: inv.invitedBy.email,
        branchScope: inv.branchScope,
        branchCount: inv.branchIds.length,
        fyScope: inv.fyScope,
        financialYears: inv.financialYears,
        canApproveSensitive: inv.canApproveSensitive,
        canFileGst: inv.canFileGst,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[GET /api/accountant/businesses] Error:', error);
    return NextResponse.json({ error: 'Failed to load workspaces' }, { status: 500 });
  }
}

