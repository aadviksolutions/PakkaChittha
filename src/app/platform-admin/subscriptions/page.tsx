'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import {
  CreditCard,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  PowerOff,
  ChevronLeft,
  ChevronRight,
  X,
  Building2,
  PlusCircle,
} from 'lucide-react';

interface SubscriptionRecord {
  id: string;
  businessId: string;
  businessName: string;
  tradeType: string | null;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  plan: string;
  status: string;
  monthlyPrice: number;
  startDate: string;
  endDate: string | null;
  trialDaysRemaining: number;
  maxMonthlyInvoices: number;
  maxStaffSeats: number;
  maxBranches: number;
  createdAt: string;
}

export default function PlatformAdminSubscriptionsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [selectedSub, setSelectedSub] = useState<SubscriptionRecord | null>(null);
  const [modalType, setModalType] = useState<'PLAN' | 'EXTEND' | 'STATUS' | null>(null);
  const [selectedPlan, setSelectedPlan] = useState('GROWTH_PRO');
  const [extensionDays, setExtensionDays] = useState('30');
  const [actionReason, setActionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
  }, [page, planFilter, statusFilter]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        plan: planFilter,
        status: statusFilter,
      });
      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim());
      }

      const res = await fetch(`/api/platform-admin/subscriptions?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load subscriptions');
      const data = await res.json();
      setSubscriptions(data.subscriptions || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error fetching subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSubscriptions();
  };

  const handlePlanChange = async () => {
    if (!selectedSub) return;
    if (!actionReason.trim()) {
      toast.error('Please provide an administrative reason.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/platform-admin/subscriptions/${selectedSub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          reason: actionReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update plan');

      toast.success(data.message || 'Subscription plan updated');
      setModalType(null);
      setSelectedSub(null);
      setActionReason('');
      fetchSubscriptions();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExtendDuration = async () => {
    if (!selectedSub) return;
    if (!actionReason.trim()) {
      toast.error('Please provide an administrative reason.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/platform-admin/subscriptions/${selectedSub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extensionDays,
          reason: actionReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extend subscription');

      toast.success(data.message || 'Subscription extended successfully');
      setModalType(null);
      setSelectedSub(null);
      setActionReason('');
      fetchSubscriptions();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedSub) return;
    if (!actionReason.trim()) {
      toast.error('Please provide a justification reason.');
      return;
    }

    try {
      setSubmitting(true);
      const newStatus = selectedSub.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
      const res = await fetch(`/api/platform-admin/subscriptions/${selectedSub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          reason: actionReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      toast.success(data.message || 'Status updated');
      setModalType(null);
      setSelectedSub(null);
      setActionReason('');
      fetchSubscriptions();
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
            <span>Subscription Lifecycle Management</span>
            <span className="text-xs font-bold text-slate-500 font-mono">({totalCount})</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Audit assigned packages, billing terms, active dates, and entitlement limits across all customer stores.
          </p>
        </div>

        <button
          onClick={fetchSubscriptions}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Subscriptions</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by store name, email, or mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">All Plans</option>
            <option value="FREE_KHATA">Free Khata</option>
            <option value="STARTER">Starter (₹199)</option>
            <option value="GROWTH_PRO">Growth (₹499)</option>
            <option value="ENTERPRISE">Scale (₹999)</option>
            <option value="FREE_TRIAL">Trial</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="TRIALING">Trialing</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/90 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Store & Owner</th>
                <th className="py-3 px-4">Assigned Plan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Term & Dates</th>
                <th className="py-3 px-4">Limits</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600 mb-2" />
                    <span>Loading subscriptions...</span>
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-500">
                    No subscriptions matching criteria found.
                  </td>
                </tr>
              ) : (
                subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{s.businessName}</div>
                      <div className="text-[11px] text-slate-500">{s.ownerName} ({s.ownerEmail})</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          s.plan === 'FREE_KHATA'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : s.plan === 'STARTER'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : s.plan === 'GROWTH_PRO' || s.plan === 'GROWTH'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : s.plan === 'FREE_TRIAL'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {s.plan.replace('_PRO', '')}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">₹{s.monthlyPrice}/mo</div>
                    </td>

                    <td className="py-3.5 px-4">
                      {s.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>Active</span>
                        </span>
                      ) : s.status === 'SUSPENDED' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3 text-red-500" />
                          <span>Suspended</span>
                        </span>
                      ) : s.status === 'TRIALING' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3 text-purple-500" />
                          <span>Trial ({s.trialDaysRemaining}d)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          <span>{s.status}</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                      <div>Started: {new Date(s.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      <div>
                        Expires:{' '}
                        {s.plan === 'FREE_KHATA'
                          ? 'Never (Permanent)'
                          : s.endDate
                          ? new Date(s.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : 'N/A'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                      <div>Seats: <strong>{s.maxStaffSeats}</strong></div>
                      <div>Invoices: <strong>{s.maxMonthlyInvoices >= 999999 ? 'Unlimited' : s.maxMonthlyInvoices}</strong></div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedSub(s);
                            setSelectedPlan(s.plan === 'FREE_TRIAL' ? 'STARTER' : s.plan);
                            setActionReason('');
                            setModalType('PLAN');
                          }}
                          title="Correct Plan"
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedSub(s);
                            setActionReason('');
                            setModalType('EXTEND');
                          }}
                          title="Extend Duration"
                          className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50"
                        >
                          <Clock className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedSub(s);
                            setActionReason('');
                            setModalType('STATUS');
                          }}
                          title={s.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                          className={`p-1.5 rounded-lg ${
                            s.status === 'SUSPENDED'
                              ? 'text-emerald-700 hover:bg-emerald-50'
                              : 'text-red-600 hover:bg-red-50'
                          }`}
                        >
                          <PowerOff className="w-4 h-4" />
                        </button>
                      </div>
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
            Page {page} of {totalPages} ({totalCount} total subscriptions)
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

      {/* PLAN CORRECTION MODAL */}
      {modalType === 'PLAN' && selectedSub && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Correct Plan Assignment</span>
              </div>
              <button onClick={() => setModalType(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600">
              Target Store: <strong>{selectedSub.businessName}</strong> ({selectedSub.ownerEmail})
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Select Authoritative Plan
              </label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800"
              >
                <option value="FREE_KHATA">Pakka Chittha Free Khata (₹0 - Permanent Personal Ledger)</option>
                <option value="STARTER">Pakka Chittha Starter (₹199/mo - Invoices, Basic Stock)</option>
                <option value="GROWTH_PRO">Pakka Chittha Growth (₹499/mo - Purchases, Staff, GSTR-3B)</option>
                <option value="ENTERPRISE">Pakka Chittha Scale (₹999/mo - Multi-Location, Advanced)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Administrative Justification (Mandatory)
              </label>
              <input
                type="text"
                placeholder="Reason for plan correction..."
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
                onClick={handlePlanChange}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
              >
                {submitting ? 'Updating...' : 'Confirm Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXTEND SUBSCRIPTION MODAL */}
      {modalType === 'EXTEND' && selectedSub && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Clock className="w-4 h-4 text-purple-600" />
                <span>Extend Paid Term / Duration</span>
              </div>
              <button onClick={() => setModalType(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600">
              Store: <strong>{selectedSub.businessName}</strong>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Extension Duration
              </label>
              <select
                value={extensionDays}
                onChange={(e) => setExtensionDays(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800"
              >
                <option value="15">+15 Days Grace</option>
                <option value="30">+30 Days (1 Month Complimentary)</option>
                <option value="60">+60 Days (2 Months)</option>
                <option value="90">+90 Days (Quarterly)</option>
                <option value="365">+365 Days (1 Full Year)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Reason for Extension (Audit Trail)
              </label>
              <input
                type="text"
                placeholder="e.g. Paid via offline NEFT, complimentary partner account..."
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
                onClick={handleExtendDuration}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-sm"
              >
                {submitting ? 'Applying...' : 'Apply Extension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATUS TOGGLE MODAL */}
      {modalType === 'STATUS' && selectedSub && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <AlertTriangle
                  className={`w-4 h-4 ${selectedSub.status === 'SUSPENDED' ? 'text-emerald-600' : 'text-red-600'}`}
                />
                <span>
                  {selectedSub.status === 'SUSPENDED' ? 'Reactivate Subscription' : 'Suspend Subscription'}
                </span>
              </div>
              <button onClick={() => setModalType(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Target Store: <strong>{selectedSub.businessName}</strong><br />
              {selectedSub.status === 'SUSPENDED'
                ? 'Reactivating will restore write operations and active entitlements.'
                : 'Suspending will restrict write operations while preserving historical records.'}
            </p>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Justification / Reason (Mandatory)
              </label>
              <textarea
                rows={3}
                placeholder="Enter justification..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:outline-hidden"
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
                onClick={handleToggleStatus}
                disabled={submitting}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm ${
                  selectedSub.status === 'SUSPENDED'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {submitting ? 'Updating...' : selectedSub.status === 'SUSPENDED' ? 'Confirm Reactivation' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
