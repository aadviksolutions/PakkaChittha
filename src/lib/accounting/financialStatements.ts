import {
  AccountingGroupType,
  InvoiceStatus,
  Prisma,
  PurchaseStatus,
  VoucherStatus,
} from '@prisma/client';
import prisma from '@/lib/prisma';
import { buildIndianFyWindow, parseIndianFyCode } from '@/lib/rbac/fiscalYear';
import { SYSTEM_LEDGER_CODES, ensureBusinessCOA } from './chartOfAccounts';
import { TrialBalanceRow, getTrialBalance, toDecimal2 } from './ledgerService';

export interface StatementLineItem {
  ledgerId: string;
  ledgerName: string;
  ledgerCode: string | null;
  groupName: string;
  amount: string;
  prevAmount?: string;
}

export interface ProfitAndLossStatement {
  fyCode: string;
  compareFyCode: string | null;
  branchId: string | null;
  directIncome: StatementLineItem[];
  indirectIncome: StatementLineItem[];
  directExpenses: StatementLineItem[];
  indirectExpenses: StatementLineItem[];
  totals: {
    totalDirectIncome: string;
    totalDirectExpenses: string;
    grossProfit: string;
    totalIndirectIncome: string;
    totalIndirectExpenses: string;
    netProfit: string;
    prevGrossProfit?: string;
    prevNetProfit?: string;
  };
}

export interface BalanceSheetSection {
  groupName: string;
  items: StatementLineItem[];
  subtotal: string;
}

export interface BalanceSheetStatement {
  fyCode: string;
  branchId: string | null;
  liabilitiesAndEquity: {
    capital: BalanceSheetSection[];
    currentYearProfitOrLoss: string;
    longTermLiabilities: BalanceSheetSection[];
    currentLiabilities: BalanceSheetSection[];
    total: string;
  };
  assets: {
    fixedAssets: BalanceSheetSection[];
    currentAssets: BalanceSheetSection[];
    total: string;
  };
  difference: string;
  isBalanced: boolean;
}

export interface CashFlowActivityLine {
  label: string;
  amount: string;
}

export interface CashFlowStatement {
  fyCode: string;
  branchId: string | null;
  openingCashAndBank: string;
  operatingActivities: CashFlowActivityLine[];
  netOperatingCash: string;
  investingActivities: CashFlowActivityLine[];
  netInvestingCash: string;
  financingActivities: CashFlowActivityLine[];
  netFinancingCash: string;
  netCashChange: string;
  closingCashAndBank: string;
}

export interface AgeingBuckets {
  current: string;
  days1to30: string;
  days31to60: string;
  days61to90: string;
  days90plus: string;
  total: string;
}

export interface PartyAgeingGroup {
  partyId: string;
  partyName: string;
  partyContact: string;
  documentCount: number;
  buckets: AgeingBuckets;
}

export interface PartyAgeingDocument {
  id: string;
  documentNumber: string;
  partyId: string;
  partyName: string;
  documentDate: string;
  dueDate: string;
  daysOverdue: number;
  bucket: 'current' | 'days1to30' | 'days31to60' | 'days61to90' | 'days90plus';
  totalAmount: string;
  balanceDue: string;
}

export interface PartyAgeingReport {
  asOfDate: string;
  receivables: {
    totals: AgeingBuckets;
    parties: PartyAgeingGroup[];
    documents: PartyAgeingDocument[];
  };
  payables: {
    totals: AgeingBuckets;
    parties: PartyAgeingGroup[];
    documents: PartyAgeingDocument[];
  };
}

function decSum(values: Prisma.Decimal[]): Prisma.Decimal {
  return values.reduce((acc, v) => acc.plus(v), new Prisma.Decimal(0)).toDecimalPlaces(2);
}

/**
 * Computes Trading & Profit & Loss Statement from Trial Balance rows (pure Decimal math).
 */
