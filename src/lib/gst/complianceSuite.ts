import { InvoiceStatus, Prisma, PurchaseStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { toDecimal2 } from '@/lib/accounting/ledgerService';
import { recordAuditEvent } from '@/lib/rbac/auditService';
import { buildGstr1Csv, buildGstr1Payload } from '@/lib/reports/gstr1';
import { buildGstr3bCsv, buildGstr3bPayload } from '@/lib/reports/gstr3b';
import { getStateCode, getStateCodeFromGstin } from '@/lib/reports/financialYear';

export const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const HSN_REGEX = /^[0-9]{4}([0-9]{2}){0,2}$/;

export function isValidGstin(gstin?: string | null): boolean {
  if (!gstin) return false;
  return GSTIN_REGEX.test(gstin.trim().toUpperCase());
}

export function isValidHsnCode(hsn?: string | null): boolean {
  if (!hsn) return false;
  return HSN_REGEX.test(hsn.trim());
}

export function buildMonthWindow(month: number, year: number): {
  startDate: Date;
  endDate: Date;
  returnPeriod: string;
} {
  const safeMonth = Math.min(Math.max(Math.trunc(month), 1), 12);
  const safeYear = Math.min(Math.max(Math.trunc(year), 2017), 2100);
  const startDate = new Date(safeYear, safeMonth - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(safeYear, safeMonth, 0, 23, 59, 59, 999);
  const returnPeriod = `${String(safeMonth).padStart(2, '0')}${safeYear}`;
  return { startDate, endDate, returnPeriod };
}

export interface GstTaxVector {
  igst: string;
  cgst: string;
  sgst: string;
}

export interface GstItcOffsetResult {
  outputLiability: GstTaxVector & { total: string };
  eligibleItc: GstTaxVector & { total: string };
  utilization: {
    igstFromIgst: string;
    cgstFromIgst: string;
    sgstFromIgst: string;
    cgstFromCgst: string;
    igstFromCgst: string;
    sgstFromSgst: string;
    igstFromSgst: string;
  };
  netCashPayable: GstTaxVector & { total: string };
  closingItcCarryForward: GstTaxVector & { total: string };
}

/**
 * Implements Indian GST Section 49 / Rule 88A electronic credit ledger utilization:
 * 1. Input IGST sets off Output IGST first, then Output CGST, then Output SGST.
 * 2. Input CGST sets off Output CGST first, then remaining Output IGST (never SGST).
 * 3. Input SGST sets off Output SGST first, then remaining Output IGST (never CGST).
 */
export function computeGstItcOffset(input: {
  outputIgst: Prisma.Decimal | number | string;
  outputCgst: Prisma.Decimal | number | string;
  outputSgst: Prisma.Decimal | number | string;
  itcIgst: Prisma.Decimal | number | string;
  itcCgst: Prisma.Decimal | number | string;
  itcSgst: Prisma.Decimal | number | string;
}): GstItcOffsetResult {
  let remOutI = Prisma.Decimal.max(toDecimal2(input.outputIgst), 0);
  let remOutC = Prisma.Decimal.max(toDecimal2(input.outputCgst), 0);
  let remOutS = Prisma.Decimal.max(toDecimal2(input.outputSgst), 0);

  let remItcI = Prisma.Decimal.max(toDecimal2(input.itcIgst), 0);
  let remItcC = Prisma.Decimal.max(toDecimal2(input.itcCgst), 0);
  let remItcS = Prisma.Decimal.max(toDecimal2(input.itcSgst), 0);

  // 1. Input IGST -> Output IGST -> Output CGST -> Output SGST
  const igstFromIgst = Prisma.Decimal.min(remItcI, remOutI);
  remItcI = remItcI.minus(igstFromIgst);
  remOutI = remOutI.minus(igstFromIgst);

  const cgstFromIgst = Prisma.Decimal.min(remItcI, remOutC);
  remItcI = remItcI.minus(cgstFromIgst);
  remOutC = remOutC.minus(cgstFromIgst);

  const sgstFromIgst = Prisma.Decimal.min(remItcI, remOutS);
  remItcI = remItcI.minus(sgstFromIgst);
  remOutS = remOutS.minus(sgstFromIgst);

  // 2. Input CGST -> Output CGST -> Output IGST
  const cgstFromCgst = Prisma.Decimal.min(remItcC, remOutC);
  remItcC = remItcC.minus(cgstFromCgst);
  remOutC = remOutC.minus(cgstFromCgst);

  const igstFromCgst = Prisma.Decimal.min(remItcC, remOutI);
  remItcC = remItcC.minus(igstFromCgst);
  remOutI = remOutI.minus(igstFromCgst);

  // 3. Input SGST -> Output SGST -> Output IGST
  const sgstFromSgst = Prisma.Decimal.min(remItcS, remOutS);
  remItcS = remItcS.minus(sgstFromSgst);
  remOutS = remOutS.minus(sgstFromSgst);

  const igstFromSgst = Prisma.Decimal.min(remItcS, remOutI);
  remItcS = remItcS.minus(igstFromSgst);
  remOutI = remOutI.minus(igstFromSgst);

  const outI0 = Prisma.Decimal.max(toDecimal2(input.outputIgst), 0);
  const outC0 = Prisma.Decimal.max(toDecimal2(input.outputCgst), 0);
  const outS0 = Prisma.Decimal.max(toDecimal2(input.outputSgst), 0);
  const itcI0 = Prisma.Decimal.max(toDecimal2(input.itcIgst), 0);
  const itcC0 = Prisma.Decimal.max(toDecimal2(input.itcCgst), 0);
  const itcS0 = Prisma.Decimal.max(toDecimal2(input.itcSgst), 0);

  return {
    outputLiability: {
      igst: outI0.toFixed(2),
      cgst: outC0.toFixed(2),
      sgst: outS0.toFixed(2),
      total: outI0.plus(outC0).plus(outS0).toFixed(2),
    },
    eligibleItc: {
      igst: itcI0.toFixed(2),
      cgst: itcC0.toFixed(2),
      sgst: itcS0.toFixed(2),
      total: itcI0.plus(itcC0).plus(itcS0).toFixed(2),
    },
    utilization: {
      igstFromIgst: igstFromIgst.toFixed(2),
      cgstFromIgst: cgstFromIgst.toFixed(2),
      sgstFromIgst: sgstFromIgst.toFixed(2),
      cgstFromCgst: cgstFromCgst.toFixed(2),
      igstFromCgst: igstFromCgst.toFixed(2),
      sgstFromSgst: sgstFromSgst.toFixed(2),
      igstFromSgst: igstFromSgst.toFixed(2),
    },
    netCashPayable: {
      igst: remOutI.toFixed(2),
      cgst: remOutC.toFixed(2),
      sgst: remOutS.toFixed(2),
      total: remOutI.plus(remOutC).plus(remOutS).toFixed(2),
    },
    closingItcCarryForward: {
      igst: remItcI.toFixed(2),
      cgst: remItcC.toFixed(2),
      sgst: remItcS.toFixed(2),
      total: remItcI.plus(remItcC).plus(remItcS).toFixed(2),
    },
  };
}

export async function getSalesTaxRegister(
  businessId: string,
  month?: number | null,
  year?: number | null
) {
  const dateFilter =
    month && year ? buildMonthWindow(month, year) : null;

  const invoices = await prisma.invoice.findMany({
    where: {
      businessId,
      ...(dateFilter
        ? { invoiceDate: { gte: dateFilter.startDate, lte: dateFilter.endDate } }
        : {}),
    },
    orderBy: { invoiceDate: 'desc' },
    select: {
      id: true,
      invoiceNumber: true,
      invoiceDate: true,
      status: true,
      gstType: true,
      isGstInvoice: true,
      customerName: true,
      customerGstin: true,
      customerBillingAddress: true,
      subtotal: true,
      discountTotal: true,
      cgstTotal: true,
      sgstTotal: true,
      igstTotal: true,
      taxTotal: true,
      total: true,
    },
  });

  let totalTaxable = new Prisma.Decimal(0);
  let totalCgst = new Prisma.Decimal(0);
  let totalSgst = new Prisma.Decimal(0);
  let totalIgst = new Prisma.Decimal(0);
  let totalValue = new Prisma.Decimal(0);
  let b2bCount = 0;
  let b2cCount = 0;
  let cancelledCount = 0;

  const rows = invoices.map((inv) => {
    const isCancelled = inv.status === InvoiceStatus.CANCELLED;
    if (isCancelled) {
      cancelledCount += 1;
    } else {
      totalTaxable = totalTaxable.plus(toDecimal2(inv.subtotal));
      totalCgst = totalCgst.plus(toDecimal2(inv.cgstTotal));
      totalSgst = totalSgst.plus(toDecimal2(inv.sgstTotal));
      totalIgst = totalIgst.plus(toDecimal2(inv.igstTotal));
      totalValue = totalValue.plus(toDecimal2(inv.total));
      if (isValidGstin(inv.customerGstin)) b2bCount += 1;
      else b2cCount += 1;
    }

    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate.toISOString().slice(0, 10),
      status: inv.status,
      supplyCategory: isValidGstin(inv.customerGstin) ? 'B2B' : 'B2C',
      customerName: inv.customerName,
      customerGstin: inv.customerGstin || null,
      taxableValue: toDecimal2(inv.subtotal).toFixed(2),
      cgst: toDecimal2(inv.cgstTotal).toFixed(2),
      sgst: toDecimal2(inv.sgstTotal).toFixed(2),
      igst: toDecimal2(inv.igstTotal).toFixed(2),
      taxTotal: toDecimal2(inv.taxTotal).toFixed(2),
      total: toDecimal2(inv.total).toFixed(2),
    };
  });

  return {
    periodLabel: dateFilter ? dateFilter.returnPeriod : 'ALL',
    totals: {
      activeCount: invoices.length - cancelledCount,
      cancelledCount,
      b2bCount,
      b2cCount,
      taxableValue: totalTaxable.toFixed(2),
      cgst: totalCgst.toFixed(2),
      sgst: totalSgst.toFixed(2),
      igst: totalIgst.toFixed(2),
      taxTotal: totalCgst.plus(totalSgst).plus(totalIgst).toFixed(2),
      totalValue: totalValue.toFixed(2),
    },
    rows,
  };
}

export const ALLOWED_ITC_ELIGIBILITY = [
  'ELIGIBLE',
  'RECONCILED',
  'CAPITAL_GOODS',
  'PENDING_VERIFICATION',
  'INELIGIBLE',
  'BLOCKED_SEC_17_5',
] as const;

export type ItcEligibilityCode = (typeof ALLOWED_ITC_ELIGIBILITY)[number];

export async function getPurchaseItcRegister(
  businessId: string,
  month?: number | null,
  year?: number | null
) {
  const dateFilter =
    month && year ? buildMonthWindow(month, year) : null;

  const purchases = await prisma.purchase.findMany({
    where: {
      businessId,
      ...(dateFilter
        ? { purchaseDate: { gte: dateFilter.startDate, lte: dateFilter.endDate } }
        : {}),
    },
    orderBy: { purchaseDate: 'desc' },
    select: {
      id: true,
      purchaseNumber: true,
      supplierInvoiceNumber: true,
      purchaseDate: true,
      status: true,
      itcEligibility: true,
      placeOfSupply: true,
      subtotal: true,
      cgstTotal: true,
      sgstTotal: true,
      igstTotal: true,
      taxTotal: true,
      total: true,
      supplier: {
        select: {
          id: true,
          name: true,
          gstin: true,
        },
      },
    },
  });

  let taxableValue = new Prisma.Decimal(0);
  let eligibleItcTotal = new Prisma.Decimal(0);
  let blockedItcTotal = new Prisma.Decimal(0);
  let totalValue = new Prisma.Decimal(0);

  const rows = purchases.map((p) => {
    const isCancelled = p.status === PurchaseStatus.CANCELLED;
    const taxAmt = toDecimal2(p.taxTotal);
    const isEligibleBucket = ['ELIGIBLE', 'RECONCILED', 'CAPITAL_GOODS'].includes(
      p.itcEligibility
    );

    if (!isCancelled) {
      taxableValue = taxableValue.plus(toDecimal2(p.subtotal));
      totalValue = totalValue.plus(toDecimal2(p.total));
      if (isEligibleBucket) {
        eligibleItcTotal = eligibleItcTotal.plus(taxAmt);
      } else {
        blockedItcTotal = blockedItcTotal.plus(taxAmt);
      }
    }

    return {
      id: p.id,
      purchaseNumber: p.purchaseNumber,
      supplierInvoiceNumber: p.supplierInvoiceNumber || null,
      purchaseDate: p.purchaseDate.toISOString().slice(0, 10),
      status: p.status,
      itcEligibility: p.itcEligibility,
      supplierName: p.supplier.name,
      supplierGstin: p.supplier.gstin || null,
      taxableValue: toDecimal2(p.subtotal).toFixed(2),
      cgst: toDecimal2(p.cgstTotal).toFixed(2),
      sgst: toDecimal2(p.sgstTotal).toFixed(2),
      igst: toDecimal2(p.igstTotal).toFixed(2),
      taxTotal: taxAmt.toFixed(2),
      total: toDecimal2(p.total).toFixed(2),
    };
  });

  return {
    periodLabel: dateFilter ? dateFilter.returnPeriod : 'ALL',
    totals: {
      count: purchases.filter((p) => p.status !== PurchaseStatus.CANCELLED).length,
      taxableValue: taxableValue.toFixed(2),
      eligibleItcTotal: eligibleItcTotal.toFixed(2),
      blockedOrPendingItcTotal: blockedItcTotal.toFixed(2),
      totalValue: totalValue.toFixed(2),
    },
    rows,
  };
}

export async function updatePurchaseItcEligibility(input: {
  businessId: string;
  purchaseId: string;
  itcEligibility: ItcEligibilityCode;
  actorUserId: string;
  actorEmail?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
}) {
  const existing = await prisma.purchase.findFirst({
    where: { id: input.purchaseId, businessId: input.businessId },
    select: { id: true, purchaseNumber: true, itcEligibility: true },
  });
  if (!existing) {
    throw new Error('Purchase bill not found.');
  }

  const updated = await prisma.purchase.update({
    where: { id: existing.id },
    data: { itcEligibility: input.itcEligibility },
    select: { id: true, purchaseNumber: true, itcEligibility: true },
  });

  await recordAuditEvent({
    businessId: input.businessId,
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
    actorName: input.actorName,
    actorRole: input.actorRole,
    action: 'PURCHASE_ITC_CLASSIFICATION_UPDATED',
    entityType: 'Purchase',
    entityId: updated.id,
    previousValue: { itcEligibility: existing.itcEligibility },
    newValue: { itcEligibility: updated.itcEligibility },
    reason: `ITC status changed for ${existing.purchaseNumber}`,
  });

  return updated;
}

export async function getScaleGstr1Report(
  businessId: string,
  month: number,
  year: number
) {
  const { startDate, endDate, returnPeriod } = buildMonthWindow(month, year);

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, name: true, gstin: true, state: true },
  });

  if (!business || !isValidGstin(business.gstin)) {
    throw new Error(
      'A valid 15-digit Business GSTIN is required in Settings before generating GSTR-1.'
    );
  }

  const [invoices, creditNotes] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        businessId,
        invoiceDate: { gte: startDate, lte: endDate },
      },
      include: { items: true },
      orderBy: { invoiceDate: 'asc' },
    }),
    prisma.creditDebitNote.findMany({
      where: {
        businessId,
        noteDate: { gte: startDate, lte: endDate },
      },
      orderBy: { noteDate: 'asc' },
    }),
  ]);

  const payload = buildGstr1Payload({
    businessGstin: business.gstin!,
    businessState: business.state,
    returnPeriod,
    invoices,
    creditNotes: creditNotes.map((cn) => ({
      noteNumber: cn.noteNumber,
      noteDate: cn.noteDate,
      noteType: cn.noteType,
      originalInvoiceNumber: cn.originalInvoiceNumber,
      partyName: cn.partyName,
      partyGstin: cn.partyGstin,
      taxableValue: cn.taxableValue,
      cgstTotal: cn.cgstTotal,
      sgstTotal: cn.sgstTotal,
      igstTotal: cn.igstTotal,
      total: cn.total,
    })),
  });

  return {
    business: { name: business.name, gstin: business.gstin!, state: business.state },
    returnPeriod,
    payload,
    csv: buildGstr1Csv(payload),
  };
}

