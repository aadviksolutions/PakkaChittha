# Pakka Chittha – ERP Upgrade Development Status

**Last Verified:** 2026-11-12  
**Active Scope:** Phase 1 & Phase 2 Applied to Neon Production (`br-solitary-poetry-b5h76510`); Phase 3 & Phase 4 Complete & Verified (Zero New Schema Migrations Required)

---

## 1. Subscription & Isolation Guarantees

- **Plan Gating (`canAccountantErp`):** Enabled **exclusively** for `SCALE` (`₹999/month`). Disabled (`false`) for `FREE_KHATA`, `STARTER` (`₹199/month`), `GROWTH` (`₹499/month`), and expired/past-due subscriptions.
- **Preserved Flows:** Existing Razorpay checkout/verify/webhook routes, 7-day trial logic, Free Personal Khata, Ghar Kharcha, and Starter/Growth features remain intact.
- **No Production Side Effects:** All schema DDL testing was run strictly on an isolated Neon temporary branch; production data was not modified or reset.

---

## 2. Phase 1: Foundation, Multi-Role RBAC, Scale Accountant Workspace & Governance (DONE)

### Database & Migration
- Updated [`prisma/schema.prisma`](prisma/schema.prisma):
  - Extended `BusinessRole` enum with `OWNER`, `MANAGER`, `OPERATOR`, `VIEWER` alongside legacy roles (`BUSINESS_OWNER`, `BILLING_STAFF`, `ACCOUNTANT`, `INVENTORY_MANAGER`).
  - Added enums `AccessScopeType`, `AccountantInvitationStatus`, `ApprovalStatus`.
  - Extended `BusinessMembership` (`branchIds`, `financialYears`, `permissions`, `isActive`, `invitedByUserId`, `revokedAt`) and `Session` (`branchId`).
  - Added 10 governance/ERP models: `Branch`, `FinancialYear`, `Role`, `Permission`, `RolePermission`, `AccountantInvitation`, `AccountantBusinessAccess`, `ApprovalRequest`, `AuditEvent`, `FeatureFlag`.
- Forward additive migration SQL: [`prisma/migrations/20261111223500_erp_phase1_accountant_rbac/migration.sql`](prisma/migrations/20261111223500_erp_phase1_accountant_rbac/migration.sql).
- **Neon Staging Status:** Verified on Neon temporary branch `br-plain-mountain-b5z21198` (Project `divine-boat-84453964`, Database `neondb`, Migration ID `2cc98f95-6643-464c-a1ce-491d1ae4f01b`).
  - Confirmed 17 foreign key constraints across all 10 new tables, all 8 `BusinessRole` enum labels, all 7 new `BusinessMembership`/`Session` columns, and all 32 existing `BusinessMembership` rows intact (`isActive = true`).
  - **Production Status:** Applied to Neon production branch `br-solitary-poetry-b5h76510`.

### RBAC, Session & API Enforcement
- [`src/lib/rbac/roles.ts`](src/lib/rbac/roles.ts): Unified 5-role taxonomy (`OWNER`, `ACCOUNTANT`, `MANAGER`, `OPERATOR`, `VIEWER`), granular `PERMISSIONS`, `OWNER_ONLY_PERMISSIONS`, `ACCOUNTANT_ASSIGNABLE_PERMISSIONS`, and `resolveEffectivePermissions` (strips Owner-only governance privileges such as `subscription.manage`, `ownership.transfer`, `accountant.manage`, and `approval.decide` from non-Owners).
- [`src/lib/rbac/fiscalYear.ts`](src/lib/rbac/fiscalYear.ts): Indian April 1 – March 31 FY window utilities and calendar-based statutory GST/TDS deadline calculator.
- [`src/lib/rbac/accountantAccessService.ts`](src/lib/rbac/accountantAccessService.ts), [`src/lib/rbac/auditService.ts`](src/lib/rbac/auditService.ts), [`src/lib/rbac/approvalService.ts`](src/lib/rbac/approvalService.ts), [`src/lib/rbac/accountantDashboardService.ts`](src/lib/rbac/accountantDashboardService.ts).
- [`src/lib/auth/session.ts`](src/lib/auth/session.ts) & [`src/lib/auth/guards.ts`](src/lib/auth/guards.ts): Tenant isolation against target `businessId`, `NON_VIEWER_ROLES` write blocking across billing/customers/inventory/purchases/quotations/voids, Scale ERP & branch/FY scope enforcement, and session invalidation upon revocation.
- API Routes built & verified in Next.js build:
  - `/api/accountant/businesses`
  - `/api/accountant/switch-business`
  - `/api/accountant/invitations` & `/api/accountant/invitations/accept`
  - `/api/accountant/access/[userId]`
  - `/api/accountant/dashboard`
  - `/api/branches` & `/api/accounting/fiscal-years`
  - `/api/approvals` & `/api/audit`
  - `/api/staff`