export function computeProfitAndLossFromTrialBalance(
  rows: TrialBalanceRow[],
  fyCode: string,
  branchId: string | null = null,
  prevRows?: TrialBalanceRow[],
  compareFyCode: string | null = null
): ProfitAndLossStatement {
  const prevNetMap = new Map<string, Prisma.Decimal>();
  if (prevRows) {
    for (const pr of prevRows) {
      const dr = toDecimal2(pr.closingDr);
      const cr = toDecimal2(pr.closingCr);
      const signed =
        pr.groupType === AccountingGroupType.INCOME ? cr.minus(dr) : dr.minus(cr);
      prevNetMap.set(pr.ledgerId, signed);
    }
  }

  const directIncome: StatementLineItem[] = [];
  const indirectIncome: StatementLineItem[] = [];
  const directExpenses: StatementLineItem[] = [];
  const indirectExpenses: StatementLineItem[] = [];

  let sumDirectInc = new Prisma.Decimal(0);
  let sumIndirectInc = new Prisma.Decimal(0);
  let sumDirectExp = new Prisma.Decimal(0);
  let sumIndirectExp = new Prisma.Decimal(0);

  for (const r of rows) {
    if (
      r.groupType !== AccountingGroupType.INCOME &&
      r.groupType !== AccountingGroupType.EXPENSES
    ) {
      continue;
    }

    const dr = toDecimal2(r.closingDr);
    const cr = toDecimal2(r.closingCr);
    const amount =
      r.groupType === AccountingGroupType.INCOME ? cr.minus(dr) : dr.minus(cr);
    const prevAmt = prevNetMap.get(r.ledgerId);

    if (amount.eq(0) && (!prevAmt || prevAmt.eq(0))) {
      continue;
    }

    const item: StatementLineItem = {
      ledgerId: r.ledgerId,
      ledgerName: r.ledgerName,
      ledgerCode: r.ledgerCode,
      groupName: r.groupName,
      amount: amount.toFixed(2),
      ...(prevRows ? { prevAmount: (prevAmt ?? new Prisma.Decimal(0)).toFixed(2) } : {}),
    };

    const isDirect = r.groupName.toLowerCase().includes('direct') &&
      !r.groupName.toLowerCase().includes('indirect');

    if (r.groupType === AccountingGroupType.INCOME) {
      if (isDirect) {
        directIncome.push(item);
        sumDirectInc = sumDirectInc.plus(amount);
      } else {
        indirectIncome.push(item);
        sumIndirectInc = sumIndirectInc.plus(amount);
      }
    } else {
      if (isDirect) {
        directExpenses.push(item);
        sumDirectExp = sumDirectExp.plus(amount);
      } else {
        indirectExpenses.push(item);
        sumIndirectExp = sumIndirectExp.plus(amount);
      }
    }
  }

  const grossProfit = sumDirectInc.minus(sumDirectExp);
  const netProfit = grossProfit.plus(sumIndirectInc).minus(sumIndirectExp);

  let prevGrossProfitStr: string | undefined;
  let prevNetProfitStr: string | undefined;
  if (prevRows) {
    const prevPnl = computeProfitAndLossFromTrialBalance(
      prevRows,
      compareFyCode || fyCode,
      branchId
    );
    prevGrossProfitStr = prevPnl.totals.grossProfit;
    prevNetProfitStr = prevPnl.totals.netProfit;
  }

  return {
    fyCode,
    compareFyCode,
    branchId,
    directIncome,
    indirectIncome,
    directExpenses,
    indirectExpenses,
    totals: {
      totalDirectIncome: sumDirectInc.toFixed(2),
      totalDirectExpenses: sumDirectExp.toFixed(2),
      grossProfit: grossProfit.toFixed(2),
      totalIndirectIncome: sumIndirectInc.toFixed(2),
      totalIndirectExpenses: sumIndirectExp.toFixed(2),
      netProfit: netProfit.toFixed(2),
      ...(prevRows
        ? { prevGrossProfit: prevGrossProfitStr, prevNetProfit: prevNetProfitStr }
        : {}),
    },
  };
}

/**
 * Computes Schedule-aligned Balance Sheet from Trial Balance rows + Net Profit/Loss.
 */
