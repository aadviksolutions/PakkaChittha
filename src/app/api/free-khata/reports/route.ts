import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth/guards';
import {
  buildConsolidatedShareText,
  buildPersonShareText,
  getKhataConsolidatedReport,
  getKhataPersonDetailedReport,
  KhataReportFiltersInput,
} from '@/lib/services/khataReportService';

export const dynamic = 'force-dynamic';

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
    const contactId = searchParams.get('contactId')?.trim() || '';
    const filters = extractFilters(searchParams);

    if (contactId) {
      const report = await getKhataPersonDetailedReport(business.id, contactId, filters);
      const share = buildPersonShareText(report);
      return NextResponse.json({
        success: true,
        reportType: 'PERSON',
        report,
        share,
      });
    }

    const report = await getKhataConsolidatedReport(business.id, filters);
    const share = buildConsolidatedShareText(report);

    return NextResponse.json({
      success: true,
      reportType: 'CONSOLIDATED',
      report,
      share,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate Khata report.';
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

