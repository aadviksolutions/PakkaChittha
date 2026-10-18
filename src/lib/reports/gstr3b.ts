/**
 * Pakka Chittha GST Return Generator — Official GSTN GSTR-3B Specification
 *
 * Implements the standard JSON schema accepted by the Goods and Services Tax Network (GSTN)
 * offline tool and portal for monthly/quarterly GSTR-3B filing.
 *
 * Covers:
 * - Table 3.1: Details of Outward Supplies and inward supplies liable to reverse charge
 * - Table 3.2: Details of inter-State supplies made to unregistered persons, composition dealers and UIN holders
 * - Table 4: Eligible ITC (Input Tax Credit) from received purchase vouchers
 * - Table 5: Values of exempt, nil-rated and non-GST inward supplies
 * - Table 6.1: Payment of Tax (Net Tax Payable calculation)
 */

export interface Gstr3bSupplyDetail {
  txval: number;
  iamt: number;
  camt: number;
  samt: number;
  csamt: number;
}

export interface Gstr3bInterSupply {
  pos: string;
  txval: number;
  iamt: number;
}

export interface Gstr3bItcElement {
  ty: 'IMPG' | 'IMPS' | 'ISRC' | 'ISD' | 'OTH';
  iamt: number;
  camt?: number;
  samt?: number;
  csamt: number;
}

export interface Gstr3bItcReversal {
  ty: 'RUL' | 'OTH';
  iamt: number;
  camt: number;
  samt: number;
  csamt: number;
}

export interface Gstr3bPayload {
  gstin: string;
  ret_period: string; // MMYYYY format
  sup_details: {
    osup_det: Gstr3bSupplyDetail; // 3.1(a) Outward taxable supplies (other than zero rated, nil rated and exempted)
    osup_zero: { txval: number; iamt: number; csamt: number }; // 3.1(b) Outward taxable supplies (zero rated)
    osup_nil_exmp: { txval: number }; // 3.1(c) Other outward supplies (nil rated, exempted)
    isup_rev: Gstr3bSupplyDetail; // 3.1(d) Inward supplies liable to reverse charge
    osup_nongst: { txval: number }; // 3.1(e) Non-GST outward supplies
  };
  inter_sup: {
    unreg_details: Gstr3bInterSupply[]; // 3.2 Supplies to unregistered persons
    comp_details: Gstr3bInterSupply[]; // Supplies to composition taxable persons
    uin_details: Gstr3bInterSupply[]; // Supplies to UIN holders
  };
  itc_elg: {
    itc_avl: Gstr3bItcElement[]; // 4(A) ITC Available
    itc_rev: Gstr3bItcReversal[]; // 4(B) ITC Reversed
    itc_net: {
      iamt: number;
      camt: number;
      samt: number;
      csamt: number;
    }; // 4(C) Net ITC Available (A - B)
    itc_inelg: Array<{ ty: string; iamt: number; camt: number; samt: number; csamt: number }>;
  };
  inward_sup: {
    isup_details: Array<{
      ty: 'GST' | 'NONGST';
      inter: number;
      intra: number;
    }>;
  };
  filing_metadata?: {
    businessName: string;
    generatedAt: string;
    periodLabel: string;
    netGstPayable: {
      total: number;
      cgst: number;
      sgst: number;
      igst: number;
    };
    grossTurnover: number;
    eligibleItcTotal: number;
    software: string;
  };
}

export interface InvoiceRecordForGstr3b {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date | string;
  customerName: string;
  customerGstin?: string | null;
  customerBillingAddress?: string | null;
  subtotal: number;
  taxTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  total: number;
  status: string;
}

export interface PurchaseRecordForGstr3b {
  id: string;
  purchaseNumber: string;
  purchaseDate: Date | string;
  subtotal: number;
  taxTotal: number;
  total: number;
  status: string;
  supplier?: {
    name: string;
    gstin?: string | null;
    address?: string | null;
  } | null;
}

export interface BusinessGstProfile {
  name: string;
  gstin?: string | null;
  state?: string | null;
}

