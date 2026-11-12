'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRight, Layers, ShieldCheck, ExternalLink } from 'lucide-react';
import { AccountantScaleGate } from '@/components/accountant/AccountantScaleGate';

interface ModuleDescriptor {
  title: string;
  phase: string;
  status: 'LIVE_REPORT_BRIDGE' | 'SCHEDULED';
  summary: string;
  liveHref?: string;
  liveLabel?: string;
  capabilities: string[];
}

const MODULE_CATALOG: Record<string, ModuleDescriptor> = {
  'day-book': {
    title: 'Day Book (Chronological Register)',
    phase: 'Phase 2 · Accounting Core & Double Entry',
    status: 'LIVE_REPORT_BRIDGE',
    summary: 'Chronological daily listing of posted accounting vouchers, invoices, purchases, and receipts.',
    liveHref: '/accountant/day-book',
    liveLabel: 'Open Live Day Book',
    capabilities: [
      'Chronological Debit/Credit voucher register across Cash, Bank, Sales & Purchase',
      'Voucher type, branch, and FY filters with drill-down',
      'Audit-logged edits via Maker-Checker & reversal entries',
    ],
  },
  ledgers: {
    title: 'Ledgers & Chart of Accounts',
    phase: 'Phase 2 · Accounting Core & Double Entry',
    status: 'LIVE_REPORT_BRIDGE',
    summary: 'Indian GAAP-aligned Accounting Groups and Ledgers with opening balances and running Dr/Cr balances.',
    liveHref: '/accountant/ledgers',
    liveLabel: 'Open Live Ledgers',
    capabilities: [
      'Pre-seeded Indian Chart of Accounts (Assets, Liabilities, Equity, Income, Expenses)',
      'Ledger statement view with opening balance, monthly totals & closing balance',
      'Automatic party ledger linking for Customers and Suppliers',
    ],
  },
  vouchers: {
    title: 'Voucher Entry (Tally-style F4–F9)',
    phase: 'Phase 2 · Accounting Core & Double Entry',
    status: 'LIVE_REPORT_BRIDGE',
    summary: 'Balanced double-entry voucher entry for Contra, Payment, Receipt, Journal, Sales & Purchase.',
    liveHref: '/accountant/vouchers/new',
    liveLabel: 'Create New Voucher',
    capabilities: [
      'Strict server-side Debit == Credit validation per voucher',
      'Sequential FY numbering per branch and voucher series',
      'Approval workflow integration for backdated or sensitive entries',
    ],
  },
  'journal-register': {
    title: 'Journal Register',
    phase: 'Phase 2 · Accounting Core & Double Entry',
    status: 'LIVE_REPORT_BRIDGE',
    summary: 'Complete register of adjustment journals, depreciation, TDS provisions, and year-end entries.',
    liveHref: '/accountant/day-book?voucherType=JOURNAL',
    liveLabel: 'Open Journal Register',
    capabilities: [
      'Filter posted, draft, and reversed adjustment entries',
      'Reference bill-by-bill and narration audit trail',
    ],
  },
  'sales-register': {
    title: 'Sales Register',
    phase: 'Live · Phase 4 GST Compliance Suite',
    status: 'LIVE_REPORT_BRIDGE',
    summary: 'Access live B2B/B2C taxable sales, CGST/SGST/IGST breakdown, and cancelled invoice tracking.',
    liveHref: '/accountant/gst/sales-register',
    liveLabel: 'Open Live Sales Tax Register',
    capabilities: [
      'Live taxable value & GST breakdown synced with commercial invoices',
      'Customer GSTIN & state split for intra-state and inter-state supply verification',
    ],
  },
  'purchase-register': {
    title: 'Purchase & ITC Register',
    phase: 'Live · Phase 4 GST Compliance Suite',
    status: 'LIVE_REPORT_BRIDGE',
    summary: 'Inspect supplier bills, classify ITC eligibility (Section 17(5) / Capital Goods), and track tax credits.',
    liveHref: '/accountant/gst/purchase-register',
    liveLabel: 'Open Purchase & ITC Register',
    capabilities: [
      'Supplier invoice register with live ITC classification updates',
      'Audit-logged eligible vs blocked Sec 17(5) ITC split',
    ],
  },
  'gstr-1': {
    title: 'GSTR-1 Outward Supplies & Return Pack',
    phase: 'Live · Phase 4 GST Compliance Suite',
    status: 'LIVE_REPORT_BRIDGE',
    summary: 'Generate B2B, B2CL, B2CS, HSN Summary, and Document Summary from your live invoices.',
    liveHref: '/accountant/gst/gstr-1',
    liveLabel: 'Open GSTR-1 Workspace',
    capabilities: [
      'Real-time invoice tax classification into GSTR-1 tables',
      'Official GSTN JSON/CSV export & Owner Filing Approval request submission',
    ],
  },
  'gstr-2b': {
    title: 'GSTR-2A / 2B Reconciliation',
    phase: 'Live · Phase 4 GST Compliance Suite',
    status: 'LIVE_REPORT_BRIDGE',
    summary: 'Match GSTR-2B supplier uploads against purchase books to surface ITC mismatches and mark matched bills reconciled.',
    liveHref: '/accountant/gst/gstr-2b',
    liveLabel: 'Open GSTR-2B Reconciler',
    capabilities: [
      'Import GSTR-2B JSON & run exact / fuzzy tolerance matching',
      'Highlight Missing in Books, Missing in 2B & Tax Mismatches',
    ],
  },
  'gstr-3b': {
    title: 'GSTR-3B Monthly Summary & Rule 88A Offset',
    phase: 'Live · Phase 4 GST Compliance Suite',
    status: 'LIVE_REPORT_BRIDGE',
    summary: 'Review outward tax liability, Rule 88A ITC set-off, and net cash payable before Owner sign-off.',
    liveHref: '/accountant/gst/gstr-3b',
    liveLabel: 'Open GSTR-3B Summary',
    capabilities: [
      'IGST/CGST/SGST Rule 88A electronic credit ledger offset & net cash payable',
      'Submit GSTR-3B to Owner Approvals Inbox before filing',
    ],
  },
  'e-invoice': {
    title: 'E-Invoice (IRN) & E-Way Bill Preparation',
    phase: 'Live · Phase 4 GST Compliance Suite',
    status: 'LIVE_REPORT_BRIDGE',
    summary: 'Strict NIC schema payload validation and export preparation (never generates fake IRNs or EWBs).',
    liveHref: '/accountant/gst/e-invoice',
    liveLabel: 'Open E-Invoice & EWB Compliance',
    capabilities: [
      'NIC v1.1 schema validation (GSTIN, HSN, pincode, distance checks)',
      'Structured JSON generation for licensed GSP/NIC portal submission',
    ],
  },
  'tds-tcs': {
    title: 'TDS / TCS Compliance Module',
    phase: 'Live · Phase 4 GST Compliance Suite',
    status: 'LIVE_REPORT_BRIDGE',
    summary: 'Track TDS sections (194C, 194J, 194H, 194I, 194Q, 206C(1H)), party thresholds, and post TDS journals.',
    liveHref: '/accountant/gst/tds-tcs',
    liveLabel: 'Open TDS / TCS Register',
    capabilities: [
      'Automatic FY party threshold scanning across Purchases, Expenses & Sales',
      'Balanced TDS journal voucher posting into TDS Payable ledger',
    ],
  },
  'receivables-payables': {
    title: 'Receivables & Payables Ageing',
    phase: 'Live · Phase 3 Financial Statements',
    status: 'LIVE_REPORT_BRIDGE',
    summary: 'Inspect open debtor invoices, creditor bills, and overdue buckets directly from your live books.',
    liveHref: '/accountant/receivables-payables',
    liveLabel: 'Open Live Receivables & Payables Ageing',
    capabilities: [
      'Real open receivables & payables synced with invoices and purchase bills',
      'Party-wise and bill-wise 5-bucket ageing analysis with CSV export',
    ],
  },
  'bank-reconciliation': {
    title: 'Bank & Cash Reconciliation',
    phase: 'Phase 5 · Banking & Cost Accounting',
    status: 'SCHEDULED',
    summary: 'Import bank CSV statements, auto-match UPI/NEFT references, and track unpresented cheques.',
    capabilities: [
      'Bank book vs statement balance reconciliation statement (BRS)',
      'Unreconciled item exception tracking',
    ],
  },
  'trial-balance': {
    title: 'Trial Balance',
    phase: 'Phase 2 · Accounting Core & Double Entry',
    status: 'LIVE_REPORT_BRIDGE',
    summary: 'Account-group & ledger-wise Debit/Credit Trial Balance verified against posted journals.',
    liveHref: '/accountant/trial-balance',
    liveLabel: 'Open Live Trial Balance',
    capabilities: [
      'Guaranteed Opening + Period Dr/Cr = Closing balance verification',
      'Hierarchical group expand/collapse like TallyPrime',
    ],
  },
  'profit-loss': {
    title: 'Profit & Loss Account',
    phase: 'Live · Phase 3 Complete Financial Statements',
    status: 'LIVE_REPORT_BRIDGE',
    summary: 'Review Trading & Profit & Loss Account with optional previous FY comparative view.',
    liveHref: '/accountant/profit-loss',
    liveLabel: 'Open Live Profit & Loss Account',
    capabilities: [
      'Live Trading Account (Gross Profit) and Profit & Loss Account (Net Profit)',
      'Previous Financial Year comparative columns and CSV export',
    ],
  },
  'balance-sheet': {
    title: 'Balance Sheet',
    phase: 'Live · Phase 3 Complete Financial Statements',
    status: 'LIVE_REPORT_BRIDGE',
    summary: 'Complete Schedule-aligned Assets, Liabilities & Capital Balance Sheet.',
    liveHref: '/accountant/balance-sheet',
    liveLabel: 'Open Live Balance Sheet',
    capabilities: [
      'Tied to Trial Balance and current period Net Profit / (Loss)',
      'Automatic Assets = Liabilities & Equity equation verification',
    ],
  },
  'cash-flow': {
    title: 'Cash Flow Statement',
    phase: 'Live · Phase 3 Complete Financial Statements',
    status: 'LIVE_REPORT_BRIDGE',
    summary: 'Operating, investing, and financing cash flow statement derived from double-entry ledgers.',
    liveHref: '/accountant/cash-flow',
    liveLabel: 'Open Live Cash Flow Statement',
    capabilities: [
      'Opening Cash & Bank, Operating / Investing / Financing flows, and Closing Cash & Bank',
    ],
  },
  'inventory-valuation': {
    title: 'Inventory Valuation (FIFO / Weighted Avg)',
    phase: 'Live Bridge · Phase 5 Inventory ERP',
    status: 'LIVE_REPORT_BRIDGE',
    summary: 'Inspect current stock quantities, batch valuation, and low-stock items.',
    liveHref: '/inventory',
    liveLabel: 'Open Live Stock & Inventory',
    capabilities: [
      'Real-time stock on hand and movement logs',
      'FIFO / Weighted Average closing stock schedule expansion in Phase 5',
    ],
  },
  'financial-reports': {
    title: 'Consolidated Financial Reports',
    phase: 'Live Bridge · Reports Hub',
    status: 'LIVE_REPORT_BRIDGE',
    summary: 'Access GSTR-1, GSTR-2B, GSTR-3B, Accounts Overview & Financial Registers in one click.',
    liveHref: '/reports',
    liveLabel: 'Open Reports Center',
    capabilities: [
      'Excel / PDF / JSON statutory export suite',
      'Real-time database reporting engine',
    ],
  },
  'ca-audit-pack': {
    title: 'CA Audit Pack & Bulk Export',
    phase: 'Phase 6 · Hardening, Performance & CA Audit Pack',
    status: 'SCHEDULED',
    summary: 'One-click ZIP/Excel/PDF bundle containing Trial Balance, P&L, Balance Sheet, GST registers, and Audit Trail.',
    capabilities: [
      'FY-end handover package for statutory tax audit',
      'Includes complete AuditEvent history and Owner Approvals record',
    ],
  },
};

