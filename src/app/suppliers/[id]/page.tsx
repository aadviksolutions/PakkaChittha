'use client';

import React, { useState, useEffect, useCallback, use, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Truck,
  Phone,
  Mail,
  MapPin,
  Building,
  CreditCard,
  Plus,
  AlertCircle,
  FileText,
  Calendar,
  CheckCircle2,
  X,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface PurchaseItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  purchaseRate: number;
  lineTotal: number;
}

interface SupplierPurchase {
  id: string;
  purchaseNumber: string;
  supplierInvoiceNumber: string | null;
  purchaseDate: string;
  dueDate: string | null;
  total: number;
  paidAmount: number;
  balanceDue: number;
  status: string;
  items: PurchaseItem[];
}

interface SupplierPaymentItem {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber: string | null;
  notes: string | null;
}

interface SupplierDetail {
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
  purchases: SupplierPurchase[];
  payments: SupplierPaymentItem[];
  createdAt: string;
}

function SupplierDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Record Payment Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string>('');
  const [payAmount, setPayAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('BANK_TRANSFER');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [paying, setPaying] = useState(false);

  const fetchSupplier = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/suppliers/${id}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Supplier not found.');
      }
      setSupplier(data.supplier);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching supplier');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSupplier();
  }, [fetchSupplier]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPurchaseId || !payAmount) return;

    setPaying(true);
    try {
      const res = await fetch(`/api/purchases/${selectedPurchaseId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(payAmount),
          paymentMethod,
          referenceNumber: paymentRef || null,
          idempotencyKey: `pay-${id}-${selectedPurchaseId}-${Date.now()}`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record payment.');
      }

      setPayModalOpen(false);
      setPayAmount('');
      setPaymentRef('');
      setSelectedPurchaseId('');
      toast.success('Payment recorded successfully.');
      fetchSupplier();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error recording payment');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-500" />
        Loading vendor khata and purchase records...
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="p-8 text-center text-rose-600 text-xs">
        <AlertCircle className="w-6 h-6 mx-auto mb-2 text-rose-500" />
        <p className="font-bold text-sm text-slate-900">{error || 'Supplier not found'}</p>
        <Link
          href="/suppliers"
          className="mt-4 inline-block px-4 py-2 bg-slate-900 text-white rounded-xl font-semibold"
        >
          Return to Suppliers
        </Link>
      </div>
    );
  }

  const unpaidPurchases = supplier.purchases.filter(
    (p) => p.status === 'RECEIVED' && p.balanceDue > 0
  );

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
                router.push('/suppliers');
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
              <span className="text-xs text-slate-400 font-mono">Vendor Profile</span>
              {supplier.totalOutstanding > 0 ? (
                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  ₹{supplier.totalOutstanding.toLocaleString('en-IN')} Payable Due
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Fully Settled
                </span>
              )}
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 mt-0.5">{supplier.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unpaidPurchases.length > 0 && (
            <button
              onClick={() => {
                setSelectedPurchaseId(unpaidPurchases[0].id);
                setPayAmount(String(unpaidPurchases[0].balanceDue));
                setPayModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Pay Vendor
            </button>
          )}

          <Link
            href={`/purchases/new?supplierId=${supplier.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            Record Purchase
          </Link>
        </div>
      </div>

      {/* Profile & KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-bold text-slate-900 block">Contact Info</span>
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>{supplier.phone}</span>
          </div>
          {supplier.email && (
            <div className="text-xs text-slate-600 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{supplier.email}</span>
            </div>
          )}
          {supplier.gstin && (
            <div className="text-xs text-slate-600 flex items-center gap-2 font-mono">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>GSTIN: {supplier.gstin}</span>
            </div>
          )}
          {supplier.address && (
            <div className="text-xs text-slate-500 flex items-start gap-2 pt-1 border-t border-slate-100">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>{supplier.address}</span>
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">Total Inward Supplies</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            ₹{supplier.totalPurchasesAmount.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Across {supplier.purchases.length} total bills
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">Total Payments Paid</span>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">
            ₹{supplier.totalPaidAmount.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Recorded in khata</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">Current Outstanding Balance</span>
          <div className="text-2xl font-extrabold text-rose-700 mt-1">
            ₹{supplier.totalOutstanding.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-rose-600 mt-1 block">
            Opening: ₹{supplier.openingBalance.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Inward Purchases Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-sm text-slate-900">Inward Purchase Bills</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {supplier.purchases.length} Records
          </span>
        </div>

        {supplier.purchases.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No purchase bills recorded for this supplier.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Purchase #</th>
                  <th className="py-3 px-4">Supplier Bill Ref</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Bill Total</th>
                  <th className="py-3 px-4">Paid</th>
                  <th className="py-3 px-4">Balance</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {supplier.purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                      <Link href={`/purchases/${p.id}`} className="hover:text-blue-600">
                        {p.purchaseNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {p.supplierInvoiceNumber || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(p.purchaseDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{p.items?.length || 0} items</td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      ₹{p.total.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-emerald-600 font-medium">
                      ₹{p.paidAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-slate-900">
                      ₹{p.balanceDue.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          p.status === 'RECEIVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : p.status === 'DRAFT'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/purchases/${p.id}`}
                        className="text-xs text-blue-600 font-semibold hover:underline"
                      >
                        View Bill
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payments History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-sm text-slate-900">Supplier Payments History</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {supplier.payments.length} Payments
          </span>
        </div>

        {supplier.payments.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No supplier payments recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Ref / Transaction #</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {supplier.payments.map((pmt) => (
                  <tr key={pmt.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(pmt.paymentDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-emerald-700">
                      ₹{pmt.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-semibold">
                        {pmt.paymentMethod.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {pmt.referenceNumber || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{pmt.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {payModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Pay Supplier</h3>
                <p className="text-xs text-slate-500">{supplier.name}</p>
              </div>
              <button
                onClick={() => setPayModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Purchase Bill</label>
                <select
                  required
                  value={selectedPurchaseId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    setSelectedPurchaseId(selId);
                    const target = unpaidPurchases.find((p) => p.id === selId);
                    if (target) setPayAmount(String(target.balanceDue));
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  {unpaidPurchases.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.purchaseNumber} (Due: ₹{p.balanceDue})
                    </option>
                  ))}
                </select>
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-extrabold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
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
                  placeholder="e.g. UTR / Cheque #"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
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
    </div>
  );
}

export default function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-slate-400 text-xs">Loading supplier details...</div>}
    >
      <SupplierDetailContent params={params} />
    </Suspense>
  );
}
