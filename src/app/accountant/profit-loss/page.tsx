'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Download,
  Printer,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { AccountantScaleGate } from '@/components/accountant/AccountantScaleGate';
import { ReportPrintHeader, ReportPrintFooter } from '@/components/shared/ReportPrintChrome';
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
  prevAmount?: string;
}

interface ProfitAndLossStatement {
  fyCode: string;
  compareFyCode: string | null;
  branchId: string | null;
  directIncome: StatementLineItem[];
  indirectIncome: StatementLineItem[];
  directExpenses: StatementLineItem[];
  indirectExpenses: StatementLineItem[];
  totals: {
    totalDirectIncome: string;
    totalDirectExpenses: string;
    grossProfit: string;
    totalIndirectIncome: string;
    totalIndirectExpenses: string;
    netProfit: string;
    prevGrossProfit?: string;
    prevNetProfit?: string;
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

export default function ProfitAndLossPage() {
  return (
    <AccountantScaleGate>
      <ProfitAndLossContent />
    </AccountantScaleGate>
  );
}

function ProfitAndLossContent() {
  const { activeBusiness } = useAuth();
  const activeBusinessId = activeBusiness?.id;

  const [fyList, setFyList] = useState<FyOption[]>([]);
  const [fyCode, setFyCode] = useState('');
  const [branchId, setBranchId] = useState('ALL');
  const [comparePrevFy, setComparePrevFy] = useState(false);
  const [statement, setStatement] = useState<ProfitAndLossStatement | null>(null);
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
      if (comparePrevFy) qs.set('comparePrevFy', 'true');

      const res = await fetch(`/api/accounting/profit-loss?${qs.toString()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load Profit & Loss');
      setStatement(data.statement || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Profit & Loss');
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId, fyCode, branchId, comparePrevFy]);

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
    const header = comparePrevFy
      ? ['Section', 'Ledger', 'Group', statement.fyCode, statement.compareFyCode || 'Prev FY']
      : ['Section', 'Ledger', 'Group', statement.fyCode];

    const appendRows = (section: string, items: StatementLineItem[]) =>
      items.map((item) =>
        [
          `"${section}"`,
          `"${item.ledgerName.replace(/"/g, '""')}"`,
          `"${item.groupName.replace(/"/g, '""')}"`,
          item.amount,
          ...(comparePrevFy ? [item.prevAmount || '0.00'] : []),
        ].join(',')
      );

    const lines = [
      ...appendRows('Trading - Direct Income', statement.directIncome),
      ...appendRows('Trading - Direct Expenses', statement.directExpenses),
      [
        '"SUMMARY"',
        '"Gross Profit / (Loss)"',
        '""',
        statement.totals.grossProfit,
        ...(comparePrevFy ? [statement.totals.prevGrossProfit || '0.00'] : []),
      ].join(','),
      ...appendRows('P&L - Indirect Income', statement.indirectIncome),
      ...appendRows('P&L - Indirect Expenses', statement.indirectExpenses),
      [
        '"SUMMARY"',
        '"Net Profit / (Loss)"',
        '""',
        statement.totals.netProfit,
        ...(comparePrevFy ? [statement.totals.prevNetProfit || '0.00'] : []),
      ].join(','),
    ];

    const blob = new Blob([[header.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit-loss-${statement.fyCode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const grossProfitNum = Number(statement?.totals.grossProfit || 0);
  const netProfitNum = Number(statement?.totals.netProfit || 0);

  return (
    <div className="space-y-5">
      <ReportPrintHeader
        title="Trading & Profit & Loss Account"
        subtitle="Schedule-aligned Indian Trading & P&L Statement"
        periodLabel={fyCode ? `FY ${fyCode}` : 'Current FY'}
        branchLabel={
          branchId === 'ALL'
            ? 'All Branches'
            : activeBusiness?.branches?.find((b) => b.id === branchId)?.name
        }
      />
      <div className="print:hidden bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#EA580C]" />
            <h1 className="text-xl font-black text-[#071F38] tracking-tight">
              Trading &amp; Profit &amp; Loss Account
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Schedule-aligned Indian Trading &amp; P&amp;L derived live from double-entry ledgers.
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
          <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={comparePrevFy}
              onChange={(e) => setComparePrevFy(e.target.checked)}
              className="rounded border-slate-300 text-[#EA580C] focus:ring-[#EA580C]"
            />
            Compare Prev FY
          </label>
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
            disabled={!statement}
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-[#071F38] hover:bg-[#0D2E50] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Gross Profit / (Loss) · Trading Account
                </p>
                <p
                  className={`text-2xl font-black mt-1 ${
                    grossProfitNum >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {formatInr(statement.totals.grossProfit)}
                </p>
                {comparePrevFy && statement.totals.prevGrossProfit !== undefined && (
                  <p className="text-xs text-slate-500 mt-1">
                    {statement.compareFyCode}: {formatInr(statement.totals.prevGrossProfit)}
                  </p>
                )}
              </div>
              <div
                className={`p-3 rounded-2xl ${
                  grossProfitNum >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}
              >
                {grossProfitNum >= 0 ? (
                  <TrendingUp className="w-6 h-6" />
                ) : (
                  <TrendingDown className="w-6 h-6" />
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Net Profit / (Loss) · P&amp;L Account
                </p>
                <p
                  className={`text-2xl font-black mt-1 ${
                    netProfitNum >= 0 ? 'text-[#071F38]' : 'text-rose-700'
                  }`}
                >
                  {formatInr(statement.totals.netProfit)}
                </p>
                {comparePrevFy && statement.totals.prevNetProfit !== undefined && (
                  <p className="text-xs text-slate-500 mt-1">
                    {statement.compareFyCode}: {formatInr(statement.totals.prevNetProfit)}
                  </p>
                )}
              </div>
              <div
                className={`p-3 rounded-2xl ${
                  netProfitNum >= 0 ? 'bg-orange-50 text-[#EA580C]' : 'bg-rose-50 text-rose-600'
                }`}
              >
                {netProfitNum >= 0 ? (
                  <TrendingUp className="w-6 h-6" />
                ) : (
                  <TrendingDown className="w-6 h-6" />
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-black text-[#071F38]">
                Part I — Trading Account ({statement.fyCode})
              </h2>
              <span className="text-xs font-bold text-slate-600">
                Gross Profit: {formatInr(statement.totals.grossProfit)}
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              <StatementSide
                title="Direct Expenses (Dr)"
                items={statement.directExpenses}
                totalLabel="Total Direct Expenses"
                totalValue={statement.totals.totalDirectExpenses}
                comparePrevFy={comparePrevFy}
                compareFyCode={statement.compareFyCode}
              />
              <StatementSide
                title="Direct Income & Sales (Cr)"
                items={statement.directIncome}
                totalLabel="Total Direct Income"
                totalValue={statement.totals.totalDirectIncome}
                comparePrevFy={comparePrevFy}
                compareFyCode={statement.compareFyCode}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-black text-[#071F38]">
                Part II — Profit &amp; Loss Account ({statement.fyCode})
              </h2>
              <span className="text-xs font-bold text-slate-600">
                Net Profit: {formatInr(statement.totals.netProfit)}
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              <StatementSide
                title="Indirect Expenses & Overheads (Dr)"
                items={statement.indirectExpenses}
                totalLabel="Total Indirect Expenses"
                totalValue={statement.totals.totalIndirectExpenses}
                comparePrevFy={comparePrevFy}
                compareFyCode={statement.compareFyCode}
              />
              <StatementSide
                title="Indirect Income (Cr)"
                items={statement.indirectIncome}
                totalLabel="Total Indirect Income"
                totalValue={statement.totals.totalIndirectIncome}
                comparePrevFy={comparePrevFy}
                compareFyCode={statement.compareFyCode}
              />
            </div>
          </div>
        </>
      )}

      <ReportPrintFooter note="Trading & Profit & Loss Account — PakkaChittha Accountant ERP." />
    </div>
  );
}

function StatementSide({
  title,
  items,
  totalLabel,
  totalValue,
  comparePrevFy,
  compareFyCode,
}: {
  title: string;
  items: StatementLineItem[];
  totalLabel: string;
  totalValue: string;
  comparePrevFy: boolean;
  compareFyCode: string | null;
}) {
  return (
    <div className="p-5 flex flex-col justify-between">
      <div>
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
          {title}
        </h3>
        {items.length === 0 ? (
          <p className="text-xs text-slate-400 py-4">No posted entries in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100">
                  <th className="text-left pb-2 font-semibold">Ledger</th>
                  <th className="text-right pb-2 font-semibold">Current</th>
                  {comparePrevFy && (
                    <th className="text-right pb-2 font-semibold">
                      {compareFyCode || 'Prev FY'}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.ledgerId} className="hover:bg-slate-50/70">
                    <td className="py-2 pr-3">
                      <Link
                        href={`/accountant/ledgers/${item.ledgerId}`}
                        className="font-semibold text-[#071F38] hover:text-[#EA580C]"
                      >
                        {item.ledgerName}
                      </Link>
                      <span className="block text-[10px] text-slate-400">{item.groupName}</span>
                    </td>
                    <td className="py-2 text-right font-mono font-semibold text-slate-800 whitespace-nowrap">
                      {formatInr(item.amount)}
                    </td>
                    {comparePrevFy && (
                      <td className="py-2 text-right font-mono text-slate-500 whitespace-nowrap">
                        {formatInr(item.prevAmount || '0.00')}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-black text-[#071F38]">
        <span>{totalLabel}</span>
        <span className="font-mono">{formatInr(totalValue)}</span>
      </div>
    </div>
  );
}