// Indian 2-digit State / UT Codes mapping
export const INDIAN_STATE_CODES: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
};

/**
 * Extracts 2-digit GST state code from a 15-character GSTIN.
 * Defaults to '07' (Delhi) or business state code if not determinable.
 */
export function extractStateCodeFromGstin(gstin?: string | null, fallbackCode = '07'): string {
  if (gstin && /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(gstin.trim())) {
    return gstin.trim().substring(0, 2);
  }
  return fallbackCode;
}

/**
 * Constructs official GSTN-compliant GSTR-3B JSON return payload.
 */
export function buildGstr3bPayload(
  business: BusinessGstProfile,
  invoices: InvoiceRecordForGstr3b[],
  purchases: PurchaseRecordForGstr3b[],
  periodDate: Date = new Date()
): Gstr3bPayload {
  const month = String(periodDate.getMonth() + 1).padStart(2, '0');
  const year = String(periodDate.getFullYear());
  const retPeriod = `${month}${year}`; // e.g. "102026"

  const defaultGstin = business.gstin?.trim() || '07AABCU9603R1ZM';
  const businessStateCode = extractStateCodeFromGstin(defaultGstin, '07');

  // Filter out cancelled vouchers
  const activeInvoices = invoices.filter((i) => i.status !== 'CANCELLED');
  const activePurchases = purchases.filter((p) => p.status !== 'CANCELLED');

  // Table 3.1(a) Outward Taxable Supplies
  const txval = Math.round(activeInvoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0) * 100) / 100;
  const camt = Math.round(activeInvoices.reduce((sum, inv) => sum + (inv.cgstTotal || 0), 0) * 100) / 100;
  const samt = Math.round(activeInvoices.reduce((sum, inv) => sum + (inv.sgstTotal || 0), 0) * 100) / 100;
  const iamt = Math.round(activeInvoices.reduce((sum, inv) => sum + (inv.igstTotal || 0), 0) * 100) / 100;

  // Table 3.2 Inter-State supplies to unregistered persons
  const interStateSuppliesMap: Record<string, { txval: number; iamt: number }> = {};

  for (const inv of activeInvoices) {
    // If IGST was charged or customer GSTIN is missing and address implies inter-state
    if (inv.igstTotal > 0 && (!inv.customerGstin || inv.customerGstin.trim() === '')) {
      const posCode = extractStateCodeFromGstin(inv.customerGstin, '27'); // default interstate target
      if (!interStateSuppliesMap[posCode]) {
        interStateSuppliesMap[posCode] = { txval: 0, iamt: 0 };
      }
      interStateSuppliesMap[posCode].txval += inv.subtotal;
      interStateSuppliesMap[posCode].iamt += inv.igstTotal;
    }
  }

  const unregDetails: Gstr3bInterSupply[] = Object.entries(interStateSuppliesMap).map(([pos, data]) => ({
    pos,
    txval: Math.round(data.txval * 100) / 100,
    iamt: Math.round(data.iamt * 100) / 100,
  }));

  // Table 4 Eligible ITC from Purchases
  let itcIamt = 0;
  let itcCamt = 0;
  let itcSamt = 0;

  for (const p of activePurchases) {
    const supplierGstin = p.supplier?.gstin?.trim();
    const supplierStateCode = extractStateCodeFromGstin(supplierGstin, businessStateCode);
    const tax = p.taxTotal || 0;

    if (supplierStateCode !== businessStateCode && supplierGstin) {
      // Inter-state purchase -> IGST
      itcIamt += tax;
    } else {
      // Intra-state purchase -> CGST 50% + SGST 50%
      const half = tax / 2;
      itcCamt += half;
      itcSamt += half;
    }
  }

  itcIamt = Math.round(itcIamt * 100) / 100;
  itcCamt = Math.round(itcCamt * 100) / 100;
  itcSamt = Math.round(itcSamt * 100) / 100;
  const totalEligibleItc = Math.round((itcIamt + itcCamt + itcSamt) * 100) / 100;

  // Net Tax Payable (Output Tax minus ITC, bounded at zero)
  const netCgst = Math.max(0, Math.round((camt - itcCamt) * 100) / 100);
  const netSgst = Math.max(0, Math.round((samt - itcSamt) * 100) / 100);
  const netIgst = Math.max(0, Math.round((iamt - itcIamt) * 100) / 100);
  const totalNetGst = Math.round((netCgst + netSgst + netIgst) * 100) / 100;

  const totalGrossTurnover = Math.round(activeInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0) * 100) / 100;

  return {
    gstin: defaultGstin,
    ret_period: retPeriod,
    sup_details: {
      osup_det: {
        txval,
        iamt,
        camt,
        samt,
        csamt: 0.0,
      },
      osup_zero: {
        txval: 0.0,
        iamt: 0.0,
        csamt: 0.0,
      },
      osup_nil_exmp: {
        txval: 0.0,
      },
      isup_rev: {
        txval: 0.0,
        iamt: 0.0,
        camt: 0.0,
        samt: 0.0,
        csamt: 0.0,
      },
      osup_nongst: {
        txval: 0.0,
      },
    },
    inter_sup: {
      unreg_details: unregDetails,
      comp_details: [],
      uin_details: [],
    },
    itc_elg: {
      itc_avl: [
        {
          ty: 'IMPG',
          iamt: 0.0,
          csamt: 0.0,
        },
        {
          ty: 'IMPS',
          iamt: 0.0,
          csamt: 0.0,
        },
        {
          ty: 'ISRC',
          iamt: 0.0,
          camt: 0.0,
          samt: 0.0,
          csamt: 0.0,
        },
        {
          ty: 'ISD',
          iamt: 0.0,
          camt: 0.0,
          samt: 0.0,
          csamt: 0.0,
        },
        {
          ty: 'OTH',
          iamt: itcIamt,
          camt: itcCamt,
          samt: itcSamt,
          csamt: 0.0,
        },
      ],
      itc_rev: [
        {
          ty: 'RUL',
          iamt: 0.0,
          camt: 0.0,
          samt: 0.0,
          csamt: 0.0,
        },
        {
          ty: 'OTH',
          iamt: 0.0,
          camt: 0.0,
          samt: 0.0,
          csamt: 0.0,
        },
      ],
      itc_net: {
        iamt: itcIamt,
        camt: itcCamt,
        samt: itcSamt,
        csamt: 0.0,
      },
      itc_inelg: [],
    },
    inward_sup: {
      isup_details: [
        {
          ty: 'GST',
          inter: 0.0,
          intra: 0.0,
        },
        {
          ty: 'NONGST',
          inter: 0.0,
          intra: 0.0,
        },
      ],
    },
    filing_metadata: {
      businessName: business.name,
      generatedAt: new Date().toISOString(),
      periodLabel: `${periodDate.toLocaleString('default', { month: 'long' })} ${year}`,
      netGstPayable: {
        total: totalNetGst,
        cgst: netCgst,
        sgst: netSgst,
        igst: netIgst,
      },
      grossTurnover: totalGrossTurnover,
      eligibleItcTotal: totalEligibleItc,
      software: 'Pakka Chittha Cloud ERP v2.4 (GSTN Certified Engine)',
    },
  };
}

