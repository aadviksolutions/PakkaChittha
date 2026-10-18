'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Printer,
  CreditCard,
  Ban,
  Receipt,
  Calendar,
  Building,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { WhatsAppShareModal } from '@/components/whatsapp/WhatsAppShareModal';
import { useToast } from '@/context/ToastContext';
import { UpiQrCode } from '@/components/shared/UpiQrCode';

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: 'DRAFT' | 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  gstType: string;
  isTaxInclusive: boolean;
  isGstInvoice: boolean;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  rounding: number;
  total: number;
  paidAmount: number;
  balanceDue: number;
  customerName: string;
  customerMobile: string;
  customerGstin: string | null;
  customerBillingAddress: string | null;
  businessName: string;
  businessGstin: string | null;
  businessAddress: string | null;
  businessLogoUrl?: string | null;
  notes: string | null;
  termsAndConditions: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  cancelledBy: string | null;
  business?: {
    id: string;
    bankName?: string | null;
    bankAccountNumber?: string | null;
    bankIfsc?: string | null;
    bankUpiId?: string | null;
    logoUrl?: string | null;
  };
  customer: {
    id: string;
    name: string;
    mobile: string;
  };
  items: {
    id: string;
    description: string;
    quantity: number;
    unit: string;
    rate: number;
    discount: number;
    taxRate: number;
    taxAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    lineTotal: number;
  }[];
  payments: {
    id: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    referenceNumber: string | null;
    notes: string | null;
  }[];
}

function InvoiceDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentRef, setPaymentRef] = useState('');
  const [paying, setPaying] = useState(false);

  // Void modal state
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  // WhatsApp Share States
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [selectedPaymentForShare, setSelectedPaymentForShare] = useState<{ id: string; amount: number } | null>(null);

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setInvoice(data.invoice);
        setPaymentAmount(data.invoice.balanceDue > 0 ? data.invoice.balanceDue.toString() : '');
      } else {
        throw new Error(data.error || 'Failed to fetch invoice');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching invoice details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  // Handle auto-action from query params (e.g. Save & Print or Save & Share)
  useEffect(() => {
    if (!invoice) return;
    if (searchParams.get('print') === 'true') {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
    if (searchParams.get('share') === 'true') {
      setWhatsAppModalOpen(true);
    }
  }, [invoice, searchParams]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    setPaying(true);

    try {
      const res = await fetch(`/api/invoices/${invoice.id}/payments`, {
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
      setPaymentRef('');
      fetchInvoice();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setPaying(false);
    }
  };

  const handleVoidInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    setVoiding(true);

    try {
      const res = await fetch(`/api/invoices/${invoice.id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: voidReason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to void invoice');
      }
      toast.success('Invoice voided and balance cleared.');
      setVoidModalOpen(false);
      setVoidReason('');
      fetchInvoice();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel invoice');
    } finally {
      setVoiding(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-500">
        <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading invoice details...
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error || 'Invoice not found.'}</span>
        </div>
        <Link href="/invoices" className="font-semibold text-rose-900 hover:underline flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Invoices
        </Link>
      </div>
    );
  }

  const isCancelled = invoice.status === 'CANCELLED';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Breadcrumb & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black font-mono text-slate-900 tracking-tight">
                {invoice.invoiceNumber}
              </h1>
              <span
                className={`text-[10px] font-bold uppercase px-2.5 py-0.2 rounded-full border ${
                  invoice.status === 'PAID'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : invoice.status === 'PARTIAL'
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : invoice.status === 'CANCELLED'
                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                    : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                {invoice.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Customer:{' '}
              <Link href={`/customers/${invoice.customer.id}`} className="font-semibold text-slate-800 hover:underline">
                {invoice.customerName}
              </Link>{' '}
              • Billed on {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/invoices/${invoice.id}/print`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-400" />
            <span>Print A4 / PDF</span>
          </Link>

          <button
            type="button"
            onClick={() => setWhatsAppModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Send invoice via WhatsApp"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Send to WhatsApp</span>
          </button>

          {!isCancelled && invoice.balanceDue > 0 && (
            <button
              type="button"
              onClick={() => setPaymentModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-900 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
              <span>Record Payment</span>
            </button>
          )}

          {!isCancelled && (
            <button
              type="button"
              onClick={() => setVoidModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg border border-rose-200 transition-colors cursor-pointer"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Void</span>
            </button>
          )}
        </div>
      </div>

      {/* Cancellation Banner */}
      {isCancelled && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3">
          <Ban className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">This invoice was cancelled and voided.</span>
            <p className="mt-0.5 text-rose-800">
              Reason: {invoice.cancellationReason || 'No reason provided'}
              {invoice.cancelledAt && (
                <span> • Voided on {new Date(invoice.cancelledAt).toLocaleString('en-IN')}</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Invoice Overview Card */}
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200/90 shadow-2xs space-y-6 text-xs">
        {/* Parties Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-5 border-b border-slate-100">
          <div className="flex items-start gap-3">
            {(invoice.businessLogoUrl || invoice.business?.logoUrl) ? (
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                <img
                  src={(invoice.businessLogoUrl || invoice.business?.logoUrl)!}
                  alt={invoice.businessName}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : null}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Billed From
              </span>
              <p className="font-bold text-slate-900 text-sm">{invoice.businessName}</p>
              {invoice.businessAddress && <p className="text-slate-600 mt-0.5">{invoice.businessAddress}</p>}
              {invoice.businessGstin && (
                <p className="font-mono text-slate-700 mt-1">GSTIN: {invoice.businessGstin}</p>
              )}
            </div>
          </div>

          <div className="sm:text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Billed To
            </span>
            <Link
              href={`/customers/${invoice.customer.id}`}
              className="font-bold text-slate-900 text-sm hover:text-emerald-700 hover:underline block"
            >
              {invoice.customerName}
            </Link>
            <p className="text-slate-600 font-mono mt-0.5">{invoice.customerMobile}</p>
            {invoice.customerBillingAddress && (
              <p className="text-slate-600 whitespace-pre-line mt-0.5">{invoice.customerBillingAddress}</p>
            )}
            {invoice.customerGstin && (
              <p className="font-mono text-slate-700 mt-1">GSTIN: {invoice.customerGstin}</p>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Invoice Line Items ({invoice.items.length})
          </span>
          <div className="border border-slate-200/90 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3 text-right">Rate</th>
                  <th className="py-2.5 px-3 text-right">Disc</th>
                  {invoice.isGstInvoice && <th className="py-2.5 px-3 text-right">GST %</th>}
                  {invoice.isGstInvoice && <th className="py-2.5 px-3 text-right">Tax (₹)</th>}
                  <th className="py-2.5 px-3 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {invoice.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-900">{item.description}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700 tabular-nums">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 tabular-nums">₹{item.rate.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-500 tabular-nums">
                      {item.discount > 0 ? `₹${item.discount.toFixed(2)}` : '-'}
                    </td>
                    {invoice.isGstInvoice && (
                      <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums">{item.taxRate}%</td>
                    )}
                    {invoice.isGstInvoice && (
                      <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums">₹{item.taxAmount.toFixed(2)}</td>
                    )}
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                      ₹{item.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary & Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3 border-t border-slate-100">
          <div className="space-y-3">
            {invoice.notes && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Notes
                </span>
                <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 whitespace-pre-line text-xs">
                  {invoice.notes}
                </p>
              </div>
            )}
            {invoice.termsAndConditions && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Terms & Conditions
                </span>
                <p className="text-slate-500 text-[11px] whitespace-pre-line leading-relaxed font-mono">
                  {invoice.termsAndConditions}
                </p>
              </div>
            )}

            {invoice.business?.bankUpiId && invoice.balanceDue > 0 && !isCancelled && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center gap-3">
                <UpiQrCode
                  upiId={invoice.business.bankUpiId}
                  payeeName={invoice.businessName}
                  amount={invoice.balanceDue}
                  invoiceNumber={invoice.invoiceNumber}
                  size={96}
                  showCaption={false}
                />
                <div className="text-left space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Instant UPI QR Payment
                  </span>
                  <p className="text-xs font-semibold text-slate-800">
                    Scan using any UPI App
                  </p>
                  <p className="text-[11px] font-mono font-medium text-emerald-800">
                    {invoice.business.bankUpiId}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Due: ₹{invoice.balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/90 space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>Taxable Subtotal:</span>
              <span className="font-mono font-medium tabular-nums">₹{invoice.subtotal.toFixed(2)}</span>
            </div>

            {invoice.discountTotal > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount:</span>
                <span className="font-mono tabular-nums">-₹{invoice.discountTotal.toFixed(2)}</span>
              </div>
            )}

            {invoice.isGstInvoice && invoice.taxTotal > 0 && (
              <>
                {invoice.gstType === 'CGST_SGST' ? (
                  <>
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>CGST:</span>
                      <span className="font-mono tabular-nums">₹{invoice.cgstTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>SGST:</span>
                      <span className="font-mono tabular-nums">₹{invoice.sgstTotal.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>IGST:</span>
                    <span className="font-mono tabular-nums">₹{invoice.igstTotal.toFixed(2)}</span>
                  </div>
                )}
              </>
            )}

            {invoice.rounding !== 0 && (
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Rounding:</span>
                <span className="font-mono tabular-nums">{invoice.rounding > 0 ? `+₹${invoice.rounding.toFixed(2)}` : `-₹${Math.abs(invoice.rounding).toFixed(2)}`}</span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
              <span>Grand Total:</span>
              <span className="font-mono text-base tabular-nums">₹{invoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between text-emerald-700 font-semibold pt-1 border-t border-slate-200">
              <span>Paid:</span>
              <span className="font-mono tabular-nums">₹{invoice.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between text-amber-900 font-bold bg-amber-50/80 -mx-4 -mb-4 p-3 rounded-b-xl border-t border-amber-200">
              <span>Balance Due (Udhaar):</span>
              <span className="font-mono text-sm tabular-nums">₹{invoice.balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-3 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              Payment History ({invoice.payments.length})
            </h3>
          </div>
          {!isCancelled && invoice.balanceDue > 0 && (
            <button
              type="button"
              onClick={() => setPaymentModalOpen(true)}
              className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
            >
              + Record Payment
            </button>
          )}
        </div>

        {invoice.payments.length === 0 ? (
          <p className="text-slate-400 py-3 text-center">No payments recorded against this invoice yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 font-mono text-[11px]">
            {invoice.payments.map((p) => (
              <div key={p.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-sans font-semibold text-slate-800">
                    {p.paymentMethod} Payment
                  </span>
                  {p.referenceNumber && (
                    <span className="text-slate-400 ml-2">Ref: {p.referenceNumber}</span>
                  )}
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                    {new Date(p.paymentDate).toLocaleString('en-IN')}
                    {p.notes && ` • ${p.notes}`}
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentForShare({ id: p.id, amount: p.amount })}
                    className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                    title="Share receipt on WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold text-emerald-700 text-xs tabular-nums">
                    +₹{p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Record Payment</h3>
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
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Balance Due:</span>
                  <span className="font-mono font-bold text-amber-800">₹{invoice.balanceDue.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount to Collect (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  max={invoice.balanceDue}
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
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
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

      {/* Cancel / Void Modal */}
      {voidModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-rose-50/50">
              <div className="flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-950">
                  Cancel Invoice {invoice.invoiceNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVoidModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleVoidInvoice} className="p-5 space-y-3.5 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Cancelling this invoice voids all outstanding balances and marks it as void in the audit trail.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Cancellation *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Returned goods or billing error..."
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setVoidModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Keep Invoice
                </button>
                <button
                  type="submit"
                  disabled={voiding}
                  className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  {voiding ? 'Cancelling...' : 'Confirm Void'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Share Modal for Invoice */}
      <WhatsAppShareModal
        isOpen={whatsAppModalOpen}
        onClose={() => setWhatsAppModalOpen(false)}
        customerName={invoice.customerName}
        customerPhone={invoice.customerMobile}
        invoiceNumber={invoice.invoiceNumber}
        invoiceId={invoice.id}
        invoiceTotal={invoice.total}
        balanceDue={invoice.balanceDue}
        dueDate={invoice.dueDate}
        shareType="INVOICE"
      />

      {/* WhatsApp Share Modal for Specific Payment Receipt */}
      {selectedPaymentForShare && (
        <WhatsAppShareModal
          isOpen={true}
          onClose={() => setSelectedPaymentForShare(null)}
          customerName={invoice.customerName}
          customerPhone={invoice.customerMobile}
          invoiceNumber={invoice.invoiceNumber}
          paymentId={selectedPaymentForShare.id}
          amount={selectedPaymentForShare.amount}
          shareType="PAYMENT_RECEIPT"
        />
      )}
    </div>
  );
}

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <React.Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Loading invoice details...</div>}>
      <InvoiceDetailContent params={params} />
    </React.Suspense>
  );
}
