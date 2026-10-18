import prisma from '@/lib/prisma';
import { round2 } from '@/lib/billing/calculator';
import { InvoiceStatus, PurchaseStatus, PaymentMethod } from '@prisma/client';
import {
  DateFilterRange,
  getStateCodeFromGstin,
  getStateName,
  isInterStateSupply,
} from './financialYear';

export interface AccountsOverviewResult {
  filter: DateFilterRange;
  sales: {
    invoiceCount: number;
    grossTurnover: number;
    taxableTurnover: number;
    totalTax: number;
    cgstTotal: number;
    sgstTotal: number;
    igstTotal: number;
    paidCollections: number;
    unpaidReceivables: number;
  };
  purchases: {
    purchaseCount: number;
    grossPurchases: number;
    taxablePurchases: number;
    totalPurchaseTax: number;
    paidDisbursements: number;
    unpaidPayables: number;
  };
  itc: {
    potentialEligible: number;
    ineligible: number;
    blockedSec17_5: number;
    capitalGoods: number;
    pendingVerification: number;
    reconciled: number;
  };
  gstPosition: {
    totalOutputTax: number;
    totalEligibleItc: number;
    estimatedNetGstPayable: number;
    itcUtilization: number;
    itcCarriedForward: number;
  };
  cashFlow: {
    cashReceipts: number;
    cashDisbursements: number;
    netCashFlow: number;
    bankReceipts: number;
    bankDisbursements: number;
    netBankFlow: number;
    totalReceipts: number;
    totalDisbursements: number;
  };
  balances: {
    totalCustomerReceivables: number;
    totalSupplierPayables: number;
  };
  profitability: {
    revenue: number;
    directCost: number;
    grossProfit: number;
    grossMarginPercent: number;
    operatingExpenses: number;
    netProfit: number;
    netMarginPercent: number;
  };
}

export interface HsnSummaryItem {
  hsnCode: string;
  description: string;
  uqc: string;
  totalQuantity: number;
  totalValue: number;
  taxableValue: number;
  taxRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
}

export interface SalesRegisterItem {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: string;
  customerName: string;
  customerMobile: string;
  customerGstin?: string | null;
  customerType: 'B2B' | 'B2C';
  placeOfSupply: string;
  isInterState: boolean;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  rounding: number;
  total: number;
  paidAmount: number;
  balanceDue: number;
  itemsCount: number;
}

export interface PurchaseRegisterItem {
  id: string;
  purchaseNumber: string;
  supplierInvoiceNumber?: string | null;
  purchaseDate: string;
  dueDate?: string | null;
  status: string;
  supplierId: string;
  supplierName: string;
  supplierPhone: string;
  supplierGstin?: string | null;
  placeOfSupply: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  total: number;
  paidAmount: number;
  balanceDue: number;
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
  itcEligibility: string;
  documentUrl?: string | null;
  notes?: string | null;
}

export interface CashBankTransaction {
  id: string;
  date: string;
  type: 'RECEIPT' | 'PAYMENT';
  voucherType: 'CUSTOMER_PAYMENT' | 'SUPPLIER_PAYMENT' | 'OPERATIONAL_EXPENSE';
  partyName: string;
  referenceNumber?: string | null;
  paymentMethod: PaymentMethod;
  notes?: string | null;
  amountIn: number;
  amountOut: number;
  runningBalance: number;
}

/**
 * Calculates Accounts Overview with strict server-side aggregation and tenant isolation
 */