### Frontend Workspaces & Quality Cleanup
- Dedicated Scale Accountant Workspace (`/accountant` + `/accountant/businesses`, `/accountant/approvals`, `/accountant/audit-trail`, `/accountant/settings`, `/accountant/module/[slug]`), gated via `AccountantScaleGate` and excluded from search indexing in `src/middleware.ts`.
- Updated [`src/app/staff/page.tsx`](src/app/staff/page.tsx) with 5 ERP roles, inline role updating (`PATCH /api/staff`), and Scale-gated Accountant (CA) Invitation, Branch/FY Scoping, Permission Editor, and Access Revocation controls.
- Removed mock/sample data fallbacks from [`src/components/dashboard/GstOverviewCard.tsx`](src/components/dashboard/GstOverviewCard.tsx), [`src/components/dashboard/OutstandingWatchlist.tsx`](src/components/dashboard/OutstandingWatchlist.tsx), and [`src/components/dashboard/RecentTransactionsTable.tsx`](src/components/dashboard/RecentTransactionsTable.tsx).
- Verified Android DTO & REST backward compatibility against [`AuthModels.kt`](android/app/src/main/java/com/pakkachittha/app/data/model/AuthModels.kt), [`PakkachitthaApiService.kt`](android/app/src/main/java/com/pakkachittha/app/data/remote/PakkachitthaApiService.kt), and [`src/app/api/auth/me/route.ts`](src/app/api/auth/me/route.ts).

### Phase 1 Verification Summary
- `npx tsx scripts/test-erp-phase1-unit.ts`: **6/6 tests passed** (`ALL ERP PHASE 1 UNIT TESTS PASSED`).
- `npx eslint` (targeted across all Phase 1 files): **0 errors**, 5 non-blocking warnings (2 unused imports/params in `api/staff/route.ts` & `GstOverviewCard.tsx`, 1 unused var + 2 `@next/next/no-img-element` warnings in `Sidebar.tsx` & `BusinessProfileArea.tsx`). *(Note: global `npm run lint` without path scope hits pre-existing warnings/errors in `.chrome-temp/` and unrelated legacy modules.)*
- `npx tsc --noEmit --pretty false`: **0 errors** (exit code 0).
- `npx next build` (Next.js 16.4.0 Turbopack): **Compiled & generated 119/119 routes** cleanly (exit code 0).

---

## 3. Phase 2: Double-Entry Core Accounting Engine (DONE — Production-Applied)

### Database & Migration
- Extended [`prisma/schema.prisma`](prisma/schema.prisma) with Phase 2 enums (`AccountingGroupType`, `VoucherType`, `VoucherStatus`, `LedgerNature`) and 5 double-entry models (`AccountingGroup`, `Ledger`, `Voucher`, `VoucherEntry`, `LedgerBalance`) plus relations on `Business` and `Branch`.
- Forward additive migration SQL: [`prisma/migrations/20261112_erp_phase2_double_entry/migration.sql`](prisma/migrations/20261112_erp_phase2_double_entry/migration.sql).
- **Neon Production Status:** Verified on temporary branch `br-dark-king-b5a3q3ui` (`migration_id: d6805618-4bb2-4dbc-98d4-60f570b609c0`) and applied via `complete_database_migration` to production branch `br-solitary-poetry-b5h76510`.
  - Confirmed all 5 Phase 2 tables created on production and existing data untouched (`23` businesses, `17` invoices, `4` purchases).

