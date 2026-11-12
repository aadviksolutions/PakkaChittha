'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Landmark,
  RefreshCw,
} from 'lucide-react';
import { AccountantScaleGate } from '@/components/accountant/AccountantScaleGate';
import { useAuth } from '@/context/AuthContext';

interface FyOption {
  id: string;
  code: string;
  label: string;
}

interface StatementLineItem {
  ledgerId: string;
  ledgerName: string;
  ledgerCode: string | null;
  groupName: string;
  amount: string;
}

interface BalanceSheetSection {
  groupName: string;
  items: StatementLineItem[];
  subtotal: string;
}

interface BalanceSheetStatement {
  fyCode: string;
  branchId: string | null;
  liabilitiesAndEquity: {
    capital: BalanceSheetSection[];
    currentYearProfitOrLoss: string;
    longTermLiabilities: BalanceSheetSection[];
    currentLiabilities: BalanceSheetSection[];
    total: string;
  };
  assets: {
    fixedAssets: BalanceSheetSection[];
    currentAssets: BalanceSheetSection[];
    total: string;
  };
  difference: string;
  isBalanced: boolean;
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

export default function BalanceSheetPage() {
  return (
    <AccountantScaleGate>
      <BalanceSheetContent />
    </AccountantScaleGate>
  );
}

function BalanceSheetContent() {
  const { activeBusiness } = useAuth();
  const activeBusinessId = activeBusiness?.id;

  const [fyList, setFyList] = useState<FyOption[]>([]);
  const [fyCode, setFyCode] = useState('');
  const [branchId, setBranchId] = useState('ALL');
  const [statement, setStatement] = useState<BalanceSheetStatement | null>(null);
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

      const res = await fetch(`/api/accounting/balance-sheet?${qs.toString()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load Balance Sheet');
      setStatement(data.statement || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Balance Sheet');
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
    const rows: string[] = ['Side,Section,Ledger,Amount'];
    const addSections = (side: string, sections: BalanceSheetSection[]) => {
      for (const sec of sections) {
        for (const item of sec.items) {
          rows.push(
            [
              `"${side}"`,
              `"${sec.groupName.replace(/"/g, '""')}"`,
              `"${item.ledgerName.replace(/"/g, '""')}"`,
              item.amount,
            ].join(',')
          );
        }
      }
    };

    addSections('Capital', statement.liabilitiesAndEquity.capital);
    rows.push(
      `"Capital","Profit & Loss A/c","Current Period Net Profit/(Loss)",${statement.liabilitiesAndEquity.currentYearProfitOrLoss}`
    );
    addSections('Long-Term Liabilities', statement.liabilitiesAndEquity.longTermLiabilities);
    addSections('Current Liabilities', statement.liabilitiesAndEquity.currentLiabilities);
    rows.push(
      `"TOTAL","Sources of Funds","Total Liabilities & Equity",${statement.liabilitiesAndEquity.total}`
    );

    addSections('Fixed Assets', statement.assets.fixedAssets);
    addSections('Current Assets', statement.assets.currentAssets);
    rows.push(`"TOTAL","Application of Funds","Total Assets",${statement.assets.total}`);

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance-sheet-${statement.fyCode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Landmark className="w-5 h-5 text-[#EA580C]" />
            <h1 className="text-xl font-black text-[#071F38] tracking-tight">Balance Sheet</h1>
            {statement && (
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                  statement.isBalanced
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {statement.isBalanced ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" /> Assets = Liabilities &amp; Equity
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3" /> Difference: {formatInr(statement.difference)}
                  </>
                )}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Schedule-aligned Sources &amp; Application of Funds verified against Trial Balance &amp; P&amp;L.
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col justify-between">
            <div>
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                <h2 className="text-sm font-black text-[#071F38]">
                  Sources of Funds — Capital &amp; Liabilities
                </h2>
              </div>
              <div className="p-5 space-y-5">
                <SectionBlock title="Capital & Reserves" sections={statement.liabilitiesAndEquity.capital} />
                <div className="rounded-xl bg-orange-50/70 border border-orange-100 px-4 py-3 flex items-center justify-between text-xs">
                  <span className="font-bold text-[#071F38]">
                    Current Period Net Profit / (Loss)
                  </span>
                  <span className="font-mono font-black text-[#EA580C]">
                    {formatInr(statement.liabilitiesAndEquity.currentYearProfitOrLoss)}
                  </span>
                </div>
                <SectionBlock
                  title="Long-Term Liabilities"
                  sections={statement.liabilitiesAndEquity.longTermLiabilities}
                />
                <SectionBlock
                  title="Current Liabilities"
                  sections={statement.liabilitiesAndEquity.currentLiabilities}
                />
              </div>
            </div>
            <div className="px-5 py-4 bg-[#071F38] text-white flex items-center justify-between text-sm font-black">
              <span>Total Liabilities &amp; Equity</span>
              <span className="font-mono">{formatInr(statement.liabilitiesAndEquity.total)}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col justify-between">
            <div>
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                <h2 className="text-sm font-black text-[#071F38]">
                  Application of Funds — Assets
                </h2>
              </div>
              <div className="p-5 space-y-5">
                <SectionBlock title="Fixed Assets" sections={statement.assets.fixedAssets} />
                <SectionBlock title="Current Assets" sections={statement.assets.currentAssets} />
              </div>
            </div>
            <div className="px-5 py-4 bg-[#071F38] text-white flex items-center justify-between text-sm font-black">
              <span>Total Assets</span>
              <span className="font-mono">{formatInr(statement.assets.total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionBlock({
  title,
  sections,
}: {
  title: string;
  sections: BalanceSheetSection[];
}) {
  return (
    <div>
      <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
        {title}
      </h3>
      {sections.length === 0 ? (
        <p className="text-xs text-slate-400">No non-zero ledgers.</p>
      ) : (
        <div className="space-y-3">
          {sections.map((sec) => (
            <div key={sec.groupName} className="rounded-xl border border-slate-100 p-3 bg-slate-50/50">
              <div className="flex items-center justify-between text-xs font-bold text-[#071F38] mb-2">
                <span>{sec.groupName}</span>
                <span className="font-mono">{formatInr(sec.subtotal)}</span>
              </div>
              <div className="space-y-1.5 pl-2 border-l-2 border-slate-200">
                {sec.items.map((item) => (
                  <div
                    key={item.ledgerId}
                    className="flex items-center justify-between text-xs text-slate-600"
                  >
                    <Link
                      href={`/accountant/ledgers/${item.ledgerId}`}
                      className="hover:text-[#EA580C] font-medium"
                    >
                      {item.ledgerName}
                    </Link>
                    <span className="font-mono font-semibold text-slate-800">
                      {formatInr(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
