'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import {
  Users,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  PowerOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  CreditCard,
  Building2,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';

interface PlatformUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  platformRole: string;
  isSuspended: boolean;
  suspendedReason: string | null;
  createdAt: string;
  lastLogin: string | null;
  business: {
    id: string;
    name: string;
    tradeType: string | null;
    role: string;
    plan: string;
    subscriptionStatus: string;
  } | null;
  stats: {
    khataContacts: number;
    khataTransactions: number;
  };
}

export default function PlatformAdminUsersPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);
  const [modalType, setModalType] = useState<'SUSPEND' | 'PLAN' | 'VIEW' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('STARTER');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [page, statusFilter, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        status: statusFilter,
        role: roleFilter,
      });
      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim());
      }

      const res = await fetch(`/api/platform-admin/users?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.users || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error fetching users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleToggleSuspend = async () => {
    if (!selectedUser) return;
    if (!actionReason.trim()) {
      toast.error('Please provide a justification reason.');
      return;
    }

    try {
      setSubmitting(true);
      const newSuspendedState = !selectedUser.isSuspended;
      const res = await fetch(`/api/platform-admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isSuspended: newSuspendedState,
          reason: actionReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user suspension status');

      toast.success(data.message || 'User status updated');
      setModalType(null);
      setSelectedUser(null);
      setActionReason('');
      fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePlanChange = async () => {
    if (!selectedUser) return;
    if (!actionReason.trim()) {
      toast.error('Please provide an administrative reason for plan correction.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/platform-admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          reason: actionReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to correct user plan');

      toast.success(data.message || 'Plan corrected successfully');
      setModalType(null);
      setSelectedUser(null);
      setActionReason('');
      fetchUsers();
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
            <span>User Management Directory</span>
            <span className="text-xs font-bold text-slate-500 font-mono">({totalCount})</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Search, inspect, suspend/reactivate, and correct plan assignments across platform users.
          </p>
        </div>

        <button
          onClick={fetchUsers}
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
            placeholder="Search by name, email, or mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">All Account Status</option>
            <option value="ACTIVE">Active Users</option>
            <option value="SUSPENDED">Suspended Users</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">All Platform Roles</option>
            <option value="USER">Customer / Business</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/90 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">User & Role</th>
                <th className="py-3 px-4">Associated Business</th>
                <th className="py-3 px-4">Assigned Plan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Registration</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600 mb-2" />
                    <span>Loading platform user records...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-500">
                    No users matching criteria found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                      {u.phone && <div className="text-[10px] text-slate-400">{u.phone}</div>}
                    </td>

                    <td className="py-3.5 px-4">
                      {u.business ? (
                        <div>
                          <div className="font-semibold text-slate-800">{u.business.name}</div>
                          <div className="text-[10px] text-slate-400">{u.business.tradeType || 'Personal'}</div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No workspace</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {u.business ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            u.business.plan === 'FREE_KHATA'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : u.business.plan === 'STARTER'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : u.business.plan === 'GROWTH_PRO' || u.business.plan === 'GROWTH'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {u.business.plan.replace('_PRO', '')}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {u.isSuspended ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3 text-red-500" />
                          <span>Suspended</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>Active</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setModalType('VIEW');
                          }}
                          title="View Profile Details"
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setSelectedPlan(u.business?.plan || 'STARTER');
                            setActionReason('');
                            setModalType('PLAN');
                          }}
                          title="Correct Subscription Plan"
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setActionReason('');
                            setModalType('SUSPEND');
                          }}
                          title={u.isSuspended ? 'Reactivate User' : 'Suspend User'}
                          className={`p-1.5 rounded-lg ${
                            u.isSuspended
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
            Page {page} of {totalPages} ({totalCount} total users)
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

      {/* SUSPEND / REACTIVATE MODAL */}
      {modalType === 'SUSPEND' && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <AlertTriangle
                  className={`w-4 h-4 ${selectedUser.isSuspended ? 'text-emerald-600' : 'text-red-600'}`}
                />
                <span>
                  {selectedUser.isSuspended ? 'Reactivate User Account' : 'Suspend User Account'}
                </span>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {selectedUser.isSuspended ? (
                <>
                  Are you sure you want to <strong>reactivate</strong> {selectedUser.name} ({selectedUser.email})? Their sessions will be permitted and dashboard access will be restored.
                </>
              ) : (
                <>
                  Are you sure you want to <strong>suspend</strong> {selectedUser.name} ({selectedUser.email})? Their active sessions will be terminated and login will be rejected server-side.
                </>
              )}
            </p>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Justification / Reason (Mandatory for Audit Trail)
              </label>
              <textarea
                rows={3}
                placeholder="Enter justification (e.g. Terms violation, customer request, fraud check)..."
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
                onClick={handleToggleSuspend}
                disabled={submitting}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all ${
                  selectedUser.isSuspended
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {submitting ? 'Updating...' : selectedUser.isSuspended ? 'Confirm Reactivation' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAN CORRECTION MODAL */}
      {modalType === 'PLAN' && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Correct Subscription Plan Assignment</span>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600">
              Target User: <strong>{selectedUser.name}</strong> ({selectedUser.email})<br />
              Workspace: <strong>{selectedUser.business?.name || 'N/A'}</strong>
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
                Reason for Administrative Correction
              </label>
              <input
                type="text"
                placeholder="e.g. Corrected manual upgrade payment, plan downgrade request..."
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
                {submitting ? 'Applying Plan...' : 'Apply Plan Correction'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {modalType === 'VIEW' && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Users className="w-4 h-4 text-purple-600" />
                <span>User Profile & Workspace Details</span>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-slate-500 block text-[10px]">User ID</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedUser.id}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Platform Role</span>
                  <span className="font-bold text-slate-800">{selectedUser.platformRole}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Name</span>
                  <span className="font-bold text-slate-800">{selectedUser.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Email</span>
                  <span className="font-mono text-slate-800">{selectedUser.email}</span>
                </div>
              </div>

              {selectedUser.business ? (
                <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-2">
                  <span className="font-bold text-emerald-900 block text-[11px]">Primary Workspace</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-emerald-700/80 block">Business Name</span>
                      <span className="font-bold text-emerald-950">{selectedUser.business.name}</span>
                    </div>
                    <div>
                      <span className="text-emerald-700/80 block">Plan & Status</span>
                      <span className="font-bold text-emerald-950">
                        {selectedUser.business.plan} ({selectedUser.business.subscriptionStatus})
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl text-slate-500">
                  No active business membership linked.
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="font-bold text-slate-700 block text-[11px]">Khata Ledger Footprint</span>
                <div className="flex items-center gap-4 text-slate-600">
                  <span>Contacts: <strong>{selectedUser.stats?.khataContacts || 0}</strong></span>
                  <span>Transactions: <strong>{selectedUser.stats?.khataTransactions || 0}</strong></span>
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
