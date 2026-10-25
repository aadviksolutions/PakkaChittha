'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import {
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  Building,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  X,
  ExternalLink,
  ChevronRight,
  ShoppingBag,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useEntitlements } from '@/hooks/useEntitlements';
import { FeatureNotAvailable } from '@/components/shared/FeatureNotAvailable';
import { GstFetchBox } from '@/components/gst/GstFetchBox';

interface SupplierItem {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  gstin: string | null;
  openingBalance: number;
  notes: string | null;
  totalOutstanding: number;
  totalPurchasesAmount: number;
  totalPaidAmount: number;
  purchaseCount: number;
  lastPurchaseDate: string | null;
  createdAt: string;
}

function SuppliersContent() {
  const toast = useToast();
  const { isAllowed } = useEntitlements();
  const canManageSuppliers = isAllowed('canManageSuppliers');

  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Add Supplier Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    openingBalance: '0',
    notes: '',
  });

  const fetchSuppliers = useCallback(async () => {
    if (!canManageSuppliers) return;
    setLoading(true);
    setError(null);
    try {
      const url = search.trim()
        ? `/api/suppliers?query=${encodeURIComponent(search.trim())}`
        : '/api/suppliers';
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch suppliers.');
      }
      setSuppliers(data.suppliers || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching suppliers');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.phone.trim()) return;

    setCreating(true);
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name,
          phone: addForm.phone,
          email: addForm.email || null,
          address: addForm.address || null,
          gstin: addForm.gstin || null,
          openingBalance: parseFloat(addForm.openingBalance) || 0,
          notes: addForm.notes || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create supplier.');
      }

      setAddModalOpen(false);
      setAddForm({
        name: '',
        phone: '',
        email: '',
        address: '',
        gstin: '',
        openingBalance: '0',
        notes: '',
      });
      toast.success('Supplier created successfully');
      fetchSuppliers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error creating supplier');
    } finally {
      setCreating(false);
    }
  };

  const totalOutstandingAll = suppliers.reduce((sum, s) => sum + s.totalOutstanding, 0);
  const totalPurchasesAll = suppliers.reduce((sum, s) => sum + s.totalPurchasesAmount, 0);

  if (!canManageSuppliers) {
    return (
      <FeatureNotAvailable
        featureName="Suppliers & Vendor Management"
        requiredPlanName="Growth or Scale"
        description="Supplier directory, purchase orders, and vendor payable tracking require a Pakka Chittha Growth or Scale subscription."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Truck className="w-3.5 h-3.5" />
              Vendor Khata & Payables
            </span>
            <span className="text-xs text-slate-400 font-mono">Supplier Directory</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Suppliers & Vendors</h1>
          <p className="text-sm text-slate-500">
            Manage raw material distributors, track inward purchase bills and payables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/purchases"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl shadow-2xs transition-colors"
          >
            <ShoppingBag className="w-4 h-4 text-slate-500" />
            Purchase Bills
          </Link>
          <button
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            Add Supplier
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">Total Active Vendors</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {suppliers.length}{' '}
            <span className="text-xs font-normal text-slate-500 font-sans">suppliers</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Registered in workspace</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">Total Inward Supplies</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            ₹{totalPurchasesAll.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Gross received purchase value</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">Total Pending Payables</span>
          <div className="text-2xl font-extrabold text-rose-700 mt-1">
            ₹{totalOutstandingAll.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-rose-600 mt-1 block">Payable across all suppliers</span>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search suppliers by business name, phone, GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <button
          onClick={fetchSuppliers}
          title="Refresh List"
          className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-500" />
            Loading supplier directory...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-xs">
            <AlertCircle className="w-5 h-5 mx-auto mb-1 text-rose-500" />
            {error}
          </div>
        ) : suppliers.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No suppliers found</p>
            <p className="text-slate-400 mt-1">Register suppliers to track purchases and payables.</p>
            <button
              onClick={() => setAddModalOpen(true)}
              className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
            >
              + Register Supplier
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Supplier Name</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">GSTIN</th>
                  <th className="py-3 px-4">Inward Bills</th>
                  <th className="py-3 px-4">Total Purchases</th>
                  <th className="py-3 px-4">Total Paid</th>
                  <th className="py-3 px-4">Outstanding Balance</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {suppliers.map((s) => {
                  const hasPayable = s.totalOutstanding > 0;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/suppliers/${s.id}`}
                          className="font-bold text-slate-900 hover:text-emerald-600 transition-colors block"
                        >
                          {s.name}
                        </Link>
                        {s.address && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">
                            {s.address}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{s.phone}</span>
                        </div>
                        {s.email && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{s.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {s.gstin || '-'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {s.purchaseCount} bills
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        ₹{s.totalPurchasesAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-emerald-700">
                        ₹{s.totalPaidAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {hasPayable ? (
                          <div>
                            <span className="font-extrabold text-rose-700 text-sm">
                              ₹{s.totalOutstanding.toLocaleString('en-IN')}
                            </span>
                            <span className="block text-[10px] font-bold text-rose-600 uppercase">
                              Payable Due
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-bold text-emerald-700 text-sm">₹0.00</span>
                            <span className="block text-[10px] font-medium text-emerald-600 uppercase">
                              All Settled
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/suppliers/${s.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
                        >
                          <span>Ledger</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Supplier Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Add New Supplier</h3>
                <p className="text-xs text-slate-500">Record vendor contact & opening balance</p>
              </div>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-4 text-xs">
              {/* GSTIN Auto-Fetch Section */}
              <GstFetchBox
                gstin={addForm.gstin}
                onGstinChange={(val) => setAddForm((prev) => ({ ...prev, gstin: val }))}
                onDetailsFetched={(details) => {
                  setAddForm((prev) => ({
                    ...prev,
                    gstin: details.gstin,
                    name: prev.name ? prev.name : (details.tradeName || details.legalName),
                    address: prev.address ? prev.address : details.address,
                  }));
                  toast.success(`GST details fetched for ${details.tradeName || details.legalName}! Review before saving.`);
                }}
              />

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Supplier / Company Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ambuja Cements Dist. Delhi"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phone / Mobile <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9811122233"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="vendor@example.com"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Opening Balance (Payable Due)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={addForm.openingBalance}
                  onChange={(e) => setAddForm({ ...addForm, openingBalance: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address</label>
                <textarea
                  rows={2}
                  placeholder="Billing / godown address..."
                  value={addForm.address}
                  onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Credit term, bank details, delivery terms..."
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-50"
                >
                  {creating ? 'Saving...' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SuppliersPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-slate-400 text-xs">Loading supplier directory...</div>}
    >
      <SuppliersContent />
    </Suspense>
  );
}
