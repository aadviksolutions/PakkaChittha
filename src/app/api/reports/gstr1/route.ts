import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireGrowthAccess } from '@/lib/auth/guards';
import { InvoiceStatus } from '@prisma/client';
import { buildGstr1Payload, buildGstr1Csv } from '@/lib/reports/gstr1';
import { resolveDateFilterRange } from '@/lib/reports/financialYear';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authContext = await requireGrowthAccess();
    const businessId = authContext.business.id;

    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month') || '10'; // "1" to "12"
    const yearParam = searchParams.get('year') || '2026';
    const format = searchParams.get('format') || 'json'; // 'json' or 'csv'
    const download = searchParams.get('download') === 'true' || searchParams.get('download') === '1';

    const monthNum = parseInt(monthParam, 10);
    const yearNum = parseInt(yearParam, 10);
    const returnPeriod = `${String(monthNum).padStart(2, '0')}${yearNum}`;

    const filterRange = resolveDateFilterRange({
      financialYear: `${yearNum}-${yearNum + 1}`,
      periodType: 'MONTH',
      periodValue: String(monthNum),
    });

    // 1. Fetch business metadata
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        gstin: true,
        state: true,
      },
    });

    if (!business || !business.gstin) {
      return NextResponse.json(
        {
          error:
            'A valid 15-digit GSTIN is required in Business Settings to generate official GSTR-1 returns.',
        },
        { status: 400 }
      );
    }

    // 2. Fetch invoices for period with line items
    const invoices = await prisma.invoice.findMany({
      where: {
        businessId,
        invoiceDate: { gte: filterRange.startDate, lte: filterRange.endDate },
      },
      include: {
        items: true,
      },
      orderBy: { invoiceDate: 'asc' },
    });

    // 3. Fetch credit/debit notes for period
    const creditNotes = await prisma.creditDebitNote.findMany({
      where: {
        businessId,
        noteDate: { gte: filterRange.startDate, lte: filterRange.endDate },
      },
      orderBy: { noteDate: 'asc' },
    });

    const gstr1Payload = buildGstr1Payload({
      businessGstin: business.gstin,
      businessState: business.state,
      returnPeriod,
      invoices,
      creditNotes: creditNotes.map((cn) => ({
        noteNumber: cn.noteNumber,
        noteDate: cn.noteDate,
        noteType: cn.noteType,
        originalInvoiceNumber: cn.originalInvoiceNumber,
        partyName: cn.partyName,
        partyGstin: cn.partyGstin,
        taxableValue: cn.taxableValue,
        cgstTotal: cn.cgstTotal,
        sgstTotal: cn.sgstTotal,
        igstTotal: cn.igstTotal,
        total: cn.total,
      })),
    });

    if (format === 'csv') {
      const csvData = buildGstr1Csv(gstr1Payload);
      const filename = `GSTR1_${business.gstin}_${returnPeriod}.csv`;
      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
        },
      });
    }

    if (download) {
      const jsonStr = JSON.stringify(gstr1Payload, null, 2);
      const filename = `GSTR1_${business.gstin}_${returnPeriod}.json`;
      return new NextResponse(jsonStr, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      filter: filterRange,
      data: gstr1Payload,
    });
  } catch (error: unknown) {
    console.error('GSTR-1 generation error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to generate GSTR-1 payload';
    const status = (error as any)?.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
