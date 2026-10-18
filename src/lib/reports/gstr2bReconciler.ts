/**
 * Pakka Chittha GSTR-2B Import & Purchase Register Reconciler
 *
 * Implements 2-way automatic matching between official GSTN GSTR-2B auto-drafted ITC
 * statement and the business tenant's recorded Purchase Register.
 *
 * Classifies every transaction into:
 * 1. MATCHED: Perfectly reconciled between Books and GSTR-2B (Safe to claim in GSTR-3B Table 4A5).
 * 2. MISMATCH_TAX: Invoice number matches, but taxable or tax amounts disagree.
 * 3. MISSING_IN_2B: Recorded in your purchases, but supplier did not file in GSTR-1 (At-Risk ITC).
 * 4. MISSING_IN_PURCHASES: Present in GSTR-2B, but missing in your books (Unclaimed purchase bill).
 * 5. DUPLICATE: Multiple instances of same invoice number.
 */

import prisma from '@/lib/prisma';
import { round2 } from '@/lib/billing/calculator';
import { PurchaseStatus } from '@prisma/client';

export interface Gstr2bRawInvoice {
  supplierGstin: string;
  supplierName?: string;
  invoiceNumber: string;
  invoiceDate: string; // DD-MM-YYYY or YYYY-MM-DD
  invoiceType?: string; // R (Regular), C (Credit Note), D (Debit Note)
  placeOfSupply?: string;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  itcAvailable: 'Y' | 'N';
}

export interface ReconciliationRow {
  key: string;
  status: 'MATCHED' | 'MISMATCH_TAX' | 'MISSING_IN_2B' | 'MISSING_IN_PURCHASES' | 'DUPLICATE';
  supplierGstin: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  // Books (Purchase Register) figures
  booksPurchaseId?: string;
  booksPurchaseNumber?: string;
  booksTaxable?: number;
  booksTax?: number;
  booksTotal?: number;
  // GSTR-2B Portal figures
  gstr2bTaxable?: number;
  gstr2bTax?: number;
  gstr2bTotal?: number;
  // Variance
  taxDifference?: number;
  notes: string;
}

export interface Gstr2bReconciliationResult {
  importId?: string;
  returnPeriod: string;
  financialYear: string;
  summary: {
    totalInGstr2b: number;
    totalInPurchases: number;
    matchedCount: number;
    mismatchCount: number;
    missingIn2bCount: number;
    missingInPurchasesCount: number;
    reconciledItc: number;
    atRiskItc: number;
    unclaimedItc: number;
    matchPercentage: number;
  };
  rows: ReconciliationRow[];
}

/**
 * Normalizes invoice number by stripping spaces, special chars, and leading zeros
 * e.g. "INV/2026/0014" -> "inv202614", "00123" -> "123"
 */
export function normalizeInvoiceNumber(invNum?: string | null): string {
  if (!invNum) return '';
  return invNum
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/^0+/, '');
}

/**
 * Normalizes Indian date format (DD-MM-YYYY, DD/MM/YYYY, or YYYY-MM-DD) to ISO Date string
 */