export async function getAccountsOverview(
  businessId: string,
  filterRange: DateFilterRange
): Promise<AccountsOverviewResult> {
  const { startDate, endDate } = filterRange;

  // 1. Invoices within period
  const invoices = await prisma.invoice.findMany({
    where: {
      businessId,
      status: { not: InvoiceStatus.CANCELLED },
      invoiceDate: { gte: startDate, lte: endDate },
    },
    select: {
      id: true,
      total: true,
      subtotal: true,
      taxTotal: true,
      cgstTotal: true,
      sgstTotal: true,
      igstTotal: true,
      paidAmount: true,
      balanceDue: true,
    },
  });

  const grossTurnover = round2(invoices.reduce((s, i) => s + i.total, 0));
  const taxableTurnover = round2(invoices.reduce((s, i) => s + i.subtotal, 0));
  const totalTax = round2(invoices.reduce((s, i) => s + i.taxTotal, 0));
  const cgstTotal = round2(invoices.reduce((s, i) => s + i.cgstTotal, 0));
  const sgstTotal = round2(invoices.reduce((s, i) => s + i.sgstTotal, 0));
  const igstTotal = round2(invoices.reduce((s, i) => s + i.igstTotal, 0));
  const paidCollections = round2(invoices.reduce((s, i) => s + i.paidAmount, 0));
  const unpaidReceivables = round2(invoices.reduce((s, i) => s + i.balanceDue, 0));

  // 2. Purchases within period
  const purchases = await prisma.purchase.findMany({
    where: {
      businessId,
      status: { not: PurchaseStatus.CANCELLED },
      purchaseDate: { gte: startDate, lte: endDate },
    },
    select: {
      id: true,
      total: true,
      subtotal: true,
      taxTotal: true,
      cgstTotal: true,
      sgstTotal: true,
      igstTotal: true,
      paidAmount: true,
      balanceDue: true,
      itcEligibility: true,
    },
  });

  const grossPurchases = round2(purchases.reduce((s, p) => s + p.total, 0));
  const taxablePurchases = round2(purchases.reduce((s, p) => s + p.subtotal, 0));
  const totalPurchaseTax = round2(purchases.reduce((s, p) => s + p.taxTotal, 0));
  const paidDisbursements = round2(purchases.reduce((s, p) => s + p.paidAmount, 0));
  const unpaidPayables = round2(purchases.reduce((s, p) => s + p.balanceDue, 0));

  // 3. ITC Classification
  let potentialEligible = 0;
  let ineligible = 0;
  let blockedSec17_5 = 0;
  let capitalGoods = 0;
  let pendingVerification = 0;
  let reconciled = 0;

  for (const p of purchases) {
    const itcAmount = p.taxTotal;
    const cat = (p.itcEligibility || 'ELIGIBLE').toUpperCase();
    if (cat === 'INELIGIBLE') {
      ineligible += itcAmount;
    } else if (cat === 'BLOCKED_SEC_17_5') {
      blockedSec17_5 += itcAmount;
    } else if (cat === 'CAPITAL_GOODS') {
      capitalGoods += itcAmount;
      potentialEligible += itcAmount;
    } else if (cat === 'PENDING_VERIFICATION') {
      pendingVerification += itcAmount;
    } else if (cat === 'RECONCILED') {
      reconciled += itcAmount;
      potentialEligible += itcAmount;
    } else {
      // Default: ELIGIBLE
      potentialEligible += itcAmount;
    }
  }

  potentialEligible = round2(potentialEligible);
  ineligible = round2(ineligible);
  blockedSec17_5 = round2(blockedSec17_5);
  capitalGoods = round2(capitalGoods);
  pendingVerification = round2(pendingVerification);
  reconciled = round2(reconciled);

  // 4. Net GST Position
  const totalOutputTax = totalTax;
  const totalEligibleItc = potentialEligible;
  const itcUtilization = Math.min(totalOutputTax, totalEligibleItc);
  const estimatedNetGstPayable = round2(Math.max(0, totalOutputTax - totalEligibleItc));
  const itcCarriedForward = round2(Math.max(0, totalEligibleItc - totalOutputTax));

  // 5. Receipts & Payments (Cash vs Bank)
  const customerPayments = await prisma.payment.findMany({
    where: {
      businessId,
      paymentDate: { gte: startDate, lte: endDate },
    },
    select: { amount: true, paymentMethod: true },
  });

  const supplierPayments = await prisma.supplierPayment.findMany({
    where: {
      businessId,
      paymentDate: { gte: startDate, lte: endDate },
    },
    select: { amount: true, paymentMethod: true },
  });

  const expenses = await prisma.expense.findMany({
    where: {
      businessId,
      expenseDate: { gte: startDate, lte: endDate },
    },
    select: { amount: true, paymentMethod: true, category: true },
  });

  let cashReceipts = 0;
  let bankReceipts = 0;
  for (const cp of customerPayments) {
    if (cp.paymentMethod === PaymentMethod.CASH) {
      cashReceipts += cp.amount;
    } else {
      bankReceipts += cp.amount;
    }
  }

  let cashDisbursements = 0;
  let bankDisbursements = 0;
  for (const sp of supplierPayments) {
    if (sp.paymentMethod === PaymentMethod.CASH) {
      cashDisbursements += sp.amount;
    } else {
      bankDisbursements += sp.amount;
    }
  }

  let totalExpenses = 0;
  for (const exp of expenses) {
    totalExpenses += exp.amount;
    if (exp.paymentMethod === PaymentMethod.CASH) {
      cashDisbursements += exp.amount;
    } else {
      bankDisbursements += exp.amount;
    }
  }

  cashReceipts = round2(cashReceipts);
  bankReceipts = round2(bankReceipts);
  cashDisbursements = round2(cashDisbursements);
  bankDisbursements = round2(bankDisbursements);
  totalExpenses = round2(totalExpenses);

  const totalReceipts = round2(cashReceipts + bankReceipts);
  const totalDisbursements = round2(cashDisbursements + bankDisbursements);

  // 6. Cumulative Outstanding Balances (across all history)
  const allCustomers = await prisma.customer.findMany({
    where: { businessId },
    select: {
      openingBalance: true,
      invoices: {
        where: { status: { not: InvoiceStatus.CANCELLED } },
        select: { balanceDue: true },
      },
    },
  });

  let totalCustomerReceivables = 0;
  for (const c of allCustomers) {
    const invDue = c.invoices.reduce((s, i) => s + i.balanceDue, 0);
    totalCustomerReceivables += (c.openingBalance || 0) + invDue;
  }
  totalCustomerReceivables = round2(Math.max(0, totalCustomerReceivables));

  const allSuppliers = await prisma.supplier.findMany({
    where: { businessId },
    select: {
      openingBalance: true,
      purchases: {
        where: { status: PurchaseStatus.RECEIVED },
        select: { balanceDue: true },
      },
    },
  });

  let totalSupplierPayables = 0;
  for (const s of allSuppliers) {
    const purDue = s.purchases.reduce((sum, p) => sum + p.balanceDue, 0);
    totalSupplierPayables += (s.openingBalance || 0) + purDue;
  }
  totalSupplierPayables = round2(Math.max(0, totalSupplierPayables));

  // 7. Profitability
  const revenue = taxableTurnover;
  const directCost = taxablePurchases;
  const grossProfit = round2(revenue - directCost);
  const grossMarginPercent = revenue > 0 ? round2((grossProfit / revenue) * 100) : 0;
  const operatingExpenses = totalExpenses;
  const netProfit = round2(grossProfit - operatingExpenses);
  const netMarginPercent = revenue > 0 ? round2((netProfit / revenue) * 100) : 0;

  return {
    filter: filterRange,
    sales: {
      invoiceCount: invoices.length,
      grossTurnover,
      taxableTurnover,
      totalTax,
      cgstTotal,
      sgstTotal,
      igstTotal,
      paidCollections,
      unpaidReceivables,
    },
    purchases: {
      purchaseCount: purchases.length,
      grossPurchases,
      taxablePurchases,
      totalPurchaseTax,
      paidDisbursements,
      unpaidPayables,
    },
    itc: {
      potentialEligible,
      ineligible,
      blockedSec17_5,
      capitalGoods,
      pendingVerification,
      reconciled,
    },
    gstPosition: {
      totalOutputTax,
      totalEligibleItc,
      estimatedNetGstPayable,
      itcUtilization,
      itcCarriedForward,
    },
    cashFlow: {
      cashReceipts,
      cashDisbursements,
      netCashFlow: round2(cashReceipts - cashDisbursements),
      bankReceipts,
      bankDisbursements,
      netBankFlow: round2(bankReceipts - bankDisbursements),
      totalReceipts,
      totalDisbursements,
    },
    balances: {
      totalCustomerReceivables,
      totalSupplierPayables,
    },
    profitability: {
      revenue,
      directCost,
      grossProfit,
      grossMarginPercent,
      operatingExpenses,
      netProfit,
      netMarginPercent,
    },
  };
}

