/**
 * Indian Financial Year (April 1 - March 31) utilities for multi-FY accountant workspaces.
 */

export interface IndianFyWindow {
  code: string; // e.g. "2026-2027"
  label: string; // e.g. "FY 2026-27"
  startYear: number;
  startDate: Date;
  endDate: Date;
}

export function getIndianFyStartYear(referenceDate: Date = new Date()): number {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth(); // 0 = Jan, 3 = Apr
  return month >= 3 ? year : year - 1;
}

export function buildIndianFyWindow(startYear: number): IndianFyWindow {
  const endYear = startYear + 1;
  const code = `${startYear}-${endYear}`;
  const label = `FY ${startYear}-${String(endYear).slice(-2)}`;
  const startDate = new Date(Date.UTC(startYear, 3, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(endYear, 2, 31, 23, 59, 59, 999));
  return { code, label, startYear, startDate, endDate };
}

export function parseIndianFyCode(code: string | null | undefined): IndianFyWindow {
  if (code && /^\d{4}-\d{4}$/.test(code.trim())) {
    const [startStr, endStr] = code.trim().split('-');
    const startYear = Number(startStr);
    const endYear = Number(endStr);
    if (Number.isInteger(startYear) && endYear === startYear + 1 && startYear >= 2000 && startYear <= 2100) {
      return buildIndianFyWindow(startYear);
    }
  }
  return buildIndianFyWindow(getIndianFyStartYear());
}

export function getDefaultIndianFyList(referenceDate: Date = new Date()): IndianFyWindow[] {
  const currentStart = getIndianFyStartYear(referenceDate);
  return [
    buildIndianFyWindow(currentStart),
    buildIndianFyWindow(currentStart - 1),
  ];
}

export interface GstFilingDeadlineItem {
  returnType: 'GSTR-1' | 'GSTR-3B' | 'GSTR-9' | 'TDS-Challan';
  periodLabel: string;
  dueDate: string; // ISO YYYY-MM-DD
  statusHint: 'UPCOMING' | 'DUE_SOON' | 'OVERDUE';
  daysRemaining: number;
}

/**
 * Computes real calendar statutory GST/TDS deadlines around the reference date for an FY window.
 * Never claims returns are filed unless matched against actual return status.
 */
export function computeUpcomingStatutoryDeadlines(
  fyCode: string,
  referenceDate: Date = new Date()
): GstFilingDeadlineItem[] {
  const fy = parseIndianFyCode(fyCode);
  const refTime = referenceDate.getTime();
  // Determine tax period month inside FY to build next upcoming statutory dates
  const effectiveDate =
    refTime < fy.startDate.getTime()
      ? fy.startDate
      : refTime > fy.endDate.getTime()
        ? fy.endDate
        : referenceDate;

  const taxYear = effectiveDate.getUTCFullYear();
  const taxMonth = effectiveDate.getUTCMonth(); // 0-11
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Previous month return (often due this month) + current month return (due next month)
  const prevMonthDate = new Date(Date.UTC(taxYear, taxMonth - 1, 1));
  const curMonthDate = new Date(Date.UTC(taxYear, taxMonth, 1));
  const nextMonthDate = new Date(Date.UTC(taxYear, taxMonth + 1, 1));

  const formatDate = (d: Date) => d.toISOString().slice(0, 10);
  const diffDays = (due: Date) => Math.ceil((due.getTime() - refTime) / (1000 * 60 * 60 * 24));
  const classify = (days: number): 'UPCOMING' | 'DUE_SOON' | 'OVERDUE' =>
    days < 0 ? 'OVERDUE' : days <= 7 ? 'DUE_SOON' : 'UPCOMING';

  const gstr1PrevDue = new Date(Date.UTC(curMonthDate.getUTCFullYear(), curMonthDate.getUTCMonth(), 11));
  const gstr3bPrevDue = new Date(Date.UTC(curMonthDate.getUTCFullYear(), curMonthDate.getUTCMonth(), 20));
  const tdsPrevDue = new Date(Date.UTC(curMonthDate.getUTCFullYear(), curMonthDate.getUTCMonth(), 7));
  const gstr1NextDue = new Date(Date.UTC(nextMonthDate.getUTCFullYear(), nextMonthDate.getUTCMonth(), 11));
  const gstr3bNextDue = new Date(Date.UTC(nextMonthDate.getUTCFullYear(), nextMonthDate.getUTCMonth(), 20));

  const prevLabel = `${monthNames[prevMonthDate.getUTCMonth()]} ${prevMonthDate.getUTCFullYear()}`;
  const curLabel = `${monthNames[curMonthDate.getUTCMonth()]} ${curMonthDate.getUTCFullYear()}`;

  const raw: Array<{ returnType: GstFilingDeadlineItem['returnType']; periodLabel: string; due: Date }> = [
    { returnType: 'TDS-Challan', periodLabel: prevLabel, due: tdsPrevDue },
    { returnType: 'GSTR-1', periodLabel: prevLabel, due: gstr1PrevDue },
    { returnType: 'GSTR-3B', periodLabel: prevLabel, due: gstr3bPrevDue },
    { returnType: 'GSTR-1', periodLabel: curLabel, due: gstr1NextDue },
    { returnType: 'GSTR-3B', periodLabel: curLabel, due: gstr3bNextDue },
    {
      returnType: 'GSTR-9',
      periodLabel: fy.label,
      due: new Date(Date.UTC(fy.startYear + 1, 11, 31)), // Dec 31 after FY close
    },
  ];

  return raw
    .map((item) => {
      const days = diffDays(item.due);
      return {
        returnType: item.returnType,
        periodLabel: item.periodLabel,
        dueDate: formatDate(item.due),
        statusHint: classify(days),
        daysRemaining: days,
      };
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

