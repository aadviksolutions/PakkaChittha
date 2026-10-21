# PakkaChittha Ghar Kharcha — Technical Audit Report

## 1. Executive Summary

This document provides a comprehensive technical audit of the existing PakkaChittha (LenDen) codebase prior to implementing **PakkaChittha Ghar Kharcha (Free Household Mode)**. 

The audit establishes the verified repository architecture, dependencies, authentication mechanisms, database models, billing flows, and security boundaries. Based on these verified facts, it defines the safest integration architecture to ensure 100% regression-free coexistence with existing business accounting, Free Khata, and Razorpay subscriptions.

---

## 2. Verified Current Architecture

### 2.1 Framework & Core Stack
- **Framework**: Next.js `16.4.0` using the **App Router** (`src/app/` layout and page architecture).
- **React Version**: React `19.3.0` & React DOM `19.3.0`.
- **Language & Runtime**: TypeScript 5 (`strict: true`, target `ES2017`).
- **Styling**: TailwindCSS v4 with `@tailwindcss/turbopack` and customized CSS variables in `src/app/globals.css`.
- **Icons**: `lucide-react` (v1.55.0).
- **Deployment Platform**: Vercel Serverless & Edge deployment (`vercel.json`, Next.js standalone/hybrid).

### 2.2 Database & ORM
- **Database**: PostgreSQL hosted on **Neon** serverless Postgres.
- **ORM**: Prisma `6.19.3` (`@prisma/client` and `prisma`).
- **Connection Configuration**:
  - `DATABASE_URL`: Connection pooler endpoint (`@ep-sample-pooler...`).
  - `DATABASE_URL_UNPOOLED`: Direct compute endpoint (`@ep-sample...`).
- **Active Migration History**:
  - `20261011125601_init_phase2_auth_and_workspaces`
  - `20261011134433_add_phase3_customers_invoices_payments`
  - `20261011145829_add_phase4_inventory_suppliers_purchases`
  - `20261011155237_add_phase5_whatsapp`

---

## 3. Authentication & Database Findings

### 3.1 Authentication Mechanism
- **Session Architecture**: Server-managed session tokens stored in the `Session` table in PostgreSQL.
- **Token Generation**: Cryptographically secure 64-character hex string generated via `crypto.randomBytes(32).toString('hex')`.
- **Token Transport**: 
  - Primary: HTTP-only, secure, `SameSite=lax` cookie named `lenden_session_token`.
  - Fallback/API: `Authorization: Bearer <token>` or `x-session-token` header.
- **Session Lifetime**: 7 days default TTL (`SESSION_TTL_DAYS = 7`).
- **Password Security**: Bcrypt with work factor 12 (`bcryptjs`).
- **Platform Roles**:
  - `SUPER_ADMIN`: Platform owners/administrators.
  - `USER`: All standard platform tenants and collaborators. Public registration strictly prevents escalation to `SUPER_ADMIN`.
- **Business Roles (RBAC)**:
  - `BUSINESS_OWNER`: Primary tenant owner.
  - `BILLING_STAFF`: Cashier/counter clerk.
  - `ACCOUNTANT`: Books and GST filings.
  - `INVENTORY_MANAGER`: Stock and godown management.

### 3.2 Existing User & Multi-Tenancy Models
- `User`: Represents an individual user with `id`, `email`, `name`, `phone`, `passwordHash`, `platformRole`, and audit flags.
- `Business`: Represents a commercial business tenant or personal khata workspace.
- `BusinessMembership`: Join table linking `User` and `Business` with a specific `BusinessRole`.
- `Session`: Tracks active session tokens, linking a `User` to their currently active `Business` workspace.

---

## 4. Existing Account & Subscription Flow

### 4.1 Plan Types & Limits
The platform defines four official subscription tiers in `src/lib/subscription/plans.ts`:
1. `FREE_KHATA`: Permanent free personal lending & borrowing ledger. No invoices, no GST.
2. `STARTER`: Paid SMB billing (₹299/mo). 1 user, 1 location.
3. `GROWTH` (`GROWTH_PRO` in Prisma): ₹599/mo. 3 users, purchases, suppliers, advanced reports.
4. `SCALE` (`ENTERPRISE` in Prisma): ₹999/mo. 10 users, multi-location.