/**
 * Returns detailed Sales Register with Line-Item & HSN Summaries
 */
export async function getSalesRegister(
  businessId: string,
  filterRange: DateFilterRange,
  filters?: {
    taxRate?: number;
    customerType?: 'B2B' | 'B2C';
    placeOfSupply?: string;
    search?: string;
  }
): Promise<{
  items: SalesRegisterItem[];
  hsnSummary: HsnSummaryItem[];
  summary: {
    totalInvoices: number;
    taxableValue: number;
    cgstTotal: number;
    sgstTotal: number;
    igstTotal: number;
    roundingTotal: number;
    grandTotal: number;
    paidTotal: number;
    balanceDueTotal: number;
  };
}> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { gstin: true, state: true },
  });

  const businessGstin = business?.gstin;
  const businessState = business?.state;

  const invoices = await prisma.invoice.findMany({
    where: {
      businessId,
      status: { not: InvoiceStatus.CANCELLED },
      invoiceDate: { gte: filterRange.startDate, lte: filterRange.endDate },
    },
    include: {
      items: true,
      customer: {
        select: {
          gstin: true,
          billingAddress: true,
          name: true,
          mobile: true,
        },
      },
    },
    orderBy: { invoiceDate: 'desc' },
  });

  let taxableValue = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let roundingTotal = 0;
  let grandTotal = 0;
  let paidTotal = 0;
  let balanceDueTotal = 0;

  const hsnMap: Record<string, HsnSummaryItem> = {};

  const registerItems: SalesRegisterItem[] = [];

  for (const inv of invoices) {
    const isB2b = Boolean(inv.customerGstin && inv.customerGstin.trim().length >= 15);
    const customerType: 'B2B' | 'B2C' = isB2b ? 'B2B' : 'B2C';

    const pos =
      getStateCodeFromGstin(inv.customerGstin) ||
      getStateName(inv.customerBillingAddress) ||
      businessState ||
      '22';

    const interState = isInterStateSupply({
      businessGstin,
      businessState,
      customerGstin: inv.customerGstin,
      placeOfSupply: pos,
    });

    // Apply customerType filter if set
    if (filters?.customerType && filters.customerType !== customerType) {
      continue;
    }

    // Apply POS filter if set
    if (filters?.placeOfSupply && !pos.toLowerCase().includes(filters.placeOfSupply.toLowerCase())) {
      continue;
    }

    // Apply search filter if set
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      const matchNumber = inv.invoiceNumber.toLowerCase().includes(q);
      const matchCustomer = inv.customerName.toLowerCase().includes(q);
      const matchGstin = inv.customerGstin ? inv.customerGstin.toLowerCase().includes(q) : false;
      if (!matchNumber && !matchCustomer && !matchGstin) {
        continue;
      }
    }

    // Apply taxRate filter if set: check if invoice has items with that taxRate
    if (filters?.taxRate !== undefined && !isNaN(filters.taxRate)) {
      const hasRate = inv.items.some((i) => Math.abs(i.taxRate - filters.taxRate!) < 0.01);
      if (!hasRate) {
        continue;
      }
    }

    taxableValue += inv.subtotal;
    cgstTotal += inv.cgstTotal;
    sgstTotal += inv.sgstTotal;
    igstTotal += inv.igstTotal;
    roundingTotal += inv.rounding;
    grandTotal += inv.total;
    paidTotal += inv.paidAmount;
    balanceDueTotal += inv.balanceDue;

    registerItems.push({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate.toISOString(),
      dueDate: inv.dueDate.toISOString(),
      status: inv.status,
      customerName: inv.customerName,
      customerMobile: inv.customerMobile,
      customerGstin: inv.customerGstin,
      customerType,
      placeOfSupply: getStateName(pos),
      isInterState: interState,
      subtotal: inv.subtotal,
      discountTotal: inv.discountTotal,
      taxTotal: inv.taxTotal,
      cgstTotal: inv.cgstTotal,
      sgstTotal: inv.sgstTotal,
      igstTotal: inv.igstTotal,
      rounding: inv.rounding,
      total: inv.total,
      paidAmount: inv.paidAmount,
      balanceDue: inv.balanceDue,
      itemsCount: inv.items.length,
    });

    // Populate HSN Map
    for (const item of inv.items) {
      const code = item.hsnCode?.trim() || '999999';
      const key = `${code}_${item.taxRate}`;
      const itemTaxable = item.lineTotal - item.taxAmount;

      if (!hsnMap[key]) {
        hsnMap[key] = {
          hsnCode: code,
          description: item.description,
          uqc: item.unit || 'PCS',
          totalQuantity: 0,
          totalValue: 0,
          taxableValue: 0,
          taxRate: item.taxRate,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
        };
      }

      hsnMap[key].totalQuantity = round2(hsnMap[key].totalQuantity + item.quantity);
      hsnMap[key].totalValue = round2(hsnMap[key].totalValue + item.lineTotal);
      hsnMap[key].taxableValue = round2(hsnMap[key].taxableValue + itemTaxable);
      hsnMap[key].cgstAmount = round2(hsnMap[key].cgstAmount + item.cgstAmount);
      hsnMap[key].sgstAmount = round2(hsnMap[key].sgstAmount + item.sgstAmount);
      hsnMap[key].igstAmount = round2(hsnMap[key].igstAmount + item.igstAmount);
    }
  }

  const hsnSummary = Object.values(hsnMap).sort((a, b) => b.taxableValue - a.taxableValue);

  return {
    items: registerItems,
    hsnSummary,
    summary: {
      totalInvoices: registerItems.length,
      taxableValue: round2(taxableValue),
      cgstTotal: round2(cgstTotal),
      sgstTotal: round2(sgstTotal),
      igstTotal: round2(igstTotal),
      roundingTotal: round2(roundingTotal),
      grandTotal: round2(grandTotal),
      paidTotal: round2(paidTotal),
      balanceDueTotal: round2(balanceDueTotal),
    },
  };
}

