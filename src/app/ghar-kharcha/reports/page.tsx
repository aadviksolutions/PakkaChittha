'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Calendar,
  Download,
  Filter,
  FileSpreadsheet,
  Printer,
  FileText,
  X,
  Search,
  ArrowRight,
  TrendingUp,
  PieChart,
  Users,
  Zap,
  CheckCircle2,
  RefreshCw,
  Info,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Tag,
} from 'lucide-react';
import { HouseholdSwitcher } from '@/components/household/HouseholdSwitcher';

interface ReportData {
  household: {
    id: string;
    name: string;
    currency: string;
  };
  generatedAt: string;
  kpis: {
    totalConsumptionExpenses: number;
    totalIncome: number;
    netCashFlow: number;
    monthlyBudget: number;
    remainingBudget: number;
    budgetUtilization: number;
  };
  reports: {
    monthlyExpenseSummary: {
      totalConsumptionExpenses: number;
      totalIncome: number;
      monthlyBudget: number;
      remainingBudget: number;
      budgetUtilization: number;
    };
    categoryWiseSummary: {
      name: string;
      icon: string;
      color: string;
      amount: number;
      percentage: number;
      count: number;
      subcategories: { name: string; amount: number }[];
    }[];
    monthlySpendingTrend: {
      month: string;
      income: number;
      expense: number;
      net: number;
    }[];
    memberWiseSummary: {
      memberId: string;
      name: string;
      email: string;
      role: string;
      totalExpensePaid: number;
      totalShareAllocated: number;
      settlementsPaid: number;
      settlementsReceived: number;
      netBalance: number;
      status: string;
    }[];
    personalVsSharedSummary: {
      personal: { total: number; count: number; percentage: number };
      shared: { total: number; count: number; percentage: number };
    };
    outstandingBalancesAndSettlements: {
      memberBalances: any[];
      suggestedSettlements: any[];
      recentSettlements: any[];
    };
    billsAndRechargeSummary: {
      totalBillExpenses: number;
      breakdown: {
        billType: string;
        label: string;
        icon: string;
        amount: number;
        count: number;
        providers: { provider: string; amount: number }[];
      }[];
    };
    customDateRangeReport: {
      periodStart: string;
      periodEnd: string;
      totalTransactions: number;
      totalExpenses: number;
      totalIncome: number;
      dailyAverageExpense: number;
    };
    itemizedTransactions?: Array<{
      id: string;
      date: string;
      dateTime: string;
      type: 'EXPENSE' | 'INCOME';
      categoryName: string;
      subcategory: string | null;
      amount: number;
      paymentMethod: string;
      description: string | null;
      payeeMerchant: string | null;
      notes: string | null;
      paidByName: string;
      isShared: boolean;
    }>;
  };
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => String(CURRENT_YEAR + 1 - i));

const MONTH_OPTIONS = [
  { value: '01', label: 'Jan (जनवरी)' },
  { value: '02', label: 'Feb (फ़रवरी)' },
  { value: '03', label: 'Mar (मार्च)' },
  { value: '04', label: 'Apr (अप्रैल)' },
  { value: '05', label: 'May (मई)' },
  { value: '06', label: 'Jun (जून)' },
  { value: '07', label: 'Jul (जुलाई)' },
  { value: '08', label: 'Aug (अगस्त)' },
  { value: '09', label: 'Sep (सितंबर)' },
  { value: '10', label: 'Oct (अक्टूबर)' },
  { value: '11', label: 'Nov (नवंबर)' },
  { value: '12', label: 'Dec (दिसंबर)' },
];