### 4.2 Trial & Entitlement Lifecycle
- Upon business registration, new accounts receive a **7-day free trial** under `GROWTH_PRO` with status `TRIALING`.
- After 7 days, if unrenewed, the subscription transitions to `EXPIRED`.
- When expired, `TrialExpiredLockScreen` blocks commercial operations across business routes while allowing read-only review or subscription renewal at `/subscription`.
- **Payment Gateway**: Razorpay integration (`razorpay` SDK) for card, UPI, and netbanking payments with cryptographic HMAC SHA-256 signature verification on order payments and webhooks (`/api/webhooks/razorpay`).

---

## 5. Proposed Integration Points for Ghar Kharcha

1. **Routing & Pages**:
   - `/ghar-kharcha`: Household overview dashboard (summary cards, analytics charts, recent transactions, quick entry).
   - `/ghar-kharcha/transactions`: Full transaction register with date range, category, and income/expense filters, search, pagination, and CSV export.
   - `/ghar-kharcha/budget`: Monthly budget and category budget management.
   - `/ghar-kharcha/categories`: Custom and default category manager.
   - `/ghar-kharcha/members`: Family collaboration, invitations, and member role assignment.
   - `/ghar-kharcha/join`: Secure invitation redemption page.
   - `/ghar-kharcha/setup`: Guided first-time household creation wizard.

2. **API Routes**:
   - `/api/household`: GET active household, POST create household, PATCH update settings/budget.
   - `/api/household/transactions`: GET (paginated/filtered), POST (create transaction).
   - `/api/household/transactions/[id]`: GET, PATCH (edit), DELETE (delete with confirmation).
   - `/api/household/categories`: GET (default + custom), POST (create custom).
   - `/api/household/categories/[id]`: PATCH, DELETE.
   - `/api/household/members`: GET members, DELETE remove member, PATCH change role.
   - `/api/household/invitations`: GET active invites, POST create invite, DELETE revoke.
   - `/api/household/invitations/accept`: POST accept invitation token.
   - `/api/household/export`: GET CSV download of transactions.
   - `/api/household/switch`: POST switch active household for user.
   - `/api/auth/register-household`: POST register user specifically for Household Mode.

3. **Navigation & UI Shell**:
   - Entry in `src/data/navigation.ts`: Dedicated `HOUSEHOLD_NAVIGATION_ITEMS` and `GHAR_KHARCHA` workspace type.
   - Workspace switch trigger in Header and Sidebar: One-click toggle between Business Workspace and Ghar Kharcha.
   - Registration entry point in `src/app/register/page.tsx`: "Ghar Kharcha (Free Household)" tab alongside Business and Free Khata.
   - Login entry point in `src/app/login/page.tsx`: Support redirect to `/ghar-kharcha`.
   - `AppShell.tsx`: Ensure `/ghar-kharcha` routes bypass `TrialExpiredLockScreen` completely so business trial expiration never affects household budgeting.

---

## 6. Proposed Schema & Authorization Model

### 6.1 Database Models (Additive & Non-Destructive)
All new tables will be added without modifying existing columns in `User`, `Business`, `Invoice`, `Customer`, etc.:

