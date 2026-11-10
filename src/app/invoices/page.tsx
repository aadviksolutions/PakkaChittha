'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  PlusCircle,
  Printer,
  CreditCard,
  Ban,
  ArrowRight,
  AlertCircle,
  Calendar,
  X,
  Filter,
  CheckCircle2,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useEntitlements } from '@/hooks/useEntitlements';
import { FeatureNotAvailable } from '@/components/shared/FeatureNotAvailable';
import { WhatsAppShareModal } from '@/components/whatsapp/WhatsAppShareModal';

interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  customerName: string;
  customerMobile: string;
  total: number;
  paidAmount: number;
  balanceDue: number;
  status: 'DRAFT' | 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  customer: {
    id: string;
    name: string;
    mobile: string;
  };
}

export default function InvoicesPage() {
  const { activeBusiness } = useAuth();
  const { toast } = useToast();
  const { canAccessCommercial } = useEntitlements();
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [error, setError] = useState<string | null>(null);

  // Void modal state
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceListItem | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<InvoiceListItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentRef, setPaymentRef] = useState('');
  const [paying, setPaying] = useState(false);
  const [selectedInvoiceForShare, setSelectedInvoiceForShare] = useState<InvoiceListItem | null>(null);

  const fetchInvoices = useCallback(async () => {
    if (!canAccessCommercial) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const url = `/api/invoices${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        setInvoices(data.invoices);
      } else {
        throw new Error(data.error || 'Failed to fetch invoices');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching invoices');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleVoidInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setVoiding(true);

    try {
      const res = await fetch(`/api/invoices/${selectedInvoice.id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: voidReason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to void invoice');
      }
      toast.success(`Invoice ${selectedInvoice.invoiceNumber} cancelled`);
      setVoidModalOpen(false);
      setSelectedInvoice(null);
      setVoidReason('');
      fetchInvoices();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error cancelling invoice');
    } finally {
      setVoiding(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoice) return;
    setPaying(true);

    try {
      const res = await fetch(`/api/invoices/${paymentInvoice.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(paymentAmount),
          paymentMethod,
          referenceNumber: paymentRef,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record payment');
      }
      toast.success(`Payment of ₹${paymentAmount} recorded successfully!`);
      setPaymentModalOpen(false);
      setPaymentInvoice(null);
      setPaymentAmount('');
      setPaymentRef('');
      fetchInvoices();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setPaying(false);
    }
  };

  // KPI Calculations
  const nonCancelledInvoices = invoices.filter((i) => i.status !== 'CANCELLED');
  const totalBilled = nonCancelledInvoices.reduce((acc, i) => acc + i.total, 0);
  const totalPaid = nonCancelledInvoices.reduce((acc, i) => acc + i.paidAmount, 0);
  const totalBalanceDue = nonCancelledInvoices.reduce((acc, i) => acc + i.balanceDue, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Paid
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            <Clock className="w-3 h-3 text-amber-600" />
            Partial
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            Overdue
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            Void
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
            <Clock className="w-3 h-3 text-slate-500" />
            Unpaid
          </span>
        );
    }
  };

  if (!canAccessCommercial) {
    return (
      <FeatureNotAvailable
        featureName="Business Invoicing & Sales Billing"
        requiredPlanName="Starter, Growth or Scale"
        description="Business GST and retail invoicing are commercial features available on Starter, Growth, and Scale plans. For personal lending and borrowing records, please use Free Khata."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Invoices & Billing History
            </h1>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.2 rounded-full">
              {activeBusiness?.name || 'Workspace'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            GST-compliant invoices, payment recording, and A4 printable bills.
          </p>
        </div>

        <Link
          href="/invoices/new"
          className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-2xs hover:shadow-xs transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>+ Create Tax Invoice</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
            Total Invoiced
          </span>
          <p className="text-xl font-bold font-mono text-slate-900 tabular-nums">
            ₹{totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">All generated invoices</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-700 block mb-1">
            Collected Revenue
          </span>
          <p className="text-xl font-bold font-mono text-emerald-800 tabular-nums">
            ₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-600 mt-0.5">Settled via Cash / UPI</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200/90 shadow-2xs">
          <span className="text-[11px] uppercase font-bold tracking-wider text-amber-800 block mb-1">
            Outstanding Udhaar
          </span>
          <p className="text-xl font-bold font-mono text-amber-800 tabular-nums">
            ₹{totalBalanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5">Pending collection</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
            Total Bills
          </span>
          <p className="text-xl font-bold font-mono text-slate-900">{invoices.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Records in register</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice # or customer name..."
            className="w-full pl-8 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-900 transition-all"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto text-xs">
          <span className="text-[11px] text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Status:
          </span>
          {['ALL', 'UNPAID', 'PARTIAL', 'PAID', 'CANCELLED'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                statusFilter === s
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Invoices Table */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading invoices and billing history...
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 mx-auto">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">No invoices found</p>
              <p className="text-slate-400 text-xs mt-0.5">
                {search || statusFilter !== 'ALL'
                  ? 'Try adjusting your search query or filters.'
                  : 'Generate your first bill for this business.'}
              </p>
            </div>
            <Link
              href="/invoices/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Create Invoice</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-4">Invoice #</th>
                  <th className="py-2.5 px-4">Party / Customer</th>
                  <th className="py-2.5 px-4">Date & Due</th>
                  <th className="py-2.5 px-4 text-right">Total (₹)</th>
                  <th className="py-2.5 px-4 text-right">Paid (₹)</th>
                  <th className="py-2.5 px-4 text-right">Balance Due</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="py-2.5 px-4">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="font-mono font-bold text-slate-900 hover:text-emerald-700 hover:underline block"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>

                    <td className="py-2.5 px-4">
                      <Link
                        href={`/customers/${inv.customer.id}`}
                        className="font-semibold text-slate-800 hover:text-emerald-700 hover:underline block truncate max-w-[180px]"
                      >
                        {inv.customerName}
                      </Link>
                      <span className="font-mono text-[11px] text-slate-400">{inv.customerMobile}</span>
                    </td>

                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <div className="text-slate-800">
                        {new Date(inv.invoiceDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Due: {new Date(inv.dueDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </div>
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      ₹{inv.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono font-medium text-emerald-700 tabular-nums">
                      ₹{inv.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono font-bold tabular-nums">
                      {inv.balanceDue > 0 && inv.status !== 'CANCELLED' ? (
                        <span className="text-amber-800">
                          ₹{inv.balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">₹0.00</span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 text-center">
                      {getStatusBadge(inv.status)}
                    </td>

                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/invoices/${inv.id}/print`}
                          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                          title="Print A4"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </Link>

                        <button
                          type="button"
                          onClick={() => setSelectedInvoiceForShare(inv)}
                          className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                          title="Send to WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>

                        {inv.balanceDue > 0 && inv.status !== 'CANCELLED' && (
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentInvoice(inv);
                              setPaymentAmount(inv.balanceDue.toString());
                              setPaymentModalOpen(true);
                            }}
                            className="px-2 py-0.5 text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                            title="Record Payment"
                          >
                            Pay
                          </button>
                        )}

                        {inv.status !== 'CANCELLED' && inv.paidAmount === 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setVoidModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Cancel / Void Invoice"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <Link
                          href={`/invoices/${inv.id}`}
                          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                          title="View Invoice"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
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

      {/* Record Payment Modal */}
      {paymentModalOpen && paymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Record Payment for {paymentInvoice.invoiceNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Customer:</span>
                  <span className="font-semibold text-slate-900">{paymentInvoice.customerName}</span>
                </div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Total Amount:</span>
                  <span className="font-mono">₹{paymentInvoice.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-800 font-semibold">
                  <span>Balance Due:</span>
                  <span className="font-mono">₹{paymentInvoice.balanceDue.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount to Collect (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  max={paymentInvoice.balanceDue}
                  min="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reference / UTR Number</label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref / Cheque No"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paying}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg disabled:opacity-50"
                >
                  {paying ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel / Void Modal */}
      {voidModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-rose-50/50">
              <div className="flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-950">
                  Cancel Invoice {selectedInvoice.invoiceNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVoidModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleVoidInvoice} className="p-5 space-y-3.5 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Cancelling this invoice will void the balance due of{' '}
                <strong className="font-mono">₹{selectedInvoice.total.toFixed(2)}</strong> and reverse any inventory deductions.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Cancellation *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Order cancelled by buyer or incorrect items..."
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setVoidModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Keep Invoice
                </button>
                <button
                  type="submit"
                  disabled={voiding}
                  className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded-lg disabled:opacity-50"
                >
                  {voiding ? 'Cancelling...' : 'Confirm Void'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* WhatsApp Share Modal for Invoice */}
      {selectedInvoiceForShare && (
        <WhatsAppShareModal
          isOpen={true}
          onClose={() => setSelectedInvoiceForShare(null)}
          customerName={selectedInvoiceForShare.customerName}
          customerPhone={selectedInvoiceForShare.customerMobile}
          invoiceNumber={selectedInvoiceForShare.invoiceNumber}
          invoiceId={selectedInvoiceForShare.id}
          invoiceTotal={selectedInvoiceForShare.total}
          balanceDue={selectedInvoiceForShare.balanceDue}
          dueDate={selectedInvoiceForShare.dueDate}
          shareType="INVOICE"
        />
      )}
    </div>
  );
}
