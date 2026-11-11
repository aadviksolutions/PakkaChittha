import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth/guards';
import {
  getKhataConsolidatedReport,
  getKhataPersonDetailedReport,
  KhataReportFiltersInput,
  sanitizeFileName,
} from '@/lib/services/khataReportService';
import {
  generateKhataConsolidatedExcel,
  generateKhataPersonExcel,
} from '@/lib/reports/khataExcelGenerator';
import {
  generateKhataConsolidatedPdf,
  generateKhataPersonPdf,
} from '@/lib/reports/khataPdfGenerator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function extractFilters(searchParams: URLSearchParams): KhataReportFiltersInput {
  return {
    dateRange: searchParams.get('dateRange'),
    startDate: searchParams.get('startDate'),
    endDate: searchParams.get('endDate'),
    search: searchParams.get('search'),
    mobile: searchParams.get('mobile'),
    direction: searchParams.get('direction'),
    paymentMode: searchParams.get('paymentMode'),
    accountStatus: searchParams.get('accountStatus'),
  };
}

export async function GET(req: NextRequest) {
  try {
    const { business } = await requireTenantAccess();
    const { searchParams } = new URL(req.url);

    const formatRaw = (searchParams.get('format') || 'pdf').toLowerCase();
    if (formatRaw !== 'pdf' && formatRaw !== 'xlsx') {
      return NextResponse.json(
        { success: false, error: 'Invalid export format. Supported formats: xlsx, pdf.' },
        { status: 400 }
      );
    }

    const contactId = searchParams.get('contactId')?.trim() || '';
    const disposition = searchParams.get('disposition') === 'inline' ? 'inline' : 'attachment';
    const filters = extractFilters(searchParams);

    const dateStamp = new Date().toISOString().slice(0, 10);

    let fileBuffer: Buffer;
    let fileBaseName: string;

    if (contactId) {
      const personReport = await getKhataPersonDetailedReport(business.id, contactId, filters);
      fileBaseName = sanitizeFileName(
        `khata-party-${personReport.contact.name}-${dateStamp}`
      );
      fileBuffer =
        formatRaw === 'xlsx'
          ? await generateKhataPersonExcel(personReport)
          : await generateKhataPersonPdf(personReport);
    } else {
      const report = await getKhataConsolidatedReport(business.id, filters);
      fileBaseName = sanitizeFileName(
        `pakkachittha-khata-report-${report.metadata.businessName}-${dateStamp}`
      );
      fileBuffer =
        formatRaw === 'xlsx'
          ? await generateKhataConsolidatedExcel(report)
          : await generateKhataConsolidatedPdf(report);
    }

    const contentType =
      formatRaw === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';
    const filename = `${fileBaseName}.${formatRaw}`;

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `${disposition}; filename="${filename}"`,
        'Content-Length': String(fileBuffer.length),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to export Khata report.';
    const status = message.includes('Authentication')
      ? 401
      : message.includes('Access Denied') || message.includes('access denied')
        ? 403
        : message.includes('not found')
          ? 404
          : message.includes('Invalid') ||
              message.includes('earlier') ||
              message.includes('Please provide') ||
              message.includes('Custom date')
            ? 400
            : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

