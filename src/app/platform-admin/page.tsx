'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/context/ToastContext';
import {
  Users,
  Building2,
  BookOpen,
  CreditCard,
  Receipt,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Layers,
  Sparkles,
  Home,
} from 'lucide-react';

interface OverviewData {
  kpis: {
    totalUsers: number;
    totalBusinesses: number;
    activeUsers: number;
    activePaidSubscriptions: number;
    freeKhataAccounts: number;
    trialWorkspaces: number;
    suspendedWorkspaces: number;
    pendingPayments: number;
    successfulPayments: number;
    failedPayments: number;
    renewalsDue: number;
    monthlyRecurringRevenue: number;
    grossRevenue: number;
    totalRefunds: number;
    netCollections: number;
    totalInvoices: number;
    totalKhataTransactions: number;
    totalHouseholds?: number;
    activeHouseholds?: number;
    totalHouseholdMembers?: number;
    totalHouseholdTransactions?: number;
  };
  recentAuditLogs: Array<{
    id: string;
    adminName: string;
    adminEmail: string;
    action: string;
    targetType: string;
    targetName: string | null;
    reason: string | null;
    outcome: string;
    createdAt: string;
  }>;
  recentUsers: Array<{
    id: string;
    name: string;
    email: string;
    platformRole: string;
    isSuspended: boolean;
    createdAt: string;
  }>;
}

