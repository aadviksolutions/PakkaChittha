'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Printer, RefreshCw, ShieldAlert, Upload } from 'lucide-react';
import { AccountantScaleGate } from '@/components/accountant/AccountantScaleGate';
import { ReportPrintHeader, ReportPrintFooter } from '@/components/shared/ReportPrintChrome';
import { useAuth } from '@/context/AuthContext';
import { getCurrentFinancialYear } from '@/lib/reports/financialYear';

interface ReconciliationRow {
  key: string;
  status: 'MATCHED' | 'MISMATCH_TAX' | 'MISSING_IN_2B' | 'MISSING_IN_PURCHASES' | 'DUPLICATE';
  supplierGstin: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  booksPurchaseId?: string;
  booksPurchaseNumber?: string;
  booksTaxable?: number;
  booksTax?: number;
  gstr2bTaxable?: number;
  gstr2bTax?: number;
  taxDifference?: number;
  notes: string;
}

interface ReconciliationResult {
  returnPeriod: string;
  financialYear: string;
  summary: {
    totalInGstr2b: number;
    totalInPurchases: number;
    matchedCount: number;
    mismatchCount: number;
    missingIn2bCount: number;
    missingInPurchasesCount: number;
    reconciledItc: number;
    atRiskItc: number;
    unclaimedItc: number;
    matchPercentage: number;
  };
  rows: ReconciliationRow[];
}

interface RecentImport {
  id: string;
  returnPeriod: string;
  financialYear: string;
  sourceFileName: string | null;
  totalInvoices: number;
  matchedCount: number;
  mismatchCount: number;
  createdAt: string;
}

function formatInr(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0);
}

export default function Gstr2bReconciliationPage() {
  return (
    <AccountantScaleGate>
      <Gstr2bContent />
    </AccountantScaleGate>
  );
}