export async function getScaleGstr3bReport(
  businessId: string,
  month: number,
  year: number
) {
  const { startDate, endDate, returnPeriod } = buildMonthWindow(month, year);

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, name: true, gstin: true, state: true },
  });

  if (!business || !isValidGstin(business.gstin)) {
    throw new Error(
      'A valid 15-digit Business GSTIN is required in Settings before generating GSTR-3B.'
    );
  }

  const [invoices, purchases] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        businessId,
        status: { not: InvoiceStatus.CANCELLED },
        invoiceDate: { gte: startDate, lte: endDate },
      },
      orderBy: { invoiceDate: 'desc' },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        customerName: true,
        customerGstin: true,
        customerBillingAddress: true,
        subtotal: true,
        taxTotal: true,
        cgstTotal: true,
        sgstTotal: true,
        igstTotal: true,
        total: true,
        status: true,
      },
    }),
    prisma.purchase.findMany({
      where: {
        businessId,
        status: { not: PurchaseStatus.CANCELLED },
        purchaseDate: { gte: startDate, lte: endDate },
      },
      orderBy: { purchaseDate: 'desc' },
      select: {
        id: true,
        purchaseNumber: true,
        purchaseDate: true,
        subtotal: true,
        taxTotal: true,
        cgstTotal: true,
        sgstTotal: true,
        igstTotal: true,
        itcEligibility: true,
        total: true,
        status: true,
        supplier: { select: { name: true, gstin: true, address: true } },
      },
    }),
  ]);

  const payload = buildGstr3bPayload(
    { name: business.name, gstin: business.gstin, state: business.state },
    invoices,
    purchases,
    startDate
  );

  const offset = computeGstItcOffset({
    outputIgst: payload.sup_details.osup_det.iamt,
    outputCgst: payload.sup_details.osup_det.camt,
    outputSgst: payload.sup_details.osup_det.samt,
    itcIgst: payload.itc_elg.itc_net.iamt,
    itcCgst: payload.itc_elg.itc_net.camt,
    itcSgst: payload.itc_elg.itc_net.samt,
  });

  return {
    business: { name: business.name, gstin: business.gstin!, state: business.state },
    returnPeriod,
    payload,
    offset,
    csv: buildGstr3bCsv(payload),
  };
}

