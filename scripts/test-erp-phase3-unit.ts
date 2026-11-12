import assert from 'node:assert/strict';
import { AccountingGroupType, LedgerNature, Prisma } from '@prisma/client';
import {
  computeBalanceSheetFromTrialBalance,
  computeProfitAndLossFromTrialBalance,
} from '../src/lib/accounting/financialStatements';
import { TrialBalanceRow, toDecimal2 } from '../src/lib/accounting/ledgerService';

function runTest(name: string, fn: () => void) {
  fn();
  console.log(`PASS: ${name}`);
}

function makeRow(input: {
  ledgerId: string;
  ledgerName: string;
  ledgerCode?: string;
  nature: LedgerNature;
  groupName: string;
  groupType: AccountingGroupType;
  closingDr?: string;
  closingCr?: string;
}): TrialBalanceRow {
  return {
    ledgerId: input.ledgerId,
    ledgerName: input.ledgerName,
    ledgerCode: input.ledgerCode ?? null,
    nature: input.nature,
    groupId: `grp_${input.groupName.toLowerCase().replace(/\s+/g, '_')}`,
    groupName: input.groupName,
    groupType: input.groupType,
    openingDr: '0.00',
    openingCr: '0.00',
    periodDr: input.closingDr ?? '0.00',
    periodCr: input.closingCr ?? '0.00',
    closingDr: input.closingDr ?? '0.00',
    closingCr: input.closingCr ?? '0.00',
  };
}

console.log('=== Pakka Chittha ERP Phase 3 Unit Tests ===');

runTest(
  'computeProfitAndLossFromTrialBalance computes Trading Gross Profit, Net Profit, and Previous FY comparison',
  () => {
    const currentRows: TrialBalanceRow[] = [
      makeRow({
        ledgerId: 'sales',
        ledgerName: 'Sales Account',
        ledgerCode: 'SALES',
        nature: LedgerNature.CREDIT_NORMAL,
        groupName: 'Direct Income',
        groupType: AccountingGroupType.INCOME,
        closingCr: '100000.00',
      }),
      makeRow({
        ledgerId: 'purchases',
        ledgerName: 'Purchases Account',
        ledgerCode: 'PURCHASES',
        nature: LedgerNature.DEBIT_NORMAL,
        groupName: 'Direct Expenses',
        groupType: AccountingGroupType.EXPENSES,
        closingDr: '60000.00',
      }),
      makeRow({
        ledgerId: 'interest',
        ledgerName: 'Bank Interest Received',
        nature: LedgerNature.CREDIT_NORMAL,
        groupName: 'Indirect Income',
        groupType: AccountingGroupType.INCOME,
        closingCr: '2500.00',
      }),
      makeRow({
        ledgerId: 'rent',
        ledgerName: 'Office Rent',
        nature: LedgerNature.DEBIT_NORMAL,
        groupName: 'Indirect Expenses',
        groupType: AccountingGroupType.EXPENSES,
        closingDr: '12500.00',
      }),
    ];

    const prevRows: TrialBalanceRow[] = [
      makeRow({
        ledgerId: 'sales',
        ledgerName: 'Sales Account',
        ledgerCode: 'SALES',
        nature: LedgerNature.CREDIT_NORMAL,
        groupName: 'Direct Income',
        groupType: AccountingGroupType.INCOME,
        closingCr: '80000.00',
      }),
      makeRow({
        ledgerId: 'purchases',
        ledgerName: 'Purchases Account',
        ledgerCode: 'PURCHASES',
        nature: LedgerNature.DEBIT_NORMAL,
        groupName: 'Direct Expenses',
        groupType: AccountingGroupType.EXPENSES,
        closingDr: '50000.00',
      }),
      makeRow({
        ledgerId: 'rent',
        ledgerName: 'Office Rent',
        nature: LedgerNature.DEBIT_NORMAL,
        groupName: 'Indirect Expenses',
        groupType: AccountingGroupType.EXPENSES,
        closingDr: '10000.00',
      }),
    ];

    const pnl = computeProfitAndLossFromTrialBalance(
      currentRows,
      'FY2026-27',
      null,
      prevRows,
      'FY2025-26'
    );

    assert.equal(pnl.totals.totalDirectIncome, '100000.00');
    assert.equal(pnl.totals.totalDirectExpenses, '60000.00');
    assert.equal(pnl.totals.grossProfit, '40000.00');
    assert.equal(pnl.totals.totalIndirectIncome, '2500.00');
    assert.equal(pnl.totals.totalIndirectExpenses, '12500.00');
    assert.equal(pnl.totals.netProfit, '30000.00');
    assert.equal(pnl.compareFyCode, 'FY2025-26');
    assert.equal(pnl.totals.prevGrossProfit, '30000.00');
    assert.equal(pnl.totals.prevNetProfit, '20000.00');
  }
);

