import prisma from '@/lib/prisma';
import { PaymentMethod } from '@prisma/client';
import {
  buildContactChronologicalLedger,
  ChronologicalLedgerEntry,
  round2,
} from '@/lib/services/khataService';

export type ReportDatePreset =
  | 'ALL'
  | 'TODAY'
  | 'THIS_WEEK'
  | 'THIS_MONTH'
  | 'THIS_YEAR'
  | 'CUSTOM';

export type ReportDirectionFilter = 'ALL' | 'TO_RECEIVE' | 'TO_PAY';
export type ReportAccountStatusFilter = 'OUTSTANDING' | 'SETTLED' | 'ALL';
export type ReportPaymentModeFilter = 'ALL' | PaymentMethod;

export interface KhataReportFiltersInput {
  dateRange?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  search?: string | null;
  mobile?: string | null;
  direction?: string | null;
  paymentMode?: string | null;
  accountStatus?: string | null;
}

export interface ResolvedKhataReportFilters {
  dateRange: ReportDatePreset;
  startDate: string | null;
  endDate: string | null;
  rangeStartIso: string | null;
  rangeEndIso: string | null;
  periodLabel: string;
  search: string;
  mobile: string;
  direction: ReportDirectionFilter;
  paymentMode: ReportPaymentModeFilter;
  accountStatus: ReportAccountStatusFilter;
}

export interface ReceivableRow {
  sNo: number;
  contactId: string;
  personName: string;
  mobileNumber: string;
  totalAmountGiven: number;
  amountReceivedBack: number;
  balanceToReceive: number;
  periodGiven: number;
  periodReceivedBack: number;
  hasPayableAlso: boolean;
  currentPayableBalance: number;
  lastTransactionDate: string | null;
}

export interface PayableRow {
  sNo: number;
  contactId: string;
  personName: string;
  mobileNumber: string;
  totalAmountTaken: number;
  amountReturned: number;
  balanceToPay: number;
  periodTaken: number;
  periodReturned: number;
  hasReceivableAlso: boolean;
  currentReceivableBalance: number;
  lastTransactionDate: string | null;
}

export interface SettledAccountRow {
  sNo: number;
  contactId: string;
  personName: string;
  mobileNumber: string;
  totalGiven: number;
  totalReceivedBack: number;
  totalTaken: number;
  totalReturned: number;
  lastTransactionDate: string | null;
}

export interface ReportTransactionRow {
  id: string;
  contactId: string;
  personName: string;
  mobileNumber: string;
  date: string;
  activityType: ChronologicalLedgerEntry['activityType'];
  activityLabel: string;
  title: string;
  moneyDirection: 'OUT' | 'IN';
  balanceBucket: 'TO_RECEIVE' | 'TO_PAY';
  amount: number;
  paymentMode: PaymentMethod;
  paymentModeLabel: string;
  paymentRef: string | null;
  paymentDetails: string | null;
  notes: string | null;
  previousBalance: number;
  updatedBalance: number;
  previousToReceive: number;
  updatedToReceive: number;
  previousToPay: number;
  updatedToPay: number;
  previousNetBalance: number;
  updatedNetBalance: number;
  transactionId: string | null;
}

export interface KhataConsolidatedReportResult {
  metadata: {
    reportTitle: string;
    reportSubtitle: string;
    referenceNumber: string;
    generatedAt: string;
    generatedAtDisplay: string;
    businessName: string;
    businessPhone: string | null;
    businessEmail: string | null;
    currency: 'INR';
    logoPath: string | null;
  };
  filters: ResolvedKhataReportFilters;
  summary: {
    totalAmountToReceive: number;
    totalAmountToPay: number;
    netPosition: number;
    netPositionStatus: 'NET_RECEIVABLE' | 'NET_PAYABLE' | 'SETTLED';
    netPositionLabel: string;
    totalActiveAccounts: number;
    receivableAccountCount: number;
    payableAccountCount: number;
    dualBalanceAccountCount: number;
    settledAccountCount: number;
    totalMatchedAccounts: number;
  };
  periodSummary: {
    totalGivenInPeriod: number;
    totalReceivedBackInPeriod: number;
    totalTakenInPeriod: number;
    totalReturnedInPeriod: number;
    cashInflowInPeriod: number;
    cashOutflowInPeriod: number;
    transactionCount: number;
  };
  historicalSummary: {
    totalGivenLifetime: number;
    totalReceivedBackLifetime: number;
    totalTakenLifetime: number;
    totalReturnedLifetime: number;
  };
  workspaceLiveTotals: {
    totalAmountToReceive: number;
    totalAmountToPay: number;
    netPosition: number;
    totalActiveAccounts: number;
  };
  amountToReceiveRows: ReceivableRow[];
  amountToPayRows: PayableRow[];
  settledAccounts: SettledAccountRow[];
  transactions: ReportTransactionRow[];
}

