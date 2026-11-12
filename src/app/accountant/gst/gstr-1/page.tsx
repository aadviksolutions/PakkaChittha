'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Download,
  FileJson,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Send,
} from 'lucide-react';
import { AccountantScaleGate } from '@/components/accountant/AccountantScaleGate';
import { ReportPrintHeader, ReportPrintFooter } from '@/components/shared/ReportPrintChrome';
import { useAuth } from '@/context/AuthContext';

interface Gstr1HsnRow {
  num: number;
  hsn_sc: string;
  desc: string;
  qty: number;
  txval: number;
  iamt: number;
  camt: number;
  samt: number;
  val: number;
}

interface Gstr1PayloadView {
  gstin: string;
  fp: string;
  b2b: Array<{ ctin: string; cpty?: string; inv: Array<{ inum: string; idt: string; val: number }> }>;
  b2cl: Array<{ pos: string; inv: Array<{ inum: string }> }>;
  b2cs: Array<{ sply_ty: string; pos: string; rt: number; txval: number; camt: number; samt: number; iamt: number }>;
  hsn: { data: Gstr1HsnRow[] };
  summary: {
    totalTaxable: number;
    totalCgst: number;
    totalSgst: number;
    totalIgst: number;
    totalValue: number;
    b2bCount: number;
    b2cCount: number;
  };
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatInr(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0);
}

export default function Gstr1Page() {
  return (
    <AccountantScaleGate>
      <Gstr1Content />
    </AccountantScaleGate>
  );
}

function Gstr1Content() {
  const { activeBusiness } = useAuth();
  const activeBusinessId = activeBusiness?.id;
  const now = new Date();

  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [payload, setPayload] = useState<Gstr1PayloadView | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadReport = useCallback(async () => {
    if (!activeBusinessId) return;
    setLoading(true);
    setMsg(null);
    try {
      const qs = new URLSearchParams({
        businessId: activeBusinessId,
        month: String(month),
        year: String(year),
        format: 'view',
      });
      const res = await fetch(`/api/gst/gstr1?${qs.toString()}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to build GSTR-1');
      setPayload(json.payload || null);
    } catch (err) {
      setPayload(null);
      setMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to load GSTR-1',
      });
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId, month, year]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadReport();
    });
    return () => {
      cancelled = true;
    };
  }, [loadReport]);

  const submitForApproval = async () => {
    if (!activeBusinessId) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch('/api/gst/gstr1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: activeBusinessId, month, year }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Submission failed');
      setMsg({
        type: 'ok',
        text: 'GSTR-1 return summary submitted to Owner Approvals Inbox.',
      });
    } catch (err) {
      setMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Submission failed',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const downloadUrl = (format: 'json' | 'csv') =>
    activeBusinessId
      ? `/api/gst/gstr1?businessId=${encodeURIComponent(activeBusinessId)}&month=${month}&year=${year}&format=${format}&download=true`
      : '#';

  return (
    <div className="space-y-5">
      <ReportPrintHeader
        title="GSTR-1 Outward Supplies Return"
        subtitle="Official GSTN B2B, B2C, CDNR & HSN-wise Outward Supplies Statement"
        periodLabel={`${MONTHS[month - 1] || month} ${year}`}
        gstinOverride={payload?.gstin}
        referenceLabel={payload?.fp ? `Return Period: ${payload.fp}` : undefined}
      />
      <div className="print:hidden bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#EA580C]" />
            <h1 className="text-xl font-black text-[#071F38] tracking-tight">
              GSTR-1 Outward Supplies Return Pack
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Official GSTN offline-tool JSON &amp; CSV tables generated strictly from live commercial tax invoices and notes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
          >
            {MONTHS.map((m, idx) => (
              <option key={m} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-24 text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
          />
          {payload && (
            <>
              <a
                href={downloadUrl('json')}
                className="px-3.5 py-2 rounded-xl bg-[#071F38] hover:bg-[#0D2E52] text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                <FileJson className="w-3.5 h-3.5" />
                GSTN JSON
              </a>
              <a
                href={downloadUrl('csv')}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[#071F38] text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                CSV
              </a>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[#071F38] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void submitForApproval()}
                className="px-3.5 py-2 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                Submit Owner Sign-off
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => void loadReport()}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold ${
            msg.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          {msg.text}
        </div>
      )}

      {payload && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard label="B2B / B2C Invoices" value={`${payload.summary.b2bCount} B2B · ${payload.summary.b2cCount} B2C`} />
            <StatCard label="Taxable Value" value={formatInr(payload.summary.totalTaxable)} />
            <StatCard label="CGST + SGST" value={formatInr(payload.summary.totalCgst + payload.summary.totalSgst)} />
            <StatCard label="IGST" value={formatInr(payload.summary.totalIgst)} />
            <StatCard label="Gross Return Value" value={formatInr(payload.summary.totalValue)} dark />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
              <h2 className="text-sm font-black text-[#071F38]">
                Table 12 — HSN-Wise Summary ({payload.fp})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-bold">HSN / SAC</th>
                    <th className="text-left px-3 py-3 font-bold">Description</th>
                    <th className="text-right px-3 py-3 font-bold">Qty</th>
                    <th className="text-right px-3 py-3 font-bold">Taxable</th>
                    <th className="text-right px-3 py-3 font-bold">CGST</th>
                    <th className="text-right px-3 py-3 font-bold">SGST</th>
                    <th className="text-right px-3 py-3 font-bold">IGST</th>
                    <th className="text-right px-4 py-3 font-bold">Total Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payload.hsn.data.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">
                        No taxable supplies recorded in {payload.fp}.
                      </td>
                    </tr>
                  ) : (
                    payload.hsn.data.map((row) => (
                      <tr key={row.num} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-mono font-bold text-[#071F38]">{row.hsn_sc}</td>
                        <td className="px-3 py-3 text-slate-700">{row.desc}</td>
                        <td className="px-3 py-3 text-right font-mono">{row.qty}</td>
                        <td className="px-3 py-3 text-right font-mono">{formatInr(row.txval)}</td>
                        <td className="px-3 py-3 text-right font-mono">{formatInr(row.camt)}</td>
                        <td className="px-3 py-3 text-right font-mono">{formatInr(row.samt)}</td>
                        <td className="px-3 py-3 text-right font-mono">{formatInr(row.iamt)}</td>
                        <td className="px-4 py-3 text-right font-mono font-black text-[#071F38]">
                          {formatInr(row.val)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <ReportPrintFooter note="GSTR-1 Return Statement — PakkaChittha Accountant ERP." />
    </div>
  );
}

function StatCard({ label, value, dark = false }: { label: string; value: string; dark?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        dark
          ? 'bg-[#071F38] text-white border-[#071F38] print-surface-light'
          : 'bg-white text-[#071F38] border-slate-200/90'
      }`}
    >
      <p className={`text-[10px] font-bold uppercase tracking-wider ${dark ? 'text-slate-300' : 'text-slate-500'}`}>
        {label}
      </p>
      <p className="text-base font-black font-mono mt-1">{value}</p>
    </div>
  );
}