### Core Double-Entry Services & Hooks
- [`src/lib/accounting/chartOfAccounts.ts`](src/lib/accounting/chartOfAccounts.ts): Idempotent Indian Chart of Accounts seeder (`ensureBusinessCOA`) across `ASSETS`, `LIABILITIES`, `CAPITAL`, `INCOME`, and `EXPENSES`, with system ledger codes (`CASH`, `BANK`, `DEBTORS`, `CREDITORS`, `SALES`, `PURCHASES`, GST output & ITC ledgers).
- [`src/lib/accounting/voucherEngine.ts`](src/lib/accounting/voucherEngine.ts): `Prisma.Decimal` balanced double-entry engine (`validateVoucherBalance`, `createDraftVoucher`, `postVoucher`, `postExistingDraftVoucher`, `cancelVoucher` with counter-balancing reversal voucher, FY lock checks, and immutable `AuditEvent` logging) plus idempotent Scale-only auto-posting hooks (`autoPostSalesVoucher`, `autoPostPaymentVoucher`, `autoPostPurchaseVoucher`, `autoPostSupplierPaymentVoucher`, `autoPostExpenseVoucher`).
- [`src/lib/accounting/ledgerService.ts`](src/lib/accounting/ledgerService.ts): Atomic `updateLedgerBalance`, `getLedgerStatement` with running Dr/Cr balances, and `getTrialBalance`.
- Non-blocking Scale-only auto-post hooks integrated into [`src/app/api/invoices/route.ts`](src/app/api/invoices/route.ts), [`src/app/api/invoices/[id]/payments/route.ts`](src/app/api/invoices/[id]/payments/route.ts), [`src/app/api/purchases/route.ts`](src/app/api/purchases/route.ts), [`src/app/api/purchases/[id]/receive/route.ts`](src/app/api/purchases/[id]/receive/route.ts), [`src/app/api/purchases/[id]/payments/route.ts`](src/app/api/purchases/[id]/payments/route.ts), and [`src/app/api/expenses/route.ts`](src/app/api/expenses/route.ts).
- COA seed utility: [`scripts/seed-phase2-coa.ts`](scripts/seed-phase2-coa.ts).

### Scale-Gated APIs & Accountant UI
- API routes: `/api/accounting/groups`, `/api/accounting/ledgers`, `/api/accounting/vouchers`, `/api/accounting/vouchers/[id]`, `/api/accounting/trial-balance`, `/api/accounting/day-book`, `/api/accounting/ledger-statement/[ledgerId]`.
- UI routes under `AccountantScaleGate`: `/accountant/chart-of-accounts`, `/accountant/ledgers`, `/accountant/ledgers/[id]`, `/accountant/day-book`, `/accountant/vouchers/new`, `/accountant/vouchers/[id]`, `/accountant/trial-balance`, wired into [`src/data/navigation.ts`](src/data/navigation.ts) and [`src/app/accountant/module/[slug]/page.tsx`](src/app/accountant/module/[slug]/page.tsx).

### Phase 2 Verification Summary
- `npx tsx scripts/test-erp-phase2-unit.ts`: **6/6 tests passed** (`ALL ERP PHASE 2 UNIT TESTS PASSED`).
- `npx eslint` (targeted across all Phase 2 files and modified transaction routes): **0 errors, 0 warnings** (exit code 0).
- `npx tsc --noEmit --pretty false`: **0 errors** (exit code 0).
- `npx next build`: verified cleanly across all 124 routes.

---

## 4. Phase 3: Full Financial Statements & Closing Engine (DONE)

### Database & Migration
- **Zero new schema migrations required:** Phase 3 operates directly on Phase 1 & Phase 2 models (`FinancialYear`, `ApprovalRequest`, `AuditEvent`, `AccountingGroup`, `Ledger`, `Voucher`, `VoucherEntry`, `Invoice`, `Purchase`) and uses the `CLOSING_ENTRY` voucher type added in Phase 2.

### Financial Statement & Closing Services
- [`src/lib/accounting/financialStatements.ts`](src/lib/accounting/financialStatements.ts):
  - `computeProfitAndLossFromTrialBalance` & `getProfitAndLossStatement`: Schedule-aligned Trading Account (Gross Profit) and Profit & Loss Account (Net Profit) with optional Previous FY comparative view.
  - `computeBalanceSheetFromTrialBalance` & `getBalanceSheetStatement`: Sources of Funds (Capital & Reserves, Current Period Profit/Loss, Long-Term & Current Liabilities) vs Application of Funds (Fixed & Current Assets) with `Assets === Liabilities & Equity` verification and zero double-counting after FY closing.
  - `getCashFlowStatement`: Direct Cash & Bank activity breakdown across Operating, Investing, and Financing categories.
  - `getPartyAgeingReport`: Live 5-bucket Receivables & Payables ageing (`Current`, `1-30d`, `31-60d`, `61-90d`, `90+d`) aggregated from unpaid/partial invoices and purchase bills.
