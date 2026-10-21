'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Landmark,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  PieChart,
  Save,
  ArrowRight,
} from 'lucide-react';

interface BudgetData {
  monthYear: string;
  monthlyBudget: number;
  totalExpenses: number;
  remainingBudget: number;
  budgetUtilization: number;
  isBudgetExceeded: boolean;
  categoryBreakdown: Array<{
    name: string;
    amount: number;
    count: number;
    percent: number;
  }>;
}

export default function HouseholdBudgetPage() {
  const [data, setData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );

  const formatInr = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const fetchBudget = useCallback(async (month: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/household/budget?month=${month}`);
      const json = await res.json();
      if (json.success && json.budget) {
        setData(json.budget);
        setBudgetAmount(String(json.budget.monthlyBudget || ''));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBudget(selectedMonth);
  }, [selectedMonth, fetchBudget]);

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/household/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthYear: selectedMonth,
          amount: parseFloat(budgetAmount) || 0,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update budget.');
      }
      setSuccessMsg('Monthly budget updated successfully!');
      fetchBudget(selectedMonth);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error updating budget');
    } finally {
      setSaving(false);
    }
  };

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

  const displayMonthLabel = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1, 1));
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/ghar-kharcha"
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Monthly Household Budget
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Plan your monthly spending target and track category consumption in real time.
          </p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 self-start sm:self-center">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors cursor-pointer"
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
            aria-label="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Budget Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Target Budget
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {data?.monthlyBudget ? formatInr(data.monthlyBudget) : 'Not Set'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            Allocated for {displayMonthLabel()}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Spent So Far
          </span>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {formatInr(data?.totalExpenses || 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            {data?.budgetUtilization || 0}% of budget consumed
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Remaining Allowance
          </span>
          <div
            className={`text-2xl font-black mt-1 ${
              data?.isBudgetExceeded ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {data?.isBudgetExceeded ? 'Over Budget' : formatInr(data?.remainingBudget || 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            {data?.isBudgetExceeded ? 'Spending has exceeded target' : 'Safe to spend'}
          </p>
        </div>
      </div>

      {/* Budget Edit Form */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
        <h2 className="text-base font-extrabold text-slate-900 tracking-tight mb-1">
          Set Monthly Target for {displayMonthLabel()}
        </h2>
        <p className="text-xs text-slate-400 font-medium mb-5">
          Enter your total planned household expenses for this calendar month.
        </p>

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveBudget} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Monthly Budget Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">
                ₹
              </span>
              <input
                type="number"
                min="0"
                step="500"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                placeholder="e.g. 50000"
                required
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-base font-black text-slate-900 placeholder:text-slate-300 bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Update Budget'}</span>
          </button>
        </form>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
        <h2 className="text-base font-extrabold text-slate-900 tracking-tight mb-1">
          Category-wise Expense Breakdown
        </h2>
        <p className="text-xs text-slate-400 font-medium mb-5">
          See which areas consumed the biggest portion of your budget.
        </p>

        {data?.categoryBreakdown && data.categoryBreakdown.length > 0 ? (
          <div className="space-y-4">
            {data.categoryBreakdown.map((cat) => (
              <div key={cat.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-800">{cat.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-normal">{cat.percent}%</span>
                    <span className="text-slate-900 font-black">{formatInr(cat.amount)}</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${cat.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-xs text-slate-400 font-medium">
            No expenses recorded for this month yet.
          </div>
        )}
      </div>
    </div>
  );
}