export default function HouseholdReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [month, setMonth] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(String(CURRENT_YEAR));
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [isSharedFilter, setIsSharedFilter] = useState<'ALL' | 'SHARED' | 'PERSONAL'>('ALL');
  const [billTypeFilter, setBillTypeFilter] = useState('');

  // Date-wise local filters
  const [dateWiseSearch, setDateWiseSearch] = useState('');
  const [dateWiseTypeFilter, setDateWiseTypeFilter] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');

  // Dropdown options
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);

  // Active view report tab
  const [activeReportTab, setActiveReportTab] = useState<number>(1);

  const fetchFiltersMetadata = async () => {
    try {
      const [catRes, memRes] = await Promise.all([
        fetch('/api/household/categories'),
        fetch('/api/household/members'),
      ]);
      const catJson = await catRes.json();
      const memJson = await memRes.json();
      if (catJson.success) setCategories(catJson.categories || []);
      if (memJson.success) setMembers(memJson.members || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (month) params.set('month', month);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (categoryId) params.set('categoryId', categoryId);
      if (memberId) params.set('memberId', memberId);
      if (billTypeFilter) params.set('billType', billTypeFilter);
      if (isSharedFilter === 'SHARED') params.set('isShared', 'true');
      if (isSharedFilter === 'PERSONAL') params.set('isShared', 'false');

      const hid = typeof window !== 'undefined' ? localStorage.getItem('active_household_id') : '';
      if (hid) params.set('householdId', hid);

      const res = await fetch(`/api/household/reports?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiltersMetadata();
    fetchReports();

    const handleHhChange = () => {
      fetchFiltersMetadata();
      fetchReports();
    };
    window.addEventListener('householdChanged', handleHhChange);
    return () => window.removeEventListener('householdChanged', handleHhChange);
  }, []);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReports();
  };

  const handleClearFilters = () => {
    setMonth('');
    setSelectedMonth('');
    setSelectedYear(String(CURRENT_YEAR));
    setStartDate('');
    setEndDate('');
    setCategoryId('');
    setMemberId('');
    setIsSharedFilter('ALL');
    setBillTypeFilter('');
    setTimeout(() => {
      fetch('/api/household/reports')
        .then((r) => r.json())
        .then((j) => {
          if (j.success) setData(j);
        });
    }, 50);
  };

  const buildExportUrl = (format: 'csv' | 'excel' | 'pdf') => {
    const params = new URLSearchParams();
    params.set('format', format);
    const hid = typeof window !== 'undefined' ? localStorage.getItem('active_household_id') : '';
    if (hid) params.set('householdId', hid);
    if (month) params.set('month', month);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (categoryId) params.set('categoryId', categoryId);
    if (memberId) params.set('memberId', memberId);
    if (billTypeFilter) params.set('billType', billTypeFilter);
    if (isSharedFilter === 'SHARED') params.set('isShared', 'true');
    if (isSharedFilter === 'PERSONAL') params.set('isShared', 'false');
    return `/api/household/export?${params.toString()}`;
  };

  const activeFiltersCount = [
    month,
    startDate,
    endDate,
    categoryId,
    memberId,
    billTypeFilter,
    isSharedFilter !== 'ALL',
  ].filter(Boolean).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/ghar-kharcha"
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
          >
            ← Back to Dashboard
          </Link>
          <div className="flex flex-wrap items-center gap-2.5 mt-1">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-emerald-600" />
              <span>Household Expense Reports &amp; Analytics</span>
            </h1>
            <HouseholdSwitcher
              activeHouseholdId={data?.household.id}
              onHouseholdChange={() => {
                fetchFiltersMetadata();
                fetchReports();
              }}
            />
          </div>
          <p className="text-xs text-slate-500 font-medium">
            8 accurate financial reports, spending trends, bill tracking, and multi-format exports (CSV, Excel, PDF).
          </p>
        </div>

        {/* Download Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={buildExportUrl('csv')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200/80 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </a>

          <a
            href={buildExportUrl('excel')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel (.xls)</span>
          </a>

          <a
            href={buildExportUrl('pdf')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print / PDF</span>
          </a>
        </div>
      </div>

      {/* FILTER DRAWER / ACCORDION */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-emerald-600" />
            <span>Advanced Report Filters</span>
            {activeFiltersCount > 0 && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {activeFiltersCount} active
              </span>
            )}
          </div>

          {activeFiltersCount > 0 && (
            <button
              onClick={handleClearFilters}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}
        </div>

        <form onSubmit={handleApplyFilters} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-bold text-slate-600 mb-1">Select Month &amp; Year (माह एवं वर्ष)</label>
            <div className="grid grid-cols-5 gap-1.5">
              <select
                value={selectedMonth}
                onChange={(e) => {
                  const m = e.target.value;
                  setSelectedMonth(m);
                  if (m) {
                    setMonth(`${selectedYear}-${m}`);
                  } else {
                    setMonth('');
                  }
                  setStartDate('');
                  setEndDate('');
                }}
                className="col-span-3 w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
              >
                <option value="">All Months (सभी)</option>
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => {
                  const y = e.target.value;
                  setSelectedYear(y);
                  if (selectedMonth) {
                    setMonth(`${y}-${selectedMonth}`);
                  }
                  setStartDate('');
                  setEndDate('');
                }}
                className="col-span-2 w-full px-2 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-600 mb-1">Custom Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setMonth('');
                setSelectedMonth('');
              }}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-600 mb-1">Custom End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setMonth('');
                setSelectedMonth('');
              }}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-600 mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-600 mb-1">Family Member</label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
            >
              <option value="">All Members</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-600 mb-1">Personal vs Shared</label>
            <select
              value={isSharedFilter}
              onChange={(e) => setIsSharedFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
            >
              <option value="ALL">All Expenses</option>
              <option value="SHARED">Shared Only</option>
              <option value="PERSONAL">Personal Only</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-600 mb-1">Bill / Utility Type</label>
            <select
              value={billTypeFilter}
              onChange={(e) => setBillTypeFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
            >
              <option value="">All Transactions</option>
              <option value="MOBILE_RECHARGE">Mobile Recharge</option>
              <option value="MOBILE_POSTPAID">Mobile Postpaid Bill</option>
              <option value="ELECTRICITY">Electricity Bill</option>
              <option value="WATER">Water Bill</option>
              <option value="GAS">LPG / Gas Bill</option>
              <option value="INTERNET">Internet / Broadband</option>
              <option value="DTH">DTH / Cable TV</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all cursor-pointer shadow-xs"
            >
              Apply Filters
            </button>
          </div>
        </form>
      </div>

      {/* TOP KPI STRIP */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Consumption Expenses
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-1">
              ₹{data.kpis.totalConsumptionExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Original expense sum (counted once)</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Household Income
            </div>
            <div className="text-lg sm:text-xl font-black text-emerald-700 mt-1">
              ₹{data.kpis.totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Recorded earnings &amp; salary</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Net Cash Flow
            </div>
            <div
              className={`text-lg sm:text-xl font-black mt-1 ${
                data.kpis.netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {data.kpis.netCashFlow >= 0 ? '+' : ''}₹{data.kpis.netCashFlow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Income minus expenses</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Remaining Budget
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-1">
              ₹{data.kpis.remainingBudget.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{data.kpis.budgetUtilization}% utilized</div>
          </div>
        </div>
      )}

      {/* 8 REPORT TABS */}
      <div className="flex flex-wrap border-b border-slate-200 gap-2 sm:gap-4 text-xs font-bold">
        {[
          { id: 9, label: '📅 9. Date-wise All Entries (तारीख अनुसार सभी खर्चे)', highlight: true },
          { id: 1, label: '1. Monthly Summary' },
          { id: 2, label: '2. Category Breakdown' },
          { id: 3, label: '3. Spending Trend' },
          { id: 4, label: '4. Member Shares' },
          { id: 5, label: '5. Personal vs Shared' },
          { id: 6, label: '6. Outstanding Balances' },
          { id: 7, label: '7. Bills & Recharge' },
          { id: 8, label: '8. Custom Range' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveReportTab(tab.id)}
            className={`pb-2.5 px-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeReportTab === tab.id
                ? 'border-emerald-600 text-emerald-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-900 font-semibold'
            } ${tab.highlight && activeReportTab !== tab.id ? 'text-emerald-800 bg-emerald-50/70 rounded-t-lg' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-200/80 text-center">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-400 font-medium">Generating reports...</p>
        </div>
      ) : !data ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200/80 text-center text-slate-400 text-xs">
          No report data found.
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
          {/* REPORT 1: MONTHLY SUMMARY */}
          {activeReportTab === 1 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  1. Monthly Household Expense Summary
                </h3>
                <p className="text-xs text-slate-500">
                  Comprehensive high-level view of monthly household cash flow and consumption expenditure.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="text-xs font-semibold text-slate-400">Monthly Budget Allocated</div>
                  <div className="text-xl font-black text-slate-900 mt-1">
                    ₹{data.reports.monthlyExpenseSummary.monthlyBudget.toFixed(2)}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80">
                  <div className="text-xs font-semibold text-rose-500">Total Consumption Expenses</div>
                  <div className="text-xl font-black text-rose-700 mt-1">
                    ₹{data.reports.monthlyExpenseSummary.totalConsumptionExpenses.toFixed(2)}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80">
                  <div className="text-xs font-semibold text-emerald-600">Remaining Budget Balance</div>
                  <div className="text-xl font-black text-emerald-700 mt-1">
                    ₹{data.reports.monthlyExpenseSummary.remainingBudget.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700">Budget Utilization</span>
                  <span className="text-emerald-700">{data.reports.monthlyExpenseSummary.budgetUtilization}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      data.reports.monthlyExpenseSummary.budgetUtilization > 90
                        ? 'bg-rose-500'
                        : 'bg-emerald-600'
                    }`}
                    style={{ width: `${Math.min(100, data.reports.monthlyExpenseSummary.budgetUtilization)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* REPORT 2: CATEGORY-WISE SUMMARY */}
          {activeReportTab === 2 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  2. Category-Wise Expense Summary
                </h3>
                <p className="text-xs text-slate-500">
                  Breakdown of household consumption spending across categories with subcategory drilldown.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">Amount (INR)</th>
                      <th className="py-2.5 px-3 text-right">Share %</th>
                      <th className="py-2.5 px-3 text-right">Transactions</th>
                      <th className="py-2.5 px-3">Subcategories Breakdown</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.reports.categoryWiseSummary.map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-600" />
                          <span>{c.name}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-900">
                          ₹{c.amount.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-600">
                          {c.percentage}%
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-500">
                          {c.count}
                        </td>
                        <td className="py-3 px-3">
                          {c.subcategories.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {c.subcategories.map((sub, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold"
                                >
                                  {sub.name}: ₹{sub.amount.toFixed(0)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[10px] italic">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORT 3: SPENDING TREND */}
          {activeReportTab === 3 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  3. Month-Wise Spending Trend
                </h3>
                <p className="text-xs text-slate-500">
                  Chronological spending timeline comparing income, expenses, and net cash flow across periods.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Month</th>
                      <th className="py-2.5 px-3 text-right">Income (INR)</th>
                      <th className="py-2.5 px-3 text-right">Expense (INR)</th>
                      <th className="py-2.5 px-3 text-right">Net Savings (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.reports.monthlySpendingTrend.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-bold text-slate-900">{m.month}</td>
                        <td className="py-3 px-3 text-right font-black text-emerald-700">
                          ₹{m.income.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-rose-700">
                          ₹{m.expense.toFixed(2)}
                        </td>
                        <td
                          className={`py-3 px-3 text-right font-black ${
                            m.net >= 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {m.net >= 0 ? '+' : ''}₹{m.net.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORT 4: MEMBER-WISE SHARES */}
          {activeReportTab === 4 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  4. Member-Wise Allocated Share &amp; Contribution Summary
                </h3>
                <p className="text-xs text-slate-500">
                  Financial auditing showing what each family member paid versus their allocated consumption share.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Family Member</th>
                      <th className="py-2.5 px-3 text-right">Payments Contributed</th>
                      <th className="py-2.5 px-3 text-right">Allocated Share</th>
                      <th className="py-2.5 px-3 text-right">Repayments Sent</th>
                      <th className="py-2.5 px-3 text-right">Repayments Recv</th>
                      <th className="py-2.5 px-3 text-right">Net Balance</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.reports.memberWiseSummary.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{m.name}</div>
                          <div className="text-[10px] text-slate-400">{m.email}</div>
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-900">
                          ₹{m.totalExpensePaid.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-700">
                          ₹{m.totalShareAllocated.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-600">
                          ₹{m.settlementsPaid.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-600">
                          ₹{m.settlementsReceived.toFixed(2)}
                        </td>
                        <td
                          className={`py-3 px-3 text-right font-black ${
                            m.netBalance > 0.005
                              ? 'text-emerald-700'
                              : m.netBalance < -0.005
                              ? 'text-rose-600'
                              : 'text-slate-800'
                          }`}
                        >
                          {m.netBalance > 0.005
                            ? `+₹${m.netBalance.toFixed(2)}`
                            : m.netBalance < -0.005
                            ? `-₹${Math.abs(m.netBalance).toFixed(2)}`
                            : '₹0.00'}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              m.status === 'RECEIVABLE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : m.status === 'PAYABLE'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {m.status === 'RECEIVABLE'
                              ? 'Receivable (Owed)'
                              : m.status === 'PAYABLE'
                              ? 'Payable (Owes)'
                              : 'Settled'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORT 5: PERSONAL VS SHARED */}
          {activeReportTab === 5 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  5. Personal versus Shared Expense Summary
                </h3>
                <p className="text-xs text-slate-500">
                  Separation of individual personal expenses versus family shared split expenses.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-indigo-800">
                      Shared Family Expenses
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-200 text-indigo-900">
                      {data.reports.personalVsSharedSummary.shared.percentage}% of total
                    </span>
                  </div>
                  <div className="text-2xl font-black text-indigo-950">
                    ₹{data.reports.personalVsSharedSummary.shared.total.toFixed(2)}
                  </div>
                  <div className="text-xs text-indigo-600 font-medium">
                    {data.reports.personalVsSharedSummary.shared.count} shared transactions split among members
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                      Personal Individual Expenses
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                      {data.reports.personalVsSharedSummary.personal.percentage}% of total
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    ₹{data.reports.personalVsSharedSummary.personal.total.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    {data.reports.personalVsSharedSummary.personal.count} individual personal transactions
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* REPORT 6: OUTSTANDING BALANCES & SETTLEMENTS */}
          {activeReportTab === 6 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  6. Outstanding Balances &amp; Settlements
                </h3>
                <p className="text-xs text-slate-500">
                  Current debt settlements required and historical repayment logs between family members.
                </p>
              </div>

              {data.reports.outstandingBalancesAndSettlements.suggestedSettlements.length > 0 ? (
                <div>
                  <h4 className="font-bold text-xs text-slate-700 mb-2">Pending Repayments</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {data.reports.outstandingBalancesAndSettlements.suggestedSettlements.map((s: any, idx: number) => (
                      <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            <span className="text-rose-600">{s.fromName}</span> owes{' '}
                            <span className="text-emerald-700">{s.toName}</span>
                          </div>
                          <div className="text-sm font-black text-slate-900 mt-0.5">
                            ₹{s.amount.toFixed(2)}
                          </div>
                        </div>
                        <Link
                          href="/ghar-kharcha/splits"
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px]"
                        >
                          Settle Now
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>All shared expenses are completely balanced and settled! Zero outstanding debt.</span>
                </div>
              )}
            </div>
          )}

          {/* REPORT 7: BILLS & UTILITY RECHARGE SUMMARY */}
          {activeReportTab === 7 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  7. Mobile Recharge &amp; Utility-Bill Summary
                </h3>
                <p className="text-xs text-slate-500">
                  Expenditure on electricity, mobile recharges, water, gas, broadband, and DTH.
                </p>
              </div>

              <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl flex items-center justify-between">
                <span className="font-bold text-xs text-amber-900">Total Utility Bills &amp; Recharges Paid:</span>
                <span className="text-lg font-black text-amber-900">
                  ₹{data.reports.billsAndRechargeSummary.totalBillExpenses.toFixed(2)}
                </span>
              </div>

              {data.reports.billsAndRechargeSummary.breakdown.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {data.reports.billsAndRechargeSummary.breakdown.map((b, idx) => (
                    <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">{b.label}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{b.count} bills</span>
                      </div>
                      <div className="text-base font-black text-slate-900">₹{b.amount.toFixed(2)}</div>
                      {b.providers.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/60 text-[10px] text-slate-500">
                          {b.providers.map((p, pIdx) => (
                            <div key={pIdx} className="flex justify-between">
                              <span>{p.provider}</span>
                              <span className="font-bold">₹{p.amount.toFixed(0)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No utility bill transactions recorded in this period.
                </div>
              )}
            </div>
          )}

          {/* REPORT 8: CUSTOM DATE-RANGE REPORT */}
          {activeReportTab === 8 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  8. Custom Date-Range Report
                </h3>
                <p className="text-xs text-slate-500">
                  Metrics tailored to the active custom start and end date range.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Period Start</div>
                  <div className="text-sm font-black text-slate-900 mt-0.5">
                    {data.reports.customDateRangeReport.periodStart}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Period End</div>
                  <div className="text-sm font-black text-slate-900 mt-0.5">
                    {data.reports.customDateRangeReport.periodEnd}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Total Transactions</div>
                  <div className="text-sm font-black text-slate-900 mt-0.5">
                    {data.reports.customDateRangeReport.totalTransactions}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Daily Average Spend</div>
                  <div className="text-sm font-black text-emerald-700 mt-0.5">
                    ₹{data.reports.customDateRangeReport.dailyAverageExpense.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* REPORT 9: DATE-WISE DETAILED LEDGER (ALL EXPENSES & INCOME) */}
          {activeReportTab === 9 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                    <span>9. Date-wise All Entries (तारीख अनुसार सभी खर्चे व आय)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Complete itemized record of all individual transactions for the selected period. Fuel, grocery, bills, salary — all entries shown date-wise.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={buildExportUrl('csv')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </a>
                  <a
                    href={buildExportUrl('excel')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300 transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Excel (.xls)</span>
                  </a>
                  <a
                    href={buildExportUrl('pdf')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </a>
                </div>
              </div>

              {/* Local Search & Type Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-2 items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={dateWiseSearch}
                    onChange={(e) => setDateWiseSearch(e.target.value)}
                    placeholder="Search e.g. petrol, fuel, milk, rent..."
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
                  />
                  {dateWiseSearch && (
                    <button
                      type="button"
                      onClick={() => setDateWiseSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  {(['ALL', 'EXPENSE', 'INCOME'] as const).map((tFilter) => (
                    <button
                      key={tFilter}
                      type="button"
                      onClick={() => setDateWiseTypeFilter(tFilter)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        dateWiseTypeFilter === tFilter
                          ? tFilter === 'EXPENSE'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : tFilter === 'INCOME'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-900 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {tFilter === 'ALL' ? 'All Entries' : tFilter === 'EXPENSE' ? 'Expenses Only' : 'Income Only'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtered Transactions List */}
              {(() => {
                const list = (data.reports.itemizedTransactions || []).filter((tx) => {
                  if (dateWiseTypeFilter !== 'ALL' && tx.type !== dateWiseTypeFilter) return false;
                  if (dateWiseSearch) {
                    const q = dateWiseSearch.toLowerCase();
                    const matchCat = tx.categoryName.toLowerCase().includes(q);
                    const matchSub = (tx.subcategory || '').toLowerCase().includes(q);
                    const matchDesc = (tx.description || '').toLowerCase().includes(q);
                    const matchNotes = (tx.notes || '').toLowerCase().includes(q);
                    const matchMerchant = (tx.payeeMerchant || '').toLowerCase().includes(q);
                    const matchPayer = tx.paidByName.toLowerCase().includes(q);
                    if (!matchCat && !matchSub && !matchDesc && !matchNotes && !matchMerchant && !matchPayer) {
                      return false;
                    }
                  }
                  return true;
                });

                const totalExpInList = list.filter((x) => x.type === 'EXPENSE').reduce((sum, x) => sum + x.amount, 0);
                const totalIncInList = list.filter((x) => x.type === 'INCOME').reduce((sum, x) => sum + x.amount, 0);

                if (list.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      No matching transactions found for this period or search query.
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between text-xs font-bold text-slate-600 px-1">
                      <span>Showing {list.length} itemized transaction{list.length > 1 ? 's' : ''}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-rose-600">Total Expense: ₹{totalExpInList.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        {totalIncInList > 0 && (
                          <span className="text-emerald-700">Total Income: ₹{totalIncInList.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        )}
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3">Category &amp; Item</th>
                            <th className="py-2.5 px-3">Description / Merchant</th>
                            <th className="py-2.5 px-3">Paid By</th>
                            <th className="py-2.5 px-3">Mode</th>
                            <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                          {list.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 font-semibold text-slate-600 whitespace-nowrap">
                                {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  tx.type === 'INCOME' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {tx.type === 'INCOME' ? '+' : '-'} {tx.type}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900">{tx.categoryName}</div>
                                {tx.subcategory && (
                                  <div className="text-[10.5px] text-slate-400">{tx.subcategory}</div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 max-w-[200px] truncate text-slate-600">
                                {tx.payeeMerchant || tx.description || tx.notes || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                                {tx.paidByName}
                              </td>
                              <td className="py-2.5 px-3 text-[11px] text-slate-500 whitespace-nowrap">
                                {tx.paymentMethod}
                              </td>
                              <td className={`py-2.5 px-3 text-right font-black whitespace-nowrap ${
                                tx.type === 'INCOME' ? 'text-emerald-700' : 'text-slate-900'
                              }`}>
                                {tx.type === 'INCOME' ? '+' : ''}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