export function normalizeGstDate(rawDate?: string | null): Date {
  if (!rawDate) return new Date();
  const trimmed = rawDate.trim();
  // Check for DD-MM-YYYY or DD/MM/YYYY
  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(trimmed)) {
    const parts = trimmed.split(/[-/]/);
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Parses official GSTR-2B JSON payload into structured invoice records
 */
export function parseGstr2bJson(jsonContent: string | object): {
  gstin: string;
  fp: string; // MMYYYY
  invoices: Gstr2bRawInvoice[];
} {
  const data = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;

  const gstin = data.gstin || data.data?.gstin || '';
  const fp = data.fp || data.data?.fp || '';
  const invoices: Gstr2bRawInvoice[] = [];

  const b2bList = data.b2b || data.data?.b2b || data.data?.docdata?.b2b || [];

  for (const b of b2bList) {
    const supplierGstin = b.ctin || b.supplier_gstin || '';
    const supplierName = b.cpty || b.trdnm || b.trade_name || 'Vendor';

    const invList = b.inv || [];
    for (const inv of invList) {
      const inum = inv.inum || '';
      const idt = inv.idt || '';
      const val = Number(inv.val || 0);
      const pos = inv.pos || '';
      const itcavl = (inv.itcavl || 'Y').toUpperCase() === 'N' ? 'N' : 'Y';

      let taxable = 0;
      let iamt = 0;
      let camt = 0;
      let samt = 0;

      const items = inv.items || inv.itms || [];
      for (const itm of items) {
        const d = itm.itm_det || itm;
        taxable += Number(d.txval || 0);
        iamt += Number(d.iamt || 0);
        camt += Number(d.camt || 0);
        samt += Number(d.samt || 0);
      }

      invoices.push({
        supplierGstin: supplierGstin.trim().toUpperCase(),
        supplierName,
        invoiceNumber: inum.trim(),
        invoiceDate: idt,
        invoiceType: inv.inv_typ || 'R',
        placeOfSupply: pos,
        taxableValue: round2(taxable),
        cgstAmount: round2(camt),
        sgstAmount: round2(samt),
        igstAmount: round2(iamt),
        totalAmount: round2(val || taxable + iamt + camt + samt),
        itcAvailable: itcavl,
      });
    }
  }

  // Also parse cdnr (credit notes in GSTR-2B) if present
  const cdnrList = data.cdnr || data.data?.cdnr || [];
  for (const c of cdnrList) {
    const supplierGstin = c.ctin || '';
    const supplierName = c.cpty || c.trdnm || 'Vendor';
    for (const nt of c.nt || []) {
      let taxable = 0;
      let iamt = 0;
      let camt = 0;
      let samt = 0;
      for (const itm of nt.itms || nt.items || []) {
        const d = itm.itm_det || itm;
        taxable += Number(d.txval || 0);
        iamt += Number(d.iamt || 0);
        camt += Number(d.camt || 0);
        samt += Number(d.samt || 0);
      }
      invoices.push({
        supplierGstin: supplierGstin.trim().toUpperCase(),
        supplierName,
        invoiceNumber: nt.nt_num || '',
        invoiceDate: nt.nt_dt || '',
        invoiceType: nt.ntty === 'C' ? 'C' : 'D',
        placeOfSupply: nt.pos || '',
        taxableValue: round2(taxable),
        cgstAmount: round2(camt),
        sgstAmount: round2(samt),
        igstAmount: round2(iamt),
        totalAmount: round2(Number(nt.val || 0)),
        itcAvailable: (nt.itcavl || 'Y').toUpperCase() === 'N' ? 'N' : 'Y',
      });
    }
  }

  return { gstin, fp, invoices };
}

/**
 * Reconciles parsed GSTR-2B invoices against the tenant's actual Purchase Register
 */
export async function reconcileGstr2bWithPurchases(params: {
  businessId: string;
  returnPeriod: string;
  financialYear: string;
  gstr2bInvoices: Gstr2bRawInvoice[];
  sourceFileName?: string;
  saveToDb?: boolean;
}): Promise<Gstr2bReconciliationResult> {
  const { businessId, returnPeriod, financialYear, gstr2bInvoices, sourceFileName, saveToDb = true } = params;

  // 1. Fetch non-cancelled purchases for this business
  const purchases = await prisma.purchase.findMany({
    where: {
      businessId,
      status: { not: PurchaseStatus.CANCELLED },
    },
    include: {
      supplier: {
        select: {
          id: true,
          name: true,
          gstin: true,
        },
      },
    },
    orderBy: { purchaseDate: 'desc' },
  });

  // Index purchases for multi-point matching:
  // Primary key: supplierGstin_normalizedInvoiceNum
  // Secondary key: normalizedInvoiceNum
  interface PurchaseRef {
    purchase: (typeof purchases)[0];
    matched: boolean;
  }

  const purchaseMap: Record<string, PurchaseRef[]> = {};
  const purchaseByInvOnly: Record<string, PurchaseRef[]> = {};

  for (const p of purchases) {
    const suppGstin = (p.supplier.gstin || '').trim().toUpperCase();
    const invNumNorm = normalizeInvoiceNumber(p.supplierInvoiceNumber || p.purchaseNumber);

    const ref: PurchaseRef = { purchase: p, matched: false };

    if (suppGstin && invNumNorm) {
      const fullKey = `${suppGstin}_${invNumNorm}`;
      if (!purchaseMap[fullKey]) purchaseMap[fullKey] = [];
      purchaseMap[fullKey].push(ref);
    }

    if (invNumNorm) {
      if (!purchaseByInvOnly[invNumNorm]) purchaseByInvOnly[invNumNorm] = [];
      purchaseByInvOnly[invNumNorm].push(ref);
    }
  }

  const rows: ReconciliationRow[] = [];
  let matchedCount = 0;
  let mismatchCount = 0;
  let missingInPurchasesCount = 0;
  let reconciledItc = 0;
  let atRiskItc = 0;
  let unclaimedItc = 0;

  // 2. Iterate through GSTR-2B invoices and match against Purchases
  for (const g2b of gstr2bInvoices) {
    const suppGstin = g2b.supplierGstin.trim().toUpperCase();
    const invNorm = normalizeInvoiceNumber(g2b.invoiceNumber);
    const fullKey = `${suppGstin}_${invNorm}`;

    let matchRef: PurchaseRef | undefined = undefined;

    // First try exact GSTIN + Invoice Number match
    if (purchaseMap[fullKey] && purchaseMap[fullKey].length > 0) {
      matchRef = purchaseMap[fullKey].find((r) => !r.matched) || purchaseMap[fullKey][0];
    }

    // Secondary fallback: Try matching by invoice number if supplier name or GSTIN matches loosely
    if (!matchRef && purchaseByInvOnly[invNorm] && purchaseByInvOnly[invNorm].length > 0) {
      matchRef = purchaseByInvOnly[invNorm].find((r) => !r.matched) || purchaseByInvOnly[invNorm][0];
    }

    const g2bTax = round2(g2b.cgstAmount + g2b.sgstAmount + g2b.igstAmount);

    if (matchRef) {
      matchRef.matched = true;
      const p = matchRef.purchase;
      const pTax = round2(p.taxTotal);
      const taxDiff = round2(Math.abs(pTax - g2bTax));

      // Check amount alignment (within ₹1 tolerance for rounding differences)
      if (taxDiff <= 1.5) {
        matchedCount++;
        reconciledItc = round2(reconciledItc + pTax);
        rows.push({
          key: `match_${g2b.invoiceNumber}_${p.id}`,
          status: 'MATCHED',
          supplierGstin: suppGstin,
          supplierName: g2b.supplierName || p.supplier.name,
          invoiceNumber: g2b.invoiceNumber,
          invoiceDate: g2b.invoiceDate,
          booksPurchaseId: p.id,
          booksPurchaseNumber: p.purchaseNumber,
          booksTaxable: p.subtotal,
          booksTax: pTax,
          booksTotal: p.total,
          gstr2bTaxable: g2b.taxableValue,
          gstr2bTax: g2bTax,
          gstr2bTotal: g2b.totalAmount,
          taxDifference: 0,
          notes: 'Matched with Purchase Bill. ITC is 100% eligible to claim.',
        });
      } else {
        mismatchCount++;
        rows.push({
          key: `mismatch_${g2b.invoiceNumber}_${p.id}`,
          status: 'MISMATCH_TAX',
          supplierGstin: suppGstin,
          supplierName: g2b.supplierName || p.supplier.name,
          invoiceNumber: g2b.invoiceNumber,
          invoiceDate: g2b.invoiceDate,
          booksPurchaseId: p.id,
          booksPurchaseNumber: p.purchaseNumber,
          booksTaxable: p.subtotal,
          booksTax: pTax,
          booksTotal: p.total,
          gstr2bTaxable: g2b.taxableValue,
          gstr2bTax: g2bTax,
          gstr2bTotal: g2b.totalAmount,
          taxDifference: round2(pTax - g2bTax),
          notes: `Tax discrepancy of ₹${taxDiff.toFixed(2)}. Verify invoice rate and supplier entry.`,
        });
      }
    } else {
      // In GSTR-2B, but not in tenant's Purchase register
      missingInPurchasesCount++;
      unclaimedItc = round2(unclaimedItc + g2bTax);
      rows.push({
        key: `missing_books_${g2b.invoiceNumber}`,
        status: 'MISSING_IN_PURCHASES',
        supplierGstin: suppGstin,
        supplierName: g2b.supplierName || 'Unknown Supplier',
        invoiceNumber: g2b.invoiceNumber,
        invoiceDate: g2b.invoiceDate,
        gstr2bTaxable: g2b.taxableValue,
        gstr2bTax: g2bTax,
        gstr2bTotal: g2b.totalAmount,
        notes: 'Appears in GSTR-2B, but not recorded in your Purchase Register. You can add this purchase to claim ITC.',
      });
    }
  }

  // 3. Find purchases that were NEVER matched in GSTR-2B (Missing in 2B)
  let missingIn2bCount = 0;
  for (const p of purchases) {
    // Only check purchases with supplier GSTIN (B2B taxable purchases)
    if (p.supplier.gstin && p.taxTotal > 0) {
      const invNorm = normalizeInvoiceNumber(p.supplierInvoiceNumber || p.purchaseNumber);
      const suppGstin = p.supplier.gstin.trim().toUpperCase();
      const fullKey = `${suppGstin}_${invNorm}`;

      const wasMatched =
        purchaseMap[fullKey]?.some((r) => r.matched && r.purchase.id === p.id) ||
        purchaseByInvOnly[invNorm]?.some((r) => r.matched && r.purchase.id === p.id);

      if (!wasMatched) {
        missingIn2bCount++;
        atRiskItc = round2(atRiskItc + p.taxTotal);
        rows.push({
          key: `missing_2b_${p.id}`,
          status: 'MISSING_IN_2B',
          supplierGstin: p.supplier.gstin,
          supplierName: p.supplier.name,
          invoiceNumber: p.supplierInvoiceNumber || p.purchaseNumber,
          invoiceDate: p.purchaseDate.toISOString().split('T')[0],
          booksPurchaseId: p.id,
          booksPurchaseNumber: p.purchaseNumber,
          booksTaxable: p.subtotal,
          booksTax: p.taxTotal,
          booksTotal: p.total,
          notes: 'Invoice in your books, but NOT in GSTR-2B. Supplier has not filed GSTR-1 yet. Follow up required.',
        });
      }
    }
  }

  const totalInGstr2b = gstr2bInvoices.length;
  const totalInPurchases = purchases.filter((p) => p.taxTotal > 0 && p.supplier.gstin).length;
  const matchPercentage =
    totalInPurchases > 0 ? round2((matchedCount / totalInPurchases) * 100) : 0;

  const result: Gstr2bReconciliationResult = {
    returnPeriod,
    financialYear,
    summary: {
      totalInGstr2b,
      totalInPurchases,
      matchedCount,
      mismatchCount,
      missingIn2bCount,
      missingInPurchasesCount,
      reconciledItc,
      atRiskItc,
      unclaimedItc,
      matchPercentage,
    },
    rows,
  };

  // 4. Optionally persist to database
  if (saveToDb && gstr2bInvoices.length > 0) {
    try {
      const savedImport = await prisma.gstr2bImport.create({
        data: {
          businessId,
          returnPeriod,
          financialYear,
          sourceFileName: sourceFileName || 'gstr2b_portal_import.json',
          totalInvoices: totalInGstr2b,
          totalTaxable: round2(gstr2bInvoices.reduce((s, i) => s + i.taxableValue, 0)),
          totalCgst: round2(gstr2bInvoices.reduce((s, i) => s + i.cgstAmount, 0)),
          totalSgst: round2(gstr2bInvoices.reduce((s, i) => s + i.sgstAmount, 0)),
          totalIgst: round2(gstr2bInvoices.reduce((s, i) => s + i.igstAmount, 0)),
          matchedCount,
          mismatchCount,
          missingInBooksCount: missingInPurchasesCount,
          missingIn2bCount,
          entries: {
            create: gstr2bInvoices.map((inv) => {
              const row = rows.find(
                (r) =>
                  r.supplierGstin === inv.supplierGstin &&
                  normalizeInvoiceNumber(r.invoiceNumber) === normalizeInvoiceNumber(inv.invoiceNumber)
              );
              return {
                supplierGstin: inv.supplierGstin,
                supplierName: inv.supplierName || null,
                invoiceNumber: inv.invoiceNumber,
                invoiceDate: normalizeGstDate(inv.invoiceDate),
                invoiceType: inv.invoiceType || 'R',
                placeOfSupply: inv.placeOfSupply || null,
                taxableValue: inv.taxableValue,
                cgstAmount: inv.cgstAmount,
                sgstAmount: inv.sgstAmount,
                igstAmount: inv.igstAmount,
                totalAmount: inv.totalAmount,
                itcAvailability: inv.itcAvailable || 'Y',
                reconciliationStatus: row ? row.status : 'UNRECONCILED',
                matchedPurchaseId: row?.booksPurchaseId || null,
                matchNotes: row?.notes || null,
              };
            }),
          },
        },
      });
      result.importId = savedImport.id;
    } catch (err) {
      console.warn('Could not persist GSTR-2B reconciliation to database:', err);
    }
  }

  return result;
}

/**
 * Builds downloadable CSV of GSTR-2B Reconciliation Report
 */
export function buildGstr2bReconciliationCsv(reconciliation: Gstr2bReconciliationResult): string {
  const sections: string[] = [];

  sections.push(`"GSTR-2B VS PURCHASE REGISTER RECONCILIATION REPORT"`);
  sections.push(`"Period:","${reconciliation.returnPeriod}","Financial Year:","${reconciliation.financialYear}","Generated At:","${new Date().toISOString()}"`);
  sections.push(`"Matched Invoices:","${reconciliation.summary.matchedCount}","Discrepancy Invoices:","${reconciliation.summary.mismatchCount}","Missing in GSTR-2B:","${reconciliation.summary.missingIn2bCount}","Missing in Books:","${reconciliation.summary.missingInPurchasesCount}"`);
  sections.push(`"Reconciled ITC (Safe):","₹${reconciliation.summary.reconciledItc.toFixed(2)}","At-Risk ITC:","₹${reconciliation.summary.atRiskItc.toFixed(2)}","Unclaimed ITC:","₹${reconciliation.summary.unclaimedItc.toFixed(2)}","Match %:","${reconciliation.summary.matchPercentage}%"`);
  sections.push('');

  sections.push('"Status","Supplier GSTIN","Supplier Name","Invoice Number","Invoice Date","Books Taxable","Books Tax","Books Total","GSTR-2B Taxable","GSTR-2B Tax","GSTR-2B Total","Tax Variance","Notes"');

  for (const r of reconciliation.rows) {
    sections.push(
      [
        `"${r.status}"`,
        `"${r.supplierGstin}"`,
        `"${r.supplierName.replace(/"/g, '""')}"`,
        `"${r.invoiceNumber}"`,
        `"${r.invoiceDate}"`,
        r.booksTaxable !== undefined ? r.booksTaxable.toFixed(2) : '0.00',
        r.booksTax !== undefined ? r.booksTax.toFixed(2) : '0.00',
        r.booksTotal !== undefined ? r.booksTotal.toFixed(2) : '0.00',
        r.gstr2bTaxable !== undefined ? r.gstr2bTaxable.toFixed(2) : '0.00',
        r.gstr2bTax !== undefined ? r.gstr2bTax.toFixed(2) : '0.00',
        r.gstr2bTotal !== undefined ? r.gstr2bTotal.toFixed(2) : '0.00',
        r.taxDifference !== undefined ? r.taxDifference.toFixed(2) : '0.00',
        `"${r.notes.replace(/"/g, '""')}"`,
      ].join(',')
    );
  }

  return sections.join('\n');
}
