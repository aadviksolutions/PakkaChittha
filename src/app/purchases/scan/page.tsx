'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Camera,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
  ArrowLeft,
  Sparkles,
  Lock,
  ChevronRight,
  Eye,
  RefreshCw,
  Layers,
  HelpCircle,
  PackageCheck,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useEntitlements } from '@/hooks/useEntitlements';
import { FeatureNotAvailable } from '@/components/shared/FeatureNotAvailable';
import { ExtractedPurchaseItem, ScannedBillAnalysisResult } from '@/lib/ocr/purchaseBillParser';

export default function PurchaseScanPage() {
  const router = useRouter();
  const toast = useToast();
  const { isAllowed, planName } = useEntitlements();
  const canScan = isAllowed('canScanPurchaseBills');
  const canImport = isAllowed('canImportScannedPurchases');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Workflow states: 'IDLE' | 'SCANNING' | 'REVIEW' | 'SUCCESS'
  const [step, setStep] = useState<'IDLE' | 'SCANNING' | 'REVIEW' | 'SUCCESS'>('IDLE');
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [scannedBillUrl, setScannedBillUrl] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [duplicateMsg, setDuplicateMsg] = useState<string | null>(null);

  // Editable bill data
  const [supplierName, setSupplierName] = useState('');
  const [supplierGstin, setSupplierGstin] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<ExtractedPurchaseItem[]>([]);
  const [rawGrandTotal, setRawGrandTotal] = useState(0);

  const [importing, setImporting] = useState(false);
  const [createdPurchaseInfo, setCreatedPurchaseInfo] = useState<any>(null);

  if (!canScan || !canImport) {
    return (
      <FeatureNotAvailable
        featureName="Purchase Bill Scanning & AI Inventory Import"
        requiredPlanName="Pakka Chittha Scale"
        description="Smart OCR bill extraction, line-item parsing, and automatic inventory stock updates are exclusively available on Pakka Chittha Scale (highest plan)."
      />
    );
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    // Create local preview
    const previewUrl = URL.createObjectURL(file);
    setSelectedImagePreview(previewUrl);
    setStep('SCANNING');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/purchases/scan', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to scan bill');
      }

      const analysis: ScannedBillAnalysisResult = data.analysis;
      setScannedBillUrl(data.scannedBillUrl);
      setSupplierName(analysis.supplierName || '');
      setSupplierGstin(analysis.supplierGstin || '');
      setSupplierPhone(analysis.supplierPhone || '');
      setInvoiceNumber(analysis.invoiceNumber || '');
      setPurchaseDate(analysis.purchaseDate || new Date().toISOString().split('T')[0]);
      setItems(analysis.items || []);
      setRawGrandTotal(analysis.grandTotal || 0);

      setIsDuplicate(data.isPossibleDuplicate || false);
      setDuplicateMsg(data.duplicateMessage || null);

      setStep('REVIEW');
      toast.success('Bill scanned! Please verify line items and totals.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error scanning bill');
      setStep('IDLE');
    }
  };

  const handleItemChange = (index: number, field: keyof ExtractedPurchaseItem, value: any) => {
    const next = [...items];
    const item = { ...next[index], [field]: value };

    if (field === 'quantity' || field === 'purchaseRate' || field === 'discount' || field === 'taxRate') {
      const qty = Math.max(0.001, Number(item.quantity || 1));
      const rate = Math.max(0, Number(item.purchaseRate || 0));
      const disc = Math.max(0, Number(item.discount || 0));
      const taxRate = Math.max(0, Number(item.taxRate || 0));

      const lineTaxable = Math.max(0, qty * rate - disc);
      const lineTax = Math.round(lineTaxable * (taxRate / 100) * 100) / 100;
      item.lineTotal = Math.round((lineTaxable + lineTax) * 100) / 100;
    }

    next[index] = item;
    setItems(next);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: `custom_${Date.now()}`,
        description: '',
        quantity: 1,
        unit: 'Pcs',
        purchaseRate: 0,
        discount: 0,
        taxRate: 18,
        lineTotal: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      toast.error('Purchase bill must contain at least one line item.');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const calculatedItemsTotal = Math.round(items.reduce((acc, it) => acc + (it.lineTotal || 0), 0) * 100) / 100;
  const discrepancy = Math.abs(calculatedItemsTotal - rawGrandTotal);
  const hasDiscrepancy = rawGrandTotal > 0 && discrepancy > 1.0;

  const handleConfirmImport = async () => {
    if (!supplierName.trim()) {
      toast.error('Please enter the Supplier / Shop Name.');
      return;
    }

    if (items.some((it) => !it.description.trim() || it.quantity <= 0 || it.purchaseRate <= 0)) {
      toast.error('All items must have a valid description, quantity > 0, and purchase rate > 0.');
      return;
    }

    setImporting(true);
    try {
      const res = await fetch('/api/purchases/scan/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierName,
          supplierGstin: supplierGstin || undefined,
          supplierPhone: supplierPhone || undefined,
          supplierInvoiceNumber: invoiceNumber || undefined,
          purchaseDate,
          items,
          scannedBillUrl,
          ocrData: {
            rawGrandTotal,
            scannedAt: new Date().toISOString(),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to import purchase.');
      }

      setCreatedPurchaseInfo(data);
      setStep('SUCCESS');
      toast.success(data.message || 'Items successfully added to inventory!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error importing items');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Hidden File & Camera Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Top Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/purchases"
            className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Purchases
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Scan Purchase Bill &amp; Import to Stock
            </h1>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" />
              Pakka Chittha Scale
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Capture vendor paper bills with camera or upload photos to auto-extract line items and increase stock.
          </p>
        </div>
      </div>

      {/* STEP 1: IDLE / UPLOAD */}
      {step === 'IDLE' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 shadow-xs text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 mx-auto flex items-center justify-center">
            <Camera className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-lg font-black text-slate-900">Upload or Snap Purchase Invoice</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Place the bill on a flat surface with good lighting. Our system extracts supplier name, invoice date, products, quantities, tax, and rates.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Camera className="w-4 h-4" />
              <span>Take Photo with Camera</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-800 font-bold text-xs rounded-xl hover:bg-slate-200 border border-slate-200 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Choose from Device / Gallery</span>
            </button>
          </div>

          <div className="pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-2xl mx-auto">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
              <span className="text-[11px] font-bold text-slate-900 block mb-0.5">1. Scan &amp; OCR</span>
              <p className="text-[10px] text-slate-500">Auto-identifies supplier, GSTIN, items, rates, and taxes.</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
              <span className="text-[11px] font-bold text-slate-900 block mb-0.5">2. Review &amp; Edit</span>
              <p className="text-[10px] text-slate-500">You retain 100% control to review, edit, or fix OCR fields.</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
              <span className="text-[11px] font-bold text-slate-900 block mb-0.5">3. Add to Stock</span>
              <p className="text-[10px] text-slate-500">Stock counts &amp; purchase ledger update in one transaction.</p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: SCANNING / PROCESSING LOADER */}
      {step === 'SCANNING' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-12 shadow-xs text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 mx-auto flex items-center justify-center animate-spin">
            <RefreshCw className="w-8 h-8" />
          </div>
          <h2 className="text-base font-black text-slate-900">Scanning &amp; Analyzing Purchase Bill...</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Extracting text, finding supplier GSTIN, reading line items, and validating tax subtotals.
          </p>
        </div>
      )}

      {/* STEP 3: REVIEW SCREEN */}
      {step === 'REVIEW' && (
        <div className="space-y-6">
          {/* Safeguard Warnings */}
          {isDuplicate && duplicateMsg && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-start gap-3 text-xs text-rose-900 shadow-2xs">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-black text-rose-950 uppercase tracking-wider block">
                  Possible Duplicate Bill Detected!
                </strong>
                <p className="mt-0.5">{duplicateMsg}</p>
                <p className="mt-1 font-semibold text-rose-800">
                  Please verify before adding to avoid duplicate inventory increases.
                </p>
              </div>
            </div>
          )}

          {hasDiscrepancy && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3 text-xs text-amber-900 shadow-2xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-amber-950 block">Totals Discrepancy Notice</strong>
                <p className="mt-0.5">
                  Sum of extracted line items is <strong>₹{calculatedItemsTotal.toFixed(2)}</strong>, but the bill grand total indicates <strong>₹{rawGrandTotal.toFixed(2)}</strong> (Difference: ₹{discrepancy.toFixed(2)}).
                </p>
                <p className="text-[11px] text-amber-800 mt-1">
                  Please adjust the item quantities, unit rates, or tax rates below to match your paper bill.
                </p>
              </div>
            </div>
          )}

          {/* Form & Line Items */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-900">Review &amp; Confirm Extracted Bill</h2>
                <p className="text-xs text-slate-500">
                  Verify or edit supplier info and products before recording this purchase into inventory.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setStep('IDLE')}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                ← Scan another image
              </button>
            </div>

            {/* Bill Header Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Supplier / Vendor Name *
                </label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  placeholder="e.g. Kirana Traders"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Supplier GSTIN (Optional)
                </label>
                <input
                  type="text"
                  value={supplierGstin}
                  onChange={(e) => setSupplierGstin(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  placeholder="27AABCU9603R1ZM"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Invoice / Bill Number
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  placeholder="e.g. INV-2026-42"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Extracted Line Items Table */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Extracted Line Items ({items.length})
                </h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Missing Item
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3 min-w-[200px]">Product / Description *</th>
                      <th className="py-2.5 px-3 w-24">Qty *</th>
                      <th className="py-2.5 px-3 w-20">Unit</th>
                      <th className="py-2.5 px-3 w-28">Cost (₹) *</th>
                      <th className="py-2.5 px-3 w-20">GST %</th>
                      <th className="py-2.5 px-3 w-28 text-right">Line Total</th>
                      <th className="py-2.5 px-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                            placeholder="Product Name"
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-hidden text-xs font-medium"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="0.001"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-hidden text-xs font-mono"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-hidden text-xs"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.purchaseRate}
                            onChange={(e) => handleItemChange(idx, 'purchaseRate', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-hidden text-xs font-mono"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={item.taxRate}
                            onChange={(e) => handleItemChange(idx, 'taxRate', parseFloat(e.target.value) || 0)}
                            className="w-full px-1.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{item.lineTotal?.toFixed(2) || '0.00'}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-md"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals Summary */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="text-xs text-slate-500">
                <span className="font-bold text-slate-900">Accuracy Guarantee:</span>
                Stock will be adjusted automatically for confirmed items. New product codes will be created if they do not exist.
              </div>

              <div className="text-right sm:min-w-[220px]">
                <div className="text-xs text-slate-500">Grand Total:</div>
                <div className="text-xl font-black text-slate-900 font-mono">
                  ₹{calculatedItemsTotal.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Confirm Import Action */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('IDLE')}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
              >
                Discard &amp; Cancel
              </button>

              <button
                type="button"
                disabled={importing}
                onClick={handleConfirmImport}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-all shadow-sm"
              >
                <PackageCheck className="w-4 h-4" />
                <span>{importing ? 'Updating Stock & Ledger...' : 'Confirm & Add to Inventory'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: SUCCESS STATE */}
      {step === 'SUCCESS' && createdPurchaseInfo && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 shadow-xs text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-black text-slate-900">Purchase Successfully Recorded!</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {createdPurchaseInfo.message} Stock counts have been updated and an audit trail has been created.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href={`/purchases/${createdPurchaseInfo.purchase?.id || ''}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors"
            >
              <FileText className="w-4 h-4" /> View Purchase Bill
            </Link>

            <Link
              href="/inventory"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-50 text-emerald-800 font-bold text-xs rounded-xl hover:bg-emerald-100 border border-emerald-200 transition-colors"
            >
              <PackageCheck className="w-4 h-4" /> View Stock in Inventory
            </Link>

            <button
              type="button"
              onClick={() => {
                setStep('IDLE');
                setSelectedImagePreview(null);
                setItems([]);
              }}
              className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Scan Another Bill
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
