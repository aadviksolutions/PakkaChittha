import {
  AccountingGroupType,
  Prisma,
  VoucherStatus,
  VoucherType,
} from '@prisma/client';
import prisma from '@/lib/prisma';
import { parseIndianFyCode } from '@/lib/rbac/fiscalYear';
import { isOwnerRole } from '@/lib/rbac/roles';
import { recordAuditEvent } from '@/lib/rbac/auditService';
import { SYSTEM_LEDGER_CODES, ensureBusinessCOA } from './chartOfAccounts';
import { getSystemLedger, getTrialBalance, toDecimal2, updateLedgerBalance } from './ledgerService';
import { computeProfitAndLossFromTrialBalance } from './financialStatements';
import { VoucherEntryInput, generateNextVoucherNumber, validateVoucherBalance } from './voucherEngine';

export interface ClosingPreview {
  fyCode: string;
  label: string;
  startDate: string;
  endDate: string;
  isClosed: boolean;
  lockedUntil: string | null;
  draftVoucherCount: number;
  postedVoucherCount: number;
  trialBalanceBalanced: boolean;
  netProfitOrLoss: string;
  closingEntriesCount: number;
}

export async function getClosingPreview(
  businessId: string,
  fyCodeParam?: string | null
): Promise<ClosingPreview> {
  const fyWindow = parseIndianFyCode(fyCodeParam);

  const existingCount = await prisma.ledger.count({ where: { businessId } });
  if (existingCount === 0) {
    await ensureBusinessCOA(businessId, fyWindow.code);
  }

  const [fyRow, draftCount, postedCount, tb] = await Promise.all([
    prisma.financialYear.findUnique({
      where: { businessId_code: { businessId, code: fyWindow.code } },
    }),
    prisma.voucher.count({
      where: { businessId, fyCode: fyWindow.code, status: VoucherStatus.DRAFT },
    }),
    prisma.voucher.count({
      where: { businessId, fyCode: fyWindow.code, status: VoucherStatus.POSTED },
    }),
    getTrialBalance(businessId, fyWindow.code),
  ]);

  const pnl = computeProfitAndLossFromTrialBalance(tb.rows, fyWindow.code);

  const nonZeroPnlLedgers = tb.rows.filter((r) => {
    if (
      r.groupType !== AccountingGroupType.INCOME &&
      r.groupType !== AccountingGroupType.EXPENSES
    ) {
      return false;
    }
    return toDecimal2(r.closingDr).gt(0) || toDecimal2(r.closingCr).gt(0);
  });

  return {
    fyCode: fyWindow.code,
    label: fyWindow.label,
    startDate: fyWindow.startDate.toISOString().slice(0, 10),
    endDate: fyWindow.endDate.toISOString().slice(0, 10),
    isClosed: Boolean(fyRow?.isClosed),
    lockedUntil: fyRow?.lockedUntil ? fyRow.lockedUntil.toISOString().slice(0, 10) : null,
    draftVoucherCount: draftCount,
    postedVoucherCount: postedCount,
    trialBalanceBalanced: tb.totals.isBalanced,
    netProfitOrLoss: pnl.totals.netProfit,
    closingEntriesCount: nonZeroPnlLedgers.length,
  };
}

export interface ExecuteClosingInput {
  businessId: string;
  fyCode: string;
  actorUserId: string;
  actorEmail?: string | null;
  actorName?: string | null;
  actorRole: string;
  reason?: string | null;
}

/**
 * Owner-only Year-End Closing Engine:
 * 1. Verifies Trial Balance is balanced and FY is currently open.
 * 2. Generates a balanced CLOSING_ENTRY voucher transferring all Income & Expense
 *    balances to Retained Earnings (`RETAINED`).
 * 3. Marks FinancialYear `isClosed = true` and `lockedUntil = fy.endDate`.
 */
