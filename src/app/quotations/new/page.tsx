'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

export default function NewQuotationPage() {
  const router = useRouter();
  const { activeBusiness } = useAuth();
  const { toast } = useToast();

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

      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create quotation');
      }

      toast.success(`Quotation ${data.quotation.quotationNumber} created successfully!`);
      router.push(`/quotations/${data.quotation.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error creating quotation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/quotations"
            className="p-1.5 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Create New Quotation
            </h1>
            <p className="text-xs text-slate-500">
              Generate a formal commercial quote with branding, price estimates &amp; tax breakdown.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'DRAFT')}
            disabled={submitting}
            className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'SENT')}
            disabled={submitting}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create & Send'}
          </button>
        </div>
      </div>

      <form className="space-y-6">
        {/* 1. Customer & Quotation Meta */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          {/* Customer Selection Column */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                Customer / Party Details *
              </label>

              <button
                type="button"
                onClick={handleImportContact}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                title="Select from Phone Contacts"
              >
                <Phone className="w-3 h-3" />
                <span>Import from Contacts</span>
              </button>
            </div>

            {!isNewCustomer ? (
              <div className="space-y-2">
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-slate-900"
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
              <div className="space-y-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800">New Customer Info</span>
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
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Mobile Number *"
                    value={customCustomer.mobile}
                    onChange={(e) => setCustomCustomer({ ...customCustomer, mobile: e.target.value })}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <input
                  type="text"
                  placeholder="GSTIN (Optional)"
                  value={customCustomer.gstin}
                  onChange={(e) => setCustomCustomer({ ...customCustomer, gstin: e.target.value.toUpperCase() })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono uppercase focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />

                <textarea
                  rows={2}
                  placeholder="Billing / Delivery Address..."
                  value={customCustomer.billingAddress}
                  onChange={(e) => setCustomCustomer({ ...customCustomer, billingAddress: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
              </div>
            )}
          </div>

          {/* Quotation Metadata Column */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Dates &amp; Tax Structure
            </label>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Quotation Date</label>
                <input
                  type="date"
                  value={quotationDate}
                  onChange={(e) => setQuotationDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Valid Until</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tax Regime</label>
                <select
                  value={gstType}
                  onChange={(e) => setGstType(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:bg-white"
                >
                  <option value="CGST_SGST">Intra-State (CGST + SGST)</option>
                  <option value="IGST">Inter-State (IGST)</option>
                  <option value="EXEMPT">Exempt / Non-GST</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="taxInclusive"
                  checked={isTaxInclusive}
                  onChange={(e) => setIsTaxInclusive(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="taxInclusive" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Rates are Tax Inclusive
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Items & Pricing Section */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              Line Items &amp; Pricing
            </h2>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 hover:text-emerald-700 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => {
              const gross = item.quantity * item.rate;
              const disc = Math.min(gross, item.discount || 0);
              const taxable = gross - disc;
              const lineTax = (taxable * (item.taxRate || 0)) / 100;
              const lineTotal = taxable + lineTax;

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-3 text-xs"
                >
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-slate-400 mt-2 text-[11px]">#{idx + 1}</span>

                    {/* Catalog Picker & Description */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <select
                          value={item.productId || ''}
                          onChange={(e) => handleItemChange(item.id, 'productId', e.target.value || undefined)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden"
                        >
                          <option value="">Pick from Inventory...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (₹{p.sellingPrice})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <input
                          type="text"
                          required
                          placeholder="Item Description or Custom Specification *"
                          value={item.description}
                          onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Pricing inputs: Qty, Unit, Rate, Discount, Tax% */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1 border-t border-slate-200/50">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Quantity</label>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg font-mono text-slate-900 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Unit</label>
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                        placeholder="Pcs"
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Rate (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.rate}
                        onChange={(e) => handleItemChange(item.id, 'rate', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg font-mono text-slate-900 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Discount (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.discount}
                        onChange={(e) => handleItemChange(item.id, 'discount', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg font-mono text-slate-900 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">GST Rate %</label>
                      <select
                        value={item.taxRate}
                        onChange={(e) => handleItemChange(item.id, 'taxRate', parseFloat(e.target.value) || 0)}
                        disabled={gstType === 'EXEMPT'}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Line Total</label>
                      <div className="py-1 px-2 font-mono font-bold text-slate-900 text-right bg-slate-100 rounded-lg">
                        ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grand Totals Summary Card */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-4 border-t border-slate-100">
            <div className="w-full sm:w-1/2 space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Terms &amp; Conditions
                </label>
                <textarea
                  rows={3}
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Customer Notes / Remarks
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:bg-white"
                />
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="w-full sm:w-80 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Gross)</span>
                <span className="font-mono font-semibold">₹{totals.subtotal.toFixed(2)}</span>
              </div>

              {totals.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Total Discount</span>
                  <span className="font-mono font-semibold">-₹{totals.discountTotal.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>GST Tax Total</span>
                <span className="font-mono font-semibold">₹{totals.taxTotal.toFixed(2)}</span>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline text-sm font-bold text-slate-900">
                <span>Estimated Total</span>
                <span className="text-lg font-black text-slate-900 font-mono">
                  ₹{totals.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/quotations"
            className="px-4 py-2 border border-slate-200 bg-white text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'DRAFT')}
            disabled={submitting}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-800 font-bold text-xs rounded-xl hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'SENT')}
            disabled={submitting}
            className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Creating Quotation...' : 'Create &amp; Finalize Quotation'}
          </button>
        </div>
      </form>
    </div>
  );
}
