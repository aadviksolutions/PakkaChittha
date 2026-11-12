-- ============================================================================
-- ERP PHASE 2 — DOUBLE-ENTRY ACCOUNTING ENGINE
-- Migration: 20261112_erp_phase2_double_entry
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------

CREATE TYPE "AccountingGroupType" AS ENUM ('ASSETS', 'LIABILITIES', 'INCOME', 'EXPENSES', 'CAPITAL');

CREATE TYPE "VoucherType" AS ENUM ('SALES', 'PURCHASE', 'PAYMENT', 'RECEIPT', 'CONTRA', 'JOURNAL', 'DEBIT_NOTE', 'CREDIT_NOTE', 'OPENING_BALANCE', 'CLOSING_ENTRY');

CREATE TYPE "VoucherStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

CREATE TYPE "LedgerNature" AS ENUM ('DEBIT_NORMAL', 'CREDIT_NORMAL');

-- ---------------------------------------------------------------------------
-- TABLE: AccountingGroup
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "AccountingGroup" (
    "id"            TEXT NOT NULL,
    "businessId"    TEXT NOT NULL,
    "name"          TEXT NOT NULL,
    "description"   TEXT,
    "type"          "AccountingGroupType" NOT NULL,
    "parentGroupId" TEXT,
    "sortOrder"     INTEGER NOT NULL DEFAULT 0,
    "isSystem"      BOOLEAN NOT NULL DEFAULT false,
    "isActive"      BOOLEAN NOT NULL DEFAULT true,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingGroup_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- TABLE: Ledger
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "Ledger" (
    "id"                 TEXT NOT NULL,
    "businessId"         TEXT NOT NULL,
    "name"               TEXT NOT NULL,
    "code"               TEXT,
    "groupId"            TEXT NOT NULL,
    "nature"             "LedgerNature" NOT NULL,
    "openingBalance"     DECIMAL(15,2) NOT NULL DEFAULT 0,
    "openingBalanceType" VARCHAR(2) NOT NULL DEFAULT 'DR',
    "fyCode"             VARCHAR(10) NOT NULL DEFAULT 'ALL',
    "isSystem"           BOOLEAN NOT NULL DEFAULT false,
    "isActive"           BOOLEAN NOT NULL DEFAULT true,
    "notes"              TEXT,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ledger_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Ledger_openingBalanceType_check" CHECK ("openingBalanceType" IN ('DR', 'CR'))
);

-- ---------------------------------------------------------------------------
-- TABLE: Voucher
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "Voucher" (
    "id"            TEXT NOT NULL,
    "businessId"    TEXT NOT NULL,
    "branchId"      TEXT,
    "fyCode"        VARCHAR(10) NOT NULL,
    "voucherType"   "VoucherType" NOT NULL,
    "voucherNumber" VARCHAR(50) NOT NULL,
    "voucherDate"   DATE NOT NULL,
    "narration"     TEXT,
    "totalAmount"   DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status"        "VoucherStatus" NOT NULL DEFAULT 'DRAFT',
    "referenceType" VARCHAR(50),
    "referenceId"   VARCHAR(255),
    "postedAt"      TIMESTAMP(3),
    "postedBy"      VARCHAR(255),
    "cancelledAt"   TIMESTAMP(3),
    "cancelledBy"   VARCHAR(255),
    "cancelReason"  TEXT,
    "reversalOfId"  TEXT,
    "createdBy"     TEXT NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- TABLE: VoucherEntry
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "VoucherEntry" (
    "id"           TEXT NOT NULL,
    "voucherId"    TEXT NOT NULL,
    "ledgerId"     TEXT NOT NULL,
    "debitAmount"  DECIMAL(15,2) NOT NULL DEFAULT 0,
    "creditAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "narration"    TEXT,
    "sortOrder"    INTEGER NOT NULL DEFAULT 0,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoucherEntry_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- TABLE: LedgerBalance
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "LedgerBalance" (
    "id"         TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "ledgerId"   TEXT NOT NULL,
    "fyCode"     VARCHAR(10) NOT NULL,
    "openingDr"  DECIMAL(15,2) NOT NULL DEFAULT 0,
    "openingCr"  DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalDr"    DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalCr"    DECIMAL(15,2) NOT NULL DEFAULT 0,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerBalance_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- UNIQUE CONSTRAINTS
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS "Ledger_businessId_code_key" ON "Ledger"("businessId", "code");

CREATE UNIQUE INDEX IF NOT EXISTS "Voucher_businessId_fyCode_voucherNumber_key" ON "Voucher"("businessId", "fyCode", "voucherNumber");

CREATE UNIQUE INDEX IF NOT EXISTS "LedgerBalance_ledgerId_fyCode_key" ON "LedgerBalance"("ledgerId", "fyCode");

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS "AccountingGroup_businessId_idx" ON "AccountingGroup"("businessId");

CREATE INDEX IF NOT EXISTS "AccountingGroup_type_idx" ON "AccountingGroup"("type");

CREATE INDEX IF NOT EXISTS "AccountingGroup_parentGroupId_idx" ON "AccountingGroup"("parentGroupId");

CREATE INDEX IF NOT EXISTS "Ledger_businessId_idx" ON "Ledger"("businessId");

CREATE INDEX IF NOT EXISTS "Ledger_groupId_idx" ON "Ledger"("groupId");

CREATE INDEX IF NOT EXISTS "Ledger_nature_idx" ON "Ledger"("nature");

CREATE INDEX IF NOT EXISTS "Voucher_businessId_idx" ON "Voucher"("businessId");

CREATE INDEX IF NOT EXISTS "Voucher_branchId_idx" ON "Voucher"("branchId");

CREATE INDEX IF NOT EXISTS "Voucher_fyCode_idx" ON "Voucher"("fyCode");

CREATE INDEX IF NOT EXISTS "Voucher_voucherType_idx" ON "Voucher"("voucherType");

CREATE INDEX IF NOT EXISTS "Voucher_voucherDate_idx" ON "Voucher"("voucherDate");

CREATE INDEX IF NOT EXISTS "Voucher_status_idx" ON "Voucher"("status");

CREATE INDEX IF NOT EXISTS "Voucher_referenceType_referenceId_idx" ON "Voucher"("referenceType", "referenceId");

CREATE INDEX IF NOT EXISTS "VoucherEntry_voucherId_idx" ON "VoucherEntry"("voucherId");

CREATE INDEX IF NOT EXISTS "VoucherEntry_ledgerId_idx" ON "VoucherEntry"("ledgerId");

CREATE INDEX IF NOT EXISTS "LedgerBalance_businessId_idx" ON "LedgerBalance"("businessId");

CREATE INDEX IF NOT EXISTS "LedgerBalance_ledgerId_idx" ON "LedgerBalance"("ledgerId");

-- ---------------------------------------------------------------------------
-- FOREIGN KEYS: AccountingGroup
-- ---------------------------------------------------------------------------

ALTER TABLE "AccountingGroup" ADD CONSTRAINT "AccountingGroup_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccountingGroup" ADD CONSTRAINT "AccountingGroup_parentGroupId_fkey"
    FOREIGN KEY ("parentGroupId") REFERENCES "AccountingGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- FOREIGN KEYS: Ledger
-- ---------------------------------------------------------------------------

ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "AccountingGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- FOREIGN KEYS: Voucher
-- ---------------------------------------------------------------------------

ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_reversalOfId_fkey"
    FOREIGN KEY ("reversalOfId") REFERENCES "Voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- FOREIGN KEYS: VoucherEntry
-- ---------------------------------------------------------------------------

ALTER TABLE "VoucherEntry" ADD CONSTRAINT "VoucherEntry_voucherId_fkey"
    FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VoucherEntry" ADD CONSTRAINT "VoucherEntry_ledgerId_fkey"
    FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- FOREIGN KEYS: LedgerBalance
-- ---------------------------------------------------------------------------

ALTER TABLE "LedgerBalance" ADD CONSTRAINT "LedgerBalance_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LedgerBalance" ADD CONSTRAINT "LedgerBalance_ledgerId_fkey"
    FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE CASCADE ON UPDATE CASCADE;
