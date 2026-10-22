'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import {
  Building2,
  Search,
  CheckCircle2,
  AlertTriangle,
  PowerOff,
  Clock,
  CreditCard,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
} from 'lucide-react';

interface TenantBusiness {
  id: string;
  businessName: string;
  legalName: string;
  tradeType: string;
  gstin: string;
  state: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  plan: string;
  subscriptionStatus: string;
  monthlyPrice: number;
  trialDaysRemaining: number;
  endDate: string | null;
  invoiceCount: number;
  customerCount: number;
  itemCount: number;
  khataContactsCount: number;
  khataTransactionsCount: number;
  createdAt: string;
}

export default function PlatformAdminBusinessesPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<TenantBusiness[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [selectedTenant, setSelectedTenant] = useState<TenantBusiness | null>(null);
  const [modalType, setModalType] = useState<'STATUS' | 'PLAN' | 'EXTEND' | 'VIEW' | null>(null);
  const [selectedPlan, setSelectedPlan] = useState('GROWTH_PRO');
  const [extensionDays, setExtensionDays] = useState('7');
  const [actionReason, setActionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBusinesses();
  }, [page, planFilter, statusFilter]);

  const fetchBusinesses = async () => {
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

      const res = await fetch(`/api/platform-admin/businesses?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load businesses');
      const data = await res.json();
      setBusinesses(data.businesses || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error fetching businesses');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchBusinesses();
  };

  const handleToggleStatus = async () => {
    if (!selectedTenant) return;
    if (!actionReason.trim()) {
      toast.error('Please provide a justification reason.');
      return;
    }

    try {
      setSubmitting(true);
      const newStatus = selectedTenant.subscriptionStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
      const res = await fetch(`/api/platform-admin/businesses/${selectedTenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          reason: actionReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      toast.success(data.message || 'Workspace status updated');
      setModalType(null);
      setSelectedTenant(null);
      setActionReason('');
      fetchBusinesses();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error updating status');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePlanChange = async () => {
    if (!selectedTenant) return;
    if (!actionReason.trim()) {
      toast.error('Please provide an administrative reason.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/platform-admin/businesses/${selectedTenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          reason: actionReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update plan');

      toast.success(data.message || 'Plan corrected');
      setModalType(null);
      setSelectedTenant(null);
      setActionReason('');
      fetchBusinesses();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExtendTrial = async () => {
    if (!selectedTenant) return;
    if (!actionReason.trim()) {
      toast.error('Please provide an administrative reason.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/platform-admin/businesses/${selectedTenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trialDaysExtension: extensionDays,
          reason: actionReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extend duration');

      toast.success(data.message || 'Duration extended');
      setModalType(null);
      setSelectedTenant(null);
      setActionReason('');
      fetchBusinesses();
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
            <span>Business Workspaces Directory</span>
            <span className="text-xs font-bold text-slate-500 font-mono">({totalCount})</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative multi-tenant directory: manage commercial stores, subscriptions, trial periods, and quotas.
          </p>
        </div>

        <button
          onClick={fetchBusinesses}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Directory</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by business name, legal name, GSTIN, phone..."
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
            <option value="STARTER">Starter</option>
            <option value="GROWTH_PRO">Growth</option>
            <option value="ENTERPRISE">Scale</option>
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

      {/* Businesses Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/90 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Business & Owner</th>
                <th className="py-3 px-4">GSTIN & Trade</th>
                <th className="py-3 px-4">Plan & Billing</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Footprint</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600 mb-2" />
                    <span>Loading workspace records...</span>
                  </td>
                </tr>
              ) : businesses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-500">
                    No businesses matching criteria found.
                  </td>
                </tr>
              ) : (
                businesses.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{b.businessName}</div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        Owner: {b.ownerName} ({b.ownerEmail})
                      </div>
                      {b.ownerPhone !== 'N/A' && <div className="text-[10px] text-slate-400">{b.ownerPhone}</div>}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-mono text-[11px] text-slate-700">{b.gstin}</div>
                      <div className="text-[10px] text-slate-400">{b.tradeType} • {b.state}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          b.plan === 'FREE_KHATA'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : b.plan === 'STARTER'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : b.plan === 'GROWTH_PRO' || b.plan === 'GROWTH'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : b.plan === 'FREE_TRIAL'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {b.plan.replace('_PRO', '')}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {b.monthlyPrice > 0 ? `₹${b.monthlyPrice}/mo` : 'Free / Trial'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {b.subscriptionStatus === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>Active</span>
                        </span>
                      ) : b.subscriptionStatus === 'SUSPENDED' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3 text-red-500" />
                          <span>Suspended</span>
                        </span>
                      ) : b.subscriptionStatus === 'TRIALING' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3 text-purple-500" />
                          <span>Trial ({b.trialDaysRemaining}d)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          <span>{b.subscriptionStatus}</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                      <div>Invoices: <strong>{b.invoiceCount}</strong></div>
                      <div>Customers: <strong>{b.customerCount}</strong></div>
                      <div>Khata Tx: <strong>{b.khataTransactionsCount}</strong></div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedTenant(b);
                            setModalType('VIEW');
                          }}
                          title="View Business Details"
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedTenant(b);
                            setSelectedPlan(b.plan === 'FREE_TRIAL' ? 'STARTER' : b.plan);
                            setActionReason('');
                            setModalType('PLAN');
                          }}
                          title="Change Plan"
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedTenant(b);
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
                            setSelectedTenant(b);
                            setActionReason('');
                            setModalType('STATUS');
                          }}
                          title={b.subscriptionStatus === 'SUSPENDED' ? 'Reactivate Store' : 'Suspend Store'}
                          className={`p-1.5 rounded-lg ${
                            b.subscriptionStatus === 'SUSPENDED'
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
            Page {page} of {totalPages} ({totalCount} total workspaces)
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

      {/* STATUS TOGGLE MODAL */}
      {modalType === 'STATUS' && selectedTenant && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <AlertTriangle
                  className={`w-4 h-4 ${selectedTenant.subscriptionStatus === 'SUSPENDED' ? 'text-emerald-600' : 'text-red-600'}`}
                />
                <span>
                  {selectedTenant.subscriptionStatus === 'SUSPENDED' ? 'Reactivate Store Workspace' : 'Suspend Store Workspace'}
                </span>
              </div>
              <button onClick={() => setModalType(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Target Store: <strong>{selectedTenant.businessName}</strong> ({selectedTenant.ownerEmail})<br />
              {selectedTenant.subscriptionStatus === 'SUSPENDED'
                ? 'Reactivating will restore normal commercial operations and allow users to login.'
                : 'Suspending will put this store into read-only restricted mode across all staff.'}
            </p>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Justification / Reason (Mandatory for Audit Trail)
              </label>
              <textarea
                rows={3}
                placeholder="Enter justification for workspace suspension..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
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
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all ${
                  selectedTenant.subscriptionStatus === 'SUSPENDED'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {submitting ? 'Updating...' : selectedTenant.subscriptionStatus === 'SUSPENDED' ? 'Confirm Reactivation' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAN CORRECTION MODAL */}
      {modalType === 'PLAN' && selectedTenant && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Adjust Store Subscription Tier</span>
              </div>
              <button onClick={() => setModalType(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600">
              Target Store: <strong>{selectedTenant.businessName}</strong><br />
              Current Tier: <strong>{selectedTenant.plan}</strong>
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
                <option value="FREE_KHATA">Pakka Chittha Free Khata (₹0 - Personal Ledger Only)</option>
                <option value="STARTER">Pakka Chittha Starter (₹199/mo - Invoices, Basic Stock)</option>
                <option value="GROWTH_PRO">Pakka Chittha Growth (₹499/mo - Purchases, Staff, GSTR-3B)</option>
                <option value="ENTERPRISE">Pakka Chittha Scale (₹999/mo - Multi-Location, Advanced)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Reason for Administrative Adjustment
              </label>
              <input
                type="text"
                placeholder="e.g. Approved bank transfer, customer requested upgrade..."
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
                {submitting ? 'Applying...' : 'Apply Plan Change'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXTEND TRIAL MODAL */}
      {modalType === 'EXTEND' && selectedTenant && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Clock className="w-4 h-4 text-purple-600" />
                <span>Extend Subscription / Trial Duration</span>
              </div>
              <button onClick={() => setModalType(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600">
              Target Store: <strong>{selectedTenant.businessName}</strong>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Extension Days
              </label>
              <select
                value={extensionDays}
                onChange={(e) => setExtensionDays(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800"
              >
                <option value="7">+7 Days (Standard Extension)</option>
                <option value="14">+14 Days</option>
                <option value="30">+30 Days (1 Month Complimentary)</option>
                <option value="60">+60 Days</option>
                <option value="90">+90 Days (Quarterly Extension)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Reason for Extension
              </label>
              <input
                type="text"
                placeholder="e.g. Onboarding assistance, grace period extension..."
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
                onClick={handleExtendTrial}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-sm"
              >
                {submitting ? 'Extending...' : 'Confirm Extension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {modalType === 'VIEW' && selectedTenant && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>Store Profile & Footprint</span>
              </div>
              <button onClick={() => setModalType(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 block text-[10px]">Store ID</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedTenant.id}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Trade Type</span>
                  <span className="font-bold text-slate-800">{selectedTenant.tradeType}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Store Name</span>
                  <span className="font-bold text-slate-800">{selectedTenant.businessName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">GSTIN</span>
                  <span className="font-mono text-slate-800">{selectedTenant.gstin}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Owner</span>
                  <span className="text-slate-800 font-semibold">{selectedTenant.ownerName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Owner Email</span>
                  <span className="font-mono text-slate-800">{selectedTenant.ownerEmail}</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-emerald-800 text-[10px] block">Invoices</span>
                  <span className="text-base font-black text-emerald-950">{selectedTenant.invoiceCount}</span>
                </div>
                <div>
                  <span className="text-emerald-800 text-[10px] block">Customers</span>
                  <span className="text-base font-black text-emerald-950">{selectedTenant.customerCount}</span>
                </div>
                <div>
                  <span className="text-emerald-800 text-[10px] block">Items in Stock</span>
                  <span className="text-base font-black text-emerald-950">{selectedTenant.itemCount}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
