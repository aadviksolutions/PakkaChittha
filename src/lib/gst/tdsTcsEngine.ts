import { InvoiceStatus, Prisma, PurchaseStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { buildIndianFyWindow, parseIndianFyCode } from '@/lib/rbac/fiscalYear';
import { SYSTEM_LEDGER_CODES, ensureBusinessCOA } from '@/lib/accounting/chartOfAccounts';
import { getSystemLedger, toDecimal2 } from '@/lib/accounting/ledgerService';
import { postVoucher } from '@/lib/accounting/voucherEngine';
import { recordAuditEvent } from '@/lib/rbac/auditService';

export type TdsSectionCode = '194C_IND' | '194C_OTH' | '194J_PROF' | '194J_TECH' | '194H' | '194I_PLANT' | '194I_RENT' | '194Q' | '206C_1H';

export interface TdsSectionRule {
  code: TdsSectionCode;
  section: string;
  description: string;
  ratePercent: number;
  annualThreshold: number;
  singleTxnThreshold?: number;
  excessOnlyThreshold?: boolean;
  nature: 'TDS' | 'TCS';
}

export const TDS_SECTION_RULES: readonly TdsSectionRule[] = [
  {
    code: '194C_IND',
    section: '194C',
    description: 'Contractor Payments (Individual / HUF)',
    ratePercent: 1,
    annualThreshold: 100000,
    singleTxnThreshold: 30000,
    nature: 'TDS',
  },
  {
    code: '194C_OTH',
    section: '194C',
    description: 'Contractor Payments (Company / Firm)',
    ratePercent: 2,
    annualThreshold: 100000,
    singleTxnThreshold: 30000,
    nature: 'TDS',
  },
  {
    code: '194J_PROF',
    section: '194J(b)',
    description: 'Professional Fees (CA, Legal, Consulting)',
    ratePercent: 10,
    annualThreshold: 30000,
    nature: 'TDS',
  },
  {
    code: '194J_TECH',
    section: '194J(a)',
    description: 'Technical / Call Center Services',
    ratePercent: 2,
    annualThreshold: 30000,
    nature: 'TDS',
  },
  {
    code: '194H',
    section: '194H',
    description: 'Commission or Brokerage',
    ratePercent: 2,
    annualThreshold: 15000,
    nature: 'TDS',
  },
  {
    code: '194I_PLANT',
    section: '194I(a)',
    description: 'Rent of Plant, Machinery or Equipment',
    ratePercent: 2,
    annualThreshold: 240000,
    nature: 'TDS',
  },
  {
    code: '194I_RENT',
    section: '194I(b)',
    description: 'Rent of Land, Building or Furniture',
    ratePercent: 10,
    annualThreshold: 240000,
    nature: 'TDS',
  },
  {
    code: '194Q',
    section: '194Q',
    description: 'Purchase of Goods (> ₹50L aggregate per seller)',
    ratePercent: 0.1,
    annualThreshold: 5000000,
    excessOnlyThreshold: true,
    nature: 'TDS',
  },
  {
    code: '206C_1H',
    section: '206C(1H)',
    description: 'TCS on Sale of Goods (> ₹50L aggregate per buyer)',
    ratePercent: 0.1,
    annualThreshold: 5000000,
    excessOnlyThreshold: true,
    nature: 'TCS',
  },
];

export function calculateTdsTcsDeduction(input: {
  sectionCode: TdsSectionCode;
  transactionAmount: Prisma.Decimal | number | string;
  cumulativeFyAmount?: Prisma.Decimal | number | string;
  hasPan?: boolean;
}) {
  const rule = TDS_SECTION_RULES.find((r) => r.code === input.sectionCode);
  if (!rule) {
    throw new Error(`Unsupported TDS/TCS section: ${input.sectionCode}`);
  }

  const txnAmt = Prisma.Decimal.max(toDecimal2(input.transactionAmount), 0);
  const cumAmt = Prisma.Decimal.max(toDecimal2(input.cumulativeFyAmount ?? 0), 0);
  const projectedTotal = cumAmt.plus(txnAmt);

  const singleBreached =
    rule.singleTxnThreshold !== undefined && txnAmt.gt(rule.singleTxnThreshold);
  const annualBreached = projectedTotal.gt(rule.annualThreshold);
  const thresholdTriggered = singleBreached || annualBreached;

  const effectiveRate =
    input.hasPan === false ? Math.max(rule.ratePercent, 20) : rule.ratePercent;

  let taxableBase = new Prisma.Decimal(0);
  if (thresholdTriggered) {
    if (rule.excessOnlyThreshold) {
      const priorExcess = Prisma.Decimal.max(cumAmt.minus(rule.annualThreshold), 0);
      const newExcess = Prisma.Decimal.max(projectedTotal.minus(rule.annualThreshold), 0);
      taxableBase = newExcess.minus(priorExcess);
    } else {
      taxableBase = txnAmt;
    }
  }

  const taxAmount = taxableBase
    .mul(effectiveRate)
    .div(100)
    .toDecimalPlaces(2);

  return {
    section: rule.section,
    code: rule.code,
    nature: rule.nature,
    thresholdTriggered,
    effectiveRatePercent: effectiveRate,
    taxableBase: taxableBase.toFixed(2),
    taxAmount: taxAmount.toFixed(2),
    netPayableAfterTds:
      rule.nature === 'TDS'
        ? txnAmt.minus(taxAmount).toFixed(2)
        : txnAmt.plus(taxAmount).toFixed(2),
  };
}

export interface PartyThresholdExposure {
  partyType: 'SUPPLIER' | 'EXPENSE_PAYEE' | 'CUSTOMER';
  partyName: string;
  gstinOrPan: string | null;
  documentCount: number;
  fyTaxableTurnover: string;
  suggestedSection: string;
  thresholdAmount: string;
  exceedsThreshold: boolean;
}

export async function getTdsTcsRegister(
  businessId: string,
  fyCodeParam?: string | null
) {
  const fyWindow = parseIndianFyCode(fyCodeParam);
  const { startDate, endDate } = buildIndianFyWindow(fyWindow.startYear);

  const existingCount = await prisma.ledger.count({ where: { businessId } });
  if (existingCount === 0) {
    await ensureBusinessCOA(businessId, fyWindow.code);
  }

  const [purchases, expenses, invoices, tdsPayableLedger] = await Promise.all([
    prisma.purchase.findMany({
      where: {
        businessId,
        status: { not: PurchaseStatus.CANCELLED },
        purchaseDate: { gte: startDate, lte: endDate },
      },
      select: {
        subtotal: true,
        supplier: { select: { id: true, name: true, gstin: true } },
      },
    }),
    prisma.expense.findMany({
      where: {
        businessId,
        expenseDate: { gte: startDate, lte: endDate },
      },
      select: {
        payee: true,
        category: true,
        amount: true,
      },
    }),
    prisma.invoice.findMany({
      where: {
        businessId,
        status: { not: InvoiceStatus.CANCELLED },
        invoiceDate: { gte: startDate, lte: endDate },
      },
      select: {
        customerId: true,
        customerName: true,
        customerGstin: true,
        subtotal: true,
      },
    }),
    getSystemLedger(businessId, SYSTEM_LEDGER_CODES.TDS_PAY),
  ]);

  const supplierTotals = new Map<
    string,
    { name: string; gstin: string | null; count: number; total: Prisma.Decimal }
  >();
  for (const p of purchases) {
    const key = p.supplier.id;
    const prev = supplierTotals.get(key) || {
      name: p.supplier.name,
      gstin: p.supplier.gstin || null,
      count: 0,
      total: new Prisma.Decimal(0),
    };
    prev.count += 1;
    prev.total = prev.total.plus(toDecimal2(p.subtotal));
    supplierTotals.set(key, prev);
  }

  const expenseTotals = new Map<
    string,
    { name: string; category: string; count: number; total: Prisma.Decimal }
  >();
  for (const e of expenses) {
    const key = e.payee.trim().toLowerCase();
    const prev = expenseTotals.get(key) || {
      name: e.payee,
      category: e.category,
      count: 0,
      total: new Prisma.Decimal(0),
    };
    prev.count += 1;
    prev.total = prev.total.plus(toDecimal2(e.amount));
    expenseTotals.set(key, prev);
  }

  const customerTotals = new Map<
    string,
    { name: string; gstin: string | null; count: number; total: Prisma.Decimal }
  >();
  for (const i of invoices) {
    const key = i.customerId;
    const prev = customerTotals.get(key) || {
      name: i.customerName,
      gstin: i.customerGstin || null,
      count: 0,
      total: new Prisma.Decimal(0),
    };
    prev.count += 1;
    prev.total = prev.total.plus(toDecimal2(i.subtotal));
    customerTotals.set(key, prev);
  }

  const exposures: PartyThresholdExposure[] = [];

  for (const s of supplierTotals.values()) {
    exposures.push({
      partyType: 'SUPPLIER',
      partyName: s.name,
      gstinOrPan: s.gstin && s.gstin.length >= 12 ? s.gstin.slice(2, 12) : s.gstin,
      documentCount: s.count,
      fyTaxableTurnover: s.total.toFixed(2),
      suggestedSection: '194Q (Goods > ₹50L)',
      thresholdAmount: '5000000.00',
      exceedsThreshold: s.total.gt(5000000),
    });
  }

  for (const exp of expenseTotals.values()) {
    const cat = exp.category.toLowerCase();
    const isRent = cat.includes('rent');
    const isProf = cat.includes('consult') || cat.includes('legal') || cat.includes('audit') || cat.includes('prof');
    const threshold = isRent ? 240000 : isProf ? 30000 : 100000;
    const secLabel = isRent
      ? '194I (Rent)'
      : isProf
        ? '194J (Professional)'
        : '194C (Contractor)';

    exposures.push({
      partyType: 'EXPENSE_PAYEE',
      partyName: `${exp.name} (${exp.category})`,
      gstinOrPan: null,
      documentCount: exp.count,
      fyTaxableTurnover: exp.total.toFixed(2),
      suggestedSection: secLabel,
      thresholdAmount: threshold.toFixed(2),
      exceedsThreshold: exp.total.gt(threshold),
    });
  }

  for (const c of customerTotals.values()) {
    if (c.total.gt(2500000)) {
      exposures.push({
        partyType: 'CUSTOMER',
        partyName: c.name,
        gstinOrPan: c.gstin && c.gstin.length >= 12 ? c.gstin.slice(2, 12) : c.gstin,
        documentCount: c.count,
        fyTaxableTurnover: c.total.toFixed(2),
        suggestedSection: '206C(1H) TCS (> ₹50L)',
        thresholdAmount: '5000000.00',
        exceedsThreshold: c.total.gt(5000000),
      });
    }
  }

  exposures.sort((a, b) => Number(b.fyTaxableTurnover) - Number(a.fyTaxableTurnover));

  const tdsVouchers = tdsPayableLedger
    ? await prisma.voucherEntry.findMany({
        where: {
          ledgerId: tdsPayableLedger.id,
          voucher: { businessId, fyCode: fyWindow.code, status: 'POSTED' },
        },
        include: {
          voucher: {
            select: {
              id: true,
              voucherNumber: true,
              voucherDate: true,
              narration: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      })
    : [];

  let tdsCr = new Prisma.Decimal(0);
  let tdsDr = new Prisma.Decimal(0);
  for (const e of tdsVouchers) {
    tdsCr = tdsCr.plus(e.creditAmount);
    tdsDr = tdsDr.plus(e.debitAmount);
  }

  return {
    fyCode: fyWindow.code,
    rules: TDS_SECTION_RULES,
    tdsPayableLedgerId: tdsPayableLedger?.id || null,
    tdsPayableNetBalance: tdsCr.minus(tdsDr).toFixed(2),
    tdsVoucherEntries: tdsVouchers.map((e) => ({
      entryId: e.id,
      voucherId: e.voucher.id,
      voucherNumber: e.voucher.voucherNumber,
      voucherDate: e.voucher.voucherDate.toISOString().slice(0, 10),
      narration: e.narration || e.voucher.narration || '',
      debitAmount: e.debitAmount.toFixed(2),
      creditAmount: e.creditAmount.toFixed(2),
    })),
    exposures,
  };
}

export async function postTdsProvisionVoucher(input: {
  businessId: string;
  fyCode: string;
  debitLedgerId: string;
  tdsAmount: number | string;
  sectionCode: TdsSectionCode;
  partyName: string;
  voucherDate: Date;
  actorUserId: string;
  actorEmail?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
}) {
  const existingCount = await prisma.ledger.count({ where: { businessId: input.businessId } });
  if (existingCount === 0) {
    await ensureBusinessCOA(input.businessId, input.fyCode);
  }

  const tdsLedger = await getSystemLedger(input.businessId, SYSTEM_LEDGER_CODES.TDS_PAY);
  if (!tdsLedger) {
    throw new Error('TDS Payable system ledger (TDS_PAY) not found.');
  }

  const debitLedger = await prisma.ledger.findFirst({
    where: { id: input.debitLedgerId, businessId: input.businessId },
    select: { id: true, name: true },
  });
  if (!debitLedger) {
    throw new Error('Selected expense or party debit ledger was not found.');
  }

  const amt = toDecimal2(input.tdsAmount);
  if (amt.lte(0)) {
    throw new Error('TDS amount must be greater than zero.');
  }

  const voucher = await postVoucher({
    businessId: input.businessId,
    fyCode: input.fyCode,
    voucherType: 'JOURNAL',
    voucherDate: input.voucherDate,
    narration: `TDS ${input.sectionCode} deduction for ${input.partyName}`,
    referenceType: 'TDS_PROVISION',
    createdBy: input.actorUserId,
    entries: [
      {
        ledgerId: debitLedger.id,
        debitAmount: amt.toNumber(),
        creditAmount: 0,
        narration: `TDS ${input.sectionCode} adjusted against ${input.partyName}`,
      },
      {
        ledgerId: tdsLedger.id,
        debitAmount: 0,
        creditAmount: amt.toNumber(),
        narration: `TDS ${input.sectionCode} payable - ${input.partyName}`,
      },
    ],
  });

  await recordAuditEvent({
    businessId: input.businessId,
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
    actorName: input.actorName,
    actorRole: input.actorRole,
    action: 'TDS_PROVISION_POSTED',
    entityType: 'Voucher',
    entityId: voucher.id,
    newValue: {
      voucherNumber: voucher.voucherNumber,
      sectionCode: input.sectionCode,
      partyName: input.partyName,
      tdsAmount: amt.toFixed(2),
    },
    reason: `TDS ${input.sectionCode} deduction posted for ${input.partyName}`,
  });

  return voucher;
}
