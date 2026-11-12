'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  MapPin,
  Phone,
  Search,
  Sparkles,
  UserPlus,
  X,
} from 'lucide-react';

export interface CustomerOption {
  id: string;
  name: string;
  mobile: string;
  email?: string | null;
  gstin?: string | null;
  billingAddress?: string | null;
  shippingAddress?: string | null;
  totalOutstanding?: number;
}

export interface CustomerDraft {
  name: string;
  mobile: string;
  email: string;
  gstin: string;
  billingAddress: string;
}

export const EMPTY_CUSTOMER_DRAFT: CustomerDraft = {
  name: '',
  mobile: '',
  email: '',
  gstin: '',
  billingAddress: '',
};

export function draftFromCustomer(c: CustomerOption): CustomerDraft {
  return {
    name: c.name || '',
    mobile: c.mobile || '',
    email: c.email || '',
    gstin: c.gstin || '',
    billingAddress: c.billingAddress || '',
  };
}

/**
 * Resolves an existing customerId or registers a new Customer via POST /api/customers.
 * Used by both Invoice and Quotation creation flows across all subscription plans.
 */
export async function resolveOrCreateCustomer(opts: {
  selectedCustomerId: string;
  customers: CustomerOption[];
  draft: CustomerDraft;
}): Promise<{ customerId: string; createdCustomer?: CustomerOption }> {
  if (opts.selectedCustomerId) {
    return { customerId: opts.selectedCustomerId };
  }

  const name = opts.draft.name.trim();
  const mobile = opts.draft.mobile.trim();
  const email = opts.draft.email.trim();
  const gstin = opts.draft.gstin.trim().toUpperCase();
  const billingAddress = opts.draft.billingAddress.trim();

  if (name.length < 2) {
    throw new Error('Please enter a customer name (at least 2 characters) or select an existing customer.');
  }

  // If user typed an existing customer's exact details without clicking the dropdown, link seamlessly
  const exactMatches = opts.customers.filter(
    (c) => c.name.trim().toLowerCase() === name.toLowerCase(),
  );
  if (mobile) {
    const mobileMatch = opts.customers.find(
      (c) => (c.mobile || '').trim() === mobile && c.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (mobileMatch) {
      return { customerId: mobileMatch.id };
    }
  } else if (
    exactMatches.length === 1 &&
    !gstin &&
    !email &&
    !billingAddress
  ) {
    return { customerId: exactMatches[0].id };
  }

  const res = await fetch('/api/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mobile: mobile || '',
      email: email || undefined,
      gstin: gstin || undefined,
      billingAddress: billingAddress || undefined,
      openingBalance: 0,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success || !data.customer) {
    throw new Error(data.error || 'Failed to save customer details');
  }

  return {
    customerId: data.customer.id,
    createdCustomer: data.customer as CustomerOption,
  };
}

export interface CustomerAutocompleteFieldProps {
  customers: CustomerOption[];
  selectedCustomerId: string;
  draft: CustomerDraft;
  onChange: (next: { selectedCustomerId: string; draft: CustomerDraft }) => void;
  placeholder?: string;
  showEmail?: boolean;
  gstLookupSlot?: React.ReactNode;
  disabled?: boolean;
}

export default function CustomerAutocompleteField({
  customers,
  selectedCustomerId,
  draft,
  onChange,
  placeholder = 'Type customer name, mobile, or GSTIN...',
  showEmail = false,
  gstLookupSlot,
  disabled = false,
}: CustomerAutocompleteFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showNewFieldsManually, setShowNewFieldsManually] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) || null,
    [customers, selectedCustomerId],
  );

  // If selectedCustomerId is present before draft finishes syncing, display customer's name cleanly
  const displayNameValue = selectedCustomer && !draft.name ? selectedCustomer.name : draft.name;

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const filteredCustomers = useMemo(() => {
    const q = displayNameValue.trim().toLowerCase();
    if (!q) return customers.slice(0, 12);
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.mobile || '').toLowerCase().includes(q) ||
        (c.gstin || '').toLowerCase().includes(q),
    );
  }, [customers, displayNameValue]);

  const handleNameChange = (value: string) => {
    if (selectedCustomerId) {
      // Editing away from a picked customer switches cleanly back to search / new entry
      onChange({
        selectedCustomerId: '',
        draft: { ...EMPTY_CUSTOMER_DRAFT, name: value },
      });
    } else {
      onChange({
        selectedCustomerId: '',
        draft: { ...draft, name: value },
      });
    }
    setIsOpen(true);
  };

  const handlePickCustomer = (c: CustomerOption) => {
    onChange({
      selectedCustomerId: c.id,
      draft: draftFromCustomer(c),
    });
    setShowNewFieldsManually(false);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange({
      selectedCustomerId: '',
      draft: EMPTY_CUSTOMER_DRAFT,
    });
    setShowNewFieldsManually(false);
    setIsOpen(false);
  };

  const updateDraftField = (field: keyof CustomerDraft, value: string) => {
    onChange({
      selectedCustomerId: '',
      draft: { ...draft, [field]: value },
    });
  };

  const showNewEntryForm =
    !selectedCustomer && (draft.name.trim().length > 0 || showNewFieldsManually);

  return (
    <div ref={containerRef} className="space-y-2">
      {/* Editable Customer Name Input (Blank by default on new documents) */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={displayNameValue}
          disabled={disabled}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          aria-label="Customer Name"
          className={`w-full pl-8 pr-8 py-2 border rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
            selectedCustomer
              ? 'bg-emerald-50/40 border-emerald-300 focus:border-emerald-500 focus:ring-emerald-100'
              : 'bg-slate-50 border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-indigo-100'
          }`}
        />
        {(displayNameValue || selectedCustomer) && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            title="Clear customer"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Autocomplete Dropdown */}
        {isOpen && !selectedCustomer && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-40 max-h-64 overflow-y-auto divide-y divide-slate-100">
            {filteredCustomers.length > 0 ? (
              <>
                {filteredCustomers.slice(0, 15).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handlePickCustomer(c)}
                    className="w-full text-left px-3 py-2 hover:bg-indigo-50/70 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate flex items-center gap-1.5">
                        <span>{c.name}</span>
                        {c.gstin && (
                          <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                            {c.gstin}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {c.mobile || 'No phone'}
                        {c.billingAddress ? ` • ${c.billingAddress}` : ''}
                      </div>
                    </div>
                    {typeof c.totalOutstanding === 'number' && c.totalOutstanding > 0 && (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded shrink-0">
                        Due ₹{c.totalOutstanding.toLocaleString('en-IN')}
                      </span>
                    )}
                  </button>
                ))}
                {displayNameValue.trim().length >= 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewFieldsManually(true);
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 bg-amber-50/70 hover:bg-amber-100/80 text-xs font-semibold text-amber-800 flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5 shrink-0" />
                    <span>Enter &ldquo;{displayNameValue.trim()}&rdquo; as a new customer</span>
                  </button>
                )}
              </>
            ) : (
              <div className="p-3 space-y-2">
                <p className="text-xs text-slate-500">
                  {displayNameValue.trim()
                    ? `No existing customer matching "${displayNameValue.trim()}".`
                    : 'No saved customers yet.'}
                </p>
                {displayNameValue.trim().length >= 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewFieldsManually(true);
                      setIsOpen(false);
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1.5 rounded-lg cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add details for &ldquo;{displayNameValue.trim()}&rdquo; below</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Populated Existing Customer Details */}
      {selectedCustomer && (
        <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-200 flex flex-wrap items-start justify-between gap-2 text-xs">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                <CheckCircle2 className="w-3 h-3" /> Existing Customer
              </span>
              {selectedCustomer.gstin && (
                <span className="text-[10px] font-mono font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                  GSTIN: {selectedCustomer.gstin}
                </span>
              )}
              {typeof selectedCustomer.totalOutstanding === 'number' &&
                selectedCustomer.totalOutstanding > 0 && (
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                    Prev. Udhaar: ₹{selectedCustomer.totalOutstanding.toLocaleString('en-IN')}
                  </span>
                )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                {selectedCustomer.mobile || 'No mobile'}
              </span>
              {selectedCustomer.email && (
                <span className="truncate">{selectedCustomer.email}</span>
              )}
              {selectedCustomer.billingAddress && (
                <span className="inline-flex items-center gap-1 truncate max-w-md">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  {selectedCustomer.billingAddress}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Inline New Customer Entry Fields when typing a new/unmatched customer name */}
      {showNewEntryForm && (
        <div className="p-2.5 rounded-lg bg-amber-50/40 border border-amber-200 space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800">
              <Sparkles className="w-3 h-3 text-amber-600" />
              New Customer Entry (auto-saved with this document)
            </span>
            {filteredCustomers.length > 0 && draft.name.trim().length > 0 && (
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="text-[11px] font-semibold text-indigo-700 hover:underline cursor-pointer"
              >
                {filteredCustomers.length} existing match{filteredCustomers.length > 1 ? 'es' : ''} found
              </button>
            )}
          </div>

          {gstLookupSlot}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-0.5">
                Mobile Number
              </label>
              <input
                type="tel"
                value={draft.mobile}
                maxLength={15}
                onChange={(e) => updateDraftField('mobile', e.target.value)}
                placeholder="10-digit mobile (optional)"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-0.5">
                GSTIN (Optional)
              </label>
              <input
                type="text"
                value={draft.gstin}
                maxLength={15}
                onChange={(e) => updateDraftField('gstin', e.target.value.toUpperCase())}
                placeholder="15-char GSTIN"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-mono uppercase text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {showEmail && (
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-0.5">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={draft.email}
                  onChange={(e) => updateDraftField('email', e.target.value)}
                  placeholder="customer@email.com"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            <div className={showEmail ? '' : 'sm:col-span-2'}>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-0.5 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-400" />
                Billing Address (Optional)
              </label>
              <input
                type="text"
                value={draft.billingAddress}
                onChange={(e) => updateDraftField('billingAddress', e.target.value)}
                placeholder="Street, City, State..."
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