export function computeBalanceSheetFromTrialBalance(
  rows: TrialBalanceRow[],
  netProfitDecimal: Prisma.Decimal,
  fyCode: string,
  branchId: string | null = null
): BalanceSheetStatement {
  const bucketize = (
    targetTypes: AccountingGroupType[],
    creditNormal: boolean
  ): Map<string, StatementLineItem[]> => {
    const map = new Map<string, StatementLineItem[]>();
    for (const r of rows) {
      if (!targetTypes.includes(r.groupType)) continue;
      const dr = toDecimal2(r.closingDr);
      const cr = toDecimal2(r.closingCr);
      const signed = creditNormal ? cr.minus(dr) : dr.minus(cr);
      if (signed.eq(0)) continue;

      const list = map.get(r.groupName) || [];
      list.push({
        ledgerId: r.ledgerId,
        ledgerName: r.ledgerName,
        ledgerCode: r.ledgerCode,
        groupName: r.groupName,
        amount: signed.toFixed(2),
      });
      map.set(r.groupName, list);
    }
    return map;
  };

  const toSections = (map: Map<string, StatementLineItem[]>): BalanceSheetSection[] =>
    Array.from(map.entries()).map(([groupName, items]) => ({
      groupName,
      items,
      subtotal: decSum(items.map((i) => toDecimal2(i.amount))).toFixed(2),
    }));

  const capitalMap = bucketize([AccountingGroupType.CAPITAL], true);
  const liabMap = bucketize([AccountingGroupType.LIABILITIES], true);
  const assetMap = bucketize([AccountingGroupType.ASSETS], false);

  const capital = toSections(capitalMap);
  const longTermLiabilities: BalanceSheetSection[] = [];
  const currentLiabilities: BalanceSheetSection[] = [];
  for (const sec of toSections(liabMap)) {
    if (sec.groupName.toLowerCase().includes('long')) {
      longTermLiabilities.push(sec);
    } else {
      currentLiabilities.push(sec);
    }
  }

  const fixedAssets: BalanceSheetSection[] = [];
  const currentAssets: BalanceSheetSection[] = [];
  for (const sec of toSections(assetMap)) {
    if (sec.groupName.toLowerCase().includes('fixed')) {
      fixedAssets.push(sec);
    } else {
      currentAssets.push(sec);
    }
  }

  const sumSections = (secs: BalanceSheetSection[]) =>
    decSum(secs.map((s) => toDecimal2(s.subtotal)));

  const totalLiabilitiesAndEquity = sumSections(capital)
    .plus(netProfitDecimal)
    .plus(sumSections(longTermLiabilities))
    .plus(sumSections(currentLiabilities));

  const totalAssets = sumSections(fixedAssets).plus(sumSections(currentAssets));
  const difference = totalAssets.minus(totalLiabilitiesAndEquity).toDecimalPlaces(2);

  return {
    fyCode,
    branchId,
    liabilitiesAndEquity: {
      capital,
      currentYearProfitOrLoss: netProfitDecimal.toFixed(2),
      longTermLiabilities,
      currentLiabilities,
      total: totalLiabilitiesAndEquity.toFixed(2),
    },
    assets: {
      fixedAssets,
      currentAssets,
      total: totalAssets.toFixed(2),
    },
    difference: difference.toFixed(2),
    isBalanced: difference.abs().lte(new Prisma.Decimal('0.01')),
  };
}

export async function getProfitAndLossStatement(
  businessId: string,
  fyCodeParam?: string | null,
  branchId?: string | null,
  comparePrevFy = false
): Promise<ProfitAndLossStatement> {
  const fy = parseIndianFyCode(fyCodeParam);
  const effectiveBranchId = branchId && branchId !== 'ALL' ? branchId : null;

  const existingCount = await prisma.ledger.count({ where: { businessId } });
  if (existingCount === 0) {
    await ensureBusinessCOA(businessId, fy.code);
  }

  const currentTb = await getTrialBalance(businessId, fy.code, effectiveBranchId || undefined);

  let prevRows: TrialBalanceRow[] | undefined;
  let compareFyCode: string | null = null;
  if (comparePrevFy) {
    const prevFy = buildIndianFyWindow(fy.startYear - 1);
    compareFyCode = prevFy.code;
    const prevTb = await getTrialBalance(businessId, prevFy.code, effectiveBranchId || undefined);
    prevRows = prevTb.rows;
  }

  return computeProfitAndLossFromTrialBalance(
    currentTb.rows,
    fy.code,
    effectiveBranchId,
    prevRows,
    compareFyCode
  );
}

export async function getBalanceSheetStatement(
  businessId: string,
  fyCodeParam?: string | null,
  branchId?: string | null
): Promise<BalanceSheetStatement> {
  const fy = parseIndianFyCode(fyCodeParam);
  const effectiveBranchId = branchId && branchId !== 'ALL' ? branchId : null;

  const existingCount = await prisma.ledger.count({ where: { businessId } });
  if (existingCount === 0) {
    await ensureBusinessCOA(businessId, fy.code);
  }

  const tb = await getTrialBalance(businessId, fy.code, effectiveBranchId || undefined);
  const pnl = computeProfitAndLossFromTrialBalance(tb.rows, fy.code, effectiveBranchId);

  return computeBalanceSheetFromTrialBalance(
    tb.rows,
    toDecimal2(pnl.totals.netProfit),
    fy.code,
    effectiveBranchId
  );
}

