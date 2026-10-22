'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Receipt,
  Plus,
  Trash2,
  ArrowLeft,
  UserPlus,
  AlertCircle,
  Building,
  CreditCard,
  Percent,
  X,
  CheckCircle2,
  Search,
  Package,
  Check,
  Smartphone,
  Save,
  FileText,
  Clock,
  Sparkles,
  ChevronDown,
  Printer,
  Share2,
  Zap,
  Settings2,
} from 'lucide-react';
import { calculateInvoiceTotals, LineItemInput, GstType } from '@/lib/billing/calculator';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useEntitlements } from '@/hooks/useEntitlements';
import { FeatureNotAvailable } from '@/components/shared/FeatureNotAvailable';

interface CustomerOption {
  id: string;
  name: string;
  mobile: string;
  email?: string | null;
  gstin: string | null;
  billingAddress: string | null;
  totalOutstanding?: number;
}

interface CatalogProductOption {
  id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  taxRate: number;
  unit: string;
  category: string;
  currentStock: number;
}

const COMMON_GST_RATES = [0, 5, 12, 18, 28];
const UNITS = ['Pcs', 'Kg', 'Gram', 'Litre', 'Ml', 'Box', 'Packet', 'Dozen', 'Nos', 'Bags', 'Mtr', 'Set', 'Bottle', 'Hours'];

function InvoiceCreationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get('customerId') || '';

  const { activeBusiness } = useAuth();
  const { toast } = useToast();
  const { canAccessCommercial } = useEntitlements();

  // 1. Invoice Numbering & Date State
  const [estimatedInvoiceNumber, setEstimatedInvoiceNumber] = useState('INV-Loading...');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [gstType, setGstType] = useState<GstType>('CGST_SGST');
  const [isTaxInclusive, setIsTaxInclusive] = useState(false);
  const [isGstInvoice, setIsGstInvoice] = useState(true);

  // 2. Customer State
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(preselectedCustomerId);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Quick Add Customer Modal State
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustMobile, setNewCustMobile] = useState('');
  const [newCustGstin, setNewCustGstin] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [addCustomerError, setAddCustomerError] = useState<string | null>(null);

  // 3. Product Catalog & Fast Product Search State
  const [catalogProducts, setCatalogProducts] = useState<CatalogProductOption[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  // Quick Add Item Modal State
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemRate, setNewItemRate] = useState<number | string>(0);
  const [newItemQty, setNewItemQty] = useState<number | string>(1);
  const [newItemUnit, setNewItemUnit] = useState('Pcs');
  const [newItemTaxRate, setNewItemTaxRate] = useState(18);
  const [newItemSku, setNewItemSku] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('General');
  const [newItemTrackStock, setNewItemTrackStock] = useState(false);
  const [newItemOpeningStock, setNewItemOpeningStock] = useState<number | string>(0);
  const [savingItemToCatalog, setSavingItemToCatalog] = useState(false);
  const [addItemError, setAddItemError] = useState<string | null>(null);

  // 4. Line Items State
  const [items, setItems] = useState<LineItemInput[]>([
    {
      description: '',
      quantity: 1,
      unit: 'Pcs',
      rate: 0,
      discount: 0,
      discountType: 'AMOUNT',
      taxRate: 18,
    },
  ]);

  // 5 & 6. Payment, Notes & Terms State
  const [paidAmount, setPaidAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER'>('CASH');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState(
    '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. charged after due date.\n3. Subject to local jurisdiction.'
  );

  // 7. Actions & Submission State
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<'save' | 'print' | 'share' | 'draft' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initial Date Setup
  useEffect(() => {
    if (!canAccessCommercial) return;
    const today = new Date();
    setInvoiceDate(today.toISOString().split('T')[0]);
    setDueDate(new Date(today.getTime() + 15 * 86400000).toISOString().split('T')[0]);

    // Fetch next sequential invoice number estimate
    fetch('/api/invoices/next-number')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data.nextInvoiceNumber) {
          setEstimatedInvoiceNumber(data.nextInvoiceNumber);
        }
      })
      .catch(() => {});
  }, [canAccessCommercial]);

  // Load Customers & Inventory Catalog
  useEffect(() => {
    if (!canAccessCommercial) return;
    fetch('/api/customers')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.customers)) {
          setCustomers(data.customers);
          if (!selectedCustomerId && data.customers.length > 0 && !preselectedCustomerId) {
            setSelectedCustomerId(data.customers[0].id);
          }
        }
      })
      .catch(() => {});

    fetch('/api/inventory')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.products)) {
          setCatalogProducts(data.products);
        }
      })
      .catch(() => {});
  }, [preselectedCustomerId]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        customerDropdownRef.current &&
        !customerDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCustomerDropdownOpen(false);
      }
      if (
        productDropdownRef.current &&
        !productDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProductDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered Customers based on Search Query
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers.slice(0, 8);
    const q = customerSearchQuery.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.mobile && c.mobile.includes(q)) ||
        (c.gstin && c.gstin.toLowerCase().includes(q))
    );
  }, [customers, customerSearchQuery]);

  // Filtered Products based on Search Query
  const filteredProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return catalogProducts.slice(0, 8);
    const q = productSearchQuery.toLowerCase().trim();
    return catalogProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [catalogProducts, productSearchQuery]);

  // Real-time calculation preview
  const calc = calculateInvoiceTotals({
    items,
    gstType,
    isTaxInclusive,
    isGstInvoice,
    paidAmount: parseFloat(paidAmount) || 0,
    enableRounding: true,
  });

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Line Items Operations
  const handleAddItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        description: '',
        quantity: 1,
        unit: 'Pcs',
        rate: 0,
        discount: 0,
        discountType: 'AMOUNT',
        taxRate: isGstInvoice ? 18 : 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      // Keep at least one empty line
      setItems([
        {
          description: '',
          quantity: 1,
          unit: 'Pcs',
          rate: 0,
          discount: 0,
          discountType: 'AMOUNT',
          taxRate: isGstInvoice ? 18 : 0,
        },
      ]);
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof LineItemInput, val: unknown) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // Fast Product Search: Add an existing catalog product to the bill
  const handleSelectCatalogProduct = (product: CatalogProductOption) => {
    setItems((prev) => {
      // Check if product is already in bill
      const existingIdx = prev.findIndex((item) => item.productId === product.id);
      if (existingIdx >= 0) {
        // Increment quantity of existing line
        const copy = [...prev];
        copy[existingIdx] = {
          ...copy[existingIdx],
          quantity: (copy[existingIdx].quantity || 0) + 1,
        };
        return copy;
      }

      // If the first item is empty, replace it
      if (prev.length === 1 && !prev[0].description.trim() && prev[0].rate === 0) {
        return [
          {
            productId: product.id,
            description: product.name,
            quantity: 1,
            unit: product.unit || 'Pcs',
            rate: product.sellingPrice || 0,
            discount: 0,
            discountType: 'AMOUNT',
            taxRate: isGstInvoice ? (product.taxRate ?? 18) : 0,
          },
        ];
      }

      // Otherwise append new line item
      return [
        ...prev,
        {
          productId: product.id,
          description: product.name,
          quantity: 1,
          unit: product.unit || 'Pcs',
          rate: product.sellingPrice || 0,
          discount: 0,
          discountType: 'AMOUNT',
          taxRate: isGstInvoice ? (product.taxRate ?? 18) : 0,
        },
      ];
    });

    setProductSearchQuery('');
    setIsProductDropdownOpen(false);
    toast.success(`Added ${product.name} to bill`);
  };

  // Open Quick Add Item Modal prefilled with search query
  const handleOpenAddItemModal = (prefillName = '') => {
    const rawName = prefillName || productSearchQuery || '';
    setNewItemName(rawName);
    setNewItemRate(0);
    setNewItemQty(1);
    setNewItemUnit('Pcs');
    setNewItemTaxRate(isGstInvoice ? 18 : 0);
    setNewItemSku(
      rawName
        ? `${rawName.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`
        : `ITEM-${Date.now().toString().slice(-4)}`
    );
    setNewItemCategory('General');
    setNewItemTrackStock(false);
    setNewItemOpeningStock(0);
    setAddItemError(null);
    setAddItemModalOpen(true);
    setIsProductDropdownOpen(false);
  };

  // Action A: Add to This Bill Only (no database write to catalogue)
  const handleAddOnlyToBill = () => {
    const trimmedName = newItemName.trim();
    if (!trimmedName) {
      setAddItemError('Please enter an item name or description.');
      return;
    }
    const rateNum = Number(newItemRate);
    if (isNaN(rateNum) || rateNum < 0) {
      setAddItemError('Selling price must be a non-negative number.');
      return;
    }
    const qtyNum = Number(newItemQty) || 1;

    setItems((prev) => {
      const newLineItem: LineItemInput = {
        description: trimmedName,
        quantity: qtyNum,
        unit: newItemUnit || 'Pcs',
        rate: rateNum,
        discount: 0,
        discountType: 'AMOUNT',
        taxRate: isGstInvoice ? Number(newItemTaxRate) : 0,
      };

      if (prev.length === 1 && !prev[0].description.trim() && prev[0].rate === 0) {
        return [newLineItem];
      }
      return [...prev, newLineItem];
    });

    setAddItemModalOpen(false);
    setProductSearchQuery('');
    toast.success(`Added "${trimmedName}" to this bill`);
  };

  // Action B: Add & Save Item (persists to catalogue and adds to bill)
  const handleAddAndSaveToCatalog = async () => {
    const trimmedName = newItemName.trim();
    if (!trimmedName) {
      setAddItemError('Please enter an item name or description.');
      return;
    }
    const rateNum = Number(newItemRate);
    if (isNaN(rateNum) || rateNum < 0) {
      setAddItemError('Selling price must be a non-negative number.');
      return;
    }
    const qtyNum = Number(newItemQty) || 1;
    const resolvedSku =
      newItemSku.trim() ||
      `${trimmedName.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    setSavingItemToCatalog(true);
    setAddItemError(null);

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          sku: resolvedSku,
          sellingPrice: rateNum,
          unit: newItemUnit || 'Pcs',
          taxRate: isGstInvoice ? Number(newItemTaxRate) : 0,
          category: newItemCategory.trim() || 'General',
          openingStock: newItemTrackStock ? Number(newItemOpeningStock) || 0 : 0,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save item to catalogue.');
      }

      const savedProduct = data.product;
      setCatalogProducts((prev) => [
        {
          id: savedProduct.id,
          name: savedProduct.name,
          sku: savedProduct.sku,
          sellingPrice: savedProduct.sellingPrice,
          taxRate: savedProduct.taxRate,
          unit: savedProduct.unit,
          category: savedProduct.category,
          currentStock: savedProduct.currentStock,
        },
        ...prev,
      ]);

      setItems((prev) => {
        const newLineItem: LineItemInput = {
          productId: savedProduct.id,
          description: savedProduct.name,
          quantity: qtyNum,
          unit: savedProduct.unit || 'Pcs',
          rate: savedProduct.sellingPrice || rateNum,
          discount: 0,
          discountType: 'AMOUNT',
          taxRate: isGstInvoice ? savedProduct.taxRate : 0,
        };

        if (prev.length === 1 && !prev[0].description.trim() && prev[0].rate === 0) {
          return [newLineItem];
        }
        return [...prev, newLineItem];
      });

      setAddItemModalOpen(false);
      setProductSearchQuery('');
      toast.success(`Saved "${savedProduct.name}" to catalogue and added to bill!`);
    } catch (err: unknown) {
      setAddItemError(err instanceof Error ? err.message : 'Error saving product to catalogue');
    } finally {
      setSavingItemToCatalog(false);
    }
  };

  // Quick 1-Click Walk-in / Cash Sale Selector
  const handleSelectCashSale = async () => {
    // Check if Cash Sale / Walk-in already exists in loaded customers
    const existing = customers.find(
      (c) =>
        c.name.toLowerCase().includes('walk-in') ||
        c.name.toLowerCase().includes('cash sale') ||
        c.name.toLowerCase() === 'retail customer'
    );

    if (existing) {
      setSelectedCustomerId(existing.id);
      setIsCustomerDropdownOpen(false);
      toast.success('Selected Cash Sale / Walk-in Customer');
      return;
    }

    // Automatically create a Walk-in Customer without forcing manual registration
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Walk-in / Cash Sale',
          mobile: '',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.customer) {
        setCustomers((prev) => [data.customer, ...prev]);
        setSelectedCustomerId(data.customer.id);
        setIsCustomerDropdownOpen(false);
        toast.success('Selected Walk-in / Cash Sale Customer');
      } else {
        throw new Error(data.error || 'Failed to create cash sale customer');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error creating cash sale customer');
    }
  };

  // Quick Add Customer Handler (Never resets bill state)
  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingCustomer(true);
    setAddCustomerError(null);

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCustName,
          mobile: newCustMobile,
          gstin: newCustGstin,
          email: newCustEmail,
          billingAddress: newCustAddress,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add customer.');
      }

      setCustomers((prev) => [data.customer, ...prev]);
      setSelectedCustomerId(data.customer.id);
      setCustomerSearchQuery('');
      setIsCustomerDropdownOpen(false);
      setAddCustomerOpen(false);

      setNewCustName('');
      setNewCustMobile('');
      setNewCustGstin('');
      setNewCustEmail('');
      setNewCustAddress('');

      toast.success(`Customer "${data.customer.name}" created and selected!`);
    } catch (err: unknown) {
      setAddCustomerError(err instanceof Error ? err.message : 'Error adding customer');
    } finally {
      setAddingCustomer(false);
    }
  };

  // Save / Finalize Invoice Handler with Print & Share support
  const handleFinalizeBill = async (isDraft = false, action: 'save' | 'print' | 'share' | 'draft' = 'save') => {
    setError(null);

    if (!selectedCustomerId) {
      setError('Please select a customer or click "⚡ Cash Sale".');
      toast.error('Please select a customer or click "⚡ Cash Sale".');
      return;
    }

    const validItems = items.filter((i) => i.description.trim() && i.rate >= 0);
    if (validItems.length === 0) {
      setError('Please add at least one line item with a description and selling rate.');
      toast.error('Please add at least one line item.');
      return;
    }

    setLoading(true);
    setActiveAction(isDraft ? 'draft' : action);

    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          invoiceDate,
          dueDate,
          gstType,
          isTaxInclusive,
          isGstInvoice,
          items: validItems,
          paidAmount: parseFloat(paidAmount) || 0,
          paymentMethod,
          paymentReference: paymentMethod === 'CASH' ? '' : paymentReference,
          notes,
          termsAndConditions: terms,
          isDraft,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate invoice.');
      }

      toast.success(
        isDraft
          ? `Invoice ${data.invoice.invoiceNumber} saved as draft!`
          : `Invoice ${data.invoice.invoiceNumber} generated successfully!`
      );

      // Handle direct print or share redirect
      if (action === 'print') {
        router.push(`/invoices/${data.invoice.id}?print=true`);
      } else if (action === 'share') {
        router.push(`/invoices/${data.invoice.id}?share=true`);
      } else {
        router.push(`/invoices/${data.invoice.id}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while creating invoice.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  if (!canAccessCommercial) {
    return (
      <FeatureNotAvailable
        featureName="Create New Tax Invoice"
        requiredPlanName="Starter, Growth or Scale"
        description="Commercial invoicing is not available on Free Khata accounts."
      />
    );
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-36 md:pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
              } else {
                router.push('/invoices');
              }
            }}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Back to previous screen"
            aria-label="Back to previous screen"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Create New Invoice
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Workspace: <strong>{activeBusiness?.name || 'My Store'}</strong> • GSTIN:{' '}
              <span className="font-mono text-slate-700">{activeBusiness?.gstin || 'Unregistered'}</span>
            </p>
          </div>
        </div>

        {/* Running total pill in top right */}
        <div className="flex items-center gap-2 self-start sm:self-center bg-slate-900 text-white px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold shadow-2xs">
          <span className="text-slate-300 font-sans text-[11px] font-normal">Running Total:</span>
          <span className="text-emerald-400">
            ₹{calc.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Billing Form Flow */}
      <div className="space-y-4 text-xs">
        {/* =========================================================================
            SECTION 1: Invoice Details & Collapsible More Invoice Settings
           ========================================================================= */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-slate-500" />
              Invoice Details
            </span>
            <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-semibold">
              {estimatedInvoiceNumber}
            </span>
          </div>

          {/* Essential visible fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Invoice Number</label>
              <input
                type="text"
                disabled
                value={estimatedInvoiceNumber}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-mono font-bold cursor-not-allowed text-xs"
                title="Invoice number is automatically sequenced"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Invoice Date</label>
              <input
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Due Date <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 text-xs"
              />
            </div>
          </div>

          {/* Collapsible "More Invoice Settings" */}
          <details className="group pt-2 border-t border-slate-100">
            <summary className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900 font-semibold text-xs py-1 select-none">
              <Settings2 className="w-3.5 h-3.5 text-slate-400 group-open:text-emerald-600 transition-colors" />
              <span>More Invoice Settings (Tax Regime, Pricing & Terms)</span>
              <ChevronDown className="w-3.5 h-3.5 ml-auto text-slate-400 group-open:rotate-180 transition-transform" />
            </summary>

            <div className="mt-3 pt-3 border-t border-slate-100 space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tax Regime</label>
                  <select
                    value={gstType}
                    onChange={(e) => setGstType(e.target.value as GstType)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 text-xs"
                  >
                    <option value="CGST_SGST">Intra-State (CGST + SGST)</option>
                    <option value="IGST">Inter-State (IGST)</option>
                    <option value="EXEMPT">Exempt / Non-GST</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Price Calculation</label>
                  <div className="flex items-center gap-3 mt-2">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                      <input
                        type="radio"
                        name="taxInclusive"
                        checked={!isTaxInclusive}
                        onChange={() => setIsTaxInclusive(false)}
                        className="accent-slate-900"
                      />
                      <span>Exclusive (Base + GST)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                      <input
                        type="radio"
                        name="taxInclusive"
                        checked={isTaxInclusive}
                        onChange={() => setIsTaxInclusive(true)}
                        className="accent-slate-900"
                      />
                      <span>Inclusive</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Invoice Standard</label>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="isGstCheckbox"
                      checked={isGstInvoice}
                      onChange={(e) => setIsGstInvoice(e.target.checked)}
                      className="rounded accent-slate-900"
                    />
                    <label htmlFor="isGstCheckbox" className="cursor-pointer text-slate-700">
                      Formal GST Tax Invoice
                    </label>
                  </div>
                </div>
              </div>

              {/* Notes & Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Invoice Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Delivery remarks or special instructions..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Terms & Conditions</label>
                  <textarea
                    rows={2}
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-[11px] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>
            </div>
          </details>
        </div>

        {/* =========================================================================
            SECTION 2: Customer Selection & Fast Autofill
           ========================================================================= */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-500" />
              Customer / Party
            </span>

            <div className="flex items-center gap-2">
              {/* Quick Cash Sale Button */}
              <button
                type="button"
                onClick={handleSelectCashSale}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                title="Quick 1-click cash sale without entering customer details"
              >
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>⚡ Cash Sale / Walk-in</span>
              </button>

              {/* Add New Customer Button */}
              <button
                type="button"
                onClick={() => {
                  setNewCustName(customerSearchQuery);
                  setAddCustomerError(null);
                  setAddCustomerOpen(true);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add Customer</span>
              </button>
            </div>
          </div>

          {/* Searchable Customer Dropdown */}
          <div ref={customerDropdownRef} className="relative">
            {selectedCustomer ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{selectedCustomer.name}</span>
                    {selectedCustomer.gstin && (
                      <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                        GST: {selectedCustomer.gstin}
                      </span>
                    )}
                    {selectedCustomer.totalOutstanding !== undefined && selectedCustomer.totalOutstanding > 0 && (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Udhaar: ₹{selectedCustomer.totalOutstanding.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 text-slate-500 text-[11px] font-mono">
                    <span>Mobile: {selectedCustomer.mobile || 'None'}</span>
                    {selectedCustomer.billingAddress && (
                      <span className="font-sans text-slate-600 truncate max-w-xs">
                        • {selectedCustomer.billingAddress}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomerDropdownOpen(true);
                      setCustomerSearchQuery('');
                    }}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Change Customer
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customerSearchQuery}
                  onChange={(e) => {
                    setCustomerSearchQuery(e.target.value);
                    setIsCustomerDropdownOpen(true);
                  }}
                  onFocus={() => setIsCustomerDropdownOpen(true)}
                  placeholder="Type customer name or mobile number..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition-all font-medium text-xs"
                />
              </div>
            )}

            {/* Dropdown Results */}
            {isCustomerDropdownOpen && (
              <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto animate-in fade-in duration-150">
                <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">Select a customer or click Cash Sale:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomerDropdownOpen(false);
                      setNewCustName(customerSearchQuery);
                      setAddCustomerError(null);
                      setAddCustomerOpen(true);
                    }}
                    className="text-emerald-700 font-bold hover:underline cursor-pointer"
                  >
                    + Add New Customer
                  </button>
                </div>

                {filteredCustomers.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 space-y-2">
                    <p className="text-xs">No matching customers found for "{customerSearchQuery}".</p>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectCashSale}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        ⚡ Walk-in / Cash Sale
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomerDropdownOpen(false);
                          setNewCustName(customerSearchQuery);
                          setAddCustomerError(null);
                          setAddCustomerOpen(true);
                        }}
                        className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        + Add "{customerSearchQuery || 'Customer'}"
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomerId(c.id);
                          setIsCustomerDropdownOpen(false);
                          setCustomerSearchQuery('');
                        }}
                        className={`w-full px-3.5 py-2.5 text-left hover:bg-emerald-50/60 transition-colors flex items-center justify-between group cursor-pointer ${
                          selectedCustomerId === c.id ? 'bg-emerald-50/40' : ''
                        }`}
                      >
                        <div>
                          <p className="font-bold text-slate-900 text-xs group-hover:text-emerald-800">
                            {c.name}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {c.mobile ? `Mobile: ${c.mobile}` : 'No phone number'}
                            {c.gstin && ` • GST: ${c.gstin}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {c.totalOutstanding !== undefined && c.totalOutstanding > 0 && (
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Udhaar: ₹{c.totalOutstanding.toFixed(2)}
                            </span>
                          )}
                          {selectedCustomerId === c.id && (
                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            SECTION 3: Product Search & Fast Selection
           ========================================================================= */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-slate-500" />
              Product Selection
            </span>

            <button
              type="button"
              onClick={() => handleOpenAddItemModal()}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-900 hover:text-white bg-slate-100 hover:bg-slate-900 border border-slate-200 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Item</span>
            </button>
          </div>

          {/* Search bar with suggestion dropdown */}
          <div ref={productDropdownRef} className="relative">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={productSearchQuery}
                onChange={(e) => {
                  setProductSearchQuery(e.target.value);
                  setIsProductDropdownOpen(true);
                }}
                onFocus={() => setIsProductDropdownOpen(true)}
                placeholder="Search products by name, SKU or barcode..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition-all font-medium text-xs"
              />
            </div>

            {/* Dropdown matching results */}
            {isProductDropdownOpen && (
              <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto animate-in fade-in duration-150">
                {productSearchQuery.trim() && (
                  <div className="p-2 border-b border-slate-100 bg-emerald-50/50">
                    <button
                      type="button"
                      onClick={() => handleOpenAddItemModal(productSearchQuery)}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100/70 rounded-lg transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-emerald-600" />
                        <span>+ Add "{productSearchQuery}" as a new item</span>
                      </span>
                    </button>
                  </div>
                )}

                {filteredProducts.length === 0 && !productSearchQuery.trim() ? (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    Start typing to search products from inventory.
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 space-y-2">
                    <p className="text-xs">No inventory items match "{productSearchQuery}".</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectCatalogProduct(p)}
                        className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <div>
                          <p className="font-bold text-slate-900 text-xs group-hover:text-emerald-700">
                            {p.name}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            SKU: {p.sku || 'N/A'} • ₹{p.sellingPrice.toFixed(2)} / {p.unit} • GST {p.taxRate}%
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-slate-900 text-xs">
                            ₹{p.sellingPrice.toFixed(2)}
                          </span>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Stock: {p.currentStock} {p.unit}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            SECTION 4: Invoice Items (Mobile Stacked Cards & Desktop Table)
           ========================================================================= */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-slate-500" />
              Invoice Items ({items.length})
            </span>

            <button
              type="button"
              onClick={handleAddItemRow}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-900 hover:text-white bg-slate-100 hover:bg-slate-900 border border-slate-200 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Row</span>
            </button>
          </div>

          {/* MOBILE VIEW: Stacked Product Cards (No horizontal scroll) */}
          <div className="md:hidden space-y-3">
            {items.map((item, index) => {
              const lineCalc = calc.items[index];
              return (
                <div
                  key={index}
                  className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 space-y-2.5 relative"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-500">
                          Item #{index + 1}
                        </span>
                        {item.productId && (
                          <span className="text-[9px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            In Stock
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="Item name / description..."
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-semibold text-xs focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors mt-4 cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quantity, Unit, Rate */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Quantity</label>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        required
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono text-center text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Unit</label>
                      <select
                        value={item.unit}
                        onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                        className="w-full px-1.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs"
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Rate (₹)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required
                        value={item.rate}
                        onChange={(e) =>
                          handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono text-right text-xs"
                      />
                    </div>
                  </div>

                  {/* Discount, Tax %, Line Total */}
                  <div className="grid grid-cols-3 gap-2 items-center pt-2 border-t border-slate-200/60">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Disc (₹)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={item.discount}
                        onChange={(e) =>
                          handleItemChange(index, 'discount', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono text-right text-xs"
                      />
                    </div>
                    {isGstInvoice ? (
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">GST %</label>
                        <select
                          value={item.taxRate}
                          onChange={(e) =>
                            handleItemChange(index, 'taxRate', parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-1.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono text-xs"
                        >
                          {COMMON_GST_RATES.map((r) => (
                            <option key={r} value={r}>
                              {r}%
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div />
                    )}
                    <div className="text-right">
                      <span className="block text-[10px] text-slate-500">Line Total</span>
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        ₹
                        {lineCalc?.lineTotal.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP VIEW: Clean Compact Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2 px-2">Item Description *</th>
                  <th className="py-2 px-2 w-20 text-right">Qty</th>
                  <th className="py-2 px-2 w-24">Unit</th>
                  <th className="py-2 px-2 w-28 text-right">Rate (₹)</th>
                  <th className="py-2 px-2 w-24 text-right">Disc (₹)</th>
                  {isGstInvoice && <th className="py-2 px-2 w-24">GST %</th>}
                  <th className="py-2 px-2 w-32 text-right">Line Total (₹)</th>
                  <th className="py-2 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, index) => {
                  const lineCalc = calc.items[index];
                  return (
                    <tr key={index} className="hover:bg-slate-50/50">
                      <td className="py-2 px-2">
                        <div className="space-y-1">
                          <input
                            type="text"
                            required
                            placeholder="Item name or service description..."
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-medium"
                          />
                          {item.productId && (
                            <span className="inline-block text-[9px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              Linked Catalogue Item
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          required
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-right focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                        />
                      </td>

                      <td className="py-2 px-2">
                        <select
                          value={item.unit}
                          onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          required
                          value={item.rate}
                          onChange={(e) =>
                            handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-right focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                        />
                      </td>

                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={item.discount}
                          onChange={(e) =>
                            handleItemChange(index, 'discount', parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-right focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                        />
                      </td>

                      {isGstInvoice && (
                        <td className="py-2 px-2">
                          <select
                            value={item.taxRate}
                            onChange={(e) =>
                              handleItemChange(index, 'taxRate', parseFloat(e.target.value) || 0)
                            }
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono"
                          >
                            {COMMON_GST_RATES.map((r) => (
                              <option key={r} value={r}>
                                {r}%
                              </option>
                            ))}
                          </select>
                        </td>
                      )}

                      <td className="py-2 px-2 text-right font-mono font-bold text-slate-900 tabular-nums">
                        ₹
                        {lineCalc?.lineTotal.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </td>

                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
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

        {/* =========================================================================
            SECTION 5 & 6: Summary, Payments & Actions
           ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Payment Section (2 cols on lg) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                Payment Collection
              </span>

              {/* Quick Actions: Full Payment, Partial, Credit/Udhaar */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaidAmount(calc.total.toFixed(2))}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                    parseFloat(paidAmount) === parseFloat(calc.total.toFixed(2)) && calc.total > 0
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  Full Payment (₹{calc.total.toFixed(2)})
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const half = (calc.total / 2).toFixed(2);
                    setPaidAmount(half);
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                    parseFloat(paidAmount) > 0 &&
                    parseFloat(paidAmount) < parseFloat(calc.total.toFixed(2))
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  Partial Payment
                </button>

                <button
                  type="button"
                  onClick={() => setPaidAmount('0')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                    parseFloat(paidAmount) === 0
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                      : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  Credit / Udhaar (₹0)
                </button>
              </div>

              {/* Amount, Method, Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Amount Paid Now (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value as typeof paymentMethod)
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-medium"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                {/* Reference shown only when relevant */}
                {paymentMethod !== 'CASH' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Reference / UTR #
                    </label>
                    <input
                      type="text"
                      placeholder="Ref / Transaction ID"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Invoice Summary & Action Buttons */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4 h-fit">
            <div className="space-y-2 text-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 block pb-2 border-b border-slate-100">
                Summary & Totals
              </span>

              <div className="flex justify-between text-slate-600">
                <span>Taxable Subtotal:</span>
                <span className="font-mono font-medium tabular-nums">
                  ₹{calc.subtotal.toFixed(2)}
                </span>
              </div>

              {calc.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Total Discount:</span>
                  <span className="font-mono tabular-nums">-₹{calc.discountTotal.toFixed(2)}</span>
                </div>
              )}

              {isGstInvoice && calc.taxTotal > 0 && (
                <>
                  {gstType === 'CGST_SGST' ? (
                    <>
                      <div className="flex justify-between text-slate-500 text-[11px]">
                        <span>CGST:</span>
                        <span className="font-mono tabular-nums">
                          ₹{calc.cgstTotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-500 text-[11px]">
                        <span>SGST:</span>
                        <span className="font-mono tabular-nums">
                          ₹{calc.sgstTotal.toFixed(2)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>IGST:</span>
                      <span className="font-mono tabular-nums">
                        ₹{calc.igstTotal.toFixed(2)}
                      </span>
                    </div>
                  )}
                </>
              )}

              {calc.rounding !== 0 && (
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Rounding:</span>
                  <span className="font-mono tabular-nums">
                    {calc.rounding > 0
                      ? `+₹${calc.rounding.toFixed(2)}`
                      : `-₹${Math.abs(calc.rounding).toFixed(2)}`}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                <span>Grand Total:</span>
                <span className="font-mono text-base tabular-nums">
                  ₹{calc.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between text-emerald-700 font-semibold pt-1 border-t border-slate-100">
                <span>Amount Paid:</span>
                <span className="font-mono tabular-nums">₹{calc.paidAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-amber-900 font-bold bg-amber-50/80 p-2.5 rounded-xl border border-amber-200 mt-1">
                <span>Balance Due (Udhaar):</span>
                <span className="font-mono tabular-nums">
                  ₹{calc.balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Action Buttons: Save, Save & Print, Save & Share, Draft */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <button
                type="button"
                onClick={() => handleFinalizeBill(false, 'save')}
                disabled={loading}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading && activeAction === 'save' ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 text-emerald-400" />
                    <span>Save Invoice</span>
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleFinalizeBill(false, 'print')}
                  disabled={loading}
                  className="py-2 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loading && activeAction === 'print' ? (
                    <div className="w-3.5 h-3.5 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Printer className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Save & Print</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleFinalizeBill(false, 'share')}
                  disabled={loading}
                  className="py-2 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loading && activeAction === 'share' ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-white" />
                      <span>Save & Share</span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleFinalizeBill(true, 'draft')}
                disabled={loading}
                className="w-full py-1.5 bg-white hover:bg-slate-50 text-slate-600 font-medium text-xs rounded-xl border border-slate-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Save as Draft</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Customer Modal */}
      {addCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-emerald-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add New Customer</h3>
                  <p className="text-[11px] text-emerald-800">Directly adds to your current bill</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddCustomerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddCustomer} className="p-6 space-y-3 text-xs">
              {addCustomerError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>{addCustomerError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Customer / Party Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mahavir Hardware Store"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mobile Number <span className="text-slate-400 font-normal">(Optional for retail)</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9827123456"
                  value={newCustMobile}
                  onChange={(e) => setNewCustMobile(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  GSTIN <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="e.g. 22AAAAA0000A1Z5"
                  value={newCustGstin}
                  onChange={(e) => setNewCustGstin(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono uppercase focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Billing Address <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="City, State, Pincode..."
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddCustomerOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingCustomer}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {addingCustomer ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Save & Select Customer</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Item Modal (Add to Bill vs Add & Save Item) */}
      {addItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
                  <Package className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add New Item</h3>
                  <p className="text-[11px] text-slate-500">
                    Add to this bill or save to your product catalogue
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddItemModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {addItemError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>{addItemError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Item / Service Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Havells 10A Switch or Plumbing Service"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Selling Price (₹) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={newItemRate}
                    onChange={(e) => setNewItemRate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit of Measure</label>
                  <select
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Applicable GST Rate <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={newItemTaxRate}
                    onChange={(e) => setNewItemTaxRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono font-medium"
                  >
                    {COMMON_GST_RATES.map((r) => (
                      <option key={r} value={r}>
                        {r}% {r === 0 ? '(Exempt / Nil)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    SKU / Item Code <span className="text-slate-400 font-normal">(Auto-generated if blank)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ELEC-001"
                    value={newItemSku}
                    onChange={(e) => setNewItemSku(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono uppercase focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Electricals"
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Stock Tracking Toggle */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={newItemTrackStock}
                    onChange={(e) => setNewItemTrackStock(e.target.checked)}
                    className="rounded accent-slate-900"
                  />
                  <span>Track Inventory & Stock for this item</span>
                </label>
                {newItemTrackStock && (
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-3">
                    <span className="text-slate-600">Initial Opening Stock:</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={newItemOpeningStock}
                      onChange={(e) => setNewItemOpeningStock(e.target.value)}
                      className="w-28 px-2 py-1 bg-white border border-slate-200 rounded-md text-right font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons: Add to This Bill vs Add & Save Item */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddItemModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>

                <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddOnlyToBill}
                    className="w-full sm:w-auto px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl transition-colors cursor-pointer text-center"
                    title="Add to this bill without saving to catalogue"
                  >
                    Add to This Bill
                  </button>

                  <button
                    type="button"
                    onClick={handleAddAndSaveToCatalog}
                    disabled={savingItemToCatalog}
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                    title="Save to product catalogue and add to bill"
                  >
                    {savingItemToCatalog ? (
                      <span>Saving...</span>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                        <span>Add & Save Item</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Summary & Action Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 z-40 shadow-lg flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Payable</span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono font-bold text-base text-slate-900">
              ₹{calc.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            {calc.balanceDue > 0 && (
              <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1 rounded">
                Due: ₹{calc.balanceDue.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleFinalizeBill(false, 'print')}
            disabled={loading}
            className="p-2 bg-slate-100 text-slate-700 rounded-xl disabled:opacity-50 cursor-pointer"
            title="Print"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleFinalizeBill(false, 'save')}
            disabled={loading}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-emerald-400" />
            <span>Save Invoice</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-slate-400">Loading fast billing screen...</div>
      }
    >
      <InvoiceCreationForm />
    </Suspense>
  );
}
