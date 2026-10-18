import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireGrowthAccess } from '@/lib/auth/guards';
import { InvoiceStatus, PurchaseStatus } from '@prisma/client';
import { buildGstr3bPayload, buildGstr3bCsv } from '@/lib/reports/gstr3b';

export async function GET(request: NextRequest) {
  try {
    const authContext = await requireGrowthAccess();
    const businessId = authContext.business.id;

    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month'); // "1" - "12"
    const yearParam = searchParams.get('year'); // e.g. "2026"
    const format = searchParams.get('format') || 'json'; // 'json' or 'csv'
    const download = searchParams.get('download') === 'true' || searchParams.get('download') === '1';

    // Determine target filing period
    let periodDate = new Date();
    let invoiceDateFilter: any = undefined;
    let purchaseDateFilter: any = undefined;

    if (monthParam && yearParam) {
      const monthIdx = parseInt(monthParam, 10) - 1;
      const year = parseInt(yearParam, 10);
      if (!isNaN(monthIdx) && !isNaN(year) && monthIdx >= 0 && monthIdx <= 11) {
        periodDate = new Date(year, monthIdx, 1);
        const startOfMonth = new Date(year, monthIdx, 1, 0, 0, 0, 0);
        const endOfMonth = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);
        invoiceDateFilter = { gte: startOfMonth, lte: endOfMonth };
        purchaseDateFilter = { gte: startOfMonth, lte: endOfMonth };
      }
    }

    // Fetch tenant business metadata
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        gstin: true,
        state: true,
      },
    });

    if (!business) {
      return NextResponse.json({ error: 'Business profile not found' }, { status: 404 });
    }

    // Query non-cancelled invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        businessId,
        status: { not: InvoiceStatus.CANCELLED },
        ...(invoiceDateFilter ? { invoiceDate: invoiceDateFilter } : {}),
      },
      orderBy: { invoiceDate: 'desc' },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        customerName: true,
        customerGstin: true,
        customerBillingAddress: true,
        subtotal: true,
        taxTotal: true,
        cgstTotal: true,
        sgstTotal: true,
        igstTotal: true,
        total: true,
        status: true,
      },
    });

    // Query non-cancelled purchases
    const purchases = await prisma.purchase.findMany({
      where: {
        businessId,
        status: { not: PurchaseStatus.CANCELLED },
        ...(purchaseDateFilter ? { purchaseDate: purchaseDateFilter } : {}),
      },
      orderBy: { purchaseDate: 'desc' },
      select: {
        id: true,
        purchaseNumber: true,
        purchaseDate: true,
        subtotal: true,
        taxTotal: true,
        cgstTotal: true,
        sgstTotal: true,
        igstTotal: true,
        itcEligibility: true,
        total: true,
        status: true,
        supplier: {
          select: {
            name: true,
            gstin: true,
            address: true,
          },
        },
      },
    });

    const payload = buildGstr3bPayload(business, invoices, purchases, periodDate);

    const safeGstin = payload.gstin.replace(/[^A-Za-z0-9]/g, '');
    const filename = `GSTR3B_${safeGstin}_${payload.ret_period}`;

    if (format === 'csv') {
      const csvData = buildGstr3bCsv(payload);
      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}.csv"`,
        },
      });
    }

    if (download) {
      return new NextResponse(JSON.stringify(payload, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.json"`,
        },
      });
    }

    return NextResponse.json(payload);
  } catch (error: any) {
    const status = error.statusCode || (error.message?.includes('Unauthorized') || error.message?.includes('Authentication') ? 401 : error.message?.includes('Commercial') ? 403 : 500);
    return NextResponse.json(
      { error: error.message || 'Failed to generate GSTR-3B return' },
      { status }
    );
  }
}
