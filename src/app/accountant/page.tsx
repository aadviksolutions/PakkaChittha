'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  CheckSquare,
  Clock,
  FileWarning,
  GitBranch,
  IndianRupee,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Wallet,
  X,
  ArrowUpRight,
  AlertTriangle,
} from 'lucide-react';
import { AccountantScaleGate } from '@/components/accountant/AccountantScaleGate';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/i18n/context';

interface BusinessItem {
  businessId: string;
  name: string;
  erpRole: string;
  isScalePlan: boolean;
  branches: Array<{ id: string; name: string; code: string; isDefault: boolean }>;
  financialYears: Array<{ id: string; code: string; label: string; isClosed: boolean }>;
}

interface PendingInvite {
  id: string;
  businessName: string;
  invitedByEmail: string;
}

interface DashboardOverview {
  financialYear: { code: string; label: string; startDate: string; endDate: string };
  branchFilter: { branchId: string; branchTaggingNote: string };
  kpis: {
    totalSales: number;
    taxableSales: number;
    totalPurchases: number;
    taxablePurchases: number;
    totalExpenses: number;
    grossProfit: number;
    netProfit: number;
    cashBalance: number;
    cashInflow: number;
    cashOutflow: number;
    bankBalance: number;
    bankInflow: number;
    bankOutflow: number;
    receivables: number;
    receivablesCount: number;
    overdueReceivablesCount: number;
    payables: number;
    payablesCount: number;
    outputGst: number;
    outputCgst: number;
    outputSgst: number;
    outputIgst: number;
    inputTaxCredit: number;
    netGstPayable: number;
    itcCarryForward: number;
    pendingGstReturns: number;
    unreconciledCount: number;
    unpostedVouchersCount: number;
    pendingApprovalsCount: number;
  };
  filingDeadlines: Array<{
    returnType: string;
    periodLabel: string;
    dueDate: string;
    statusHint: 'UPCOMING' | 'DUE_SOON' | 'OVERDUE';
    daysRemaining: number;
  }>;
  pendingApprovals: Array<{
    id: string;
    requestType: string;
    title: string;
    summary: string | null;
    createdAt: string;
    requestedBy: { name: string; email: string };
  }>;
  recentAuditEvents: Array<{
    id: string;
    actorName: string | null;
    actorRole: string | null;
    action: string;
    entityType: string;
    reason: string | null;
    createdAt: string;
  }>;
  drilldownRows: Array<Record<string, unknown>>;
}