export default function PlatformAdminOverviewPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OverviewData | null>(null);

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/platform-admin/overview');
      if (!res.ok) throw new Error('Failed to load platform overview');
      const json = await res.json();
      setData(json);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error fetching overview');
    } finally {
      setLoading(false);
    }
  };

  const kpis = data?.kpis;

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Platform Overview & Command Center</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              Live Neon DB
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative multi-tenant metrics, subscription revenue, payment audits, and platform controls.
          </p>
        </div>

        <button
          onClick={fetchOverview}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs self-start transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Security Architecture Box */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#071F38] to-[#0A2E52] border border-slate-800 text-white shadow-sm flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-[#00B887] shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-bold text-[#00B887] uppercase tracking-wider text-[11px]">
            Super Admin Authoritative Boundary
          </div>
          <p className="text-slate-300 leading-relaxed">
            All statistics shown below are derived in real-time from active PostgreSQL records. Client requests cannot bypass server-side entitlement checks or forge payment confirmations.
          </p>
        </div>
      </div>

      {/* Primary Financial & Volume KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Monthly Recurring Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {loading ? '...' : `₹${(kpis?.monthlyRecurringRevenue || 0).toLocaleString('en-IN')}`}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              from {kpis?.activePaidSubscriptions || 0} active paid subscriptions
            </span>
          </div>
          <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 pt-2 border-t border-slate-100">
            <span>₹199 Starter • ₹499 Growth • ₹999 Scale</span>
          </div>
        </div>

        {/* Total Collections */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Net Collections</span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {loading ? '...' : `₹${(kpis?.netCollections || 0).toLocaleString('en-IN')}`}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Gross: ₹{(kpis?.grossRevenue || 0).toLocaleString('en-IN')} (Refunds: ₹{(kpis?.totalRefunds || 0).toLocaleString('en-IN')})
            </span>
          </div>
          <div className="text-[11px] text-slate-600 font-medium flex items-center justify-between pt-2 border-t border-slate-100">
            <span>Successful: {kpis?.successfulPayments || 0}</span>
            <span className="text-amber-600 font-semibold">Pending: {kpis?.pendingPayments || 0}</span>
          </div>
        </div>

        {/* Free Khata Accounts */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Free Khata Accounts</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {loading ? '...' : (kpis?.freeKhataAccounts || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-blue-600 font-semibold block mt-0.5">
              Permanently Free Ledger Tier
            </span>
          </div>
          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            {kpis?.totalKhataTransactions || 0} ledger transactions recorded
          </div>
        </div>

        {/* Total Workspaces */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Workspaces & Users</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {loading ? '...' : (kpis?.totalBusinesses || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              {kpis?.totalUsers || 0} total registered platform users
            </span>
          </div>
          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Active: {kpis?.activeUsers || 0}</span>
            <span className="text-red-500 font-medium">Suspended: {kpis?.suspendedWorkspaces || 0}</span>
          </div>
        </div>
      </div>

      {/* Secondary Operational Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs text-xs">
        <div>
          <span className="text-slate-500 block text-[11px]">Renewals Due (&lt; 14d)</span>
          <span className="font-extrabold text-base text-amber-700">
            {loading ? '...' : kpis?.renewalsDue || 0}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[11px]">Trial Workspaces</span>
          <span className="font-extrabold text-base text-slate-800">
            {loading ? '...' : kpis?.trialWorkspaces || 0}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[11px]">Commercial Invoices</span>
          <span className="font-extrabold text-base text-slate-800">
            {loading ? '...' : (kpis?.totalInvoices || 0).toLocaleString('en-IN')}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[11px]">Payment Failure Rate</span>
          <span className="font-extrabold text-base text-slate-800">
            {loading
              ? '...'
              : `${(
                  ((kpis?.failedPayments || 0) /
                    Math.max(1, (kpis?.successfulPayments || 0) + (kpis?.failedPayments || 0))) *
                  100
                ).toFixed(1)}%`}
          </span>
        </div>
      </div>

      {/* Ghar Kharcha Household Telemetry Card (Platform Overview) */}
      <div className="bg-gradient-to-r from-emerald-950 to-slate-900 text-white p-5 rounded-3xl border border-emerald-800/60 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-2">
                <span>PakkaChittha Ghar Kharcha • Platform Telemetry</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">
                  Free Household
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Aggregate adoption &amp; collaboration metrics (Zero private financial descriptions exposed)
              </p>
            </div>
          </div>
          <Link
            href="/ghar-kharcha"
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 self-start sm:self-center"
          >
            Preview Household Mode →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Registered Households</span>
            <span className="font-extrabold text-base sm:text-lg text-white">
              {loading ? '...' : (kpis?.totalHouseholds || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Active Family Ledgers</span>
            <span className="font-extrabold text-base sm:text-lg text-emerald-400">
              {loading ? '...' : (kpis?.activeHouseholds || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Family Collaborators</span>
            <span className="font-extrabold text-base sm:text-lg text-white">
              {loading ? '...' : (kpis?.totalHouseholdMembers || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Recorded Entries</span>
            <span className="font-extrabold text-base sm:text-lg text-white">
              {loading ? '...' : (kpis?.totalHouseholdTransactions || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/platform-admin/users"
          className="group bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-emerald-300 hover:shadow-sm transition-all flex items-start gap-3.5"
        >
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <Users className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900">User Management</span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-emerald-600 transition-all" />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Search directory, suspend/reactivate accounts, correct plan assignments.
            </p>
          </div>
        </Link>

        <Link
          href="/platform-admin/payments"
          className="group bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-teal-300 hover:shadow-sm transition-all flex items-start gap-3.5"
        >
          <div className="p-3 rounded-xl bg-teal-50 text-teal-700 group-hover:bg-teal-600 group-hover:text-white transition-colors">
            <Receipt className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900">Payments & Collections</span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-teal-600 transition-all" />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Track successful, pending and failed SaaS transactions. Manual reconciliation workflow.
            </p>
          </div>
        </Link>

        <Link
          href="/platform-admin/free-khata"
          className="group bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-blue-300 hover:shadow-sm transition-all flex items-start gap-3.5"
        >
          <div className="p-3 rounded-xl bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900">Free Khata Control</span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-blue-600 transition-all" />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Permanent free ledger metrics, abuse monitoring, and contact counts.
            </p>
          </div>
        </Link>
      </div>

      {/* Split Grids: Recent Activity & Recent Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Audit Log Feed */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h2 className="font-bold text-sm text-slate-900">Recent Platform Audit Log</h2>
            </div>
            <Link
              href="/platform-admin/audit-logs"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              View All Logs &rarr;
            </Link>
          </div>

          <div className="space-y-2.5">
            {(!data?.recentAuditLogs || data.recentAuditLogs.length === 0) ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
                No recent administrative actions recorded.
              </div>
            ) : (
              data.recentAuditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{log.action}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-mono">
                        {log.targetType}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Target: {log.targetName || 'N/A'} • {log.reason || 'No reason provided'}
                    </p>
                    <span className="text-[10px] text-slate-400">By {log.adminName} ({log.adminEmail})</span>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Platform Registrations */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              <h2 className="font-bold text-sm text-slate-900">Recent User Registrations</h2>
            </div>
            <Link
              href="/platform-admin/users"
              className="text-xs font-semibold text-purple-700 hover:text-purple-800"
            >
              View Directory &rarr;
            </Link>
          </div>

          <div className="space-y-2.5">
            {(!data?.recentUsers || data.recentUsers.length === 0) ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
                No recent user registrations.
              </div>
            ) : (
              data.recentUsers.map((u) => (
                <div
                  key={u.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{u.name}</span>
                      {u.isSuspended && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-100 text-red-700 font-bold">
                          SUSPENDED
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500">{u.email}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(u.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
