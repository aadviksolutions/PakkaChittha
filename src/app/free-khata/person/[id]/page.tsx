'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Phone,
  MessageSquare,
  Calendar,
  AlertCircle,
  FileText,
  Clock,
  Trash2,
  CheckCircle2,
  CreditCard,
  Edit,
  Sparkles,
} from 'lucide-react';
import { TransactionModal } from '@/components/free-khata/TransactionModal';
import { RepaymentModal, RepaymentTransactionTarget } from '@/components/free-khata/RepaymentModal';
import { WhatsAppReminderModal, WhatsAppReminderTarget } from '@/components/free-khata/WhatsAppReminderModal';
import { formatCurrency, formatDate } from '@/lib/services/khataService';

interface ActivityLedgerItem {
  id: string;
  date: string;
  activityType: 'TRANSACTION_GAVE' | 'TRANSACTION_RECEIVED' | 'REPAYMENT';
  title: string;
  amount: number;
  balanceAfter?: number;
  paymentMode?: string;
  notes?: string | null;
  dueDate?: string | null;
  status?: 'PENDING' | 'PARTIAL' | 'SETTLED';
  transactionId?: string;
}

interface PersonDetailData {
  contact: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  };
  summary: {
    totalGave: number;
    totalReceived: number;
    gaveOutstanding: number;
    receivedOutstanding: number;
    netBalance: number;
  };
  transactions: Array<{
    id: string;
    type: 'GAVE' | 'RECEIVED';
    amount: number;
    settledAmount: number;
    balanceAmount: number;
    date: string;
    dueDate: string | null;
    description: string | null;
    status: 'PENDING' | 'PARTIAL' | 'SETTLED';
    repayments: Array<{
      id: string;
      amount: number;
      date: string;
      paymentMode: string;
      notes: string | null;
    }>;
  }>;
  activityLedger: ActivityLedgerItem[];
}