```prisma
enum HouseholdRole {
  OWNER
  ADMIN
  MEMBER
  VIEWER
}

enum HouseholdTransactionType {
  INCOME
  EXPENSE
}

enum HouseholdInviteStatus {
  PENDING
  ACCEPTED
  EXPIRED
  REVOKED
}

model Household {
  id             String                 @id @default(cuid())
  name           String
  currency       String                 @default("INR")
  monthlyBudget  Float?                 @default(0)
  budgetStartDay Int                    @default(1)
  isArchived     Boolean                @default(false)
  createdAt      DateTime               @default(now())
  updatedAt      DateTime               @updatedAt

  members        HouseholdMember[]
  transactions   HouseholdTransaction[]
  categories     HouseholdCategory[]
  invitations    HouseholdInvitation[]
  budgets        HouseholdMonthlyBudget[]

  @@index([name])
}

model HouseholdMember {
  id          String        @id @default(cuid())
  householdId String
  userId      String
  role        HouseholdRole @default(MEMBER)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  household   Household     @relation(fields: [householdId], references: [id], onDelete: Cascade)
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, householdId])
  @@index([householdId])
  @@index([userId])
}

model HouseholdInvitation {
  id          String                @id @default(cuid())
  householdId String
  inviterId   String
  inviteeEmail String?
  inviteToken String                @unique
  role        HouseholdRole         @default(MEMBER)
  status      HouseholdInviteStatus @default(PENDING)
  expiresAt   DateTime
  createdAt   DateTime              @default(now())
  updatedAt   DateTime              @updatedAt

  household   Household             @relation(fields: [householdId], references: [id], onDelete: Cascade)
  inviter     User                  @relation(fields: [inviterId], references: [id], onDelete: Cascade)

  @@index([householdId])
  @@index([inviteToken])
  @@index([inviteeEmail])
}

model HouseholdCategory {
  id             String                   @id @default(cuid())
  householdId    String?                  // Nullable for default system categories
  name           String
  type           HouseholdTransactionType
  icon           String?
  color          String?
  monthlyBudget  Float?
  isDefault      Boolean                  @default(false)
  createdAt      DateTime                 @default(now())
  updatedAt      DateTime                 @updatedAt

  household      Household?               @relation(fields: [householdId], references: [id], onDelete: Cascade)
  transactions   HouseholdTransaction[]

  @@unique([householdId, name, type])
  @@index([householdId])
  @@index([type])
}

model HouseholdTransaction {
  id             String                   @id @default(cuid())
  householdId    String
  createdById    String
  type           HouseholdTransactionType
  amount         Float
  categoryId     String?
  categoryName   String                   // Snapshot for audit integrity
  date           DateTime                 @default(now())
  paymentMethod  PaymentMethod            @default(CASH)
  description    String?
  payeeMerchant  String?
  notes          String?
  createdAt      DateTime                 @default(now())
  updatedAt      DateTime                 @updatedAt

  household      Household                @relation(fields: [householdId], references: [id], onDelete: Cascade)
  createdBy      User                     @relation(fields: [createdById], references: [id], onDelete: Cascade)
  category       HouseholdCategory?       @relation(fields: [categoryId], references: [id], onDelete: SetNull)

  @@index([householdId])
  @@index([householdId, date])
  @@index([householdId, type])
  @@index([createdById])
  @@index([categoryId])
}

model HouseholdMonthlyBudget {
  id          String    @id @default(cuid())
  householdId String
  monthYear   String    // Format: "YYYY-MM"
  amount      Float
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  household   Household @relation(fields: [householdId], references: [id], onDelete: Cascade)

  @@unique([householdId, monthYear])
  @@index([householdId])
}
```

### 6.2 Server-Side Authorization Guard (`requireHouseholdAccess`)
Every household operation strictly verifies:
1. `session = await requireAuth()`
2. Target `householdId` resolved from:
   - Query / payload if authorized member, OR
   - User's primary/active household membership.
3. Cryptographic lookup of `HouseholdMember` where `userId === session.user.id && householdId === targetHouseholdId`.
4. Role permissions check:
   - `OWNER`: All actions, settings, budget, member management, category management, delete household.
   - `ADMIN`: Member invite, transactions CRUD, categories CRUD, budget adjust.
   - `MEMBER`: View dashboard, view reports, create/edit own transactions.
   - `VIEWER`: Read-only access to dashboard and transaction ledger.

---

## 7. Risks and Mitigation

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Cross-household data leakage** | High | Strict server-side `WHERE householdId = :sessionHouseholdId` on all queries. Never trust client-supplied household IDs without DB membership verification. |
| **Interference with commercial billing / trial lock** | High | Household routes (`/ghar-kharcha/*`) explicitly exempted from `TrialExpiredLockScreen`. Household operations never touch `Subscription` or Razorpay. |
| **Accidental database breakage during migration** | Critical | Use strictly additive Prisma migrations. No alteration or dropping of existing tables or columns. Run `npx prisma migrate dev` in safe mode. |
| **Category deletion causing orphaned transactions** | Medium | Maintain denormalized `categoryName` on `HouseholdTransaction` alongside foreign key with `onDelete: SetNull`. |
| **Unauthorized invitation acceptance / hijacking** | Medium | Secure, expiring (72-hour), single-use cryptographic tokens. Require recipient authentication upon redemption. |