/**
 * Returns detailed Purchase Register with ITC eligibility classification
 */
export async function getPurchaseRegister(
  businessId: string,
  filterRange: DateFilterRange,
  filters?: {
    supplierGstin?: string;
    itcEligibility?: string;
    status?: string;
    search?: string;
  }
): Promise<{
  items: PurchaseRegisterItem[];
  summary: {
    totalPurchases: number;
    taxableValue: number;
    cgstTotal: number;
    sgstTotal: number;
    igstTotal: number;
    taxTotal: number;
    grandTotal: number;
    paidTotal: number;
    balanceDueTotal: number;
    eligibleItcTotal: number;
    ineligibleItcTotal: number;
  };
}> {
  const purchases = await prisma.purchase.findMany({
    where: {
      businessId,
      status: { not: PurchaseStatus.CANCELLED },
      purchaseDate: { gte: filterRange.startDate, lte: filterRange.endDate },
    },
    include: {
      supplier: {
        select: {
          id: true,
          name: true,
          phone: true,
          gstin: true,
          address: true,
        },
      },
    },
    orderBy: { purchaseDate: 'desc' },
  });

  let taxableValue = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let taxTotal = 0;
  let grandTotal = 0;
  let paidTotal = 0;
  let balanceDueTotal = 0;
  let eligibleItcTotal = 0;
  let ineligibleItcTotal = 0;

  const items: PurchaseRegisterItem[] = [];

  for (const p of purchases) {
    if (filters?.supplierGstin && p.supplier.gstin) {
      if (!p.supplier.gstin.toLowerCase().includes(filters.supplierGstin.toLowerCase())) {
        continue;
      }
    }

    if (filters?.itcEligibility && filters.itcEligibility !== 'ALL') {
      if ((p.itcEligibility || 'ELIGIBLE').toUpperCase() !== filters.itcEligibility.toUpperCase()) {
        continue;
      }
    }

    if (filters?.status && filters.status !== 'ALL') {
      if (p.status !== filters.status) continue;
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      const matchNo = p.purchaseNumber.toLowerCase().includes(q);
      const matchInv = p.supplierInvoiceNumber ? p.supplierInvoiceNumber.toLowerCase().includes(q) : false;
      const matchSupp = p.supplier.name.toLowerCase().includes(q);
      const matchGst = p.supplier.gstin ? p.supplier.gstin.toLowerCase().includes(q) : false;
      if (!matchNo && !matchInv && !matchSupp && !matchGst) {
        continue;
      }
    }

    let paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID' = 'UNPAID';
    if (p.balanceDue <= 0.01 && p.total > 0) {
      paymentStatus = 'PAID';
    } else if (p.paidAmount > 0) {
      paymentStatus = 'PARTIAL';
    }

    taxableValue += p.subtotal;
    cgstTotal += p.cgstTotal;
    sgstTotal += p.sgstTotal;
    igstTotal += p.igstTotal;
    taxTotal += p.taxTotal;
    grandTotal += p.total;
    paidTotal += p.paidAmount;
    balanceDueTotal += p.balanceDue;

    const itcCat = (p.itcEligibility || 'ELIGIBLE').toUpperCase();
    if (itcCat === 'INELIGIBLE' || itcCat === 'BLOCKED_SEC_17_5') {
      ineligibleItcTotal += p.taxTotal;
    } else {
      eligibleItcTotal += p.taxTotal;
    }

    items.push({
      id: p.id,
      purchaseNumber: p.purchaseNumber,
      supplierInvoiceNumber: p.supplierInvoiceNumber,
      purchaseDate: p.purchaseDate.toISOString(),
      dueDate: p.dueDate ? p.dueDate.toISOString() : null,
      status: p.status,
      supplierId: p.supplier.id,
      supplierName: p.supplier.name,
      supplierPhone: p.supplier.phone,
      supplierGstin: p.supplier.gstin,
      placeOfSupply: getStateName(p.placeOfSupply || p.supplier.address),
      subtotal: p.subtotal,
      discountTotal: p.discountTotal,
      taxTotal: p.taxTotal,
      cgstTotal: p.cgstTotal,
      sgstTotal: p.sgstTotal,
      igstTotal: p.igstTotal,
      total: p.total,
      paidAmount: p.paidAmount,
      balanceDue: p.balanceDue,
      paymentStatus,
      itcEligibility: p.itcEligibility || 'ELIGIBLE',
      documentUrl: p.documentUrl,
      notes: p.notes,
    });
  }

  return {
    items,
    summary: {
      totalPurchases: items.length,
      taxableValue: round2(taxableValue),
      cgstTotal: round2(cgstTotal),
      sgstTotal: round2(sgstTotal),
      igstTotal: round2(igstTotal),
      taxTotal: round2(taxTotal),
      grandTotal: round2(grandTotal),
      paidTotal: round2(paidTotal),
      balanceDueTotal: round2(balanceDueTotal),
      eligibleItcTotal: round2(eligibleItcTotal),
      ineligibleItcTotal: round2(ineligibleItcTotal),
    },
  };
}

