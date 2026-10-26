'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Landmark,
  PlusCircle,
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  DollarSign,
  AlertCircle,
  Receipt,
  Sparkles,
  PieChart,
  Home,
  CheckCircle2,
  X,
  CreditCard,
  Scale,
  BarChart3,
} from 'lucide-react';
import { useTranslation } from '@/i18n/context';
import { LanguageSelector } from '@/components/shared/LanguageSelector';

interface DashboardData {
  monthYear: string;
  currency: string;
  authContext: {
    householdId: string;
    householdName: string;
    currency: string;
    role: string;
  };
  kpis: {
    totalIncome: number;
    totalExpenses: number;
    netCashFlow: number;
    monthlyBudget: number;
    remainingBudget: number;
    budgetUtilization: number;
    isBudgetExceeded: boolean;
    previousMonth: {
      totalIncome: number;
      totalExpenses: number;
      expenseChangePercent: number;
      incomeChangePercent: number;
    };
  };
  categoryBreakdown: Array<{
    name: string;
    amount: number;
    count: number;
    percent: number;
    icon?: string;
    color?: string;
  }>;
  dailyTrend: Array<{
    day: number;
    dateStr: string;
    income: number;
    expense: number;
  }>;
  recentTransactions: Array<{
    id: string;
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    categoryName: string;
    date: string;
    paymentMethod: string;
    description: string | null;
    payeeMerchant: string | null;
    createdByName: string;
  }>;
}

