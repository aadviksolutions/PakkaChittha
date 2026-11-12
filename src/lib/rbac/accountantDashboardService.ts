import { ApprovalStatus, InvoiceStatus, PurchaseStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { computeUpcomingStatutoryDeadlines, parseIndianFyCode } from './fiscalYear';

export type AccountantDrilldownMetric =
  | 'sales'
  | 'purchases'
  | 'receivables'
  | 'payables'
  | 'gst'
  | 'cash_bank'
  | 'unreconciled'
  | 'drafts';

export interface AccountantDashboardParams {
  businessId: string;
  fyCode?: string | null;
  branchId?: string | null;
  drilldown?: AccountantDrilldownMetric | null;
}

const ITC_ELIGIBLE_TYPES = new Set(['ELIGIBLE', 'CAPITAL_GOODS', 'RECONCILED']);
const BANK_METHODS = new Set(['UPI', 'BANK_TRANSFER', 'CHEQUE']);

function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export async function getAccountantDashboardOverview(params: AccountantDashboardParams) {
  const fy = parseIndianFyCode(params.fyCode);
  const { businessId } = params;

  const [
    fyInvoices,
    fyPurchases,
    fyExpenses,
    fyCustomerPayments,
    fySupplierPayments,
    openReceivables,
    openPayables,
    gstr2bImports,
    pendingApprovals,
    approvedGstFilings,
    recentAuditEvents,
  ] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        businessId,
        status: { not: InvoiceStatus.CANCELLED },
        invoiceDate: { gte: fy.startDate, lte: fy.endDate },
      },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        customerName: true,
        status: true,
        subtotal: true,
        cgstTotal: true,
        sgstTotal: true,
        igstTotal: true,
        taxTotal: true,
        total: true,
        balanceDue: true,
      },
      orderBy: { invoiceDate: 'desc' },
    }),
    prisma.purchase.findMany({
      where: {
        businessId,
        status: { not: PurchaseStatus.CANCELLED },
        purchaseDate: { gte: fy.startDate, lte: fy.endDate },
      },
      select: {
        id: true,
        purchaseNumber: true,
        supplierInvoiceNumber: true,
        purchaseDate: true,
        status: true,
        subtotal: true,
        cgstTotal: true,
        sgstTotal: true,
        igstTotal: true,
        taxTotal: true,
        total: true,
        balanceDue: true,
        itcEligibility: true,
        supplier: { select: { name: true } },
      },
      orderBy: { purchaseDate: 'desc' },
    }),
    prisma.expense.findMany({
      where: {
        businessId,
        expenseDate: { gte: fy.startDate, lte: fy.endDate },
      },
      select: {
        id: true,
        category: true,
        payee: true,
        amount: true,
        paymentMethod: true,
        expenseDate: true,
      },
      orderBy: { expenseDate: 'desc' },
    }),
    prisma.payment.findMany({
      where: {
        businessId,
        paymentDate: { gte: fy.startDate, lte: fy.endDate },
      },
      select: { id: true, amount: true, paymentMethod: true, paymentDate: true },
    }),
    prisma.supplierPayment.findMany({
      where: {
        businessId,
        paymentDate: { gte: fy.startDate, lte: fy.endDate },
      },
      select: { id: true, amount: true, paymentMethod: true, paymentDate: true },
    }),
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
        customerName: true,
        total: true,
        balanceDue: true,
        status: true,
      },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.purchase.findMany({
      where: {
        businessId,
        status: { not: PurchaseStatus.CANCELLED },
        balanceDue: { gt: 0 },
      },
      select: {
        id: true,
        purchaseNumber: true,
        purchaseDate: true,
        dueDate: true,
        total: true,
        balanceDue: true,
        supplier: { select: { name: true } },
      },
      orderBy: { purchaseDate: 'desc' },
    }),
    prisma.gstr2bImport.findMany({
      where: { businessId, financialYear: fy.code },
      select: {
        id: true,
        returnPeriod: true,
        totalInvoices: true,
        matchedCount: true,
        mismatchCount: true,
        missingInBooksCount: true,
        missingIn2bCount: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.approvalRequest.findMany({
      where: { businessId, status: ApprovalStatus.PENDING },
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
    prisma.approvalRequest.findMany({
      where: {
        businessId,
        status: ApprovalStatus.APPROVED,
        requestType: 'GST_RETURN_FILING',
      },
      select: { id: true, entityId: true, decidedAt: true },
    }),
    prisma.auditEvent.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        actorName: true,
        actorEmail: true,
        actorRole: true,
        action: true,
        entityType: true,
        reason: true,
        createdAt: true,
      },
    }),
  ]);

  let totalSales = 0;
  let taxableSales = 0;
  let outputGst = 0;
  let outputCgst = 0;
  let outputSgst = 0;
  let outputIgst = 0;
  let draftInvoicesCount = 0;

  for (const inv of fyInvoices) {
    if (inv.status === InvoiceStatus.DRAFT) {
      draftInvoicesCount += 1;
      continue;
    }
    totalSales += inv.total;
    taxableSales += inv.subtotal;
    outputGst += inv.taxTotal;
    outputCgst += inv.cgstTotal;
    outputSgst += inv.sgstTotal;
    outputIgst += inv.igstTotal;
  }

  let totalPurchases = 0;
  let taxablePurchases = 0;
  let inputTaxCredit = 0;
  let draftPurchasesCount = 0;

  for (const pur of fyPurchases) {
    if (pur.status === PurchaseStatus.DRAFT) {
      draftPurchasesCount += 1;
      continue;
    }
    totalPurchases += pur.total;
    taxablePurchases += pur.subtotal;
    if (ITC_ELIGIBLE_TYPES.has(pur.itcEligibility)) {
      inputTaxCredit += pur.taxTotal;
    }
  }

  const totalExpenses = fyExpenses.reduce((acc, e) => acc + e.amount, 0);

  let cashInflow = 0;
  let bankInflow = 0;
  for (const p of fyCustomerPayments) {
    if (p.paymentMethod === 'CASH') cashInflow += p.amount;
    else if (BANK_METHODS.has(p.paymentMethod)) bankInflow += p.amount;
  }

  let cashOutflow = 0;
  let bankOutflow = 0;
  for (const sp of fySupplierPayments) {
    if (sp.paymentMethod === 'CASH') cashOutflow += sp.amount;
    else if (BANK_METHODS.has(sp.paymentMethod)) bankOutflow += sp.amount;
  }
  for (const ex of fyExpenses) {
    if (ex.paymentMethod === 'CASH') cashOutflow += ex.amount;
    else if (BANK_METHODS.has(ex.paymentMethod)) bankOutflow += ex.amount;
  }

  const totalReceivables = openReceivables.reduce((sum, inv) => sum + inv.balanceDue, 0);
  const overdueReceivablesCount = openReceivables.filter(
    (inv) => inv.status === InvoiceStatus.OVERDUE || inv.dueDate.getTime() < Date.now()
  ).length;

  const totalPayables = openPayables.reduce((sum, p) => sum + p.balanceDue, 0);

  const unreconciledCount = gstr2bImports.reduce(
    (sum, imp) => sum + imp.mismatchCount + imp.missingInBooksCount + imp.missingIn2bCount,
    0
  );

  // Determine active months with tax activity in FY where Owner-approved GST filing is still pending
  const activeTaxMonths = new Set<string>();
  for (const inv of fyInvoices) {
    if (inv.status !== InvoiceStatus.DRAFT) {
      const m = `${inv.invoiceDate.getUTCFullYear()}-${String(inv.invoiceDate.getUTCMonth() + 1).padStart(2, '0')}`;
      activeTaxMonths.add(m);
    }
  }
  const approvedPeriodKeys = new Set(approvedGstFilings.map((a) => a.entityId).filter(Boolean));
  const pendingGstReturns = Array.from(activeTaxMonths).filter(
    (period) => !approvedPeriodKeys.has(`${fy.code}:${period}`)
  ).length;

  const netGstPayable = Math.max(0, outputGst - inputTaxCredit);
  const itcCarryForward = Math.max(0, inputTaxCredit - outputGst);
  const grossProfit = taxableSales - taxablePurchases;
  const netProfit = taxableSales - taxablePurchases - totalExpenses;

  const filingDeadlines = computeUpcomingStatutoryDeadlines(fy.code);

  // Optional structured drilldown rows
  let drilldownRows: Array<Record<string, unknown>> = [];
  if (params.drilldown === 'sales') {
    drilldownRows = fyInvoices.slice(0, 30).map((inv) => ({
      id: inv.id,
      ref: inv.invoiceNumber,
      party: inv.customerName,
      date: inv.invoiceDate.toISOString().slice(0, 10),
      status: inv.status,
      taxable: round2(inv.subtotal),
      gst: round2(inv.taxTotal),
      total: round2(inv.total),
    }));
  } else if (params.drilldown === 'purchases') {
    drilldownRows = fyPurchases.slice(0, 30).map((p) => ({
      id: p.id,
      ref: p.supplierInvoiceNumber || p.purchaseNumber,
      party: p.supplier.name,
      date: p.purchaseDate.toISOString().slice(0, 10),
      status: p.status,
      itcEligibility: p.itcEligibility,
      taxable: round2(p.subtotal),
      gst: round2(p.taxTotal),
      total: round2(p.total),
    }));
  } else if (params.drilldown === 'receivables') {
    drilldownRows = openReceivables.slice(0, 30).map((inv) => ({
      id: inv.id,
      ref: inv.invoiceNumber,
      party: inv.customerName,
      dueDate: inv.dueDate.toISOString().slice(0, 10),
      status: inv.status,
      total: round2(inv.total),
      balanceDue: round2(inv.balanceDue),
    }));
  } else if (params.drilldown === 'payables') {
    drilldownRows = openPayables.slice(0, 30).map((p) => ({
      id: p.id,
      ref: p.purchaseNumber,
      party: p.supplier.name,
      dueDate: p.dueDate ? p.dueDate.toISOString().slice(0, 10) : 'On Receipt',
      total: round2(p.total),
      balanceDue: round2(p.balanceDue),
    }));
  } else if (params.drilldown === 'unreconciled') {
    drilldownRows = gstr2bImports.map((g) => ({
      id: g.id,
      period: g.returnPeriod,
      totalInvoices: g.totalInvoices,
      matchedCount: g.matchedCount,
      mismatchCount: g.mismatchCount,
      missingInBooksCount: g.missingInBooksCount,
      missingIn2bCount: g.missingIn2bCount,
    }));
  } else if (params.drilldown === 'drafts') {
    drilldownRows = [
      ...fyInvoices
        .filter((i) => i.status === InvoiceStatus.DRAFT)
        .map((i) => ({
          id: i.id,
          kind: 'DRAFT_INVOICE',
          ref: i.invoiceNumber,
          party: i.customerName,
          date: i.invoiceDate.toISOString().slice(0, 10),
          total: round2(i.total),
        })),
      ...fyPurchases
        .filter((p) => p.status === PurchaseStatus.DRAFT)
        .map((p) => ({
          id: p.id,
          kind: 'DRAFT_PURCHASE',
          ref: p.purchaseNumber,
          party: p.supplier.name,
          date: p.purchaseDate.toISOString().slice(0, 10),
          total: round2(p.total),
        })),
    ];
  }

  return {
    financialYear: {
      code: fy.code,
      label: fy.label,
      startDate: fy.startDate.toISOString(),
      endDate: fy.endDate.toISOString(),
    },
    branchFilter: {
      branchId: params.branchId || 'ALL',
      branchTaggingNote:
        'Consolidated commercial totals shown for authorized scope. Voucher-level branch tagging expands in Phase 2.',
    },
    kpis: {
      totalSales: round2(totalSales),
      taxableSales: round2(taxableSales),
      totalPurchases: round2(totalPurchases),
      taxablePurchases: round2(taxablePurchases),
      totalExpenses: round2(totalExpenses),
      grossProfit: round2(grossProfit),
      netProfit: round2(netProfit),
      cashBalance: round2(cashInflow - cashOutflow),
      cashInflow: round2(cashInflow),
      cashOutflow: round2(cashOutflow),
      bankBalance: round2(bankInflow - bankOutflow),
      bankInflow: round2(bankInflow),
      bankOutflow: round2(bankOutflow),
      receivables: round2(totalReceivables),
      receivablesCount: openReceivables.length,
      overdueReceivablesCount,
      payables: round2(totalPayables),
      payablesCount: openPayables.length,
      outputGst: round2(outputGst),
      outputCgst: round2(outputCgst),
      outputSgst: round2(outputSgst),
      outputIgst: round2(outputIgst),
      inputTaxCredit: round2(inputTaxCredit),
      netGstPayable: round2(netGstPayable),
      itcCarryForward: round2(itcCarryForward),
      pendingGstReturns,
      unreconciledCount,
      unpostedVouchersCount: draftInvoicesCount + draftPurchasesCount,
      pendingApprovalsCount: pendingApprovals.length,
    },
    filingDeadlines,
    pendingApprovals,
    recentAuditEvents,
    drilldownRows,
  };
}

