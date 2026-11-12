'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Download, Printer, RefreshCw, Users } from 'lucide-react';
import { AccountantScaleGate } from '@/components/accountant/AccountantScaleGate';
import { ReportPrintHeader, ReportPrintFooter } from '@/components/shared/ReportPrintChrome';
import { useAuth } from '@/context/AuthContext';

interface AgeingBuckets {
  current: string;
  days1to30: string;
  days31to60: string;
  days61to90: string;
  days90plus: string;
  total: string;
}

interface PartyAgeingGroup {
  partyId: string;
  partyName: string;
  partyContact: string;
  documentCount: number;
  buckets: AgeingBuckets;
}

interface PartyAgeingDocument {
  id: string;
  documentNumber: string;
  partyId: string;
  partyName: string;
  documentDate: string;
  dueDate: string;
  daysOverdue: number;
  bucket: 'current' | 'days1to30' | 'days31to60' | 'days61to90' | 'days90plus';
  totalAmount: string;
  balanceDue: string;
}

interface PartyAgeingReport {
  asOfDate: string;
  receivables: {
    totals: AgeingBuckets;
    parties: PartyAgeingGroup[];
    documents: PartyAgeingDocument[];
  };
  payables: {
    totals: AgeingBuckets;
    parties: PartyAgeingGroup[];
    documents: PartyAgeingDocument[];
  };
}