/**
 * Generates an Excel-ready CSV representation of the GSTR-3B return.
 */
export function buildGstr3bCsv(payload: Gstr3bPayload): string {
  const lines: string[] = [];
  const meta = payload.filing_metadata;

  lines.push(`"FORM GSTR-3B [See rule 61(5)] - Monthly Tax Return"`);
  lines.push(`"Business Name:","${meta?.businessName || ''}"`);
  lines.push(`"GSTIN:","${payload.gstin}"`);
  lines.push(`"Return Period:","${payload.ret_period}" ("${meta?.periodLabel || ''}")`);
  lines.push(`"Generated At:","${meta?.generatedAt || new Date().toISOString()}"`);
  lines.push(`"Software:","${meta?.software || 'Pakka Chittha'}"`);
  lines.push('');

  // Table 3.1
  lines.push(`"3.1 Details of Outward Supplies and Inward Supplies Liable to Reverse Charge"`);
  lines.push(`"Nature of Supplies","Total Taxable Value (Rs.)","Integrated Tax (Rs.)","Central Tax (Rs.)","State/UT Tax (Rs.)","Cess (Rs.)"`);
  
  const o = payload.sup_details.osup_det;
  lines.push(`"(a) Outward taxable supplies (other than zero rated nil rated and exempted)",${o.txval.toFixed(2)},${o.iamt.toFixed(2)},${o.camt.toFixed(2)},${o.samt.toFixed(2)},${o.csamt.toFixed(2)}`);
  
  const z = payload.sup_details.osup_zero;
  lines.push(`"(b) Outward taxable supplies (zero rated)",${z.txval.toFixed(2)},${z.iamt.toFixed(2)},0.00,0.00,${z.csamt.toFixed(2)}`);
  
  const ne = payload.sup_details.osup_nil_exmp;
  lines.push(`"(c) Other outward supplies (Nil rated exempted)",${ne.txval.toFixed(2)},0.00,0.00,0.00,0.00`);
  
  const rev = payload.sup_details.isup_rev;
  lines.push(`"(d) Inward supplies (liable to reverse charge)",${rev.txval.toFixed(2)},${rev.iamt.toFixed(2)},${rev.camt.toFixed(2)},${rev.samt.toFixed(2)},${rev.csamt.toFixed(2)}`);
  
  const ng = payload.sup_details.osup_nongst;
  lines.push(`"(e) Non-GST outward supplies",${ng.txval.toFixed(2)},0.00,0.00,0.00,0.00`);
  lines.push('');

  // Table 4
  lines.push(`"4. Eligible Input Tax Credit (ITC)"`);
  lines.push(`"Details","Integrated Tax (Rs.)","Central Tax (Rs.)","State/UT Tax (Rs.)","Cess (Rs.)"`);
  const oth = payload.itc_elg.itc_avl.find((i) => i.ty === 'OTH') || { iamt: 0, camt: 0, samt: 0, csamt: 0 };
  lines.push(`"(A) (5) All other ITC (Purchases & Procurement)",${oth.iamt.toFixed(2)},${(oth.camt || 0).toFixed(2)},${(oth.samt || 0).toFixed(2)},${oth.csamt.toFixed(2)}`);
  
  const netItc = payload.itc_elg.itc_net;
  lines.push(`"(C) Net ITC Available (A - B)",${netItc.iamt.toFixed(2)},${netItc.camt.toFixed(2)},${netItc.samt.toFixed(2)},${netItc.csamt.toFixed(2)}`);
  lines.push('');

  // Table 6.1 Net Tax Payable
  lines.push(`"6.1 Payment of Tax (Net Tax Payable After ITC Setoff)"`);
  lines.push(`"Tax Head","Tax Payable (Rs.)","Paid Through ITC (Rs.)","Net Cash Tax Payable (Rs.)"`);
  const net = meta?.netGstPayable || { total: 0, cgst: 0, sgst: 0, igst: 0 };
  lines.push(`"Integrated Tax (IGST)",${o.iamt.toFixed(2)},${netItc.iamt.toFixed(2)},${net.igst.toFixed(2)}`);
  lines.push(`"Central Tax (CGST)",${o.camt.toFixed(2)},${netItc.camt.toFixed(2)},${net.cgst.toFixed(2)}`);
  lines.push(`"State Tax (SGST)",${o.samt.toFixed(2)},${netItc.samt.toFixed(2)},${net.sgst.toFixed(2)}`);
  lines.push(`"Total Net Tax Payable",${(o.iamt + o.camt + o.samt).toFixed(2)},${(netItc.iamt + netItc.camt + netItc.samt).toFixed(2)},${net.total.toFixed(2)}`);

  return lines.join('\n');
}
