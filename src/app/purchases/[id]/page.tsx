'use client';

import React, { useState, useEffect, useCallback, use, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Truck,
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Calendar,
  Building,
  Phone,
  Boxes,
  FileText,
  X,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface PurchaseItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  purchaseRate: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  product?: {
    id: string;
    name: string;
    sku: string;
    currentStock: number;
    unit: string;
  } | null;
}

interface SupplierPaymentItem {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber: string | null;
  notes: string | null;
}

interface PurchaseDetail {
  id: string;
  purchaseNumber: string;
  supplierInvoiceNumber: string | null;
  purchaseDate: string;
  dueDate: string | null;
  status: 'DRAFT' | 'RECEIVED' | 'CANCELLED';
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  paidAmount: number;
  balanceDue: number;
  notes: string | null;
  receivedAt: string | null;
  receivedBy: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  supplier: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
    gstin: string | null;
  };
  items: PurchaseItem[];
  payments: SupplierPaymentItem[];
}

function PurchaseDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const [purchase, setPurchase] = useState<PurchaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [paymentRef, setPaymentRef] = useState('');
  const [paying, setPaying] = useState(false);

  // Void Modal
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  const fetchPurchase = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/purchases/${id}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Purchase bill not found.');
      }
      setPurchase(data.purchase);
      setPayAmount(String(data.purchase.balanceDue || ''));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching purchase');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPurchase();
  }, [fetchPurchase]);

  const handleReceiveGoods = async () => {
    if (!purchase) return;
    if (
      !confirm(
        'Confirm receipt of goods? This will update inventory and record auditable stock movements.'
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/purchases/${id}/receive`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to receive goods.');
      }
      toast.success('Goods received successfully. Inventory has been updated.');
      fetchPurchase();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error receiving goods');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payAmount) return;

    setPaying(true);
    try {
      const res = await fetch(`/api/purchases/${id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(payAmount),
          paymentMethod,
          referenceNumber: paymentRef.trim() || null,
          idempotencyKey: `pay-bill-${id}-${Date.now()}`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record payment.');
      }

      setPayModalOpen(false);
      setPaymentRef('');
      toast.success('Payment recorded successfully.');
      fetchPurchase();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error recording payment');
    } finally {
      setPaying(false);
    }
  };

  const handleVoidPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidReason.trim()) return;

    setVoiding(true);
    try {
      const res = await fetch(`/api/purchases/${id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: voidReason.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to void purchase.');
      }

      setVoidModalOpen(false);
      toast.success('Purchase cancelled successfully.');
      fetchPurchase();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error cancelling purchase');
    } finally {
      setVoiding(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
        Loading purchase bill details...
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div className="p-8 text-center text-rose-600 text-xs">
        <AlertCircle className="w-6 h-6 mx-auto mb-2 text-rose-500" />
        <p className="font-bold text-sm text-slate-900">{error || 'Purchase bill not found'}</p>
        <Link
          href="/purchases"
          className="mt-4 inline-block px-4 py-2 bg-slate-900 text-white rounded-xl font-semibold"
        >
          Return to Purchases
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
              } else {
                router.push('/purchases');
              }
            }}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Back to previous screen"
            aria-label="Back to previous screen"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-500">
                {purchase.purchaseNumber}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                  purchase.status === 'RECEIVED'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : purchase.status === 'DRAFT'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {purchase.status === 'RECEIVED' && <CheckCircle2 className="w-3 h-3" />}
                {purchase.status === 'DRAFT' && <Clock className="w-3 h-3" />}
                {purchase.status === 'CANCELLED' && <XCircle className="w-3 h-3" />}
                {purchase.status}
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 mt-0.5">
              Purchase Bill • {purchase.supplier.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {purchase.status === 'DRAFT' && (
            <button
              onClick={handleReceiveGoods}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Mark as Received
            </button>
          )}

          {purchase.status !== 'CANCELLED' && purchase.balanceDue > 0 && (
            <button
              onClick={() => {
                setPayAmount(String(purchase.balanceDue));
                setPayModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white hover:bg-blue-500 text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Pay Bill (₹{purchase.balanceDue.toLocaleString('en-IN')})
            </button>
          )}

          {purchase.status !== 'CANCELLED' && (
            <button
              onClick={() => {
                setVoidReason('');
                setVoidModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-600 text-xs font-semibold rounded-xl transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Void Bill
            </button>
          )}
        </div>
      </div>

      {/* Cancellation Notice if Voided */}
      {purchase.status === 'CANCELLED' && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <XCircle className="w-4 h-4 text-rose-600" />
            <span>This purchase bill has been cancelled.</span>
          </div>
          <p>
            Reason: <em>"{purchase.cancellationReason}"</em>
          </p>
          <div className="text-[11px] text-rose-600">
            Cancelled by: {purchase.cancelledBy || 'Staff'} on{' '}
            {purchase.cancelledAt ? new Date(purchase.cancelledAt).toLocaleString('en-IN') : '-'}
          </div>
        </div>
      )}

      {/* Bill & Supplier Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-bold text-slate-900 block">Supplier</span>
          <div className="text-xs font-semibold text-slate-800">{purchase.supplier.name}</div>
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>{purchase.supplier.phone}</span>
          </div>
          {purchase.supplier.gstin && (
            <div className="text-xs text-slate-500 font-mono">
              GSTIN: {purchase.supplier.gstin}
            </div>
          )}
          {purchase.supplier.address && (
            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-100">
              {purchase.supplier.address}
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-bold text-slate-900 block">Purchase Details</span>
          <div className="text-xs text-slate-600 flex justify-between">
            <span className="text-slate-400">Bill Date:</span>
            <span className="font-semibold text-slate-800">
              {new Date(purchase.purchaseDate).toLocaleDateString('en-IN')}
            </span>
          </div>
          <div className="text-xs text-slate-600 flex justify-between">
            <span className="text-slate-400">Due Date:</span>
            <span className="font-semibold text-slate-800">
              {purchase.dueDate
                ? new Date(purchase.dueDate).toLocaleDateString('en-IN')
                : 'Immediate'}
            </span>
          </div>
          <div className="text-xs text-slate-600 flex justify-between">
            <span className="text-slate-400">Vendor Bill Ref:</span>
            <span className="font-mono font-semibold text-slate-800">
              {purchase.supplierInvoiceNumber || 'None'}
            </span>
          </div>
          {purchase.receivedAt && (
            <div className="text-[11px] text-emerald-700 pt-1 border-t border-slate-100">
              Received on {new Date(purchase.receivedAt).toLocaleDateString('en-IN')} by{' '}
              {purchase.receivedBy || 'Staff'}
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-bold text-slate-900 block">Financial Status</span>
          <div className="text-xs text-slate-600 flex justify-between">
            <span className="text-slate-400">Grand Total:</span>
            <span className="font-extrabold text-slate-900">
              ₹{purchase.total.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="text-xs text-slate-600 flex justify-between">
            <span className="text-slate-400">Amount Paid:</span>
            <span className="font-semibold text-emerald-700">
              ₹{purchase.paidAmount.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="text-xs text-slate-600 flex justify-between pt-1 border-t border-slate-100">
            <span className="text-slate-500 font-bold">Balance Due:</span>
            <span
              className={`font-extrabold ${
                purchase.balanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'
              }`}
            >
              ₹{purchase.balanceDue.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Itemized Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-sm text-slate-900">Inward Items Received</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {purchase.items.length} Line Items
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Item & Code</th>
                <th className="py-3 px-4">Quantity</th>
                <th className="py-3 px-4">Rate (₹)</th>
                <th className="py-3 px-4">Discount (₹)</th>
                <th className="py-3 px-4">Tax (₹)</th>
                <th className="py-3 px-4 text-right">Line Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {purchase.items.map((it) => (
                <tr key={it.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900">{it.description}</span>
                    {it.product && (
                      <div className="text-[10px] text-blue-600 font-mono">
                        Linked SKU: {it.product.sku} (Current Stock: {it.product.currentStock}{' '}
                        {it.product.unit})
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-extrabold text-slate-900">
                    {it.quantity} {it.unit}
                  </td>
                  <td className="py-3 px-4">₹{it.purchaseRate.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4">
                    {it.discount > 0 ? `₹${it.discount.toLocaleString('en-IN')}` : '-'}
                  </td>
                  <td className="py-3 px-4 font-mono text-emerald-700">
                    ₹{it.taxAmount.toLocaleString('en-IN')} ({it.taxRate}%)
                  </td>
                  <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                    ₹{it.lineTotal.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50/70 border-t border-slate-200 text-xs">
              <tr>
                <td colSpan={5} className="py-2.5 px-4 text-right text-slate-500 font-medium">
                  Taxable Subtotal:
                </td>
                <td className="py-2.5 px-4 text-right font-bold text-slate-800">
                  ₹{purchase.subtotal.toLocaleString('en-IN')}
                </td>
              </tr>
              {purchase.discountTotal > 0 && (
                <tr>
                  <td colSpan={5} className="py-1.5 px-4 text-right text-emerald-600 font-medium">
                    Discount Total:
                  </td>
                  <td className="py-1.5 px-4 text-right font-bold text-emerald-600">
                    -₹{purchase.discountTotal.toLocaleString('en-IN')}
                  </td>
                </tr>
              )}
              <tr>
                <td colSpan={5} className="py-1.5 px-4 text-right text-slate-500 font-medium">
                  Input Tax Credit (ITC):
                </td>
                <td className="py-1.5 px-4 text-right font-bold text-emerald-700">
                  ₹{purchase.taxTotal.toLocaleString('en-IN')}
                </td>
              </tr>
              <tr className="border-t border-slate-200">
                <td colSpan={5} className="py-3 px-4 text-right text-sm font-extrabold text-slate-900">
                  Final Bill Total:
                </td>
                <td className="py-3 px-4 text-right text-base font-extrabold text-slate-900">
                  ₹{purchase.total.toLocaleString('en-IN')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Payments History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-sm text-slate-900">Payments Disbursed</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {purchase.payments.length} Payments
          </span>
        </div>

        {purchase.payments.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No payments disbursed against this bill yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">UTR / Cheque Ref</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {purchase.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(p.paymentDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-emerald-700">
                      ₹{p.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-semibold">
                        {p.paymentMethod.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">{p.referenceNumber || '-'}</td>
                    <td className="py-3 px-4 text-slate-500">{p.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {payModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Record Vendor Payment</h3>
                <p className="text-xs text-slate-500">Bill: {purchase.purchaseNumber}</p>
              </div>
              <button
                onClick={() => setPayModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                <span className="text-slate-500">Balance Due:</span>
                <span className="text-sm font-extrabold text-rose-700">
                  ₹{purchase.balanceDue.toLocaleString('en-IN')}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payment Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-extrabold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                >
                  <option value="BANK_TRANSFER">Bank Transfer / NEFT / RTGS</option>
                  <option value="UPI">UPI</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reference / UTR Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR # or Cheque #"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paying}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-500 disabled:opacity-50"
                >
                  {paying ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Void Modal */}
      {voidModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-base text-rose-700">Void Purchase Bill</h3>
                <p className="text-xs text-slate-500">
                  {purchase.status === 'RECEIVED'
                    ? 'Reverses received stock movements'
                    : 'Cancels draft purchase order'}
                </p>
              </div>
              <button
                onClick={() => setVoidModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVoidPurchase} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Cancellation <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Goods returned to supplier due to transit defect..."
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
                  Keep Bill
                </button>
                <button
                  type="submit"
                  disabled={voiding}
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-500 disabled:opacity-50"
                >
                  {voiding ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-slate-400 text-xs">Loading purchase bill...</div>}
    >
      <PurchaseDetailContent params={params} />
    </Suspense>
  );
}
