'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import {
  Receipt,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  PlusCircle,
  X,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface PaymentItem {
  id: string;
  category: string;
  businessId: string;
  businessName: string;
  userId?: string | null;
  userEmail?: string;
  userName?: string;
  userPhone?: string | null;
  plan?: string | null;
  billingPeriod?: string;
  relatedEntity: string;
  amount: number;
  currency: string;
  gateway: string;
  gatewayOrderId?: string | null;
  gatewayPaymentId?: string | null;
  gatewayTransactionId: string;
  status: string; // SUCCESS, PENDING, FAILED, CANCELLED, REFUNDED
  refundStatus: string;
  refundAmount?: number;
  autoPayStatus?: string;
  subscriptionStartDate?: string | null;
  subscriptionEndDate?: string | null;
  notes: string | null;
  reconciledBy: string | null;
  createdAt: string;
  paidAt: string | null;
}

interface StatusCounts {
  all: number;
  pending: number;
  success: number;
  failed: number;
  cancelled: number;
  refunded: number;
  totalCollected?: number;
  totalRefunded?: number;
}

export default function PlatformAdminPaymentsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCounts | null>(null);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, SUCCESS, PENDING, FAILED, REFUNDED
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, SUBSCRIPTION, INVOICE
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Reconcile / Action Modal
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);
  const [modalType, setModalType] = useState<'RECONCILE' | 'REFUND' | 'CREATE_MANUAL' | null>(null);
  const [reconcileAction, setReconcileAction] = useState('CONFIRM_PAYMENT');
  const [manualBizId, setManualBizId] = useState('');
  const [manualPlan, setManualPlan] = useState('STARTER');
  const [manualAmount, setManualAmount] = useState('199');
  const [gatewayRef, setGatewayRef] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, [page, activeTab, typeFilter]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        status: activeTab,
        type: typeFilter,
      });
      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim());
      }

      const res = await fetch(`/api/platform-admin/payments?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load payments');
      const data = await res.json();
      setPayments(data.payments || []);
      setStatusCounts(data.statusCounts);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error fetching payments');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPayments();
  };

  const handleReconcileSubmit = async () => {
    if (!actionReason.trim() || actionReason.trim().length < 5) {
      toast.error('A detailed justification reason (min 5 chars) is mandatory.');
      return;
    }

    try {
      setSubmitting(true);
      const payload: any = {
        action: modalType === 'CREATE_MANUAL' ? 'CREATE_MANUAL_PAYMENT' : reconcileAction,
        reason: actionReason.trim(),
        notes: notes.trim(),
        gatewayTransactionId: gatewayRef.trim(),
      };

      if (modalType === 'CREATE_MANUAL') {
        payload.businessId = manualBizId.trim();
        payload.plan = manualPlan;
        payload.amount = manualAmount;
        payload.gateway = 'BANK_TRANSFER';
      } else if (selectedPayment) {
        payload.paymentId = selectedPayment.id;
        if (reconcileAction === 'RECORD_REFUND') {
          payload.amount = selectedPayment.amount;
        }
      }

      const res = await fetch('/api/platform-admin/payments/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reconciliation failed');

      toast.success(data.message || 'Payment reconciled successfully');
      setModalType(null);
      setSelectedPayment(null);
      setActionReason('');
      setGatewayRef('');
      setNotes('');
      fetchPayments();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Payments & Collections Center</span>
            <span className="text-xs font-bold text-slate-500 font-mono">({totalCount})</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative financial receipts: audit subscription charges, gateway transactions, and execute manual reconciliations.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            onClick={() => {
              setModalType('CREATE_MANUAL');
              setActionReason('');
              setGatewayRef('');
              setNotes('');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Record Offline / Bank Payment</span>
          </button>

          <button
            onClick={fetchPayments}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Financial KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Total SaaS Revenue
          </span>
          <span className="text-lg font-black text-emerald-600 font-mono mt-0.5 block">
            ₹{(statusCounts?.totalCollected || 0).toLocaleString('en-IN')}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Successful Payments
          </span>
          <span className="text-lg font-black text-slate-900 font-mono mt-0.5 block">
            {statusCounts?.success || 0}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Pending Verification
          </span>
          <span className="text-lg font-black text-amber-600 font-mono mt-0.5 block">
            {statusCounts?.pending || 0}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Failed Attempts
          </span>
          <span className="text-lg font-black text-rose-600 font-mono mt-0.5 block">
            {statusCounts?.failed || 0}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Total Refunded
          </span>
          <span className="text-lg font-black text-purple-600 font-mono mt-0.5 block">
            ₹{(statusCounts?.totalRefunded || 0).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { key: 'ALL', label: 'All Transactions', count: statusCounts?.all },
          { key: 'SUCCESS', label: 'Successful', count: statusCounts?.success },
          { key: 'PENDING', label: 'Pending Verification', count: statusCounts?.pending },
          { key: 'FAILED', label: 'Failed Attempts', count: statusCounts?.failed },
          { key: 'REFUNDED', label: 'Refunded', count: statusCounts?.refunded },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setPage(1);
            }}
            className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === tab.key
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === tab.key
                    ? 'bg-slate-800 text-slate-300'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Payment ID, Gateway Txn ID, or Store Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden"
          />
        </form>

        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700"
        >
          <option value="ALL">All Categories</option>
          <option value="SUBSCRIPTION">SaaS Subscription Billing</option>
          <option value="INVOICE">Store Customer Invoices</option>
        </select>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/90 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Payment ID & Customer</th>
                <th className="py-3 px-4">Type & Related Entity</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Gateway & Txn Ref</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600 mb-2" />
                    <span>Loading payment transactions...</span>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-500">
                    No payment records found for the selected view.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-[11px] font-semibold text-slate-800">{p.id}</div>
                      <div className="font-bold text-slate-900">{p.businessName}</div>
                      {p.userEmail && p.userEmail !== 'N/A' && (
                        <div className="text-[10px] text-slate-500 truncate max-w-[170px]" title={p.userEmail}>
                          {p.userEmail}
                        </div>
                      )}
                      {p.userId && (
                        <div className="text-[9px] text-slate-400 font-mono">ID: {p.userId.slice(-8)}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      <div className="font-medium">{p.relatedEntity}</div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">
                        {p.category.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-black text-slate-900 text-sm">₹{p.amount.toLocaleString('en-IN')}</span>
                      {p.refundStatus !== 'None' && (
                        <div className="text-[10px] text-red-600 font-semibold">{p.refundStatus}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 uppercase flex items-center gap-1.5">
                        <span>{p.gateway}</span>
                        {p.autoPayStatus && p.autoPayStatus !== 'N/A' && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-500 font-normal">
                            One-Time
                          </span>
                        )}
                      </div>
                      {p.gatewayPaymentId && (
                        <div className="font-mono text-[10px] text-slate-600 truncate max-w-[140px]" title={p.gatewayPaymentId}>
                          Pay: {p.gatewayPaymentId}
                        </div>
                      )}
                      {p.gatewayOrderId && (
                        <div className="font-mono text-[10px] text-slate-400 truncate max-w-[140px]" title={p.gatewayOrderId}>
                          Ord: {p.gatewayOrderId}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {p.status === 'SUCCESS' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>Successful</span>
                        </span>
                      ) : p.status === 'PENDING' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>Pending</span>
                        </span>
                      ) : p.status === 'REFUNDED' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                          <RotateCcw className="w-3 h-3 text-purple-500" />
                          <span>Refunded</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3 text-red-500" />
                          <span>Failed</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {new Date(p.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {p.category === 'SUBSCRIPTION_BILLING' && (
                        <div className="inline-flex items-center gap-1.5">
                          {p.status === 'PENDING' && (
                            <button
                              onClick={() => {
                                setSelectedPayment(p);
                                setReconcileAction('CONFIRM_PAYMENT');
                                setGatewayRef(p.gatewayTransactionId !== 'N/A' ? p.gatewayTransactionId : '');
                                setActionReason('');
                                setModalType('RECONCILE');
                              }}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100"
                            >
                              Reconcile
                            </button>
                          )}

                          {p.status === 'SUCCESS' && (
                            <button
                              onClick={() => {
                                setSelectedPayment(p);
                                setReconcileAction('RECORD_REFUND');
                                setActionReason('');
                                setModalType('REFUND');
                              }}
                              className="px-2 py-1 rounded-lg text-[10px] font-semibold text-slate-600 hover:bg-slate-100"
                            >
                              Refund
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Page {page} of {totalPages} ({totalCount} total records)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* RECONCILE MODAL */}
      {modalType === 'RECONCILE' && selectedPayment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Confirm Payment Reconciliation</span>
              </div>
              <button onClick={() => setModalType(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <div>Store: <strong>{selectedPayment.businessName}</strong></div>
              <div>Amount: <strong>₹{selectedPayment.amount}</strong> ({selectedPayment.relatedEntity})</div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Bank / Gateway Transaction Reference ID
              </label>
              <input
                type="text"
                placeholder="UTR / Bank Ref Number / Razorpay Payment ID..."
                value={gatewayRef}
                onChange={(e) => setGatewayRef(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Mandatory Verification Justification (Audit Log)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Verified credited in HDFC Current A/C ending in 4102..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReconcileSubmit}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
              >
                {submitting ? 'Reconciling...' : 'Confirm & Activate Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REFUND MODAL */}
      {modalType === 'REFUND' && selectedPayment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <RotateCcw className="w-4 h-4 text-purple-600" />
                <span>Record Subscription Refund</span>
              </div>
              <button onClick={() => setModalType(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Store: <strong>{selectedPayment.businessName}</strong> • Original Amount: <strong>₹{selectedPayment.amount}</strong>
            </p>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Reason for Refund (Mandatory)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Double payment reversed, satisfaction refund..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReconcileSubmit}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-sm"
              >
                {submitting ? 'Recording...' : 'Record Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL OFFLINE PAYMENT MODAL */}
      {modalType === 'CREATE_MANUAL' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                <span>Record Manual Bank / NEFT Collection</span>
              </div>
              <button onClick={() => setModalType(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Business / Workspace ID
              </label>
              <input
                type="text"
                placeholder="Paste businessId (from Businesses page)..."
                value={manualBizId}
                onChange={(e) => setManualBizId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Plan Tier
                </label>
                <select
                  value={manualPlan}
                  onChange={(e) => {
                    setManualPlan(e.target.value);
                    if (e.target.value === 'STARTER') setManualAmount('199');
                    if (e.target.value === 'GROWTH_PRO') setManualAmount('499');
                    if (e.target.value === 'ENTERPRISE') setManualAmount('999');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800"
                >
                  <option value="STARTER">Starter (₹199)</option>
                  <option value="GROWTH_PRO">Growth (₹499)</option>
                  <option value="ENTERPRISE">Scale (₹999)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Bank UTR / Transaction Reference
              </label>
              <input
                type="text"
                placeholder="e.g. UTR2026101700941"
                value={gatewayRef}
                onChange={(e) => setGatewayRef(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Verification Justification (Mandatory)
              </label>
              <input
                type="text"
                placeholder="Reason and verification reference..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReconcileSubmit}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
              >
                {submitting ? 'Recording...' : 'Record Payment & Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
