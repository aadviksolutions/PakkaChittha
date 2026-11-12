'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FolderLock,
  Lock,
  RefreshCw,
  Send,
  Unlock,
} from 'lucide-react';
import { AccountantScaleGate } from '@/components/accountant/AccountantScaleGate';
import { useAuth } from '@/context/AuthContext';

interface FyOption {
  id: string;
  code: string;
  label: string;
}

interface ClosingPreview {
  fyCode: string;
  label: string;
  startDate: string;
  endDate: string;
  isClosed: boolean;
  lockedUntil: string | null;
  draftVoucherCount: number;
  postedVoucherCount: number;
  trialBalanceBalanced: boolean;
  netProfitOrLoss: string;
  closingEntriesCount: number;
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

export default function ClosingEnginePage() {
  return (
    <AccountantScaleGate>
      <ClosingEngineContent />
    </AccountantScaleGate>
  );
}

function ClosingEngineContent() {
  const { activeBusiness } = useAuth();
  const activeBusinessId = activeBusiness?.id;

  const [fyList, setFyList] = useState<FyOption[]>([]);
  const [fyCode, setFyCode] = useState('');
  const [preview, setPreview] = useState<ClosingPreview | null>(null);
  const [canExecuteClosing, setCanExecuteClosing] = useState(false);
  const [erpRole, setErpRole] = useState('');
  const [lockedUntilInput, setLockedUntilInput] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadPreview = useCallback(async () => {
    if (!activeBusinessId) return;
    setLoading(true);
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

      const res = await fetch(`/api/accounting/closing?${qs.toString()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load closing preview');
      setPreview(data.preview || null);
      setCanExecuteClosing(Boolean(data.canExecuteClosing));
      setErpRole(data.erpRole || '');
      if (data.preview?.lockedUntil && !lockedUntilInput) {
        setLockedUntilInput(data.preview.lockedUntil);
      } else if (data.preview?.endDate && !lockedUntilInput) {
        setLockedUntilInput(data.preview.endDate);
      }
    } catch (err) {
      setMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to load closing preview',
      });
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId, fyCode, lockedUntilInput]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadPreview();
    });
    return () => {
      cancelled = true;
    };
  }, [loadPreview]);

  const runAction = async (
    action: 'REQUEST_CLOSE' | 'REQUEST_LOCK' | 'CLOSE_FY' | 'LOCK_PERIOD' | 'REOPEN_FY'
  ) => {
    if (!activeBusinessId || !preview) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/accounting/closing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: activeBusinessId,
          fyCode: preview.fyCode,
          action,
          lockedUntil: lockedUntilInput || undefined,
          reason: reason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Closing action failed');

      if (action === 'REQUEST_CLOSE' || action === 'REQUEST_LOCK') {
        setMessage({
          type: 'ok',
          text: 'Approval request submitted to Business Owner (Maker-Checker).',
        });
      } else if (action === 'CLOSE_FY') {
        setMessage({
          type: 'ok',
          text: `FY ${preview.fyCode} closed and Retained Earnings voucher ${data.result?.closingVoucherNumber || ''} posted.`,
        });
      } else if (action === 'LOCK_PERIOD') {
        setMessage({
          type: 'ok',
          text: `Accounting entries locked through ${lockedUntilInput}.`,
        });
      } else {
        setMessage({
          type: 'ok',
          text: `Financial Year ${preview.fyCode} reopened.`,
        });
      }
      setReason('');
      await loadPreview();
    } catch (err) {
      setMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Action failed',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const canCloseNow =
    Boolean(preview) &&
    !preview?.isClosed &&
    preview?.trialBalanceBalanced &&
    preview?.draftVoucherCount === 0;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FolderLock className="w-5 h-5 text-[#EA580C]" />
            <h1 className="text-xl font-black text-[#071F38] tracking-tight">
              Period Lock &amp; Year-End Closing Console
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Close Indian Financial Years cleanly by transferring Income &amp; Expense balances to Retained Earnings, or lock prior periods.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
          <button
            type="button"
            onClick={() => void loadPreview()}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold ${
            message.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {preview && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-[#071F38]">
                Pre-Closing Verification ({preview.label})
              </h2>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  preview.isClosed
                    ? 'bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {preview.isClosed ? 'CLOSED' : 'OPEN'}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <CheckRow
                ok={preview.trialBalanceBalanced}
                label="Trial Balance Balanced (Total Dr === Total Cr)"
                detail={preview.trialBalanceBalanced ? 'Balanced' : 'Out of Balance'}
              />
              <CheckRow
                ok={preview.draftVoucherCount === 0}
                label="No Pending Draft Vouchers in FY"
                detail={`${preview.draftVoucherCount} draft · ${preview.postedVoucherCount} posted`}
              />
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="font-semibold text-slate-700">
                  Net Profit / (Loss) to Transfer to Retained Earnings
                </span>
                <span className="font-mono font-black text-[#071F38]">
                  {formatInr(preview.netProfitOrLoss)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="font-semibold text-slate-700">
                  P&amp;L Ledgers to Zero Out
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {preview.closingEntriesCount} ledgers
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="font-semibold text-slate-700">Period Lock Cut-off</span>
                <span className="font-mono font-bold text-slate-800">
                  {preview.lockedUntil || 'Unlocked'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div>
              <h2 className="text-sm font-black text-[#071F38]">
                Governance &amp; Execution ({erpRole || 'MEMBER'})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {canExecuteClosing
                  ? 'As Business Owner, you can directly lock periods, close the Financial Year, or reopen if required.'
                  : 'Accountants submit closing or lock requests to the Business Owner via Maker-Checker approval.'}
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Audit Reason / Notes
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Statutory audit finalized for FY"
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
              />
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5">
              <label className="block text-[11px] font-bold text-slate-600">
                Lock Voucher Posting Up To Date
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={lockedUntilInput}
                  onChange={(e) => setLockedUntilInput(e.target.value)}
                  className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-white"
                />
                {canExecuteClosing ? (
                  <button
                    type="button"
                    disabled={submitting || !lockedUntilInput}
                    onClick={() => void runAction('LOCK_PERIOD')}
                    className="px-3.5 py-2 rounded-xl bg-[#071F38] hover:bg-[#0D2E52] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Lock Period
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting || !lockedUntilInput}
                    onClick={() => void runAction('REQUEST_LOCK')}
                    className="px-3.5 py-2 rounded-xl bg-[#071F38] hover:bg-[#0D2E52] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Request Period Lock
                  </button>
                )}
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-2.5">
              {canExecuteClosing ? (
                <>
                  <button
                    type="button"
                    disabled={submitting || !canCloseNow}
                    onClick={() => void runAction('CLOSE_FY')}
                    className="px-4 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <FolderLock className="w-4 h-4" />
                    Close FY &amp; Post Closing Voucher
                  </button>
                  {(preview.isClosed || preview.lockedUntil) && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void runAction('REOPEN_FY')}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-[#071F38] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Unlock className="w-4 h-4" />
                      Unlock / Reopen FY
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  disabled={submitting || !canCloseNow}
                  onClick={() => void runAction('REQUEST_CLOSE')}
                  className="px-4 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  Submit Year-End Closing Request
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckRow({
  ok,
  label,
  detail,
}: {
  ok: boolean;
  label: string;
  detail: string;
}) {
  return (
    <div
      className={`p-3 rounded-xl border flex items-center justify-between ${
        ok ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'
      }`}
    >
      <div className="flex items-center gap-2">
        {ok ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
        )}
        <span className="font-semibold text-[#071F38]">{label}</span>
      </div>
      <span className={`font-bold ${ok ? 'text-emerald-700' : 'text-rose-700'}`}>{detail}</span>
    </div>
  );
}
