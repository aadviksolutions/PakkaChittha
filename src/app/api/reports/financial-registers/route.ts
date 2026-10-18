import { NextRequest, NextResponse } from 'next/server';
import { requireGrowthAccess } from '@/lib/auth/guards';
import { resolveDateFilterRange } from '@/lib/reports/financialYear';
import { getFinancialRegisters, getAccountsOverview } from '@/lib/reports/accountingEngine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authContext = await requireGrowthAccess();
    const businessId = authContext.business.id;

    const { searchParams } = new URL(request.url);
    const financialYear = searchParams.get('financialYear');
    const periodType = (searchParams.get('periodType') as any) || 'FY';
    const periodValue = searchParams.get('periodValue');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const bookType = searchParams.get('bookType') || 'all'; // cash, bank, expenses, customer_outstanding, supplier_payable, pnl, all
    const format = searchParams.get('format') || 'json';

    const filterRange = resolveDateFilterRange({
      financialYear,
      periodType,
      periodValue,
      startDate,
      endDate,
    });

    const registers = await getFinancialRegisters(businessId, filterRange);
    const overview = await getAccountsOverview(businessId, filterRange);

    if (format === 'csv') {
      let csvContent = '';

      if (bookType === 'cash') {
        const rows = [
          `"CASH BOOK LEDGER - ${filterRange.label}"`,
          `"Generated At:","${new Date().toISOString()}"`,
          `"Total Cash In:","₹${registers.cashBook.totalIn.toFixed(2)}","Total Cash Out:","₹${registers.cashBook.totalOut.toFixed(2)}","Closing Cash:","₹${registers.cashBook.closingBalance.toFixed(2)}"`,
          '',
          '"Date","Voucher Type","Party / Particulars","Reference No","Payment Method","Cash In (Receipt)","Cash Out (Disbursement)","Running Balance"',
          ...registers.cashBook.transactions.map((t) =>
            [
              `"${t.date.split('T')[0]}"`,
              `"${t.voucherType}"`,
              `"${t.partyName.replace(/"/g, '""')}"`,
              `"${t.referenceNumber || ''}"`,
              `"${t.paymentMethod}"`,
              t.amountIn.toFixed(2),
              t.amountOut.toFixed(2),
              t.runningBalance.toFixed(2),
            ].join(',')
          ),
        ];
        csvContent = rows.join('\n');
      } else if (bookType === 'bank') {
        const rows = [
          `"BANK BOOK (DIGITAL & CHEQUE LEDGER) - ${filterRange.label}"`,
          `"Generated At:","${new Date().toISOString()}"`,
          `"Total Bank In:","₹${registers.bankBook.totalIn.toFixed(2)}","Total Bank Out:","₹${registers.bankBook.totalOut.toFixed(2)}","Closing Balance:","₹${registers.bankBook.closingBalance.toFixed(2)}"`,
          '',
          '"Date","Voucher Type","Party / Particulars","Reference No","Mode","Bank In (Receipt)","Bank Out (Disbursement)","Running Balance"',
          ...registers.bankBook.transactions.map((t) =>
            [
              `"${t.date.split('T')[0]}"`,
              `"${t.voucherType}"`,
              `"${t.partyName.replace(/"/g, '""')}"`,
              `"${t.referenceNumber || ''}"`,
              `"${t.paymentMethod}"`,
              t.amountIn.toFixed(2),
              t.amountOut.toFixed(2),
              t.runningBalance.toFixed(2),
            ].join(',')
          ),
        ];
        csvContent = rows.join('\n');
      } else if (bookType === 'customer_outstanding') {
        const rows = [
          `"CUSTOMER OUTSTANDING (RECEIVABLES) REPORT"`,
          `"As of:","${filterRange.endDate.toISOString().split('T')[0]}"`,
          `"Total Receivables:","₹${overview.balances.totalCustomerReceivables.toFixed(2)}"`,
          '',
          '"Customer Name","Mobile","GSTIN","Opening Balance","Total Invoiced","Total Paid","Current Outstanding Due","Unpaid Invoices"',
          ...registers.customerOutstanding.map((c) =>
            [
              `"${c.name.replace(/"/g, '""')}"`,
              `"${c.mobile}"`,
              `"${c.gstin || ''}"`,
              c.openingBalance.toFixed(2),
              c.billedTotal.toFixed(2),
              c.paidTotal.toFixed(2),
              c.currentOutstanding.toFixed(2),
              c.unpaidInvoicesCount,
            ].join(',')
          ),
        ];
        csvContent = rows.join('\n');
      } else if (bookType === 'supplier_payable') {
        const rows = [
          `"SUPPLIER PAYABLE REPORT"`,
          `"As of:","${filterRange.endDate.toISOString().split('T')[0]}"`,
          `"Total Payables:","₹${overview.balances.totalSupplierPayables.toFixed(2)}"`,
          '',
          '"Supplier Name","Phone","GSTIN","Opening Balance","Total Purchases","Total Paid","Current Amount Payable","Unpaid Bills"',
          ...registers.supplierPayable.map((s) =>
            [
              `"${s.name.replace(/"/g, '""')}"`,
              `"${s.phone}"`,
              `"${s.gstin || ''}"`,
              s.openingBalance.toFixed(2),
              s.purchasesTotal.toFixed(2),
              s.paidTotal.toFixed(2),
              s.currentPayable.toFixed(2),
              s.unpaidPurchasesCount,
            ].join(',')
          ),
        ];
        csvContent = rows.join('\n');
      } else if (bookType === 'pnl') {
        const p = overview.profitability;
        const rows = [
          `"PROFIT & LOSS STATEMENT - ${filterRange.label}"`,
          `"Generated At:","${new Date().toISOString()}"`,
          '',
          '"Metric","Amount"',
          `"Operating Revenue (Taxable Turnover)","₹${p.revenue.toFixed(2)}"`,
          `"Direct Costs / Procurement (COGS)","₹${p.directCost.toFixed(2)}"`,
          `"GROSS PROFIT","₹${p.grossProfit.toFixed(2)}"`,
          `"Gross Margin %","${p.grossMarginPercent.toFixed(2)}%"`,
          `"Operating Overheads / Expenses","₹${p.operatingExpenses.toFixed(2)}"`,
          `"ESTIMATED NET PROFIT","₹${p.netProfit.toFixed(2)}"`,
          `"Net Margin %","${p.netMarginPercent.toFixed(2)}%"`,
          '',
          '"--- OPERATIONAL EXPENSES BY CATEGORY ---"',
          '"Category","Amount"',
          ...Object.entries(registers.expenses.categoryBreakdown).map(
            ([cat, amt]) => `"${cat}","₹${amt.toFixed(2)}"`
          ),
        ];
        csvContent = rows.join('\n');
      } else {
        // Expense register by default
        const rows = [
          `"EXPENSE REGISTER REPORT - ${filterRange.label}"`,
          `"Total Expenses:","₹${registers.expenses.totalAmount.toFixed(2)}"`,
          '',
          '"Date","Category","Payee","Amount","Payment Method","Reference No","Notes"',
          ...registers.expenses.items.map((e) =>
            [
              `"${e.expenseDate.split('T')[0]}"`,
              `"${e.category}"`,
              `"${e.payee.replace(/"/g, '""')}"`,
              e.amount.toFixed(2),
              `"${e.paymentMethod}"`,
              `"${e.referenceNumber || ''}"`,
              `"${(e.notes || '').replace(/"/g, '""')}"`,
            ].join(',')
          ),
        ];
        csvContent = rows.join('\n');
      }

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${bookType}_report_${filterRange.financialYear}_${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      filter: filterRange,
      profitability: overview.profitability,
      cashBook: registers.cashBook,
      bankBook: registers.bankBook,
      expenses: registers.expenses,
      customerOutstanding: registers.customerOutstanding,
      supplierPayable: registers.supplierPayable,
    });
  } catch (error: unknown) {
    console.error('Financial Registers error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to generate Financial Registers';
    const status = (error as any)?.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
