import {
  PaymentMethod,
  Prisma,
  PurchaseStatus,
  Voucher,
  VoucherStatus,
  VoucherType,
} from '@prisma/client';
import prisma from '@/lib/prisma';
import { getBusinessEntitlements } from '@/lib/subscription/entitlements';
import { buildIndianFyWindow, getIndianFyStartYear } from '@/lib/rbac/fiscalYear';
import { recordAuditEvent } from '@/lib/rbac/auditService';
import { ensureBusinessCOA, SYSTEM_LEDGER_CODES } from './chartOfAccounts';
import { getSystemLedger, toDecimal2, updateLedgerBalance } from './ledgerService';

export class VoucherImbalanceError extends Error {
  constructor(message = 'Total Debit must equal Total Credit for double-entry posting.') {
    super(message);
    this.name = 'VoucherImbalanceError';
  }
}

export class VoucherNotFoundError extends Error {
  constructor(message = 'Voucher not found.') {
    super(message);
    this.name = 'VoucherNotFoundError';
  }
}

export class VoucherAlreadyPostedError extends Error {
  constructor(message = 'Voucher is already posted or cancelled and cannot be modified.') {
    super(message);
    this.name = 'VoucherAlreadyPostedError';
  }
}

export class VoucherValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VoucherValidationError';
  }
}

export interface VoucherEntryInput {
  ledgerId: string;
  debitAmount: number;
  creditAmount: number;
  narration?: string;
}

export interface PostVoucherInput {
  businessId: string;
  branchId?: string | null;
  fyCode: string;
  voucherType: VoucherType;
  voucherNumber?: string;
  voucherDate: Date;
  narration?: string | null;
  entries: VoucherEntryInput[];
  referenceType?: string | null;
  referenceId?: string | null;
  createdBy: string;
}

const VOUCHER_PREFIX_MAP: Record<VoucherType, string> = {
  SALES: 'SL',
  PURCHASE: 'PU',
  PAYMENT: 'PY',
  RECEIPT: 'RC',
  CONTRA: 'CN',
  JOURNAL: 'JV',
  DEBIT_NOTE: 'DN',
  CREDIT_NOTE: 'CR',
  OPENING_BALANCE: 'OB',
  CLOSING_ENTRY: 'CL',
};

function getShortFyLabel(fyCode: string): string {
  const parts = fyCode.split('-');
  if (parts.length === 2 && parts[0].length === 4 && parts[1].length === 4) {
    return `${parts[0].slice(-2)}-${parts[1].slice(-2)}`;
  }
  return fyCode;
}

/**
 * Validates double-entry balance and entry hygiene using exact 2-decimal precision.
 * Throws VoucherImbalanceError if sum(debit) !== sum(credit).
 */
export function validateVoucherBalance(entries: VoucherEntryInput[]): {
  totalDebit: Prisma.Decimal;
  totalCredit: Prisma.Decimal;
  normalizedEntries: Array<{
    ledgerId: string;
    debitAmount: Prisma.Decimal;
    creditAmount: Prisma.Decimal;
    narration: string | null;
    sortOrder: number;
  }>;
} {
  if (!entries || entries.length < 2) {
    throw new VoucherValidationError('A double-entry voucher requires at least two ledger lines.');
  }

  let totalDebit = new Prisma.Decimal(0);
  let totalCredit = new Prisma.Decimal(0);

  const normalizedEntries = entries.map((entry, idx) => {
    if (!entry.ledgerId) {
      throw new VoucherValidationError(`Entry line ${idx + 1} is missing a ledgerId.`);
    }
    const rawDr = Number(entry.debitAmount || 0);
    const rawCr = Number(entry.creditAmount || 0);

    if (!Number.isFinite(rawDr) || !Number.isFinite(rawCr) || rawDr < 0 || rawCr < 0) {
      throw new VoucherValidationError(`Entry line ${idx + 1} has an invalid or negative amount.`);
    }

    const dr = toDecimal2(rawDr);
    const cr = toDecimal2(rawCr);

    if (dr.gt(0) && cr.gt(0)) {
      throw new VoucherValidationError(
        `Entry line ${idx + 1} cannot have both Debit and Credit amounts non-zero.`
      );
    }

    if (dr.eq(0) && cr.eq(0)) {
      throw new VoucherValidationError(
        `Entry line ${idx + 1} must have either a Debit or Credit amount greater than 0.`
      );
    }

    totalDebit = totalDebit.plus(dr);
    totalCredit = totalCredit.plus(cr);

    return {
      ledgerId: entry.ledgerId,
      debitAmount: dr,
      creditAmount: cr,
      narration: entry.narration?.trim() || null,
      sortOrder: idx,
    };
  });

  if (totalDebit.lte(0)) {
    throw new VoucherValidationError('Total voucher amount must be greater than zero.');
  }

  if (totalDebit.toFixed(2) !== totalCredit.toFixed(2)) {
    throw new VoucherImbalanceError(
      `Voucher is imbalanced: Total Debit (₹${totalDebit.toFixed(2)}) must equal Total Credit (₹${totalCredit.toFixed(2)}).`
    );
  }

  return { totalDebit, totalCredit, normalizedEntries };
}