export default function AccountantModulePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || 'day-book';
  const mod = MODULE_CATALOG[slug] || {
    title: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    phase: 'Upcoming ERP Phase',
    status: 'SCHEDULED' as const,
    summary: 'This professional accounting module is part of the Scale Accountant ERP rollout.',
    capabilities: ['Strict tenant isolation, role scoping, and audit trail enforced.'],
  };

  return (
    <AccountantScaleGate>
      <div className="space-y-5">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-orange-50 text-[#EA580C] border border-orange-200">
              <Layers className="w-3 h-3" />
              {mod.phase}
            </span>
            <span
              className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                mod.status === 'LIVE_REPORT_BRIDGE'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {mod.status === 'LIVE_REPORT_BRIDGE' ? 'Live Data Bridge Ready' : 'Scheduled Module'}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-[#071F38] tracking-tight mt-2">
            {mod.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1.5 max-w-2xl leading-relaxed">
            {mod.summary}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {mod.liveHref && (
              <Link
                href={mod.liveHref}
                className="px-4 py-2.5 rounded-xl bg-[#EA580C] hover:bg-orange-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                {mod.liveLabel || 'Open Live Module'}
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
            <Link
              href="/accountant"
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#071F38] text-xs font-bold inline-flex items-center gap-1.5"
            >
              Back to Accountant Dashboard
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#00B887]" />
            Verified Scope & Zero-Fabrication Commitment
          </h2>
          <ul className="space-y-2 text-xs text-slate-700">
            {mod.capabilities.map((cap, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C] mt-1.5 shrink-0" />
                <span>{cap}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AccountantScaleGate>
  );
}

