'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Percent, PlusCircle, RefreshCw } from 'lucide-react';
import { AccountantScaleGate } from '@/components/accountant/AccountantScaleGate';
import { useAuth } from '@/context/AuthContext';

interface TdsSectionRule {
  code: string;
  section: string;
  description: string;
  ratePercent: number;
  annualThreshold: number;
  singleTxnThreshold?: number;
  excessOnlyThreshold?: boolean;
  nature: 'TDS' | 'TCS';
}

interface PartyExposure {
  partyType: string;
  partyName: string;
  gstinOrPan: string | null;
  documentCount: number;
  fyTaxableTurnover: string;
  suggestedSection: string;
  thresholdAmount: string;
  exceedsThreshold: boolean;
}

interface TdsVoucherEntry {
  entryId: string;
  voucherId: string;
  voucherNumber: string;
  voucherDate: string;
  narration: string;
  debitAmount: string;
  creditAmount: string;
}

interface TdsRegisterResponse {
  fyCode: string;
  rules: TdsSectionRule[];
  tdsPayableNetBalance: string;
  tdsVoucherEntries: TdsVoucherEntry[];
  exposures: PartyExposure[];
}

interface LedgerOption {
  id: string;
  name: string;
  code: string | null;
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

export default function TdsTcsCompliancePage() {
  return (
    <AccountantScaleGate>
      <TdsTcsContent />
    </AccountantScaleGate>
  );
}

function TdsTcsContent() {
  const { activeBusiness } = useAuth();
  const activeBusinessId = activeBusiness?.id;

  const [register, setRegister] = useState<TdsRegisterResponse | null>(null);
  const [ledgers, setLedgers] = useState<LedgerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const [sectionCode, setSectionCode] = useState('194J_PROF');
  const [partyName, setPartyName] = useState('');
  const [tdsAmount, setTdsAmount] = useState('');
  const [debitLedgerId, setDebitLedgerId] = useState('');
  const [voucherDate, setVoucherDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadRegister = useCallback(async () => {
    if (!activeBusinessId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/gst/tds-tcs?businessId=${encodeURIComponent(activeBusinessId)}`,
        { cache: 'no-store' }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load TDS/TCS register');
      setRegister(json.register || null);
      setLedgers(json.ledgers || []);
      if (!debitLedgerId && Array.isArray(json.ledgers) && json.ledgers.length > 0) {
        const preferred =
          json.ledgers.find((l: LedgerOption) => l.code === 'CREDITORS') ||
          json.ledgers[0];
        setDebitLedgerId(preferred.id);
      }
    } catch (err) {
      setMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to load TDS/TCS register',
      });
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId, debitLedgerId]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadRegister();
    });
    return () => {
      cancelled = true;
    };
  }, [loadRegister]);

  const postDeduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusinessId || !register) return;
    setPosting(true);
    setMsg(null);
    try {
      const res = await fetch('/api/gst/tds-tcs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: activeBusinessId,
          fyCode: register.fyCode,
          debitLedgerId,
          sectionCode,
          partyName,
          tdsAmount,
          voucherDate,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to post TDS journal voucher');
      setMsg({
        type: 'ok',
        text: `Posted TDS provision voucher ${json.voucher?.voucherNumber || ''} to double-entry books.`,
      });
      setPartyName('');
      setTdsAmount('');
      await loadRegister();
    } catch (err) {
      setMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to post TDS voucher',
      });
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-[#EA580C]" />
            <h1 className="text-xl font-black text-[#071F38] tracking-tight">
              TDS / TCS Compliance &amp; Section Threshold Register
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Monitor FY aggregate vendor/expense thresholds under Sections 194C, 194J, 194H, 194I, 194Q &amp; 206C(1H), and post real TDS journal provisions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadRegister()}
          className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer self-start"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
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

      {register && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-sm font-black text-[#071F38]">
                  Party FY Threshold Monitor ({register.fyCode})
                </h2>
                <span className="text-xs font-black text-[#EA580C]">
                  TDS Payable A/c Balance: {formatInr(register.tdsPayableNetBalance)}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-200">
                      <th className="text-left px-4 py-3 font-bold">Party</th>
                      <th className="text-left px-3 py-3 font-bold">Section</th>
                      <th className="text-right px-3 py-3 font-bold">FY Aggregate</th>
                      <th className="text-right px-3 py-3 font-bold">Threshold</th>
                      <th className="text-center px-4 py-3 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {register.exposures.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-400">
                          No party transactions recorded in {register.fyCode}.
                        </td>
                      </tr>
                    ) : (
                      register.exposures.map((exp, idx) => (
                        <tr key={`${exp.partyName}-${idx}`} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3">
                            <p className="font-bold text-[#071F38]">{exp.partyName}</p>
                            <p className="text-[10px] text-slate-400">
                              {exp.partyType} · {exp.documentCount} bills
                              {exp.gstinOrPan ? ` · PAN: ${exp.gstinOrPan}` : ''}
                            </p>
                          </td>
                          <td className="px-3 py-3 font-semibold text-slate-700">{exp.suggestedSection}</td>
                          <td className="px-3 py-3 text-right font-mono font-bold text-[#071F38]">
                            {formatInr(exp.fyTaxableTurnover)}
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-slate-500">
                            {formatInr(exp.thresholdAmount)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                exp.exceedsThreshold
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {exp.exceedsThreshold ? 'Threshold Exceeded' : 'Within Limit'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                <h2 className="text-sm font-black text-[#071F38]">
                  Posted TDS Payable Ledger Entries ({register.tdsVoucherEntries.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-200">
                      <th className="text-left px-4 py-3 font-bold">Voucher</th>
                      <th className="text-left px-3 py-3 font-bold">Date</th>
                      <th className="text-left px-3 py-3 font-bold">Narration</th>
                      <th className="text-right px-3 py-3 font-bold">Dr (Challan Paid)</th>
                      <th className="text-right px-4 py-3 font-bold">Cr (TDS Deducted)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {register.tdsVoucherEntries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-slate-400">
                          No posted TDS entries in {register.fyCode} yet.
                        </td>
                      </tr>
                    ) : (
                      register.tdsVoucherEntries.map((v) => (
                        <tr key={v.entryId}>
                          <td className="px-4 py-3 font-bold text-[#071F38]">{v.voucherNumber}</td>
                          <td className="px-3 py-3 text-slate-500">{v.voucherDate}</td>
                          <td className="px-3 py-3 text-slate-700">{v.narration}</td>
                          <td className="px-3 py-3 text-right font-mono">{formatInr(v.debitAmount)}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                            {formatInr(v.creditAmount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <form
            onSubmit={postDeduction}
            className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4 h-fit"
          >
            <div>
              <h2 className="text-sm font-black text-[#071F38]">Post TDS Provision Journal</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Debits selected Creditor/Expense ledger and credits `TDS Payable (TDS_PAY)`.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                TDS / TCS Section
              </label>
              <select
                value={sectionCode}
                onChange={(e) => setSectionCode(e.target.value)}
                className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
              >
                {register.rules.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.section} — {r.description} ({r.ratePercent}%)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Debit Ledger (Party / Expense)
              </label>
              <select
                value={debitLedgerId}
                onChange={(e) => setDebitLedgerId(e.target.value)}
                className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
              >
                {ledgers.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Party / Vendor Name
              </label>
              <input
                required
                type="text"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder="e.g., Sharma & Co Advocates"
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  TDS Amount (₹)
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="1"
                  value={tdsAmount}
                  onChange={(e) => setTdsAmount(e.target.value)}
                  className="w-full text-xs font-mono border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Voucher Date
                </label>
                <input
                  required
                  type="date"
                  value={voucherDate}
                  onChange={(e) => setVoucherDate(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={posting || !debitLedgerId}
              className="w-full py-2.5 px-4 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-black inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              {posting ? 'Posting Voucher...' : 'Post Balanced TDS Journal'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
