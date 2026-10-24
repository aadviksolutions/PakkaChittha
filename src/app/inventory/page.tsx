'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import {
  Package,
  Plus,
  UploadCloud,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Eye,
  Edit2,
  Sliders,
  Archive,
  RefreshCw,
  X,
  FileText,
  Boxes,
  Camera,
  Image as ImageIcon,
  Sparkles,
  Upload,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useEntitlements } from '@/hooks/useEntitlements';
import { FeatureNotAvailable } from '@/components/shared/FeatureNotAvailable';
import { ProductImageUploader } from '@/components/inventory/ProductImageUploader';

interface Product {
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
  imageUrl?: string | null;
  isActive: boolean;
  createdAt: string;
}

interface ValuationData {
  totalItems: number;
  totalStockUnits: number;
  totalValuationCost: number;
  totalValuationRetail: number;
  potentialProfit: number;
  lowStockCount: number;
  outOfStockCount: number;
}

interface CsvValidationError {
  row: number;
  field: string;
  message: string;
}

const CATEGORIES = [
  'ALL',
  'General',
  'Cement',
  'Steel & TMT',
  'Paints & Primers',
  'Plumbing',
  'Electrical',
  'Hardware',
  'Sanitaryware',
  'Tools & Safety',
];

const COMMON_UNITS = [
  'Pcs',
  'Kg',
  'Gram',
  'Litre',
  'Ml',
  'Box',
  'Packet',
  'Dozen',
  'Nos',
  'Bags',
  'Boxes',
  'Mtr',
  'Bundles',
  'Buckets',
  'Set',
  'Bottle',
];
const GST_RATES = [0, 5, 12, 18, 28];