export interface KhataPersonDetailedReportResult {
  metadata: KhataConsolidatedReportResult['metadata'];
  filters: ResolvedKhataReportFilters;
  contact: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  };
  summary: {
    totalGiven: number;
    totalTaken: number;
    totalReceivedBack: number;
    totalReturned: number;
    amountToReceive: number;
    amountToPay: number;
    netPosition: number;
    status: 'TO_RECEIVE' | 'TO_PAY' | 'SETTLED';
    statusLabel: string;
  };
  periodSummary: {
    totalGivenInPeriod: number;
    totalReceivedBackInPeriod: number;
    totalTakenInPeriod: number;
    totalReturnedInPeriod: number;
    transactionCount: number;
  };
  transactions: ReportTransactionRow[];
}

const VALID_DATE_PRESETS: ReportDatePreset[] = [
  'ALL',
  'TODAY',
  'THIS_WEEK',
  'THIS_MONTH',
  'THIS_YEAR',
  'CUSTOM',
];

const VALID_DIRECTIONS: ReportDirectionFilter[] = ['ALL', 'TO_RECEIVE', 'TO_PAY'];
const VALID_ACCOUNT_STATUSES: ReportAccountStatusFilter[] = ['OUTSTANDING', 'SETTLED', 'ALL'];
const VALID_PAYMENT_MODES: PaymentMethod[] = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'];

const PAYMENT_MODE_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque',
  OTHER: 'Other',
};

export function formatPaymentModeLabel(mode?: PaymentMethod | string | null): string {
  if (!mode) return 'Cash';
  return PAYMENT_MODE_LABELS[mode as PaymentMethod] || String(mode);
}

/**
 * Formats number in Indian Rupees with standard Indian grouping (e.g. ₹1,25,000.00).
 */
export function formatInr(amount: number, includeSign = false): string {
  const safe = round2(Number.isFinite(amount) ? amount : 0);
  const abs = Math.abs(safe);
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);
  if (safe < 0) return `-₹${formatted}`;
  if (includeSign && safe > 0) return `+₹${formatted}`;
  return `₹${formatted}`;
}

export function formatDateTimeIST(input: string | Date | null | undefined): string {
  if (!input) return '—';
  const d = new Date(input);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDateOnlyIST(input: string | Date | null | undefined): string {
  if (!input) return '—';
  const d = new Date(input);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getIstYmd(date: Date = new Date()): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || '0');
  return { year: get('year'), month: get('month'), day: get('day') };
}

function formatYmd(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseYmdToIstStart(ymd: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    throw new Error(`Invalid date format "${ymd}". Expected YYYY-MM-DD.`);
  }
  const d = new Date(`${ymd}T00:00:00.000+05:30`);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid calendar date "${ymd}".`);
  }
  return d;
}

function parseYmdToIstEnd(ymd: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    throw new Error(`Invalid date format "${ymd}". Expected YYYY-MM-DD.`);
  }
  const d = new Date(`${ymd}T23:59:59.999+05:30`);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid calendar date "${ymd}".`);
  }
  return d;
}

/**
 * Validates and resolves all query/body filters into deterministic IST boundaries and labels.
 */
