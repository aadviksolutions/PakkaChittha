'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Truck,
  Plus,
  Trash2,
  ArrowLeft,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Calendar,
  CreditCard,
  Building,
  X,
  Boxes,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { round2 } from '@/lib/billing/calculator';
import { useEntitlements } from '@/hooks/useEntitlements';
import { FeatureNotAvailable } from '@/components/shared/FeatureNotAvailable';
import { GstFetchBox } from '@/components/gst/GstFetchBox';

interface SupplierOption {
  id: string;
  name: string;
  phone: string;
  gstin: string | null;
  address: string | null;
}

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  unit: string;
  purchasePrice: number;
  taxRate: number;
  currentStock: number;
}

interface PurchaseLineRow {
  productId?: string;
  description: string;
  quantity: number;
  unit: string;
  purchaseRate: number;
  discount: number;
  taxRate: number;
}

const COMMON_UNITS = ['Pcs', 'Bags', 'Kg', 'Boxes', 'Nos', 'Mtr', 'Ltr', 'Bundles', 'Buckets'];
const GST_RATES = [0, 5, 12, 18, 28];

function PurchaseCreationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { isAllowed } = useEntitlements();
  const canManagePurchases = isAllowed('canManagePurchases');

  const preselectedSupplierId = searchParams.get('supplierId') || '';

  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState(preselectedSupplierId);
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setDueDate(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
  }, []);
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<PurchaseLineRow[]>([
    {
      description: '',
      quantity: 1,
      unit: 'Pcs',
      purchaseRate: 0,
      discount: 0,
      taxRate: 18,
    },
  ]);

  // Payment section
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [paymentReference, setPaymentReference] = useState('');

  // Modals & UI states
  const [addSupplierModalOpen, setAddSupplierModalOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierGstin, setNewSupplierGstin] = useState('');
  const [addingSupplier, setAddingSupplier] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canManagePurchases) return;
    // Fetch suppliers and products
    Promise.all([
      fetch('/api/suppliers')
        .then((r) => r.json())
        .then((d) => (d.success ? setSuppliers(d.suppliers) : null)),
      fetch('/api/inventory')
        .then((r) => r.json())
        .then((d) => (d.success ? setProducts(d.products) : null)),
    ]).catch((err) => console.error('Error loading options:', err));
  }, [canManagePurchases]);

  // Recalculate totals
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  const calculatedRows = items.map((item) => {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const rate = Math.max(0, Number(item.purchaseRate) || 0);
    const disc = Math.max(0, Number(item.discount) || 0);
    const taxRate = Math.max(0, Number(item.taxRate) || 0);

    const lineGross = qty * rate;
    const lineTaxable = Math.max(0, lineGross - disc);
    const lineTax = lineTaxable * (taxRate / 100);
    const lineTotal = lineTaxable + lineTax;

    subtotal += lineTaxable;
    discountTotal += disc;
    taxTotal += lineTax;

    return {
      ...item,
      lineTaxable: round2(lineTaxable),
      lineTax: round2(lineTax),
      lineTotal: round2(lineTotal),
    };
  });

  subtotal = round2(subtotal);
  discountTotal = round2(discountTotal);
  taxTotal = round2(taxTotal);
  const total = round2(subtotal + taxTotal);

  const parsedPaid = Math.max(0, parseFloat(paidAmount) || 0);
  const balanceDue = round2(Math.max(0, total - parsedPaid));

  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    const newItems = [...items];
    if (prod) {
      newItems[index] = {
        productId: prod.id,
        description: prod.name,
        quantity: newItems[index].quantity || 1,
        unit: prod.unit || 'Pcs',
        purchaseRate: prod.purchasePrice || 0,
        discount: 0,
        taxRate: prod.taxRate || 18,
      };
    } else {
      newItems[index].productId = undefined;
    }
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof PurchaseLineRow, val: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: val };
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        description: '',
        quantity: 1,
        unit: 'Pcs',
        purchaseRate: 0,
        discount: 0,
        taxRate: 18,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim() || !newSupplierPhone.trim()) return;

    setAddingSupplier(true);
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSupplierName.trim(),
          phone: newSupplierPhone.trim(),
          gstin: newSupplierGstin.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add supplier.');
      }
      setSuppliers([...suppliers, data.supplier]);
      setSelectedSupplierId(data.supplier.id);
      setAddSupplierModalOpen(false);
      setNewSupplierName('');
      setNewSupplierPhone('');
      setNewSupplierGstin('');
      toast.success('Supplier added successfully');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error adding supplier');
    } finally {
      setAddingSupplier(false);
    }
  };

  const handleSubmit = async (targetStatus: 'DRAFT' | 'RECEIVED') => {
    setError(null);
    if (!selectedSupplierId) {
      setError('Please select a supplier or create one.');
      toast.error('Please select a supplier or create one.');
      return;
    }

    const validItems = items.filter((it) => it.description.trim().length > 0);
    if (validItems.length === 0) {
      setError('At least one item with a valid description is required.');
      toast.error('At least one item with a valid description is required.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: selectedSupplierId,
          supplierInvoiceNumber: supplierInvoiceNumber.trim() || null,
          purchaseDate,
          dueDate,
          status: targetStatus,
          items: validItems.map((it) => ({
            productId: it.productId || null,
            description: it.description.trim(),
            quantity: Number(it.quantity) || 1,
            unit: it.unit || 'Pcs',
            purchaseRate: Number(it.purchaseRate) || 0,
            discount: Number(it.discount) || 0,
            taxRate: Number(it.taxRate) || 0,
          })),
          paidAmount: parsedPaid,
          paymentMethod: parsedPaid > 0 ? paymentMethod : undefined,
          paymentReference: parsedPaid > 0 ? paymentReference.trim() || null : undefined,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save purchase bill.');
      }

      toast.success(
        targetStatus === 'RECEIVED'
          ? 'Purchase recorded and inventory updated!'
          : 'Purchase bill saved as draft.'
      );
      router.push(`/purchases/${data.purchase.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating purchase bill';
      setError(msg);
      toast.error(msg);
      setSaving(false);
    }
  };

  if (!canManagePurchases) {
    return (
      <FeatureNotAvailable
        featureName="Record Inward Purchase Bill"
        requiredPlanName="Growth or Scale"
        description="Supplier purchases and stock receiving are available on Pakka Chittha Growth and Scale plans."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/purchases"
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-600 font-bold uppercase tracking-wider">
                Inward Purchase Bill
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900">Record Inward Purchase</h1>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Supplier and Items Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Supplier & Details Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600" />
                Supplier Information
              </h3>
              <button
                type="button"
                onClick={() => setAddSupplierModalOpen(true)}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                + New Supplier
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Supplier <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                >
                  <option value="">-- Choose registered vendor --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Supplier Invoice / Bill No
                </label>
                <input
                  type="text"
                  placeholder="e.g. SUP-INV-9921"
                  value={supplierInvoiceNumber}
                  onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Purchase Date</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-blue-600" />
                Purchased Line Items
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item Row
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 w-64">Item / Product</th>
                    <th className="py-2 px-2 w-20">Qty</th>
                    <th className="py-2 px-2 w-24">Unit</th>
                    <th className="py-2 px-2 w-28">Rate (₹)</th>
                    <th className="py-2 px-2 w-20">Disc (₹)</th>
                    <th className="py-2 px-2 w-20">GST %</th>
                    <th className="py-2 px-3 text-right">Total (₹)</th>
                    <th className="py-2 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3">
                        {products.length > 0 && (
                          <select
                            value={row.productId || ''}
                            onChange={(e) => handleProductSelect(idx, e.target.value)}
                            className="w-full mb-1 text-[11px] px-2 py-1 border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
                          >
                            <option value="">-- Catalog Item Shortcut --</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku})
                              </option>
                            ))}
                          </select>
                        )}
                        <input
                          type="text"
                          required
                          placeholder="Item description / specification"
                          value={row.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                        />
                      </td>

                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          value={row.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-center font-bold"
                        />
                      </td>

                      <td className="py-2 px-2">
                        <select
                          value={row.unit}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                        >
                          {COMMON_UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={row.purchaseRate}
                          onChange={(e) => handleItemChange(idx, 'purchaseRate', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold"
                        />
                      </td>

                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.discount}
                          onChange={(e) => handleItemChange(idx, 'discount', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                        />
                      </td>

                      <td className="py-2 px-2">
                        <select
                          value={row.taxRate}
                          onChange={(e) => handleItemChange(idx, 'taxRate', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                        >
                          {GST_RATES.map((r) => (
                            <option key={r} value={r}>
                              {r}%
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-2 px-3 text-right font-extrabold text-slate-900">
                        ₹{calculatedRows[idx]?.lineTotal.toLocaleString('en-IN')}
                      </td>

                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={items.length <= 1}
                          className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="w-full py-2 border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-600 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Another Item
            </button>
          </div>
        </div>

        {/* Right Col: Totals, Initial Payment, and Submit */}
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-3">
              Bill Summary
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Taxable Subtotal:</span>
                <span className="font-semibold text-slate-900">
                  ₹{subtotal.toLocaleString('en-IN')}
                </span>
              </div>

              {discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Total Discount:</span>
                  <span>-₹{discountTotal.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Input Tax Credit (ITC / GST):</span>
                <span className="font-semibold text-slate-900">
                  ₹{taxTotal.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                <span className="text-sm font-extrabold text-slate-900">Grand Total:</span>
                <span className="text-xl font-extrabold text-slate-900">
                  ₹{total.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Payment Section */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <span className="font-bold text-xs text-slate-900 block">Payment Made to Vendor</span>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Amount Paid (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-extrabold text-slate-900 text-xs"
                />
              </div>

              {parsedPaid > 0 && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs"
                    >
                      <option value="BANK_TRANSFER">Bank Transfer / NEFT / RTGS</option>
                      <option value="UPI">UPI</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="CASH">Cash</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      UTR / Transaction Ref
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. UTR # or Cheque #"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>
                </>
              )}

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                <span className="text-slate-500">Remaining Balance:</span>
                <span
                  className={`font-extrabold ${
                    balanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  ₹{balanceDue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Notes / Transport Info
              </label>
              <textarea
                rows={2}
                placeholder="Challan #, transporter name, vehicle number..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSubmit('RECEIVED')}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-xs transition-colors text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {saving ? 'Processing...' : 'Mark as Received & Update Stock'}
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => handleSubmit('DRAFT')}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors text-xs disabled:opacity-50"
              >
                Save as Draft PO (No Stock Change)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Supplier Modal */}
      {addSupplierModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <h3 className="font-extrabold text-sm text-slate-900">Add Supplier Shortcut</h3>
              <button
                type="button"
                onClick={() => setAddSupplierModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSupplier} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Supplier business name"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Phone <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Phone number"
                  value={newSupplierPhone}
                  onChange={(e) => setNewSupplierPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <GstFetchBox
                gstin={newSupplierGstin}
                onGstinChange={(val) => setNewSupplierGstin(val)}
                onDetailsFetched={(details) => {
                  setNewSupplierGstin(details.gstin);
                  if (!newSupplierName) setNewSupplierName(details.tradeName || details.legalName);
                  toast.success(`GST details fetched for ${details.tradeName || details.legalName}! Review before saving.`);
                }}
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddSupplierModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingSupplier}
                  className="px-3 py-1.5 bg-slate-900 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {addingSupplier ? 'Saving...' : 'Save & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewPurchasePage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-slate-400 text-xs">Loading purchase creator...</div>}
    >
      <PurchaseCreationForm />
    </Suspense>
  );
}
