'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, Download, RefreshCw } from 'lucide-react';
import { AccountantScaleGate } from '@/components/accountant/AccountantScaleGate';
import { useAuth } from '@/context/AuthContext';

interface FyOption {
  id: string;
  code: string;
  label: string;
}

interface CashFlowActivityLine {
  label: string;
  amount: string;
}

interface CashFlowStatement {
  fyCode: string;
  branchId: string | null;
  openingCashAndBank: string;
  operatingActivities: CashFlowActivityLine[];
  netOperatingCash: string;
  investingActivities: CashFlowActivityLine[];
  netInvestingCash: string;
  financingActivities: CashFlowActivityLine[];
  netFinancingCash: string;
  netCashChange: string;
  closingCashAndBank: string;
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

export default function CashFlowPage() {
  return (
    <AccountantScaleGate>
      <CashFlowContent />
    </AccountantScaleGate>
  );
}

function CashFlowContent() {
  const { activeBusiness } = useAuth();
  const activeBusinessId = activeBusiness?.id;

  const [fyList, setFyList] = useState<FyOption[]>([]);
  const [fyCode, setFyCode] = useState('');
  const [branchId, setBranchId] = useState('ALL');
  const [statement, setStatement] = useState<CashFlowStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatement = useCallback(async () => {
    if (!activeBusinessId) return;
    setLoading(true);
    setError(null);
    try {
      let targetFy = fyCode;
      if (!targetFy) {
        const fyRes = await fetch(
          `/api/accounting/fiscal-years?businessId=${encodeURIComponent(activeBusinessId)}`,
          { cache: 'no-store' }
        );
        const fyData = await fyRes.json();
        if (fyRes.ok && Array.isArray(fyData.financialYears) && fyData.financialYears.length > 0) {
          setFyList(fyData.financialYears);
          targetFy = fyData.financialYears[0].code;
          setFyCode(targetFy);
        }
      }

      const qs = new URLSearchParams({ businessId: activeBusinessId });
      if (targetFy) qs.set('fyCode', targetFy);
      if (branchId && branchId !== 'ALL') qs.set('branchId', branchId);

      const res = await fetch(`/api/accounting/cash-flow?${qs.toString()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load Cash Flow statement');
      setStatement(data.statement || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Cash Flow statement');
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId, fyCode, branchId]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadStatement();
    });
    return () => {
      cancelled = true;
    };
  }, [loadStatement]);

  const exportCsv = () => {
    if (!statement) return;
    const rows: string[] = [
      'Category,Activity,Amount',
      `"Opening","Opening Cash & Bank Balance",${statement.openingCashAndBank}`,
    ];
    for (const a of statement.operatingActivities) {
      rows.push(`"Operating","${a.label.replace(/"/g, '""')}",${a.amount}`);
    }
    rows.push(`"Operating","Net Operating Cash",${statement.netOperatingCash}`);
    for (const a of statement.investingActivities) {
      rows.push(`"Investing","${a.label.replace(/"/g, '""')}",${a.amount}`);
    }
    rows.push(`"Investing","Net Investing Cash",${statement.netInvestingCash}`);
    for (const a of statement.financingActivities) {
      rows.push(`"Financing","${a.label.replace(/"/g, '""')}",${a.amount}`);
    }
    rows.push(`"Financing","Net Financing Cash",${statement.netFinancingCash}`);
    rows.push(`"Summary","Net Change in Cash",${statement.netCashChange}`);
    rows.push(`"Summary","Closing Cash & Bank Balance",${statement.closingCashAndBank}`);

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash-flow-${statement.fyCode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#EA580C]" />
            <h1 className="text-xl font-black text-[#071F38] tracking-tight">
              Cash Flow Statement
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Direct method Cash &amp; Bank movement classified across Operating, Investing, and Financing activities.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {fyList.length > 0 && (
            <select
              value={fyCode}
              onChange={(e) => setFyCode(e.target.value)}
              className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
            >
              {fyList.map((f) => (
                <option key={f.id} value={f.code}>
                  {f.label}
                </option>
              ))}
            </select>
          )}
          {activeBusiness?.branches && activeBusiness.branches.length > 0 && (
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
            >
              <option value="ALL">All Branches</option>
              {activeBusiness.branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            disabled={!statement}
            onClick={exportCsv}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[#071F38] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => void loadStatement()}
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

      {statement && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard label="Opening Cash & Bank" value={statement.openingCashAndBank} />
            <SummaryCard label="Net Cash Change" value={statement.netCashChange} highlight />
            <SummaryCard label="Closing Cash & Bank" value={statement.closingCashAndBank} />
          </div>

          <div className="space-y-4">
            <ActivitySection
              title="A. Cash Flow from Operating Activities"
              lines={statement.operatingActivities}
              subtotalLabel="Net Cash from Operating Activities"
              subtotal={statement.netOperatingCash}
            />
            <ActivitySection
              title="B. Cash Flow from Investing Activities"
              lines={statement.investingActivities}
              subtotalLabel="Net Cash from Investing Activities"
              subtotal={statement.netInvestingCash}
            />
            <ActivitySection
              title="C. Cash Flow from Financing Activities"
              lines={statement.financingActivities}
              subtotalLabel="Net Cash from Financing Activities"
              subtotal={statement.netFinancingCash}
            />
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  const num = Number(value || 0);
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className={`text-2xl font-black font-mono mt-1 ${
          highlight
            ? num >= 0
              ? 'text-emerald-700'
              : 'text-rose-700'
            : 'text-[#071F38]'
        }`}
      >
        {formatInr(value)}
      </p>
    </div>
  );
}

function ActivitySection({
  title,
  lines,
  subtotalLabel,
  subtotal,
}: {
  title: string;
  lines: CashFlowActivityLine[];
  subtotalLabel: string;
  subtotal: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
        <h2 className="text-sm font-black text-[#071F38]">{title}</h2>
      </div>
      <div className="p-5">
        {lines.length === 0 ? (
          <p className="text-xs text-slate-400">No cash movements classified under this section.</p>
        ) : (
          <div className="space-y-2">
            {lines.map((line) => (
              <div
                key={line.label}
                className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0"
              >
                <span className="font-semibold text-slate-700">{line.label}</span>
                <span
                  className={`font-mono font-bold ${
                    Number(line.amount) >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {formatInr(line.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-black text-[#071F38]">
          <span>{subtotalLabel}</span>
          <span className="font-mono">{formatInr(subtotal)}</span>
        </div>
      </div>
    </div>
  );
}
