'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, BookOpen, Printer, RefreshCw } from 'lucide-react';
import { AccountantScaleGate } from '@/components/accountant/AccountantScaleGate';
import { ReportPrintHeader, ReportPrintFooter } from '@/components/shared/ReportPrintChrome';
import { useAuth } from '@/context/AuthContext';

interface FyOption {
  id: string;
  code: string;
  label: string;
}

interface StatementEntry {
  entryId: string;
  voucherId: string;
  voucherNumber: string;
  voucherType: string;
  voucherDate: string;
  narration: string | null;
  entryNarration: string | null;
  debitAmount: string;
  creditAmount: string;
  runningBalance: string;
  runningBalanceType: 'DR' | 'CR';
}

interface StatementPayload {
  ledger: {
    id: string;
    name: string;
    code: string | null;
    nature: string;
    groupName: string;
    groupType: string;
  };
  fyCode: string;
  openingBalance: string;
  openingBalanceType: 'DR' | 'CR';
  periodDebitTotal: string;
  periodCreditTotal: string;
  closingBalance: string;
  closingBalanceType: 'DR' | 'CR';
  entries: StatementEntry[];
}

export default function LedgerStatementPage() {
  return (
    <AccountantScaleGate>
      <LedgerStatementContent />
    </AccountantScaleGate>
  );
}

function LedgerStatementContent() {
  const params = useParams<{ id: string }>();
  const ledgerId = params?.id || '';
  const { activeBusiness } = useAuth();
  const activeBusinessId = activeBusiness?.id;

  const [fyList, setFyList] = useState<FyOption[]>([]);
  const [fyCode, setFyCode] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statement, setStatement] = useState<StatementPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatement = useCallback(async () => {
    if (!activeBusinessId || !ledgerId) return;
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
      if (startDate) qs.set('startDate', startDate);
      if (endDate) qs.set('endDate', endDate);

      const res = await fetch(
        `/api/accounting/ledger-statement/${encodeURIComponent(ledgerId)}?${qs.toString()}`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load ledger statement');
      setStatement(data.statement || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statement');
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId, ledgerId, fyCode, startDate, endDate]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadStatement();
    });
    return () => {
      cancelled = true;
    };
  }, [loadStatement]);

  return (
    <div className="space-y-5">
      <ReportPrintHeader
        title={statement ? `Ledger Account — ${statement.ledger.name}` : 'Ledger Statement'}
        subtitle={
          statement
            ? `${statement.ledger.groupName} (${statement.ledger.groupType})${
                statement.ledger.code ? ` · Code: ${statement.ledger.code}` : ''
              }`
            : 'Ledger Account Statement'
        }
        periodLabel={
          startDate || endDate
            ? `${startDate || 'Start'} to ${endDate || 'Present'}${fyCode ? ` (FY ${fyCode})` : ''}`
            : fyCode
              ? `FY ${fyCode}`
              : 'Current FY'
        }
      />
      <div className="print:hidden bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/accountant/ledgers"
            className="text-xs font-bold text-slate-500 hover:text-[#071F38] inline-flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Ledgers
          </Link>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#EA580C]" />
            <h1 className="text-xl font-black text-[#071F38] tracking-tight">
              {statement ? `${statement.ledger.name} – Statement` : 'Ledger Statement'}
            </h1>
          </div>
          {statement && (
            <p className="text-xs text-slate-500 mt-1">
              {statement.ledger.groupName} ({statement.ledger.groupType})
              {statement.ledger.code ? ` · Code: ${statement.ledger.code}` : ''}
            </p>
          )}
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
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-2.5 py-2 bg-slate-50"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-2.5 py-2 bg-slate-50"
          />
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
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-xs font-semibold">
          {error}
        </div>
      )}

      {statement && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Opening Balance
            </p>
            <p className="text-lg font-black text-[#071F38] mt-1">
              ₹{Number(statement.openingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
              <span className="text-xs font-bold text-slate-500">
                {statement.openingBalanceType}
              </span>
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Period Debits
            </p>
            <p className="text-lg font-black text-blue-700 mt-1">
              ₹{Number(statement.periodDebitTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Period Credits
            </p>
            <p className="text-lg font-black text-emerald-700 mt-1">
              ₹{Number(statement.periodCreditTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-orange-200 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#EA580C]">
              Closing Balance
            </p>
            <p className="text-lg font-black text-[#071F38] mt-1">
              ₹{Number(statement.closingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
              <span className="text-xs font-bold text-slate-500">
                {statement.closingBalanceType}
              </span>
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !statement || statement.entries.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            No posted voucher entries for this ledger in the selected period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Voucher #</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Narration</th>
                  <th className="py-3 px-4 text-right">Debit (₹)</th>
                  <th className="py-3 px-4 text-right">Credit (₹)</th>
                  <th className="py-3 px-4 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {statement.entries.map((row) => (
                  <tr key={row.entryId} className="hover:bg-slate-50">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      {row.voucherDate}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-bold">
                      <Link
                        href={`/accountant/vouchers/${row.voucherId}`}
                        className="text-[#EA580C] hover:underline"
                      >
                        {row.voucherNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {row.voucherType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {row.entryNarration || row.narration || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-[#071F38]">
                      {Number(row.debitAmount) > 0
                        ? Number(row.debitAmount).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                          })
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-[#071F38]">
                      {Number(row.creditAmount) > 0
                        ? Number(row.creditAmount).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                          })
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-[#071F38] whitespace-nowrap">
                      ₹{Number(row.runningBalance).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}{' '}
                      <span className="text-[10px] text-slate-500">{row.runningBalanceType}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ReportPrintFooter note="Ledger Account Statement — PakkaChittha Accountant ERP." />
    </div>
  );
}