export function resolveReportFilters(
  input: KhataReportFiltersInput = {},
  referenceNow: Date = new Date()
): ResolvedKhataReportFilters {
  const rawPreset = (input.dateRange || 'ALL').toUpperCase();
  if (!VALID_DATE_PRESETS.includes(rawPreset as ReportDatePreset)) {
    throw new Error(`Invalid dateRange "${input.dateRange}".`);
  }
  const dateRange = rawPreset as ReportDatePreset;

  const rawDirection = (input.direction || 'ALL').toUpperCase();
  if (!VALID_DIRECTIONS.includes(rawDirection as ReportDirectionFilter)) {
    throw new Error(`Invalid direction filter "${input.direction}".`);
  }
  const direction = rawDirection as ReportDirectionFilter;

  const rawStatus = (input.accountStatus || 'OUTSTANDING').toUpperCase();
  if (!VALID_ACCOUNT_STATUSES.includes(rawStatus as ReportAccountStatusFilter)) {
    throw new Error(`Invalid accountStatus filter "${input.accountStatus}".`);
  }
  const accountStatus = rawStatus as ReportAccountStatusFilter;

  const rawMode = (input.paymentMode || 'ALL').toUpperCase();
  if (rawMode !== 'ALL' && !VALID_PAYMENT_MODES.includes(rawMode as PaymentMethod)) {
    throw new Error(`Invalid paymentMode filter "${input.paymentMode}".`);
  }
  const paymentMode = rawMode as ReportPaymentModeFilter;

  const search = (input.search || '').trim();
  const mobile = (input.mobile || '').trim();

  const istToday = getIstYmd(referenceNow);
  const todayStr = formatYmd(istToday.year, istToday.month, istToday.day);

  let startDate: string | null = null;
  let endDate: string | null = null;
  let rangeStart: Date | null = null;
  let rangeEnd: Date | null = null;
  let periodLabel = 'All Time (Complete Ledger)';

  if (dateRange === 'TODAY') {
    startDate = todayStr;
    endDate = todayStr;
    rangeStart = parseYmdToIstStart(startDate);
    rangeEnd = parseYmdToIstEnd(endDate);
    periodLabel = `Today (${formatDateOnlyIST(rangeStart)})`;
  } else if (dateRange === 'THIS_WEEK') {
    // Monday through today/Sunday in IST
    const anchorUtc = new Date(Date.UTC(istToday.year, istToday.month - 1, istToday.day));
    const dayOfWeek = anchorUtc.getUTCDay(); // 0=Sun..6=Sat
    const diffFromMonday = (dayOfWeek + 6) % 7;
    const mondayUtc = new Date(anchorUtc);
    mondayUtc.setUTCDate(anchorUtc.getUTCDate() - diffFromMonday);
    const sundayUtc = new Date(mondayUtc);
    sundayUtc.setUTCDate(mondayUtc.getUTCDate() + 6);

    startDate = formatYmd(
      mondayUtc.getUTCFullYear(),
      mondayUtc.getUTCMonth() + 1,
      mondayUtc.getUTCDate()
    );
    endDate = formatYmd(
      sundayUtc.getUTCFullYear(),
      sundayUtc.getUTCMonth() + 1,
      sundayUtc.getUTCDate()
    );
    rangeStart = parseYmdToIstStart(startDate);
    rangeEnd = parseYmdToIstEnd(endDate);
    periodLabel = `This Week (${formatDateOnlyIST(rangeStart)} - ${formatDateOnlyIST(rangeEnd)})`;
  } else if (dateRange === 'THIS_MONTH') {
    const lastDay = new Date(Date.UTC(istToday.year, istToday.month, 0)).getUTCDate();
    startDate = formatYmd(istToday.year, istToday.month, 1);
    endDate = formatYmd(istToday.year, istToday.month, lastDay);
    rangeStart = parseYmdToIstStart(startDate);
    rangeEnd = parseYmdToIstEnd(endDate);
    const monthName = rangeStart.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'long',
      year: 'numeric',
    });
    periodLabel = `This Month (${monthName})`;
  } else if (dateRange === 'THIS_YEAR') {
    startDate = formatYmd(istToday.year, 1, 1);
    endDate = formatYmd(istToday.year, 12, 31);
    rangeStart = parseYmdToIstStart(startDate);
    rangeEnd = parseYmdToIstEnd(endDate);
    periodLabel = `This Year (${istToday.year})`;
  } else if (dateRange === 'CUSTOM') {
    const rawStart = input.startDate?.trim() || null;
    const rawEnd = input.endDate?.trim() || null;
    if (!rawStart && !rawEnd) {
      throw new Error('Please provide startDate and endDate for custom date range.');
    }
    startDate = rawStart || rawEnd;
    endDate = rawEnd || rawStart;
    if (!startDate || !endDate) {
      throw new Error('Custom date range requires valid dates.');
    }
    rangeStart = parseYmdToIstStart(startDate);
    rangeEnd = parseYmdToIstEnd(endDate);
    if (rangeEnd.getTime() < rangeStart.getTime()) {
      throw new Error('End date cannot be earlier than start date.');
    }
    periodLabel = `Custom Period (${formatDateOnlyIST(rangeStart)} - ${formatDateOnlyIST(rangeEnd)})`;
  }

  return {
    dateRange,
    startDate,
    endDate,
    rangeStartIso: rangeStart ? rangeStart.toISOString() : null,
    rangeEndIso: rangeEnd ? rangeEnd.toISOString() : null,
    periodLabel,
    search,
    mobile,
    direction,
    paymentMode,
    accountStatus,
  };
}

function matchesContactSearch(
  contact: { name: string; phone: string | null },
  search: string,
  mobile: string
): boolean {
  if (mobile) {
    const mobileDigits = mobile.replace(/\D/g, '');
    const phoneDigits = (contact.phone || '').replace(/\D/g, '');
    const rawPhone = (contact.phone || '').toLowerCase();
    if (mobileDigits) {
      if (!phoneDigits.includes(mobileDigits)) return false;
    } else if (!rawPhone.includes(mobile.toLowerCase())) {
      return false;
    }
  }

  if (!search) return true;
  const q = search.toLowerCase();
  const qDigits = search.replace(/\D/g, '');
  const nameMatch = contact.name.toLowerCase().includes(q);
  const phoneRawMatch = (contact.phone || '').toLowerCase().includes(q);
  const phoneDigitsMatch = qDigits
    ? (contact.phone || '').replace(/\D/g, '').includes(qDigits)
    : false;
  return nameMatch || phoneRawMatch || phoneDigitsMatch;
}

