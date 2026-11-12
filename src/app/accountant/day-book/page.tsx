'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, Plus, RefreshCw } from 'lucide-react';
import { AccountantScaleGate } from '@/components/accountant/AccountantScaleGate';
import { useAuth } from '@/context/AuthContext';

interface DayBookVoucher {
  id: string;
  voucherNumber: string;
  voucherType: string;
  voucherDate: string;
  fyCode: string;
  narration: string | null;
  totalAmount: string;
  status: 'DRAFT' | 'POSTED' | 'CANCELLED';
  entries: Array<{
    id: string;
    ledgerName: string;
    debitAmount: string;
    creditAmount: string;
  }>;
}

export default function DayBookPage() {
  return (
    <AccountantScaleGate>
      <Suspense
        fallback={
          <div className="p-5">
            <div className="h-32 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          </div>
        }
      >
        <DayBookContent />
      </Suspense>
    </AccountantScaleGate>
  );
}

function DayBookContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get('voucherType') || '';
  const { activeBusiness } = useAuth();
  const activeBusinessId = activeBusiness?.id;

  const todayStr = new Date().toISOString().slice(0, 10);
  const firstOfMonthStr = `${todayStr.slice(0, 8)}01`;

  const [startDate, setStartDate] = useState(firstOfMonthStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [voucherType, setVoucherType] = useState(initialType);
  const [vouchers, setVouchers] = useState<DayBookVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDayBook = useCallback(async () => {
    if (!activeBusinessId) return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ businessId: activeBusinessId });
      if (startDate) qs.set('startDate', startDate);
      if (endDate) qs.set('endDate', endDate);
      if (voucherType) qs.set('voucherType', voucherType);

      const res = await fetch(`/api/accounting/day-book?${qs.toString()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load Day Book');
      setVouchers(data.vouchers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Day Book');
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId, startDate, endDate, voucherType]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadDayBook();
    });
    return () => {
      cancelled = true;
    };
  }, [loadDayBook]);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#EA580C]" />
            <h1 className="text-xl font-black text-[#071F38] tracking-tight">Day Book</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Chronological register of double-entry vouchers across Sales, Purchases, Payments,
            Receipts, Contra & Journals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-2.5 py-2 bg-slate-50"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-2.5 py-2 bg-slate-50"
          />
          <select
            value={voucherType}
            onChange={(e) => setVoucherType(e.target.value)}
            className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
          >
            <option value="">All Voucher Types</option>
            <option value="SALES">Sales</option>
            <option value="PURCHASE">Purchase</option>
            <option value="RECEIPT">Receipt</option>
            <option value="PAYMENT">Payment</option>
            <option value="CONTRA">Contra</option>
            <option value="JOURNAL">Journal</option>
          </select>
          <Link
            href="/accountant/vouchers/new"
            className="px-3.5 py-2 rounded-xl bg-[#EA580C] hover:bg-orange-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New Voucher
          </Link>
          <button
            type="button"
            onClick={() => void loadDayBook()}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : vouchers.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            No vouchers found in this date range. Create a manual voucher or record a sale/purchase
            to auto-post entries.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Voucher #</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Particulars / Narration</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {vouchers.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => router.push(`/accountant/vouchers/${v.id}`)}
                    className="hover:bg-orange-50/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">{v.voucherDate}</td>
                    <td className="py-3 px-4 whitespace-nowrap font-bold text-[#EA580C]">
                      {v.voucherNumber}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {v.voucherType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-md">
                      <p className="font-semibold truncate">
                        {v.entries.map((e) => e.ledgerName).join(' · ')}
                      </p>
                      {v.narration && (
                        <p className="text-[11px] text-slate-400 truncate">{v.narration}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-[#071F38] whitespace-nowrap">
                      ₹{Number(v.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          v.status === 'POSTED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : v.status === 'CANCELLED'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