export async function executeFinancialYearClosing(input: ExecuteClosingInput) {
  if (!isOwnerRole(input.actorRole)) {
    throw new Error('Only the Business Owner can close a Financial Year.');
  }

  const fyWindow = parseIndianFyCode(input.fyCode);
  await ensureBusinessCOA(input.businessId, fyWindow.code);

  const preview = await getClosingPreview(input.businessId, fyWindow.code);
  if (preview.isClosed) {
    throw new Error(`Financial Year ${fyWindow.code} is already closed.`);
  }
  if (!preview.trialBalanceBalanced) {
    throw new Error(
      `Cannot close ${fyWindow.code}: Trial Balance is imbalanced. Reconcile opening balances first.`
    );
  }
  if (preview.draftVoucherCount > 0) {
    throw new Error(
      `Cannot close ${fyWindow.code}: ${preview.draftVoucherCount} draft voucher(s) must be posted or cancelled first.`
    );
  }

  const tb = await getTrialBalance(input.businessId, fyWindow.code);
  const retainedLedger = await getSystemLedger(input.businessId, SYSTEM_LEDGER_CODES.RETAINED);
  if (!retainedLedger) {
    throw new Error('System Retained Earnings ledger is missing.');
  }

  const closingEntries: VoucherEntryInput[] = [];
  let retainedCreditNet = new Prisma.Decimal(0); // positive => profit credited to Retained Earnings

  for (const row of tb.rows) {
    if (
      row.groupType !== AccountingGroupType.INCOME &&
      row.groupType !== AccountingGroupType.EXPENSES
    ) {
      continue;
    }

    const closingDr = toDecimal2(row.closingDr);
    const closingCr = toDecimal2(row.closingCr);
    const netDrMinusCr = closingDr.minus(closingCr);
    if (netDrMinusCr.eq(0)) continue;

    if (netDrMinusCr.lt(0)) {
      // Ledger has a Credit balance -> Debit it to zero out
      const absAmt = netDrMinusCr.abs();
      closingEntries.push({
        ledgerId: row.ledgerId,
        debitAmount: Number(absAmt.toFixed(2)),
        creditAmount: 0,
        narration: `Year-end closing transfer (${fyWindow.code})`,
      });
      retainedCreditNet = retainedCreditNet.plus(absAmt);
    } else {
      // Ledger has a Debit balance -> Credit it to zero out
      closingEntries.push({
        ledgerId: row.ledgerId,
        debitAmount: 0,
        creditAmount: Number(netDrMinusCr.toFixed(2)),
        narration: `Year-end closing transfer (${fyWindow.code})`,
      });
      retainedCreditNet = retainedCreditNet.minus(netDrMinusCr);
    }
  }

  if (retainedCreditNet.gt(0)) {
    closingEntries.push({
      ledgerId: retainedLedger.id,
      debitAmount: 0,
      creditAmount: Number(retainedCreditNet.toFixed(2)),
      narration: `Net Profit transferred to Retained Earnings (${fyWindow.code})`,
    });
  } else if (retainedCreditNet.lt(0)) {
    closingEntries.push({
      ledgerId: retainedLedger.id,
      debitAmount: Number(retainedCreditNet.abs().toFixed(2)),
      creditAmount: 0,
      narration: `Net Loss transferred to Retained Earnings (${fyWindow.code})`,
    });
  }

  return prisma.$transaction(async (tx) => {
    let closingVoucherId: string | null = null;
    let closingVoucherNumber: string | null = null;

    if (closingEntries.length >= 2) {
      const { totalDebit, normalizedEntries } = validateVoucherBalance(closingEntries);
      closingVoucherNumber = await generateNextVoucherNumber(
        input.businessId,
        fyWindow.code,
        VoucherType.CLOSING_ENTRY,
        tx
      );

      const voucher = await tx.voucher.create({
        data: {
          businessId: input.businessId,
          fyCode: fyWindow.code,
          voucherType: VoucherType.CLOSING_ENTRY,
          voucherNumber: closingVoucherNumber,
          voucherDate: fyWindow.endDate,
          narration:
            input.reason?.trim() ||
            `Year-end closing entry transferring P&L surplus/deficit to Retained Earnings for ${fyWindow.label}`,
          totalAmount: totalDebit,
          status: VoucherStatus.POSTED,
          referenceType: 'FY_CLOSING',
          referenceId: fyWindow.code,
          postedAt: new Date(),
          postedBy: input.actorUserId,
          createdBy: input.actorUserId,
          entries: {
            create: normalizedEntries,
          },
        },
      });

      closingVoucherId = voucher.id;

      for (const entry of normalizedEntries) {
        await updateLedgerBalance(
          entry.ledgerId,
          input.businessId,
          fyWindow.code,
          entry.debitAmount,
          entry.creditAmount,
          tx
        );
      }
    }

    const updatedFy = await tx.financialYear.upsert({
      where: {
        businessId_code: { businessId: input.businessId, code: fyWindow.code },
      },
      create: {
        businessId: input.businessId,
        code: fyWindow.code,
        label: fyWindow.label,
        startDate: fyWindow.startDate,
        endDate: fyWindow.endDate,
        isActive: true,
        isClosed: true,
        lockedUntil: fyWindow.endDate,
      },
      update: {
        isClosed: true,
        lockedUntil: fyWindow.endDate,
      },
    });

    await recordAuditEvent(
      {
        businessId: input.businessId,
        actorUserId: input.actorUserId,
        actorEmail: input.actorEmail,
        actorName: input.actorName,
        actorRole: input.actorRole,
        action: 'FINANCIAL_YEAR_CLOSED',
        entityType: 'FinancialYear',
        entityId: updatedFy.id,
        reason: input.reason?.trim() || 'Year-end closing executed by Owner',
        newValue: {
          fyCode: fyWindow.code,
          isClosed: true,
          closingVoucherId,
          closingVoucherNumber,
          netProfitTransferred: retainedCreditNet.toFixed(2),
        },
      },
      tx
    );

    return {
      financialYear: updatedFy,
      closingVoucherId,
      closingVoucherNumber,
      netProfitTransferred: retainedCreditNet.toFixed(2),
    };
  });
}

