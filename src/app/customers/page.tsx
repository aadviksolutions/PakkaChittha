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
  MessageSquare,
  Edit2,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useEntitlements } from '@/hooks/useEntitlements';
import { FeatureNotAvailable } from '@/components/shared/FeatureNotAvailable';
import { GstFetchBox } from '@/components/gst/GstFetchBox';
import { WhatsAppReminderModal, WhatsAppReminderTarget } from '@/components/free-khata/WhatsAppReminderModal';
import { DuplicateMobileWarningModal, DuplicatePartyItem } from '@/components/shared/DuplicateMobileWarningModal';

interface CustomerSummary {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  billingAddress: string | null;
  gstin: string | null;
  openingBalance: number;
  notes?: string | null;
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

  // Add / Edit customer modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null);
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waTarget, setWaTarget] = useState<WhatsAppReminderTarget | null>(null);
  const [creating, setCreating] = useState(false);
  const [duplicateWarningOpen, setDuplicateWarningOpen] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicatePartyItem[]>([]);
  const [bypassDuplicatePhone, setBypassDuplicatePhone] = useState<string | null>(null);
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

  const resetCustomerForm = () => {
    setEditingCustomerId(null);
    setDuplicateWarningOpen(false);
    setBypassDuplicatePhone(null);
    setFormData({
      name: '',
      mobile: '',
      email: '',
      gstin: '',
      billingAddress: '',
      openingBalance: '0',
      notes: '',
    });
  };

  const handleOpenAddModal = () => {
    resetCustomerForm();
    setModalOpen(true);
  };

  const handleOpenEditCustomer = (c: CustomerSummary) => {
    setEditingCustomerId(c.id);
    setFormData({
      name: c.name || '',
      mobile: c.mobile || '',
      email: c.email || '',
      gstin: c.gstin || '',
      billingAddress: c.billingAddress || '',
      openingBalance: String(c.openingBalance ?? 0),
      notes: c.notes || '',
    });
    setModalOpen(true);
  };

  const handleDeleteCustomer = async (c: CustomerSummary) => {
    if (!confirm(`Delete customer "${c.name}"? Customers with existing bills, payments, or quotations cannot be deleted until those records are removed.`)) {
      return;
    }

    setDeletingCustomerId(c.id);
    try {
      const res = await fetch(`/api/customers/${c.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete customer');
      }
      toast.success(data.message || `Customer ${c.name} deleted.`);
      fetchCustomers(search);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete customer');
    } finally {
      setDeletingCustomerId(null);
    }
  };

  const handleCreateCustomer = async (e?: React.FormEvent, forceBypass = false) => {
    if (e) e.preventDefault();
    setError(null);

    const phoneToTest = formData.mobile?.trim();

    // Check duplicate phone if not already confirmed/bypassed
    if (!forceBypass && phoneToTest && phoneToTest !== bypassDuplicatePhone && phoneToTest.length >= 7) {
      try {
        const checkRes = await fetch(
          `/api/party/check-duplicate-phone?phone=${encodeURIComponent(phoneToTest)}&excludeId=${editingCustomerId || ''}&excludeType=CUSTOMER`
        );
        const checkData = await checkRes.json();
        if (checkData.hasDuplicate && checkData.matches?.length > 0) {
          setDuplicateMatches(checkData.matches);
          setDuplicateWarningOpen(true);
          return;
        }
      } catch (checkErr) {
        console.warn('Duplicate phone check non-blocking error:', checkErr);
      }
    }

    setCreating(true);

    try {
      const isEditing = Boolean(editingCustomerId);
      const res = await fetch(isEditing ? `/api/customers/${editingCustomerId}` : '/api/customers', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          openingBalance: parseFloat(formData.openingBalance) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to ${isEditing ? 'update' : 'create'} customer`);
      }

      toast.success(
        isEditing
          ? `Customer ${data.customer.name} updated successfully!`
          : `Customer ${data.customer.name} registered successfully!`
      );
      setModalOpen(false);
      setDuplicateWarningOpen(false);
      setBypassDuplicatePhone(null);
      resetCustomerForm();
      fetchCustomers(search);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save customer';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E1E7EF]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-[#173653] tracking-tight">
              Customers & Udhaar Khata
            </h1>
            <span className="text-[11px] font-semibold text-[#006B2B] bg-[#E8F7ED] border border-[#B8E6C7] px-2.5 py-0.5 rounded-full">
              {activeBusiness?.name || 'Workspace'}
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Credit ledger, customer balances, contact profiles, and WhatsApp statements.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-1.5 bg-[#173653] hover:bg-[#102A43] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-all self-start sm:self-auto cursor-pointer min-h-[44px]"
        >
          <UserPlus className="w-3.5 h-3.5 text-[#2878CE]" />
          <span>+ Add Customer</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-[#E1E7EF] shadow-2xs">
          <span className="text-[11px] uppercase font-bold tracking-wider text-[#64748B] block mb-1">
            Total Customers
          </span>
          <p className="text-xl font-bold font-mono text-[#173653]">{customers.length}</p>
          <p className="text-[11px] text-[#64748B] mt-0.5">Active ledger accounts</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#FFCCD2] bg-gradient-to-br from-white to-[#FFF0F0]/30 shadow-2xs">
          <span className="text-[11px] uppercase font-bold tracking-wider text-[#B80012] block mb-1">
            Total Outstanding (Udhaar)
          </span>
          <p className="text-xl font-bold font-mono text-[#E00016] tabular-nums">
            ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-[#B80012] mt-0.5">{partiesWithBalance} parties have balance due</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#B8E6C7] bg-gradient-to-br from-white to-[#E8F7ED]/30 shadow-2xs">
          <span className="text-[11px] uppercase font-bold tracking-wider text-[#006B2B] block mb-1">
            Settled Accounts
          </span>
          <p className="text-xl font-bold font-mono text-[#008A36]">
            {customers.length - partiesWithBalance}
          </p>
          <p className="text-[11px] text-[#006B2B] mt-0.5">Zero balance / fully paid</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-[#E1E7EF] shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, mobile or GSTIN..."
            className="w-full pl-8 pr-4 py-2 text-xs bg-[#F8FAFC] border border-[#E1E7EF] rounded-lg text-[#172B4D] placeholder-[#64748B] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#2878CE] transition-all"
          />
        </div>

        <span className="text-[11px] text-[#64748B] self-start sm:self-auto font-medium">
          Showing {customers.length} customer records
        </span>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-[#FFF0F0] border border-[#FFCCD2] text-[#B80012] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#E00016] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Customers Data Table */}
      <div className="bg-white border border-[#E1E7EF] rounded-xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#64748B]">
            <div className="w-5 h-5 border-2 border-[#173653] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading customer khata records...
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#64748B] space-y-3">
            <div className="w-10 h-10 bg-[#F8FAFC] border border-[#E1E7EF] rounded-xl flex items-center justify-center text-[#64748B] mx-auto">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-[#172B4D] text-sm">No customers registered yet</p>
              <p className="text-[#64748B] text-xs mt-0.5">
                {search ? 'No matches found for your search.' : 'Add your first party to track bills and udhaar.'}
              </p>
            </div>
            {!search && (
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#173653] text-white rounded-xl text-xs font-semibold hover:bg-[#102A43] transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-[#2878CE]" />
                <span>Add First Customer</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E1E7EF] text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                  <th className="py-2.5 px-4">Party / Customer</th>
                  <th className="py-2.5 px-4">Mobile & GSTIN</th>
                  <th className="py-2.5 px-4 text-right">Invoices</th>
                  <th className="py-2.5 px-4 text-right">Total Invoiced</th>
                  <th className="py-2.5 px-4 text-right">Outstanding Udhaar</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E7EF] font-sans">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F8FAFC] transition-colors group">
                    <td className="py-2.5 px-4">
                      <Link
                        href={`/customers/${c.id}`}
                        className="font-semibold text-[#173653] hover:text-[#2878CE] hover:underline block truncate max-w-xs"
                      >
                        {c.name}
                      </Link>
                      {c.billingAddress && (
                        <span className="text-[11px] text-[#64748B] truncate block max-w-xs">
                          {c.billingAddress}
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-4">
                      <div className="font-mono text-[#172B4D]">{c.mobile}</div>
                      {c.gstin ? (
                        <span className="font-mono text-[10px] bg-[#F8FAFC] text-[#172B4D] px-1.5 py-0.5 rounded border border-[#E1E7EF]">
                          {c.gstin}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#64748B]">Retail / Unregistered</span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono text-[#172B4D] tabular-nums">
                      {c.invoiceCount} bills
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono font-medium text-[#172B4D] tabular-nums">
                      ₹{c.invoiceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono font-bold tabular-nums">
                      {c.totalOutstanding > 0 ? (
                        <span className="text-[#B80012] bg-[#FFF0F0] px-2.5 py-0.5 rounded-full border border-[#FFCCD2]">
                          ₹{c.totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-[#64748B] font-normal">₹0.00</span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {c.totalOutstanding > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setWaTarget({
                                contactId: c.id,
                                contactName: c.name,
                                phone: c.mobile,
                                amount: c.totalOutstanding,
                                date: new Date().toISOString(),
                                type: 'GAVE',
                              });
                              setWaModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold text-[#006B2B] bg-[#E8F7ED] hover:bg-emerald-100 border border-[#B8E6C7] rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Send WhatsApp Payment Reminder"
                          >
                            <MessageSquare className="w-3 h-3 text-[#008A36]" />
                            <span>तगादा (Reminder)</span>
                          </button>
                        )}
                        <Link
                          href={`/invoices/new?customerId=${c.id}`}
                          className="px-2.5 py-1 text-[11px] font-semibold text-[#172B4D] hover:text-[#173653] bg-[#F8FAFC] hover:bg-[#E1E7EF] border border-[#E1E7EF] rounded-lg transition-colors"
                          title="Create invoice for customer"
                        >
                          + Bill
                        </Link>
                        <Link
                          href={`/customers/${c.id}`}
                          className="px-2.5 py-1 text-[11px] font-semibold text-[#2878CE] bg-[#E8F2FC] hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                        >
                          Khata Ledger
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleOpenEditCustomer(c)}
                          className="p-1.5 rounded-lg border border-[#E1E7EF] text-[#64748B] hover:text-[#2878CE] hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomer(c)}
                          disabled={deletingCustomerId === c.id}
                          className="p-1.5 rounded-lg border border-[#E1E7EF] text-[#64748B] hover:text-[#E00016] hover:bg-[#FFF0F0] transition-colors disabled:opacity-40 cursor-pointer"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Customer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#102A43]/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-[#E1E7EF] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E1E7EF] bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#2878CE]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#173653]">
                  {editingCustomerId ? 'Edit Customer / Party' : 'Add Customer / Party'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-md text-[#64748B] hover:text-[#173653] hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-5 space-y-3.5 text-xs">
              {/* Phone Contacts Import Option */}
              <div className="flex items-center justify-between pb-2 border-b border-[#E1E7EF]">
                <span className="text-[11px] text-[#64748B] font-medium">Quick contact import:</span>
                <button
                  type="button"
                  onClick={handleImportContact}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E8F7ED] hover:bg-emerald-100 text-[#006B2B] border border-[#B8E6C7] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5 text-[#008A36]" />
                  <span>Choose from Contacts</span>
                </button>
              </div>

              {/* GSTIN Auto-Fetch Section */}
              <GstFetchBox
                gstin={formData.gstin}
                onGstinChange={(val) => setFormData((prev) => ({ ...prev, gstin: val }))}
                onDetailsFetched={(details) => {
                  setFormData((prev) => ({
                    ...prev,
                    gstin: details.gstin,
                    name: prev.name ? prev.name : (details.tradeName || details.legalName),
                    billingAddress: prev.billingAddress ? prev.billingAddress : details.address,
                  }));
                  toast.success(`GST details fetched for ${details.tradeName || details.legalName}! Review before saving.`);
                }}
              />

              <div>
                <label className="block font-semibold text-[#172B4D] mb-1">
                  Customer / Trade Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Goyal Building Supplies"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#E1E7EF] rounded-xl text-[#172B4D] focus:outline-none focus:ring-2 focus:ring-[#2878CE]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172B4D] mb-1">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#E1E7EF] rounded-xl text-[#172B4D] font-mono focus:outline-none focus:ring-2 focus:ring-[#2878CE]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#172B4D] mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="billing@goyal.in"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E1E7EF] rounded-xl text-[#172B4D] focus:outline-none focus:ring-2 focus:ring-[#2878CE]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#172B4D] mb-1">
                    Opening Balance (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.openingBalance}
                    onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E1E7EF] rounded-xl text-[#172B4D] font-mono focus:outline-none focus:ring-2 focus:ring-[#2878CE]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#172B4D] mb-1">Billing Address</label>
                <textarea
                  rows={2}
                  placeholder="Shop / Office address, City, State..."
                  value={formData.billingAddress}
                  onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#E1E7EF] rounded-xl text-[#172B4D] focus:outline-none focus:ring-2 focus:ring-[#2878CE]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E1E7EF]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-[#E1E7EF] rounded-xl text-[#64748B] font-semibold hover:bg-[#F8FAFC] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-[#173653] hover:bg-[#102A43] text-white font-semibold rounded-xl disabled:opacity-50 cursor-pointer min-h-[44px]"
                >
                  {creating ? 'Saving...' : editingCustomerId ? 'Save Changes' : 'Register Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {waModalOpen && waTarget && (
        <WhatsAppReminderModal
          isOpen={waModalOpen}
          onClose={() => {
            setWaModalOpen(false);
            setWaTarget(null);
          }}
          target={waTarget}
        />
      )}

      <DuplicateMobileWarningModal
        isOpen={duplicateWarningOpen}
        phone={formData.mobile}
        matches={duplicateMatches}
        onConfirm={() => {
          setBypassDuplicatePhone(formData.mobile);
          setDuplicateWarningOpen(false);
          handleCreateCustomer(undefined, true);
        }}
        onCancel={() => {
          setDuplicateWarningOpen(false);
        }}
      />
    </div>
  );
}