export interface EinvoicePrepInput {
  invoiceNumber: string;
  invoiceDate: Date | string;
  isGstInvoice: boolean;
  gstType: string;
  subtotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  discountTotal: number;
  rounding: number;
  total: number;
  supplier: {
    legalName?: string | null;
    name: string;
    gstin?: string | null;
    address?: string | null;
    city?: string | null;
    pincode?: string | null;
    state?: string | null;
  };
  buyer: {
    name: string;
    gstin?: string | null;
    billingAddress?: string | null;
    state?: string | null;
    pincode?: string | null;
  };
  items: Array<{
    description: string;
    hsnCode?: string | null;
    quantity: number;
    unit?: string | null;
    rate: number;
    discount: number;
    taxRate: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    lineTotal: number;
  }>;
}

function formatDdMmYyyy(dateVal: Date | string): string {
  const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Validates and builds an NIC IRP Schema v1.1 JSON payload from real invoice data.
 * Never fabricates IRNs, Ack Numbers, or Signed QR codes.
 */
export function buildNicEinvoicePayload(inv: EinvoicePrepInput) {
  const validationErrors: string[] = [];

  if (!inv.isGstInvoice) {
    validationErrors.push('Invoice must be a GST Tax Invoice.');
  }
  if (!isValidGstin(inv.supplier.gstin)) {
    validationErrors.push('Supplier (Business) 15-digit GSTIN is missing or invalid.');
  }
  if (!inv.supplier.address?.trim()) {
    validationErrors.push('Supplier registered address is missing.');
  }
  if (!inv.supplier.pincode || !/^\d{6}$/.test(inv.supplier.pincode.trim())) {
    validationErrors.push('Supplier 6-digit PIN code is missing or invalid.');
  }
  if (!isValidGstin(inv.buyer.gstin)) {
    validationErrors.push('Buyer 15-digit GSTIN is required for B2B E-Invoice IRN.');
  }
  if (!inv.buyer.billingAddress?.trim()) {
    validationErrors.push('Buyer billing address is missing.');
  }
  if (inv.items.length === 0) {
    validationErrors.push('Invoice has no line items.');
  }
  inv.items.forEach((item, idx) => {
    if (!isValidHsnCode(item.hsnCode)) {
      validationErrors.push(`Line ${idx + 1} (${item.description}): Valid 4/6/8-digit HSN/SAC code is required.`);
    }
  });

  const sellerStateCode =
    getStateCodeFromGstin(inv.supplier.gstin) || getStateCode(inv.supplier.state);
  const buyerStateCode =
    getStateCodeFromGstin(inv.buyer.gstin) || getStateCode(inv.buyer.state);
  const buyerPinMatch = inv.buyer.billingAddress?.match(/\b(\d{6})\b/);
  const buyerPin =
    inv.buyer.pincode && /^\d{6}$/.test(inv.buyer.pincode.trim())
      ? Number(inv.buyer.pincode.trim())
      : buyerPinMatch
        ? Number(buyerPinMatch[1])
        : null;

  if (!buyerPin) {
    validationErrors.push('Buyer 6-digit PIN code is missing (include in Customer/Billing Address).');
  }

  if (validationErrors.length > 0) {
    return {
      valid: false,
      portalStatus: 'VALIDATION_FAILED' as const,
      validationErrors,
      payload: null,
    };
  }

  const itemList = inv.items.map((item, idx) => {
    const qty = Math.max(Number(item.quantity || 1), 0);
    const totAmt = toDecimal2(Number(item.rate) * qty).toNumber();
    const assAmt = Math.max(
      toDecimal2(totAmt - Number(item.discount || 0)).toNumber(),
      0
    );
    return {
      SlNo: String(idx + 1),
      PrdDesc: item.description.slice(0, 300),
      IsServc: item.hsnCode?.trim().startsWith('99') ? 'Y' : 'N',
      HsnCd: item.hsnCode!.trim(),
      Qty: qty,
      Unit: (item.unit || 'NOS').toUpperCase().slice(0, 8),
      UnitPrice: toDecimal2(item.rate).toNumber(),
      TotAmt: totAmt,
      Discount: toDecimal2(item.discount || 0).toNumber(),
      AssAmt: assAmt,
      GstRt: toDecimal2(item.taxRate).toNumber(),
      IgstAmt: toDecimal2(item.igstAmount).toNumber(),
      CgstAmt: toDecimal2(item.cgstAmount).toNumber(),
      SgstAmt: toDecimal2(item.sgstAmount).toNumber(),
      TotItemVal: toDecimal2(item.lineTotal).toNumber(),
    };
  });

  const payload = {
    Version: '1.1',
    TranDtls: {
      TaxSch: 'GST',
      SupTyp: 'B2B',
      RegRev: 'N',
      IgstOnIntra: 'N',
    },
    DocDtls: {
      Typ: 'INV',
      No: inv.invoiceNumber,
      Dt: formatDdMmYyyy(inv.invoiceDate),
    },
    SellerDtls: {
      Gstin: inv.supplier.gstin!.trim().toUpperCase(),
      LglNm: (inv.supplier.legalName || inv.supplier.name).slice(0, 100),
      Addr1: inv.supplier.address!.trim().slice(0, 100),
      Loc: (inv.supplier.city || inv.supplier.state || 'India').slice(0, 50),
      Pin: Number(inv.supplier.pincode!.trim()),
      Stcd: sellerStateCode,
    },
    BuyerDtls: {
      Gstin: inv.buyer.gstin!.trim().toUpperCase(),
      LglNm: inv.buyer.name.slice(0, 100),
      Pos: buyerStateCode,
      Addr1: inv.buyer.billingAddress!.trim().slice(0, 100),
      Loc: (inv.buyer.state || 'India').slice(0, 50),
      Pin: buyerPin!,
      Stcd: buyerStateCode,
    },
    ItemList: itemList,
    ValDtls: {
      AssVal: toDecimal2(inv.subtotal).toNumber(),
      CgstVal: toDecimal2(inv.cgstTotal).toNumber(),
      SgstVal: toDecimal2(inv.sgstTotal).toNumber(),
      IgstVal: toDecimal2(inv.igstTotal).toNumber(),
      Discount: toDecimal2(inv.discountTotal).toNumber(),
      RndOffAmt: toDecimal2(inv.rounding).toNumber(),
      TotInvVal: toDecimal2(inv.total).toNumber(),
    },
  };

  return {
    valid: true,
    portalStatus: 'READY_FOR_IRP_UPLOAD' as const,
    validationErrors: [] as string[],
    payload,
  };
}

/**
 * Validates and builds an NIC E-Way Bill JSON payload (required in India when consignment > ₹50,000).
 * Never fabricates EWB Numbers.
 */
export function buildEwayBillPayload(
  inv: EinvoicePrepInput,
  transport?: {
    transMode?: '1' | '2' | '3' | '4';
    transDistanceKm?: number;
    transporterId?: string;
    transporterName?: string;
    vehicleNo?: string;
  }
) {
  const validationErrors: string[] = [];

  if (!isValidGstin(inv.supplier.gstin)) {
    validationErrors.push('Supplier 15-digit GSTIN is missing or invalid.');
  }
  if (!inv.supplier.pincode || !/^\d{6}$/.test(inv.supplier.pincode.trim())) {
    validationErrors.push('Supplier dispatch 6-digit PIN code is missing or invalid.');
  }
  const buyerPinMatch = inv.buyer.billingAddress?.match(/\b(\d{6})\b/);
  const buyerPin =
    inv.buyer.pincode && /^\d{6}$/.test(inv.buyer.pincode.trim())
      ? Number(inv.buyer.pincode.trim())
      : buyerPinMatch
        ? Number(buyerPinMatch[1])
        : null;
  if (!buyerPin) {
    validationErrors.push('Buyer delivery 6-digit PIN code is missing.');
  }

  const dist = Number(transport?.transDistanceKm || 0);
  if (!Number.isFinite(dist) || dist <= 0) {
    validationErrors.push('Approximate transport distance (in km > 0) is required for E-Way Bill.');
  }

  inv.items.forEach((item, idx) => {
    if (!isValidHsnCode(item.hsnCode)) {
      validationErrors.push(`Line ${idx + 1}: Valid HSN code required for E-Way Bill.`);
    }
  });

  if (validationErrors.length > 0) {
    return {
      valid: false,
      thresholdExceeded: inv.total > 50000,
      portalStatus: 'VALIDATION_FAILED' as const,
      validationErrors,
      payload: null,
    };
  }

  const fromState = Number(
    getStateCodeFromGstin(inv.supplier.gstin) || getStateCode(inv.supplier.state)
  );
  const toState = Number(
    getStateCodeFromGstin(inv.buyer.gstin) || getStateCode(inv.buyer.state)
  );

  const payload = {
    supplyType: 'O',
    subSupplyType: '1',
    docType: 'INV',
    docNo: inv.invoiceNumber,
    docDate: formatDdMmYyyy(inv.invoiceDate),
    fromGstin: inv.supplier.gstin!.trim().toUpperCase(),
    fromTrdName: inv.supplier.name.slice(0, 100),
    fromAddr1: (inv.supplier.address || '').slice(0, 100),
    fromPlace: (inv.supplier.city || inv.supplier.state || 'India').slice(0, 50),
    fromPincode: Number(inv.supplier.pincode!.trim()),
    actFromStateCode: fromState,
    fromStateCode: fromState,
    toGstin: isValidGstin(inv.buyer.gstin)
      ? inv.buyer.gstin!.trim().toUpperCase()
      : 'URP',
    toTrdName: inv.buyer.name.slice(0, 100),
    toAddr1: (inv.buyer.billingAddress || '').slice(0, 100),
    toPlace: (inv.buyer.state || 'India').slice(0, 50),
    toPincode: buyerPin!,
    actToStateCode: toState,
    toStateCode: toState,
    transactionType: 1,
    totalValue: toDecimal2(inv.subtotal).toNumber(),
    cgstValue: toDecimal2(inv.cgstTotal).toNumber(),
    sgstValue: toDecimal2(inv.sgstTotal).toNumber(),
    igstValue: toDecimal2(inv.igstTotal).toNumber(),
    totInvValue: toDecimal2(inv.total).toNumber(),
    transMode: transport?.transMode || '1',
    transDistance: String(Math.round(dist)),
    transporterName: transport?.transporterName?.trim() || '',
    transporterId: transport?.transporterId?.trim() || '',
    vehicleNo: transport?.vehicleNo?.trim().toUpperCase() || '',
    vehicleType: 'R',
    itemList: inv.items.map((item) => ({
      productName: item.description.slice(0, 100),
      hsnCode: Number(item.hsnCode!.trim()),
      quantity: Number(item.quantity),
      qtyUnit: (item.unit || 'NOS').toUpperCase().slice(0, 3),
      taxableAmount: toDecimal2(Number(item.rate) * Number(item.quantity) - Number(item.discount || 0)).toNumber(),
      cgstRate: toDecimal2(item.taxRate / 2).toNumber(),
      sgstRate: toDecimal2(item.taxRate / 2).toNumber(),
      igstRate: inv.igstTotal > 0 ? toDecimal2(item.taxRate).toNumber() : 0,
    })),
  };

  return {
    valid: true,
    thresholdExceeded: inv.total > 50000,
    portalStatus: 'READY_FOR_EWB_PORTAL' as const,
    validationErrors: [] as string[],
    payload,
  };
}