/**
 * Generates sequential FY-scoped voucher number e.g. JV/26-27/0001.
 */
export async function generateNextVoucherNumber(
  businessId: string,
  fyCode: string,
  voucherType: VoucherType,
  tx: Prisma.TransactionClient | typeof prisma = prisma
): Promise<string> {
  const prefix = VOUCHER_PREFIX_MAP[voucherType] || 'VC';
  const shortFy = getShortFyLabel(fyCode);
  const fullPrefix = `${prefix}/${shortFy}/`;

  const existing = await tx.voucher.findMany({
    where: {
      businessId,
      fyCode,
      voucherNumber: { startsWith: fullPrefix },
    },
    select: { voucherNumber: true },
  });

  let maxSeq = 0;
  for (const row of existing) {
    const suffix = row.voucherNumber.slice(fullPrefix.length);
    const parsed = Number.parseInt(suffix, 10);
    if (Number.isInteger(parsed) && parsed > maxSeq) {
      maxSeq = parsed;
    }
  }

  return `${fullPrefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

async function assertFyOpenAndLedgersValid(
  businessId: string,
  fyCode: string,
  voucherDate: Date,
  ledgerIds: string[],
  tx: Prisma.TransactionClient
) {
  const fyRecord = await tx.financialYear.findUnique({
    where: {
      businessId_code: { businessId, code: fyCode },
    },
    select: { isClosed: true, lockedUntil: true },
  });

  if (fyRecord?.isClosed) {
    throw new VoucherValidationError(
      `Financial Year ${fyCode} is closed. Unlock or submit an approval request to post.`
    );
  }

  if (fyRecord?.lockedUntil && voucherDate <= fyRecord.lockedUntil) {
    throw new VoucherValidationError(
      `Voucher date ${voucherDate.toISOString().slice(0, 10)} falls within the locked period.`
    );
  }

  const uniqueLedgerIds = Array.from(new Set(ledgerIds));
  const ledgers = await tx.ledger.findMany({
    where: {
      businessId,
      id: { in: uniqueLedgerIds },
      isActive: true,
    },
    select: { id: true },
  });

  if (ledgers.length !== uniqueLedgerIds.length) {
    throw new VoucherValidationError(
      'One or more selected ledgers do not exist or are inactive for this business.'
    );
  }
}

/**
 * Creates a DRAFT voucher (validated for balance, no LedgerBalance mutation yet).
 */
export async function createDraftVoucher(input: PostVoucherInput): Promise<Voucher> {
  const { totalDebit, normalizedEntries } = validateVoucherBalance(input.entries);

  return prisma.$transaction(async (tx) => {
    await assertFyOpenAndLedgersValid(
      input.businessId,
      input.fyCode,
      input.voucherDate,
      normalizedEntries.map((e) => e.ledgerId),
      tx
    );

    const voucherNumber =
      input.voucherNumber?.trim() ||
      (await generateNextVoucherNumber(input.businessId, input.fyCode, input.voucherType, tx));

    const voucher = await tx.voucher.create({
      data: {
        businessId: input.businessId,
        branchId: input.branchId || null,
        fyCode: input.fyCode,
        voucherType: input.voucherType,
        voucherNumber,
        voucherDate: input.voucherDate,
        narration: input.narration?.trim() || null,
        totalAmount: totalDebit,
        status: VoucherStatus.DRAFT,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        createdBy: input.createdBy,
        entries: {
          create: normalizedEntries,
        },
      },
      include: {
        entries: {
          include: { ledger: { select: { id: true, name: true, code: true } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    await recordAuditEvent(
      {
        businessId: input.businessId,
        actorUserId: input.createdBy,
        action: 'VOUCHER_DRAFT_CREATED',
        entityType: 'Voucher',
        entityId: voucher.id,
        newValue: {
          voucherNumber: voucher.voucherNumber,
          voucherType: voucher.voucherType,
          totalAmount: totalDebit.toFixed(2),
        },
      },
      tx
    );

    return voucher;
  });
}

/**
 * Posts a balanced double-entry voucher transactionally, updates LedgerBalance caches,
 * and records an immutable AuditEvent.
 */
export async function postVoucher(input: PostVoucherInput): Promise<Voucher> {
  const { totalDebit, normalizedEntries } = validateVoucherBalance(input.entries);

  return prisma.$transaction(async (tx) => {
    await assertFyOpenAndLedgersValid(
      input.businessId,
      input.fyCode,
      input.voucherDate,
      normalizedEntries.map((e) => e.ledgerId),
      tx
    );

    const voucherNumber =
      input.voucherNumber?.trim() ||
      (await generateNextVoucherNumber(input.businessId, input.fyCode, input.voucherType, tx));

    const voucher = await tx.voucher.create({
      data: {
        businessId: input.businessId,
        branchId: input.branchId || null,
        fyCode: input.fyCode,
        voucherType: input.voucherType,
        voucherNumber,
        voucherDate: input.voucherDate,
        narration: input.narration?.trim() || null,
        totalAmount: totalDebit,
        status: VoucherStatus.POSTED,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        postedAt: new Date(),
        postedBy: input.createdBy,
        createdBy: input.createdBy,
        entries: {
          create: normalizedEntries,
        },
      },
      include: {
        entries: {
          include: { ledger: { select: { id: true, name: true, code: true } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    for (const entry of normalizedEntries) {
      await updateLedgerBalance(
        entry.ledgerId,
        input.businessId,
        input.fyCode,
        entry.debitAmount,
        entry.creditAmount,
        tx
      );
    }

    await recordAuditEvent(
      {
        businessId: input.businessId,
        actorUserId: input.createdBy,
        action: 'VOUCHER_POSTED',
        entityType: 'Voucher',
        entityId: voucher.id,
        newValue: {
          voucherNumber: voucher.voucherNumber,
          voucherType: voucher.voucherType,
          totalAmount: totalDebit.toFixed(2),
          referenceType: input.referenceType ?? null,
          referenceId: input.referenceId ?? null,
        },
      },
      tx
    );

    return voucher;
  });
}

/**
 * Transitions an existing DRAFT voucher to POSTED and updates LedgerBalances.
 */
export async function postExistingDraftVoucher(
  voucherId: string,
  businessId: string,
  postedBy: string
): Promise<Voucher> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.voucher.findFirst({
      where: { id: voucherId, businessId },
      include: { entries: true },
    });

    if (!existing) {
      throw new VoucherNotFoundError();
    }

    if (existing.status !== VoucherStatus.DRAFT) {
      throw new VoucherAlreadyPostedError();
    }

    validateVoucherBalance(
      existing.entries.map((e) => ({
        ledgerId: e.ledgerId,
        debitAmount: Number(e.debitAmount),
        creditAmount: Number(e.creditAmount),
        narration: e.narration || undefined,
      }))
    );

    const updated = await tx.voucher.update({
      where: { id: existing.id },
      data: {
        status: VoucherStatus.POSTED,
        postedAt: new Date(),
        postedBy,
      },
      include: { entries: true },
    });

    for (const entry of existing.entries) {
      await updateLedgerBalance(
        entry.ledgerId,
        businessId,
        existing.fyCode,
        entry.debitAmount,
        entry.creditAmount,
        tx
      );
    }

    await recordAuditEvent(
      {
        businessId,
        actorUserId: postedBy,
        action: 'VOUCHER_POSTED',
        entityType: 'Voucher',
        entityId: updated.id,
        newValue: { voucherNumber: updated.voucherNumber },
      },
      tx
    );

    return updated;
  });
}

/**
 * Cancels a voucher safely:
 * - DRAFT vouchers are marked CANCELLED directly.
 * - POSTED vouchers are marked CANCELLED AND a counter-balancing Reversal Voucher is posted
 *   to preserve immutable double-entry history.
 */
export async function cancelVoucher(
  voucherId: string,
  cancelledBy: string,
  reason?: string,
  businessId?: string
): Promise<Voucher> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.voucher.findFirst({
      where: {
        id: voucherId,
        ...(businessId ? { businessId } : {}),
      },
      include: { entries: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!existing) {
      throw new VoucherNotFoundError();
    }

    if (existing.status === VoucherStatus.CANCELLED) {
      throw new VoucherAlreadyPostedError('Voucher is already cancelled.');
    }

    const cancelled = await tx.voucher.update({
      where: { id: existing.id },
      data: {
        status: VoucherStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy,
        cancelReason: reason?.trim() || 'Cancelled by owner',
      },
    });

    if (existing.status === VoucherStatus.POSTED && existing.entries.length > 0) {
      const reversalNumber = await generateNextVoucherNumber(
        existing.businessId,
        existing.fyCode,
        existing.voucherType,
        tx
      );

      const reversedEntries = existing.entries.map((entry, idx) => ({
        ledgerId: entry.ledgerId,
        debitAmount: entry.creditAmount,
        creditAmount: entry.debitAmount,
        narration: `Reversal of ${existing.voucherNumber}${entry.narration ? ` - ${entry.narration}` : ''}`,
        sortOrder: idx,
      }));

      const reversalVoucher = await tx.voucher.create({
        data: {
          businessId: existing.businessId,
          branchId: existing.branchId,
          fyCode: existing.fyCode,
          voucherType: existing.voucherType,
          voucherNumber: reversalNumber,
          voucherDate: existing.voucherDate,
          narration: `Reversal of ${existing.voucherNumber}: ${reason?.trim() || 'Cancelled'}`,
          totalAmount: existing.totalAmount,
          status: VoucherStatus.POSTED,
          reversalOfId: existing.id,
          postedAt: new Date(),
          postedBy: cancelledBy,
          createdBy: cancelledBy,
          entries: {
            create: reversedEntries,
          },
        },
      });

      for (const revEntry of reversedEntries) {
        await updateLedgerBalance(
          revEntry.ledgerId,
          existing.businessId,
          existing.fyCode,
          revEntry.debitAmount,
          revEntry.creditAmount,
          tx
        );
      }

      await recordAuditEvent(
        {
          businessId: existing.businessId,
          actorUserId: cancelledBy,
          action: 'VOUCHER_CANCELLED_WITH_REVERSAL',
          entityType: 'Voucher',
          entityId: existing.id,
          reason: reason?.trim() || 'Cancelled by owner',
          previousValue: { status: existing.status, voucherNumber: existing.voucherNumber },
          newValue: { status: 'CANCELLED', reversalVoucherId: reversalVoucher.id, reversalNumber },
        },
        tx
      );
    } else {
      await recordAuditEvent(
        {
          businessId: existing.businessId,
          actorUserId: cancelledBy,
          action: 'VOUCHER_DRAFT_CANCELLED',
          entityType: 'Voucher',
          entityId: existing.id,
          reason: reason?.trim() || 'Draft cancelled',
        },
        tx
      );
    }

    return cancelled;
  });
}

// ============================================================================
// AUTOMATIC TRANSACTION POSTING HOOKS (SCALE PLAN ONLY, IDEMPOTENT)
// ============================================================================

async function canAutoPostForBusiness(businessId: string): Promise<boolean> {
  const ent = await getBusinessEntitlements(businessId);
  return Boolean(ent.entitlements.canAccountantErp);
}

async function hasExistingAutoVoucher(
  businessId: string,
  referenceType: string,
  referenceId: string
): Promise<boolean> {
  const existing = await prisma.voucher.findFirst({
    where: {
      businessId,
      referenceType,
      referenceId,
      status: { not: VoucherStatus.CANCELLED },
    },
    select: { id: true },
  });
  return Boolean(existing);
}

function resolveFyCodeFromDate(date: Date, explicitFyCode?: string): string {
  if (explicitFyCode && /^\d{4}-\d{4}$/.test(explicitFyCode)) {
    return explicitFyCode;
  }
  return buildIndianFyWindow(getIndianFyStartYear(date)).code;
}

function resolveSettlementLedgerCode(method: PaymentMethod): string {
  return method === PaymentMethod.CASH ? SYSTEM_LEDGER_CODES.CASH : SYSTEM_LEDGER_CODES.BANK;
}

/**
 * Auto-posts Sales Voucher from an Invoice:
 * Dr Sundry Debtors (Total), Cr Sales (Taxable + Rounding), Cr GST Output CGST/SGST/IGST.
 */
export async function autoPostSalesVoucher(
  invoiceId: string,
  businessId: string,
  fyCode?: string,
  createdBy = 'SYSTEM'
): Promise<void> {
  if (!(await canAutoPostForBusiness(businessId))) return;
  if (await hasExistingAutoVoucher(businessId, 'INVOICE', invoiceId)) return;

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId },
  });
  if (!invoice || invoice.status === 'DRAFT' || invoice.status === 'CANCELLED') return;
  if (invoice.total <= 0) return;

  const targetFy = resolveFyCodeFromDate(invoice.invoiceDate, fyCode);
  await ensureBusinessCOA(businessId, targetFy);

  const [debtors, sales, gstCgst, gstSgst, gstIgst] = await Promise.all([
    getSystemLedger(businessId, SYSTEM_LEDGER_CODES.DEBTORS),
    getSystemLedger(businessId, SYSTEM_LEDGER_CODES.SALES),
    getSystemLedger(businessId, SYSTEM_LEDGER_CODES.GST_CGST),
    getSystemLedger(businessId, SYSTEM_LEDGER_CODES.GST_SGST),
    getSystemLedger(businessId, SYSTEM_LEDGER_CODES.GST_IGST),
  ]);

  if (!debtors || !sales) return;

  const totalDec = toDecimal2(invoice.total);
  const cgstDec = toDecimal2(invoice.cgstTotal || 0);
  const sgstDec = toDecimal2(invoice.sgstTotal || 0);
  const igstDec = toDecimal2(invoice.igstTotal || 0);
  const salesNetDec = totalDec.minus(cgstDec).minus(sgstDec).minus(igstDec);

  if (salesNetDec.lte(0)) return;

  const entries: VoucherEntryInput[] = [
    {
      ledgerId: debtors.id,
      debitAmount: Number(totalDec.toFixed(2)),
      creditAmount: 0,
      narration: `${invoice.customerName} (${invoice.invoiceNumber})`,
    },
    {
      ledgerId: sales.id,
      debitAmount: 0,
      creditAmount: Number(salesNetDec.toFixed(2)),
      narration: `Sales Invoice ${invoice.invoiceNumber}`,
    },
  ];

  if (cgstDec.gt(0) && gstCgst) {
    entries.push({
      ledgerId: gstCgst.id,
      debitAmount: 0,
      creditAmount: Number(cgstDec.toFixed(2)),
      narration: `CGST Output on ${invoice.invoiceNumber}`,
    });
  }
  if (sgstDec.gt(0) && gstSgst) {
    entries.push({
      ledgerId: gstSgst.id,
      debitAmount: 0,
      creditAmount: Number(sgstDec.toFixed(2)),
      narration: `SGST Output on ${invoice.invoiceNumber}`,
    });
  }
  if (igstDec.gt(0) && gstIgst) {
    entries.push({
      ledgerId: gstIgst.id,
      debitAmount: 0,
      creditAmount: Number(igstDec.toFixed(2)),
      narration: `IGST Output on ${invoice.invoiceNumber}`,
    });
  }

  await postVoucher({
    businessId,
    fyCode: targetFy,
    voucherType: VoucherType.SALES,
    voucherDate: invoice.invoiceDate,
    narration: `Auto-posted Sales Invoice #${invoice.invoiceNumber} - ${invoice.customerName}`,
    entries,
    referenceType: 'INVOICE',
    referenceId: invoice.id,
    createdBy,
  });
}

