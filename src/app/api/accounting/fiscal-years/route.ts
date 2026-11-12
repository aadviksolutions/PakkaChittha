import { NextRequest, NextResponse } from 'next/server';
import { AccessScopeType } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  AuthError,
  TenantIsolationError,
  requireScaleErpAccess,
} from '@/lib/auth/guards';
import {
  PERMISSIONS,
  buildIndianFyWindow,
  ensureBusinessWorkspaceDefaults,
  recordAuditEvent,
} from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBusinessId = searchParams.get('businessId') || undefined;

    const { business } = await requireScaleErpAccess(
      requestedBusinessId,
      PERMISSIONS.ACCOUNTING_VIEW
    );

    const { financialYears } = await ensureBusinessWorkspaceDefaults(business.id);
    const visibleFys =
      business.erpRole === 'ACCOUNTANT' &&
        business.accountantAccess?.fyScope === AccessScopeType.SELECTED
        ? financialYears.filter((f) => business.accountantAccess!.financialYears.includes(f.code))
        : financialYears;

    return NextResponse.json({
      success: true,
      financialYears: visibleFys,
    });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[GET /api/accounting/fiscal-years] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch financial years' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { business, session } = await requireScaleErpAccess(
      undefined,
      PERMISSIONS.SETTINGS_MANAGE,
      ['BUSINESS_OWNER', 'OWNER']
    );

    const body = await req.json();
    const startYear = Number(body?.startYear);
    if (!Number.isInteger(startYear) || startYear < 2000 || startYear > 2099) {
      return NextResponse.json(
        { error: 'Please specify a valid Indian Financial Year startYear (e.g., 2024).' },
        { status: 400 }
      );
    }

    const fyWindow = buildIndianFyWindow(startYear);
    const financialYear = await prisma.financialYear.upsert({
      where: {
        businessId_code: {
          businessId: business.id,
          code: fyWindow.code,
        },
      },
      update: { isActive: true },
      create: {
        businessId: business.id,
        code: fyWindow.code,
        label: fyWindow.label,
        startDate: fyWindow.startDate,
        endDate: fyWindow.endDate,
        isActive: true,
        isClosed: false,
      },
    });

    await recordAuditEvent({
      businessId: business.id,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      actorName: session.user.name,
      actorRole: business.erpRole,
      action: 'FINANCIAL_YEAR_ENABLED',
      entityType: 'FinancialYear',
      entityId: financialYear.id,
      newValue: { code: financialYear.code, label: financialYear.label },
    });

    return NextResponse.json({ success: true, financialYear });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[POST /api/accounting/fiscal-years] Error:', error);
    return NextResponse.json({ error: 'Failed to add financial year' }, { status: 500 });
  }
}