/**
 * Returns Cash Book, Bank Book, Expense Register, and Customer/Supplier Ledgers
 */
export async function getFinancialRegisters(
  businessId: string,
  filterRange: DateFilterRange
) {
  const { startDate, endDate } = filterRange;

  // 1. Customer Payments (Collections)
  const payments = await prisma.payment.findMany({
    where: {
      businessId,
      paymentDate: { gte: startDate, lte: endDate },
    },
    include: {
      customer: { select: { name: true } },
      invoice: { select: { invoiceNumber: true } },
    },
    orderBy: { paymentDate: 'asc' },
  });

  // 2. Supplier Payments (Disbursements)
  const supplierPayments = await prisma.supplierPayment.findMany({
    where: {
      businessId,
      paymentDate: { gte: startDate, lte: endDate },
    },
    include: {
      supplier: { select: { name: true } },
      purchase: { select: { purchaseNumber: true, supplierInvoiceNumber: true } },
    },
    orderBy: { paymentDate: 'asc' },
  });

  // 3. Operational Expenses
  const expenses = await prisma.expense.findMany({
    where: {
      businessId,
      expenseDate: { gte: startDate, lte: endDate },
    },
    orderBy: { expenseDate: 'asc' },
  });

  // Build Cash Book & Bank Book
  const cashBook: CashBankTransaction[] = [];
  const bankBook: CashBankTransaction[] = [];

  let runningCash = 0;
  let runningBank = 0;

  // Merge and sort all entries chronologically
  type UnifiedTx = {
    date: Date;
    type: 'RECEIPT' | 'PAYMENT';
    voucherType: 'CUSTOMER_PAYMENT' | 'SUPPLIER_PAYMENT' | 'OPERATIONAL_EXPENSE';
    partyName: string;
    refNumber?: string | null;
    paymentMethod: PaymentMethod;
    notes?: string | null;
    amount: number;
    id: string;
  };

  const allTx: UnifiedTx[] = [];

  for (const p of payments) {
    allTx.push({
      date: p.paymentDate,
      type: 'RECEIPT',
      voucherType: 'CUSTOMER_PAYMENT',
      partyName: p.customer.name,
      refNumber: p.referenceNumber || p.invoice.invoiceNumber,
      paymentMethod: p.paymentMethod,
      notes: p.notes,
      amount: p.amount,
      id: p.id,
    });
  }

  for (const sp of supplierPayments) {
    allTx.push({
      date: sp.paymentDate,
      type: 'PAYMENT',
      voucherType: 'SUPPLIER_PAYMENT',
      partyName: sp.supplier.name,
      refNumber: sp.referenceNumber || sp.purchase.purchaseNumber,
      paymentMethod: sp.paymentMethod,
      notes: sp.notes,
      amount: sp.amount,
      id: sp.id,
    });
  }

  for (const e of expenses) {
    allTx.push({
      date: e.expenseDate,
      type: 'PAYMENT',
      voucherType: 'OPERATIONAL_EXPENSE',
      partyName: `${e.payee} (${e.category})`,
      refNumber: e.referenceNumber,
      paymentMethod: e.paymentMethod,
      notes: e.notes,
      amount: e.amount,
      id: e.id,
    });
  }

  allTx.sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const tx of allTx) {
    if (tx.paymentMethod === PaymentMethod.CASH) {
      if (tx.type === 'RECEIPT') {
        runningCash += tx.amount;
        cashBook.push({
          id: tx.id,
          date: tx.date.toISOString(),
          type: 'RECEIPT',
          voucherType: tx.voucherType,
          partyName: tx.partyName,
          referenceNumber: tx.refNumber,
          paymentMethod: tx.paymentMethod,
          notes: tx.notes,
          amountIn: tx.amount,
          amountOut: 0,
          runningBalance: round2(runningCash),
        });
      } else {
        runningCash -= tx.amount;
        cashBook.push({
          id: tx.id,
          date: tx.date.toISOString(),
          type: 'PAYMENT',
          voucherType: tx.voucherType,
          partyName: tx.partyName,
          referenceNumber: tx.refNumber,
          paymentMethod: tx.paymentMethod,
          notes: tx.notes,
          amountIn: 0,
          amountOut: tx.amount,
          runningBalance: round2(runningCash),
        });
      }
    } else {
      // Bank / UPI / Cheque / Transfer
      if (tx.type === 'RECEIPT') {
        runningBank += tx.amount;
        bankBook.push({
          id: tx.id,
          date: tx.date.toISOString(),
          type: 'RECEIPT',
          voucherType: tx.voucherType,
          partyName: tx.partyName,
          referenceNumber: tx.refNumber,
          paymentMethod: tx.paymentMethod,
          notes: tx.notes,
          amountIn: tx.amount,
          amountOut: 0,
          runningBalance: round2(runningBank),
        });
      } else {
        runningBank -= tx.amount;
        bankBook.push({
          id: tx.id,
          date: tx.date.toISOString(),
          type: 'PAYMENT',
          voucherType: tx.voucherType,
          partyName: tx.partyName,
          referenceNumber: tx.refNumber,
          paymentMethod: tx.paymentMethod,
          notes: tx.notes,
          amountIn: 0,
          amountOut: tx.amount,
          runningBalance: round2(runningBank),
        });
      }
    }
  }

  // 4. Customer Outstanding Details
  const customers = await prisma.customer.findMany({
    where: { businessId },
    include: {
      invoices: {
        where: {
          status: { not: InvoiceStatus.CANCELLED },
          invoiceDate: { lte: endDate },
        },
        select: { total: true, paidAmount: true, balanceDue: true, status: true },
      },
      payments: {
        where: { paymentDate: { lte: endDate } },
        select: { amount: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  const customerOutstanding = customers
    .map((c) => {
      const billedTotal = c.invoices.reduce((s, i) => s + i.total, 0);
      const paidTotal = c.payments.reduce((s, p) => s + p.amount, 0);
      const invoicesDue = c.invoices.reduce((s, i) => s + i.balanceDue, 0);
      const totalDue = round2((c.openingBalance || 0) + invoicesDue);

      return {
        id: c.id,
        name: c.name,
        mobile: c.mobile,
        gstin: c.gstin,
        openingBalance: c.openingBalance || 0,
        billedTotal: round2(billedTotal),
        paidTotal: round2(paidTotal),
        currentOutstanding: totalDue,
        unpaidInvoicesCount: c.invoices.filter((i) => i.balanceDue > 0).length,
      };
    })
    .filter((c) => c.currentOutstanding > 0 || c.billedTotal > 0);

  // 5. Supplier Payable Details
  const suppliers = await prisma.supplier.findMany({
    where: { businessId },
    include: {
      purchases: {
        where: {
          status: PurchaseStatus.RECEIVED,
          purchaseDate: { lte: endDate },
        },
        select: { total: true, paidAmount: true, balanceDue: true },
      },
      payments: {
        where: { paymentDate: { lte: endDate } },
        select: { amount: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  const supplierPayable = suppliers
    .map((s) => {
      const purchasesTotal = s.purchases.reduce((sum, p) => sum + p.total, 0);
      const paidTotal = s.payments.reduce((sum, p) => sum + p.amount, 0);
      const purchasesDue = s.purchases.reduce((sum, p) => sum + p.balanceDue, 0);
      const totalPayable = round2((s.openingBalance || 0) + purchasesDue);

      return {
        id: s.id,
        name: s.name,
        phone: s.phone,
        gstin: s.gstin,
        openingBalance: s.openingBalance || 0,
        purchasesTotal: round2(purchasesTotal),
        paidTotal: round2(paidTotal),
        currentPayable: totalPayable,
        unpaidPurchasesCount: s.purchases.filter((p) => p.balanceDue > 0).length,
      };
    })
    .filter((s) => s.currentPayable > 0 || s.purchasesTotal > 0);

  // 6. Expense Register Breakdown
  const expenseCategories: Record<string, number> = {};
  for (const exp of expenses) {
    expenseCategories[exp.category] = round2((expenseCategories[exp.category] || 0) + exp.amount);
  }

  return {
    cashBook: {
      transactions: cashBook,
      totalIn: round2(cashBook.reduce((s, t) => s + t.amountIn, 0)),
      totalOut: round2(cashBook.reduce((s, t) => s + t.amountOut, 0)),
      closingBalance: round2(runningCash),
    },
    bankBook: {
      transactions: bankBook,
      totalIn: round2(bankBook.reduce((s, t) => s + t.amountIn, 0)),
      totalOut: round2(bankBook.reduce((s, t) => s + t.amountOut, 0)),
      closingBalance: round2(runningBank),
    },
    expenses: {
      items: expenses.map((e) => ({
        id: e.id,
        category: e.category,
        payee: e.payee,
        amount: e.amount,
        paymentMethod: e.paymentMethod,
        expenseDate: e.expenseDate.toISOString(),
        referenceNumber: e.referenceNumber,
        notes: e.notes,
      })),
      categoryBreakdown: expenseCategories,
      totalAmount: round2(expenses.reduce((s, e) => s + e.amount, 0)),
    },
    customerOutstanding,
    supplierPayable,
  };
}