/**
 * Auto-posts Receipt Voucher from a Customer Payment:
 * Dr Cash/Bank, Cr Sundry Debtors.
 */
export async function autoPostPaymentVoucher(
  paymentId: string,
  businessId: string,
  fyCode?: string,
  createdBy = 'SYSTEM'
): Promise<void> {
  if (!(await canAutoPostForBusiness(businessId))) return;
  if (await hasExistingAutoVoucher(businessId, 'PAYMENT', paymentId)) return;

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, businessId },
    include: {
      invoice: { select: { invoiceNumber: true } },
      customer: { select: { name: true } },
    },
  });
  if (!payment || payment.amount <= 0) return;

  const targetFy = resolveFyCodeFromDate(payment.paymentDate, fyCode);
  await ensureBusinessCOA(businessId, targetFy);

  const settleCode = resolveSettlementLedgerCode(payment.paymentMethod);
  const [settleLedger, debtors] = await Promise.all([
    getSystemLedger(businessId, settleCode),
    getSystemLedger(businessId, SYSTEM_LEDGER_CODES.DEBTORS),
  ]);
  if (!settleLedger || !debtors) return;

  const amount = Number(toDecimal2(payment.amount).toFixed(2));
  await postVoucher({
    businessId,
    fyCode: targetFy,
    voucherType: VoucherType.RECEIPT,
    voucherDate: payment.paymentDate,
    narration: `Receipt against ${payment.invoice.invoiceNumber} from ${payment.customer.name} (${payment.paymentMethod})`,
    entries: [
      { ledgerId: settleLedger.id, debitAmount: amount, creditAmount: 0 },
      { ledgerId: debtors.id, debitAmount: 0, creditAmount: amount },
    ],
    referenceType: 'PAYMENT',
    referenceId: payment.id,
    createdBy,
  });
}