---

## 8. Files Expected to Change

### 8.1 Existing Files to Modify (Carefully & Minimally)
- `prisma/schema.prisma`: Append new household models and User relations.
- `src/middleware.ts`: Add public household join path (`/ghar-kharcha/join`, `/api/household/invitations/validate`).
- `src/components/layout/AppShell.tsx`: Exempt `/ghar-kharcha` routes from commercial trial expiration lock.
- `src/components/layout/Header.tsx`: Add household branding and workspace switcher.
- `src/components/layout/Sidebar.tsx`: Render household navigation when in Ghar Kharcha mode.
- `src/data/navigation.ts`: Add `HOUSEHOLD_NAVIGATION_ITEMS`.
- `src/app/login/page.tsx`: Add Ghar Kharcha route redirect handling and banner.
- `src/app/register/page.tsx`: Add Ghar Kharcha onboarding tab.
- `src/lib/auth/service.ts`: Add `registerHouseholdUser`.
- `src/app/platform-admin/page.tsx` & `/api/platform-admin/overview/route.ts`: Include household telemetry for platform super admins.

### 8.2 New Files to Create
- `docs/ghar-kharcha-audit.md` (This file)
- `docs/ghar-kharcha-implementation-plan.md`
- `docs/ghar-kharcha-handover.md`
- `src/lib/household/householdService.ts`: Core server service for households, transactions, budgets, and invites.
- `src/lib/household/guards.ts`: Server authorization guard `requireHouseholdAccess`.
- `src/lib/household/defaultCategories.ts`: Seed list of standard Indian household income & expense categories.
- `src/app/ghar-kharcha/page.tsx`: Household dashboard.
- `src/app/ghar-kharcha/transactions/page.tsx`: Transaction ledger with search, filters, export.
- `src/app/ghar-kharcha/budget/page.tsx`: Monthly and category budget planner.
- `src/app/ghar-kharcha/categories/page.tsx`: Category manager.
- `src/app/ghar-kharcha/members/page.tsx`: Family collaboration and invite management.
- `src/app/ghar-kharcha/join/page.tsx`: Invitation acceptance page.
- `src/app/ghar-kharcha/setup/page.tsx`: First-time household creation wizard.
- `src/app/api/household/*`: REST API endpoints.
- `scripts/test-ghar-kharcha.ts`: Comprehensive automated acceptance test suite.

---

## 9. Workflows That Must Remain Untouched

- Existing `/invoices`, `/customers`, `/inventory`, `/purchases`, `/suppliers`, `/expenses`, `/reports`, `/whatsapp`.
- Existing `SubscriptionPayment` and Razorpay client / webhook verification (`/api/webhooks/razorpay`).
- Existing 7-day trial calculation (`src/lib/subscription/trial.ts`).
- Existing package entitlements (`src/lib/subscription/entitlements.ts` & `plans.ts`).
- Existing commercial business registration (`registerBusinessOwner`).
- Existing Super Admin provisioning and security guards (`requireSuperAdmin`).

---

## 10. Test and Rollback Strategy

1. **Automated Test Suite**:
   - `scripts/test-ghar-kharcha.ts` validating registration, household creation, multi-role access control, income/expense calculation, budget tracking, family invitations, cross-household isolation, and zero billing side-effects.
   - Run regression tests `test-package-entitlements.ts`, `test:free-khata`, `test:phase2`.
2. **Rollback Plan**:
   - Feature flag: Can disable household UI via `NEXT_PUBLIC_ENABLE_GHAR_KHARCHA=false`.
   - Database rollback: The migration is strictly additive. To roll back, drop only the new tables (`Household*`) without touching any legacy tables.
