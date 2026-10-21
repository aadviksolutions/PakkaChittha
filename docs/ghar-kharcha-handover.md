# PakkaChittha Mode Selection & Ghar Kharcha Handover Guide

## 1. Architecture & Public Routing Overview

The entry flow for the PakkaChittha SaaS platform has been upgraded to include a **Mode Selection** page (`/select-mode`) that precedes the existing login page while preserving direct access to `/login`, `/register`, and all authenticated workspace routes.

### Routing Flow:
1. **Unauthenticated Visitor hits `/` (Root domain)**:
   - Evaluated by `src/middleware.ts`.
   - Without an active session token, the visitor is directed to the public Mode Selection page (`/select-mode`).
2. **Mode Selection (`/select-mode`)**:
   - Header: PakkaChittha Brand Identity (`/pakka-chittha-logo.png`).
   - Title: “PakkaChittha”
   - Subtitle: “Har hisaab, ab ek hi jagah.”
   - Prompt: “Aap kis tarah ka hisaab rakhna chahte hain?”
   - Two equal-weight clickable cards:
     - **OPTION A: MERA GHAR**:
       - Icon: `Home` (Emerald theme `#059669`)
       - Description: “Ghar ka budget, roz ke kharche aur family ka hisaab.”
       - CTA: “Ghar ka Hisaab” -> Navigates to `/login?mode=household&redirect=/ghar-kharcha`
       - Secondary link: “Naya parivaar account banayein” -> `/register?plan=ghar_kharcha`
     - **OPTION B: MERA VYAPAAR**:
       - Icon: `Store` (Warm Orange theme `#EA580C`)
       - Description: “Business billing, udhaar, inventory aur accounts.”
       - CTA: “Business Hisaab” -> Navigates to `/login?mode=business&redirect=/`
       - Secondary link: “Naya business register karein” -> `/register`
3. **Direct Login Access (`/login`)**:
   - Direct access to `/login` continues to work with 100% backward compatibility.
   - When `mode=household` query parameter is present, an emerald badge (`🏠 Mera Ghar • Ghar Kharcha Login`) is shown, with a one-click link to `/register?plan=ghar_kharcha`.
   - When `mode=business` query parameter is present, a warm orange badge (`🏢 Mera Vyapaar • Business Login`) is shown, with a link to `/register`.
   - Both modes include a subtle “← Mode Badlein” button linking back to `/select-mode`.
4. **Authenticated Session Handling**:
   - An authenticated user visiting `/`, `/select-mode`, `/welcome`, `/login`, or `/register` is automatically routed to their authorized workspace (`/ghar-kharcha` for household users, `/free-khata` for free khata users, `/platform-admin` for platform owners, or `/` for business users).
   - Authenticated users are never unnecessarily forced to re-authenticate.

---

## 2. Security & Tenant Isolation

- **Query Parameter Isolation**: The `mode` URL parameter serves solely as UI context and default redirect intent (`/ghar-kharcha` vs `/`). It does **not** grant or elevate permissions.
- **Server-Side Authorization**: Every API route (`/api/household/*`, `/api/invoices/*`, etc.) enforces cryptographic session verification via PostgreSQL sessions (`getCurrentSession()`).
- **Commercial Boundary**: Pure household users cannot create invoices, access GST filings, manipulate inventory, or access business tenant data.
- **Cross-Household Isolation**: Household members are strictly constrained by composite foreign keys (`householdId`, `userId`).

---

## 3. Verified Routes & Endpoints

| Route / API | Type | Mode | Description |
|---|---|---|---|
| `/select-mode` | Page | Public | Mode Selection screen (Mera Ghar vs Mera Vyapaar) |
| `/welcome` | Page | Public | Alias redirecting to `/select-mode` |
| `/login` | Page | Public | Existing login page (enhanced with mode badges & switch) |
| `/register` | Page | Public | Registration page (supports Business, Free Khata, and Ghar Kharcha) |
| `/ghar-kharcha` | Page | Household | Personal/Family expense dashboard & KPI analytics |
| `/ghar-kharcha/transactions` | Page | Household | Ledger table with filters, search, and CSV export |
| `/ghar-kharcha/budget` | Page | Household | Monthly family budget planner & progress bars |
| `/ghar-kharcha/categories` | Page | Household | Category manager with 25 Indian default categories |
| `/ghar-kharcha/members` | Page | Household | Family collaboration & expiring single-use invite generator |
| `/ghar-kharcha/join` | Page | Public | Family invitation redemption portal |
| `/api/household/dashboard` | API | Household | KPI totals, monthly budget progress, category breakdowns |
| `/api/household/transactions` | API | Household | Transaction CRUD with validation |
| `/api/household/invitations` | API | Household | Single-use expiring invitation tokens |

---

## 4. Test Suite Execution Summary

- **Mode Selection Test Suite (`scripts/test-mode-selection.ts`)**:
  - `29 PASSED, 0 FAILED`
  - Validates brand logo presence, exact Hindi/English copy, Option A & B routes, middleware redirects, and AppShell isolation.
- **Household Acceptance Test Suite (`scripts/test-ghar-kharcha.ts`)**:
  - `36 PASSED, 0 FAILED`
  - Validates zero commercial subscriptions, 25 seeded categories, transaction CRUD, budget progress math, single-use invite expiration, member permission guards, cross-household isolation, and CSV export.
- **Free Udhaar Khata Test Suite (`scripts/test-free-khata.ts`)**:
  - `64 PASSED, 0 FAILED`
  - Validates permanent free status, contacts, ledger math, partial repayments, negative balance prevention, WhatsApp preview, multi-tenancy, and price protection.
- **Phase 2 Auth & Tenancy Test Suite (`scripts/test-phase2-auth-and-tenancy.js`)**:
  - `19 PASSED, 0 FAILED`
  - Validates PostgreSQL session creation, 7-day TTL, role anti-escalation, and strict workspace isolation.
- **TypeScript Static Verification (`npx tsc --noEmit`)**:
  - `0 Errors`
- **Next.js Production Build (`npm run build`)**:
  - `95/95 static & dynamic pages generated successfully`
