import { NextRequest, NextResponse } from 'next/server';
import {
  AuthError,
  TenantIsolationError,
  requireScaleErpAccess,
} from '@/lib/auth/guards';
import { PERMISSIONS, createApprovalRequest } from '@/lib/rbac';
import { getScaleGstr3bReport } from '@/lib/gst';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBusinessId = searchParams.get('businessId') || undefined;
    const now = new Date();
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1), 10);
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()), 10);
    const format = searchParams.get('format') || 'view';
    const download =
      searchParams.get('download') === 'true' || searchParams.get('download') === '1';

    const { business } = await requireScaleErpAccess(
      requestedBusinessId,
      PERMISSIONS.GST_VIEW
    );

    const report = await getScaleGstr3bReport(
      business.id,
      Number.isNaN(month) ? now.getMonth() + 1 : month,
      Number.isNaN(year) ? now.getFullYear() : year
    );

    if (format === 'csv') {
      const filename = `GSTR3B_${report.business.gstin}_${report.returnPeriod}.csv`;
      return new NextResponse(report.csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
        },
      });
    }

    if (format === 'json') {
      const filename = `GSTR3B_${report.business.gstin}_${report.returnPeriod}.json`;
      return new NextResponse(JSON.stringify(report.payload, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      business: report.business,
      returnPeriod: report.returnPeriod,
      payload: report.payload,
      offset: report.offset,
    });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const msg = error instanceof Error ? error.message : 'Failed to generate GSTR-3B.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const requestedBusinessId =
      typeof body?.businessId === 'string' ? body.businessId : undefined;
    const month = Number(body?.month);
    const year = Number(body?.year);
    const notes = typeof body?.notes === 'string' ? body.notes.trim() : '';

    if (!month || !year || Number.isNaN(month) || Number.isNaN(year)) {
      return NextResponse.json(
        { error: 'Valid month and year are required.' },
        { status: 400 }
      );
    }

    const { business, session } = await requireScaleErpAccess(
      requestedBusinessId,
      PERMISSIONS.GST_FILE_PREPARE
    );

    const report = await getScaleGstr3bReport(business.id, month, year);

    const approval = await createApprovalRequest({
      businessId: business.id,
      requestedByUserId: session.user.id,
      actorEmail: session.user.email,
      actorName: session.user.name,
      actorRole: business.erpRole,
      requestType: 'GST_FILING_SIGNOFF',
      entityType: 'GSTR3B',
      entityId: report.returnPeriod,
      title: `GSTR-3B Summary Sign-off (${report.returnPeriod})`,
      summary:
        notes ||
        `Output Tax ₹${report.offset.outputLiability.total}, Eligible ITC ₹${report.offset.eligibleItc.total}, Net Cash Payable ₹${report.offset.netCashPayable.total}`,
      payload: {
        returnType: 'GSTR3B',
        returnPeriod: report.returnPeriod,
        gstin: report.business.gstin,
        offset: report.offset,
      },
    });

    return NextResponse.json({ success: true, approval }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const msg = error instanceof Error ? error.message : 'Failed to submit GSTR-3B sign-off.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