function Gstr2bContent() {
  const { activeBusiness } = useAuth();
  const activeBusinessId = activeBusiness?.id;

  const now = new Date();
  const defaultPeriod = `${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
  const [recentImports, setRecentImports] = useState<RecentImport[]>([]);
  const [result, setResult] = useState<ReconciliationResult | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [returnPeriod, setReturnPeriod] = useState(defaultPeriod);
  const [financialYear, setFinancialYear] = useState(() => getCurrentFinancialYear());
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadHistory = useCallback(async () => {
    if (!activeBusinessId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/gst/gstr2b?businessId=${encodeURIComponent(activeBusinessId)}`,
        { cache: 'no-store' }
      );
      const json = await res.json();
      if (res.ok && Array.isArray(json.recentImports)) {
        setRecentImports(json.recentImports);
      }
    } catch {
      // Non-fatal initial list load
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadHistory();
    });
    return () => {
      cancelled = true;
    };
  }, [loadHistory]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeBusinessId) return;
    setRunning(true);
    setMsg(null);
    try {
      const formData = new FormData();
      formData.append('businessId', activeBusinessId);
      formData.append('file', file);
      formData.append('returnPeriod', returnPeriod);
      formData.append('financialYear', financialYear);

      const res = await fetch('/api/gst/gstr2b', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Reconciliation failed');
      setResult(json.data);
      setMsg({
        type: 'ok',
        text: `Reconciled ${json.data.summary.totalInGstr2b} GSTR-2B portal invoices (${json.data.summary.matchPercentage}% match).`,
      });
      await loadHistory();
    } catch (err) {
      setMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Reconciliation failed',
      });
    } finally {
      setRunning(false);
      e.target.value = '';
    }
  };

  const markMatchedReconciled = async () => {
    if (!activeBusinessId || !result) return;
    const matchedIds = result.rows
      .filter((r) => r.status === 'MATCHED' && r.booksPurchaseId)
      .map((r) => r.booksPurchaseId as string);

    if (matchedIds.length === 0) return;
    setRunning(true);
    try {
      const res = await fetch('/api/gst/gstr2b', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: activeBusinessId,
          action: 'MARK_RECONCILED',
          returnPeriod: result.returnPeriod,
          purchaseIds: matchedIds,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to mark purchases reconciled');
      setMsg({
        type: 'ok',
        text: `Marked ${json.updatedCount} matched purchase bills as RECONCILED.`,
      });
    } catch (err) {
      setMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to update purchases',
      });
    } finally {
      setRunning(false);
    }
  };

  const visibleRows = result
    ? filterStatus === 'ALL'
      ? result.rows
      : result.rows.filter((r) => r.status === filterStatus)
    : [];

  return (
    <div className="space-y-5">
      <ReportPrintHeader
        title="GSTR-2A / 2B ITC Reconciliation Report"
        subtitle="Supplier filing match summary against commercial Purchase Register"
        periodLabel={`Period ${returnPeriod} (FY ${financialYear})`}
      />
      <div className="print:hidden bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#EA580C]" />
            <h1 className="text-xl font-black text-[#071F38] tracking-tight">
              GSTR-2A / 2B Automated Reconciliation
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Upload your GST Portal GSTR-2B JSON to run 2-way supplier matching against your live Purchase Register.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={returnPeriod}
            onChange={(e) => setReturnPeriod(e.target.value)}
            placeholder="MMYYYY"
            className="w-24 text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
          />
          <input
            type="text"
            value={financialYear}
            onChange={(e) => setFinancialYear(e.target.value)}
            placeholder="2026-2027"
            className="w-28 text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
          />
          <label className="px-4 py-2 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            {running ? 'Reconciling...' : 'Upload GSTR-2B JSON'}
            <input
              type="file"
              accept=".json,application/json"
              disabled={running}
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <button
            type="button"
            disabled={!result}
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-[#071F38] hover:bg-[#0D2E50] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
          <button
            type="button"
            onClick={() => void loadHistory()}
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

      {result && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <SummaryBox label="Matched Invoices" value={`${result.summary.matchedCount} (${result.summary.matchPercentage}%)`} tone="emerald" />
            <SummaryBox label="Reconciled ITC" value={formatInr(result.summary.reconciledItc)} tone="emerald" />
            <SummaryBox label="At-Risk ITC (Missing/Mismatch)" value={formatInr(result.summary.atRiskItc)} tone="rose" />
            <SummaryBox label="Unclaimed ITC (Missing in Books)" value={formatInr(result.summary.unclaimedItc)} tone="amber" />
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 flex items-center justify-center">
              <button
                type="button"
                disabled={running || result.summary.matchedCount === 0}
                onClick={() => void markMatchedReconciled()}
                className="w-full py-2.5 px-3 rounded-xl bg-[#071F38] hover:bg-[#0D2E52] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark Matched Reconciled
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-black text-[#071F38]">
                Reconciliation Details ({result.returnPeriod})
              </h2>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white"
              >
                <option value="ALL">All Statuses ({result.rows.length})</option>
                <option value="MATCHED">Matched ({result.summary.matchedCount})</option>
                <option value="MISMATCH_TAX">Tax Mismatch ({result.summary.mismatchCount})</option>
                <option value="MISSING_IN_2B">Missing in 2B ({result.summary.missingIn2bCount})</option>
                <option value="MISSING_IN_PURCHASES">Missing in Books ({result.summary.missingInPurchasesCount})</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-bold">Status</th>
                    <th className="text-left px-3 py-3 font-bold">Supplier &amp; GSTIN</th>
                    <th className="text-left px-3 py-3 font-bold">Invoice</th>
                    <th className="text-right px-3 py-3 font-bold">Books Tax</th>
                    <th className="text-right px-3 py-3 font-bold">2B Tax</th>
                    <th className="text-right px-3 py-3 font-bold">Diff</th>
                    <th className="text-left px-4 py-3 font-bold">Audit Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleRows.map((row) => (
                    <tr key={row.key} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            row.status === 'MATCHED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : row.status === 'MISSING_IN_PURCHASES'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-slate-800">{row.supplierName}</p>
                        <p className="text-[10px] font-mono text-slate-400">{row.supplierGstin}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-bold text-[#071F38]">{row.invoiceNumber}</p>
                        <p className="text-[10px] text-slate-400">{row.invoiceDate}</p>
                      </td>
                      <td className="px-3 py-3 text-right font-mono">{formatInr(row.booksTax || 0)}</td>
                      <td className="px-3 py-3 text-right font-mono">{formatInr(row.gstr2bTax || 0)}</td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-rose-700">
                        {formatInr(row.taxDifference || 0)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!result && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5">
          <h2 className="text-sm font-black text-[#071F38] mb-3">
            Saved GSTR-2B Reconciliation History
          </h2>
          {recentImports.length === 0 ? (
            <p className="text-xs text-slate-400">
              No GSTR-2B JSON files imported yet. Upload a portal JSON file above to run matching.
            </p>
          ) : (
            <div className="space-y-2">
              {recentImports.map((imp) => (
                <div
                  key={imp.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-[#071F38]">
                      Period {imp.returnPeriod} ({imp.financialYear})
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {imp.sourceFileName || 'gstr2b.json'} · {imp.totalInvoices} portal bills
                    </p>
                  </div>
                  <div className="text-right font-semibold">
                    <span className="text-emerald-700">{imp.matchedCount} matched</span>
                    {' · '}
                    <span className="text-rose-700">{imp.mismatchCount} mismatch</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ReportPrintFooter note="GSTR-2B ITC Reconciliation Statement — PakkaChittha Accountant ERP." />
    </div>
  );
}

function SummaryBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'emerald' | 'rose' | 'amber';
}) {
  const cls =
    tone === 'emerald'
      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
      : tone === 'rose'
        ? 'bg-rose-50/70 border-rose-200 text-rose-900'
        : 'bg-amber-50/70 border-amber-200 text-amber-900';

  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{label}</p>
      <p className="text-base font-black font-mono mt-1">{value}</p>
    </div>
  );
}
