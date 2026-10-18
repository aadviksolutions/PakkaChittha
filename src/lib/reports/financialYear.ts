/**
 * Indian Financial Year & GST Period Utilities
 * 
 * In India, the Financial Year (FY) runs from April 1 to March 31.
 * Return periods are formatted as MMYYYY (e.g., '102026' for October 2026).
 */

export interface DateFilterRange {
  startDate: Date;
  endDate: Date;
  label: string;
  financialYear: string;
  periodType: 'FY' | 'QUARTER' | 'MONTH' | 'CUSTOM';
  periodValue?: string;
}

export interface IndianState {
  code: string; // 2-digit GST state code e.g. "22"
  name: string; // e.g. "Chhattisgarh"
}

export const INDIAN_GST_STATES: IndianState[] = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '28', name: 'Andhra Pradesh (Old)' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' },
];

/**
 * Extracts 2-digit GST state code from a 15-character GSTIN.
 * Returns null if GSTIN is invalid or too short.
 */
export function getStateCodeFromGstin(gstin?: string | null): string | null {
  if (!gstin) return null;
  const cleaned = gstin.trim().toUpperCase();
  if (cleaned.length >= 2 && /^\d{2}/.test(cleaned)) {
    return cleaned.slice(0, 2);
  }
  return null;
}

/**
 * Resolves State Name from 2-digit GST state code or state name string.
 */
export function getStateName(stateCodeOrName?: string | null): string {
  if (!stateCodeOrName) return 'Other';
  const trimmed = stateCodeOrName.trim();
  const found = INDIAN_GST_STATES.find(
    (s) => s.code === trimmed || s.name.toLowerCase() === trimmed.toLowerCase()
  );
  return found ? found.name : stateCodeOrName;
}

/**
 * Resolves 2-digit state code from state name or code.
 */
export function getStateCode(stateCodeOrName?: string | null): string {
  if (!stateCodeOrName) return '97';
  const trimmed = stateCodeOrName.trim();
  const byCode = INDIAN_GST_STATES.find((s) => s.code === trimmed);
  if (byCode) return byCode.code;
  const byName = INDIAN_GST_STATES.find(
    (s) => s.name.toLowerCase() === trimmed.toLowerCase()
  );
  return byName ? byName.code : '97';
}

/**
 * Determines whether supply is intra-state (CGST + SGST) or inter-state (IGST).
 * Compares Supplier/Business GSTIN or State with Recipient GSTIN or Place of Supply.
 */
export function isInterStateSupply(params: {
  businessGstin?: string | null;
  businessState?: string | null;
  customerGstin?: string | null;
  customerState?: string | null;
  placeOfSupply?: string | null;
}): boolean {
  const originCode =
    getStateCodeFromGstin(params.businessGstin) ||
    getStateCode(params.businessState);

  const destCode =
    getStateCode(params.placeOfSupply) ||
    getStateCodeFromGstin(params.customerGstin) ||
    getStateCode(params.customerState);

  if (!originCode || !destCode) return false;
  return originCode !== destCode;
}

/**
 * Returns current Indian Financial Year string (e.g. "2026-2027")
 */
export function getCurrentFinancialYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed: 0 = Jan, 3 = Apr
  if (month >= 3) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
}

/**
 * Returns list of recent Indian Financial Years for selection dropdowns.
 */
export function getAvailableFinancialYears(): string[] {
  const current = getCurrentFinancialYear();
  const startYear = parseInt(current.split('-')[0], 10);
  return [
    `${startYear + 1}-${startYear + 2}`,
    `${startYear}-${startYear + 1}`,
    `${startYear - 1}-${startYear}`,
    `${startYear - 2}-${startYear - 1}`,
  ];
}

/**
 * Parses user period filter into concrete Date boundaries for Prisma queries.
 */
export function resolveDateFilterRange(params: {
  financialYear?: string | null;
  periodType?: 'FY' | 'QUARTER' | 'MONTH' | 'CUSTOM' | null;
  periodValue?: string | null; // Quarter 'Q1'..'Q4' or Month '1'..'12'
  startDate?: string | null;
  endDate?: string | null;
}): DateFilterRange {
  const fy = params.financialYear?.trim() || getCurrentFinancialYear();
  const [startYearStr, endYearStr] = fy.split('-');
  const startYear = parseInt(startYearStr, 10) || 2026;
  const endYear = parseInt(endYearStr, 10) || startYear + 1;

  const periodType = params.periodType || 'FY';
  const periodVal = params.periodValue || '1';

  if (periodType === 'CUSTOM' && params.startDate && params.endDate) {
    const s = new Date(params.startDate);
    s.setHours(0, 0, 0, 0);
    const e = new Date(params.endDate);
    e.setHours(23, 59, 59, 999);
    return {
      startDate: s,
      endDate: e,
      label: `${s.toISOString().split('T')[0]} to ${e.toISOString().split('T')[0]}`,
      financialYear: fy,
      periodType: 'CUSTOM',
    };
  }

  if (periodType === 'MONTH') {
    const m = parseInt(periodVal, 10); // 1 = April (in FY), 12 = March
    // We map 1..12 where 1 = Jan or 1..12 calendar month
    // Let's support calendar month: month 1 = Jan, month 12 = Dec
    let targetYear = startYear;
    let calendarMonth = parseInt(periodVal, 10) - 1; // 0-indexed
    if (isNaN(calendarMonth) || calendarMonth < 0 || calendarMonth > 11) {
      calendarMonth = 3; // default April
    }
    // In Indian FY, Jan(0), Feb(1), Mar(2) belong to endYear
    if (calendarMonth >= 0 && calendarMonth <= 2) {
      targetYear = endYear;
    } else {
      targetYear = startYear;
    }

    const start = new Date(targetYear, calendarMonth, 1, 0, 0, 0, 0);
    const end = new Date(targetYear, calendarMonth + 1, 0, 23, 59, 59, 999);
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return {
      startDate: start,
      endDate: end,
      label: `${monthNames[calendarMonth]} ${targetYear}`,
      financialYear: fy,
      periodType: 'MONTH',
      periodValue: String(calendarMonth + 1),
    };
  }

  if (periodType === 'QUARTER') {
    let startM = 3; // Apr
    let endM = 5;   // Jun
    let qYear = startYear;
    let qLabel = 'Q1 (Apr - Jun)';

    if (periodVal === 'Q2') {
      startM = 6;
      endM = 8;
      qYear = startYear;
      qLabel = 'Q2 (Jul - Sep)';
    } else if (periodVal === 'Q3') {
      startM = 9;
      endM = 11;
      qYear = startYear;
      qLabel = 'Q3 (Oct - Dec)';
    } else if (periodVal === 'Q4') {
      startM = 0;
      endM = 2;
      qYear = endYear;
      qLabel = 'Q4 (Jan - Mar)';
    }

    const start = new Date(qYear, startM, 1, 0, 0, 0, 0);
    const end = new Date(qYear, endM + 1, 0, 23, 59, 59, 999);
    return {
      startDate: start,
      endDate: end,
      label: `${qLabel} ${fy}`,
      financialYear: fy,
      periodType: 'QUARTER',
      periodValue: periodVal,
    };
  }

  // Entire Financial Year (April 1 to March 31)
  const start = new Date(startYear, 3, 1, 0, 0, 0, 0);
  const end = new Date(endYear, 3, 0, 23, 59, 59, 999);
  return {
    startDate: start,
    endDate: end,
    label: `FY ${fy} (Full Year)`,
    financialYear: fy,
    periodType: 'FY',
  };
}
