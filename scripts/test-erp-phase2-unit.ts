import assert from 'node:assert/strict';
import { AccountingGroupType, LedgerNature } from '@prisma/client';
import {
  DEFAULT_INDIAN_COA,
  SYSTEM_LEDGER_CODES,
} from '../src/lib/accounting/chartOfAccounts';
import { toDecimal2 } from '../src/lib/accounting/ledgerService';
import {
  VoucherImbalanceError,
  VoucherValidationError,
  validateVoucherBalance,
} from '../src/lib/accounting/voucherEngine';
import { calculateInvoiceTotals } from '../src/lib/billing/calculator';

function runTest(name: string, fn: () => void) {
  fn();
  console.log(`PASS: ${name}`);
}

console.log('=== Pakka Chittha ERP Phase 2 Unit Tests ===');

runTest('DEFAULT_INDIAN_COA covers all 5 root types and all required system ledger codes', () => {
  const typesPresent = new Set(DEFAULT_INDIAN_COA.map((g) => g.type));
  assert.equal(typesPresent.has(AccountingGroupType.ASSETS), true);
  assert.equal(typesPresent.has(AccountingGroupType.LIABILITIES), true);
  assert.equal(typesPresent.has(AccountingGroupType.CAPITAL), true);
  assert.equal(typesPresent.has(AccountingGroupType.INCOME), true);
  assert.equal(typesPresent.has(AccountingGroupType.EXPENSES), true);

  const ledgerByCode = new Map<string, LedgerNature>();
  for (const g of DEFAULT_INDIAN_COA) {
    for (const l of g.ledgers) {
      if (l.code) {
        assert.equal(ledgerByCode.has(l.code), false, `Duplicate COA code: ${l.code}`);
        ledgerByCode.set(l.code, l.nature);
      }
    }
  }

  for (const requiredCode of Object.values(SYSTEM_LEDGER_CODES)) {
    assert.equal(
      ledgerByCode.has(requiredCode),
      true,
      `Missing system ledger code: ${requiredCode}`
    );
  }

  assert.equal(ledgerByCode.get('CASH'), LedgerNature.DEBIT_NORMAL);
  assert.equal(ledgerByCode.get('BANK'), LedgerNature.DEBIT_NORMAL);
  assert.equal(ledgerByCode.get('DEBTORS'), LedgerNature.DEBIT_NORMAL);
  assert.equal(ledgerByCode.get('PURCHASES'), LedgerNature.DEBIT_NORMAL);
  assert.equal(ledgerByCode.get('SALES'), LedgerNature.CREDIT_NORMAL);
  assert.equal(ledgerByCode.get('CREDITORS'), LedgerNature.CREDIT_NORMAL);
  assert.equal(ledgerByCode.get('CAPITAL'), LedgerNature.CREDIT_NORMAL);
});

runTest('validateVoucherBalance accepts balanced multi-line entries with exact Decimal precision', () => {
  const result = validateVoucherBalance([
    { ledgerId: 'l_debtors', debitAmount: 1180.35, creditAmount: 0 },
    { ledgerId: 'l_sales', debitAmount: 0, creditAmount: 1000.3 },
    { ledgerId: 'l_cgst', debitAmount: 0, creditAmount: 90.02 },
    { ledgerId: 'l_sgst', debitAmount: 0, creditAmount: 90.03 },
  ]);

  assert.equal(result.totalDebit.toFixed(2), '1180.35');
  assert.equal(result.totalCredit.toFixed(2), '1180.35');
  assert.equal(result.normalizedEntries.length, 4);
});

runTest('validateVoucherBalance rejects imbalanced entries (throws VoucherImbalanceError)', () => {
  assert.throws(
    () =>
      validateVoucherBalance([
        { ledgerId: 'l_cash', debitAmount: 500.01, creditAmount: 0 },
        { ledgerId: 'l_sales', debitAmount: 0, creditAmount: 500.0 },
      ]),
    (err: unknown) => err instanceof VoucherImbalanceError
  );
});

