'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FileText,
  ArrowLeft,
  Plus,
  Trash2,
  Users,
  Building,
  Calendar,
  Sparkles,
  Phone,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface CustomerOption {
  id: string;
  name: string;
  mobile: string;
  gstin?: string | null;
  billingAddress?: string | null;
}

interface ProductOption {
  id: string;
  name: string;
  sellingPrice: number;
  taxRate: number;
  hsnCode?: string | null;
  unit: string;
  currentStock: number;
}

interface LineItemState {
  id: string;
  productId?: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  rate: number;
  discount: number;
  taxRate: number;
}

function NewQuotationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editQuotationId = searchParams.get('edit') || '';
  const isEditMode = Boolean(editQuotationId);
  const { activeBusiness } = useAuth();
  const { toast } = useToast();

  const [loadingQuotation, setLoadingQuotation] = useState(false);
  const [editQuotationNumber, setEditQuotationNumber] = useState('');

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customCustomer, setCustomCustomer] = useState({
    name: '',
    mobile: '',
    gstin: '',
    billingAddress: '',
  });
  const [isNewCustomer, setIsNewCustomer] = useState(false);

  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0]);
  const defaultValid = new Date();
  defaultValid.setDate(defaultValid.getDate() + 30);
  const [validUntil, setValidUntil] = useState(defaultValid.toISOString().split('T')[0]);

  const [gstType, setGstType] = useState<'CGST_SGST' | 'IGST' | 'EXEMPT'>('CGST_SGST');
  const [isTaxInclusive, setIsTaxInclusive] = useState(false);
  const [notes, setNotes] = useState('Thank you for considering our proposal. Please reach out if you have any questions.');
  const [terms, setTerms] = useState(
    '1. Prices quoted are valid for 30 days from date of quotation.\n2. Delivery timeline as mutually agreed upon confirmation.\n3. Taxes applicable as per prevailing statutory rates.'
  );

  const [items, setItems] = useState<LineItemState[]>([
    {
      id: '1',
      description: '',
      hsnCode: '',
      quantity: 1,
      unit: 'Pcs',
      rate: 0,
      discount: 0,
      taxRate: 18,
    },
  ]);

  const [submitting, setSubmitting] = useState(false);

  // Load existing customers and products
  useEffect(() => {
    async function loadData() {
      try {
        const [cRes, pRes] = await Promise.all([
          fetch('/api/customers'),
          fetch('/api/inventory'),
        ]);
        const cData = await cRes.json();
        const pData = await pRes.json();
        if (cData.customers) setCustomers(cData.customers);
        if (pData.products) setProducts(pData.products);
      } catch (err) {
        console.error('Error prefetching data:', err);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!editQuotationId) return;
    let active = true;
    setLoadingQuotation(true);
    fetch(`/api/quotations/${editQuotationId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        if (!d.success || !d.quotation) {
          throw new Error(d.error || 'Quotation not found');
        }
        const q = d.quotation;
        setEditQuotationNumber(q.quotationNumber || '');
        setIsNewCustomer(false);
        setSelectedCustomerId(q.customerId || '');
        if (q.quotationDate) setQuotationDate(String(q.quotationDate).slice(0, 10));
        if (q.validUntil) setValidUntil(String(q.validUntil).slice(0, 10));
        if (q.gstType === 'CGST_SGST' || q.gstType === 'IGST' || q.gstType === 'EXEMPT') {
          setGstType(q.gstType);
        }
        setIsTaxInclusive(Boolean(q.isTaxInclusive));
        setNotes(q.notes || '');
        setTerms(q.termsAndConditions || '');
        if (Array.isArray(q.items) && q.items.length > 0) {
          setItems(
            q.items.map((it: {
              id?: string;
              productId?: string | null;
              description: string;
              hsnCode?: string | null;
              quantity: number;
              unit?: string;
              rate: number;
              discount?: number;
              taxRate?: number;
            }, idx: number) => ({
              id: it.id || String(idx + 1),
              productId: it.productId || undefined,
              description: it.description || '',
              hsnCode: it.hsnCode || '',
              quantity: Number(it.quantity) || 1,
              unit: it.unit || 'Pcs',
              rate: Number(it.rate) || 0,
              discount: Number(it.discount) || 0,
              taxRate: Number(it.taxRate) || 0,
            }))
          );
        }
      })
      .catch((err) => {
        if (!active) return;
        toast.error(err instanceof Error ? err.message : 'Failed to load quotation');
      })
      .finally(() => {
        if (active) setLoadingQuotation(false);
      });
    return () => {
      active = false;
    };
  }, [editQuotationId, toast]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        description: '',
        hsnCode: '',
        quantity: 1,
        unit: 'Pcs',
        rate: 0,
        discount: 0,
        taxRate: 18,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      toast.error('Quotation must have at least one line item.');
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleItemChange = (id: string, field: keyof LineItemState, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'productId') {
            const foundProduct = products.find((p) => p.id === value);
            if (foundProduct) {
              updated.description = foundProduct.name;
              updated.rate = foundProduct.sellingPrice;
              updated.taxRate = foundProduct.taxRate;
              updated.unit = foundProduct.unit || 'Pcs';
              updated.hsnCode = foundProduct.hsnCode || '';
            }
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Import contact using Contact Picker API
  const handleImportContact = async () => {
    if ('contacts' in navigator && 'ContactsManager' in window) {
      try {
        const contacts = await (navigator as any).contacts.select(['name', 'tel'], {
          multiple: false,
        });
        if (contacts && contacts[0]) {
          const c = contacts[0];
          const rawName = c.name?.[0] || '';
          const rawPhone = c.tel?.[0] || '';
          const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);

          setIsNewCustomer(true);
          setCustomCustomer((prev) => ({
            ...prev,
            name: rawName || prev.name,
            mobile: cleanPhone || prev.mobile,
          }));
          toast.success(`Contact "${rawName}" loaded!`);
        }
      } catch (err) {
        console.warn('Contact picker cancelled or failed:', err);
      }
    } else {
      toast.info('Direct contact picker not available in this browser. Please enter details manually.');
    }
  };

  // Math totals calculation
  const calculateTotals = () => {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    items.forEach((item) => {
      const gross = item.quantity * item.rate;
      const disc = Math.min(gross, item.discount || 0);
      const taxable = gross - disc;
      const tax = (taxable * (item.taxRate || 0)) / 100;

      subtotal += gross;
      discountTotal += disc;
      taxTotal += tax;
    });

    const total = Math.round(subtotal - discountTotal + taxTotal);
    return { subtotal, discountTotal, taxTotal, total };
  };

  const totals = calculateTotals();

  const handleSubmit = async (e: React.FormEvent, status: 'DRAFT' | 'SENT' = 'DRAFT') => {
    e.preventDefault();

    if (!selectedCustomerId && (!customCustomer.name || !customCustomer.mobile)) {
      toast.error('Please select an existing customer or enter customer details.');
      return;
    }

    if (items.some((i) => !i.description.trim() || i.quantity <= 0)) {
      toast.error('Please ensure all items have a description and quantity greater than 0.');
      return;
    }

    try {
      setSubmitting(true);
      let customerIdToUse = selectedCustomerId;

      // If new customer, create in customer directory first
      if (isNewCustomer || !customerIdToUse) {
        const custRes = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: customCustomer.name.trim(),
            mobile: customCustomer.mobile.trim(),
            gstin: customCustomer.gstin.trim() || undefined,
            billingAddress: customCustomer.billingAddress.trim() || undefined,
            openingBalance: 0,
          }),
        });
        const custData = await custRes.json();
        if (!custRes.ok || !custData.success) {
          throw new Error(custData.error || 'Failed to register customer');
        }
        customerIdToUse = custData.customer.id;
      }

      const payload = {
        customerId: customerIdToUse,
        quotationDate,
        validUntil,
        gstType,
        isTaxInclusive,
        isGstInvoice: gstType !== 'EXEMPT',
        status,
        notes,
        termsAndConditions: terms,
        items: items.map((i) => ({
          productId: i.productId || undefined,
          hsnCode: i.hsnCode || undefined,
          description: i.description,
          quantity: Number(i.quantity),
          unit: i.unit,
          rate: Number(i.rate),
          discount: Number(i.discount),
          taxRate: Number(i.taxRate),
        })),
      };

      const res = await fetch(isEditMode ? `/api/quotations/${editQuotationId}` : '/api/quotations', {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to ${isEditMode ? 'update' : 'create'} quotation`);
      }

      toast.success(
        isEditMode
          ? `Quotation ${data.quotation.quotationNumber} updated successfully!`
          : `Quotation ${data.quotation.quotationNumber} created successfully!`
      );
      router.push(`/quotations/${data.quotation.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error saving quotation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-3 pb-20 md:pb-8">
      {/* Compact Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <Link
            href="/quotations"
            className="p-1.5 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            title="Back to quotations"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
              {isEditMode
                ? `Edit Quotation${editQuotationNumber ? ` (${editQuotationNumber})` : ''}`
                : 'Create New Quotation'}
            </h1>
            <p className="text-[11px] text-slate-500">
              {activeBusiness?.name ? `${activeBusiness.name} • ` : ''}Generate quote with price estimates &amp; tax breakdown
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-900 text-white px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold">
            <span className="text-slate-300 font-sans text-[11px] font-normal">Total</span>
            <span className="text-emerald-400 tabular-nums">
              ₹{totals.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'DRAFT')}
            disabled={submitting}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'SENT')}
            disabled={submitting}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          >
            {submitting
              ? isEditMode
                ? 'Updating...'
                : 'Creating...'
              : isEditMode
                ? 'Update & Send'
                : 'Create & Send'}
          </button>
        </div>
      </div>

      {loadingQuotation && (
        <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 font-medium">
          Loading quotation details...
        </div>
      )}

      <form className="space-y-3 text-xs">
        {/* 1. Customer & Quotation Meta (Compact 2-Column Top Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          {/* Customer Selection Column */}
          <div className="md:col-span-6 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                Customer / Party *
              </label>

              <button
                type="button"
                onClick={handleImportContact}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                title="Select from Phone Contacts"
              >
                <Phone className="w-3 h-3" />
                <span>Import Contacts</span>
              </button>
            </div>

            {!isNewCustomer ? (
              <div className="space-y-1.5">
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    if (e.target.value === 'NEW') {
                      setIsNewCustomer(true);
                      setSelectedCustomerId('');
                    } else {
                      setSelectedCustomerId(e.target.value);
                    }
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-slate-900"
                >
                  <option value="">Select Existing Customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.mobile})
                    </option>
                  ))}
                  <option value="NEW">+ Add New Customer</option>
                </select>

                <p className="text-[11px] text-slate-500">
                  Or{' '}
                  <button
                    type="button"
                    onClick={() => setIsNewCustomer(true)}
                    className="text-emerald-700 font-bold hover:underline cursor-pointer"
                  >
                    enter custom details directly
                  </button>
                </p>
              </div>
            ) : (
              <div className="space-y-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800 text-[11px]">New Customer Info</span>
                  <button
                    type="button"
                    onClick={() => setIsNewCustomer(false)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Choose Existing
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Customer Name *"
                    value={customCustomer.name}
                    onChange={(e) => setCustomCustomer({ ...customCustomer, name: e.target.value })}
                    className="px-2 py-1.5 bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Mobile Number *"
                    value={customCustomer.mobile}
                    onChange={(e) => setCustomCustomer({ ...customCustomer, mobile: e.target.value })}
                    className="px-2 py-1.5 bg-white border border-slate-200 rounded-md text-slate-900 font-mono focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="GSTIN (Optional)"
                    value={customCustomer.gstin}
                    onChange={(e) => setCustomCustomer({ ...customCustomer, gstin: e.target.value.toUpperCase() })}
                    className="px-2 py-1.5 bg-white border border-slate-200 rounded-md text-slate-900 font-mono uppercase focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                  <input
                    type="text"
                    placeholder="Billing / Delivery Address..."
                    value={customCustomer.billingAddress}
                    onChange={(e) => setCustomCustomer({ ...customCustomer, billingAddress: e.target.value })}
                    className="px-2 py-1.5 bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Quotation Metadata Column */}
          <div className="md:col-span-6 space-y-2 md:border-l md:border-slate-100 md:pl-3">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Dates &amp; Tax Structure
            </label>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Quotation Date</label>
                <input
                  type="date"
                  value={quotationDate}
                  onChange={(e) => setQuotationDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-[11px] focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Valid Until</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-[11px] focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Tax Regime</label>
                <select
                  value={gstType}
                  onChange={(e) => setGstType(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-[11px] font-medium focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-slate-900"
                >
                  <option value="CGST_SGST">Intra-State (CGST + SGST)</option>
                  <option value="IGST">Inter-State (IGST)</option>
                  <option value="EXEMPT">Exempt / Non-GST</option>
                </select>
              </div>

              <div className="flex items-end pb-1.5">
                <label htmlFor="taxInclusive" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    id="taxInclusive"
                    checked={isTaxInclusive}
                    onChange={(e) => setIsTaxInclusive(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Rates are Tax Inclusive</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Items & Pricing Section */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              Line Items ({items.length})
            </h2>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-800 hover:text-emerald-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Add Item</span>
            </button>
          </div>

          {/* MOBILE VIEW: Compact Stacked Cards */}
          <div className="md:hidden space-y-2">
            {items.map((item, idx) => {
              const gross = item.quantity * item.rate;
              const disc = Math.min(gross, item.discount || 0);
              const taxable = gross - disc;
              const lineTax = (taxable * (item.taxRate || 0)) / 100;
              const lineTotal = taxable + lineTax;

              return (
                <div
                  key={item.id}
                  className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2 text-xs"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-400 text-[10px]">#{idx + 1}</span>
                    <select
                      value={item.productId || ''}
                      onChange={(e) => handleItemChange(item.id, 'productId', e.target.value || undefined)}
                      className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded-md text-slate-900 text-xs focus:outline-hidden"
                    >
                      <option value="">Pick from Inventory...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (₹{p.sellingPrice})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <input
                    type="text"
                    required
                    placeholder="Item Description or Custom Specification *"
                    value={item.description}
                    onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-md text-slate-900 font-medium text-xs focus:outline-hidden"
                  />

                  <div className="grid grid-cols-3 gap-1.5">
                    <div>
                      <label className="block text-[10px] text-slate-500">Qty</label>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md font-mono text-slate-900 text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500">Unit</label>
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                        placeholder="Pcs"
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500">Rate (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.rate}
                        onChange={(e) => handleItemChange(item.id, 'rate', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md font-mono text-slate-900 text-right"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 items-end pt-1 border-t border-slate-200/60">
                    <div>
                      <label className="block text-[10px] text-slate-500">Disc (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.discount}
                        onChange={(e) => handleItemChange(item.id, 'discount', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md font-mono text-slate-900 text-right"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500">GST %</label>
                      <select
                        value={item.taxRate}
                        onChange={(e) => handleItemChange(item.id, 'taxRate', parseFloat(e.target.value) || 0)}
                        disabled={gstType === 'EXEMPT'}
                        className="w-full px-1.5 py-1 bg-white border border-slate-200 rounded-md text-slate-900 font-mono"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] text-slate-500">Total</span>
                      <span className="font-mono font-bold text-slate-900">
                        ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP VIEW: Clean Single-Row Table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-1.5 px-2 w-8 text-center">#</th>
                  <th className="py-1.5 px-1.5 w-44">Inventory</th>
                  <th className="py-1.5 px-1.5">Description *</th>
                  <th className="py-1.5 px-1.5 w-18 text-right">Qty</th>
                  <th className="py-1.5 px-1.5 w-18">Unit</th>
                  <th className="py-1.5 px-1.5 w-24 text-right">Rate (₹)</th>
                  <th className="py-1.5 px-1.5 w-22 text-right">Disc (₹)</th>
                  <th className="py-1.5 px-1.5 w-18">GST %</th>
                  <th className="py-1.5 px-2 w-28 text-right">Total (₹)</th>
                  <th className="py-1.5 px-1.5 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => {
                  const gross = item.quantity * item.rate;
                  const disc = Math.min(gross, item.discount || 0);
                  const taxable = gross - disc;
                  const lineTax = (taxable * (item.taxRate || 0)) / 100;
                  const lineTotal = taxable + lineTax;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="py-1.5 px-2 text-center font-mono text-[11px] text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-1.5 px-1.5">
                        <select
                          value={item.productId || ''}
                          onChange={(e) => handleItemChange(item.id, 'productId', e.target.value || undefined)}
                          className="w-full px-1.5 py-1 bg-white border border-slate-200 rounded-md text-slate-900 text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                        >
                          <option value="">Custom / Pick...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (₹{p.sellingPrice})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 px-1.5">
                        <input
                          type="text"
                          required
                          placeholder="Item Description or Spec *"
                          value={item.description}
                          onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-slate-900 font-medium text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                        />
                      </td>
                      <td className="py-1.5 px-1.5">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-1.5 py-1 bg-white border border-slate-200 rounded-md font-mono text-slate-900 text-right text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                        />
                      </td>
                      <td className="py-1.5 px-1.5">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                          placeholder="Pcs"
                          className="w-full px-1.5 py-1 bg-white border border-slate-200 rounded-md text-slate-900 text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                        />
                      </td>
                      <td className="py-1.5 px-1.5">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.rate}
                          onChange={(e) => handleItemChange(item.id, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-full px-1.5 py-1 bg-white border border-slate-200 rounded-md font-mono text-slate-900 text-right text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                        />
                      </td>
                      <td className="py-1.5 px-1.5">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.discount}
                          onChange={(e) => handleItemChange(item.id, 'discount', parseFloat(e.target.value) || 0)}
                          className="w-full px-1.5 py-1 bg-white border border-slate-200 rounded-md font-mono text-slate-900 text-right text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                        />
                      </td>
                      <td className="py-1.5 px-1.5">
                        <select
                          value={item.taxRate}
                          onChange={(e) => handleItemChange(item.id, 'taxRate', parseFloat(e.target.value) || 0)}
                          disabled={gstType === 'EXEMPT'}
                          className="w-full px-1.5 py-1 bg-white border border-slate-200 rounded-md text-slate-900 font-mono text-xs focus:outline-hidden disabled:opacity-60"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </td>
                      <td className="py-1.5 px-2 font-mono font-bold text-slate-900 text-right tabular-nums text-xs">
                        ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-1.5 px-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Terms/Notes & Totals Summary (Compact 2-Column Bottom Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
          {/* Terms & Notes */}
          <div className="md:col-span-7 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                Terms &amp; Conditions
              </label>
              <textarea
                rows={3}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-800 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                Customer Notes / Remarks
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-800 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Price Breakdown & Finalize CTA */}
          <div className="md:col-span-5 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2.5 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Gross)</span>
                <span className="font-mono font-semibold tabular-nums">₹{totals.subtotal.toFixed(2)}</span>
              </div>

              {totals.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Total Discount</span>
                  <span className="font-mono font-semibold tabular-nums">-₹{totals.discountTotal.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>GST Tax Total</span>
                <span className="font-mono font-semibold tabular-nums">₹{totals.taxTotal.toFixed(2)}</span>
              </div>

              <div className="pt-1.5 border-t border-slate-200 flex justify-between items-baseline font-bold text-slate-900">
                <span className="text-xs">Estimated Total</span>
                <span className="text-base font-black text-slate-900 font-mono tabular-nums">
                  ₹{totals.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Link
                href="/quotations"
                className="px-3 py-1.5 border border-slate-200 bg-white text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-50"
              >
                Cancel
              </Link>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, 'DRAFT')}
                disabled={submitting}
                className="px-3 py-1.5 bg-white border border-slate-300 text-slate-800 font-bold text-xs rounded-lg hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, 'SENT')}
                disabled={submitting}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {submitting
                  ? isEditMode
                    ? 'Updating...'
                    : 'Creating...'
                  : isEditMode
                    ? 'Update & Finalize'
                    : 'Create & Finalize'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function NewQuotationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading quotation editor...</div>}>
      <NewQuotationContent />
    </Suspense>
  );
}