function formatInr(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-₹${formatted}` : `₹${formatted}`;
}

export default function AccountantDashboardPage() {
  return (
    <AccountantScaleGate>
      <AccountantDashboardContent />
    </AccountantScaleGate>
  );
}

function AccountantDashboardContent() {
  const { activeBusiness, switchBusiness } = useAuth();
  const { t } = useTranslation();

  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [selectedFy, setSelectedFy] = useState<string>('');
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drilldownKey, setDrilldownKey] = useState<string | null>(null);
  const [drilldownTitle, setDrilldownTitle] = useState<string>('');
  const [drilldownRows, setDrilldownRows] = useState<Array<Record<string, unknown>>>([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  const loadWorkspaceLists = useCallback(async () => {
    try {
      const res = await fetch('/api/accountant/businesses', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setBusinesses(data.businesses || []);
        setPendingInvites(data.pendingInvitations || []);
      }
    } catch {
      // Non-fatal; dashboard fetch continues
    }
  }, []);

  const activeBusinessId = activeBusiness?.id;

  const loadDashboard = useCallback(
    async (fyOverride?: string, branchOverride?: string) => {
      if (!activeBusinessId) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('businessId', activeBusinessId);
        const fy = fyOverride !== undefined ? fyOverride : selectedFy;
        const br = branchOverride !== undefined ? branchOverride : selectedBranchId;
        if (fy) params.set('fy', fy);
        if (br) params.set('branchId', br);

        const res = await fetch(`/api/accountant/dashboard?${params.toString()}`, {
          cache: 'no-store',
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to load dashboard metrics');
        }
        setOverview(data.overview);
        if (!fy && data.overview?.financialYear?.code) {
          setSelectedFy(data.overview.financialYear.code);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to fetch dashboard');
      } finally {
        setLoading(false);
      }
    },
    [activeBusinessId, selectedFy, selectedBranchId]
  );

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadWorkspaceLists();
    });
    return () => {
      cancelled = true;
    };
  }, [loadWorkspaceLists]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadDashboard();
    });
    return () => {
      cancelled = true;
    };
  }, [loadDashboard]);

  const handleBusinessChange = async (nextBusinessId: string) => {
    if (!nextBusinessId || nextBusinessId === activeBusiness?.id) return;
    const res = await switchBusiness(nextBusinessId);
    if (!res.ok) {
      setError(res.error || 'Failed to switch business');
    } else {
      setSelectedBranchId('ALL');
      setSelectedFy('');
    }
  };

  const openDrilldown = async (metric: string, title: string) => {
    if (!activeBusiness?.id) return;
    setDrilldownKey(metric);
    setDrilldownTitle(title);
    setDrilldownLoading(true);
    setDrilldownRows([]);
    try {
      const params = new URLSearchParams({
        businessId: activeBusiness.id,
        drilldown: metric,
        branchId: selectedBranchId || 'ALL',
      });
      if (selectedFy) params.set('fy', selectedFy);
      const res = await fetch(`/api/accountant/dashboard?${params.toString()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (res.ok && data.overview?.drilldownRows) {
        setDrilldownRows(data.overview.drilldownRows);
      }
    } finally {
      setDrilldownLoading(false);
    }
  };

  const branches = activeBusiness?.branches || [];
  const financialYears = activeBusiness?.financialYears || [];
  const kpis = overview?.kpis;

  return (
    <div className="space-y-5">
      {/* Top Accountant Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-orange-50 text-[#EA580C] border border-orange-200">
                <Briefcase className="w-3 h-3" />
                {t('accountant.workspaceBadge')}
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                Role: {activeBusiness?.erpRole || 'OWNER'}
              </span>
              {activeBusiness?.gstin && (
                <span className="text-[11px] font-mono text-slate-500">
                  GSTIN: {activeBusiness.gstin}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#071F38] tracking-tight mt-1.5">
              {t('accountant.dashboard')}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time books, GST liability, receivables/payables, statutory calendar & approvals.
            </p>
          </div>

          {/* Multi-Business / Branch / FY Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 lg:w-auto">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Business
              </label>
              <div className="relative">
                <select
                  value={activeBusiness?.id || ''}
                  onChange={(e) => handleBusinessChange(e.target.value)}
                  className="w-full text-xs font-semibold text-[#071F38] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                >
                  {businesses.length === 0 && activeBusiness && (
                    <option value={activeBusiness.id}>{activeBusiness.name}</option>
                  )}
                  {businesses.map((b) => (
                    <option key={b.businessId} value={b.businessId} disabled={!b.isScalePlan}>
                      {b.name} ({b.erpRole}){!b.isScalePlan ? ' - Non-Scale' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Branch Scope
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full text-xs font-semibold text-[#071F38] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              >
                <option value="ALL">{t('accountant.allBranches')}</option>
                {branches.map((br) => (
                  <option key={br.id} value={br.id}>
                    {br.name} ({br.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Financial Year
              </label>
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedFy || overview?.financialYear?.code || ''}
                  onChange={(e) => setSelectedFy(e.target.value)}
                  className="w-full text-xs font-semibold text-[#071F38] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                >
                  {financialYears.length === 0 && (
                    <option value="2026-2027">FY 2026-27</option>
                  )}
                  {financialYears.map((fy) => (
                    <option key={fy.id} value={fy.code}>
                      {fy.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => loadDashboard()}
                  title="Refresh live books"
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Invitations Notification Strip */}
        {pendingInvites.length > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-amber-900">
              <Building2 className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                You have <strong>{pendingInvites.length}</strong> pending client accountant{' '}
                {pendingInvites.length === 1 ? 'invitation' : 'invitations'} waiting to be accepted.
              </span>
            </div>
            <Link
              href="/accountant/businesses"
              className="text-xs font-bold text-amber-900 hover:text-amber-700 underline shrink-0"
            >
              Review & Accept →
            </Link>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Primary KPI Grid (Drill-Down Enabled) */}
      {kpis && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <button
              type="button"
              onClick={() => openDrilldown('sales', 'Sales Invoices (Selected FY)')}
              className="text-left bg-white rounded-2xl border border-slate-200/90 hover:border-orange-300 hover:shadow-sm p-4 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Total Sales
                </span>
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-[#EA580C]" />
              </div>
              <p className="text-xl font-black text-[#071F38] tabular-nums mt-1.5">
                {formatInr(kpis.totalSales)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Taxable: {formatInr(kpis.taxableSales)}
              </p>
            </button>

            <button
              type="button"
              onClick={() => openDrilldown('purchases', 'Purchase Bills (Selected FY)')}
              className="text-left bg-white rounded-2xl border border-slate-200/90 hover:border-orange-300 hover:shadow-sm p-4 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Total Purchases
                </span>
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-[#EA580C]" />
              </div>
              <p className="text-xl font-black text-[#071F38] tabular-nums mt-1.5">
                {formatInr(kpis.totalPurchases)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Taxable: {formatInr(kpis.taxablePurchases)}
              </p>
            </button>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Net Operating Profit
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <p
                className={`text-xl font-black tabular-nums mt-1.5 ${
                  kpis.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {formatInr(kpis.netProfit)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Gross: {formatInr(kpis.grossProfit)} · Exp: {formatInr(kpis.totalExpenses)}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Cash & Bank Flow (FY)
                </span>
                <Wallet className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-xl font-black text-[#071F38] tabular-nums mt-1.5">
                {formatInr(kpis.cashBalance + kpis.bankBalance)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Cash: {formatInr(kpis.cashBalance)} · Bank/UPI: {formatInr(kpis.bankBalance)}
              </p>
            </div>
          </div>

          {/* Receivables / Payables / GST / Exceptions Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <button
              type="button"
              onClick={() => openDrilldown('receivables', 'Outstanding Customer Receivables')}
              className="text-left bg-white rounded-2xl border border-slate-200/90 hover:border-orange-300 p-4 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Receivables
                </span>
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-[#EA580C]" />
              </div>
              <p className="text-lg font-black text-emerald-700 tabular-nums mt-1">
                {formatInr(kpis.receivables)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {kpis.receivablesCount} open · {kpis.overdueReceivablesCount} overdue
              </p>
            </button>

            <button
              type="button"
              onClick={() => openDrilldown('payables', 'Outstanding Supplier Payables')}
              className="text-left bg-white rounded-2xl border border-slate-200/90 hover:border-orange-300 p-4 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Payables
                </span>
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-[#EA580C]" />
              </div>
              <p className="text-lg font-black text-rose-700 tabular-nums mt-1">
                {formatInr(kpis.payables)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {kpis.payablesCount} open supplier bills
              </p>
            </button>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Net GST Position
                </span>
                <IndianRupee className="w-4 h-4 text-[#EA580C]" />
              </div>
              <p className="text-lg font-black text-[#071F38] tabular-nums mt-1">
                {kpis.netGstPayable > 0
                  ? `${formatInr(kpis.netGstPayable)} Payable`
                  : `${formatInr(kpis.itcCarryForward)} ITC Credit`}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Output: {formatInr(kpis.outputGst)} · ITC: {formatInr(kpis.inputTaxCredit)}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Exceptions & Compliance
                </span>
                <FileWarning className="w-4 h-4 text-amber-600" />
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => openDrilldown('unreconciled', 'Unreconciled GSTR-2B Imports')}
                  className="text-left px-2 py-1 rounded-lg bg-slate-50 hover:bg-orange-50 text-slate-700 cursor-pointer"
                >
                  2B Unreconciled: <strong>{kpis.unreconciledCount}</strong>
                </button>
                <button
                  type="button"
                  onClick={() => openDrilldown('drafts', 'Draft / Unposted Documents')}
                  className="text-left px-2 py-1 rounded-lg bg-slate-50 hover:bg-orange-50 text-slate-700 cursor-pointer"
                >
                  Draft Docs: <strong>{kpis.unpostedVouchersCount}</strong>
                </button>
                <span className="px-2 py-1 rounded-lg bg-slate-50 text-slate-700">
                  Pending GST: <strong>{kpis.pendingGstReturns}</strong>
                </span>
                <Link
                  href="/accountant/approvals"
                  className="px-2 py-1 rounded-lg bg-amber-50 text-amber-900 font-semibold hover:bg-amber-100"
                >
                  Approvals: <strong>{kpis.pendingApprovalsCount}</strong>
                </Link>
              </div>
            </div>
          </div>

          {/* Lower 3 Panels: Deadlines, Approvals, Audit Trail */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Statutory Filing Deadlines */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#EA580C]" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#071F38]">
                    GST & TDS Filing Deadlines
                  </h2>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">
                  {overview?.financialYear?.label}
                </span>
              </div>
              <div className="space-y-2">
                {overview?.filingDeadlines.map((d, idx) => (
                  <div
                    key={`${d.returnType}-${d.dueDate}-${idx}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div>
                      <p className="font-bold text-[#071F38]">
                        {d.returnType} · {d.periodLabel}
                      </p>
                      <p className="text-[10.5px] text-slate-500">Due {d.dueDate}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        d.statusHint === 'OVERDUE'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : d.statusHint === 'DUE_SOON'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {d.daysRemaining < 0
                        ? `${Math.abs(d.daysRemaining)}d overdue`
                        : `${d.daysRemaining}d left`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Approvals */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-[#EA580C]" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#071F38]">
                    Pending Owner Approvals
                  </h2>
                </div>
                <Link
                  href="/accountant/approvals"
                  className="text-[11px] font-bold text-[#EA580C] hover:underline"
                >
                  Open Inbox
                </Link>
              </div>
              {overview?.pendingApprovals.length === 0 ? (
                <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-slate-700">No pending approvals</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    GST filing & period lock approvals submitted by Accountant appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {overview?.pendingApprovals.slice(0, 5).map((req) => (
                    <div
                      key={req.id}
                      className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#071F38] truncate">{req.title}</span>
                        <span className="text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0">
                          {req.requestType}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-500 mt-1">
                        Requested by {req.requestedBy?.name} ({req.requestedBy?.email})
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Audit Events */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#00B887]" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#071F38]">
                    Recent Audit Activity
                  </h2>
                </div>
                <Link
                  href="/accountant/audit-trail"
                  className="text-[11px] font-bold text-[#EA580C] hover:underline"
                >
                  Full Log
                </Link>
              </div>
              {overview?.recentAuditEvents.length === 0 ? (
                <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70">
                  <Clock className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-slate-700">No audit events recorded yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Invites, role edits, switches, branches, and approvals are logged automatically.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {overview?.recentAuditEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#071F38] truncate">{ev.action}</span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(ev.createdAt).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-500 mt-0.5 truncate">
                        {ev.actorName || 'System'} ({ev.actorRole || 'ROLE'}) · {ev.entityType}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5" />
              {overview?.branchFilter?.branchTaggingNote}
            </span>
            <Link href="/accountant/settings" className="font-semibold text-slate-600 hover:underline">
              Manage Branches & FY →
            </Link>
          </div>
        </>
      )}

      {/* Drill-down Drawer / Modal */}
      {drilldownKey && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[82vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-[#071F38]">{drilldownTitle}</h3>
                <p className="text-[11px] text-slate-500">
                  Live records from PostgreSQL ({overview?.financialYear?.label})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrilldownKey(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 sm:p-5">
              {drilldownLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : drilldownRows.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  No records match this metric in the selected period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500">
                        {Object.keys(drilldownRows[0])
                          .filter((k) => k !== 'id')
                          .map((col) => (
                            <th key={col} className="py-2 pr-3 font-bold">
                              {col}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {drilldownRows.map((row, idx) => (
                        <tr key={(row.id as string) || idx} className="hover:bg-slate-50">
                          {Object.entries(row)
                            .filter(([k]) => k !== 'id')
                            .map(([k, v]) => (
                              <td key={k} className="py-2 pr-3 font-medium text-slate-700">
                                {typeof v === 'number'
                                  ? ['total', 'taxable', 'gst', 'balanceDue'].includes(k)
                                    ? formatInr(v)
                                    : v
                                  : String(v ?? '—')}
                              </td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