runTest('validateVoucherBalance rejects invalid row structures (throws VoucherValidationError)', () => {
  // Single line
  assert.throws(
    () => validateVoucherBalance([{ ledgerId: 'l_1', debitAmount: 100, creditAmount: 0 }]),
    (err: unknown) => err instanceof VoucherValidationError
  );

  // Negative amount
  assert.throws(
    () =>
      validateVoucherBalance([
        { ledgerId: 'l_1', debitAmount: -10, creditAmount: 0 },
        { ledgerId: 'l_2', debitAmount: 0, creditAmount: -10 },
      ]),
    (err: unknown) => err instanceof VoucherValidationError
  );

  // Both Dr and Cr non-zero on same line
  assert.throws(
    () =>
      validateVoucherBalance([
        { ledgerId: 'l_1', debitAmount: 50, creditAmount: 50 },
        { ledgerId: 'l_2', debitAmount: 0, creditAmount: 0 },
      ]),
    (err: unknown) => err instanceof VoucherValidationError
  );
});

runTest('Cancellation reversal swaps Debit and Credit and nets ledger balances to zero', () => {
  const original = validateVoucherBalance([
    { ledgerId: 'l_bank', debitAmount: 2540.5, creditAmount: 0 },
    { ledgerId: 'l_debtors', debitAmount: 0, creditAmount: 2540.5 },
  ]);

  const reversedInput = original.normalizedEntries.map((e) => ({
    ledgerId: e.ledgerId,
    debitAmount: Number(e.creditAmount.toFixed(2)),
    creditAmount: Number(e.debitAmount.toFixed(2)),
  }));

  const reversal = validateVoucherBalance(reversedInput);
  assert.equal(reversal.totalDebit.toFixed(2), '2540.50');

  const netByLedger = new Map<string, number>();
  for (const e of [...original.normalizedEntries, ...reversal.normalizedEntries]) {
    const prev = netByLedger.get(e.ledgerId) || 0;
    const delta = Number(e.debitAmount.minus(e.creditAmount).toFixed(2));
    netByLedger.set(e.ledgerId, Number((prev + delta).toFixed(2)));
  }

  assert.equal(netByLedger.get('l_bank'), 0);
  assert.equal(netByLedger.get('l_debtors'), 0);
});

runTest('Auto-post Sales invoice breakdown preserves exact Dr === Cr across rounding', () => {
  const calc = calculateInvoiceTotals({
    items: [
      { description: 'Item A', quantity: 3, rate: 123.45, taxRate: 18 },
      { description: 'Item B', quantity: 2, rate: 49.99, taxRate: 5 },
    ],
    gstType: 'CGST_SGST',
    isTaxInclusive: false,
    isGstInvoice: true,
    enableRounding: true,
  });

  const totalDec = toDecimal2(calc.total);
  const cgstDec = toDecimal2(calc.cgstTotal);
  const sgstDec = toDecimal2(calc.sgstTotal);
  const salesNetDec = totalDec.minus(cgstDec).minus(sgstDec);

  const check = validateVoucherBalance([
    { ledgerId: 'debtors', debitAmount: Number(totalDec.toFixed(2)), creditAmount: 0 },
    { ledgerId: 'sales', debitAmount: 0, creditAmount: Number(salesNetDec.toFixed(2)) },
    { ledgerId: 'cgst', debitAmount: 0, creditAmount: Number(cgstDec.toFixed(2)) },
    { ledgerId: 'sgst', debitAmount: 0, creditAmount: Number(sgstDec.toFixed(2)) },
  ]);

  assert.equal(check.totalDebit.toFixed(2), check.totalCredit.toFixed(2));
  assert.equal(check.totalDebit.toFixed(2), totalDec.toFixed(2));
});

console.log('ALL ERP PHASE 2 UNIT TESTS PASSED');