export default function PersonLedgerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const contactId = resolvedParams.id;

  const [data, setData] = useState<PersonDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txModalType, setTxModalType] = useState<'GAVE' | 'RECEIVED'>('GAVE');
  const [repayModalOpen, setRepayModalOpen] = useState(false);
  const [repayTarget, setRepayTarget] = useState<RepaymentTransactionTarget | null>(null);
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waTarget, setWaTarget] = useState<WhatsAppReminderTarget | null>(null);

  const fetchContactDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/free-khata/contacts/${contactId}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load contact ledger');
      }
      setData(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading contact');
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    fetchContactDetail();
  }, [fetchContactDetail]);

  const handleOpenGave = () => {
    setTxModalType('GAVE');
    setTxModalOpen(true);
  };

  const handleOpenReceived = () => {
    setTxModalType('RECEIVED');
    setTxModalOpen(true);
  };

  const handleOpenRepayForTx = (txId: string) => {
    const tx = data?.transactions.find((t) => t.id === txId);
    if (tx && data) {
      setRepayTarget({
        id: tx.id,
        contactName: data.contact.name,
        type: tx.type,
        amount: tx.amount,
        balanceAmount: tx.balanceAmount,
        settledAmount: tx.settledAmount,
        date: tx.date,
      });
      setRepayModalOpen(true);
    }
  };

  const handleOpenWhatsAppReminder = () => {
    if (!data) return;
    const pendingTx = data.transactions.find((t) => t.balanceAmount > 0 && t.type === 'GAVE');

    setWaTarget({
      transactionId: pendingTx?.id,
      contactId: data.contact.id,
      contactName: data.contact.name,
      phone: data.contact.phone,
      amount: Math.abs(data.summary.netBalance || pendingTx?.balanceAmount || 0),
      date: pendingTx?.date || new Date().toISOString(),
      dueDate: pendingTx?.dueDate || null,
      type: 'GAVE',
    });
    setWaModalOpen(true);
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!confirm('Are you sure you want to delete this transaction entry? This cannot be undone.')) {
      return;
    }
    try {
      const res = await fetch(`/api/free-khata/transactions/${txId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete transaction');
      fetchContactDetail();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error deleting transaction');
    }
  };

  if (loading && !data) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <span>Loading person ledger...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-4">
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs">
          {error || 'Contact not found'}
        </div>
        <Link
          href="/free-khata"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Khata</span>
        </Link>
      </div>
    );
  }

  const contact = data.contact;
  const summary = data.summary;
  const willGet = summary.netBalance > 0;
  const willPay = summary.netBalance < 0;
  const isSettled = summary.netBalance === 0;

  return (
    <div className="space-y-5 pb-24 md:pb-12 max-w-4xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined' && window.history.length > 1) {
              router.back();
            } else {
              router.push('/free-khata');
            }
          }}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Previous Screen</span>
        </button>

        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
          <Sparkles className="w-3 h-3 text-[#00B887]" />
          <span>Personal Khata</span>
        </span>
      </div>

      {/* Person Profile & Net Position Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-200 border border-slate-200 text-[#071F38] font-black text-lg flex items-center justify-center shrink-0 shadow-2xs">
            {contact.name.slice(0, 2).toUpperCase()}
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#071F38]">
              {contact.name}
            </h1>

            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
              {contact.phone ? (
                <span className="flex items-center gap-1 font-mono text-slate-700 font-semibold">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{contact.phone}</span>
                </span>
              ) : (
                <span className="text-slate-400 italic">No mobile number added</span>
              )}

              {contact.notes && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="italic">{contact.notes}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Net Status Banner */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 min-w-[200px] text-right">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block">
            Net Balance Status
          </span>
          {willGet && (
            <div className="mt-1">
              <span className="text-2xl font-black text-[#00B887] block">
                ₹{summary.netBalance.toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-1">
                You will collect (Lene Hai)
              </span>
            </div>
          )}

          {willPay && (
            <div className="mt-1">
              <span className="text-2xl font-black text-rose-600 block">
                ₹{Math.abs(summary.netBalance).toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 inline-block mt-1">
                You will repay (Dene Hai)
              </span>
            </div>
          )}

          {isSettled && (
            <div className="mt-1">
              <span className="text-2xl font-black text-slate-500 block">
                ₹0.00
              </span>
              <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block mt-1">
                All Settled (Hisab Barabar)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Sub-Metrics Cards: Total Given, Total Received, Repayments, Outstanding */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
            Total I Gave
          </span>
          <span className="text-base font-black text-[#071F38] mt-1 block">
            ₹{summary.totalGave.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
            Total I Received
          </span>
          <span className="text-base font-black text-[#071F38] mt-1 block">
            ₹{summary.totalReceived.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10.5px] font-bold text-emerald-600 uppercase tracking-wider block">
            To Collect
          </span>
          <span className="text-base font-black text-[#00B887] mt-1 block">
            ₹{summary.gaveOutstanding.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10.5px] font-bold text-rose-600 uppercase tracking-wider block">
            To Repay
          </span>
          <span className="text-base font-black text-rose-600 mt-1 block">
            ₹{summary.receivedOutstanding.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={handleOpenGave}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer active:scale-95"
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>+ I Gave to {contact.name}</span>
        </button>

        <button
          type="button"
          onClick={handleOpenReceived}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-[#00B887] hover:bg-[#009E74] text-white font-bold text-xs shadow-sm transition-all cursor-pointer active:scale-95"
        >
          <ArrowDownLeft className="w-4 h-4" />
          <span>+ I Received from {contact.name}</span>
        </button>

        {willGet && (
          <button
            type="button"
            onClick={handleOpenWhatsAppReminder}
            className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-[#00B887]" />
            <span>Remind on WhatsApp</span>
          </button>
        )}
      </div>

      {/* Detailed Chronological Activity Ledger */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-black text-sm text-[#071F38]">Complete Ledger Timeline</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Chronological history of all lending, borrowing and repayments
            </p>
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            {data.transactions.length} Transactions
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {data.transactions.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No entries recorded for this person yet.
            </div>
          ) : (
            data.transactions.map((tx) => {
              const isGave = tx.type === 'GAVE';
              const hasBalance = tx.balanceAmount > 0;

              return (
                <div key={tx.id} className="p-4 sm:p-5 hover:bg-slate-50/50 transition-colors space-y-3">
                  {/* Transaction Main Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isGave
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : 'bg-emerald-50 text-[#00B887] border border-emerald-200'
                        }`}
                      >
                        {isGave ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-[#071F38]">
                            {isGave ? 'I Gave (Maine Diye)' : 'I Received (Maine Liye)'}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.2 rounded ${
                              tx.status === 'SETTLED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : tx.status === 'PARTIAL'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {tx.status === 'SETTLED'
                              ? 'Fully Settled'
                              : tx.status === 'PARTIAL'
                              ? 'Partially Settled'
                              : 'Pending'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span>{formatDate(tx.date)}</span>
                          {tx.dueDate && (
                            <>
                              <span>•</span>
                              <span className="text-amber-700 font-semibold">
                                Due: {formatDate(tx.dueDate)}
                              </span>
                            </>
                          )}
                          {tx.description && (
                            <>
                              <span>•</span>
                              <span className="italic">"{tx.description}"</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Amount & Remaining Balance */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pl-12 sm:pl-0">
                      <div className="text-right">
                        <span className="text-base font-black text-slate-800 block">
                          ₹{tx.amount.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Balance Due:{' '}
                          <strong
                            className={`font-black ${
                              tx.balanceAmount > 0 ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            ₹{tx.balanceAmount.toLocaleString('en-IN')}
                          </strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {hasBalance && (
                          <button
                            type="button"
                            onClick={() => handleOpenRepayForTx(tx.id)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
                          >
                            Record Repayment
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteTransaction(tx.id)}
                          title="Delete Entry"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Sub-list of Repayments if any */}
                  {tx.repayments && tx.repayments.length > 0 && (
                    <div className="ml-12 pl-3 border-l-2 border-emerald-200 space-y-1.5 py-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        Repayments Logged:
                      </span>
                      {tx.repayments.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between text-xs text-slate-600 bg-emerald-50/50 p-2 rounded-xl"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>
                              {formatDate(r.date)} via <strong>{r.paymentMode}</strong>
                              {r.notes && ` • "${r.notes}"`}
                            </span>
                          </div>
                          <strong className="text-emerald-700 font-bold">
                            + ₹{r.amount.toLocaleString('en-IN')}
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modals */}
      <TransactionModal
        isOpen={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        onSuccess={fetchContactDetail}
        defaultType={txModalType}
        preselectedContact={{
          id: contact.id,
          name: contact.name,
          phone: contact.phone,
        }}
      />

      <RepaymentModal
        isOpen={repayModalOpen}
        onClose={() => setRepayModalOpen(false)}
        onSuccess={fetchContactDetail}
        transaction={repayTarget}
      />

      <WhatsAppReminderModal
        isOpen={waModalOpen}
        onClose={() => setWaModalOpen(false)}
        target={waTarget}
        onPhoneUpdated={fetchContactDetail}
      />
    </div>
  );
}