/**
 * Builds Direct-Method Cash Flow Statement from all POSTED vouchers touching Cash/Bank ledgers.
 */
export async function getCashFlowStatement(
  businessId: string,
  fyCodeParam?: string | null,
  branchId?: string | null
): Promise<CashFlowStatement> {
  const fy = parseIndianFyCode(fyCodeParam);
  const effectiveBranchId = branchId && branchId !== 'ALL' ? branchId : null;

  const existingCount = await prisma.ledger.count({ where: { businessId } });
  if (existingCount === 0) {
    await ensureBusinessCOA(businessId, fy.code);
  }

  const cashBankLedgers = await prisma.ledger.findMany({
    where: {
      businessId,
      isActive: true,
      OR: [
        { code: { in: [SYSTEM_LEDGER_CODES.CASH, SYSTEM_LEDGER_CODES.BANK] } },
        { name: { contains: 'cash', mode: 'insensitive' } },
        { name: { contains: 'bank', mode: 'insensitive' } },
      ],
    },
    include: { group: { select: { type: true } } },
  });

  const cashLedgerIds = new Set(
    cashBankLedgers
      .filter((l) => l.group.type === AccountingGroupType.ASSETS && l.code !== 'DEBTORS')
      .map((l) => l.id)
  );

  let openingCashAndBank = new Prisma.Decimal(0);
  if (!effectiveBranchId) {
    for (const l of cashBankLedgers) {
      if (!cashLedgerIds.has(l.id)) continue;
      const bal = toDecimal2(l.openingBalance);
      openingCashAndBank =
        l.openingBalanceType === 'CR'
          ? openingCashAndBank.minus(bal)
          : openingCashAndBank.plus(bal);
    }
  }

  const vouchers = await prisma.voucher.findMany({
    where: {
      businessId,
      fyCode: fy.code,
      status: VoucherStatus.POSTED,
      ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
      entries: {
        some: { ledgerId: { in: Array.from(cashLedgerIds) } },
      },
    },
    include: {
      entries: {
        include: {
          ledger: {
            select: {
              id: true,
              name: true,
              code: true,
              group: { select: { name: true, type: true } },
            },
          },
        },
      },
    },
  });

  let receiptsFromCustomers = new Prisma.Decimal(0);
  let paymentsToSuppliers = new Prisma.Decimal(0);
  let operatingExpensesAndTaxes = new Prisma.Decimal(0);
  let investingFixedAssets = new Prisma.Decimal(0);
  let financingCapital = new Prisma.Decimal(0);
  let financingLoans = new Prisma.Decimal(0);

  for (const v of vouchers) {
    let voucherCashDelta = new Prisma.Decimal(0);
    const counterLedgers: Array<{
      name: string;
      code: string | null;
      groupName: string;
      groupType: AccountingGroupType;
    }> = [];

    for (const entry of v.entries) {
      if (cashLedgerIds.has(entry.ledgerId)) {
        voucherCashDelta = voucherCashDelta
          .plus(toDecimal2(entry.debitAmount))
          .minus(toDecimal2(entry.creditAmount));
      } else {
        counterLedgers.push({
          name: entry.ledger.name,
          code: entry.ledger.code,
          groupName: entry.ledger.group.name,
          groupType: entry.ledger.group.type,
        });
      }
    }

    // Internal Contra transfers between Cash & Bank net to zero cash change
    if (voucherCashDelta.eq(0) || counterLedgers.length === 0) {
      continue;
    }

    const primaryCounter = counterLedgers[0];
    const groupLower = primaryCounter.groupName.toLowerCase();

    if (groupLower.includes('fixed') && primaryCounter.groupType === AccountingGroupType.ASSETS) {
      investingFixedAssets = investingFixedAssets.plus(voucherCashDelta);
    } else if (primaryCounter.groupType === AccountingGroupType.CAPITAL) {
      financingCapital = financingCapital.plus(voucherCashDelta);
    } else if (
      primaryCounter.groupType === AccountingGroupType.LIABILITIES &&
      groupLower.includes('long')
    ) {
      financingLoans = financingLoans.plus(voucherCashDelta);
    } else if (
      primaryCounter.code === SYSTEM_LEDGER_CODES.DEBTORS ||
      primaryCounter.groupType === AccountingGroupType.INCOME ||
      voucherCashDelta.gt(0)
    ) {
      receiptsFromCustomers = receiptsFromCustomers.plus(voucherCashDelta);
    } else if (
      primaryCounter.code === SYSTEM_LEDGER_CODES.CREDITORS ||
      primaryCounter.code === SYSTEM_LEDGER_CODES.PURCHASES
    ) {
      paymentsToSuppliers = paymentsToSuppliers.plus(voucherCashDelta);
    } else {
      operatingExpensesAndTaxes = operatingExpensesAndTaxes.plus(voucherCashDelta);
    }
  }

  const operatingActivities: CashFlowActivityLine[] = [
    { label: 'Cash Receipts from Customers & Revenue', amount: receiptsFromCustomers.toFixed(2) },
    { label: 'Cash Paid to Suppliers & Purchases', amount: paymentsToSuppliers.toFixed(2) },
    {
      label: 'Operating Expenses, Payroll & Tax Payments',
      amount: operatingExpensesAndTaxes.toFixed(2),
    },
  ];
  const netOperatingCash = receiptsFromCustomers
    .plus(paymentsToSuppliers)
    .plus(operatingExpensesAndTaxes);

  const investingActivities: CashFlowActivityLine[] = [
    { label: 'Fixed Assets Purchase / Disposal', amount: investingFixedAssets.toFixed(2) },
  ];
  const netInvestingCash = investingFixedAssets;

  const financingActivities: CashFlowActivityLine[] = [
    { label: 'Capital Introduced / Drawings', amount: financingCapital.toFixed(2) },
    { label: 'Borrowings / Loan Repayments', amount: financingLoans.toFixed(2) },
  ];
  const netFinancingCash = financingCapital.plus(financingLoans);

  const netCashChange = netOperatingCash.plus(netInvestingCash).plus(netFinancingCash);
  const closingCashAndBank = openingCashAndBank.plus(netCashChange);

  return {
    fyCode: fy.code,
    branchId: effectiveBranchId,
    openingCashAndBank: openingCashAndBank.toFixed(2),
    operatingActivities,
    netOperatingCash: netOperatingCash.toFixed(2),
    investingActivities,
    netInvestingCash: netInvestingCash.toFixed(2),
    financingActivities,
    netFinancingCash: netFinancingCash.toFixed(2),
    netCashChange: netCashChange.toFixed(2),
    closingCashAndBank: closingCashAndBank.toFixed(2),
  };
}

