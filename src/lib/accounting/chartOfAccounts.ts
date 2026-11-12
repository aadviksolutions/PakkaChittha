import { AccountingGroupType, LedgerNature, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

export interface CoaLedgerSeed {
  name: string;
  code?: string;
  nature: LedgerNature;
  isSystem?: boolean;
  notes?: string;
}

export interface CoaGroupSeed {
  name: string;
  type: AccountingGroupType;
  description: string;
  sortOrder: number;
  isSystem: boolean;
  ledgers: CoaLedgerSeed[];
}

export const SYSTEM_LEDGER_CODES = {
  CASH: 'CASH',
  BANK: 'BANK',
  DEBTORS: 'DEBTORS',
  ITC_CGST: 'ITC_CGST',
  ITC_SGST: 'ITC_SGST',
  ITC_IGST: 'ITC_IGST',
  ADV_SUP: 'ADV_SUP',
  CREDITORS: 'CREDITORS',
  GST_CGST: 'GST_CGST',
  GST_SGST: 'GST_SGST',
  GST_IGST: 'GST_IGST',
  TDS_PAY: 'TDS_PAY',
  ADV_CUST: 'ADV_CUST',
  CAPITAL: 'CAPITAL',
  RETAINED: 'RETAINED',
  DRAWINGS: 'DRAWINGS',
  SALES: 'SALES',
  SVC_REV: 'SVC_REV',
  OTHER_INC: 'OTHER_INC',
  PURCHASES: 'PURCHASES',
  SALARY: 'SALARY',
  MISC_EXP: 'MISC_EXP',
} as const;

export const DEFAULT_INDIAN_COA: readonly CoaGroupSeed[] = [
  {
    name: 'Current Assets',
    type: AccountingGroupType.ASSETS,
    description: 'Cash, bank balances, trade receivables, and input tax credits',
    sortOrder: 10,
    isSystem: true,
    ledgers: [
      { name: 'Cash in Hand', code: SYSTEM_LEDGER_CODES.CASH, nature: LedgerNature.DEBIT_NORMAL, isSystem: true },
      { name: 'Bank Accounts', code: SYSTEM_LEDGER_CODES.BANK, nature: LedgerNature.DEBIT_NORMAL, isSystem: true },
      { name: 'Sundry Debtors', code: SYSTEM_LEDGER_CODES.DEBTORS, nature: LedgerNature.DEBIT_NORMAL, isSystem: true },
      { name: 'Input Tax Credit – CGST', code: SYSTEM_LEDGER_CODES.ITC_CGST, nature: LedgerNature.DEBIT_NORMAL, isSystem: true },
      { name: 'Input Tax Credit – SGST', code: SYSTEM_LEDGER_CODES.ITC_SGST, nature: LedgerNature.DEBIT_NORMAL, isSystem: true },
      { name: 'Input Tax Credit – IGST', code: SYSTEM_LEDGER_CODES.ITC_IGST, nature: LedgerNature.DEBIT_NORMAL, isSystem: true },
      { name: 'Advances to Suppliers', code: SYSTEM_LEDGER_CODES.ADV_SUP, nature: LedgerNature.DEBIT_NORMAL },
    ],
  },
  {
    name: 'Fixed Assets',
    type: AccountingGroupType.ASSETS,
    description: 'Tangible and intangible long-term business assets',
    sortOrder: 20,
    isSystem: true,
    ledgers: [
      { name: 'Plant & Machinery', nature: LedgerNature.DEBIT_NORMAL },
      { name: 'Furniture & Fixtures', nature: LedgerNature.DEBIT_NORMAL },
      { name: 'Land & Building', nature: LedgerNature.DEBIT_NORMAL },
    ],
  },
  {
    name: 'Current Liabilities',
    type: AccountingGroupType.LIABILITIES,
    description: 'Trade payables, GST output liabilities, and statutory dues',
    sortOrder: 30,
    isSystem: true,
    ledgers: [
      { name: 'Sundry Creditors', code: SYSTEM_LEDGER_CODES.CREDITORS, nature: LedgerNature.CREDIT_NORMAL, isSystem: true },
      { name: 'GST Output – CGST Payable', code: SYSTEM_LEDGER_CODES.GST_CGST, nature: LedgerNature.CREDIT_NORMAL, isSystem: true },
      { name: 'GST Output – SGST Payable', code: SYSTEM_LEDGER_CODES.GST_SGST, nature: LedgerNature.CREDIT_NORMAL, isSystem: true },
      { name: 'GST Output – IGST Payable', code: SYSTEM_LEDGER_CODES.GST_IGST, nature: LedgerNature.CREDIT_NORMAL, isSystem: true },
      { name: 'TDS Payable', code: SYSTEM_LEDGER_CODES.TDS_PAY, nature: LedgerNature.CREDIT_NORMAL },
      { name: 'Advances from Customers', code: SYSTEM_LEDGER_CODES.ADV_CUST, nature: LedgerNature.CREDIT_NORMAL },
    ],
  },
  {
    name: 'Long-term Liabilities',
    type: AccountingGroupType.LIABILITIES,
    description: 'Secured and unsecured term loans',
    sortOrder: 40,
    isSystem: true,
    ledgers: [
      { name: 'Loans (Banks)', nature: LedgerNature.CREDIT_NORMAL },
      { name: 'Loans (Others)', nature: LedgerNature.CREDIT_NORMAL },
    ],
  },
  {
    name: 'Capital Accounts',
    type: AccountingGroupType.CAPITAL,
    description: 'Owner capital, reserves, retained earnings, and drawings',
    sortOrder: 50,
    isSystem: true,
    ledgers: [
      { name: "Owner's Capital", code: SYSTEM_LEDGER_CODES.CAPITAL, nature: LedgerNature.CREDIT_NORMAL, isSystem: true },
      { name: 'Retained Earnings', code: SYSTEM_LEDGER_CODES.RETAINED, nature: LedgerNature.CREDIT_NORMAL, isSystem: true },
      { name: 'Drawings', code: SYSTEM_LEDGER_CODES.DRAWINGS, nature: LedgerNature.DEBIT_NORMAL },
    ],
  },
  {
    name: 'Direct Income',
    type: AccountingGroupType.INCOME,
    description: 'Primary operating revenue from goods and services',
    sortOrder: 60,
    isSystem: true,
    ledgers: [
      { name: 'Sales', code: SYSTEM_LEDGER_CODES.SALES, nature: LedgerNature.CREDIT_NORMAL, isSystem: true },
      { name: 'Service Revenue', code: SYSTEM_LEDGER_CODES.SVC_REV, nature: LedgerNature.CREDIT_NORMAL },
    ],
  },
  {
    name: 'Indirect Income',
    type: AccountingGroupType.INCOME,
    description: 'Non-operating and ancillary income',
    sortOrder: 70,
    isSystem: true,
    ledgers: [
      { name: 'Other Income', code: SYSTEM_LEDGER_CODES.OTHER_INC, nature: LedgerNature.CREDIT_NORMAL, isSystem: true },
      { name: 'Interest Received', nature: LedgerNature.CREDIT_NORMAL },
    ],
  },
  {
    name: 'Direct Expenses',
    type: AccountingGroupType.EXPENSES,
    description: 'Purchases and direct cost of goods sold',
    sortOrder: 80,
    isSystem: true,
    ledgers: [
      { name: 'Purchases', code: SYSTEM_LEDGER_CODES.PURCHASES, nature: LedgerNature.DEBIT_NORMAL, isSystem: true },
      { name: 'Freight Inward', nature: LedgerNature.DEBIT_NORMAL },
    ],
  },
  {
    name: 'Indirect Expenses',
    type: AccountingGroupType.EXPENSES,
    description: 'Operating, administrative, and overhead expenses',
    sortOrder: 90,
    isSystem: true,
    ledgers: [
      { name: 'Salaries & Wages', code: SYSTEM_LEDGER_CODES.SALARY, nature: LedgerNature.DEBIT_NORMAL },
      { name: 'Rent', nature: LedgerNature.DEBIT_NORMAL },
      { name: 'Electricity Charges', nature: LedgerNature.DEBIT_NORMAL },
      { name: 'Office Expenses', nature: LedgerNature.DEBIT_NORMAL },
      { name: 'Miscellaneous Expenses', code: SYSTEM_LEDGER_CODES.MISC_EXP, nature: LedgerNature.DEBIT_NORMAL, isSystem: true },
      { name: 'Bank Charges', nature: LedgerNature.DEBIT_NORMAL },
      { name: 'Depreciation', nature: LedgerNature.DEBIT_NORMAL },
    ],
  },
] as const;

type DbClient = Prisma.TransactionClient | typeof prisma;

/**
 * Idempotently seeds the standard Indian Chart of Accounts (groups + system & default ledgers)
 * for a business. Safe to invoke repeatedly.
 */
export async function ensureBusinessCOA(
  businessId: string,
  fyCode = 'ALL',
  client: DbClient = prisma
): Promise<{ groupsCreated: number; ledgersCreated: number }> {
  const existingGroups = await client.accountingGroup.findMany({
    where: { businessId },
    select: { id: true, name: true, type: true },
  });

  const groupMap = new Map<string, string>();
  for (const g of existingGroups) {
    groupMap.set(`${g.type}::${g.name.toLowerCase()}`, g.id);
  }

  const existingLedgers = await client.ledger.findMany({
    where: { businessId },
    select: { id: true, code: true, name: true, groupId: true },
  });

  const ledgerByCode = new Map<string, string>();
  const ledgerByGroupAndName = new Map<string, string>();
  for (const l of existingLedgers) {
    if (l.code) ledgerByCode.set(l.code, l.id);
    ledgerByGroupAndName.set(`${l.groupId}::${l.name.toLowerCase()}`, l.id);
  }

  let groupsCreated = 0;
  let ledgersCreated = 0;

  for (const groupSeed of DEFAULT_INDIAN_COA) {
    const groupKey = `${groupSeed.type}::${groupSeed.name.toLowerCase()}`;
    let groupId = groupMap.get(groupKey);

    if (!groupId) {
      const createdGroup = await client.accountingGroup.create({
        data: {
          businessId,
          name: groupSeed.name,
          description: groupSeed.description,
          type: groupSeed.type,
          sortOrder: groupSeed.sortOrder,
          isSystem: groupSeed.isSystem,
          isActive: true,
        },
      });
      groupId = createdGroup.id;
      groupMap.set(groupKey, groupId);
      groupsCreated++;
    }

    for (const ledgerSeed of groupSeed.ledgers) {
      const existingByCode = ledgerSeed.code ? ledgerByCode.get(ledgerSeed.code) : undefined;
      const existingByName = ledgerByGroupAndName.get(
        `${groupId}::${ledgerSeed.name.toLowerCase()}`
      );

      if (!existingByCode && !existingByName) {
        const createdLedger = await client.ledger.create({
          data: {
            businessId,
            name: ledgerSeed.name,
            code: ledgerSeed.code ?? null,
            groupId,
            nature: ledgerSeed.nature,
            fyCode,
            isSystem: Boolean(ledgerSeed.isSystem),
            isActive: true,
            notes: ledgerSeed.notes ?? null,
          },
        });
        if (createdLedger.code) {
          ledgerByCode.set(createdLedger.code, createdLedger.id);
        }
        ledgerByGroupAndName.set(
          `${groupId}::${createdLedger.name.toLowerCase()}`,
          createdLedger.id
        );
        ledgersCreated++;
      }
    }
  }

  return { groupsCreated, ledgersCreated };
}

