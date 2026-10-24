'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  UserPlus,
  ArrowRight,
  Receipt,
  AlertCircle,
  X,
  Phone,
  Building,
  CreditCard,
  FileText,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useEntitlements } from '@/hooks/useEntitlements';
import { FeatureNotAvailable } from '@/components/shared/FeatureNotAvailable';

interface CustomerSummary {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  billingAddress: string | null;
  gstin: string | null;
  openingBalance: number;
  invoiceCount: number;
  invoiceTotal: number;
  totalOutstanding: number;
  createdAt: string;
}

export default function CustomersPage() {
  const { activeBusiness } = useAuth();
  const { toast } = useToast();
  const { canAccessCommercial } = useEntitlements();
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Add customer modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    gstin: '',
    billingAddress: '',
    openingBalance: '0',
    notes: '',
  });

  const fetchCustomers = useCallback(async (query = '') => {
    if (!canAccessCommercial) return;
    setLoading(true);
    setError(null);
    try {
      const url = query ? `/api/customers?search=${encodeURIComponent(query)}` : '/api/customers';
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        setCustomers(data.customers);
      } else {
        throw new Error(data.error || 'Failed to load customers');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers(search);
  }, [fetchCustomers, search]);

  const handleImportContact = async () => {
    if (typeof window !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window) {
      try {
        const contacts = await (navigator as any).contacts.select(['name', 'tel', 'email'], {
          multiple: false,
        });
        if (contacts && contacts[0]) {
          const c = contacts[0];
          const rawName = c.name?.[0] || '';
          const rawPhone = (c.tel?.[0] || '').replace(/\D/g, '').slice(-10);
          const rawEmail = c.email?.[0] || '';

          if (rawPhone) {
            const exists = customers.some(
              (cust) => cust.mobile && cust.mobile.replace(/\D/g, '').slice(-10) === rawPhone
            );
            if (exists) {
              toast.error(`A customer with mobile ${rawPhone} is already registered.`);
            }
          }

          setFormData((prev) => ({
            ...prev,
            name: rawName || prev.name,
            mobile: rawPhone || prev.mobile,
            email: rawEmail || prev.email,
          }));
          toast.success('Contact details populated! Review before saving.');
        }
      } catch (err: unknown) {
        console.warn('Contact picker cancelled or unavailable:', err);
      }
    } else {
      alert(
        'Phone Contacts Picker is supported on Chrome & Edge on Android or supported mobile browsers. On desktop, please enter contact details manually.'
      );
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          openingBalance: parseFloat(formData.openingBalance) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create customer');
      }

      toast.success(`Customer ${data.customer.name} registered successfully!`);
      setModalOpen(false);
      setFormData({
        name: '',
        mobile: '',
        email: '',
        gstin: '',
        billingAddress: '',
        openingBalance: '0',
        notes: '',
      });
      fetchCustomers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to register customer';
      setError(msg);
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const totalOutstanding = customers.reduce((acc, c) => acc + c.totalOutstanding, 0);
  const partiesWithBalance = customers.filter((c) => c.totalOutstanding > 0).length;

  if (!canAccessCommercial) {
    return (
      <FeatureNotAvailable
        featureName="Commercial Customers & Udhaar"
        requiredPlanName="Starter, Growth or Scale"
        description="Business customer directories, GST accounts, and credit limits are commercial features. For personal contacts and lending ledgers, please use Free Khata."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Customers & Udhaar Khata
            </h1>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.2 rounded-full">
              {activeBusiness?.name || 'Workspace'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Credit ledger, customer balances, contact profiles, and WhatsApp statements.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-2xs hover:shadow-xs transition-all self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
          <span>+ Add Customer</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
            Total Customers
          </span>
          <p className="text-xl font-bold font-mono text-slate-900">{customers.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Active ledger accounts</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200/90 shadow-2xs">
          <span className="text-[11px] uppercase font-bold tracking-wider text-amber-800 block mb-1">
            Total Outstanding (Udhaar)
          </span>
          <p className="text-xl font-bold font-mono text-amber-800 tabular-nums">
            ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5">{partiesWithBalance} parties have balance due</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
            Settled Accounts
          </span>
          <p className="text-xl font-bold font-mono text-slate-900">
            {customers.length - partiesWithBalance}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Zero balance / fully paid</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, mobile or GSTIN..."
            className="w-full pl-8 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-900 transition-all"
          />
        </div>

        <span className="text-[11px] text-slate-500 self-start sm:self-auto">
          Showing {customers.length} customer records
        </span>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Customers Data Table */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading customer khata records...
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 mx-auto">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">No customers registered yet</p>
              <p className="text-slate-400 text-xs mt-0.5">
                {search ? 'No matches found for your search.' : 'Add your first party to track bills and udhaar.'}
              </p>
            </div>
            {!search && (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Add First Customer</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-4">Party / Customer</th>
                  <th className="py-2.5 px-4">Mobile & GSTIN</th>
                  <th className="py-2.5 px-4 text-right">Invoices</th>
                  <th className="py-2.5 px-4 text-right">Total Invoiced</th>
                  <th className="py-2.5 px-4 text-right">Outstanding Udhaar</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="py-2.5 px-4">
                      <Link
                        href={`/customers/${c.id}`}
                        className="font-semibold text-slate-900 hover:text-emerald-700 hover:underline block truncate max-w-xs"
                      >
                        {c.name}
                      </Link>
                      {c.billingAddress && (
                        <span className="text-[11px] text-slate-400 truncate block max-w-xs">
                          {c.billingAddress}
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-4">
                      <div className="font-mono text-slate-800">{c.mobile}</div>
                      {c.gstin ? (
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded border border-slate-200">
                          {c.gstin}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Retail / Unregistered</span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono text-slate-700 tabular-nums">
                      {c.invoiceCount} bills
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-700 tabular-nums">
                      ₹{c.invoiceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono font-bold tabular-nums">
                      {c.totalOutstanding > 0 ? (
                        <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          ₹{c.totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">₹0.00</span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          href={`/invoices/new?customerId=${c.id}`}
                          className="px-2 py-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                          title="Create invoice for customer"
                        >
                          + Bill
                        </Link>
                        <Link
                          href={`/customers/${c.id}`}
                          className="px-2 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors"
                        >
                          Khata Ledger
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Add Customer / Party</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-5 space-y-3.5 text-xs">
              {/* Phone Contacts Import Option */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-[11px] text-slate-500 font-medium">Quick contact import:</span>
                <button
                  type="button"
                  onClick={handleImportContact}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Choose from Contacts</span>
                </button>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Customer / Trade Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Goyal Building Supplies"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="22AAAAA0000A1Z5"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono uppercase focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="billing@goyal.in"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Opening Balance (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.openingBalance}
                    onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Billing Address</label>
                <textarea
                  rows={2}
                  placeholder="Shop / Office address, City, State..."
                  value={formData.billingAddress}
                  onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  {creating ? 'Saving...' : 'Register Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
