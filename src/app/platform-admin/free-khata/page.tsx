'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import {
  BookOpen,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  PowerOff,
  RefreshCw,
  Clock,
  Sparkles,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
} from 'lucide-react';

interface FreeKhataAccount {
  id: string;
  businessName: string;
  ownerId: string | null;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  status: string;
  isUserSuspended: boolean;
  contactsCount: number;
  transactionsCount: number;
  repaymentsCount: number;
  createdAt: string;
}

interface FreeKhataStats {
  totalFreeKhata: number;
  newLast7Days: number;
  newLast30Days: number;
  activeCount: number;
  suspendedCount: number;
  totalContacts: number;
  totalTransactions: number;
  totalRepayments: number;
}

export default function PlatformAdminFreeKhataPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<FreeKhataStats | null>(null);
  const [accounts, setAccounts] = useState<FreeKhataAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [selectedAccount, setSelectedAccount] = useState<FreeKhataAccount | null>(null);
  const [modalType, setModalType] = useState<'SUSPEND' | 'VIEW' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchFreeKhata();
  }, [page, statusFilter]);

  const fetchFreeKhata = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        status: statusFilter,
      });
      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim());
      }

      const res = await fetch(`/api/platform-admin/free-khata?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load Free Khata accounts');
      const data = await res.json();
      setStats(data.stats);
      setAccounts(data.accounts || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error fetching Free Khata');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchFreeKhata();
  };

  const handleToggleSuspend = async () => {
    if (!selectedAccount) return;
    if (!actionReason.trim()) {
      toast.error('Please enter a justification reason.');
      return;
    }

    try {
      setSubmitting(true);
      const newStatus = selectedAccount.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
      const res = await fetch(`/api/platform-admin/businesses/${selectedAccount.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          reason: actionReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update account status');

      toast.success(data.message || 'Free Khata account status updated');
      setModalType(null);
      setSelectedAccount(null);
      setActionReason('');
      fetchFreeKhata();
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
            <span>Free Khata Operations & Oversight</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
              Permanently Free
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Dedicated oversight for personal udhaar ledger users. Free Khata remains permanently free without trial expiry or forced commercial upgrades.
          </p>
        </div>

        <button
          onClick={fetchFreeKhata}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-slate-500 block text-[11px] font-semibold">Total Free Khata Accounts</span>
          <span className="text-2xl font-black text-slate-900 block my-1">
            {loading ? '...' : (stats?.totalFreeKhata || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-emerald-600 font-bold">
            +{stats?.newLast7Days || 0} in last 7 days
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-slate-500 block text-[11px] font-semibold">Active Ledger Users</span>
          <span className="text-2xl font-black text-slate-900 block my-1">
            {loading ? '...' : (stats?.activeCount || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-500">
            {stats?.suspendedCount || 0} suspended
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-slate-500 block text-[11px] font-semibold">Total Khata Contacts</span>
          <span className="text-2xl font-black text-slate-900 block my-1">
            {loading ? '...' : (stats?.totalContacts || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-500">Unlimited party contacts</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-slate-500 block text-[11px] font-semibold">Total Entries Recorded</span>
          <span className="text-2xl font-black text-slate-900 block my-1">
            {loading ? '...' : (stats?.totalTransactions || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-500">
            {stats?.totalRepayments || 0} settlements
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by account name, email, or mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
        </form>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-hidden"
        >
          <option value="ALL">All Accounts</option>
          <option value="ACTIVE">Active Accounts</option>
          <option value="SUSPENDED">Suspended Accounts</option>
        </select>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/90 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Account & User</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Ledger Usage</th>
                <th className="py-3 px-4">Joined Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                    <span>Loading Free Khata accounts...</span>
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-slate-500">
                    No Free Khata accounts found.
                  </td>
                </tr>
              ) : (
                accounts.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{a.businessName}</div>
                      <div className="text-[11px] text-slate-500">{a.ownerName} ({a.ownerEmail})</div>
                      {a.ownerPhone !== 'N/A' && <div className="text-[10px] text-slate-400">{a.ownerPhone}</div>}
                    </td>

                    <td className="py-3.5 px-4">
                      {a.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>Active (Permanent Free)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3 text-red-500" />
                          <span>Suspended</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 text-[11px]">
                      <div>Contacts: <strong>{a.contactsCount}</strong></div>
                      <div>Transactions: <strong>{a.transactionsCount}</strong> (Settlements: {a.repaymentsCount})</div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {new Date(a.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedAccount(a);
                            setModalType('VIEW');
                          }}
                          title="View Usage Metadata"
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedAccount(a);
                            setActionReason('');
                            setModalType('SUSPEND');
                          }}
                          title={a.status === 'SUSPENDED' ? 'Reactivate Account' : 'Suspend Account'}
                          className={`p-1.5 rounded-lg ${
                            a.status === 'SUSPENDED'
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
            Page {page} of {totalPages} ({totalCount} total accounts)
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

      {/* SUSPEND MODAL */}
      {modalType === 'SUSPEND' && selectedAccount && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <AlertTriangle
                  className={`w-4 h-4 ${selectedAccount.status === 'SUSPENDED' ? 'text-emerald-600' : 'text-red-600'}`}
                />
                <span>
                  {selectedAccount.status === 'SUSPENDED' ? 'Reactivate Free Khata Account' : 'Suspend Free Khata Account'}
                </span>
              </div>
              <button onClick={() => setModalType(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Account: <strong>{selectedAccount.businessName}</strong> ({selectedAccount.ownerEmail})<br />
              {selectedAccount.status === 'SUSPENDED'
                ? 'Reactivating will restore normal personal ledger access.'
                : 'Suspending will restrict access for this Free Khata user.'}
            </p>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Justification / Reason (Mandatory for Audit Trail)
              </label>
              <textarea
                rows={3}
                placeholder="Enter justification..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
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
                  selectedAccount.status === 'SUSPENDED'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {submitting ? 'Updating...' : selectedAccount.status === 'SUSPENDED' ? 'Confirm Reactivation' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {modalType === 'VIEW' && selectedAccount && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Free Khata Account Profile</span>
              </div>
              <button onClick={() => setModalType(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5">
                <div>
                  <span className="text-slate-500 block text-[10px]">Account Name</span>
                  <span className="font-bold text-slate-800">{selectedAccount.businessName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Owner</span>
                  <span className="text-slate-800">{selectedAccount.ownerName} ({selectedAccount.ownerEmail})</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Plan Type</span>
                  <span className="font-bold text-blue-700">Permanent Free Khata (No Expire)</span>
                </div>
              </div>

              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-blue-800 text-[10px] block">Contacts</span>
                  <span className="text-base font-black text-blue-950">{selectedAccount.contactsCount}</span>
                </div>
                <div>
                  <span className="text-blue-800 text-[10px] block">Transactions</span>
                  <span className="text-base font-black text-blue-950">{selectedAccount.transactionsCount}</span>
                </div>
                <div>
                  <span className="text-blue-800 text-[10px] block">Settled</span>
                  <span className="text-base font-black text-blue-950">{selectedAccount.repaymentsCount}</span>
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
