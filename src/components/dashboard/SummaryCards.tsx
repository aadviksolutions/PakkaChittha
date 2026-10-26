'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Wallet,
  Clock,
  FileText,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { useTranslation } from '@/i18n/context';

interface SummaryCardsProps {
  customMetrics?: {
    totalSales?: number;
    todaysSales?: number;
    totalCollected?: number;
    totalOutstanding?: number;
    pendingInvoicesCount?: number;
    pendingInvoicesAmount?: number;
    invoiceCount?: number;
  };
}

interface SummaryData {
  totalSalesTurnover: number;
  todaysSales: number;
  totalPaidCollections: number;
  totalUdhaarDue: number;
  pendingInvoicesCount: number;
  pendingInvoicesAmount: number;
  invoiceCount: number;
  overdueAmount: number;
}

export function SummaryCards({ customMetrics }: SummaryCardsProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/reports/summary')
      .then((res) => (res.ok ? res.json() : null))
      .then((resData) => {
        if (!active) return;
        if (resData?.summary) {
          setData({
            totalSalesTurnover: resData.summary.totalSalesTurnover ?? 0,
            todaysSales: resData.summary.todaysSales ?? 0,
            totalPaidCollections: resData.summary.totalPaidCollections ?? 0,
            totalUdhaarDue: resData.summary.totalUdhaarDue ?? 0,
            pendingInvoicesCount: resData.summary.pendingInvoicesCount ?? 0,
            pendingInvoicesAmount: resData.summary.pendingInvoicesAmount ?? 0,
            invoiceCount: resData.summary.invoiceCount ?? 0,
            overdueAmount: resData.summary.overdueAmount ?? 0,
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const totalSales = customMetrics?.totalSales ?? data?.totalSalesTurnover ?? 0;
  const todaysSales = customMetrics?.todaysSales ?? data?.todaysSales ?? 0;
  const totalCollected = customMetrics?.totalCollected ?? data?.totalPaidCollections ?? 0;
  const totalUdhaar = customMetrics?.totalOutstanding ?? data?.totalUdhaarDue ?? 0;
  const pendingCount = customMetrics?.pendingInvoicesCount ?? data?.pendingInvoicesCount ?? 0;
  const pendingAmount = customMetrics?.pendingInvoicesAmount ?? data?.pendingInvoicesAmount ?? 0;
  const invoiceCount = customMetrics?.invoiceCount ?? data?.invoiceCount ?? 0;
  const overdueAmount = data?.overdueAmount ?? 0;

  if (loading && !data && !customMetrics) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-4 sm:mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 sm:h-32 bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4.5 animate-pulse flex flex-col justify-between"
          >
            <div className="h-3.5 bg-slate-100 rounded w-16 sm:w-24" />
            <div className="h-6 sm:h-8 bg-slate-100 rounded w-24 sm:w-36" />
            <div className="h-3 bg-slate-100 rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-4 sm:mb-6">
      {/* 1. Total Sales */}
      <div className="bg-white rounded-2xl p-3 sm:p-4.5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group">
        <div>
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
              {t('dashboard.todaySales')}
            </span>
            <div className="w-6.5 h-6.5 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-[#00B887] border border-emerald-100 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-1 mb-1.5 sm:mb-2">
            <span className="text-base xs:text-lg sm:text-2xl font-black text-[#071F38] tracking-tight tabular-nums truncate">
              ₹{totalSales.toLocaleString('en-IN')}
            </span>
            <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400">INR</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 gap-1 flex-wrap">
          <span className="inline-flex items-center gap-0.5 font-semibold text-[#00B887] text-[10px] sm:text-[11px] truncate">
            <ArrowUpRight className="w-3 h-3 shrink-0" />
            ₹{todaysSales.toLocaleString('en-IN')} {t('common.today')}
          </span>
          <span className="text-slate-400 text-[10px] sm:text-[11px] font-medium hidden xs:inline">
            {invoiceCount} {invoiceCount === 1 ? 'bill' : 'bills'}
          </span>
        </div>
      </div>

      {/* 2. Outstanding Udhaar */}
      <div className="bg-white rounded-2xl p-3 sm:p-4.5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group">
        <div>
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
              {t('dashboard.totalReceivable')}
            </span>
            <div className="w-6.5 h-6.5 sm:w-8 sm:h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-1 mb-1.5 sm:mb-2">
            <span className="text-base xs:text-lg sm:text-2xl font-black text-amber-900 tracking-tight tabular-nums truncate">
              ₹{totalUdhaar.toLocaleString('en-IN')}
            </span>
            <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400">INR</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 gap-1 flex-wrap">
          {overdueAmount > 0 ? (
            <span className="inline-flex items-center gap-0.5 text-rose-700 text-[10px] sm:text-[11px] font-bold truncate">
              <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
              ₹{overdueAmount.toLocaleString('en-IN')} {t('invoices.statusOverdue')}
            </span>
          ) : (
            <span className="text-slate-500 text-[10px] sm:text-[11px] font-medium truncate">
              {t('invoices.balanceDue')}
            </span>
          )}
          <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 px-1 py-0.2 rounded border border-amber-200 hidden xs:inline">
            {t('common.active')}
          </span>
        </div>
      </div>

      {/* 3. Amount Collected */}
      <div className="bg-white rounded-2xl p-3 sm:p-4.5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group">
        <div>
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
              {t('invoices.paidAmount')}
            </span>
            <div className="w-6.5 h-6.5 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-[#00B887] border border-emerald-100 flex items-center justify-center shrink-0">
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-1 mb-1.5 sm:mb-2">
            <span className="text-base xs:text-lg sm:text-2xl font-black text-[#00B887] tracking-tight tabular-nums truncate">
              ₹{totalCollected.toLocaleString('en-IN')}
            </span>
            <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400">INR</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 gap-1 flex-wrap">
          <span className="inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] font-semibold text-[#00B887] truncate">
            <ShieldCheck className="w-3 h-3 shrink-0" />
            Cash & UPI
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-[#00B887] px-1 py-0.2 rounded border border-emerald-200 hidden xs:inline">
            {t('invoices.statusPaid')}
          </span>
        </div>
      </div>

      {/* 4. Total Invoices / Bills */}
      <div className="bg-white rounded-2xl p-3 sm:p-4.5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group">
        <div>
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
              {t('nav.invoices')}
            </span>
            <div className="w-6.5 h-6.5 sm:w-8 sm:h-8 rounded-lg bg-teal-50 text-[#008F91] border border-teal-200 flex items-center justify-center shrink-0">
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-1 mb-1.5 sm:mb-2">
            <span className="text-base xs:text-lg sm:text-2xl font-black text-[#071F38] tracking-tight tabular-nums truncate">
              {invoiceCount}
            </span>
            <span className="text-[10px] font-semibold text-slate-500">
              {t('dashboard.newBill')}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 gap-1 flex-wrap">
          <span className="text-[10px] sm:text-[11px] font-semibold text-[#008F91] truncate">
            {pendingCount} {t('common.pending')}
          </span>
          <span className="text-[9px] font-semibold text-teal-800 bg-teal-50 px-1 py-0.2 rounded border border-teal-200 uppercase hidden xs:inline">
            ₹{pendingAmount.toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </div>
  );
}
