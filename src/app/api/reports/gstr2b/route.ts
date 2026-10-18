import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireGrowthAccess } from '@/lib/auth/guards';
import {
  parseGstr2bJson,
  reconcileGstr2bWithPurchases,
  buildGstr2bReconciliationCsv,
} from '@/lib/reports/gstr2bReconciler';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authContext = await requireGrowthAccess();
    const businessId = authContext.business.id;

    const { searchParams } = new URL(request.url);
    const importId = searchParams.get('importId');

    if (importId) {
      const savedImport = await prisma.gstr2bImport.findFirst({
        where: { id: importId, businessId },
        include: {
          entries: {
            orderBy: { invoiceDate: 'desc' },
          },
        },
      });

      if (!savedImport) {
        return NextResponse.json({ error: 'GSTR-2B import not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: savedImport,
      });
    }

    // List recent imports
    const recentImports = await prisma.gstr2bImport.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 10,
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

    return NextResponse.json({
      success: true,
      recentImports,
    });
  } catch (error: unknown) {
    console.error('GSTR-2B list error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to retrieve GSTR-2B imports';
    const status = (error as any)?.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authContext = await requireGrowthAccess();
    const businessId = authContext.business.id;

    const contentType = request.headers.get('content-type') || '';

    let jsonContent: any = null;
    let fileName = 'gstr2b_portal_import.json';
    let returnPeriod = '102026';
    let financialYear = '2026-2027';
    let action = 'reconcile';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      action = (formData.get('action') as string) || 'reconcile';
      returnPeriod = (formData.get('returnPeriod') as string) || returnPeriod;
      financialYear = (formData.get('financialYear') as string) || financialYear;

      if (!file) {
        return NextResponse.json({ error: 'No GSTR-2B file uploaded.' }, { status: 400 });
      }

      fileName = file.name;
      const text = await file.text();
      jsonContent = JSON.parse(text);
    } else {
      const body = await request.json();
      action = body.action || 'reconcile';
      returnPeriod = body.returnPeriod || returnPeriod;
      financialYear = body.financialYear || financialYear;
      fileName = body.fileName || fileName;
      jsonContent = body.jsonContent || body;
    }

    if (action === 'export_csv') {
      const result = await reconcileGstr2bWithPurchases({
        businessId,
        returnPeriod,
        financialYear,
        gstr2bInvoices: jsonContent.invoices || [],
        sourceFileName: fileName,
        saveToDb: false,
      });

      const csvData = buildGstr2bReconciliationCsv(result);
      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="gstr2b_reconciliation_${returnPeriod}_${Date.now()}.csv"`,
        },
      });
    }

    // 1. Parse official GSTR-2B JSON
    const parsed = parseGstr2bJson(jsonContent);

    if (parsed.fp) returnPeriod = parsed.fp;

    if (!parsed.invoices || parsed.invoices.length === 0) {
      return NextResponse.json(
        {
          error:
            'No valid B2B or CDNR invoices found in the uploaded GSTR-2B file. Please verify it is an official GSTN GSTR-2B JSON.',
        },
        { status: 400 }
      );
    }

    // 2. Perform 2-way reconciliation against tenant's Purchase Register
    const reconciliation = await reconcileGstr2bWithPurchases({
      businessId,
      returnPeriod,
      financialYear,
      gstr2bInvoices: parsed.invoices,
      sourceFileName: fileName,
      saveToDb: true,
    });

    return NextResponse.json({
      success: true,
      data: reconciliation,
    });
  } catch (error: unknown) {
    console.error('GSTR-2B reconciliation error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to reconcile GSTR-2B with Purchases';
    const status = (error as any)?.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