- [`src/lib/accounting/closingEngine.ts`](src/lib/accounting/closingEngine.ts):
  - `getClosingPreview`: Pre-closing checklist verifying Trial Balance balance (`Dr === Cr`), `0` pending draft vouchers, P&L ledger transfer count, and period lock date.
  - `executeFinancialYearClosing`: Owner-only closing engine that posts a balanced `CLOSING_ENTRY` voucher transferring Income & Expense balances into Retained Earnings (`RETAINED`), sets `FinancialYear.isClosed = true` and `lockedUntil`, and records an immutable `AuditEvent`.
  - `lockAccountingPeriod` & `reopenFinancialYear`: Owner-only period lock/unlock controls with audit logging.
- Exported via [`src/lib/accounting/index.ts`](src/lib/accounting/index.ts).

### Scale-Gated APIs, Maker-Checker Integration & Accountant UI
- API routes under `requireScaleErpAccess`:
  - `/api/accounting/profit-loss` (`GET`)
  - `/api/accounting/balance-sheet` (`GET`)
  - `/api/accounting/cash-flow` (`GET`)
  - `/api/accounting/party-ageing` (`GET`)
  - `/api/accounting/closing` (`GET` preview; `POST` supporting Accountant `REQUEST_CLOSE` / `REQUEST_LOCK` Maker-Checker submissions and Owner-only `CLOSE_FY` / `LOCK_PERIOD` / `REOPEN_FY`)
- [`src/app/api/approvals/route.ts`](src/app/api/approvals/route.ts): Extended Owner `PATCH` approval handler to execute `executeFinancialYearClosing` or `lockAccountingPeriod` when an Accountant's `YEAR_END_CLOSING` or `PERIOD_LOCK` request is approved.
- UI routes under `AccountantScaleGate`: `/accountant/profit-loss`, `/accountant/balance-sheet`, `/accountant/cash-flow`, `/accountant/receivables-payables`, and `/accountant/closing`, wired into [`src/data/navigation.ts`](src/data/navigation.ts) and [`src/app/accountant/module/[slug]/page.tsx`](src/app/accountant/module/[slug]/page.tsx).

### Phase 3 Verification Summary
- `npx tsx scripts/test-erp-phase3-unit.ts`: **3/3 tests passed** (Trading & P&L comparative calculation, Balance Sheet profit & loss scenarios, closed-FY zero-double-counting invariant).
- `npx tsx scripts/test-erp-phase2-unit.ts`: **6/6 tests passed** (`ALL ERP PHASE 2 UNIT TESTS PASSED`).
- `npx eslint` (targeted across all Phase 3 new & modified files): **0 errors, 0 warnings** (exit code 0).
- `npx tsc --noEmit --pretty false`: **0 errors** (exit code 0).
- `npx next build` (Next.js 16.4.0 Turbopack): **129/129 routes built** cleanly (exit code 0).

---

## 5. Phase 4: Complete GST Compliance Suite & TDS/TCS (DONE)

### Database & Migration
- **Zero new schema migrations required:** Phase 4 operates directly on existing models (`Business`, `Customer`, `Supplier`, `Invoice`, `InvoiceItem`, `CreditDebitNote`, `Purchase`, `Expense`, `Gstr2bImport`, `Gstr2bEntry`, `Ledger`, `Voucher`, `VoucherEntry`, `ApprovalRequest`, `AuditEvent`).

### Core GST & Statutory Compliance Services
- [`src/lib/gst/complianceSuite.ts`](src/lib/gst/complianceSuite.ts):
  - `computeGstItcOffset`: Strict `Prisma.Decimal` Indian GST Section 49 / Rule 88A offset calculator (Input IGST -> Output IGST/CGST/SGST; Input CGST -> CGST/IGST; Input SGST -> SGST/IGST; prevents CGST <-> SGST cross-utilization).
  - `getSalesTaxRegister`, `getPurchaseItcRegister`, & `updatePurchaseItcEligibility`: Period-scoped outward/inward tax registers with audit-logged ITC classification (`ELIGIBLE`, `RECONCILED`, `CAPITAL_GOODS`, `PENDING_VERIFICATION`, `BLOCKED_SEC_17_5`, `INELIGIBLE`).
  - `getScaleGstr1Report` & `getScaleGstr3bReport`: Real-GSTIN validated GSTR-1 & GSTR-3B GSTN JSON/CSV generators built on [`src/lib/reports/gstr1.ts`](src/lib/reports/gstr1.ts) & [`src/lib/reports/gstr3b.ts`](src/lib/reports/gstr3b.ts), paired with Rule 88A net cash payable & credit carry-forward computation.
  - `buildNicEinvoicePayload` & `buildEwayBillPayload`: Strict NIC IRP v1.1 E-Invoice & E-Way Bill schema validator & JSON exporter (`GSTIN`, `HSN/SAC`, 6-digit PIN, distance checks). Strictly never generates fake IRNs or fake EWB numbers.