function matchesEntryFilters(
  entry: ChronologicalLedgerEntry,
  filters: ResolvedKhataReportFilters
): boolean {
  if (filters.rangeStartIso && filters.rangeEndIso) {
    const t = entry.date.getTime();
    if (t < new Date(filters.rangeStartIso).getTime() || t > new Date(filters.rangeEndIso).getTime()) {
      return false;
    }
  }

  if (filters.paymentMode !== 'ALL' && entry.paymentMode !== filters.paymentMode) {
    return false;
  }

  if (filters.direction === 'TO_RECEIVE' && entry.balanceBucket !== 'TO_RECEIVE') {
    return false;
  }

  if (filters.direction === 'TO_PAY' && entry.balanceBucket !== 'TO_PAY') {
    return false;
  }

  return true;
}

function toReportTransactionRow(
  entry: ChronologicalLedgerEntry
): ReportTransactionRow {
  return {
    id: entry.id,
    contactId: entry.contactId,
    personName: entry.contactName,
    mobileNumber: entry.contactPhone || '—',
    date: entry.date.toISOString(),
    activityType: entry.activityType,
    activityLabel: entry.activityLabel,
    title: entry.title,
    moneyDirection: entry.moneyDirection,
    balanceBucket: entry.balanceBucket,
    amount: entry.amount,
    paymentMode: entry.paymentMode,
    paymentModeLabel: formatPaymentModeLabel(entry.paymentMode),
    paymentRef: entry.paymentRef ?? null,
    paymentDetails: entry.paymentDetails ?? null,
    notes: entry.notes ?? null,
    previousBalance: entry.previousBalance,
    updatedBalance: entry.updatedBalance,
    previousToReceive: entry.previousToReceive,
    updatedToReceive: entry.updatedToReceive,
    previousToPay: entry.previousToPay,
    updatedToPay: entry.updatedToPay,
    previousNetBalance: entry.previousNetBalance,
    updatedNetBalance: entry.updatedNetBalance,
    transactionId: entry.transactionId ?? null,
  };
}

