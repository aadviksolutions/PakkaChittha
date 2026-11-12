'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, FileText, Plus, Trash2, AlertCircle } from 'lucide-react';
import { AccountantScaleGate } from '@/components/accountant/AccountantScaleGate';
import { useAuth } from '@/context/AuthContext';

interface LedgerOption {
  id: string;
  name: string;
  code: string | null;
  groupName: string;
}

interface EntryDraft {
  key: string;
  ledgerId: string;
  debitAmount: string;
  creditAmount: string;
  narration: string;
}

export default function NewVoucherPage() {
  return (
    <AccountantScaleGate>
      <NewVoucherContent />
    </AccountantScaleGate>
  );
}

function NewVoucherContent() {
  const router = useRouter();
  const { activeBusiness } = useAuth();
  const activeBusinessId = activeBusiness?.id;

  const [ledgers, setLedgers] = useState<LedgerOption[]>([]);
  const [voucherType, setVoucherType] = useState('JOURNAL');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().slice(0, 10));
  const [voucherNumber, setVoucherNumber] = useState('');
  const [branchId, setBranchId] = useState('');
  const [narration, setNarration] = useState('');
  const [entries, setEntries] = useState<EntryDraft[]>([
    { key: 'row-1', ledgerId: '', debitAmount: '', creditAmount: '', narration: '' },
    { key: 'row-2', ledgerId: '', debitAmount: '', creditAmount: '', narration: '' },
  ]);
  const [loadingLedgers, setLoadingLedgers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLedgers = useCallback(async () => {
    if (!activeBusinessId) return;
    setLoadingLedgers(true);
    try {
      const res = await fetch(
        `/api/accounting/ledgers?businessId=${encodeURIComponent(activeBusinessId)}`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      if (res.ok) {
        setLedgers(data.ledgers || []);
      }
    } finally {
      setLoadingLedgers(false);
    }
  }, [activeBusinessId]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadLedgers();
    });
    return () => {
      cancelled = true;
    };
  }, [loadLedgers]);

  const totalDebit = entries.reduce((sum, r) => sum + (Number(r.debitAmount) || 0), 0);
  const totalCredit = entries.reduce((sum, r) => sum + (Number(r.creditAmount) || 0), 0);
  const isBalanced =
    totalDebit > 0 && totalDebit.toFixed(2) === totalCredit.toFixed(2);
  const diff = Math.abs(totalDebit - totalCredit);

  const updateRow = (idx: number, field: keyof EntryDraft, value: string) => {
    setEntries((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        const next = { ...row, [field]: value };
        if (field === 'debitAmount' && Number(value) > 0) next.creditAmount = '';
        if (field === 'creditAmount' && Number(value) > 0) next.debitAmount = '';
        return next;
      })
    );
  };

  const addRow = () => {
    setEntries((prev) => [
      ...prev,
      {
        key: `row-${Date.now()}-${prev.length}`,
        ledgerId: '',
        debitAmount: '',
        creditAmount: '',
        narration: '',
      },
    ]);
  };

  const removeRow = (idx: number) => {
    if (entries.length <= 2) return;
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  };

  const submitVoucher = async (autoPost: boolean) => {
    if (!activeBusinessId) return;
    setError(null);

    if (!isBalanced) {
      setError('Total Debit must equal Total Credit and be greater than zero.');
      return;
    }

    const sanitizedEntries = entries.map((e) => ({
      ledgerId: e.ledgerId,
      debitAmount: Number(e.debitAmount || 0),
      creditAmount: Number(e.creditAmount || 0),
      narration: e.narration.trim() || undefined,
    }));

    if (sanitizedEntries.some((e) => !e.ledgerId)) {
      setError('Please select a ledger for every entry row.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/accounting/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: activeBusinessId,
          branchId: branchId || undefined,
          voucherType,
          voucherDate,
          voucherNumber: voucherNumber.trim() || undefined,
          narration: narration.trim() || undefined,
          entries: sanitizedEntries,
          autoPost,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save voucher');
      router.push('/accountant/day-book');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save voucher');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/accountant/day-book"
            className="text-xs font-bold text-slate-500 hover:text-[#071F38] inline-flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Day Book
          </Link>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#EA580C]" />
            <h1 className="text-xl font-black text-[#071F38] tracking-tight">New Voucher</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Post balanced double-entry Payment, Receipt, Contra, Journal, Debit Note, or Credit Note
            vouchers.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Voucher Type
            </label>
            <select
              value={voucherType}
              onChange={(e) => setVoucherType(e.target.value)}
              className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50"
            >
              <option value="PAYMENT">Payment</option>
              <option value="RECEIPT">Receipt</option>
              <option value="CONTRA">Contra (Cash/Bank)</option>
              <option value="JOURNAL">Journal</option>
              <option value="DEBIT_NOTE">Debit Note</option>
              <option value="CREDIT_NOTE">Credit Note</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Voucher Date
            </label>
            <input
              type="date"
              value={voucherDate}
              onChange={(e) => setVoucherDate(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Voucher # (Auto if blank)
            </label>
            <input
              type="text"
              placeholder="Auto-generated"
              value={voucherNumber}
              onChange={(e) => setVoucherNumber(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50"
            />
          </div>
          {activeBusiness?.branches && activeBusiness.branches.length > 0 && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Branch
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50"
              >
                <option value="">Default Branch</option>
                {activeBusiness.branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Narration
          </label>
          <input
            type="text"
            placeholder="Being cash withdrawn from bank / rent paid / adjustment..."
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#071F38]">
              Debit & Credit Entries
            </h2>
            <button
              type="button"
              onClick={addRow}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#EA580C]" />
              Add Row
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-3">Ledger</th>
                  <th className="py-2.5 px-3">Line Narration</th>
                  <th className="py-2.5 px-3 w-36 text-right">Debit (₹)</th>
                  <th className="py-2.5 px-3 w-36 text-right">Credit (₹)</th>
                  <th className="py-2.5 px-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {entries.map((row, idx) => (
                  <tr key={row.key}>
                    <td className="p-2 min-w-[220px]">
                      <select
                        disabled={loadingLedgers}
                        value={row.ledgerId}
                        onChange={(e) => updateRow(idx, 'ledgerId', e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white"
                      >
                        <option value="">Select Ledger...</option>
                        {ledgers.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name} ({l.groupName})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 min-w-[160px]">
                      <input
                        type="text"
                        placeholder="Optional line note"
                        value={row.narration}
                        onChange={(e) => updateRow(idx, 'narration', e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={row.debitAmount}
                        onChange={(e) => updateRow(idx, 'debitAmount', e.target.value)}
                        className="w-full text-right text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-2 bg-white"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={row.creditAmount}
                        onChange={(e) => updateRow(idx, 'creditAmount', e.target.value)}
                        className="w-full text-right text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-2 bg-white"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        disabled={entries.length <= 2}
                        onClick={() => removeRow(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                        title="Remove line"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr
                  className={`border-t-2 font-black text-xs ${
                    isBalanced
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50/70 border-rose-200 text-rose-900'
                  }`}
                >
                  <td colSpan={2} className="py-3 px-3">
                    {isBalanced ? (
                      <span className="inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Balanced Double-Entry
                      </span>
                    ) : (
                      <span>
                        Imbalanced (Difference: ₹
                        {diff.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    ₹{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right">
                    ₹{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          <button
            type="button"
            disabled={submitting || !isBalanced}
            onClick={() => void submitVoucher(false)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[#071F38] text-xs font-bold disabled:opacity-50 cursor-pointer"
          >
            Save as Draft
          </button>
          <button
            type="button"
            disabled={submitting || !isBalanced}
            onClick={() => void submitVoucher(true)}
            className="px-5 py-2.5 rounded-xl bg-[#EA580C] hover:bg-orange-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Posting...' : 'Post Voucher'}
          </button>
        </div>
      </div>
    </div>
  );
}

