'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Ban, CheckCircle2, FileText, RefreshCw } from 'lucide-react';
import { AccountantScaleGate } from '@/components/accountant/AccountantScaleGate';
import { useAuth } from '@/context/AuthContext';

interface VoucherDetail {
  id: string;
  voucherNumber: string;
  voucherType: string;
  voucherDate: string;
  fyCode: string;
  narration: string | null;
  totalAmount: string;
  status: 'DRAFT' | 'POSTED' | 'CANCELLED';
  referenceType: string | null;
  referenceId: string | null;
  cancelReason: string | null;
  branch?: { id: string; name: string; code: string } | null;
  reversalOf?: { id: string; voucherNumber: string; voucherType: string } | null;
  reversals?: Array<{ id: string; voucherNumber: string; voucherType: string }>;
  entries: Array<{
    id: string;
    ledgerId: string;
    debitAmount: string;
    creditAmount: string;
    narration: string | null;
    ledger: {
      id: string;
      name: string;
      code: string | null;
      group: { name: string };
    };
  }>;
}

export default function VoucherDetailPage() {
  return (
    <AccountantScaleGate>
      <VoucherDetailContent />
    </AccountantScaleGate>
  );
}

function VoucherDetailContent() {
  const params = useParams<{ id: string }>();
  const voucherId = params?.id || '';
  const { activeBusiness } = useAuth();
  const activeBusinessId = activeBusiness?.id;
  const isOwner =
    activeBusiness?.erpRole === 'OWNER' || activeBusiness?.role === 'BUSINESS_OWNER';

  const [voucher, setVoucher] = useState<VoucherDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadVoucher = useCallback(async () => {
    if (!activeBusinessId || !voucherId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/accounting/vouchers/${encodeURIComponent(voucherId)}?businessId=${encodeURIComponent(
          activeBusinessId
        )}`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load voucher');
      setVoucher(data.voucher || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load voucher');
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId, voucherId]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadVoucher();
    });
    return () => {
      cancelled = true;
    };
  }, [loadVoucher]);

  const handlePostDraft = async () => {
    if (!voucher || !activeBusinessId) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/accounting/vouchers/${encodeURIComponent(voucher.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: activeBusinessId, action: 'POST' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post voucher');
      await loadVoucher();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post voucher');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucher || !activeBusinessId) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/accounting/vouchers/${encodeURIComponent(voucher.id)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: activeBusinessId,
          reason: cancelReason.trim() || 'Cancelled by owner',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel voucher');
      setShowCancelModal(false);
      await loadVoucher();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel voucher');
    } finally {
      setActionLoading(false);
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
          <div className="flex items-center gap-2 flex-wrap">
            <FileText className="w-5 h-5 text-[#EA580C]" />
            <h1 className="text-xl font-black text-[#071F38] tracking-tight">
              {voucher ? `Voucher #${voucher.voucherNumber}` : 'Voucher Details'}
            </h1>
            {voucher && (
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  voucher.status === 'POSTED'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : voucher.status === 'CANCELLED'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {voucher.status}
              </span>
            )}
          </div>
          {voucher && (
            <p className="text-xs text-slate-500 mt-1">
              {voucher.voucherType} · Date: {voucher.voucherDate} · FY {voucher.fyCode}
              {voucher.branch ? ` · Branch: ${voucher.branch.name}` : ''}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {voucher?.status === 'DRAFT' && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => void handlePostDraft()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Post Draft Voucher
            </button>
          )}
          {voucher?.status === 'POSTED' && isOwner && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => setShowCancelModal(true)}
              className="px-4 py-2 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Ban className="w-3.5 h-3.5" />
              Cancel Voucher
            </button>
          )}
          <button
            type="button"
            onClick={() => void loadVoucher()}
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

      {showCancelModal && (
        <form
          onSubmit={handleCancelVoucher}
          className="bg-rose-50/70 border border-rose-200 rounded-2xl p-5 space-y-3"
        >
          <h2 className="text-sm font-black text-rose-900">
            Confirm Voucher Cancellation & Reversal
          </h2>
          <p className="text-xs text-rose-700">
            Cancelling a posted voucher preserves immutable books by automatically generating a
            counter-balancing reversal voucher.
          </p>
          <input
            type="text"
            required
            placeholder="Reason for cancellation..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="w-full text-xs border border-rose-200 rounded-xl px-3 py-2 bg-white"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? 'Cancelling...' : 'Confirm Cancel & Post Reversal'}
            </button>
            <button
              type="button"
              onClick={() => setShowCancelModal(false)}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold cursor-pointer"
            >
              Close
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : voucher ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
          <div className="p-5 border-b border-slate-100 space-y-2 text-xs">
            <p className="text-slate-600">
              <strong className="text-[#071F38]">Narration:</strong>{' '}
              {voucher.narration || 'No narration'}
            </p>
            {voucher.referenceType && (
              <p className="text-slate-600">
                <strong className="text-[#071F38]">Source Reference:</strong>{' '}
                {voucher.referenceType} ({voucher.referenceId})
              </p>
            )}
            {voucher.reversalOf && (
              <p className="text-amber-700 font-semibold">
                Reversal of:{' '}
                <Link
                  href={`/accountant/vouchers/${voucher.reversalOf.id}`}
                  className="underline"
                >
                  {voucher.reversalOf.voucherNumber}
                </Link>
              </p>
            )}
            {voucher.reversals && voucher.reversals.length > 0 && (
              <p className="text-rose-700 font-semibold">
                Reversed by:{' '}
                <Link
                  href={`/accountant/vouchers/${voucher.reversals[0].id}`}
                  className="underline"
                >
                  {voucher.reversals[0].voucherNumber}
                </Link>{' '}
                {voucher.cancelReason ? `(${voucher.cancelReason})` : ''}
              </p>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Ledger Account</th>
                  <th className="py-3 px-4">Group</th>
                  <th className="py-3 px-4">Line Note</th>
                  <th className="py-3 px-4 text-right">Debit (₹)</th>
                  <th className="py-3 px-4 text-right">Credit (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {voucher.entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-3 px-4 font-bold">
                      <Link
                        href={`/accountant/ledgers/${entry.ledgerId}`}
                        className="text-[#071F38] hover:text-[#EA580C]"
                      >
                        {entry.ledger.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{entry.ledger.group.name}</td>
                    <td className="py-3 px-4 text-slate-500">{entry.narration || '—'}</td>
                    <td className="py-3 px-4 text-right font-semibold text-[#071F38]">
                      {Number(entry.debitAmount) > 0
                        ? `₹${Number(entry.debitAmount).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                          })}`
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-[#071F38]">
                      {Number(entry.creditAmount) > 0
                        ? `₹${Number(entry.creditAmount).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                          })}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200 font-black text-xs text-[#071F38]">
                  <td colSpan={3} className="py-3 px-4">
                    Total
                  </td>
                  <td className="py-3 px-4 text-right">
                    ₹{Number(voucher.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right">
                    ₹{Number(voucher.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

