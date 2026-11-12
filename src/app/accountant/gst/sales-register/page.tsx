'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Download, Printer, Receipt, RefreshCw } from 'lucide-react';
import { AccountantScaleGate } from '@/components/accountant/AccountantScaleGate';
import { ReportPrintHeader, ReportPrintFooter } from '@/components/shared/ReportPrintChrome';
import { useAuth } from '@/context/AuthContext';

interface SalesRegisterRow {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  status: string;
  supplyCategory: string;
  customerName: string;
  customerGstin: string | null;
  taxableValue: string;
  cgst: string;
  sgst: string;
  igst: string;
  taxTotal: string;
  total: string;
}

interface SalesRegisterResponse {
  periodLabel: string;
  totals: {
    activeCount: number;
    cancelledCount: number;
    b2bCount: number;
    b2cCount: number;
    taxableValue: string;
    cgst: string;
    sgst: string;
    igst: string;
    taxTotal: string;
    totalValue: string;
  };
  rows: SalesRegisterRow[];
}

function formatInr(val: string | number): string {
  const num = typeof val === 'number' ? val : Number(val || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function SalesTaxRegisterPage() {
  return (
    <AccountantScaleGate>
      <SalesTaxRegisterContent />
    </AccountantScaleGate>
  );
}

function SalesTaxRegisterContent() {
  const { activeBusiness } = useAuth();
  const activeBusinessId = activeBusiness?.id;
  const now = new Date();

  const [month, setMonth] = useState<string>('ALL');
  const [year, setYear] = useState<string>(String(now.getFullYear()));
  const [data, setData] = useState<SalesRegisterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRegister = useCallback(async () => {
    if (!activeBusinessId) return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        businessId: activeBusinessId,
        type: 'sales',
      });
      if (month !== 'ALL') {
        qs.set('month', month);
        qs.set('year', year);
      }
      const res = await fetch(`/api/gst/registers?${qs.toString()}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load Sales Register');
      setData(json.register || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Sales Register');
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

  const exportCsv = () => {
    if (!data) return;
    const lines = [
      'Invoice No,Date,Type,Status,Customer,GSTIN,Taxable Value,CGST,SGST,IGST,Total',
      ...data.rows.map((r) =>
        [
          `"${r.invoiceNumber}"`,
          r.invoiceDate,
          r.supplyCategory,
          r.status,
          `"${r.customerName.replace(/"/g, '""')}"`,
          `"${r.customerGstin || ''}"`,
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
    a.download = `sales-tax-register-${data.periodLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <ReportPrintHeader
        title="GST Sales Tax Register"
        subtitle="Outward supply register splitting B2B vs B2C taxable values and CGST / SGST / IGST output tax"
        periodLabel={
          month === 'ALL'
            ? 'All Periods'
            : `${MONTHS[Number(month) - 1] || month} ${year}`
        }
      />
      <div className="print:hidden bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#EA580C]" />
            <h1 className="text-xl font-black text-[#071F38] tracking-tight">
              GST Sales Tax Register
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Live outward supply register splitting B2B vs B2C taxable values and CGST / SGST / IGST output liability.
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
            disabled={!data}
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-[#071F38] hover:bg-[#0D2E50] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
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
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <MetricCard
              label={`Taxable (${data.totals.b2bCount} B2B · ${data.totals.b2cCount} B2C)`}
              value={formatInr(data.totals.taxableValue)}
            />
            <MetricCard label="Output CGST" value={formatInr(data.totals.cgst)} />
            <MetricCard label="Output SGST" value={formatInr(data.totals.sgst)} />
            <MetricCard label="Output IGST" value={formatInr(data.totals.igst)} />
            <MetricCard label="Gross Invoice Value" value={formatInr(data.totals.totalValue)} dark />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-bold">Invoice</th>
                  <th className="text-left px-3 py-3 font-bold">Date</th>
                  <th className="text-left px-3 py-3 font-bold">Customer &amp; GSTIN</th>
                  <th className="text-center px-3 py-3 font-bold">Type</th>
                  <th className="text-right px-3 py-3 font-bold">Taxable</th>
                  <th className="text-right px-3 py-3 font-bold">CGST</th>
                  <th className="text-right px-3 py-3 font-bold">SGST</th>
                  <th className="text-right px-3 py-3 font-bold">IGST</th>
                  <th className="text-right px-4 py-3 font-bold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-400">
                      No invoices recorded for this period.
                    </td>
                  </tr>
                ) : (
                  data.rows.map((r) => (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50/70 ${
                        r.status === 'CANCELLED' ? 'opacity-50 line-through' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-bold text-[#071F38]">{r.invoiceNumber}</td>
                      <td className="px-3 py-3 text-slate-500">{r.invoiceDate}</td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-slate-800">{r.customerName}</p>
                        <p className="text-[10px] font-mono text-slate-400">
                          {r.customerGstin || 'Unregistered / B2C'}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {r.supplyCategory}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono">{formatInr(r.taxableValue)}</td>
                      <td className="px-3 py-3 text-right font-mono">{formatInr(r.cgst)}</td>
                      <td className="px-3 py-3 text-right font-mono">{formatInr(r.sgst)}</td>
                      <td className="px-3 py-3 text-right font-mono">{formatInr(r.igst)}</td>
                      <td className="px-4 py-3 text-right font-mono font-black text-[#071F38]">
                        {formatInr(r.total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ReportPrintFooter note="GST Sales Tax Register — PakkaChittha Accountant ERP." />
    </div>
  );
}

function MetricCard({
  label,
  value,
  dark = false,
}: {
  label: string;
  value: string;
  dark?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        dark
          ? 'bg-[#071F38] text-white border-[#071F38] print-surface-light'
          : 'bg-white text-[#071F38] border-slate-200/90'
      }`}
    >
      <p
        className={`text-[10px] font-bold uppercase tracking-wider ${
          dark ? 'text-slate-300' : 'text-slate-500'
        }`}
      >
        {label}
      </p>
      <p className="text-base font-black font-mono mt-1">{value}</p>
    </div>
  );
}