function classifyAgeingBucket(
  dueDate: Date,
  asOfDate: Date
): { daysOverdue: number; bucket: PartyAgeingDocument['bucket'] } {
  const msPerDay = 1000 * 60 * 60 * 24;
  const dueUtc = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
  const asOfUtc = Date.UTC(
    asOfDate.getUTCFullYear(),
    asOfDate.getUTCMonth(),
    asOfDate.getUTCDate()
  );
  const daysOverdue = Math.floor((asOfUtc - dueUtc) / msPerDay);

  if (daysOverdue <= 0) return { daysOverdue: 0, bucket: 'current' };
  if (daysOverdue <= 30) return { daysOverdue, bucket: 'days1to30' };
  if (daysOverdue <= 60) return { daysOverdue, bucket: 'days31to60' };
  if (daysOverdue <= 90) return { daysOverdue, bucket: 'days61to90' };
  return { daysOverdue, bucket: 'days90plus' };
}

function emptyMutableBuckets() {
  return {
    current: new Prisma.Decimal(0),
    days1to30: new Prisma.Decimal(0),
    days31to60: new Prisma.Decimal(0),
    days61to90: new Prisma.Decimal(0),
    days90plus: new Prisma.Decimal(0),
    total: new Prisma.Decimal(0),
  };
}

function finalizeBuckets(b: ReturnType<typeof emptyMutableBuckets>): AgeingBuckets {
  return {
    current: b.current.toFixed(2),
    days1to30: b.days1to30.toFixed(2),
    days31to60: b.days31to60.toFixed(2),
    days61to90: b.days61to90.toFixed(2),
    days90plus: b.days90plus.toFixed(2),
    total: b.total.toFixed(2),
  };
}

/**
 * Generates real bill-by-bill Receivables & Payables ageing from open Invoices and Purchases.
 */