function InventoryContent() {
  const { toast } = useToast();
  const { canAccessCommercial } = useEntitlements();
  const [products, setProducts] = useState<Product[]>([]);
  const [valuation, setValuation] = useState<ValuationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);

  // Add Product Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: 'General',
    unit: 'Pcs',
    purchasePrice: '',
    sellingPrice: '',
    taxRate: '18',
    openingStock: '0',
    lowStockAlert: '10',
    description: '',
    imageUrl: '',
  });


  // Stock Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  // CSV Import Modal
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvPreview, setCsvPreview] = useState<{
    validCount: number;
    errorCount: number;
    errors: CsvValidationError[];
    previewRows: any[];
  } | null>(null);
  const [csvAnalyzing, setCsvAnalyzing] = useState(false);
  const [csvCommitting, setCsvCommitting] = useState(false);
  const [csvSuccess, setCsvSuccess] = useState<string | null>(null);

  const fetchInventory = useCallback(async () => {
    if (!canAccessCommercial) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('query', search.trim());
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      if (lowStockOnly) params.append('lowStockOnly', 'true');
      if (includeArchived) params.append('includeArchived', 'true');

      const res = await fetch(`/api/inventory?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch inventory.');
      }
      setProducts(data.products || []);
      setValuation(data.valuation || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching inventory');
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, lowStockOnly, includeArchived]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) return;

    setCreating(true);
    try {
      const resolvedSku =
        addForm.sku.trim() ||
        `${addForm.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase() || 'ITEM'}-${Math.floor(1000 + Math.random() * 9000)}`;

      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name.trim(),
          sku: resolvedSku,
          barcode: addForm.barcode.trim() || null,
          category: addForm.category.trim() || 'General',
          unit: addForm.unit || 'Pcs',
          purchasePrice: parseFloat(addForm.purchasePrice) || 0,
          sellingPrice: parseFloat(addForm.sellingPrice) || 0,
          taxRate: parseFloat(addForm.taxRate) || 0,
          openingStock: parseFloat(addForm.openingStock) || 0,
          lowStockAlert: parseFloat(addForm.lowStockAlert) || 10,
          description: addForm.description.trim() || null,
          imageUrl: addForm.imageUrl || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create product.');
      }

      setAddModalOpen(false);
      setAddForm({
        name: '',
        sku: '',
        barcode: '',
        category: 'General',
        unit: 'Pcs',
        purchasePrice: '',
        sellingPrice: '',
        taxRate: '18',
        openingStock: '0',
        lowStockAlert: '10',
        description: '',
        imageUrl: '',
      });
      toast.success('Product created successfully!');
      fetchInventory();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error creating product');
    } finally {
      setCreating(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProduct || !adjustQty) return;

    setAdjusting(true);
    try {
      const res = await fetch(`/api/inventory/${adjustProduct.id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantityAdjustment: parseFloat(adjustQty),
          reason: adjustReason.trim() || 'Manual stock reconciliation',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to adjust stock.');
      }

      toast.success('Stock adjusted successfully!');
      setAdjustModalOpen(false);
      setAdjustProduct(null);
      setAdjustQty('');
      setAdjustReason('');
      fetchInventory();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Stock adjustment failed');
    } finally {
      setAdjusting(false);
    }
  };

  const handlePreviewCsv = async () => {
    if (!csvText.trim()) return;
    setCsvAnalyzing(true);
    setCsvSuccess(null);
    try {
      const res = await fetch('/api/inventory/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText, action: 'preview' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to analyze CSV.');
      }
      setCsvPreview(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'CSV parsing failed');
    } finally {
      setCsvAnalyzing(false);
    }
  };

  const handleCommitCsv = async () => {
    setCsvCommitting(true);
    try {
      const res = await fetch('/api/inventory/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText, action: 'commit', strict: false }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to commit CSV.');
      }
      const msg = `Successfully imported ${data.importedCount} products into catalog.`;
      setCsvSuccess(msg);
      toast.success(msg);
      setCsvPreview(null);
      setCsvText('');
      fetchInventory();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'CSV import failed');
    } finally {
      setCsvCommitting(false);
    }
  };

  if (!canAccessCommercial) {
    return (
      <FeatureNotAvailable
        featureName="Product Catalog & Stock Management"
        requiredPlanName="Starter, Growth or Scale"
        description="Inventory management, stock tracking, and pricing catalogues are commercial features available on Starter, Growth, and Scale plans."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Boxes className="w-3.5 h-3.5" />
              Phase 4 Inventory
            </span>
            <span className="text-xs text-slate-400 font-mono">Stock Movement Ledger</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Products & Stock Control</h1>
          <p className="text-sm text-slate-500">
            Real-time stock valuation, reorder thresholds, and multi-tenant ledger movements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCsvSuccess(null);
              setCsvPreview(null);
              setCsvModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl shadow-2xs transition-colors"
          >
            <UploadCloud className="w-4 h-4 text-slate-500" />
            Import CSV
          </button>

          <button
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            Add Product
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {valuation && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Catalog Size</span>
              <Package className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-2">
              {valuation.totalItems}{' '}
              <span className="text-xs font-medium text-slate-500 font-sans">items</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {valuation.totalStockUnits.toLocaleString('en-IN')} units on hand
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Inventory Valuation (Cost)</span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-2">
              ₹{valuation.totalValuationCost.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-600 mt-1">
              Retail: ₹{valuation.totalValuationRetail.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Low Stock Alerts</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-extrabold text-amber-700 mt-2">
              {valuation.lowStockCount}{' '}
              <span className="text-xs font-medium text-amber-600">items</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Below minimum reorder level</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Out of Stock</span>
              <AlertCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-xl font-extrabold text-rose-700 mt-2">
              {valuation.outOfStockCount}{' '}
              <span className="text-xs font-medium text-rose-600">items</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Zero or negative inventory</div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by product name, SKU, barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 select-none">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => setLowStockOnly(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
              />
              <span>Low Stock Only</span>
            </label>

            <button
              onClick={fetchInventory}
              title="Refresh Catalog"
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-xs">
          <span className="text-slate-400 text-[11px] font-semibold uppercase mr-1">Category:</span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
            Loading product catalog...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-xs">
            <AlertCircle className="w-5 h-5 mx-auto mb-1 text-rose-500" />
            {error}
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No products found</p>
            <p className="text-slate-400 mt-1">
              Add your first inventory product or import a CSV catalog.
            </p>
            <button
              onClick={() => setAddModalOpen(true)}
              className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
            >
              + Create Product
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Product Cards (< md) */}
            <div className="md:hidden divide-y divide-slate-100">
              {products.map((p) => {
                const isOutOfStock = p.currentStock <= 0;
                const isLowStock = p.currentStock > 0 && p.currentStock <= p.lowStockAlert;

                return (
                  <div key={p.id} className="p-4 space-y-2.5 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200">
                            <Package className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/inventory/${p.id}`}
                            className="font-bold text-slate-900 text-sm hover:text-blue-600 transition-colors block truncate"
                          >
                            {p.name}
                          </Link>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                            <span>SKU: {p.sku}</span>
                            <span>•</span>
                            <span>{p.category}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-extrabold text-slate-900 text-sm">
                          ₹{p.sellingPrice.toLocaleString('en-IN')}
                        </span>
                        <p className="text-[10px] text-slate-400">per {p.unit}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100/70">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">
                          {p.currentStock} {p.unit}
                        </span>
                        {isOutOfStock ? (
                          <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 inline-flex items-center gap-0.5">
                            <AlertCircle className="w-2.5 h-2.5" /> Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 inline-flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> Low
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 inline-flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" /> In Stock
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustProduct(p);
                            setAdjustQty('');
                            setAdjustReason('');
                            setAdjustModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>Adjust</span>
                        </button>
                        <Link
                          href={`/inventory/${p.id}`}
                          className="p-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                          title="View Ledger"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Item & Code</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Cost Price</th>
                    <th className="py-3 px-4">Selling Rate</th>
                    <th className="py-3 px-4">Tax %</th>
                    <th className="py-3 px-4">Current Stock</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {products.map((p) => {
                    const isOutOfStock = p.currentStock <= 0;
                    const isLowStock = p.currentStock > 0 && p.currentStock <= p.lowStockAlert;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {p.imageUrl ? (
                              <img
                                src={p.imageUrl}
                                alt={p.name}
                                className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200">
                                <Package className="w-4 h-4 text-slate-400" />
                              </div>
                            )}
                            <div>
                              <Link
                                href={`/inventory/${p.id}`}
                                className="font-bold text-slate-900 hover:text-blue-600 transition-colors block"
                              >
                                {p.name}
                              </Link>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                                <span>SKU: {p.sku}</span>
                                {p.barcode && <span>• Barcode: {p.barcode}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-600">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px]">
                            {p.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          ₹{p.purchasePrice.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-slate-900">
                          ₹{p.sellingPrice.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500">{p.taxRate}%</td>
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-slate-900">
                            {p.currentStock}{' '}
                            <span className="text-[11px] font-normal text-slate-500">{p.unit}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">Alert: {p.lowStockAlert}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          {isOutOfStock ? (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 inline-flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Out of Stock
                            </span>
                          ) : isLowStock ? (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Low Stock
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> In Stock
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setAdjustProduct(p);
                                setAdjustQty('');
                                setAdjustReason('');
                                setAdjustModalOpen(true);
                              }}
                              title="Adjust Stock Quantity"
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                            >
                              <Sliders className="w-3.5 h-3.5 text-blue-600" />
                            </button>
                            <Link
                              href={`/inventory/${p.id}`}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                              title="View Stock Movement Ledger"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add Product Modal (Shopkeeper-Simplified: Essential fields first) */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Add New Product</h3>
                <p className="text-xs text-slate-500">Add a product in seconds</p>
              </div>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              {/* Essential Field 1: Product Name */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UltraTech Cement 50kg or Parle-G Biscuit"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-hidden font-medium text-xs"
                />
              </div>

              {/* Essential Fields 2 & 3: Selling Price & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Selling Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    placeholder="0.00"
                    value={addForm.sellingPrice}
                    onChange={(e) => setAddForm({ ...addForm, sellingPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-hidden font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Unit <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={addForm.unit}
                    onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-hidden font-medium text-xs"
                  >
                    {COMMON_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Essential Fields 4 & 5: GST Rate & Opening Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GST Tax Rate</label>
                  <select
                    value={addForm.taxRate}
                    onChange={(e) => setAddForm({ ...addForm, taxRate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-hidden font-mono text-xs"
                  >
                    {GST_RATES.map((r) => (
                      <option key={r} value={r}>
                        {r}% GST
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Opening Stock (Optional)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={addForm.openingStock}
                    onChange={(e) => setAddForm({ ...addForm, openingStock: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-hidden font-mono text-xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Defaults to 0</p>
                </div>
              </div>

              {/* Collapsible Additional Details */}
              <details className="group border border-slate-200 rounded-xl p-3 bg-slate-50/60 space-y-3">
                <summary className="font-semibold text-slate-700 cursor-pointer flex items-center justify-between hover:text-slate-900">
                  <span>+ Additional Details (SKU, Barcode, Cost, Alert)</span>
                  <span className="text-slate-400 group-open:rotate-180 transition-transform text-[10px]">▼</span>
                </summary>

                <div className="pt-3 border-t border-slate-200/80 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">
                        SKU / Item Code
                      </label>
                      <input
                        type="text"
                        placeholder="Auto-generated if blank"
                        value={addForm.sku}
                        onChange={(e) => setAddForm({ ...addForm, sku: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-hidden font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Barcode (EAN/UPC)</label>
                      <input
                        type="text"
                        placeholder="Optional barcode"
                        value={addForm.barcode}
                        onChange={(e) => setAddForm({ ...addForm, barcode: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-hidden font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Category</label>
                      <input
                        type="text"
                        list="category-suggestions"
                        value={addForm.category}
                        onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-hidden text-xs"
                      />
                      <datalist id="category-suggestions">
                        {CATEGORIES.filter((c) => c !== 'ALL').map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Purchase / Cost Price (₹)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0.00"
                        value={addForm.purchasePrice}
                        onChange={(e) => setAddForm({ ...addForm, purchasePrice: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-hidden font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Low Stock Alert Qty</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="10"
                      value={addForm.lowStockAlert}
                      onChange={(e) => setAddForm({ ...addForm, lowStockAlert: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-hidden font-mono text-xs"
                    />
                  </div>

                  {/* Product Image Upload */}
                  <div className="flex items-center gap-2">
                    <ProductImageUploader
                      value={addForm.imageUrl || null}
                      onChange={(url: string | null) => setAddForm({ ...addForm, imageUrl: url || '' })}
                      productId={undefined}
                      disabled={creating}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Description / Notes</label>
                    <textarea
                      rows={2}
                      placeholder="Optional specifications or storage location..."
                      value={addForm.description}
                      onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-hidden text-xs"
                    />
                  </div>
                </div>
              </details>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {creating ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustModalOpen && adjustProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Adjust Stock</h3>
                <p className="text-xs text-slate-500">{adjustProduct.name}</p>
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
                    {adjustProduct.currentStock} {adjustProduct.unit}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">New Projected Stock</span>
                  <span className="text-sm font-extrabold text-blue-600">
                    {adjustProduct.currentStock + (parseFloat(adjustQty) || 0)} {adjustProduct.unit}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Quantity Change (+ to add, - to reduce)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. +10 or -5"
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
                  placeholder="e.g. Physical inventory count / Damaged stock"
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

      {/* CSV Import Modal */}
      {csvModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Bulk Catalog CSV Import
                </h3>
                <p className="text-xs text-slate-500">
                  Import products with row-level error validation and preview
                </p>
              </div>
              <button
                onClick={() => setCsvModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {csvSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{csvSuccess}</span>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-semibold text-slate-700">Paste CSV Content</label>
                    <button
                      type="button"
                      onClick={() =>
                        setCsvText(
                          'name,sku,category,unit,purchasePrice,sellingPrice,taxRate,openingStock,lowStockAlert\nUltraTech Cement 50kg,CEM-UT-50,Cement,Bags,340,380,18,100,20\nKamdhenu Steel 12mm,STL-12,Steel,Kg,65,72,18,500,50\nAsian Paints Apex 20L,PNT-APX-20,Paints,Buckets,3200,3800,28,25,5'
                        )
                      }
                      className="text-blue-600 hover:underline text-[11px]"
                    >
                      Fill sample CSV template
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    placeholder="name,sku,category,unit,purchasePrice,sellingPrice,taxRate,openingStock,lowStockAlert&#10;Product A,SKU-A,General,Pcs,100,150,18,50,10"
                    value={csvText}
                    onChange={(e) => {
                      setCsvText(e.target.value);
                      setCsvPreview(null);
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-[11px]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Columns: <code>name</code>, <code>sku</code>, <code>category</code>,{' '}
                    <code>unit</code>, <code>purchasePrice</code>, <code>sellingPrice</code>,{' '}
                    <code>taxRate</code>, <code>openingStock</code>, <code>lowStockAlert</code>
                  </p>
                </div>

                {!csvPreview && (
                  <button
                    onClick={handlePreviewCsv}
                    disabled={!csvText.trim() || csvAnalyzing}
                    className="w-full py-2 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-50"
                  >
                    {csvAnalyzing ? 'Validating CSV Rows...' : 'Validate & Preview CSV'}
                  </button>
                )}

                {csvPreview && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
                        <span className="text-[11px] block">Valid Rows</span>
                        <span className="text-lg font-bold">{csvPreview.validCount}</span>
                      </div>
                      <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900">
                        <span className="text-[11px] block">Errors Found</span>
                        <span className="text-lg font-bold">{csvPreview.errorCount}</span>
                      </div>
                    </div>

                    {csvPreview.errors.length > 0 && (
                      <div className="bg-rose-50/50 rounded-xl p-3 border border-rose-100 max-h-40 overflow-y-auto">
                        <span className="font-bold text-rose-800 block mb-1">
                          Row Validation Issues:
                        </span>
                        <ul className="space-y-1 text-[11px] text-rose-700 list-disc pl-4">
                          {csvPreview.errors.map((err, i) => (
                            <li key={i}>
                              <strong>Row {err.row}:</strong> [{err.field}] {err.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {csvPreview.previewRows.length > 0 && (
                      <div>
                        <span className="font-semibold text-slate-700 block mb-1">
                          Preview Sample ({csvPreview.previewRows.length} items):
                        </span>
                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                          <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-[9px]">
                              <tr>
                                <th className="p-2">Name</th>
                                <th className="p-2">SKU</th>
                                <th className="p-2">Cost</th>
                                <th className="p-2">Selling</th>
                                <th className="p-2">Stock</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {csvPreview.previewRows.map((r, i) => (
                                <tr key={i}>
                                  <td className="p-2 font-medium">{r.name}</td>
                                  <td className="p-2 font-mono text-slate-500">{r.sku}</td>
                                  <td className="p-2">₹{r.purchasePrice}</td>
                                  <td className="p-2">₹{r.sellingPrice}</td>
                                  <td className="p-2 font-bold">{r.openingStock}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setCsvPreview(null)}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50"
                      >
                        Reset / Re-edit
                      </button>
                      <button
                        onClick={handleCommitCsv}
                        disabled={csvPreview.validCount === 0 || csvCommitting}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {csvCommitting
                          ? 'Importing...'
                          : `Commit Import (${csvPreview.validCount} Valid Items)`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-slate-400 text-xs">Loading inventory catalog...</div>}
    >
      <InventoryContent />
    </Suspense>
  );
}