- [`src/lib/gst/tdsTcsEngine.ts`](src/lib/gst/tdsTcsEngine.ts):
  - `TDS_SECTION_RULES` & `calculateTdsTcsDeduction`: Indian Income Tax TDS/TCS engine for Sections `194C`, `194J`, `194H`, `194I`, `194Q`, and `206C(1H)`, including ₹50L excess-only bases and Section 206AA 20% missing-PAN escalation.
  - `getTdsTcsRegister` & `postTdsProvisionVoucher`: Scans live FY party aggregates across Purchases, Expenses, and Invoices, surfaces `TDS Payable (TDS_PAY)` ledger entries, and posts balanced `JOURNAL` TDS deduction vouchers with `AuditEvent` logging.
- Exported via [`src/lib/gst/index.ts`](src/lib/gst/index.ts).

### Scale-Gated APIs & Accountant UI
- API routes under `requireScaleErpAccess`:
  - `/api/gst/registers` (`GET` Sales/Purchase registers, `PATCH` ITC classification)
  - `/api/gst/gstr1` (`GET` view/JSON/CSV, `POST` Maker-Checker Owner Sign-off submission)
  - `/api/gst/gstr2b` (`GET` import history/detail, `POST` 2-way JSON reconciliation, CSV export, & `'MARK_RECONCILED'` batch update)
  - `/api/gst/gstr3b` (`GET` view/JSON/CSV + Rule 88A offset, `POST` Maker-Checker Owner Sign-off submission)
  - `/api/gst/e-compliance` (`GET` GST invoice eligibility scan, NIC E-Invoice/EWB validation, & JSON download)
  - `/api/gst/tds-tcs` (`GET` party FY thresholds + `TDS_PAY` ledger, `POST` balanced TDS provision journal voucher)
- UI pages under `AccountantScaleGate`: `/accountant/gst/sales-register`, `/accountant/gst/purchase-register`, `/accountant/gst/gstr-1`, `/accountant/gst/gstr-2b`, `/accountant/gst/gstr-3b`, `/accountant/gst/e-invoice`, and `/accountant/gst/tds-tcs`, wired into [`src/data/navigation.ts`](src/data/navigation.ts) and [`src/app/accountant/module/[slug]/page.tsx`](src/app/accountant/module/[slug]/page.tsx).

### Phase 4 Verification Summary
- `npx tsx scripts/test-erp-phase4-unit.ts`: **3/3 tests passed** (Rule 88A ITC offset, strict NIC E-Invoice/EWB validation without fake IRN/EWB, TDS/TCS thresholds & Section 206AA).
- `npx tsx scripts/test-erp-phase3-unit.ts`: **3/3 tests passed**.
- `npx tsx scripts/test-erp-phase2-unit.ts`: **6/6 tests passed**.
- `npx eslint` (targeted across `src/lib/gst`, `src/app/api/gst`, `src/app/accountant/gst`, `src/app/accountant/module`, `src/data/navigation.ts`, `scripts/test-erp-phase4-unit.ts`): **0 errors, 0 warnings** (exit code 0).
- `npx tsc --noEmit --pretty false`: **0 errors** (exit code 0).
- `npx next build` (Next.js 16.4.6 Turbopack): Compiled successfully, passed TypeScript, and generated **136/136** static pages cleanly alongside all dynamic App/API routes (exit code 0, post-merge with `next@16.4.6`).

---

## 6. Planned Upcoming Phases (Not Started — Awaiting Approval)

- **Phase 5:** Cost Centers, Bank Reconciliation, Cheque Management, Multi-Godown Inventory & Batch/Expiry Accounting Valuation (FIFO/Weighted Avg).
- **Phase 6:** Statutory Audit Packs (CA Excel/PDF/Tally-style XML/JSON exports), Fixed Assets & Multi-Branch Consolidation.