export async function lockAccountingPeriod(input: {
  businessId: string;
  fyCode: string;
  lockedUntil: Date;
  actorUserId: string;
  actorEmail?: string | null;
  actorName?: string | null;
  actorRole: string;
  reason?: string | null;
}) {
  if (!isOwnerRole(input.actorRole)) {
    throw new Error('Only the Business Owner can lock accounting periods.');
  }

  const fyWindow = parseIndianFyCode(input.fyCode);
  const updated = await prisma.financialYear.upsert({
    where: { businessId_code: { businessId: input.businessId, code: fyWindow.code } },
    create: {
      businessId: input.businessId,
      code: fyWindow.code,
      label: fyWindow.label,
      startDate: fyWindow.startDate,
      endDate: fyWindow.endDate,
      isActive: true,
      isClosed: false,
      lockedUntil: input.lockedUntil,
    },
    update: {
      lockedUntil: input.lockedUntil,
    },
  });

  await recordAuditEvent({
    businessId: input.businessId,
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
    actorName: input.actorName,
    actorRole: input.actorRole,
    action: 'ACCOUNTING_PERIOD_LOCKED',
    entityType: 'FinancialYear',
    entityId: updated.id,
    reason: input.reason?.trim() || `Locked entries up to ${input.lockedUntil.toISOString().slice(0, 10)}`,
    newValue: { fyCode: fyWindow.code, lockedUntil: input.lockedUntil.toISOString().slice(0, 10) },
  });

  return updated;
}

export async function reopenFinancialYear(input: {
  businessId: string;
  fyCode: string;
  actorUserId: string;
  actorEmail?: string | null;
  actorName?: string | null;
  actorRole: string;
  reason?: string | null;
}) {
  if (!isOwnerRole(input.actorRole)) {
    throw new Error('Only the Business Owner can unlock or reopen a Financial Year.');
  }

  const fyWindow = parseIndianFyCode(input.fyCode);
  const updated = await prisma.financialYear.update({
    where: { businessId_code: { businessId: input.businessId, code: fyWindow.code } },
    data: { isClosed: false, lockedUntil: null },
  });

  await recordAuditEvent({
    businessId: input.businessId,
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
    actorName: input.actorName,
    actorRole: input.actorRole,
    action: 'FINANCIAL_YEAR_REOPENED',
    entityType: 'FinancialYear',
    entityId: updated.id,
    reason: input.reason?.trim() || 'Financial Year reopened by Owner',
    newValue: { fyCode: fyWindow.code, isClosed: false, lockedUntil: null },
  });

  return updated;
}
