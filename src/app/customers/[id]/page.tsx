'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  PlusCircle,
  AlertCircle,
  FileText,
  Calendar,
  CheckCircle2,
  X,
  MessageSquare,
} from 'lucide-react';
import { WhatsAppShareModal } from '@/components/whatsapp/WhatsAppShareModal';
import { useToast } from '@/context/ToastContext';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  lineTotal: number;
}

interface CustomerInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  total: number;
  paidAmount: number;
  balanceDue: number;
  status: string;
  items: InvoiceItem[];
}

interface CustomerPayment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber: string | null;
  invoice: {
    invoiceNumber: string;
  };
}

interface CustomerDetail {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  billingAddress: string | null;
  gstin: string | null;
  openingBalance: number;
  notes: string | null;
  optedOutWhatsApp?: boolean;
  createdAt: string;
  totalOutstanding: number;
  invoiceTotal: number;
  invoicePaid: number;
  invoices: CustomerInvoice[];
  payments: CustomerPayment[];
}

function CustomerDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // WhatsApp states
  const [statementModalOpen, setStatementModalOpen] = useState(false);
  const [selectedInvoiceForShare, setSelectedInvoiceForShare] = useState<CustomerInvoice | null>(null);
  const [updatingOptOut, setUpdatingOptOut] = useState(false);

  // Record payment modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('UPI');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [paying, setPaying] = useState(false);

  const fetchCustomer = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setCustomer(data.customer);
      } else {
        throw new Error(data.error || 'Customer not found');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading customer details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId) {
      toast.error('Please select an invoice to apply this payment.');
      return;
    }
    setPaying(true);

    try {
      const res = await fetch(`/api/invoices/${selectedInvoiceId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(paymentAmount),
          paymentMethod,
          referenceNumber,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record payment');
      }

      toast.success(`Payment of ₹${paymentAmount} recorded successfully!`);
      setPaymentModalOpen(false);
      setPaymentAmount('');
      setReferenceNumber('');
      fetchCustomer();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setPaying(false);
    }
  };

  const handleToggleOptOut = async () => {
    if (!customer) return;
    const newOptOut = !customer.optedOutWhatsApp;
    setUpdatingOptOut(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optedOutWhatsApp: newOptOut }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCustomer((prev) => (prev ? { ...prev, optedOutWhatsApp: newOptOut } : null));
        toast.success(newOptOut ? 'Customer opted out from WhatsApp' : 'Customer WhatsApp reminders activated');
      } else {
        toast.error(data.error || 'Failed to update WhatsApp settings');
      }
    } catch {
      toast.error('Error updating WhatsApp settings');
    } finally {
      setUpdatingOptOut(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-500">
        <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading customer ledger & khata...
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error || 'Customer not found.'}</span>
        </div>
        <Link
          href="/customers"
          className="font-semibold text-rose-900 hover:underline flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Customers
        </Link>
      </div>
    );
  }

  const unpaidInvoices = customer.invoices.filter((i) => i.balanceDue > 0 && i.status !== 'CANCELLED');

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
              } else {
                router.push('/customers');
              }
            }}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Back to previous screen"
            aria-label="Back to previous screen"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {customer.name}
              </h1>
              {customer.gstin ? (
                <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-2 py-0.2 rounded border border-slate-200">
                  GST: {customer.gstin}
                </span>
              ) : (
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.2 rounded">
                  Retail / B2C
                </span>
              )}
              {customer.optedOutWhatsApp ? (
                <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.2 rounded font-medium">
                  WhatsApp Opted-Out
                </span>
              ) : (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.2 rounded font-medium">
                  WhatsApp Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Phone: <span className="font-mono font-medium text-slate-800">{customer.mobile}</span>
              {customer.email && ` • Email: ${customer.email}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setStatementModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Share account balance statement on WhatsApp"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp Statement</span>
          </button>

          {unpaidInvoices.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedInvoiceId(unpaidInvoices[0].id);
                setPaymentAmount(String(unpaidInvoices[0].balanceDue));
                setPaymentModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-900 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
              <span>Record Payment</span>
            </button>
          )}

          <Link
            href={`/invoices/new?customerId=${customer.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Create Bill</span>
          </Link>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
            Opening Balance
          </span>
          <p className="text-lg font-bold font-mono text-slate-800 tabular-nums">
            ₹{customer.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Initial credit / debit</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
            Total Invoiced
          </span>
          <p className="text-lg font-bold font-mono text-slate-900 tabular-nums">
            ₹{customer.invoiceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">{customer.invoices.length} bills generated</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-700 block mb-1">
            Total Collected
          </span>
          <p className="text-lg font-bold font-mono text-emerald-800 tabular-nums">
            ₹{customer.invoicePaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-600 mt-0.5">{customer.payments.length} payments recorded</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200/90 shadow-2xs bg-amber-50/20">
          <span className="text-[11px] uppercase font-bold tracking-wider text-amber-800 block mb-1">
            Net Udhaar Balance
          </span>
          <p className="text-xl font-extrabold font-mono text-amber-800 tabular-nums">
            ₹{customer.totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5">Current pending credit</p>
        </div>
      </div>

      {/* Two Column Layout: Ledger Invoices vs Recorded Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoices Ledger Table */}
        <div className="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden">
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-600" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Invoices & Bills ({customer.invoices.length})
              </h2>
            </div>
            <Link
              href={`/invoices/new?customerId=${customer.id}`}
              className="text-[11px] font-semibold text-emerald-700 hover:underline"
            >
              + New Bill
            </Link>
          </div>

          {customer.invoices.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No bills created for this customer yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {customer.invoices.map((inv) => (
                <div key={inv.id} className="p-3.5 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="font-mono font-bold text-slate-900 hover:text-emerald-700 hover:underline"
                      >
                        {inv.invoiceNumber}
                      </Link>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : inv.status === 'PARTIAL'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : inv.status === 'CANCELLED'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(inv.invoiceDate).toLocaleDateString('en-IN')} • Due {new Date(inv.dueDate).toLocaleDateString('en-IN')}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900 block tabular-nums">
                      ₹{inv.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    {inv.balanceDue > 0 && inv.status !== 'CANCELLED' ? (
                      <span className="text-[11px] font-mono text-amber-800 font-semibold tabular-nums">
                        Due: ₹{inv.balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Settled</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recorded Payments Table */}
        <div className="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden">
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Payments Received ({customer.payments.length})
              </h2>
            </div>
            {unpaidInvoices.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedInvoiceId(unpaidInvoices[0].id);
                  setPaymentAmount(String(unpaidInvoices[0].balanceDue));
                  setPaymentModalOpen(true);
                }}
                className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
              >
                + Record Payment
              </button>
            )}
          </div>

          {customer.payments.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No payments recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {customer.payments.map((p) => (
                <div key={p.id} className="p-3.5 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors">
                  <div>
                    <span className="font-semibold text-slate-800">
                      {p.paymentMethod} Payment
                    </span>
                    <span className="text-slate-400 ml-2 font-mono text-[11px]">
                      against {p.invoice.invoiceNumber}
                    </span>
                    {p.referenceNumber && (
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Ref: {p.referenceNumber}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(p.paymentDate).toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-800 text-sm tabular-nums">
                      +₹{p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Record Customer Payment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Invoice to Settle *</label>
                <select
                  required
                  value={selectedInvoiceId}
                  onChange={(e) => {
                    setSelectedInvoiceId(e.target.value);
                    const inv = unpaidInvoices.find((i) => i.id === e.target.value);
                    if (inv) setPaymentAmount(String(inv.balanceDue));
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  {unpaidInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} (Due: ₹{inv.balanceDue.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount to Collect (₹) *</label>
                <input
                  type="number"
                  step="0.01"
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
                  placeholder="e.g. Ref / Trans ID"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paying}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  {paying ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Share Modal for Account Balance Statement */}
      <WhatsAppShareModal
        isOpen={statementModalOpen}
        onClose={() => setStatementModalOpen(false)}
        customerName={customer.name}
        customerPhone={customer.mobile}
        amount={customer.totalOutstanding}
        shareType="ACCOUNT_STATEMENT"
      />
    </div>
  );
}

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <React.Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Loading customer details...</div>}>
      <CustomerDetailContent params={params} />
    </React.Suspense>
  );
}