function buildReferenceNumber(prefix: string, now: Date): string {
  const ist = getIstYmd(now);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${prefix}-${ist.year}${String(ist.month).padStart(2, '0')}${String(ist.day).padStart(2, '0')}-${hh}${mm}`;
}

export function sanitizeFileName(raw: string): string {
  return raw
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64) || 'report';
}

/**
 * Generates the single-source-of-truth Consolidated Personal / Free Khata Report.
 * Rules enforced:
 * - Current outstanding Receivable & Payable are computed from COMPLETE ledger history (never date-truncated).
 * - Never auto-offsets Receivable against Payable; contacts with both appear independently in both sections.
 * - Zero-balance settled contacts never appear in Amount to Receive or Amount to Pay tables.
 * - Filters consistently update matched contacts, KPI cards, period summaries, tables, and transactions.
 */
export async function getKhataConsolidatedReport(
  businessId: string,
  filtersInput: KhataReportFiltersInput = {}
): Promise<KhataConsolidatedReportResult> {
  const now = new Date();
  const filters = resolveReportFilters(filtersInput, now);

  const [business, contacts] = await Promise.all([
    prisma.business.findUnique({
      where: { id: businessId },
      select: {
        name: true,
        phone: true,
        email: true,
        logoUrl: true,
      },
    }),
    prisma.khataContact.findMany({
      where: { businessId },
      include: {
        transactions: {
          include: {
            repayments: true,
          },
        },
        repayments: {
          include: {
            transaction: {
              select: { type: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  // Workspace-wide live unfiltered totals for reference/transparency
  let workspaceReceivable = 0;
  let workspacePayable = 0;
  let workspaceActiveAccounts = 0;

  const hasTransactionScopedFilter =
    filters.dateRange !== 'ALL' || filters.paymentMode !== 'ALL';

  const rawReceivables: Omit<ReceivableRow, 'sNo'>[] = [];
  const rawPayables: Omit<PayableRow, 'sNo'>[] = [];
  const rawSettled: Omit<SettledAccountRow, 'sNo'>[] = [];
  const periodTransactions: ReportTransactionRow[] = [];

  let periodGiven = 0;
  let periodReceivedBack = 0;
  let periodTaken = 0;
  let periodReturned = 0;

  let historicalGiven = 0;
  let historicalReceivedBack = 0;
  let historicalTaken = 0;
  let historicalReturned = 0;

  const matchedAccountIds = new Set<string>();
  const activeMatchedAccountIds = new Set<string>();
  const dualBalanceAccountIds = new Set<string>();

  for (const contact of contacts) {
    let contactGiven = 0;
    let contactReceivedBack = 0;
    let contactAmountToReceive = 0;
    let contactTaken = 0;
    let contactReturned = 0;
    let contactAmountToPay = 0;

    for (const tx of contact.transactions) {
      if (tx.type === 'GAVE') {
        contactGiven += tx.amount;
        contactAmountToReceive += tx.balanceAmount;
        for (const r of tx.repayments) {
          contactReceivedBack += r.amount;
        }
      } else {
        contactTaken += tx.amount;
        contactAmountToPay += tx.balanceAmount;
        for (const r of tx.repayments) {
          contactReturned += r.amount;
        }
      }
    }

    contactGiven = round2(contactGiven);
    contactReceivedBack = round2(contactReceivedBack);
    contactAmountToReceive = round2(contactAmountToReceive);
    contactTaken = round2(contactTaken);
    contactReturned = round2(contactReturned);
    contactAmountToPay = round2(contactAmountToPay);

    if (contactAmountToReceive > 0) workspaceReceivable += contactAmountToReceive;
    if (contactAmountToPay > 0) workspacePayable += contactAmountToPay;
    if (contactAmountToReceive > 0 || contactAmountToPay > 0) workspaceActiveAccounts++;

    if (!matchesContactSearch(contact, filters.search, filters.mobile)) {
      continue;
    }

    const isSettled = contactAmountToReceive === 0 && contactAmountToPay === 0;
    const isOutstanding = contactAmountToReceive > 0 || contactAmountToPay > 0;

    if (filters.accountStatus === 'OUTSTANDING' && !isOutstanding) continue;
    if (filters.accountStatus === 'SETTLED' && !isSettled) continue;

    // Direction filter applicability on contact when outstanding
    if (
      filters.direction === 'TO_RECEIVE' &&
      filters.accountStatus !== 'SETTLED' &&
      contactAmountToReceive <= 0
    ) {
      continue;
    }
    if (
      filters.direction === 'TO_PAY' &&
      filters.accountStatus !== 'SETTLED' &&
      contactAmountToPay <= 0
    ) {
      continue;
    }

    const ledgerAsc = buildContactChronologicalLedger(contact);
    const matchedEntries = ledgerAsc.filter((ev) => matchesEntryFilters(ev, filters));

    // When a period or payment-mode filter is active, scope to contacts that participated in matching transactions
    if (hasTransactionScopedFilter && matchedEntries.length === 0) {
      continue;
    }

    matchedAccountIds.add(contact.id);

    // Track period activity specific to this contact
    let cPeriodGiven = 0;
    let cPeriodReceivedBack = 0;
    let cPeriodTaken = 0;
    let cPeriodReturned = 0;

    for (const ev of matchedEntries) {
      if (ev.activityType === 'GAVE_NEW') {
        cPeriodGiven += ev.amount;
        periodGiven += ev.amount;
      } else if (ev.activityType === 'LENT_REPAY') {
        cPeriodReceivedBack += ev.amount;
        periodReceivedBack += ev.amount;
      } else if (ev.activityType === 'RECEIVED_NEW') {
        cPeriodTaken += ev.amount;
        periodTaken += ev.amount;
      } else if (ev.activityType === 'BORROWED_REPAY') {
        cPeriodReturned += ev.amount;
        periodReturned += ev.amount;
      }
      periodTransactions.push(toReportTransactionRow(ev));
    }

    historicalGiven += contactGiven;
    historicalReceivedBack += contactReceivedBack;
    historicalTaken += contactTaken;
    historicalReturned += contactReturned;

    const latestEventDate =
      matchedEntries.length > 0
        ? matchedEntries[matchedEntries.length - 1].date.toISOString()
        : ledgerAsc.length > 0
          ? ledgerAsc[ledgerAsc.length - 1].date.toISOString()
          : null;

    if (isOutstanding) {
      activeMatchedAccountIds.add(contact.id);
    }

    if (contactAmountToReceive > 0 && contactAmountToPay > 0 && filters.direction === 'ALL') {
      dualBalanceAccountIds.add(contact.id);
    }

    if (contactAmountToReceive > 0 && filters.direction !== 'TO_PAY' && filters.accountStatus !== 'SETTLED') {
      rawReceivables.push({
        contactId: contact.id,
        personName: contact.name,
        mobileNumber: contact.phone || '—',
        totalAmountGiven: contactGiven,
        amountReceivedBack: contactReceivedBack,
        balanceToReceive: contactAmountToReceive,
        periodGiven: round2(cPeriodGiven),
        periodReceivedBack: round2(cPeriodReceivedBack),
        hasPayableAlso: contactAmountToPay > 0,
        currentPayableBalance: contactAmountToPay,
        lastTransactionDate: latestEventDate,
      });
    }

    if (contactAmountToPay > 0 && filters.direction !== 'TO_RECEIVE' && filters.accountStatus !== 'SETTLED') {
      rawPayables.push({
        contactId: contact.id,
        personName: contact.name,
        mobileNumber: contact.phone || '—',
        totalAmountTaken: contactTaken,
        amountReturned: contactReturned,
        balanceToPay: contactAmountToPay,
        periodTaken: round2(cPeriodTaken),
        periodReturned: round2(cPeriodReturned),
        hasReceivableAlso: contactAmountToReceive > 0,
        currentReceivableBalance: contactAmountToReceive,
        lastTransactionDate: latestEventDate,
      });
    }

    if (isSettled) {
      rawSettled.push({
        contactId: contact.id,
        personName: contact.name,
        mobileNumber: contact.phone || '—',
        totalGiven: contactGiven,
        totalReceivedBack: contactReceivedBack,
        totalTaken: contactTaken,
        totalReturned: contactReturned,
        lastTransactionDate: latestEventDate,
      });
    }
  }

  // Sort outstanding tables largest balance first for immediate clarity
  rawReceivables.sort((a, b) => b.balanceToReceive - a.balanceToReceive || a.personName.localeCompare(b.personName));
  rawPayables.sort((a, b) => b.balanceToPay - a.balanceToPay || a.personName.localeCompare(b.personName));
  rawSettled.sort((a, b) => a.personName.localeCompare(b.personName));

  // Sort consolidated transaction history newest first
  periodTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const amountToReceiveRows: ReceivableRow[] = rawReceivables.map((row, idx) => ({
    sNo: idx + 1,
    ...row,
  }));

  const amountToPayRows: PayableRow[] = rawPayables.map((row, idx) => ({
    sNo: idx + 1,
    ...row,
  }));

  const settledAccounts: SettledAccountRow[] = rawSettled.map((row, idx) => ({
    sNo: idx + 1,
    ...row,
  }));

  const totalAmountToReceive = round2(
    amountToReceiveRows.reduce((acc, r) => acc + r.balanceToReceive, 0)
  );
  const totalAmountToPay = round2(
    amountToPayRows.reduce((acc, r) => acc + r.balanceToPay, 0)
  );
  const netPosition = round2(totalAmountToReceive - totalAmountToPay);

  let netPositionStatus: 'NET_RECEIVABLE' | 'NET_PAYABLE' | 'SETTLED' = 'SETTLED';
  let netPositionLabel = 'Balanced (हिसाब बराबर)';
  if (netPosition > 0) {
    netPositionStatus = 'NET_RECEIVABLE';
    netPositionLabel = 'Net Receivable (कुल मिलने हैं)';
  } else if (netPosition < 0) {
    netPositionStatus = 'NET_PAYABLE';
    netPositionLabel = 'Net Payable (कुल देने हैं)';
  }

  const totalActiveAccounts =
    filters.accountStatus === 'SETTLED'
      ? settledAccounts.length
      : activeMatchedAccountIds.size;

  const cashInflowInPeriod = round2(periodReceivedBack + periodTaken);
  const cashOutflowInPeriod = round2(periodGiven + periodReturned);

  return {
    metadata: {
      reportTitle: 'Personal Khata Consolidated Statement',
      reportSubtitle: 'LenDen / Pakka Chittha — Accounts Receivable & Payable Report',
      referenceNumber: buildReferenceNumber('LKR', now),
      generatedAt: now.toISOString(),
      generatedAtDisplay: formatDateTimeIST(now),
      businessName: business?.name || 'Personal Khata Workspace',
      businessPhone: business?.phone || null,
      businessEmail: business?.email || null,
      currency: 'INR',
      logoPath: business?.logoUrl || '/pakka-chittha-logo.png',
    },
    filters,
    summary: {
      totalAmountToReceive,
      totalAmountToPay,
      netPosition,
      netPositionStatus,
      netPositionLabel,
      totalActiveAccounts,
      receivableAccountCount: amountToReceiveRows.length,
      payableAccountCount: amountToPayRows.length,
      dualBalanceAccountCount: dualBalanceAccountIds.size,
      settledAccountCount: settledAccounts.length,
      totalMatchedAccounts: matchedAccountIds.size,
    },
    periodSummary: {
      totalGivenInPeriod: round2(periodGiven),
      totalReceivedBackInPeriod: round2(periodReceivedBack),
      totalTakenInPeriod: round2(periodTaken),
      totalReturnedInPeriod: round2(periodReturned),
      cashInflowInPeriod,
      cashOutflowInPeriod,
      transactionCount: periodTransactions.length,
    },
    historicalSummary: {
      totalGivenLifetime: round2(historicalGiven),
      totalReceivedBackLifetime: round2(historicalReceivedBack),
      totalTakenLifetime: round2(historicalTaken),
      totalReturnedLifetime: round2(historicalReturned),
    },
    workspaceLiveTotals: {
      totalAmountToReceive: round2(workspaceReceivable),
      totalAmountToPay: round2(workspacePayable),
      netPosition: round2(workspaceReceivable - workspacePayable),
      totalActiveAccounts: workspaceActiveAccounts,
    },
    amountToReceiveRows,
    amountToPayRows,
    settledAccounts,
    transactions: periodTransactions,
  };
}

/**
 * Generates a single person's detailed ledger report with optional date/payment/direction filters
 * while preserving exact chronological lifetime previous/updated balances on every transaction.
 */
export async function getKhataPersonDetailedReport(
  businessId: string,
  contactId: string,
  filtersInput: KhataReportFiltersInput = {}
): Promise<KhataPersonDetailedReportResult> {
  const now = new Date();
  const filters = resolveReportFilters(
    { ...filtersInput, accountStatus: filtersInput.accountStatus || 'ALL' },
    now
  );

  const [business, contact] = await Promise.all([
    prisma.business.findUnique({
      where: { id: businessId },
      select: {
        name: true,
        phone: true,
        email: true,
        logoUrl: true,
      },
    }),
    prisma.khataContact.findFirst({
      where: { id: contactId, businessId },
      include: {
        transactions: {
          include: {
            repayments: true,
          },
        },
        repayments: {
          include: {
            transaction: {
              select: { type: true },
            },
          },
        },
      },
    }),
  ]);

  if (!contact) {
    throw new Error('Contact not found or access denied.');
  }

  let totalGiven = 0;
  let totalTaken = 0;
  let totalReceivedBack = 0;
  let totalReturned = 0;
  let amountToReceive = 0;
  let amountToPay = 0;

  for (const tx of contact.transactions) {
    if (tx.type === 'GAVE') {
      totalGiven += tx.amount;
      amountToReceive += tx.balanceAmount;
      for (const r of tx.repayments) {
        totalReceivedBack += r.amount;
      }
    } else {
      totalTaken += tx.amount;
      amountToPay += tx.balanceAmount;
      for (const r of tx.repayments) {
        totalReturned += r.amount;
      }
    }
  }

  amountToReceive = round2(amountToReceive);
  amountToPay = round2(amountToPay);
  const netPosition = round2(amountToReceive - amountToPay);

  let status: 'TO_RECEIVE' | 'TO_PAY' | 'SETTLED' = 'SETTLED';
  let statusLabel = 'Balanced (हिसाब पूरा)';
  if (amountToReceive > 0 && amountToPay === 0) {
    status = 'TO_RECEIVE';
    statusLabel = 'Amount to Receive (लेनी है)';
  } else if (amountToPay > 0 && amountToReceive === 0) {
    status = 'TO_PAY';
    statusLabel = 'Amount to Pay (देनी है)';
  } else if (amountToReceive > 0 && amountToPay > 0) {
    status = netPosition >= 0 ? 'TO_RECEIVE' : 'TO_PAY';
    statusLabel = 'Dual Balances (लेनी और देनी दोनों)';
  }

  const ledgerAsc = buildContactChronologicalLedger(contact);
  const filteredAsc = ledgerAsc.filter((ev) => matchesEntryFilters(ev, filters));

  let totalGivenInPeriod = 0;
  let totalReceivedBackInPeriod = 0;
  let totalTakenInPeriod = 0;
  let totalReturnedInPeriod = 0;

  for (const ev of filteredAsc) {
    if (ev.activityType === 'GAVE_NEW') totalGivenInPeriod += ev.amount;
    else if (ev.activityType === 'LENT_REPAY') totalReceivedBackInPeriod += ev.amount;
    else if (ev.activityType === 'RECEIVED_NEW') totalTakenInPeriod += ev.amount;
    else if (ev.activityType === 'BORROWED_REPAY') totalReturnedInPeriod += ev.amount;
  }

  const transactions = filteredAsc.map(toReportTransactionRow).reverse();

  return {
    metadata: {
      reportTitle: `Party Statement — ${contact.name}`,
      reportSubtitle: 'Personal Khata Person-Wise Detailed Statement',
      referenceNumber: buildReferenceNumber('LKP', now),
      generatedAt: now.toISOString(),
      generatedAtDisplay: formatDateTimeIST(now),
      businessName: business?.name || 'Personal Khata Workspace',
      businessPhone: business?.phone || null,
      businessEmail: business?.email || null,
      currency: 'INR',
      logoPath: business?.logoUrl || '/pakka-chittha-logo.png',
    },
    filters,
    contact: {
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      notes: contact.notes,
      createdAt: contact.createdAt.toISOString(),
      updatedAt: contact.updatedAt.toISOString(),
    },
    summary: {
      totalGiven: round2(totalGiven),
      totalTaken: round2(totalTaken),
      totalReceivedBack: round2(totalReceivedBack),
      totalReturned: round2(totalReturned),
      amountToReceive,
      amountToPay,
      netPosition,
      status,
      statusLabel,
    },
    periodSummary: {
      totalGivenInPeriod: round2(totalGivenInPeriod),
      totalReceivedBackInPeriod: round2(totalReceivedBackInPeriod),
      totalTakenInPeriod: round2(totalTakenInPeriod),
      totalReturnedInPeriod: round2(totalReturnedInPeriod),
      transactionCount: transactions.length,
    },
    transactions,
  };
}

/**
 * Generates clean shareable text summary (WhatsApp / Email / Clipboard) for consolidated report.
 */
export function buildConsolidatedShareText(report: KhataConsolidatedReportResult): {
  subject: string;
  text: string;
} {
  const topReceivables = report.amountToReceiveRows
    .slice(0, 8)
    .map((r, i) => `${i + 1}. ${r.personName}: ${formatInr(r.balanceToReceive)}`)
    .join('\n');
  const topPayables = report.amountToPayRows
    .slice(0, 8)
    .map((r, i) => `${i + 1}. ${r.personName}: ${formatInr(r.balanceToPay)}`)
    .join('\n');

  const lines: string[] = [
    `*${report.metadata.businessName} — Personal Khata Report*`,
    `Generated: ${report.metadata.generatedAtDisplay}`,
    `Period: ${report.filters.periodLabel}`,
    `Ref: ${report.metadata.referenceNumber}`,
    '',
    `कुल मिलने वाली रकम (To Receive): ${formatInr(report.summary.totalAmountToReceive)}`,
    `कुल देने वाली रकम (To Pay): ${formatInr(report.summary.totalAmountToPay)}`,
    `मेरी वर्तमान स्थिति (Net Position): ${formatInr(report.summary.netPosition, true)}`,
    `सक्रिय हिसाब (Active Accounts): ${report.summary.totalActiveAccounts}`,
  ];

  if (report.amountToReceiveRows.length > 0) {
    lines.push('', '*किससे रकम लेनी है (Amount to Receive):*', topReceivables);
    if (report.amountToReceiveRows.length > 8) {
      lines.push(`... +${report.amountToReceiveRows.length - 8} more accounts`);
    }
  }

  if (report.amountToPayRows.length > 0) {
    lines.push('', '*किसको रकम देनी है (Amount to Pay):*', topPayables);
    if (report.amountToPayRows.length > 8) {
      lines.push(`... +${report.amountToPayRows.length - 8} more accounts`);
    }
  }

  lines.push('', 'Generated via Pakka Chittha / LenDen');

  return {
    subject: `${report.metadata.businessName} — Personal Khata Report (${report.filters.periodLabel})`,
    text: lines.join('\n'),
  };
}

export function buildPersonShareText(report: KhataPersonDetailedReportResult): {
  subject: string;
  text: string;
} {
  const lines = [
    `*${report.metadata.businessName} — Party Statement: ${report.contact.name}*`,
    report.contact.phone ? `Mobile: ${report.contact.phone}` : '',
    `Generated: ${report.metadata.generatedAtDisplay}`,
    `Period: ${report.filters.periodLabel}`,
    '',
    `Current Amount to Receive (लेनी है): ${formatInr(report.summary.amountToReceive)}`,
    `Current Amount to Pay (देनी है): ${formatInr(report.summary.amountToPay)}`,
    `Net Position (वर्तमान स्थिति): ${formatInr(report.summary.netPosition, true)}`,
    '',
    `Lifetime Given: ${formatInr(report.summary.totalGiven)} | Received Back: ${formatInr(report.summary.totalReceivedBack)}`,
    `Lifetime Taken: ${formatInr(report.summary.totalTaken)} | Returned: ${formatInr(report.summary.totalReturned)}`,
    `Transactions Shown: ${report.transactions.length}`,
    '',
    'Generated via Pakka Chittha / LenDen',
  ].filter(Boolean);

  return {
    subject: `${report.contact.name} — Khata Statement (${report.metadata.businessName})`,
    text: lines.join('\n'),
  };
}

