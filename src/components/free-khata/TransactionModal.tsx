'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  User,
  Phone,
  FileText,
  AlertCircle,
  Check,
  CreditCard,
  Building,
  QrCode,
  Banknote,
  Clock,
  Sparkles,
} from 'lucide-react';
import { PaymentMethod } from '@prisma/client';

export interface ContactOption {
  id: string;
  name: string;
  phone?: string | null;
  amountToReceive?: number;
  amountToPay?: number;
  gaveOutstanding?: number;
  receivedOutstanding?: number;
}

export type KhataTransactionSubtype =
  | 'GAVE_NEW'        // मैंने नई रकम दी (Lent new money)
  | 'BORROWED_REPAY'  // पहले ली गई रकम वापस की (Returning borrowed money)
  | 'LENT_REPAY'      // पहले दी गई रकम वापस मिली (Receiving back lent money)
  | 'RECEIVED_NEW';   // मैंने नई रकम ली (Borrowed new money)

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  primaryIntent?: 'GAVE' | 'RECEIVED' | null;
  initialSubtype?: KhataTransactionSubtype | null;
  preselectedContact?: ContactOption | null;
  existingContacts?: ContactOption[];
}

export function TransactionModal({
  isOpen,
  onClose,
  onSuccess,
  primaryIntent = 'GAVE',
  initialSubtype = null,
  preselectedContact = null,
  existingContacts = [],
}: TransactionModalProps) {
  // Step 1: Subtype selection (if not already set)
  // Step 2: Form entry
  const [subtype, setSubtype] = useState<KhataTransactionSubtype | null>(initialSubtype);

  // Form fields
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [personName, setPersonName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');

  // Payment mode
  const [paymentMode, setPaymentMode] = useState<PaymentMethod>('CASH');
  const [paymentRef, setPaymentRef] = useState('');
  const [upiApp, setUpiApp] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [otherModeDetails, setOtherModeDetails] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setAmount('');
      setDescription('');
      setDueDate('');
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentMode('CASH');
      setPaymentRef('');
      setUpiApp('');
      setBankName('');
      setChequeDate('');
      setOtherModeDetails('');

      if (initialSubtype) {
        setSubtype(initialSubtype);
      } else if (primaryIntent === 'GAVE') {
        setSubtype(null); // Show the 2 options for "मैंने रकम दी"
      } else if (primaryIntent === 'RECEIVED') {
        setSubtype(null); // Show the 2 options for "मुझे रकम मिली"
      } else {
        setSubtype('GAVE_NEW');
      }

      if (preselectedContact) {
        setSelectedContactId(preselectedContact.id);
        setPersonName(preselectedContact.name);
        setPhone(preselectedContact.phone || '');
      } else {
        setSelectedContactId('');
        setPersonName('');
        setPhone('');
      }
    }
  }, [isOpen, primaryIntent, initialSubtype, preselectedContact]);

  if (!isOpen) return null;

  // Selected contact's outstanding context for repayments
  const selectedContact = existingContacts.find((c) => c.id === selectedContactId);
  const contactReceivable =
    selectedContact?.amountToReceive ?? selectedContact?.gaveOutstanding ?? 0;
  const contactPayable =
    selectedContact?.amountToPay ?? selectedContact?.receivedOutstanding ?? 0;

  const isRepayment = subtype === 'BORROWED_REPAY' || subtype === 'LENT_REPAY';
  const outstandingForRepayment =
    subtype === 'BORROWED_REPAY' ? contactPayable : subtype === 'LENT_REPAY' ? contactReceivable : 0;

  const parsedAmount = parseFloat(amount) || 0;
  const remainingAfterRepay = Math.max(0, outstandingForRepayment - parsedAmount);

  const handleContactSelect = (contactId: string) => {
    setSelectedContactId(contactId);
    if (contactId === 'NEW') {
      setPersonName('');
      setPhone('');
    } else {
      const found = existingContacts.find((c) => c.id === contactId);
      if (found) {
        setPersonName(found.name);
        setPhone(found.phone || '');
        if (isRepayment) {
          const maxRepay =
            subtype === 'BORROWED_REPAY'
              ? found.amountToPay ?? found.receivedOutstanding ?? 0
              : found.amountToReceive ?? found.gaveOutstanding ?? 0;
          if (maxRepay > 0) {
            setAmount(maxRepay.toString());
          }
        }
      }
    }
  };

  const handleSetFullRepayment = () => {
    if (outstandingForRepayment > 0) {
      setAmount(outstandingForRepayment.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (parsedAmount <= 0) {
      setError('कृपया वैध रकम दर्ज करें जो 0 से अधिक हो। (Enter amount > 0).');
      return;
    }

    if (!selectedContactId && (!personName || personName.trim().length < 2)) {
      setError('कृपया व्यक्ति का नाम दर्ज करें (कम से कम 2 अक्षर)।');
      return;
    }

    if (isRepayment) {
      if (outstandingForRepayment <= 0) {
        setError(
          subtype === 'BORROWED_REPAY'
            ? 'इस संपर्क को आपको कोई रकम वापस नहीं करनी है।'
            : 'इस संपर्क से आपको कोई रकम वापस नहीं लेनी है।'
        );
        return;
      }
      if (parsedAmount > outstandingForRepayment) {
        setError(
          `वापसी रकम (₹${parsedAmount}) बाकी रकम (₹${outstandingForRepayment}) से अधिक नहीं हो सकती।`
        );
        return;
      }
    }

    setLoading(true);

    try {
      // Build structured paymentDetails string
      let paymentDetailsPayload: string | null = null;
      if (paymentMode === 'UPI' && upiApp.trim()) {
        paymentDetailsPayload = JSON.stringify({ app: upiApp.trim() });
      } else if (paymentMode === 'BANK_TRANSFER' && bankName.trim()) {
        paymentDetailsPayload = JSON.stringify({ bank: bankName.trim() });
      } else if (paymentMode === 'CHEQUE' && chequeDate) {
        paymentDetailsPayload = JSON.stringify({ chequeDate });
      } else if (paymentMode === 'OTHER' && otherModeDetails.trim()) {
        paymentDetailsPayload = JSON.stringify({ note: otherModeDetails.trim() });
      }

      if (isRepayment) {
        // Record repayment
        const targetType = subtype === 'BORROWED_REPAY' ? 'RECEIVED' : 'GAVE';
        const payload = {
          contactId: selectedContactId,
          targetType,
          amount: parsedAmount,
          date: new Date(date).toISOString(),
          paymentMode,
          paymentRef: paymentRef.trim() || null,
          paymentDetails: paymentDetailsPayload,
          notes: description.trim() || null,
        };

        const res = await fetch('/api/free-khata/repayments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to record repayment.');
        }
      } else {
        // Record original transaction: GAVE_NEW (GAVE) or RECEIVED_NEW (RECEIVED)
        const type = subtype === 'GAVE_NEW' ? 'GAVE' : 'RECEIVED';
        const payload: any = {
          type,
          amount: parsedAmount,
          date: new Date(date).toISOString(),
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          description: description.trim() || null,
          paymentMode,
          paymentRef: paymentRef.trim() || null,
          paymentDetails: paymentDetailsPayload,
        };

        if (selectedContactId && selectedContactId !== 'NEW') {
          payload.contactId = selectedContactId;
          if (phone.trim()) payload.phone = phone.trim();
        } else {
          payload.personName = personName.trim();
          payload.phone = phone.trim() || null;
        }

        const res = await fetch('/api/free-khata/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to save transaction.');
        }
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handlePickPhoneContact = async () => {
    if (typeof window !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window) {
      try {
        const contacts = await (navigator as any).contacts.select(['name', 'tel'], {
          multiple: false,
        });
        if (contacts && contacts[0]) {
          const picked = contacts[0];
          const rawName = picked.name?.[0] || '';
          const rawPhone = (picked.tel?.[0] || '').replace(/\D/g, '').slice(-10);

          const existing = existingContacts.find(
            (c) => c.phone && c.phone.replace(/\D/g, '').slice(-10) === rawPhone
          );
          if (existing) {
            handleContactSelect(existing.id);
          } else {
            setSelectedContactId('NEW');
            setPersonName(rawName);
            setPhone(rawPhone);
          }
        }
      } catch (err) {
        console.warn('Contact picker dismissed or not permitted:', err);
      }
    }
  };

  // Titles & color styling based on chosen subtype
  const isGaveDirection = subtype === 'GAVE_NEW' || subtype === 'BORROWED_REPAY';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 my-auto">
        {/* Step 1: Subtype Picker if not yet selected */}
        {!subtype ? (
          <div className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Personal Khata • नया हिसाब
                </span>
                <h3 className="text-lg font-black text-[#071F38] mt-0.5">
                  {primaryIntent === 'GAVE' ? 'मैंने रकम दी (पैसे मेरे पास से गए)' : 'मुझे रकम मिली (पैसे मेरे पास आए)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-5 space-y-3.5">
              <p className="text-xs font-semibold text-slate-600">
                कृपया लेन-देन का प्रकार चुनें:
              </p>

              {primaryIntent === 'GAVE' ? (
                <>
                  {/* Option 1: नई रकम दी */}
                  <button
                    type="button"
                    onClick={() => setSubtype('GAVE_NEW')}
                    className="w-full text-left p-4 rounded-2xl border-2 border-rose-200 hover:border-rose-500 bg-rose-50/50 hover:bg-rose-50 transition-all flex items-start gap-3.5 group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <strong className="text-sm font-black text-rose-950 group-hover:text-rose-700">
                          1. नई रकम दी
                        </strong>
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-full">
                          मिलने वाली रकम बढ़ेगी
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        मैंने किसी को नई रकम दी है। अब मुझे वापस मिलनी है।
                      </p>
                    </div>
                  </button>

                  {/* Option 2: पहले ली गई रकम वापस की */}
                  <button
                    type="button"
                    onClick={() => setSubtype('BORROWED_REPAY')}
                    className="w-full text-left p-4 rounded-2xl border-2 border-slate-200 hover:border-[#071F38] bg-slate-50 hover:bg-white transition-all flex items-start gap-3.5 group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#071F38] text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Check className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <strong className="text-sm font-black text-[#071F38]">
                          2. पहले ली गई रकम वापस की
                        </strong>
                        <span className="text-[10px] font-bold text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded-full">
                          देने वाली रकम घटेगी
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        मैंने पहले किसी से रकम ली थी और अब वापस कर रहा हूं।
                      </p>
                    </div>
                  </button>
                </>
              ) : (
                <>
                  {/* Option 1: पहले दी गई रकम वापस मिली */}
                  <button
                    type="button"
                    onClick={() => setSubtype('LENT_REPAY')}
                    className="w-full text-left p-4 rounded-2xl border-2 border-emerald-200 hover:border-emerald-600 bg-emerald-50/50 hover:bg-emerald-50 transition-all flex items-start gap-3.5 group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Check className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <strong className="text-sm font-black text-emerald-950 group-hover:text-emerald-700">
                          1. पहले दी गई रकम वापस मिली
                        </strong>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                          मिलने वाली रकम घटेगी
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        मैंने पहले किसी को रकम दी थी और अब वह वापस मिली है।
                      </p>
                    </div>
                  </button>

                  {/* Option 2: नई रकम ली */}
                  <button
                    type="button"
                    onClick={() => setSubtype('RECEIVED_NEW')}
                    className="w-full text-left p-4 rounded-2xl border-2 border-slate-200 hover:border-[#071F38] bg-slate-50 hover:bg-white transition-all flex items-start gap-3.5 group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <ArrowDownLeft className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <strong className="text-sm font-black text-[#071F38]">
                          2. नई रकम ली
                        </strong>
                        <span className="text-[10px] font-bold text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded-full">
                          देने वाली रकम बढ़ेगी
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        मैंने किसी से नई रकम ली है और अब मुझे वापस करनी है।
                      </p>
                    </div>
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          /* Step 2: Clean Entry Form */
          <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
            {/* Header */}
            <div
              className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${isGaveDirection
                ? 'bg-rose-50/80 border-rose-100'
                : 'bg-emerald-50/80 border-emerald-100'
                }`}
            >
              <div>
                <button
                  type="button"
                  onClick={() => setSubtype(null)}
                  className="text-[10.5px] font-bold text-slate-500 hover:underline mb-0.5 block cursor-pointer"
                >
                  ← प्रकार बदलें
                </button>
                <h3 className="text-base sm:text-lg font-black text-[#071F38]">
                  {subtype === 'GAVE_NEW' && 'मैंने नई रकम दी'}
                  {subtype === 'BORROWED_REPAY' && 'पहले ली गई रकम वापस की'}
                  {subtype === 'LENT_REPAY' && 'पहले दी गई रकम वापस मिली'}
                  {subtype === 'RECEIVED_NEW' && 'मैंने नई रकम ली'}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-white/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Person Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    व्यक्ति का नाम (Person / Contact) <span className="text-rose-500">*</span>
                  </label>
                  {!preselectedContact && typeof window !== 'undefined' && 'contacts' in navigator && (
                    <button
                      type="button"
                      onClick={handlePickPhoneContact}
                      className="text-[11px] font-bold text-[#EA580C] hover:text-[#D94E00] inline-flex items-center gap-1 cursor-pointer hover:underline"
                    >
                      <Phone className="w-3 h-3" />
                      <span>फोन संपर्क से चुनें</span>
                    </button>
                  )}
                </div>

                {preselectedContact ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <strong className="text-xs text-slate-800">{preselectedContact.name}</strong>
                      {preselectedContact.phone && (
                        <span className="text-[11px] text-slate-500 block">
                          {preselectedContact.phone}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      चयनित संपर्क
                    </span>
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedContactId}
                      onChange={(e) => handleContactSelect(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C] focus:bg-white font-medium"
                    >
                      <option value="">-- संपर्क चुनें (या नया जोड़ें) --</option>
                      <option value="NEW">+ नया संपर्क जोड़ें (Add New Contact)</option>
                      {existingContacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${c.phone})` : ''}
                        </option>
                      ))}
                    </select>

                    {/* Show New Contact Fields if 'NEW' or none selected */}
                    {selectedContactId === 'NEW' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        <input
                          type="text"
                          required
                          value={personName}
                          onChange={(e) => setPersonName(e.target.value)}
                          placeholder="व्यक्ति का नाम *"
                          className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                        />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="मोबाइल नंबर (वैकल्पिक)"
                          className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Repayment Context Banner */}
              {isRepayment && (
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium text-[11px]">
                      {subtype === 'BORROWED_REPAY' ? 'कुल देने वाली रकम:' : 'कुल मिलने वाली रकम:'}
                    </span>
                    <strong className="text-sm font-black text-[#071F38]">
                      ₹{outstandingForRepayment.toLocaleString('en-IN')}
                    </strong>
                  </div>

                  {outstandingForRepayment > 0 && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500 text-[10.5px]">
                        वापसी के बाद बाकी रकम:
                      </span>
                      <strong className="text-xs font-bold text-emerald-700">
                        ₹{remainingAfterRepay.toLocaleString('en-IN')}
                      </strong>
                    </div>
                  )}

                  {outstandingForRepayment > 0 && (
                    <div className="pt-1.5 flex justify-end">
                      <button
                        type="button"
                        onClick={handleSetFullRepayment}
                        className="text-[10px] font-bold text-[#EA580C] hover:underline cursor-pointer"
                      >
                        पूरा भुगतान सेट करें (Full: ₹{outstandingForRepayment.toLocaleString('en-IN')})
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Amount & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    रकम दर्ज करें (Enter Amount) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm font-black text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="5000"
                      className="w-full text-base font-black pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    तारीख (Date)
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C] focus:bg-white font-medium"
                  />
                </div>
              </div>

              {/* Due Date (Only for New Lending / Borrowing) */}
              {!isRepayment && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    वापसी की तारीख (Due Date - Optional)
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C] focus:bg-white font-medium"
                  />
                </div>
              )}

              {/* Transaction Mode / भुगतान का माध्यम (MANDATORY) */}
              <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-2.5">
                <label className="block text-xs font-bold text-slate-800">
                  भुगतान का माध्यम (Transaction Mode) <span className="text-rose-500">*</span>
                </label>

                {/* Mode Selector Tabs */}
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {(
                    [
                      { mode: 'CASH', label: 'Cash (नकद)' },
                      { mode: 'UPI', label: 'UPI' },
                      { mode: 'BANK_TRANSFER', label: 'Bank' },
                      { mode: 'CHEQUE', label: 'Cheque' },
                      { mode: 'OTHER', label: 'Other' },
                    ] as const
                  ).map((m) => {
                    const isSelected = paymentMode === m.mode;
                    return (
                      <button
                        key={m.mode}
                        type="button"
                        onClick={() => setPaymentMode(m.mode)}
                        className={`py-2 px-2 text-[11px] font-bold rounded-xl border text-center transition-all cursor-pointer ${isSelected
                          ? 'bg-[#071F38] text-white border-[#071F38] shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>

                {/* Conditional Fields based on Mode */}
                {paymentMode === 'UPI' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 animate-in fade-in">
                    <div>
                      <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                        UPI App (वैकल्पिक)
                      </label>
                      <select
                        value={upiApp}
                        onChange={(e) => setUpiApp(e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                      >
                        <option value="">-- App चुनें --</option>
                        <option value="PhonePe">PhonePe</option>
                        <option value="Google Pay">Google Pay</option>
                        <option value="Paytm">Paytm</option>
                        <option value="BHIM">BHIM</option>
                        <option value="Other UPI">Other UPI</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                        UPI Ref / UTR No. (वैकल्पिक)
                      </label>
                      <input
                        type="text"
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        placeholder="12-digit UTR No."
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                      />
                    </div>
                  </div>
                )}

                {paymentMode === 'BANK_TRANSFER' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 animate-in fade-in">
                    <div>
                      <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                        Bank Name (वैकल्पिक)
                      </label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. SBI, HDFC"
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                        UTR / Ref No. (वैकल्पिक)
                      </label>
                      <input
                        type="text"
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        placeholder="Bank Reference No."
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                      />
                    </div>
                  </div>
                )}

                {paymentMode === 'CHEQUE' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 animate-in fade-in">
                    <div>
                      <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                        Cheque Number (वैकल्पिक)
                      </label>
                      <input
                        type="text"
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        placeholder="6-digit Cheque No."
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                        Cheque Date (वैकल्पिक)
                      </label>
                      <input
                        type="date"
                        value={chequeDate}
                        onChange={(e) => setChequeDate(e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                      />
                    </div>
                  </div>
                )}

                {paymentMode === 'OTHER' && (
                  <div className="pt-1 animate-in fade-in">
                    <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                      माध्यम का विवरण (Details)
                    </label>
                    <input
                      type="text"
                      value={otherModeDetails}
                      onChange={(e) => setOtherModeDetails(e.target.value)}
                      placeholder="e.g. Wallet, Gold, Barter"
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                    />
                  </div>
                )}
              </div>

              {/* Description / Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  विवरण / टिप्पणी (Description / Note - Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="किस काम के लिए पैसे दिए/लिए..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C] focus:bg-white"
                />
              </div>

              {/* Confirmation Preview */}
              {parsedAmount > 0 && (
                <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">
                      पुष्टि सारांश (Confirmation):
                    </span>
                    <span className="text-[11px] text-slate-600">
                      ₹{parsedAmount.toLocaleString('en-IN')} • {paymentMode} •{' '}
                      {subtype === 'GAVE_NEW' && 'मिलने वाली रकम में जुड़ेगी'}
                      {subtype === 'BORROWED_REPAY' && 'देने वाली रकम से घटेगी'}
                      {subtype === 'LENT_REPAY' && 'मिलने वाली रकम से घटेगी'}
                      {subtype === 'RECEIVED_NEW' && 'देने वाली रकम में जुड़ेगी'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="submit"
                disabled={loading || parsedAmount <= 0}
                className={`px-5 py-2.5 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50 active:scale-95 flex items-center gap-2 ${isGaveDirection ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#00B887] hover:bg-[#009E74]'
                  }`}
              >
                {loading ? (
                  <span>सहेजा जा रहा है...</span>
                ) : (
                  <span>नया हिसाब जोड़ें</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
