import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  AuthError,
  TenantIsolationError,
  requireScaleErpAccess,
} from '@/lib/auth/guards';
import { PERMISSIONS, recordAuditEvent } from '@/lib/rbac';
import {
  buildGstr2bReconciliationCsv,
  parseGstr2bJson,
  reconcileGstr2bWithPurchases,
} from '@/lib/reports/gstr2bReconciler';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBusinessId = searchParams.get('businessId') || undefined;
    const importId = searchParams.get('importId');

    const { business } = await requireScaleErpAccess(
      requestedBusinessId,
      PERMISSIONS.GST_VIEW
    );

    if (importId) {
      const savedImport = await prisma.gstr2bImport.findFirst({
        where: { id: importId, businessId: business.id },
        include: {
          entries: { orderBy: { invoiceDate: 'desc' } },
        },
      });
      if (!savedImport) {
        return NextResponse.json({ error: 'GSTR-2B import not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: savedImport });
    }

    const recentImports = await prisma.gstr2bImport.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: 'desc' },
      take: 15,
      select: {
        id: true,
        returnPeriod: true,
        financialYear: true,
        sourceFileName: true,
        totalInvoices: true,
        totalTaxable: true,
        totalCgst: true,
        totalSgst: true,
        totalIgst: true,
        matchedCount: true,
        mismatchCount: true,
        missingInBooksCount: true,
        missingIn2bCount: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, recentImports });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[GET /api/gst/gstr2b] Error:', error);
    return NextResponse.json({ error: 'Failed to load GSTR-2B history.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    let requestedBusinessId: string | undefined;
    let jsonContent: Record<string, unknown> | null = null;
    let fileName = 'gstr2b_portal_import.json';
    let returnPeriod = '102026';
    let financialYear = '2026-2027';
    let action = 'reconcile';
    let purchaseIds: string[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const bizField = formData.get('businessId');
      if (typeof bizField === 'string' && bizField.trim()) {
        requestedBusinessId = bizField.trim();
      }
      const file = formData.get('file') as File | null;
      action = (formData.get('action') as string) || 'reconcile';
      returnPeriod = (formData.get('returnPeriod') as string) || returnPeriod;
      financialYear = (formData.get('financialYear') as string) || financialYear;

      if (!file) {
        return NextResponse.json({ error: 'No GSTR-2B JSON file uploaded.' }, { status: 400 });
      }
      fileName = file.name;
      jsonContent = JSON.parse(await file.text()) as Record<string, unknown>;
    } else {
      const body = (await req.json()) as Record<string, unknown>;
      requestedBusinessId =
        typeof body.businessId === 'string' ? body.businessId : undefined;
      action = typeof body.action === 'string' ? body.action : 'reconcile';
      returnPeriod =
        typeof body.returnPeriod === 'string' ? body.returnPeriod : returnPeriod;
      financialYear =
        typeof body.financialYear === 'string' ? body.financialYear : financialYear;
      fileName = typeof body.fileName === 'string' ? body.fileName : fileName;
      if (Array.isArray(body.purchaseIds)) {
        purchaseIds = body.purchaseIds.filter((id): id is string => typeof id === 'string');
      }
      jsonContent =
        body.jsonContent && typeof body.jsonContent === 'object'
          ? (body.jsonContent as Record<string, unknown>)
          : body;
    }

    const { business, session } = await requireScaleErpAccess(
      requestedBusinessId,
      PERMISSIONS.GST_RECONCILE
    );

    if (action === 'MARK_RECONCILED') {
      if (purchaseIds.length === 0) {
        return NextResponse.json(
          { error: 'Select at least one matched purchase bill to mark reconciled.' },
          { status: 400 }
        );
      }

      const updated = await prisma.purchase.updateMany({
        where: { businessId: business.id, id: { in: purchaseIds } },
        data: { itcEligibility: 'RECONCILED' },
      });

      await recordAuditEvent({
        businessId: business.id,
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        actorName: session.user.name,
        actorRole: business.erpRole,
        action: 'GSTR2B_PURCHASES_RECONCILED',
        entityType: 'Gstr2bImport',
        entityId: returnPeriod,
        newValue: { purchaseCount: updated.count, purchaseIds },
        reason: `Marked ${updated.count} matched purchase bills as RECONCILED via GSTR-2B`,
      });

      return NextResponse.json({ success: true, updatedCount: updated.count });
    }

    if (!jsonContent) {
      return NextResponse.json({ error: 'GSTR-2B JSON payload is missing.' }, { status: 400 });
    }

    if (action === 'export_csv') {
      const parsedForCsv = parseGstr2bJson(jsonContent);
      const result = await reconcileGstr2bWithPurchases({
        businessId: business.id,
        returnPeriod: parsedForCsv.fp || returnPeriod,
        financialYear,
        gstr2bInvoices: parsedForCsv.invoices,
        sourceFileName: fileName,
        saveToDb: false,
      });

      const csvData = buildGstr2bReconciliationCsv(result);
      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="gstr2b_reconciliation_${result.returnPeriod}.csv"`,
        },
      });
    }

    const parsed = parseGstr2bJson(jsonContent);
    if (parsed.fp) returnPeriod = parsed.fp;

    if (!parsed.invoices || parsed.invoices.length === 0) {
      return NextResponse.json(
        {
          error:
            'No B2B or CDNR invoices found in the uploaded GSTR-2B JSON. Verify it follows official GSTN GSTR-2B structure.',
        },
        { status: 400 }
      );
    }

    const reconciliation = await reconcileGstr2bWithPurchases({
      businessId: business.id,
      returnPeriod,
      financialYear,
      gstr2bInvoices: parsed.invoices,
      sourceFileName: fileName,
      saveToDb: true,
    });

    await recordAuditEvent({
      businessId: business.id,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      actorName: session.user.name,
      actorRole: business.erpRole,
      action: 'GSTR2B_RECONCILED',
      entityType: 'Gstr2bImport',
      entityId: reconciliation.importId || returnPeriod,
      newValue: reconciliation.summary,
      reason: `Reconciled ${reconciliation.summary.totalInGstr2b} GSTR-2B entries for ${returnPeriod}`,
    });

    return NextResponse.json({ success: true, data: reconciliation });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const msg = error instanceof Error ? error.message : 'Failed to reconcile GSTR-2B JSON.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
