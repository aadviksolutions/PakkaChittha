'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Scale,
  Users,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  X,
  Calendar,
  CreditCard,
  Trash2,
  TrendingUp,
  Receipt,
  UserCheck,
  ShieldCheck,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';

interface MemberBalance {
  memberId: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  totalExpensePaid: number;
  totalShareAllocated: number;
  settlementsPaid: number;
  settlementsReceived: number;
  netBalance: number;
  status: 'RECEIVABLE' | 'PAYABLE' | 'SETTLED';
}

interface SuggestedDebt {
  fromMemberId: string;
  fromName: string;
  toMemberId: string;
  toName: string;
  amount: number;
}

interface SettlementRecord {
  id: string;
  payerMemberId: string;
  payerName: string;
  receiverMemberId: string;
  receiverName: string;
  amount: number;
  date: string;
  paymentMethod: string;
  notes: string | null;
  createdAt: string;
}

export default function HouseholdSplitsPage() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberBalance[]>([]);
  const [suggestedSettlements, setSuggestedSettlements] = useState<SuggestedDebt[]>([]);
  const [recentSettlements, setRecentSettlements] = useState<SettlementRecord[]>([]);
  const [totalSharedSpending, setTotalSharedSpending] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Settlement Modal State
  const [showModal, setShowModal] = useState(false);
  const [payerId, setPayerId] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('ALL');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/household/balances');
      const json = await res.json();
      if (json.success) {
        setMembers(json.members || []);
        setSuggestedSettlements(json.suggestedSettlements || []);
        setRecentSettlements(json.recentSettlements || []);
        setTotalSharedSpending(json.totalSharedSpending || 0);
        if (json.authContext?.userName) {
          // Identify current member by matching name or user
          const me = (json.members || []).find((m: MemberBalance) => m.name === json.authContext.userName);
          if (me) setCurrentUserId(me.memberId);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const myBalance = useMemo(() => {
    if (!currentUserId) return members[0] || null;
    return members.find((m) => m.memberId === currentUserId) || members[0] || null;
  }, [members, currentUserId]);

  const handleOpenSettlementModal = (prefillFrom?: string, prefillTo?: string, prefillAmount?: number) => {
    setPayerId(prefillFrom || (myBalance && myBalance.netBalance < 0 ? myBalance.memberId : members[0]?.memberId || ''));
    setReceiverId(prefillTo || (myBalance && myBalance.netBalance > 0 ? myBalance.memberId : members[1]?.memberId || ''));
    setAmount(prefillAmount ? String(prefillAmount) : '');
    setDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod('UPI');
    setNotes('');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleRecordSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = Number(amount);
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      setErrorMsg('Please enter a valid positive settlement amount.');
      return;
    }

    if (payerId === receiverId) {
      setErrorMsg('Payer and receiver must be different family members.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/household/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payerMemberId: payerId,
          receiverMemberId: receiverId,
          amount: cleanAmount,
          date,
          paymentMethod,
          notes,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to record settlement.');
      }

      setShowModal(false);
      setSuccessNotice('Settlement recorded successfully. Member balances updated.');
      fetchData();
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error recording settlement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSettlement = async (settlementId: string) => {
    if (!confirm('Are you sure you want to delete this settlement record? Balances will be recalculated.')) return;
    setDeletingId(settlementId);
    try {
      const res = await fetch(`/api/household/settlements/${settlementId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete settlement');
      }
      setSuccessNotice('Settlement record removed.');
      fetchData();
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error deleting settlement');
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered settlements list
  const filteredSettlements = useMemo(() => {
    if (selectedMemberFilter === 'ALL') return recentSettlements;
    return recentSettlements.filter(
      (s) => s.payerMemberId === selectedMemberFilter || s.receiverMemberId === selectedMemberFilter
    );
  }, [recentSettlements, selectedMemberFilter]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/ghar-kharcha"
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Scale className="w-6 h-6 text-emerald-600" />
            <span>Family Splits &amp; Settlements</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Track who paid, allocated shares, pairwise debts, and confirm repayments between family members.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleOpenSettlementModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Record Settlement</span>
          </button>
        </div>
      </div>

      {successNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl p-4 flex items-center justify-between animate-in fade-in">
          <span>{successNotice}</span>
          <button onClick={() => setSuccessNotice(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Total Shared Expenses
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 mt-1">
            ₹{totalSharedSpending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Family shared volume</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            My Allocated Share
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 mt-1">
            ₹{(myBalance?.totalShareAllocated || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">My consumption share</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Paid by Me
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-700 mt-1">
            ₹{((myBalance?.totalExpensePaid || 0) + (myBalance?.settlementsPaid || 0)).toLocaleString('en-IN', {
              minimumFractionDigits: 2,
            })}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Expenses + repayments</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            My Outstanding Balance
          </div>
          <div
            className={`text-lg sm:text-xl font-black mt-1 ${
              (myBalance?.netBalance || 0) > 0.005
                ? 'text-emerald-700'
                : (myBalance?.netBalance || 0) < -0.005
                ? 'text-rose-600'
                : 'text-slate-800'
            }`}
          >
            {(myBalance?.netBalance || 0) > 0.005
              ? `+₹${(myBalance?.netBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
              : (myBalance?.netBalance || 0) < -0.005
              ? `-₹${Math.abs(myBalance?.netBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
              : '₹0.00 (All Settled)'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {(myBalance?.netBalance || 0) > 0.005
              ? 'Receivable from family'
              : (myBalance?.netBalance || 0) < -0.005
              ? 'Owed toward shared expenses'
              : 'Zero debt balance'}
          </div>
        </div>
      </div>

      {/* SUGGESTED DEBT SETTLEMENTS */}
      {suggestedSettlements.length > 0 && (
        <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/40 border border-emerald-200 rounded-3xl p-5 sm:p-6 shadow-2xs">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Simplified Settlement Suggestions
            </h3>
          </div>
          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            The algorithm calculates the minimal transfers needed to balance all family debts. Click any card to confirm a settlement repayment.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {suggestedSettlements.map((debt, idx) => (
              <div
                key={idx}
                onClick={() => handleOpenSettlementModal(debt.fromMemberId, debt.toMemberId, debt.amount)}
                className="p-3.5 bg-white rounded-2xl border border-emerald-200/80 hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="text-[11px] font-bold text-slate-900">
                    <span className="text-rose-600">{debt.fromName}</span> owes{' '}
                    <span className="text-emerald-700">{debt.toName}</span>
                  </div>
                  <div className="text-base font-black text-slate-900 mt-0.5">
                    ₹{debt.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="w-7 h-7 rounded-xl bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white text-emerald-700 flex items-center justify-center transition-all shrink-0">
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MEMBER-WISE BALANCE SUMMARY */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Family Member Balances</span>
          </h3>
          <span className="text-[11px] text-slate-400 font-semibold">
            {members.length} Authorized Members
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-medium">Calculating balances...</p>
          </div>
        ) : members.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {members.map((m) => {
              const isReceivable = m.netBalance > 0.005;
              const isPayable = m.netBalance < -0.005;

              return (
                <div
                  key={m.memberId}
                  className={`p-4 rounded-2xl border transition-all ${
                    isReceivable
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : isPayable
                      ? 'border-rose-200 bg-rose-50/20'
                      : 'border-slate-200 bg-slate-50/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {m.name}
                        </h4>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {m.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">{m.email}</div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-base font-black ${
                          isReceivable ? 'text-emerald-700' : isPayable ? 'text-rose-600' : 'text-slate-700'
                        }`}
                      >
                        {isReceivable
                          ? `+₹${m.netBalance.toFixed(2)}`
                          : isPayable
                          ? `-₹${Math.abs(m.netBalance).toFixed(2)}`
                          : '₹0.00'}
                      </div>
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          isReceivable
                            ? 'bg-emerald-100 text-emerald-800'
                            : isPayable
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isReceivable ? 'Receivable (Owed)' : isPayable ? 'Payable (Owes)' : 'Settled'}
                      </span>
                    </div>
                  </div>

                  {/* Financial breakdown pills */}
                  <div className="mt-3.5 pt-3 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400">Paid Toward Bills:</span>{' '}
                      <span className="font-bold text-slate-700">₹{m.totalExpensePaid.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Allocated Share:</span>{' '}
                      <span className="font-bold text-slate-700">₹{m.totalShareAllocated.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Settlements Sent:</span>{' '}
                      <span className="font-bold text-slate-700">₹{m.settlementsPaid.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Settlements Recv:</span>{' '}
                      <span className="font-bold text-slate-700">₹{m.settlementsReceived.toFixed(2)}</span>
                    </div>
                  </div>

                  {isPayable && (
                    <div className="mt-3 pt-2">
                      <button
                        onClick={() => handleOpenSettlementModal(m.memberId, undefined, Math.abs(m.netBalance))}
                        className="w-full py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200/60 transition-all cursor-pointer"
                      >
                        Record Repayment for {m.name}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs">
            No family members found.
          </div>
        )}
      </div>

      {/* SETTLEMENT AUDIT HISTORY */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
              <span>Settlement Audit History</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Confirmed repayments between family members. Settlements update member balances without counting as additional household consumption expenses.
            </p>
          </div>

          {/* Member filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400">Filter:</span>
            <select
              value={selectedMemberFilter}
              onChange={(e) => setSelectedMemberFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-emerald-600"
            >
              <option value="ALL">All Members</option>
              {members.map((m) => (
                <option key={m.memberId} value={m.memberId}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredSettlements.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredSettlements.map((s) => (
              <div
                key={s.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/50 rounded-xl px-2 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/60">
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      <span className="text-rose-600">{s.payerName}</span> repaid{' '}
                      <span className="text-emerald-700">{s.receiverName}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-600 uppercase text-[9px] px-1.5 py-0.2 bg-slate-100 rounded">
                        {s.paymentMethod}
                      </span>
                      {s.notes && (
                        <>
                          <span>•</span>
                          <span className="italic text-slate-500 truncate max-w-xs">{s.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center">
                  <span className="text-sm font-black text-slate-900">
                    ₹{s.amount.toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleDeleteSettlement(s.id)}
                    disabled={deletingId === s.id}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete Settlement Record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs">
            No settlement records found.
          </div>
        )}
      </div>

      {/* RECORD SETTLEMENT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-emerald-600" />
                <span>Record Settlement Repayment</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleRecordSettlement} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Who Repaid (Payer) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={payerId}
                    onChange={(e) => setPayerId(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-emerald-600"
                  >
                    {members.map((m) => (
                      <option key={m.memberId} value={m.memberId}>
                        {m.name} {m.netBalance < 0 ? `(Owes ₹${Math.abs(m.netBalance).toFixed(2)})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Who Received <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={receiverId}
                    onChange={(e) => setReceiverId(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-emerald-600"
                  >
                    {members.map((m) => (
                      <option key={m.memberId} value={m.memberId}>
                        {m.name} {m.netBalance > 0 ? `(Owed ₹${m.netBalance.toFixed(2)})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Settlement Amount (INR) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-bold text-slate-400 text-xs">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm font-black text-slate-900 bg-white"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Over-settlement is automatically prevented to maintain balance sheet accuracy.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Repayment Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-emerald-600"
                  >
                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="BANK_TRANSFER">Bank IMPS / NEFT</option>
                    <option value="CASH">Cash in Hand</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Optional Note
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Cleared October grocery share via UPI"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-xs font-medium text-slate-800 bg-white"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Recording Settlement...' : 'Confirm & Save Repayment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