/**
 * Auto-posts Purchase Voucher from a RECEIVED Purchase Bill:
 * Dr Purchases, Dr Input Tax Credit (CGST/SGST/IGST), Cr Sundry Creditors.
 */
export async function autoPostPurchaseVoucher(
  purchaseId: string,
  businessId: string,
  fyCode?: string,
  createdBy = 'SYSTEM'
): Promise<void> {
  if (!(await canAutoPostForBusiness(businessId))) return;
  if (await hasExistingAutoVoucher(businessId, 'PURCHASE', purchaseId)) return;

  const purchase = await prisma.purchase.findFirst({
    where: { id: purchaseId, businessId },
    include: { supplier: { select: { name: true } } },
  });
  if (!purchase || purchase.status !== PurchaseStatus.RECEIVED || purchase.total <= 0) return;

  const targetFy = resolveFyCodeFromDate(purchase.purchaseDate, fyCode);
  await ensureBusinessCOA(businessId, targetFy);

  const [purchasesLedger, creditors, itcCgst, itcSgst, itcIgst] = await Promise.all([
    getSystemLedger(businessId, SYSTEM_LEDGER_CODES.PURCHASES),
    getSystemLedger(businessId, SYSTEM_LEDGER_CODES.CREDITORS),
    getSystemLedger(businessId, SYSTEM_LEDGER_CODES.ITC_CGST),
    getSystemLedger(businessId, SYSTEM_LEDGER_CODES.ITC_SGST),
    getSystemLedger(businessId, SYSTEM_LEDGER_CODES.ITC_IGST),
  ]);
  if (!purchasesLedger || !creditors) return;

  const totalDec = toDecimal2(purchase.total);
  const cgstDec = toDecimal2(purchase.cgstTotal || 0);
  const sgstDec = toDecimal2(purchase.sgstTotal || 0);
  const igstDec = toDecimal2(purchase.igstTotal || 0);
  const purchaseNetDec = totalDec.minus(cgstDec).minus(sgstDec).minus(igstDec);

  if (purchaseNetDec.lte(0)) return;

  const entries: VoucherEntryInput[] = [
    {
      ledgerId: purchasesLedger.id,
      debitAmount: Number(purchaseNetDec.toFixed(2)),
      creditAmount: 0,
      narration: `Purchase Bill ${purchase.purchaseNumber} - ${purchase.supplier.name}`,
    },
  ];

  if (cgstDec.gt(0) && itcCgst) {
    entries.push({
      ledgerId: itcCgst.id,
      debitAmount: Number(cgstDec.toFixed(2)),
      creditAmount: 0,
      narration: `CGST Input on ${purchase.purchaseNumber}`,
    });
  }
  if (sgstDec.gt(0) && itcSgst) {
    entries.push({
      ledgerId: itcSgst.id,
      debitAmount: Number(sgstDec.toFixed(2)),
      creditAmount: 0,
      narration: `SGST Input on ${purchase.purchaseNumber}`,
    });
  }
  if (igstDec.gt(0) && itcIgst) {
    entries.push({
      ledgerId: itcIgst.id,
      debitAmount: Number(igstDec.toFixed(2)),
      creditAmount: 0,
      narration: `IGST Input on ${purchase.purchaseNumber}`,
    });
  }

  entries.push({
    ledgerId: creditors.id,
    debitAmount: 0,
    creditAmount: Number(totalDec.toFixed(2)),
    narration: `${purchase.supplier.name} (${purchase.purchaseNumber})`,
  });

  await postVoucher({
    businessId,
    fyCode: targetFy,
    voucherType: VoucherType.PURCHASE,
    voucherDate: purchase.purchaseDate,
    narration: `Auto-posted Purchase #${purchase.purchaseNumber} - ${purchase.supplier.name}`,
    entries,
    referenceType: 'PURCHASE',
    referenceId: purchase.id,
    createdBy,
  });
}