export async function getPartyAgeingReport(
  businessId: string,
  asOfDate: Date = new Date()
): Promise<PartyAgeingReport> {
  const [openInvoices, openPurchases] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        businessId,
        status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE] },
        balanceDue: { gt: 0 },
      },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        dueDate: true,
        customerId: true,
        customerName: true,
        customerMobile: true,
        total: true,
        balanceDue: true,
      },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.purchase.findMany({
      where: {
        businessId,
        status: PurchaseStatus.RECEIVED,
        balanceDue: { gt: 0 },
      },
      include: {
        supplier: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { purchaseDate: 'asc' },
    }),
  ]);

  const recTotals = emptyMutableBuckets();
  const recPartyMap = new Map<
    string,
    {
      partyId: string;
      partyName: string;
      partyContact: string;
      documentCount: number;
      buckets: ReturnType<typeof emptyMutableBuckets>;
    }
  >();
  const recDocs: PartyAgeingDocument[] = [];

  for (const inv of openInvoices) {
    const due = toDecimal2(inv.balanceDue);
    const { daysOverdue, bucket } = classifyAgeingBucket(inv.dueDate, asOfDate);

    recTotals[bucket] = recTotals[bucket].plus(due);
    recTotals.total = recTotals.total.plus(due);

    const pEntry = recPartyMap.get(inv.customerId) ?? {
      partyId: inv.customerId,
      partyName: inv.customerName,
      partyContact: inv.customerMobile,
      documentCount: 0,
      buckets: emptyMutableBuckets(),
    };
    pEntry.documentCount += 1;
    pEntry.buckets[bucket] = pEntry.buckets[bucket].plus(due);
    pEntry.buckets.total = pEntry.buckets.total.plus(due);
    recPartyMap.set(inv.customerId, pEntry);

    recDocs.push({
      id: inv.id,
      documentNumber: inv.invoiceNumber,
      partyId: inv.customerId,
      partyName: inv.customerName,
      documentDate: inv.invoiceDate.toISOString().slice(0, 10),
      dueDate: inv.dueDate.toISOString().slice(0, 10),
      daysOverdue,
      bucket,
      totalAmount: toDecimal2(inv.total).toFixed(2),
      balanceDue: due.toFixed(2),
    });
  }

  const payTotals = emptyMutableBuckets();
  const payPartyMap = new Map<
    string,
    {
      partyId: string;
      partyName: string;
      partyContact: string;
      documentCount: number;
      buckets: ReturnType<typeof emptyMutableBuckets>;
    }
  >();
  const payDocs: PartyAgeingDocument[] = [];

  for (const pur of openPurchases) {
    const due = toDecimal2(pur.balanceDue);
    const refDue = pur.dueDate || pur.purchaseDate;
    const { daysOverdue, bucket } = classifyAgeingBucket(refDue, asOfDate);

    payTotals[bucket] = payTotals[bucket].plus(due);
    payTotals.total = payTotals.total.plus(due);

    const pEntry = payPartyMap.get(pur.supplierId) ?? {
      partyId: pur.supplierId,
      partyName: pur.supplier.name,
      partyContact: pur.supplier.phone,
      documentCount: 0,
      buckets: emptyMutableBuckets(),
    };
    pEntry.documentCount += 1;
    pEntry.buckets[bucket] = pEntry.buckets[bucket].plus(due);
    pEntry.buckets.total = pEntry.buckets.total.plus(due);
    payPartyMap.set(pur.supplierId, pEntry);

    payDocs.push({
      id: pur.id,
      documentNumber: pur.purchaseNumber,
      partyId: pur.supplierId,
      partyName: pur.supplier.name,
      documentDate: pur.purchaseDate.toISOString().slice(0, 10),
      dueDate: refDue.toISOString().slice(0, 10),
      daysOverdue,
      bucket,
      totalAmount: toDecimal2(pur.total).toFixed(2),
      balanceDue: due.toFixed(2),
    });
  }

  return {
    asOfDate: asOfDate.toISOString().slice(0, 10),
    receivables: {
      totals: finalizeBuckets(recTotals),
      parties: Array.from(recPartyMap.values()).map((p) => ({
        partyId: p.partyId,
        partyName: p.partyName,
        partyContact: p.partyContact,
        documentCount: p.documentCount,
        buckets: finalizeBuckets(p.buckets),
      })),
      documents: recDocs,
    },
    payables: {
      totals: finalizeBuckets(payTotals),
      parties: Array.from(payPartyMap.values()).map((p) => ({
        partyId: p.partyId,
        partyName: p.partyName,
        partyContact: p.partyContact,
        documentCount: p.documentCount,
        buckets: finalizeBuckets(p.buckets),
      })),
      documents: payDocs,
    },
  };
}
