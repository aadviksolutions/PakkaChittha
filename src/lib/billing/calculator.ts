export type GstType = 'CGST_SGST' | 'IGST' | 'EXEMPT';

export interface LineItemInput {
  productId?: string | null;
  hsnCode?: string | null;
  description: string;
  quantity: number;
  unit?: string;
  rate: number;
  discount?: number;
  discountType?: 'AMOUNT' | 'PERCENTAGE';
  taxRate?: number; // e.g. 0, 5, 12, 18, 28
}

export interface CalculatedLineItem {
  productId?: string | null;
  hsnCode?: string | null;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  discount: number;
  discountType: 'AMOUNT' | 'PERCENTAGE';
  taxRate: number;
  taxableAmount: number;
  taxAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  lineTotal: number;
}

export interface InvoiceCalculationResult {
  items: CalculatedLineItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  grossTotal: number;
  rounding: number;
  total: number;
  paidAmount: number;
  balanceDue: number;
}

/**
 * Decimal-safe rounding to 2 decimal places.
 * Mitigates IEEE 754 floating point inaccuracies.
 */
export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates line items and invoice totals strictly on the server with decimal safety.
 */
export function calculateInvoiceTotals(params: {
  items: LineItemInput[];
  gstType: GstType;
  isTaxInclusive: boolean;
  isGstInvoice: boolean;
  paidAmount?: number;
  enableRounding?: boolean;
}): InvoiceCalculationResult {
  const {
    items,
    gstType,
    isTaxInclusive,
    isGstInvoice,
    paidAmount = 0,
    enableRounding = true,
  } = params;

  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let grossTotal = 0;

  const calculatedItems: CalculatedLineItem[] = items.map((item) => {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const rate = Math.max(0, Number(item.rate) || 0);
    const rawTaxRate = isGstInvoice ? Math.max(0, Number(item.taxRate) || 0) : 0;
    const unit = item.unit?.trim() || 'Pcs';
    const discountType = item.discountType || 'AMOUNT';

    // Calculate discount
    const rawTotal = round2(qty * rate);
    let discountAmount = 0;
    if (discountType === 'PERCENTAGE') {
      const pct = Math.min(100, Math.max(0, Number(item.discount) || 0));
      discountAmount = round2((rawTotal * pct) / 100);
    } else {
      discountAmount = Math.min(rawTotal, Math.max(0, Number(item.discount) || 0));
    }

    let taxableAmount = 0;
    let taxAmount = 0;
    let lineTotal = 0;

    if (gstType === 'EXEMPT' || rawTaxRate === 0 || !isGstInvoice) {
      taxableAmount = round2(rawTotal - discountAmount);
      taxAmount = 0;
      lineTotal = taxableAmount;
    } else if (isTaxInclusive) {
      // Rate is inclusive of tax:
      // Taxable = Net / (1 + taxRate / 100)
      const netInclusive = round2(rawTotal - discountAmount);
      taxableAmount = round2(netInclusive / (1 + rawTaxRate / 100));
      taxAmount = round2(netInclusive - taxableAmount);
      lineTotal = netInclusive;
    } else {
      // Rate is exclusive of tax:
      // Taxable = Net, Tax = Taxable * taxRate / 100
      taxableAmount = round2(rawTotal - discountAmount);
      taxAmount = round2((taxableAmount * rawTaxRate) / 100);
      lineTotal = round2(taxableAmount + taxAmount);
    }

    // Split taxes based on GST type
    let cgstRate = 0;
    let cgstAmount = 0;
    let sgstRate = 0;
    let sgstAmount = 0;
    let igstRate = 0;
    let igstAmount = 0;

    if (taxAmount > 0) {
      if (gstType === 'CGST_SGST') {
        cgstRate = round2(rawTaxRate / 2);
        sgstRate = round2(rawTaxRate / 2);
        cgstAmount = round2(taxAmount / 2);
        // Balance to ensure exact cent/paise match
        sgstAmount = round2(taxAmount - cgstAmount);
      } else if (gstType === 'IGST') {
        igstRate = rawTaxRate;
        igstAmount = taxAmount;
      }
    }

    subtotal = round2(subtotal + taxableAmount);
    discountTotal = round2(discountTotal + discountAmount);
    taxTotal = round2(taxTotal + taxAmount);
    cgstTotal = round2(cgstTotal + cgstAmount);
    sgstTotal = round2(sgstTotal + sgstAmount);
    igstTotal = round2(igstTotal + igstAmount);
    grossTotal = round2(grossTotal + lineTotal);

    return {
      productId: item.productId?.trim() || null,
      hsnCode: item.hsnCode?.trim() || null,
      description: item.description?.trim() || 'Untitled Item',
      quantity: qty,
      unit,
      rate,
      discount: discountAmount,
      discountType,
      taxRate: rawTaxRate,
      taxableAmount,
      taxAmount,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      igstRate,
      igstAmount,
      lineTotal,
    };
  });

  // Calculate rounding
  let finalTotal = grossTotal;
  let rounding = 0;

  if (enableRounding) {
    const rounded = Math.round(grossTotal);
    rounding = round2(rounded - grossTotal);
    finalTotal = rounded;
  }

  const safePaid = Math.max(0, Math.min(finalTotal, Number(paidAmount) || 0));
  const balanceDue = round2(finalTotal - safePaid);

  return {
    items: calculatedItems,
    subtotal,
    discountTotal,
    taxTotal,
    cgstTotal,
    sgstTotal,
    igstTotal,
    grossTotal,
    rounding,
    total: finalTotal,
    paidAmount: safePaid,
    balanceDue,
  };
}
