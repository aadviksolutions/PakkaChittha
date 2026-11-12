'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, AlertTriangle, Download, Printer, RefreshCw, Scale } from 'lucide-react';
import { AccountantScaleGate } from '@/components/accountant/AccountantScaleGate';
import { ReportPrintHeader, ReportPrintFooter } from '@/components/shared/ReportPrintChrome';
import { useAuth } from '@/context/AuthContext';

interface FyOption {
  id: string;
  code: string;
  label: string;
}

interface TbRow {
  ledgerId: string;
  ledgerName: string;
  ledgerCode: string | null;
  groupName: string;
  groupType: string;
  openingDr: string;
  openingCr: string;
  periodDr: string;
  periodCr: string;
  closingDr: string;
  closingCr: string;
}

interface TbTotals {
  openingDr: string;
  openingCr: string;
  periodDr: string;
  periodCr: string;
  closingDr: string;
  closingCr: string;
  isBalanced: boolean;
}

export default function TrialBalancePage() {
  return (
    <AccountantScaleGate>
      <TrialBalanceContent />
    </AccountantScaleGate>
  );
}

function TrialBalanceContent() {
  const { activeBusiness } = useAuth();
  const activeBusinessId = activeBusiness?.id;

  const [fyList, setFyList] = useState<FyOption[]>([]);
  const [fyCode, setFyCode] = useState('');
  const [branchId, setBranchId] = useState('ALL');
  const [rows, setRows] = useState<TbRow[]>([]);
  const [totals, setTotals] = useState<TbTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
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

      const res = await fetch(`/api/accounting/trial-balance?${qs.toString()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate Trial Balance');
      setRows(data.rows || []);
      setTotals(data.totals || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Trial Balance');
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId, fyCode, branchId]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadReport();
    });
    return () => {
      cancelled = true;
    };
  }, [loadReport]);

  const exportCsv = () => {
    const header = [
      'Ledger Name',
      'Group',
      'Account Type',
      'Opening Dr',
      'Opening Cr',
      'Period Dr',
      'Period Cr',
      'Closing Dr',
      'Closing Cr',
    ];
    const lines = rows.map((r) =>
      [
        `"${r.ledgerName.replace(/"/g, '""')}"`,
        `"${r.groupName.replace(/"/g, '""')}"`,
        r.groupType,
        r.openingDr,
        r.openingCr,
        r.periodDr,
        r.periodCr,
        r.closingDr,
        r.closingCr,
      ].join(',')
    );
    if (totals) {
      lines.push(
        [
          '"GRAND TOTAL"',
          '""',
          '""',
          totals.openingDr,
          totals.openingCr,
          totals.periodDr,
          totals.periodCr,
          totals.closingDr,
          totals.closingCr,
        ].join(',')
      );
    }
    const blob = new Blob([[header.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trial-balance-${fyCode || 'fy'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <ReportPrintHeader
        title="Trial Balance (Opening · Period · Closing)"
        subtitle="Double-entry verified Debit and Credit summary across all ledger accounts"
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
            <Scale className="w-5 h-5 text-[#EA580C]" />
            <h1 className="text-xl font-black text-[#071F38] tracking-tight">Trial Balance</h1>
            {totals && (
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                  totals.isBalanced
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {totals.isBalanced ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" /> Dr = Cr Verified
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3" /> Opening Imbalance
                  </>
                )}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Double-entry verified Debit and Credit balances across all active ledgers.
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
            disabled={rows.length === 0}
            onClick={exportCsv}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[#071F38] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            disabled={rows.length === 0}
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
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-2.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            No ledgers yet. Set up your Chart of Accounts first.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Ledger Account</th>
                  <th className="py-3 px-4">Group</th>
                  <th className="py-3 px-4 text-right">Opening Dr</th>
                  <th className="py-3 px-4 text-right">Opening Cr</th>
                  <th className="py-3 px-4 text-right">Period Dr</th>
                  <th className="py-3 px-4 text-right">Period Cr</th>
                  <th className="py-3 px-4 text-right">Closing Dr</th>
                  <th className="py-3 px-4 text-right">Closing Cr</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {rows.map((r) => (
                  <tr key={r.ledgerId} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-bold">
                      <Link
                        href={`/accountant/ledgers/${r.ledgerId}`}
                        className="text-[#071F38] hover:text-[#EA580C]"
                      >
                        {r.ledgerName}
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500">
                      {r.groupName}{' '}
                      <span className="text-[10px] text-slate-400">({r.groupType})</span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-600">{r.openingDr}</td>
                    <td className="py-2.5 px-4 text-right text-slate-600">{r.openingCr}</td>
                    <td className="py-2.5 px-4 text-right font-medium text-blue-700">
                      {r.periodDr}
                    </td>
                    <td className="py-2.5 px-4 text-right font-medium text-emerald-700">
                      {r.periodCr}
                    </td>
                    <td className="py-2.5 px-4 text-right font-black text-[#071F38]">
                      {r.closingDr}
                    </td>
                    <td className="py-2.5 px-4 text-right font-black text-[#071F38]">
                      {r.closingCr}
                    </td>
                  </tr>
                ))}
              </tbody>
              {totals && (
                <tfoot>
                  <tr className="bg-slate-100/90 border-t-2 border-slate-300 font-black text-xs text-[#071F38]">
                    <td colSpan={2} className="py-3 px-4">
                      GRAND TOTAL ({totals.isBalanced ? '✓ Balanced' : '✗ Check Opening Balances'})
                    </td>
                    <td className="py-3 px-4 text-right">{totals.openingDr}</td>
                    <td className="py-3 px-4 text-right">{totals.openingCr}</td>
                    <td className="py-3 px-4 text-right text-blue-700">{totals.periodDr}</td>
                    <td className="py-3 px-4 text-right text-emerald-700">{totals.periodCr}</td>
                    <td className="py-3 px-4 text-right">{totals.closingDr}</td>
                    <td className="py-3 px-4 text-right">{totals.closingCr}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      <ReportPrintFooter note="Trial Balance Statement — Opening, Period & Closing Dr/Cr verified." />
    </div>
  );
}

