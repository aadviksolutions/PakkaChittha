'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import {
  BarChart3,
  Calendar,
  Download,
  TrendingUp,
  Receipt,
  RotateCcw,
  Users,
  Building2,
  RefreshCw,
  PieChart,
} from 'lucide-react';

interface ReportData {
  period: {
    range: string;
    startDate: string;
    endDate: string;
  };
  financials: {
    grossCollections: number;
    refundsTotal: number;
    netCollections: number;
    currentMRR: number;
    revenueByPlan: Record<string, number>;
    revenueByGateway: Record<string, number>;
    successfulPaymentsCount: number;
    pendingPaymentsCount: number;
    failedPaymentsCount: number;
  };
  growth: {
    newUsersCount: number;
    newBusinessesCount: number;
    newFreeKhataCount: number;
    planDistribution: Record<string, number>;
  };
}

export default function PlatformAdminReportsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportData | null>(null);
  const [dateRange, setDateRange] = useState('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    if (dateRange !== 'custom' || (customStart && customEnd)) {
      fetchReports();
    }
  }, [dateRange, customStart, customEnd]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ range: dateRange });
      if (dateRange === 'custom') {
        params.set('startDate', customStart);
        params.set('endDate', customEnd);
      }

      const res = await fetch(`/api/platform-admin/reports?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load reports');
      const json = await res.json();
      setData(json);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error fetching reports');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!data) return;
    const csvContent = [
      ['Metric', 'Value'],
      ['Period', data.period.range],
      ['Start Date', data.period.startDate],
      ['End Date', data.period.endDate],
      ['Gross Collections (INR)', data.financials.grossCollections],
      ['Refunds Total (INR)', data.financials.refundsTotal],
      ['Net Collections (INR)', data.financials.netCollections],
      ['Current MRR (INR)', data.financials.currentMRR],
      ['Successful Payments', data.financials.successfulPaymentsCount],
      ['Pending Payments', data.financials.pendingPaymentsCount],
      ['Failed Payments', data.financials.failedPaymentsCount],
      ['New Users in Period', data.growth.newUsersCount],
      ['New Businesses in Period', data.growth.newBusinessesCount],
      ['New Free Khata in Period', data.growth.newFreeKhataCount],
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `pakka_chittha_financial_report_${data.period.range}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported to CSV');
  };

  const f = data?.financials;
  const g = data?.growth;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Revenue & Platform Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Reconciled collections, MRR tracking, plan distributions, and registration trends.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            onClick={exportCSV}
            disabled={!data || loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={fetchReports}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Date Range Selector Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center gap-2 text-xs">
        {[
          { key: 'today', label: 'Today' },
          { key: '7d', label: 'Last 7 Days' },
          { key: '30d', label: 'Last 30 Days' },
          { key: 'this_month', label: 'This Month' },
          { key: 'last_month', label: 'Previous Month' },
          { key: 'custom', label: 'Custom Range' },
        ].map((btn) => (
          <button
            key={btn.key}
            onClick={() => setDateRange(btn.key)}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              dateRange === btn.key
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {btn.label}
          </button>
        ))}

        {dateRange === 'custom' && (
          <div className="flex items-center gap-2 ml-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800"
            />
          </div>
        )}
      </div>

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Gross Collections</span>
          <span className="text-2xl font-black text-slate-900 block my-1">
            {loading ? '...' : `₹${(f?.grossCollections || 0).toLocaleString('en-IN')}`}
          </span>
          <span className="text-[11px] text-slate-500">
            {f?.successfulPaymentsCount || 0} successful charges
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Refunds Total</span>
          <span className="text-2xl font-black text-red-600 block my-1">
            {loading ? '...' : `₹${(f?.refundsTotal || 0).toLocaleString('en-IN')}`}
          </span>
          <span className="text-[11px] text-slate-500">Reversals & chargebacks</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Net Collections</span>
          <span className="text-2xl font-black text-emerald-600 block my-1">
            {loading ? '...' : `₹${(f?.netCollections || 0).toLocaleString('en-IN')}`}
          </span>
          <span className="text-[11px] text-emerald-700 font-semibold">Realized cash in period</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Active Platform MRR</span>
          <span className="text-2xl font-black text-slate-900 block my-1">
            {loading ? '...' : `₹${(f?.currentMRR || 0).toLocaleString('en-IN')}`}
          </span>
          <span className="text-[11px] text-slate-500">Contracted monthly baseline</span>
        </div>
      </div>

      {/* Grids: Revenue Breakdown by Plan & Gateway */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Plan Tier */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span>Revenue by Subscription Package</span>
          </h2>

          <div className="space-y-3 text-xs">
            {[
              { key: 'STARTER', label: 'Pakka Chittha Starter (₹199)', amount: f?.revenueByPlan?.STARTER || 0, color: 'bg-amber-500' },
              { key: 'GROWTH_PRO', label: 'Pakka Chittha Growth (₹499)', amount: f?.revenueByPlan?.GROWTH_PRO || 0, color: 'bg-emerald-500' },
              { key: 'ENTERPRISE', label: 'Pakka Chittha Scale (₹999)', amount: f?.revenueByPlan?.ENTERPRISE || 0, color: 'bg-purple-500' },
            ].map((plan) => {
              const totalGross = f?.grossCollections || 1;
              const pct = ((plan.amount / totalGross) * 100).toFixed(1);

              return (
                <div key={plan.key} className="space-y-1">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-800">{plan.label}</span>
                    <span className="text-slate-900 font-bold">₹{plan.amount.toLocaleString('en-IN')} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full ${plan.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Growth & Plan Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-purple-600" />
            <span>Platform Subscriber Distribution</span>
          </h2>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
              <span className="text-blue-800 text-[11px] block">Free Khata</span>
              <span className="text-xl font-black text-blue-950">
                {g?.planDistribution?.FREE_KHATA || 0}
              </span>
              <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">Permanent Free</span>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl">
              <span className="text-amber-800 text-[11px] block">Starter</span>
              <span className="text-xl font-black text-amber-950">
                {g?.planDistribution?.STARTER || 0}
              </span>
              <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">₹199/month</span>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
              <span className="text-emerald-800 text-[11px] block">Growth</span>
              <span className="text-xl font-black text-emerald-950">
                {g?.planDistribution?.GROWTH_PRO || 0}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">₹499/month</span>
            </div>

            <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl">
              <span className="text-purple-800 text-[11px] block">Scale</span>
              <span className="text-xl font-black text-purple-950">
                {g?.planDistribution?.ENTERPRISE || 0}
              </span>
              <span className="text-[10px] text-purple-600 font-semibold block mt-0.5">₹999/month</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>New Users in Period: <strong>{g?.newUsersCount || 0}</strong></span>
            <span>New Free Khata: <strong>{g?.newFreeKhataCount || 0}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