/**
 * Auto-posts Payment Voucher from a SupplierPayment:
 * Dr Sundry Creditors, Cr Cash/Bank.
 */
export async function autoPostSupplierPaymentVoucher(
  supplierPaymentId: string,
  businessId: string,
  fyCode?: string,
  createdBy = 'SYSTEM'
): Promise<void> {
  if (!(await canAutoPostForBusiness(businessId))) return;
  if (await hasExistingAutoVoucher(businessId, 'SUPPLIER_PAYMENT', supplierPaymentId)) return;

  const sp = await prisma.supplierPayment.findFirst({
    where: { id: supplierPaymentId, businessId },
    include: {
      purchase: { select: { purchaseNumber: true } },
      supplier: { select: { name: true } },
    },
  });
  if (!sp || sp.amount <= 0) return;

  const targetFy = resolveFyCodeFromDate(sp.paymentDate, fyCode);
  await ensureBusinessCOA(businessId, targetFy);

  const settleCode = resolveSettlementLedgerCode(sp.paymentMethod);
  const [creditors, settleLedger] = await Promise.all([
    getSystemLedger(businessId, SYSTEM_LEDGER_CODES.CREDITORS),
    getSystemLedger(businessId, settleCode),
  ]);
  if (!creditors || !settleLedger) return;

  const amount = Number(toDecimal2(sp.amount).toFixed(2));
  await postVoucher({
    businessId,
    fyCode: targetFy,
    voucherType: VoucherType.PAYMENT,
    voucherDate: sp.paymentDate,
    narration: `Supplier payment for ${sp.purchase.purchaseNumber} to ${sp.supplier.name} (${sp.paymentMethod})`,
    entries: [
      { ledgerId: creditors.id, debitAmount: amount, creditAmount: 0 },
      { ledgerId: settleLedger.id, debitAmount: 0, creditAmount: amount },
    ],
    referenceType: 'SUPPLIER_PAYMENT',
    referenceId: sp.id,
    createdBy,
  });
}