runTest(
  'computeBalanceSheetFromTrialBalance balances Assets === Capital + Net Profit + Liabilities (and handles Net Loss)',
  () => {
    // Profitable business:
    // Capital Cr 50,000 + Sundry Creditors Cr 20,000 + Net Profit 30,000 = 1,00,000
    // Fixed Assets Dr 40,000 + Bank Dr 60,000 = 1,00,000
    const profitTb: TrialBalanceRow[] = [
      makeRow({
        ledgerId: 'cap',
        ledgerName: 'Owner Capital',
        ledgerCode: 'CAPITAL',
        nature: LedgerNature.CREDIT_NORMAL,
        groupName: 'Capital Account',
        groupType: AccountingGroupType.CAPITAL,
        closingCr: '50000.00',
      }),
      makeRow({
        ledgerId: 'cred',
        ledgerName: 'Sundry Creditors',
        ledgerCode: 'CREDITORS',
        nature: LedgerNature.CREDIT_NORMAL,
        groupName: 'Current Liabilities',
        groupType: AccountingGroupType.LIABILITIES,
        closingCr: '20000.00',
      }),
      makeRow({
        ledgerId: 'mach',
        ledgerName: 'Plant & Machinery',
        nature: LedgerNature.DEBIT_NORMAL,
        groupName: 'Fixed Assets',
        groupType: AccountingGroupType.ASSETS,
        closingDr: '40000.00',
      }),
      makeRow({
        ledgerId: 'bank',
        ledgerName: 'HDFC Bank',
        ledgerCode: 'BANK',
        nature: LedgerNature.DEBIT_NORMAL,
        groupName: 'Current Assets',
        groupType: AccountingGroupType.ASSETS,
        closingDr: '60000.00',
      }),
    ];

    const bsProfit = computeBalanceSheetFromTrialBalance(
      profitTb,
      new Prisma.Decimal('30000.00'),
      'FY2026-27'
    );
    assert.equal(bsProfit.isBalanced, true);
    assert.equal(bsProfit.difference, '0.00');
    assert.equal(bsProfit.liabilitiesAndEquity.total, '100000.00');
    assert.equal(bsProfit.assets.total, '100000.00');

    // Loss scenario: Capital 50,000 - Net Loss 10,000 = 40,000 Equity; Bank = 40,000 Asset
    const lossTb: TrialBalanceRow[] = [
      makeRow({
        ledgerId: 'cap',
        ledgerName: 'Owner Capital',
        ledgerCode: 'CAPITAL',
        nature: LedgerNature.CREDIT_NORMAL,
        groupName: 'Capital Account',
        groupType: AccountingGroupType.CAPITAL,
        closingCr: '50000.00',
      }),
      makeRow({
        ledgerId: 'bank',
        ledgerName: 'HDFC Bank',
        ledgerCode: 'BANK',
        nature: LedgerNature.DEBIT_NORMAL,
        groupName: 'Current Assets',
        groupType: AccountingGroupType.ASSETS,
        closingDr: '40000.00',
      }),
    ];

    const bsLoss = computeBalanceSheetFromTrialBalance(
      lossTb,
      new Prisma.Decimal('-10000.00'),
      'FY2026-27'
    );
    assert.equal(bsLoss.isBalanced, true);
    assert.equal(bsLoss.difference, '0.00');
    assert.equal(bsLoss.liabilitiesAndEquity.currentYearProfitOrLoss, '-10000.00');
    assert.equal(bsLoss.liabilitiesAndEquity.total, '40000.00');
    assert.equal(bsLoss.assets.total, '40000.00');
  }
);

