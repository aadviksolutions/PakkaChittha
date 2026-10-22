'use client';

import React, { useState, useEffect, useCallback, use, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Package,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  User,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Archive,
  Edit,
  X,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface StockMovement {
  id: string;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  sourceDocumentType: string | null;
  sourceDocumentId: string | null;
  reason: string | null;
  actorName: string | null;
  createdAt: string;
}

interface ProductDetail {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  category: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  taxRate: number;
  currentStock: number;
  openingStock: number;
  lowStockAlert: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  stockMovements: StockMovement[];
}

function ProductDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stock Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  // Edit Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: '',
    unit: '',
    purchasePrice: '',
    sellingPrice: '',
    taxRate: '',
    lowStockAlert: '',
    description: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/inventory/${id}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Product not found.');
      }
      setProduct(data.product);
      setEditForm({
        name: data.product.name,
        sku: data.product.sku,
        barcode: data.product.barcode || '',
        category: data.product.category,
        unit: data.product.unit,
        purchasePrice: String(data.product.purchasePrice),
        sellingPrice: String(data.product.sellingPrice),
        taxRate: String(data.product.taxRate),
        lowStockAlert: String(data.product.lowStockAlert),
        description: data.product.description || '',
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching product');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustQty) return;

    setAdjusting(true);
    try {
      const res = await fetch(`/api/inventory/${id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantityAdjustment: parseFloat(adjustQty),
          reason: adjustReason.trim() || 'Manual stock adjustment',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to adjust stock.');
      }

      setAdjustModalOpen(false);
      setAdjustQty('');
      setAdjustReason('');
      toast.success('Stock adjusted successfully');
      fetchProduct();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error adjusting stock');
    } finally {
      setAdjusting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          sku: editForm.sku,
          barcode: editForm.barcode || null,
          category: editForm.category,
          unit: editForm.unit,
          purchasePrice: parseFloat(editForm.purchasePrice) || 0,
          sellingPrice: parseFloat(editForm.sellingPrice) || 0,
          taxRate: parseFloat(editForm.taxRate) || 0,
          lowStockAlert: parseFloat(editForm.lowStockAlert) || 10,
          description: editForm.description || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update product.');
      }

      setEditModalOpen(false);
      toast.success('Product updated successfully');
      fetchProduct();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error updating product');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!product) return;
    const nextState = !product.isActive;
    if (
      !confirm(
        `Are you sure you want to ${nextState ? 'restore' : 'archive'} "${product.name}"?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextState }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to toggle status.');
      }
      toast.success(`Product ${nextState ? 'restored' : 'archived'} successfully`);
      fetchProduct();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error toggling product status');
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
        Loading product details and movement ledger...
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="p-8 text-center text-rose-600 text-xs">
        <AlertCircle className="w-6 h-6 mx-auto mb-2 text-rose-500" />
        <p className="font-bold text-sm text-slate-900">{error || 'Product not found'}</p>
        <Link
          href="/inventory"
          className="mt-4 inline-block px-4 py-2 bg-slate-900 text-white rounded-xl font-semibold"
        >
          Return to Inventory
        </Link>
      </div>
    );
  }

  const isOutOfStock = product.currentStock <= 0;
  const isLowStock = product.currentStock > 0 && product.currentStock <= product.lowStockAlert;
  const profitMargin =
    product.sellingPrice > 0
      ? Math.round(
          ((product.sellingPrice - product.purchasePrice) / product.sellingPrice) * 100
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Back and Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
              } else {
                router.push('/inventory');
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
              <span className="font-mono text-xs text-slate-500">{product.sku}</span>
              {isOutOfStock ? (
                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  Out of Stock
                </span>
              ) : isLowStock ? (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Low Stock Alert
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Healthy Stock
                </span>
              )}
              {!product.isActive && (
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  Archived
                </span>
              )}
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 mt-0.5">{product.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />
            Edit
          </button>

          <button
            onClick={handleToggleArchive}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition-colors"
          >
            <Archive className="w-3.5 h-3.5" />
            {product.isActive ? 'Archive' : 'Restore'}
          </button>

          <button
            onClick={() => setAdjustModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white hover:bg-blue-500 text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            Adjust Stock
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">Current Stock</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {product.currentStock}{' '}
            <span className="text-xs font-normal text-slate-500">{product.unit}</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Low stock trigger: {product.lowStockAlert} {product.unit}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">Unit Cost vs Selling</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            ₹{product.sellingPrice.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Cost: ₹{product.purchasePrice.toLocaleString('en-IN')} ({profitMargin}% margin)
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">Inventory Value (Cost)</span>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">
            ₹{Math.max(0, product.currentStock * product.purchasePrice).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Retail: ₹{Math.max(0, product.currentStock * product.sellingPrice).toLocaleString('en-IN')}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">Tax & Classification</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{product.taxRate}% GST</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Category: {product.category}</span>
        </div>
      </div>

      {/* Stock Movement Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-sm text-slate-900">Auditable Stock Movement Ledger</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {product.stockMovements?.length || 0} Movements
          </span>
        </div>

        {!product.stockMovements || product.stockMovements.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No stock movements recorded yet for this item.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4">Quantity Change</th>
                  <th className="py-3 px-4">Previous Stock</th>
                  <th className="py-3 px-4">Balance Stock</th>
                  <th className="py-3 px-4">Document Ref</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {product.stockMovements.map((m) => {
                  const isPositive = m.quantity > 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            m.type === 'PURCHASE_RECEIVED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : m.type === 'SALE_DEDUCTION'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : m.type === 'SALE_RETURN'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : m.type === 'PURCHASE_RETURN'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {m.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-extrabold whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-0.5 ${
                            isPositive ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                          {isPositive ? `+${m.quantity}` : m.quantity} {product.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {m.previousStock} {product.unit}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                        {m.newStock} {product.unit}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {m.sourceDocumentType ? (
                          <span className="text-[11px]">
                            {m.sourceDocumentType}:{' '}
                            {m.sourceDocumentId ? m.sourceDocumentId.slice(-6) : '-'}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {m.actorName || 'System'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {m.reason || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {adjustModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Adjust Stock</h3>
                <p className="text-xs text-slate-500">{product.name}</p>
              </div>
              <button
                onClick={() => setAdjustModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between">
                <div>
                  <span className="text-slate-500 block">Available Stock</span>
                  <span className="text-sm font-extrabold text-slate-900">
                    {product.currentStock} {product.unit}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">New Projected Stock</span>
                  <span className="text-sm font-extrabold text-blue-600">
                    {product.currentStock + (parseFloat(adjustQty) || 0)} {product.unit}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Quantity Adjustment (+ to add, - to deduct)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. +20 or -5"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Audit Reason <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual physical count / transit defect"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjusting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-500 disabled:opacity-50"
                >
                  {adjusting ? 'Updating...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Edit Product</h3>
                <p className="text-xs text-slate-500">{product.name}</p>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">SKU</label>
                  <input
                    type="text"
                    required
                    value={editForm.sku}
                    onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Barcode</label>
                  <input
                    type="text"
                    value={editForm.barcode}
                    onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={editForm.unit}
                    onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cost Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.purchasePrice}
                    onChange={(e) => setEditForm({ ...editForm, purchasePrice: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Selling Rate</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.sellingPrice}
                    onChange={(e) => setEditForm({ ...editForm, sellingPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GST %</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.taxRate}
                    onChange={(e) => setEditForm({ ...editForm, taxRate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Low Stock Alert Level
                </label>
                <input
                  type="number"
                  step="1"
                  value={editForm.lowStockAlert}
                  onChange={(e) => setEditForm({ ...editForm, lowStockAlert: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-slate-400 text-xs">Loading product profile...</div>}
    >
      <ProductDetailContent params={params} />
    </Suspense>
  );
}