export default function GharKharchaDashboardPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Month navigation (e.g. "2026-10")
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );

  // Quick Add Transaction Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [txType, setTxType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [txAmount, setTxAmount] = useState('');
  const [txCategoryName, setTxCategoryName] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txPaymentMethod, setTxPaymentMethod] = useState('CASH');
  const [txDescription, setTxDescription] = useState('');
  const [txPayee, setTxPayee] = useState('');
  const [submittingTx, setSubmittingTx] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; type: string }>>([]);

  const formatInr = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const fetchDashboard = useCallback(async (monthYear: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/household/dashboard?month=${monthYear}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        if (json.error && json.error.includes('No active household')) {
          router.push('/ghar-kharcha/setup');
          return;
        }
        throw new Error(json.error || 'Failed to load household dashboard');
      }

      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching dashboard');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchDashboard(selectedMonth);
  }, [selectedMonth, fetchDashboard]);

  // Load categories for Quick Add
  useEffect(() => {
    fetch('/api/household/categories')
      .then((r) => r.json())
      .then((json) => {
        if (json.categories) setCategories(json.categories);
      })
      .catch(() => {});
  }, []);

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(Date.UTC(y, m - 2, 1));
    setSelectedMonth(
      `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, '0')}`
    );
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(Date.UTC(y, m, 1));
    setSelectedMonth(
      `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, '0')}`
    );
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAmount || parseFloat(txAmount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    setSubmittingTx(true);
    try {
      const res = await fetch('/api/household/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: txType,
          amount: parseFloat(txAmount),
          categoryName: txCategoryName || (txType === 'INCOME' ? 'Salary' : 'Grocery & Ration'),
          date: txDate,
          paymentMethod: txPaymentMethod,
          description: txDescription,
          payeeMerchant: txPayee,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to record entry.');
      }

      setShowAddModal(false);
      setTxAmount('');
      setTxDescription('');
      setTxPayee('');
      fetchDashboard(selectedMonth);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error adding transaction');
    } finally {
      setSubmittingTx(false);
    }
  };

  // Format month for display
  const displayMonthLabel = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1, 1));
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  };

  if (loading && !data) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Loading Ghar Kharcha...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-3xl border border-rose-200 text-center shadow-lg">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">Unable to load Household</h3>
        <p className="text-xs text-slate-500 mt-1 mb-5">{error}</p>
        <Link
          href="/ghar-kharcha/setup"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all"
        >
          <Home className="w-4 h-4" />
          <span>Set Up Household</span>
        </Link>
      </div>
    );
  }

  const kpis = data?.kpis;
  const filteredCategories = categories.filter((c) => c.type === txType);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Controls */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              PakkaChittha {t('gharKharcha.title')}
            </span>
            <span className="text-xs font-bold text-slate-400">• 100% Free Family Ledger</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <span>{data?.authContext.householdName || 'My Household'}</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            "{t('gharKharcha.tagline')}" • Collaborating as{' '}
            <strong className="text-slate-700 uppercase">{data?.authContext.role}</strong>
          </p>
        </div>

        {/* Right side: Month Picker & Quick Add Action */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Language Selector */}
          <LanguageSelector variant="compact" />

          {/* Month selector with prev/next */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors cursor-pointer"
              title="Previous Month"
              aria-label="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 text-xs font-bold text-slate-800 min-w-[110px] text-center select-none">
              {displayMonthLabel()}
            </div>
            <button
              onClick={handleNextMonth}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors cursor-pointer"
              title="Next Month"
              aria-label="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Add Button */}
          {data?.authContext.role !== 'VIEWER' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('gharKharcha.addExpense')}</span>
            </button>
          )}

          {/* Splits Button */}
          <Link
            href="/ghar-kharcha/splits"
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all shadow-2xs"
            title="Family expense splits & settlements"
          >
            <Scale className="w-4 h-4 text-indigo-600" />
            <span className="hidden sm:inline">{t('gharKharcha.splitExpense')}</span>
          </Link>

          {/* Reports Button */}
          <Link
            href="/ghar-kharcha/reports"
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all shadow-2xs"
            title="Reports, trends & exports"
          >
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">{t('reports.title')}</span>
          </Link>

          {/* Invite Family Button */}
          <Link
            href="/ghar-kharcha/members"
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all shadow-2xs"
          >
            <Users className="w-4 h-4 text-slate-600" />
            <span>{t('gharKharcha.familyMembers')}</span>
          </Link>
        </div>
      </div>

      {/* 2. Primary KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Income Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Income</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              {formatInr(kpis?.totalIncome || 0)}
            </div>
          </div>
          <div className="mt-2 text-[10.5px] font-medium text-slate-400 flex items-center gap-1">
            <span>Aamad (Salary, Rent, etc.)</span>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t('gharKharcha.totalExpenses')}</span>
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              {formatInr(kpis?.totalExpenses || 0)}
            </div>
          </div>
          <div className="mt-2 text-[10.5px] font-medium text-slate-400 flex items-center gap-1">
            <span>Kul Kharcha</span>
          </div>
        </div>

        {/* Net Cash Flow Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t('freeKhata.netBalance')}</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-lg sm:text-2xl font-black tracking-tight mt-0.5 ${
              (kpis?.netCashFlow || 0) >= 0 ? 'text-indigo-900' : 'text-rose-600'
            }`}>
              {formatInr(kpis?.netCashFlow || 0)}
            </div>
          </div>
          <div className="mt-2 text-[10.5px] font-medium text-slate-400">
            <span>Income minus Expenses</span>
          </div>
        </div>

        {/* Monthly Budget Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t('gharKharcha.monthlyBudget')}</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Landmark className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              {kpis?.monthlyBudget ? formatInr(kpis.monthlyBudget) : 'Not Set'}
            </div>
          </div>

          {/* Progress Bar & Status */}
          <div className="mt-2">
            {kpis?.monthlyBudget && kpis.monthlyBudget > 0 ? (
              <div>
                <div className="flex items-center justify-between text-[10.5px] font-bold mb-1">
                  <span className={kpis.isBudgetExceeded ? 'text-rose-600' : 'text-emerald-700'}>
                    {kpis.isBudgetExceeded ? 'Over Budget!' : `${kpis.budgetUtilization}% used`}
                  </span>
                  <span className="text-slate-500">Left: {formatInr(kpis.remainingBudget)}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      kpis.isBudgetExceeded ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, kpis.budgetUtilization)}%` }}
                  />
                </div>
              </div>
            ) : (
              <Link
                href="/ghar-kharcha/budget"
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700"
              >
                + Set Monthly Budget
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 3. Charts & Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Daily Spending Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                Daily Spending Trend
              </h2>
              <p className="text-xs text-slate-400 font-medium">Daily expenses across {displayMonthLabel()}</p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
              30 Days
            </span>
          </div>

          {/* SVG Bar Chart for Daily Expenses */}
          <div className="h-44 w-full flex items-end gap-1 sm:gap-1.5 pt-4 pb-2 border-b border-slate-100">
            {data?.dailyTrend && data.dailyTrend.length > 0 ? (
              (() => {
                const maxExpense = Math.max(1, ...data.dailyTrend.map((d) => d.expense));
                return data.dailyTrend.map((d) => {
                  const heightPercent = Math.max(4, Math.round((d.expense / maxExpense) * 100));
                  return (
                    <div
                      key={d.day}
                      className="flex-1 flex flex-col items-center h-full justify-end group relative"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] font-bold py-0.5 px-1.5 rounded pointer-events-none whitespace-nowrap z-20 shadow-md">
                        Day {d.day}: {formatInr(d.expense)}
                      </div>
                      <div
                        className={`w-full rounded-t-sm transition-all ${
                          d.expense > 0
                            ? 'bg-emerald-500 hover:bg-emerald-600'
                            : 'bg-slate-100'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                  );
                });
              })()
            ) : (
              <div className="w-full text-center text-xs text-slate-400 py-12">
                No daily data recorded for this month.
              </div>
            )}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-bold pt-2 px-1">
            <span>Day 1</span>
            <span>Day 10</span>
            <span>Day 20</span>
            <span>Day 30</span>
          </div>
        </div>

        {/* Right 1 Col: Category Expense Breakdown */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                Top Categories
              </h2>
              <Link
                href="/ghar-kharcha/categories"
                className="text-[11px] font-bold text-emerald-600 hover:underline"
              >
                View all
              </Link>
            </div>

            {data?.categoryBreakdown && data.categoryBreakdown.length > 0 ? (
              <div className="space-y-3">
                {data.categoryBreakdown.slice(0, 5).map((cat) => (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700 truncate max-w-[140px]">{cat.name}</span>
                      <span className="text-slate-900 font-bold">{formatInr(cat.amount)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${cat.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-xs text-slate-400">
                <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <span>No expense categories yet</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <Link
              href="/ghar-kharcha/transactions"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
            >
              Detailed Category Report →
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Recent Transactions Table */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Recent Household Transactions
            </h2>
            <p className="text-xs text-slate-400 font-medium">Latest income and expense entries</p>
          </div>

          <Link
            href="/ghar-kharcha/transactions"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 self-start sm:self-center"
          >
            <span>View Complete Register</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {data?.recentTransactions && data.recentTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Payment</th>
                  <th className="py-2.5 px-3">By</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {data.recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(tx.date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-800">{tx.categoryName}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                      {tx.description || tx.payeeMerchant || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      <span className="text-[10px] uppercase font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{tx.createdByName}</td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <span
                        className={`font-black text-sm ${
                          tx.type === 'INCOME' ? 'text-emerald-600' : 'text-slate-900'
                        }`}
                      >
                        {tx.type === 'INCOME' ? '+ ' : '- '}
                        {formatInr(tx.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold">No transactions recorded for {displayMonthLabel()}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 mb-4">Start by recording your first grocery, milk, or salary entry.</p>
            {data?.authContext.role !== 'VIEWER' && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                + Record Entry
              </button>
            )}
          </div>
        )}
      </div>

      {/* 5. Quick Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Record Household Entry
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAdd} className="space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTxType('EXPENSE')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    txType === 'EXPENSE'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Expense (Kharcha)
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('INCOME')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    txType === 'INCOME'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Income (Aamad)
                </button>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    autoFocus
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-lg font-black text-slate-900 placeholder:text-slate-300 bg-white"
                  />
                </div>
              </div>

              {/* Category Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={txCategoryName}
                  onChange={(e) => setTxCategoryName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-xs font-bold text-slate-800 bg-white"
                >
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Date & Payment Method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Payment Method
                  </label>
                  <select
                    value={txPaymentMethod}
                    onChange={(e) => setTxPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 bg-white"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Card / Cheque</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              {/* Description / Payee */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Note / Payee (Optional)
                </label>
                <input
                  type="text"
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  placeholder="e.g. Milk packet, Electricity bill, Monthly salary"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 placeholder:text-slate-400 bg-white"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submittingTx}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-60"
                >
                  {submittingTx ? 'Recording...' : 'Save Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