runTest(
  'Closed-FY Balance Sheet invariant avoids double-counting once P&L transfers to Retained Earnings',
  () => {
    // Open FY TB: Capital 50,000 Cr; Bank 80,000 Dr; Sales 50,000 Cr; Rent 20,000 Dr
    const openRows: TrialBalanceRow[] = [
      makeRow({
        ledgerId: 'cap',
        ledgerName: 'Owner Capital',
        ledgerCode: 'CAPITAL',
        nature: LedgerNature.CREDIT_NORMAL,
        groupName: 'Capital Account',
        groupType: AccountingGroupType.CAPITAL,
        closingCr: '50000.00',
      }),
      makeRow({
        ledgerId: 'bank',
        ledgerName: 'Bank Account',
        ledgerCode: 'BANK',
        nature: LedgerNature.DEBIT_NORMAL,
        groupName: 'Current Assets',
        groupType: AccountingGroupType.ASSETS,
        closingDr: '80000.00',
      }),
      makeRow({
        ledgerId: 'sales',
        ledgerName: 'Sales',
        ledgerCode: 'SALES',
        nature: LedgerNature.CREDIT_NORMAL,
        groupName: 'Direct Income',
        groupType: AccountingGroupType.INCOME,
        closingCr: '50000.00',
      }),
      makeRow({
        ledgerId: 'rent',
        ledgerName: 'Rent Expense',
        nature: LedgerNature.DEBIT_NORMAL,
        groupName: 'Indirect Expenses',
        groupType: AccountingGroupType.EXPENSES,
        closingDr: '20000.00',
      }),
    ];

    const openPnl = computeProfitAndLossFromTrialBalance(openRows, 'FY2026-27');
    assert.equal(openPnl.totals.netProfit, '30000.00');

    const openBs = computeBalanceSheetFromTrialBalance(
      openRows,
      toDecimal2(openPnl.totals.netProfit),
      'FY2026-27'
    );
    assert.equal(openBs.isBalanced, true);
    assert.equal(openBs.assets.total, '80000.00');

    // After CLOSING_ENTRY voucher posts: Sales = 0, Rent = 0, Retained Earnings = 30,000 Cr
    const closedRows: TrialBalanceRow[] = [
      openRows[0],
      openRows[1],
      makeRow({
        ledgerId: 'ret',
        ledgerName: 'Retained Earnings / P&L Reserve',
        ledgerCode: 'RETAINED',
        nature: LedgerNature.CREDIT_NORMAL,
        groupName: 'Capital Account',
        groupType: AccountingGroupType.CAPITAL,
        closingCr: '30000.00',
      }),
      makeRow({
        ledgerId: 'sales',
        ledgerName: 'Sales',
        ledgerCode: 'SALES',
        nature: LedgerNature.CREDIT_NORMAL,
        groupName: 'Direct Income',
        groupType: AccountingGroupType.INCOME,
        closingCr: '0.00',
      }),
      makeRow({
        ledgerId: 'rent',
        ledgerName: 'Rent Expense',
        nature: LedgerNature.DEBIT_NORMAL,
        groupName: 'Indirect Expenses',
        groupType: AccountingGroupType.EXPENSES,
        closingDr: '0.00',
      }),
    ];

    const closedPnl = computeProfitAndLossFromTrialBalance(closedRows, 'FY2026-27');
    assert.equal(closedPnl.totals.netProfit, '0.00');

    const closedBs = computeBalanceSheetFromTrialBalance(
      closedRows,
      toDecimal2(closedPnl.totals.netProfit),
      'FY2026-27'
    );
    assert.equal(closedBs.isBalanced, true);
    assert.equal(closedBs.difference, '0.00');
    assert.equal(closedBs.liabilitiesAndEquity.total, '80000.00');
    assert.equal(closedBs.assets.total, '80000.00');
  }
);

