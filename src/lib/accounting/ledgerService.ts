import {
  AccountingGroupType,
  Ledger,
  LedgerNature,
  Prisma,
  VoucherStatus,
  VoucherType,
} from '@prisma/client';
import prisma from '@/lib/prisma';

type DbClient = Prisma.TransactionClient | typeof prisma;

export function toDecimal2(value: Prisma.Decimal | number | string): Prisma.Decimal {
  return new Prisma.Decimal(value).toDecimalPlaces(2);
}

export interface LedgerStatementEntry {
  entryId: string;
  voucherId: string;
  voucherNumber: string;
  voucherType: VoucherType;
  voucherDate: string;
  narration: string | null;
  entryNarration: string | null;
  debitAmount: string;
  creditAmount: string;
  runningBalance: string;
  runningBalanceType: 'DR' | 'CR';
}

export interface LedgerStatement {
  ledger: {
    id: string;
    name: string;
    code: string | null;
    nature: LedgerNature;
    groupId: string;
    groupName: string;
    groupType: AccountingGroupType;
    openingBalance: string;
    openingBalanceType: 'DR' | 'CR';
  };
  fyCode: string;
  openingBalance: string;
  openingBalanceType: 'DR' | 'CR';
  openingDr: string;
  openingCr: string;
  periodDebitTotal: string;
  periodCreditTotal: string;
  closingBalance: string;
  closingBalanceType: 'DR' | 'CR';
  entries: LedgerStatementEntry[];
}

export interface TrialBalanceRow {
  ledgerId: string;
  ledgerName: string;
  ledgerCode: string | null;
  nature: LedgerNature;
  groupId: string;
  groupName: string;
  groupType: AccountingGroupType;
  openingDr: string;
  openingCr: string;
  periodDr: string;
  periodCr: string;
  closingDr: string;
  closingCr: string;
}

export interface TrialBalanceReport {
  fyCode: string;
  branchId: string | null;
  rows: TrialBalanceRow[];
  totals: {
    openingDr: string;
    openingCr: string;
    periodDr: string;
    periodCr: string;
    closingDr: string;
    closingCr: string;
    isBalanced: boolean;
  };
}

/**
 * Signed balance helper: positive = net DR, negative = net CR.
 */
function formatSignedDrCr(netDrMinusCr: Prisma.Decimal): {
  amount: Prisma.Decimal;
  type: 'DR' | 'CR';
} {
  if (netDrMinusCr.gte(0)) {
    return { amount: netDrMinusCr.toDecimalPlaces(2), type: 'DR' };
  }
  return { amount: netDrMinusCr.abs().toDecimalPlaces(2), type: 'CR' };
}

/**
 * Looks up a system/coded ledger for a business.
 */
export async function getSystemLedger(
  businessId: string,
  code: string,
  client: DbClient = prisma
): Promise<Ledger | null> {
  return client.ledger.findUnique({
    where: {
      businessId_code: {
        businessId,
        code,
      },
    },
  });
}

/**
 * Atomically updates (or initializes) a LedgerBalance record for a specific ledger + FY.
 */
export async function updateLedgerBalance(
  ledgerId: string,
  businessId: string,
  fyCode: string,
  debitDelta: Prisma.Decimal | number | string,
  creditDelta: Prisma.Decimal | number | string,
  tx: Prisma.TransactionClient
): Promise<void> {
  const dr = toDecimal2(debitDelta);
  const cr = toDecimal2(creditDelta);

  const ledger = await tx.ledger.findFirst({
    where: { id: ledgerId, businessId },
    select: { openingBalance: true, openingBalanceType: true },
  });

  const openingDr =
    ledger && ledger.openingBalanceType === 'DR'
      ? toDecimal2(ledger.openingBalance)
      : new Prisma.Decimal(0);
  const openingCr =
    ledger && ledger.openingBalanceType === 'CR'
      ? toDecimal2(ledger.openingBalance)
      : new Prisma.Decimal(0);

  await tx.ledgerBalance.upsert({
    where: {
      ledgerId_fyCode: {
        ledgerId,
        fyCode,
      },
    },
    create: {
      businessId,
      ledgerId,
      fyCode,
      openingDr,
      openingCr,
      totalDr: dr,
      totalCr: cr,
    },
    update: {
      totalDr: { increment: dr },
      totalCr: { increment: cr },
    },
  });
}

/**
 * Returns complete Ledger Statement with opening balance, chronological entries,
 * running Dr/Cr balance, and closing balance.
 */
