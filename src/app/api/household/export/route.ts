import { NextRequest, NextResponse } from 'next/server';
import { requireHouseholdAccess } from '@/lib/household/guards';
import {
  exportTransactionsCsv,
  exportReportsExcelCompatible,
  getHouseholdReports,
} from '@/lib/household/householdService';
import { HouseholdTransactionType } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const householdId = searchParams.get('householdId');
    const format = (searchParams.get('format') || 'csv').toLowerCase();
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const month = searchParams.get('month') || undefined;
    const typeParam = searchParams.get('type') as HouseholdTransactionType | null;
    const categoryId = searchParams.get('categoryId') || undefined;
    const subcategory = searchParams.get('subcategory') || undefined;
    const memberId = searchParams.get('memberId') || undefined;
    const billType = searchParams.get('billType') || undefined;
    const search = searchParams.get('search') || undefined;
    const isSharedParam = searchParams.get('isShared');
    const isShared = isSharedParam === 'true' ? true : isSharedParam === 'false' ? false : 'ALL';

    const authContext = await requireHouseholdAccess(householdId);
    const safeHouseholdName = (authContext.householdName || 'Household').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const timestamp = new Date().toISOString().split('T')[0];

    // 1. EXCEL-COMPATIBLE SPREADSHEET (XML SpreadsheetML)
    if (format === 'excel' || format === 'xlsx' || format === 'xls') {
      const excelXml = await exportReportsExcelCompatible(authContext.householdId, {
        startDate,
        endDate,
        month,
        categoryId,
        subcategory,
        memberId,
        billType,
        search,
        isShared,
      });

      const filename = `${safeHouseholdName}_expense_report_${timestamp}.xls`;

      return new NextResponse(excelXml, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    // 2. PRINT-READY PDF / HTML REPORT
    if (format === 'pdf' || format === 'print') {
      const reportData = await getHouseholdReports(authContext.householdId, {
        startDate,
        endDate,
        month,
        categoryId,
        subcategory,
        memberId,
        billType,
        search,
        isShared,
      });

      const h = reportData.household;
      const kpis = reportData.kpis;
      const periodLabel = startDate && endDate
        ? `${startDate} to ${endDate}`
        : month || 'All Time';

      const printHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Expense Report — ${h.name}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 15px; font-size: 12px; }
    .header { border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
    .title { font-size: 20px; font-weight: 800; color: #047857; margin: 0; }
    .subtitle { font-size: 12px; color: #64748b; margin-top: 3px; }
    .meta { text-align: right; font-size: 11px; color: #475569; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
    .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; }
    .kpi-label { font-size: 10px; font-weight: 600; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
    .kpi-value { font-size: 16px; font-weight: 800; color: #0f172a; }
    .section-title { font-size: 13px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin: 18px 0 10px 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; }
    th { background: #f1f5f9; color: #334155; font-weight: 700; text-align: left; padding: 7px 8px; border-bottom: 1px solid #cbd5e1; }
    td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; }
    .text-right { text-align: right; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; }
    .badge-green { background: #dcfce7; color: #15803d; }
    .badge-red { background: #fee2e2; color: #b91c1c; }
    .badge-gray { background: #f1f5f9; color: #475569; }
    .footer { margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 10px; color: #94a3b8; text-align: center; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 15px; padding: 10px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
    <span style="font-size: 12px; color: #065f46; font-weight: 600;">Print-Ready Household Report. Click the Print button to save as PDF.</span>
    <button onclick="window.print()" style="background: #059669; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-weight: bold; cursor: pointer;">Print / Save as PDF</button>
  </div>

  <div class="header">
    <div>
      <h1 class="title">PakkaChittha • ${h.name}</h1>
      <div class="subtitle">Ghar Kharcha Financial &amp; Expense Settlement Report</div>
    </div>
    <div class="meta">
      <div><strong>Reporting Period:</strong> ${periodLabel}</div>
      <div><strong>Generated:</strong> ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
      <div><strong>Currency:</strong> INR (₹)</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Consumption Expenses</div>
      <div class="kpi-value">₹${kpis.totalConsumptionExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Household Income</div>
      <div class="kpi-value" style="color: #059669;">₹${kpis.totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Net Cash Flow</div>
      <div class="kpi-value" style="color: ${kpis.netCashFlow >= 0 ? '#059669' : '#dc2626'};">₹${kpis.netCashFlow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Budget Remaining</div>
      <div class="kpi-value">₹${kpis.remainingBudget.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${kpis.budgetUtilization}%)</div>
    </div>
  </div>

  <div class="section-title">1. Category-Wise Spending Breakdown</div>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th class="text-right">Amount (INR)</th>
        <th class="text-right">Share %</th>
        <th class="text-right">Records</th>
      </tr>
    </thead>
    <tbody>
      ${reportData.reports.categoryWiseSummary.map((c) => `
        <tr>
          <td><strong>${c.name}</strong></td>
          <td class="text-right">₹${c.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td class="text-right">${c.percentage}%</td>
          <td class="text-right">${c.count}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="section-title">2. Family Member Shares &amp; Outstanding Balances</div>
  <table>
    <thead>
      <tr>
        <th>Member</th>
        <th class="text-right">Expenses Paid</th>
        <th class="text-right">Allocated Share</th>
        <th class="text-right">Repayments Sent</th>
        <th class="text-right">Repayments Recv</th>
        <th class="text-right">Net Balance</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${reportData.reports.memberWiseSummary.map((m) => `
        <tr>
          <td><strong>${m.name}</strong></td>
          <td class="text-right">₹${m.totalExpensePaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td class="text-right">₹${m.totalShareAllocated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td class="text-right">₹${m.settlementsPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td class="text-right">₹${m.settlementsReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td class="text-right"><strong>₹${Math.abs(m.netBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
          <td>
            <span class="badge ${m.status === 'RECEIVABLE' ? 'badge-green' : m.status === 'PAYABLE' ? 'badge-red' : 'badge-gray'}">
              ${m.status === 'RECEIVABLE' ? 'Owed (Receivable)' : m.status === 'PAYABLE' ? 'Owes (Payable)' : 'Settled'}
            </span>
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  ${reportData.reports.billsAndRechargeSummary.breakdown.length > 0 ? `
  <div class="section-title">3. Bills &amp; Utility Recharge Summary</div>
  <table>
    <thead>
      <tr>
        <th>Utility / Bill Type</th>
        <th class="text-right">Total Amount (INR)</th>
        <th class="text-right">Transactions</th>
      </tr>
    </thead>
    <tbody>
      ${reportData.reports.billsAndRechargeSummary.breakdown.map((b) => `
        <tr>
          <td><strong>${b.label}</strong></td>
          <td class="text-right">₹${b.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td class="text-right">${b.count}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  <div class="footer">
    PakkaChittha Mera Ghar • Complete Household Ledger &amp; Settlement System • Generated on ${new Date().toISOString()}
  </div>
</body>
</html>`;

      return new NextResponse(printHtml, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // 3. DEFAULT: CSV EXPORT
    const csvContent = await exportTransactionsCsv(authContext.householdId, {
      startDate,
      endDate,
      month,
      type: typeParam || undefined,
      categoryId,
      subcategory,
      memberId,
      billType,
      search,
      isShared,
    });

    const filename = `${safeHouseholdName}_transactions_${timestamp}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to export reports.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
