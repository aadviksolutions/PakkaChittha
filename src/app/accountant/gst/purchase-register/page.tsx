'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCw, Truck } from 'lucide-react';
import { AccountantScaleGate } from '@/components/accountant/AccountantScaleGate';
import { useAuth } from '@/context/AuthContext';

interface PurchaseRegisterRow {
  id: string;
  purchaseNumber: string;
  supplierInvoiceNumber: string | null;
  purchaseDate: string;
  status: string;
  itcEligibility: string;
  supplierName: string;
  supplierGstin: string | null;
  taxableValue: string;
  cgst: string;
  sgst: string;
  igst: string;
  taxTotal: string;
  total: string;
}

interface PurchaseRegisterResponse {
  periodLabel: string;
  totals: {
    count: number;
    taxableValue: string;
    eligibleItcTotal: string;
    blockedOrPendingItcTotal: string;
    totalValue: string;
  };
  rows: PurchaseRegisterRow[];
}

const ITC_OPTIONS = [
  { value: 'ELIGIBLE', label: 'Eligible ITC' },
  { value: 'RECONCILED', label: '2B Reconciled' },
  { value: 'CAPITAL_GOODS', label: 'Capital Goods ITC' },
  { value: 'PENDING_VERIFICATION', label: 'Pending 2B Check' },
  { value: 'BLOCKED_SEC_17_5', label: 'Blocked Sec 17(5)' },
  { value: 'INELIGIBLE', label: 'Ineligible' },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatInr(val: string | number): string {
  const num = typeof val === 'number' ? val : Number(val || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export default function PurchaseItcRegisterPage() {
  return (
    <AccountantScaleGate>
      <PurchaseItcRegisterContent />
    </AccountantScaleGate>
  );
}

function PurchaseItcRegisterContent() {
  const { activeBusiness } = useAuth();
  const activeBusinessId = activeBusiness?.id;
  const now = new Date();

  const [month, setMonth] = useState<string>('ALL');
  const [year, setYear] = useState<string>(String(now.getFullYear()));
  const [data, setData] = useState<PurchaseRegisterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRegister = useCallback(async () => {
    if (!activeBusinessId) return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        businessId: activeBusinessId,
        type: 'purchase',
      });
      if (month !== 'ALL') {
        qs.set('month', month);
        qs.set('year', year);
      }
      const res = await fetch(`/api/gst/registers?${qs.toString()}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load Purchase Register');
      setData(json.register || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Purchase Register');
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId, month, year]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadRegister();
    });
    return () => {
      cancelled = true;
    };
  }, [loadRegister]);

  const handleItcChange = async (purchaseId: string, itcEligibility: string) => {
    if (!activeBusinessId) return;
    setUpdatingId(purchaseId);
    setError(null);
    try {
      const res = await fetch('/api/gst/registers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: activeBusinessId,
          purchaseId,
          itcEligibility,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update ITC eligibility');
      await loadRegister();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const exportCsv = () => {
    if (!data) return;
    const lines = [
      'Purchase No,Supplier Bill No,Date,Supplier,GSTIN,ITC Classification,Taxable,CGST,SGST,IGST,Total',
      ...data.rows.map((r) =>
        [
          `"${r.purchaseNumber}"`,
          `"${r.supplierInvoiceNumber || ''}"`,
          r.purchaseDate,
          `"${r.supplierName.replace(/"/g, '""')}"`,
          `"${r.supplierGstin || ''}"`,
          r.itcEligibility,
          r.taxableValue,
          r.cgst,
          r.sgst,
          r.igst,
          r.total,
        ].join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `purchase-itc-register-${data.periodLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#EA580C]" />
            <h1 className="text-xl font-black text-[#071F38] tracking-tight">
              Purchase &amp; ITC Eligibility Register
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Audit supplier inward supplies, classify Section 17(5) blocked credits, and track eligible Input Tax Credit.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
          >
            <option value="ALL">All Periods</option>
            {MONTHS.map((m, idx) => (
              <option key={m} value={String(idx + 1)}>
                {m}
              </option>
            ))}
          </select>
          {month !== 'ALL' && (
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-24 text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
            />
          )}
          <button
            type="button"
            disabled={!data}
            onClick={exportCsv}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[#071F38] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => void loadRegister()}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label={`Taxable Purchases (${data.totals.count})`}
              value={formatInr(data.totals.taxableValue)}
            />
            <MetricCard
              label="Eligible / Reconciled ITC"
              value={formatInr(data.totals.eligibleItcTotal)}
              tone="emerald"
            />
            <MetricCard
              label="Blocked / Pending ITC"
              value={formatInr(data.totals.blockedOrPendingItcTotal)}
              tone="amber"
            />
            <MetricCard
              label="Total Bill Value"
              value={formatInr(data.totals.totalValue)}
              tone="dark"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-bold">Purchase Bill</th>
                  <th className="text-left px-3 py-3 font-bold">Date</th>
                  <th className="text-left px-3 py-3 font-bold">Supplier &amp; GSTIN</th>
                  <th className="text-right px-3 py-3 font-bold">Taxable</th>
                  <th className="text-right px-3 py-3 font-bold">GST Tax</th>
                  <th className="text-right px-3 py-3 font-bold">Total</th>
                  <th className="text-left px-4 py-3 font-bold">ITC Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      No purchases found for this period.
                    </td>
                  </tr>
                ) : (
                  data.rows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <p className="font-bold text-[#071F38]">{r.purchaseNumber}</p>
                        {r.supplierInvoiceNumber && (
                          <p className="text-[10px] text-slate-400">Ref: {r.supplierInvoiceNumber}</p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-500">{r.purchaseDate}</td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-slate-800">{r.supplierName}</p>
                        <p className="text-[10px] font-mono text-slate-400">
                          {r.supplierGstin || 'No GSTIN'}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right font-mono">{formatInr(r.taxableValue)}</td>
                      <td className="px-3 py-3 text-right font-mono">{formatInr(r.taxTotal)}</td>
                      <td className="px-3 py-3 text-right font-mono font-black text-[#071F38]">
                        {formatInr(r.total)}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          disabled={updatingId === r.id || r.status === 'CANCELLED'}
                          value={r.itcEligibility}
                          onChange={(e) => void handleItcChange(r.id, e.target.value)}
                          className="text-[11px] font-bold border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
                        >
                          {ITC_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'emerald' | 'amber' | 'dark';
}) {
  const cls =
    tone === 'dark'
      ? 'bg-[#071F38] text-white border-[#071F38]'
      : tone === 'emerald'
        ? 'bg-emerald-50/70 text-emerald-900 border-emerald-200'
        : tone === 'amber'
          ? 'bg-amber-50/70 text-amber-900 border-amber-200'
          : 'bg-white text-[#071F38] border-slate-200/90';

  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <p
        className={`text-[10px] font-bold uppercase tracking-wider ${
          tone === 'dark' ? 'text-slate-300' : 'text-slate-500'
        }`}
      >
        {label}
      </p>
      <p className="text-base font-black font-mono mt-1">{value}</p>
    </div>
  );
}