export async function getLedgerStatement(
  ledgerId: string,
  fyCode: string,
  options?: {
    businessId?: string;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<LedgerStatement> {
  const ledger = await prisma.ledger.findFirst({
    where: {
      id: ledgerId,
      ...(options?.businessId ? { businessId: options.businessId } : {}),
    },
    include: {
      group: {
        select: { id: true, name: true, type: true },
      },
    },
  });

  if (!ledger) {
    throw new Error('Ledger not found.');
  }

  let netSigned =
    ledger.openingBalanceType === 'DR'
      ? toDecimal2(ledger.openingBalance)
      : toDecimal2(ledger.openingBalance).negated();

  // If a startDate filter is given, roll forward all POSTED entries in this FY strictly before startDate
  if (options?.startDate) {
    const priorAgg = await prisma.voucherEntry.aggregate({
      where: {
        ledgerId: ledger.id,
        voucher: {
          businessId: ledger.businessId,
          fyCode,
          status: VoucherStatus.POSTED,
          voucherDate: { lt: options.startDate },
        },
      },
      _sum: {
        debitAmount: true,
        creditAmount: true,
      },
    });
    const priorDr = priorAgg._sum.debitAmount
      ? toDecimal2(priorAgg._sum.debitAmount)
      : new Prisma.Decimal(0);
    const priorCr = priorAgg._sum.creditAmount
      ? toDecimal2(priorAgg._sum.creditAmount)
      : new Prisma.Decimal(0);
    netSigned = netSigned.plus(priorDr).minus(priorCr);
  }

  const openingFormatted = formatSignedDrCr(netSigned);

  const dateFilter: Prisma.DateTimeFilter = {};
  if (options?.startDate) dateFilter.gte = options.startDate;
  if (options?.endDate) dateFilter.lte = options.endDate;

  const rawEntries = await prisma.voucherEntry.findMany({
    where: {
      ledgerId: ledger.id,
      voucher: {
        businessId: ledger.businessId,
        fyCode,
        status: VoucherStatus.POSTED,
        ...(options?.startDate || options?.endDate ? { voucherDate: dateFilter } : {}),
      },
    },
    include: {
      voucher: {
        select: {
          id: true,
          voucherNumber: true,
          voucherType: true,
          voucherDate: true,
          narration: true,
          createdAt: true,
        },
      },
    },
    orderBy: [
      { voucher: { voucherDate: 'asc' } },
      { voucher: { createdAt: 'asc' } },
      { sortOrder: 'asc' },
    ],
  });

  let periodDr = new Prisma.Decimal(0);
  let periodCr = new Prisma.Decimal(0);
  let runningSigned = netSigned;

  const entries: LedgerStatementEntry[] = rawEntries.map((entry) => {
    const dr = toDecimal2(entry.debitAmount);
    const cr = toDecimal2(entry.creditAmount);
    periodDr = periodDr.plus(dr);
    periodCr = periodCr.plus(cr);
    runningSigned = runningSigned.plus(dr).minus(cr);
    const running = formatSignedDrCr(runningSigned);

    return {
      entryId: entry.id,
      voucherId: entry.voucher.id,
      voucherNumber: entry.voucher.voucherNumber,
      voucherType: entry.voucher.voucherType,
      voucherDate: entry.voucher.voucherDate.toISOString().slice(0, 10),
      narration: entry.voucher.narration,
      entryNarration: entry.narration,
      debitAmount: dr.toFixed(2),
      creditAmount: cr.toFixed(2),
      runningBalance: running.amount.toFixed(2),
      runningBalanceType: running.type,
    };
  });

  const closingFormatted = formatSignedDrCr(runningSigned);

  return {
    ledger: {
      id: ledger.id,
      name: ledger.name,
      code: ledger.code,
      nature: ledger.nature,
      groupId: ledger.group.id,
      groupName: ledger.group.name,
      groupType: ledger.group.type,
      openingBalance: toDecimal2(ledger.openingBalance).toFixed(2),
      openingBalanceType: ledger.openingBalanceType === 'CR' ? 'CR' : 'DR',
    },
    fyCode,
    openingBalance: openingFormatted.amount.toFixed(2),
    openingBalanceType: openingFormatted.type,
    openingDr: openingFormatted.type === 'DR' ? openingFormatted.amount.toFixed(2) : '0.00',
    openingCr: openingFormatted.type === 'CR' ? openingFormatted.amount.toFixed(2) : '0.00',
    periodDebitTotal: periodDr.toFixed(2),
    periodCreditTotal: periodCr.toFixed(2),
    closingBalance: closingFormatted.amount.toFixed(2),
    closingBalanceType: closingFormatted.type,
    entries,
  };
}

/**
 * Generates a double-entry verified Trial Balance for a business & financial year.
 * Aggregates directly from POSTED VoucherEntries + Ledger opening balances so branch
 * filtering and real-time accuracy are guaranteed.
 */
export async function getTrialBalance(
  businessId: string,
  fyCode: string,
  branchId?: string
): Promise<TrialBalanceReport> {
  const effectiveBranchId = branchId && branchId !== 'ALL' ? branchId : null;

  const [ledgers, groupedEntries] = await Promise.all([
    prisma.ledger.findMany({
      where: { businessId, isActive: true },
      include: {
        group: {
          select: { id: true, name: true, type: true, sortOrder: true },
        },
      },
      orderBy: [{ group: { sortOrder: 'asc' } }, { name: 'asc' }],
    }),
    prisma.voucherEntry.groupBy({
      by: ['ledgerId'],
      where: {
        voucher: {
          businessId,
          fyCode,
          status: VoucherStatus.POSTED,
          ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
        },
      },
      _sum: {
        debitAmount: true,
        creditAmount: true,
      },
    }),
  ]);

  const movementMap = new Map<string, { dr: Prisma.Decimal; cr: Prisma.Decimal }>();
  for (const row of groupedEntries) {
    movementMap.set(row.ledgerId, {
      dr: row._sum.debitAmount ? toDecimal2(row._sum.debitAmount) : new Prisma.Decimal(0),
      cr: row._sum.creditAmount ? toDecimal2(row._sum.creditAmount) : new Prisma.Decimal(0),
    });
  }

  let sumOpeningDr = new Prisma.Decimal(0);
  let sumOpeningCr = new Prisma.Decimal(0);
  let sumPeriodDr = new Prisma.Decimal(0);
  let sumPeriodCr = new Prisma.Decimal(0);
  let sumClosingDr = new Prisma.Decimal(0);
  let sumClosingCr = new Prisma.Decimal(0);

  const rows: TrialBalanceRow[] = ledgers.map((ledger) => {
    const openBal = toDecimal2(ledger.openingBalance);
    const openingDr =
      !effectiveBranchId && ledger.openingBalanceType === 'DR'
        ? openBal
        : new Prisma.Decimal(0);
    const openingCr =
      !effectiveBranchId && ledger.openingBalanceType === 'CR'
        ? openBal
        : new Prisma.Decimal(0);

    const mov = movementMap.get(ledger.id) ?? {
      dr: new Prisma.Decimal(0),
      cr: new Prisma.Decimal(0),
    };

    const net = openingDr.minus(openingCr).plus(mov.dr).minus(mov.cr);
    const closingDr = net.gt(0) ? net.toDecimalPlaces(2) : new Prisma.Decimal(0);
    const closingCr = net.lt(0) ? net.abs().toDecimalPlaces(2) : new Prisma.Decimal(0);

    sumOpeningDr = sumOpeningDr.plus(openingDr);
    sumOpeningCr = sumOpeningCr.plus(openingCr);
    sumPeriodDr = sumPeriodDr.plus(mov.dr);
    sumPeriodCr = sumPeriodCr.plus(mov.cr);
    sumClosingDr = sumClosingDr.plus(closingDr);
    sumClosingCr = sumClosingCr.plus(closingCr);

    return {
      ledgerId: ledger.id,
      ledgerName: ledger.name,
      ledgerCode: ledger.code,
      nature: ledger.nature,
      groupId: ledger.group.id,
      groupName: ledger.group.name,
      groupType: ledger.group.type,
      openingDr: openingDr.toFixed(2),
      openingCr: openingCr.toFixed(2),
      periodDr: mov.dr.toFixed(2),
      periodCr: mov.cr.toFixed(2),
      closingDr: closingDr.toFixed(2),
      closingCr: closingCr.toFixed(2),
    };
  });

  const isBalanced =
    sumPeriodDr.toFixed(2) === sumPeriodCr.toFixed(2) &&
    sumClosingDr.toFixed(2) === sumClosingCr.toFixed(2);

  return {
    fyCode,
    branchId: effectiveBranchId,
    rows,
    totals: {
      openingDr: sumOpeningDr.toFixed(2),
      openingCr: sumOpeningCr.toFixed(2),
      periodDr: sumPeriodDr.toFixed(2),
      periodCr: sumPeriodCr.toFixed(2),
      closingDr: sumClosingDr.toFixed(2),
      closingCr: sumClosingCr.toFixed(2),
      isBalanced,
    },
  };
}

