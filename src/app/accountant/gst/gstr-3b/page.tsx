'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Calculator, Download, FileJson, Printer, RefreshCw, Send } from 'lucide-react';
import { AccountantScaleGate } from '@/components/accountant/AccountantScaleGate';
import { ReportPrintHeader, ReportPrintFooter } from '@/components/shared/ReportPrintChrome';
import { useAuth } from '@/context/AuthContext';

interface TaxVectorTotal {
  igst: string;
  cgst: string;
  sgst: string;
  total: string;
}

interface GstItcOffsetResult {
  outputLiability: TaxVectorTotal;
  eligibleItc: TaxVectorTotal;
  utilization: {
    igstFromIgst: string;
    cgstFromIgst: string;
    sgstFromIgst: string;
    cgstFromCgst: string;
    igstFromCgst: string;
    sgstFromSgst: string;
    igstFromSgst: string;
  };
  netCashPayable: TaxVectorTotal;
  closingItcCarryForward: TaxVectorTotal;
}

interface Gstr3bPayloadView {
  gstin: string;
  ret_period: string;
  sup_details: {
    osup_det: { txval: number; iamt: number; camt: number; samt: number };
    osup_nil_exmp: { txval: number };
  };
  itc_elg: {
    itc_net: { iamt: number; camt: number; samt: number };
  };
}

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

export default function Gstr3bPage() {
  return (
    <AccountantScaleGate>
      <Gstr3bContent />
    </AccountantScaleGate>
  );
}

function Gstr3bContent() {
  const { activeBusiness } = useAuth();
  const activeBusinessId = activeBusiness?.id;
  const now = new Date();

  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [payload, setPayload] = useState<Gstr3bPayloadView | null>(null);
  const [offset, setOffset] = useState<GstItcOffsetResult | null>(null);
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
      const res = await fetch(`/api/gst/gstr3b?${qs.toString()}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to build GSTR-3B');
      setPayload(json.payload || null);
      setOffset(json.offset || null);
    } catch (err) {
      setPayload(null);
      setOffset(null);
      setMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to load GSTR-3B',
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
      const res = await fetch('/api/gst/gstr3b', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: activeBusinessId, month, year }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Submission failed');
      setMsg({
        type: 'ok',
        text: 'GSTR-3B summary & net tax payable submitted to Owner Approvals Inbox.',
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
      ? `/api/gst/gstr3b?businessId=${encodeURIComponent(activeBusinessId)}&month=${month}&year=${year}&format=${format}&download=true`
      : '#';

  return (
    <div className="space-y-5">
      <ReportPrintHeader
        title="GSTR-3B Monthly Return & Rule 88A ITC Offset"
        subtitle="Table 3.1 Outward Liability, Table 4 Eligible ITC & Rule 88A Electronic Credit Ledger Utilization"
        periodLabel={`${MONTHS[month - 1] || month} ${year}`}
        gstinOverride={payload?.gstin}
        referenceLabel={payload?.ret_period ? `Return Period: ${payload.ret_period}` : undefined}
      />
      <div className="print:hidden bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#EA580C]" />
            <h1 className="text-xl font-black text-[#071F38] tracking-tight">
              GSTR-3B Summary &amp; Rule 88A ITC Offset
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Official GSTN Table 3.1 outward liability vs Table 4 ITC with Section 49 / Rule 88A electronic credit ledger offset.
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

      {offset && payload && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <SummaryTile label="Outward Tax Liability" value={formatInr(offset.outputLiability.total)} />
            <SummaryTile label="Eligible Input Tax Credit" value={formatInr(offset.eligibleItc.total)} tone="emerald" />
            <SummaryTile label="Net Cash Payable" value={formatInr(offset.netCashPayable.total)} tone="dark" />
            <SummaryTile label="ITC Carry Forward" value={formatInr(offset.closingItcCarryForward.total)} tone="amber" />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
              <h2 className="text-sm font-black text-[#071F38]">
                Rule 88A Tax Offset Matrix ({payload.ret_period})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-bold">Tax Head</th>
                    <th className="text-right px-3 py-3 font-bold">Output Liability</th>
                    <th className="text-right px-3 py-3 font-bold">Available ITC</th>
                    <th className="text-right px-3 py-3 font-bold">Paid via ITC</th>
                    <th className="text-right px-3 py-3 font-bold">Net Cash Payable</th>
                    <th className="text-right px-4 py-3 font-bold">Closing ITC Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-4 py-3 font-bold text-[#071F38]">IGST</td>
                    <td className="px-3 py-3 text-right font-mono">{formatInr(offset.outputLiability.igst)}</td>
                    <td className="px-3 py-3 text-right font-mono">{formatInr(offset.eligibleItc.igst)}</td>
                    <td className="px-3 py-3 text-right font-mono text-emerald-700">
                      {formatInr(
                        Number(offset.utilization.igstFromIgst) +
                          Number(offset.utilization.igstFromCgst) +
                          Number(offset.utilization.igstFromSgst)
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-black text-[#071F38]">
                      {formatInr(offset.netCashPayable.igst)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-amber-700">
                      {formatInr(offset.closingItcCarryForward.igst)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-[#071F38]">CGST</td>
                    <td className="px-3 py-3 text-right font-mono">{formatInr(offset.outputLiability.cgst)}</td>
                    <td className="px-3 py-3 text-right font-mono">{formatInr(offset.eligibleItc.cgst)}</td>
                    <td className="px-3 py-3 text-right font-mono text-emerald-700">
                      {formatInr(
                        Number(offset.utilization.cgstFromIgst) +
                          Number(offset.utilization.cgstFromCgst)
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-black text-[#071F38]">
                      {formatInr(offset.netCashPayable.cgst)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-amber-700">
                      {formatInr(offset.closingItcCarryForward.cgst)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-[#071F38]">SGST</td>
                    <td className="px-3 py-3 text-right font-mono">{formatInr(offset.outputLiability.sgst)}</td>
                    <td className="px-3 py-3 text-right font-mono">{formatInr(offset.eligibleItc.sgst)}</td>
                    <td className="px-3 py-3 text-right font-mono text-emerald-700">
                      {formatInr(
                        Number(offset.utilization.sgstFromIgst) +
                          Number(offset.utilization.sgstFromSgst)
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-black text-[#071F38]">
                      {formatInr(offset.netCashPayable.sgst)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-amber-700">
                      {formatInr(offset.closingItcCarryForward.sgst)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <ReportPrintFooter note="GSTR-3B Summary & ITC Utilization — PakkaChittha Accountant ERP." />
    </div>
  );
}

function SummaryTile({
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
      ? 'bg-[#071F38] text-white border-[#071F38] print-surface-light'
      : tone === 'emerald'
        ? 'bg-emerald-50/70 text-emerald-900 border-emerald-200'
        : tone === 'amber'
          ? 'bg-amber-50/70 text-amber-900 border-amber-200'
          : 'bg-white text-[#071F38] border-slate-200/90';

  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <p className={`text-[10px] font-bold uppercase tracking-wider ${tone === 'dark' ? 'text-slate-300' : 'text-slate-500'}`}>
        {label}
      </p>
      <p className="text-lg font-black font-mono mt-1">{value}</p>
    </div>
  );
}
