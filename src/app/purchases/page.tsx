'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import {
  Truck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Eye,
  CreditCard,
  RefreshCw,
  ShoppingBag,
  Users,
  ChevronRight,
  X,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useEntitlements } from '@/hooks/useEntitlements';
import { FeatureNotAvailable } from '@/components/shared/FeatureNotAvailable';

interface PurchaseListItem {
  id: string;
  purchaseNumber: string;
  supplierInvoiceNumber: string | null;
  purchaseDate: string;
  dueDate: string | null;
  status: 'DRAFT' | 'RECEIVED' | 'CANCELLED';
  subtotal: number;
  taxTotal: number;
  total: number;
  paidAmount: number;
  balanceDue: number;
  supplier: {
    id: string;
    name: string;
    phone: string;
    gstin: string | null;
  };
  items: {
    id: string;
    description: string;
    quantity: number;
    purchaseRate: number;
    lineTotal: number;
  }[];
}

function PurchasesContent() {
  const toast = useToast();
  const { isAllowed } = useEntitlements();
  const canManagePurchases = isAllowed('canManagePurchases');

  const [purchases, setPurchases] = useState<PurchaseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'RECEIVED' | 'CANCELLED'>(
    'ALL'
  );

  // Void Modal
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [voidPurchaseId, setVoidPurchaseId] = useState<string>('');
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  const fetchPurchases = useCallback(async () => {
    if (!canManagePurchases) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('query', search.trim());
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const res = await fetch(`/api/purchases?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch purchases.');
      }
      setPurchases(data.purchases || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching purchases');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  const handleMarkReceived = async (purchaseId: string) => {
    if (
      !confirm(
        'Confirm receiving these goods? This will atomically increment stock and record auditable stock movements.'
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/purchases/${purchaseId}/receive`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to receive purchase.');
      }
      toast.success('Goods received successfully. Inventory has been updated.');
      fetchPurchases();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error receiving purchase');
    }
  };

  const handleVoidPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidPurchaseId || !voidReason.trim()) return;

    setVoiding(true);
    try {
      const res = await fetch(`/api/purchases/${voidPurchaseId}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: voidReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to void purchase.');
      }
      setVoidModalOpen(false);
      setVoidPurchaseId('');
      setVoidReason('');
      toast.success('Purchase cancelled successfully.');
      fetchPurchases();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error voiding purchase');
    } finally {
      setVoiding(false);
    }
  };

  // Metrics
  const receivedPurchases = purchases.filter((p) => p.status === 'RECEIVED');
  const totalReceivedValue = receivedPurchases.reduce((sum, p) => sum + p.total, 0);
  const totalBalanceDue = receivedPurchases.reduce((sum, p) => sum + p.balanceDue, 0);
  const draftCount = purchases.filter((p) => p.status === 'DRAFT').length;

  if (!canManagePurchases) {
    return (
      <FeatureNotAvailable
        featureName="Purchases & Vendor Inward Bills"
        requiredPlanName="Growth or Scale"
        description="Inward supplier purchases, vendor bills, and inventory receiving require a Pakka Chittha Growth or Scale subscription."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <ShoppingBag className="w-3.5 h-3.5" />
              Inward Supply
            </span>
            <span className="text-xs text-slate-400 font-mono">Purchase Ledger</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Purchases & Inward Bills</h1>
          <p className="text-sm text-slate-500">
            Record supplier bills, verify input tax credit (ITC), and receive inventory.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/suppliers"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl shadow-2xs transition-colors"
          >
            <Users className="w-4 h-4 text-slate-500" />
            Vendor Khata
          </Link>

          <Link
            href="/purchases/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            Record Purchase Bill
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">Total Received Purchases</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            ₹{totalReceivedValue.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-emerald-600 mt-1 block">
            {receivedPurchases.length} finalized bills
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">Pending Vendor Payables</span>
          <div className="text-2xl font-extrabold text-rose-700 mt-1">
            ₹{totalBalanceDue.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-rose-600 mt-1 block">Outstanding across received bills</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">Draft Purchase Orders</span>
          <div className="text-2xl font-extrabold text-amber-700 mt-1">{draftCount}</div>
          <span className="text-[11px] text-amber-600 mt-1 block">
            Pending goods arrival confirmation
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by purchase #, supplier name, vendor bill #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchPurchases}
              title="Refresh Purchases"
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-slate-400 text-[11px] font-semibold uppercase mr-1">Status:</span>
          {(['ALL', 'RECEIVED', 'DRAFT', 'CANCELLED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
            Loading purchases ledger...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-xs">
            <AlertCircle className="w-5 h-5 mx-auto mb-1 text-rose-500" />
            {error}
          </div>
        ) : purchases.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No purchases found</p>
            <p className="text-slate-400 mt-1">Record inward bills or supplier purchase orders.</p>
            <Link
              href="/purchases/new"
              className="mt-4 inline-block px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
            >
              + Record Purchase Bill
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Purchase #</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Vendor Bill #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Tax (ITC)</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Paid / Balance</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {purchases.map((p) => {
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <Link href={`/purchases/${p.id}`} className="hover:text-blue-600">
                          {p.purchaseNumber}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        <Link href={`/suppliers/${p.supplier.id}`} className="hover:underline">
                          {p.supplier.name}
                        </Link>
                        {p.supplier.gstin && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            GSTIN: {p.supplier.gstin}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {p.supplierInvoiceNumber || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(p.purchaseDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-emerald-700 font-medium">
                        ₹{p.taxTotal.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">
                        ₹{p.total.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-700">
                          Paid: ₹{p.paidAmount.toLocaleString('en-IN')}
                        </div>
                        {p.balanceDue > 0 ? (
                          <div className="text-[11px] font-bold text-rose-700">
                            Due: ₹{p.balanceDue.toLocaleString('en-IN')}
                          </div>
                        ) : (
                          <div className="text-[10px] font-semibold text-emerald-600">Paid Full</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                            p.status === 'RECEIVED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : p.status === 'DRAFT'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {p.status === 'RECEIVED' && <CheckCircle2 className="w-3 h-3" />}
                          {p.status === 'DRAFT' && <Clock className="w-3 h-3" />}
                          {p.status === 'CANCELLED' && <XCircle className="w-3 h-3" />}
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {p.status === 'DRAFT' && (
                            <button
                              onClick={() => handleMarkReceived(p.id)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-semibold"
                            >
                              Receive
                            </button>
                          )}
                          <Link
                            href={`/purchases/${p.id}`}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
                            title="View Purchase Bill"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          {p.status !== 'CANCELLED' && (
                            <button
                              onClick={() => {
                                setVoidPurchaseId(p.id);
                                setVoidReason('');
                                setVoidModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors"
                              title="Void Purchase"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Void Modal */}
      {voidModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-base text-rose-700">Cancel Purchase Bill</h3>
                <p className="text-xs text-slate-500">Reverses stock if already received</p>
              </div>
              <button
                onClick={() => setVoidModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVoidPurchase} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Cancellation Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Returned damaged shipment / Bill duplicate"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setVoidModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={voiding}
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-500 disabled:opacity-50"
                >
                  {voiding ? 'Voiding...' : 'Confirm Void'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PurchasesPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-slate-400 text-xs">Loading purchases ledger...</div>}
    >
      <PurchasesContent />
    </Suspense>
  );
}