function formatInr(amount: string | number): string {
  const num = typeof amount === 'number' ? amount : Number(amount || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

const BUCKET_LABELS: Record<PartyAgeingDocument['bucket'], string> = {
  current: 'Not Due',
  days1to30: '1-30 Days',
  days31to60: '31-60 Days',
  days61to90: '61-90 Days',
  days90plus: '90+ Days',
};

export default function ReceivablesPayablesPage() {
  return (
    <AccountantScaleGate>
      <ReceivablesPayablesContent />
    </AccountantScaleGate>
  );
}

function ReceivablesPayablesContent() {
  const { activeBusiness } = useAuth();
  const activeBusinessId = activeBusiness?.id;

  const [tab, setTab] = useState<'RECEIVABLES' | 'PAYABLES'>('RECEIVABLES');
  const [viewMode, setViewMode] = useState<'PARTY' | 'BILL'>('PARTY');
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<PartyAgeingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    if (!activeBusinessId) return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ businessId: activeBusinessId });
      if (asOfDate) qs.set('asOfDate', asOfDate);

      const res = await fetch(`/api/accounting/party-ageing?${qs.toString()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load party ageing report');
      setReport(data.report || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load party ageing report');
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId, asOfDate]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadReport();
    });
    return () => {
      cancelled = true;
    };
  }, [loadReport]);

  const activeSide =
    tab === 'RECEIVABLES' ? report?.receivables : report?.payables;

  const exportCsv = () => {
    if (!report || !activeSide) return;
    const rows =
      viewMode === 'PARTY'
        ? [
            'Party,Contact,Bills,Current,1-30 Days,31-60 Days,61-90 Days,90+ Days,Total Due',
            ...activeSide.parties.map((p) =>
              [
                `"${p.partyName.replace(/"/g, '""')}"`,
                `"${p.partyContact.replace(/"/g, '""')}"`,
                p.documentCount,
                p.buckets.current,
                p.buckets.days1to30,
                p.buckets.days31to60,
                p.buckets.days61to90,
                p.buckets.days90plus,
                p.buckets.total,
              ].join(',')
            ),
          ]
        : [
            'Bill No,Party,Doc Date,Due Date,Days Overdue,Bucket,Total Amount,Balance Due',
            ...activeSide.documents.map((d) =>
              [
                `"${d.documentNumber.replace(/"/g, '""')}"`,
                `"${d.partyName.replace(/"/g, '""')}"`,
                d.documentDate,
                d.dueDate,
                d.daysOverdue,
                BUCKET_LABELS[d.bucket],
                d.totalAmount,
                d.balanceDue,
              ].join(',')
            ),
          ];

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tab.toLowerCase()}-ageing-${report.asOfDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <ReportPrintHeader
        title={`${tab === 'RECEIVABLES' ? 'Receivables' : 'Payables'} Ageing Summary`}
        subtitle="Bill-by-bill Sundry Debtors & Creditors ageing schedule"
        periodLabel={asOfDate ? `As of ${asOfDate}` : 'Current Date'}
      />
      <div className="print:hidden bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#EA580C]" />
            <h1 className="text-xl font-black text-[#071F38] tracking-tight">
              Receivables &amp; Payables Ageing
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Live bill-by-bill Sundry Debtors &amp; Creditors overdue buckets from invoices and purchase bills.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50">
            <button
              type="button"
              onClick={() => setTab('RECEIVABLES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                tab === 'RECEIVABLES'
                  ? 'bg-[#071F38] text-white'
                  : 'text-slate-600 hover:text-[#071F38]'
              }`}
            >
              Receivables
            </button>
            <button
              type="button"
              onClick={() => setTab('PAYABLES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                tab === 'PAYABLES'
                  ? 'bg-[#071F38] text-white'
                  : 'text-slate-600 hover:text-[#071F38]'
              }`}
            >
              Payables
            </button>
          </div>

          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
          />

          <button
            type="button"
            disabled={!activeSide}
            onClick={exportCsv}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[#071F38] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <button
            type="button"
            disabled={!activeSide}
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-[#071F38] hover:bg-[#0D2E50] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>

          <button
            type="button"
            onClick={() => void loadReport()}
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

      {activeSide && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <BucketCard label="Current / Not Due" amount={activeSide.totals.current} />
            <BucketCard label="1–30 Days" amount={activeSide.totals.days1to30} />
            <BucketCard label="31–60 Days" amount={activeSide.totals.days31to60} />
            <BucketCard label="61–90 Days" amount={activeSide.totals.days61to90} />
            <BucketCard label="90+ Days" amount={activeSide.totals.days90plus} warn />
            <BucketCard label="Total Outstanding" amount={activeSide.totals.total} dark />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-black text-[#071F38]">
                {tab === 'RECEIVABLES' ? 'Customer Debtors' : 'Supplier Creditors'} Ageing
              </h2>
              <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-white">
                <button
                  type="button"
                  onClick={() => setViewMode('PARTY')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    viewMode === 'PARTY' ? 'bg-[#EA580C] text-white' : 'text-slate-600'
                  }`}
                >
                  Party-wise ({activeSide.parties.length})
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('BILL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    viewMode === 'BILL' ? 'bg-[#EA580C] text-white' : 'text-slate-600'
                  }`}
                >
                  Bill-wise ({activeSide.documents.length})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {viewMode === 'PARTY' ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50/60 text-slate-500 border-b border-slate-200">
                      <th className="text-left px-4 py-3 font-bold">Party</th>
                      <th className="text-center px-3 py-3 font-bold">Bills</th>
                      <th className="text-right px-3 py-3 font-bold">Current</th>
                      <th className="text-right px-3 py-3 font-bold">1–30d</th>
                      <th className="text-right px-3 py-3 font-bold">31–60d</th>
                      <th className="text-right px-3 py-3 font-bold">61–90d</th>
                      <th className="text-right px-3 py-3 font-bold">90+d</th>
                      <th className="text-right px-4 py-3 font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeSide.parties.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-slate-400">
                          No open outstanding bills as of {report?.asOfDate}.
                        </td>
                      </tr>
                    ) : (
                      activeSide.parties.map((p) => (
                        <tr key={p.partyId} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3">
                            <p className="font-bold text-[#071F38]">{p.partyName}</p>
                            {p.partyContact && (
                              <p className="text-[10px] text-slate-400">{p.partyContact}</p>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center font-semibold text-slate-600">
                            {p.documentCount}
                          </td>
                          <td className="px-3 py-3 text-right font-mono">{formatInr(p.buckets.current)}</td>
                          <td className="px-3 py-3 text-right font-mono">{formatInr(p.buckets.days1to30)}</td>
                          <td className="px-3 py-3 text-right font-mono">{formatInr(p.buckets.days31to60)}</td>
                          <td className="px-3 py-3 text-right font-mono">{formatInr(p.buckets.days61to90)}</td>
                          <td className="px-3 py-3 text-right font-mono text-rose-700 font-semibold">
                            {formatInr(p.buckets.days90plus)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-black text-[#071F38]">
                            {formatInr(p.buckets.total)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50/60 text-slate-500 border-b border-slate-200">
                      <th className="text-left px-4 py-3 font-bold">Document</th>
                      <th className="text-left px-3 py-3 font-bold">Party</th>
                      <th className="text-center px-3 py-3 font-bold">Doc Date</th>
                      <th className="text-center px-3 py-3 font-bold">Due Date</th>
                      <th className="text-center px-3 py-3 font-bold">Overdue</th>
                      <th className="text-right px-3 py-3 font-bold">Bill Amount</th>
                      <th className="text-right px-4 py-3 font-bold">Balance Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeSide.documents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400">
                          No open documents found as of {report?.asOfDate}.
                        </td>
                      </tr>
                    ) : (
                      activeSide.documents.map((doc) => (
                        <tr key={doc.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3 font-bold text-[#071F38]">
                            {doc.documentNumber}
                          </td>
                          <td className="px-3 py-3 text-slate-700 font-medium">{doc.partyName}</td>
                          <td className="px-3 py-3 text-center text-slate-500">{doc.documentDate}</td>
                          <td className="px-3 py-3 text-center text-slate-500">{doc.dueDate}</td>
                          <td className="px-3 py-3 text-center">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                doc.daysOverdue > 90
                                  ? 'bg-rose-50 text-rose-700'
                                  : doc.daysOverdue > 0
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              {doc.daysOverdue > 0 ? `${doc.daysOverdue}d · ` : ''}
                              {BUCKET_LABELS[doc.bucket]}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-slate-500">
                            {formatInr(doc.totalAmount)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-black text-[#071F38]">
                            {formatInr(doc.balanceDue)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      <ReportPrintFooter note="Receivables & Payables Ageing Schedule — PakkaChittha Accountant ERP." />
    </div>
  );
}

function BucketCard({
  label,
  amount,
  warn = false,
  dark = false,
}: {
  label: string;
  amount: string;
  warn?: boolean;
  dark?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        dark
          ? 'bg-[#071F38] text-white border-[#071F38] print-surface-light'
          : warn
            ? 'bg-rose-50/70 border-rose-200 text-rose-900'
            : 'bg-white border-slate-200/90 text-[#071F38]'
      }`}
    >
      <p
        className={`text-[10px] font-bold uppercase tracking-wider ${
          dark ? 'text-slate-300' : 'text-slate-500'
        }`}
      >
        {label}
      </p>
      <p className="text-base font-black font-mono mt-1">{formatInr(amount)}</p>
    </div>
  );
}