/**
 * Auto-posts Payment Voucher from an Expense:
 * Dr Matching Expense Ledger (or Miscellaneous Expenses fallback), Cr Cash/Bank.
 */
export async function autoPostExpenseVoucher(
  expenseId: string,
  businessId: string,
  fyCode?: string,
  createdBy = 'SYSTEM'
): Promise<void> {
  if (!(await canAutoPostForBusiness(businessId))) return;
  if (await hasExistingAutoVoucher(businessId, 'EXPENSE', expenseId)) return;

  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, businessId },
  });
  if (!expense || expense.amount <= 0) return;

  const targetFy = resolveFyCodeFromDate(expense.expenseDate, fyCode);
  await ensureBusinessCOA(businessId, targetFy);

  const categoryLower = expense.category.trim().toLowerCase();
  const matchedExpenseLedger = await prisma.ledger.findFirst({
    where: {
      businessId,
      isActive: true,
      name: { contains: categoryLower, mode: 'insensitive' },
    },
    select: { id: true },
  });

  const fallbackExp = matchedExpenseLedger
    ? null
    : await getSystemLedger(businessId, SYSTEM_LEDGER_CODES.MISC_EXP);

  const expenseLedgerId = matchedExpenseLedger?.id || fallbackExp?.id;
  const settleLedger = await getSystemLedger(
    businessId,
    resolveSettlementLedgerCode(expense.paymentMethod)
  );

  if (!expenseLedgerId || !settleLedger) return;

  const amount = Number(toDecimal2(expense.amount).toFixed(2));
  await postVoucher({
    businessId,
    fyCode: targetFy,
    voucherType: VoucherType.PAYMENT,
    voucherDate: expense.expenseDate,
    narration: `Expense (${expense.category}) paid to ${expense.payee}${expense.notes ? ` - ${expense.notes}` : ''}`,
    entries: [
      { ledgerId: expenseLedgerId, debitAmount: amount, creditAmount: 0 },
      { ledgerId: settleLedger.id, debitAmount: 0, creditAmount: amount },
    ],
    referenceType: 'EXPENSE',
    referenceId: expense.id,
    createdBy,
  });
}

