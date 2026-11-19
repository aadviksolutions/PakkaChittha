'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Mic, 
  MicOff, 
  Sparkles, 
  CheckCircle2, 
  X, 
  RotateCcw, 
  AlertCircle, 
  ArrowRight, 
  Edit3, 
  Users, 
  ShieldAlert,
  Loader2,
  Check,
  FileText,
  UserPlus,
  Receipt,
  Plus,
  ChevronRight,
  Phone,
  MapPin
} from 'lucide-react';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { 
  parseVoiceTransaction, 
  ParsedVoiceTransaction, 
  VoiceTransactionType, 
  VoicePaymentMode,
  ParsedVoiceItem 
} from '@/lib/voice/smartVoiceParser';
import { useToast } from '@/context/ToastContext';

interface VoiceEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: any) => void;
}

interface PartyMatch {
  id: string;
  name: string;
  phone: string | null;
  partyType: 'CUSTOMER' | 'SUPPLIER' | 'KHATA_CONTACT';
  partyTypeLabel: string;
  currentBalance: number;
  balanceLabel: string;
  isExactMatch: boolean;
  score: number;
}

interface ProductSuggestion {
  id: string;
  name: string;
  unit: string;
  sellingPrice: number;
  currentStock: number;
  matchScore: number;
}

interface MatchedLineItem {
  matched: boolean;
  productId: string | null;
  name: string;
  spokenName: string;
  quantity: number;
  unit: string;
  rate: number;
  taxRate: number;
  hsnCode: string | null;
  currentStock: number;
  lineTotal: number;
  needsRateInput?: boolean;
  suggestions?: ProductSuggestion[];
}

export function VoiceEntryModal({ isOpen, onClose, onSuccess }: VoiceEntryModalProps) {
  const router = useRouter();
  const { toast } = useToast();

  const {
    isSupported,
    isListening,
    transcript,
    setTranscript,
    error: micError,
    permissionDenied,
    selectedLang,
    setSelectedLang,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceRecognition();

  const [parsed, setParsed] = useState<ParsedVoiceTransaction | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Editable parsed fields
  const [editType, setEditType] = useState<VoiceTransactionType>('PAYMENT_RECEIVED');
  const [editAmount, setEditAmount] = useState<string>('');
  const [editPartyName, setEditPartyName] = useState<string>('');
  const [editPaymentMode, setEditPaymentMode] = useState<VoicePaymentMode>('CASH');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');

  // Party matches state
  const [partyMatches, setPartyMatches] = useState<PartyMatch[]>([]);
  const [selectedParty, setSelectedParty] = useState<PartyMatch | null>(null);
  const [isSearchingParty, setIsSearchingParty] = useState(false);

  // Inline New Customer Creation State
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustMobile, setNewCustMobile] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustGstin, setNewCustGstin] = useState('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomerError, setNewCustomerError] = useState<string | null>(null);

  // Voice Invoice & Product Matching State
  const [invoiceMode, setInvoiceMode] = useState(false);
  const [matchedItems, setMatchedItems] = useState<MatchedLineItem[]>([]);
  const [matchingProducts, setMatchingProducts] = useState(false);
  const [cashReceivedInput, setCashReceivedInput] = useState<string>('0');
  const [discountInput, setDiscountInput] = useState<string>('0');

  // Auto-parse transcript when updated
  useEffect(() => {
    if (transcript && transcript.trim().length > 3) {
      const res = parseVoiceTransaction(transcript);
      setParsed(res);

      // Handle Direct Voice Customer Creation Intent
      if (res.isCustomerCreateIntent && res.customerName) {
        setShowNewCustomerForm(true);
        setNewCustName(res.customerName);
        if (res.customerMobile) {
          setNewCustMobile(res.customerMobile);
        }
        return;
      }

      setEditType(res.type);
      setEditAmount(res.amount ? res.amount.toString() : '');
      setEditPartyName(res.partyName || '');
      setEditPaymentMode(res.paymentMode);
      setEditCategory(res.category || '');
      setEditDescription(res.description || '');

      const isInv = res.isInvoiceIntent || (res.items && res.items.length > 0);
      setInvoiceMode(isInv);

      if (res.cashReceived !== null) {
        setCashReceivedInput(String(res.cashReceived));
      } else {
        setCashReceivedInput('0');
      }

      if (res.discount !== null) {
        setDiscountInput(String(res.discount));
      } else {
        setDiscountInput('0');
      }

      // Trigger party search
      if (res.partyName) {
        searchParty(res.partyName, res.type);
      } else {
        setPartyMatches([]);
        setSelectedParty(null);
      }

      // Trigger product matching if items were extracted
      if (res.items && res.items.length > 0) {
        matchProducts(res.items);
      } else {
        setMatchedItems([]);
      }
    }
  }, [transcript]);

  // Search existing customers and suppliers
  const searchParty = async (name: string, type: VoiceTransactionType) => {
    try {
      setIsSearchingParty(true);
      const res = await fetch(`/api/voice/match-party?name=${encodeURIComponent(name)}&type=${type}`);
      const data = await res.json();
      if (data.success && data.matches) {
        setPartyMatches(data.matches);

        // Strict requirement: Only auto-select when there is an exact single match
        if (data.matches.length === 1 && data.matches[0].isExactMatch) {
          setSelectedParty(data.matches[0]);
        } else {
          // Keep null so user explicitly picks from the list
          setSelectedParty(null);
        }
      }
    } catch (e) {
      console.warn('Party search error', e);
    } finally {
      setIsSearchingParty(false);
    }
  };

  // Match items with Product Master
  const matchProducts = async (items: ParsedVoiceItem[]) => {
    try {
      setMatchingProducts(true);
      const res = await fetch('/api/voice/match-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.matchedItems)) {
        setMatchedItems(data.matchedItems);
      }
    } catch (e) {
      console.warn('Product matching error', e);
    } finally {
      setMatchingProducts(false);
    }
  };

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Select a suggested product for a line item
  const handleSelectSuggestion = (index: number, sug: ProductSuggestion) => {
    setMatchedItems((prev) => {
      const copy = [...prev];
      const item = copy[index];
      const newRate = sug.sellingPrice;
      const newLineTotal = Math.round((Number(item.quantity || 1) * newRate + Number.EPSILON) * 100) / 100;
      copy[index] = {
        ...item,
        matched: true,
        productId: sug.id,
        name: sug.name,
        unit: sug.unit,
        rate: newRate,
        lineTotal: newLineTotal,
        currentStock: sug.currentStock,
        needsRateInput: false,
      };
      return copy;
    });
  };

  // Update item rate or qty manually in invoice preview
  const handleUpdateItem = (index: number, field: keyof MatchedLineItem, value: any) => {
    setMatchedItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], [field]: value };
      if (field === 'rate' || field === 'quantity') {
        item.lineTotal = Math.round((Number(item.quantity || 0) * Number(item.rate || 0) + Number.EPSILON) * 100) / 100;
        if (item.rate > 0) item.needsRateInput = false;
      }
      copy[index] = item;
      return copy;
    });
  };

  // Save Inline New Customer without losing transaction continuity
  const handleSaveNewCustomer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedName = newCustName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setNewCustomerError('कृपया ग्राहक का नाम कम से कम 2 अक्षर का दर्ज करें।');
      return;
    }

    try {
      setIsCreatingCustomer(true);
      setNewCustomerError(null);

      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          mobile: newCustMobile.trim() || undefined,
          email: newCustEmail.trim() || undefined,
          billingAddress: newCustAddress.trim() || undefined,
          gstin: newCustGstin.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ग्राहक जोड़ने में समस्या आई।');
      }

      const created = data.customer;
      const newParty: PartyMatch = {
        id: created.id,
        name: created.name,
        phone: created.mobile || null,
        partyType: 'CUSTOMER',
        partyTypeLabel: 'Customer (ग्राहक)',
        currentBalance: 0,
        balanceLabel: '₹0',
        isExactMatch: true,
        score: 100,
      };

      setSelectedParty(newParty);
      setEditPartyName(created.name);
      setShowNewCustomerForm(false);
      setNewCustomerError(null);
      toast.success(`नया ग्राहक "${created.name}" सफलतापूर्वक जोड़ा गया!`);
    } catch (err: any) {
      setNewCustomerError(err.message || 'ग्राहक जोड़ने में त्रुटि हुई।');
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  // Calculate invoice subtotal, grand total, balance due
  const itemsSubtotal = matchedItems.reduce((acc, it) => acc + (it.lineTotal || 0), 0);
  const activeAmount = invoiceMode && matchedItems.length > 0 ? itemsSubtotal : parseFloat(editAmount) || 0;
  const currentDiscount = parseFloat(discountInput) || 0;
  const grandTotal = Math.max(0, activeAmount - currentDiscount);
  const paidVal = parseFloat(cashReceivedInput) || 0;
  const balanceDue = Math.max(0, grandTotal - paidVal);

  // Check if any item lacks rate
  const missingRateItem = matchedItems.find((it) => !it.rate || it.rate <= 0);

  // Confirm & Save standard financial transaction
  const handleConfirmAndSave = async () => {
    const amountVal = activeAmount;
    if (!amountVal || isNaN(amountVal) || amountVal <= 0) {
      setSaveError('Please enter a valid amount.');
      return;
    }

    if (editType !== 'EXPENSE' && !editPartyName.trim() && !selectedParty) {
      setSaveError('Please select or specify a customer/party name.');
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);

      const payload = {
        type: editType,
        amount: amountVal,
        partyName: selectedParty?.name || editPartyName.trim() || undefined,
        partyId: selectedParty?.id || undefined,
        partyType: selectedParty?.partyType || undefined,
        paymentMode: editPaymentMode,
        category: editCategory.trim() || undefined,
        description: editDescription.trim() || undefined,
        idempotencyKey: `voice_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      };

      const res = await fetch('/api/voice/save-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(data.message || 'Transaction recorded successfully!');
        if (onSuccess) onSuccess(data);
        handleClose();
      } else {
        setSaveError(data.error || 'Failed to save transaction.');
      }
    } catch (err: any) {
      console.error(err);
      setSaveError(err.message || 'Server error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  // Create Voice Invoice directly with line items & double-entry posting
  const handleCreateVoiceInvoice = async () => {
    if (matchedItems.length === 0) {
      setSaveError('At least one item is required to generate an invoice.');
      return;
    }

    if (missingRateItem) {
      setSaveError(`Please enter a selling rate for "${missingRateItem.name}". Rates are never guessed.`);
      return;
    }

    const customerName = selectedParty?.name || editPartyName.trim();
    if (!customerName) {
      setSaveError('Customer name is required for invoice.');
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);

      const invoicePayload = {
        customerId: selectedParty?.partyType === 'CUSTOMER' ? selectedParty.id : undefined,
        customerName,
        customerMobile: selectedParty?.phone || undefined,
        items: matchedItems.map((it) => ({
          productId: it.productId,
          description: it.name,
          quantity: it.quantity,
          unit: it.unit,
          rate: it.rate,
          taxRate: it.taxRate,
          hsnCode: it.hsnCode,
        })),
        paidAmount: paidVal,
        paymentMode: editPaymentMode,
        discount: currentDiscount,
        notes: `Generated via Smart Voice Entry: "${transcript}"`,
      };

      const res = await fetch('/api/voice/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoicePayload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create invoice from voice entry.');
      }

      toast.success(data.message || `Invoice #${data.invoice.invoiceNumber} created successfully!`);
      if (onSuccess) onSuccess(data);
      handleClose();
    } catch (err: any) {
      setSaveError(err.message || 'Failed to create invoice.');
    } finally {
      setIsSaving(false);
    }
  };

  // Open Full Invoice Editor with pre-filled state
  const handleOpenFullInvoice = () => {
    try {
      const draft = {
        customerId: selectedParty?.partyType === 'CUSTOMER' ? selectedParty.id : undefined,
        customerName: selectedParty?.name || editPartyName.trim(),
        customerMobile: selectedParty?.phone || undefined,
        items: matchedItems.map((it) => ({
          productId: it.productId,
          description: it.name,
          quantity: it.quantity,
          unit: it.unit,
          rate: it.rate,
        })),
        cashReceived: paidVal,
        discount: currentDiscount,
      };
      sessionStorage.setItem('voice_invoice_draft', JSON.stringify(draft));
    } catch (e) {
      console.warn('Draft save notice:', e);
    }
    handleClose();
    router.push('/invoices/new?fromVoice=true');
  };

  const handleClose = () => {
    stopListening();
    resetTranscript();
    setParsed(null);
    setIsEditing(false);
    setSaveError(null);
    setPartyMatches([]);
    setSelectedParty(null);
    setMatchedItems([]);
    setInvoiceMode(false);
    setShowNewCustomerForm(false);
    setNewCustomerError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#173653] text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 leading-tight">
                Smart Voice Entry
              </h3>
              <p className="text-[11px] text-slate-500 font-normal">
                Hindi • English • Hinglish • Voice Invoices
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close voice modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Permission Denied Banner */}
          {permissionDenied && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-800">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>माइक्रोफोन अनुमति आवश्यक है (Permission Required)</span>
              </div>
              <p className="leading-relaxed">
                कृपया अपने ब्राउज़र के एड्रेस बार में लॉक (🔒) आइकन पर क्लिक करके <strong>Microphone: Allow</strong> करें।
              </p>
            </div>
          )}

          {/* Error Message */}
          {micError && !permissionDenied && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{micError}</span>
            </div>
          )}

          {/* Microphone Central Interaction Area */}
          <div className="flex flex-col items-center justify-center py-4 space-y-3 bg-gradient-to-b from-slate-50/80 to-white rounded-2xl border border-slate-100 p-4">
            <div className="relative flex items-center justify-center">
              {isListening && (
                <>
                  <div className="absolute w-24 h-24 rounded-full bg-orange-500/20 animate-ping" />
                  <div className="absolute w-20 h-20 rounded-full bg-orange-500/30 animate-pulse" />
                </>
              )}

              <button
                type="button"
                onClick={handleToggleListening}
                className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center text-white shadow-xl transition-all cursor-pointer ${
                  isListening
                    ? 'bg-rose-600 ring-4 ring-rose-200 scale-105 animate-bounce'
                    : 'bg-[#EA580C] hover:bg-[#D94E00] hover:scale-105 active:scale-95 shadow-orange-500/30'
                }`}
                aria-label={isListening ? 'Stop listening' : 'Start voice recognition'}
              >
                {isListening ? (
                  <MicOff className="w-7 h-7 text-white" />
                ) : (
                  <Mic className="w-7 h-7 text-white" />
                )}
              </button>
            </div>

            <div className="text-center">
              <span className="text-xs font-bold text-slate-800 block">
                {isListening ? 'सुन रहे हैं... बोलिए (Listening...)' : 'बोलने के लिए माइक दबाएं (Tap to Speak)'}
              </span>
              <span className="text-[11px] text-slate-400">
                {isListening
                  ? 'बोलना समाप्त होने पर दोबारा टैप करें'
                  : 'जैसे: "Ramesh se 500 liye" या "Mohan ko 5 pen diye, rate 10 rupaye"'}
              </span>
            </div>
          </div>

          {/* Transcript Editable Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600">
                पहचाना गया विवरण (Recognized Speech):
              </label>
              {transcript && (
                <button
                  type="button"
                  onClick={resetTranscript}
                  className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>साफ़ करें</span>
                </button>
              )}
            </div>

            <textarea
              rows={2}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="यहाँ आपका बोला हुआ टेक्स्ट दिखेगा, या सीधे टाइप करें..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 text-slate-800 resize-none font-medium"
            />
          </div>

          {/* Sample suggestions if transcript is empty */}
          {!transcript && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                उदाहरण (Try saying):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Ramesh ko 2 kilo chini diya.',
                  'Mohan ko 5 pen diye, rate 10 rupaye.',
                  '500 rupaye cash mila.',
                  'Ramesh se 1000 rupaye liya.',
                  'Suresh ko 10 bottle oil diya.',
                  'Do hazaar ka saman becha.',
                  '10000 ki website bacha.',
                  'नया ग्राहक Suresh Kumar जोड़ो',
                ].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTranscript(s)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-orange-50 hover:text-orange-800 text-slate-600 border border-slate-200/60 transition-colors text-left cursor-pointer"
                  >
                    💬 {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Module 4: Inline New Customer Creation Form */}
          {showNewCustomerForm && (
            <div className="p-4 bg-orange-50/80 rounded-2xl border border-orange-200 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-orange-200/60">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-orange-700" />
                  <span className="text-xs font-bold text-orange-950">
                    नया ग्राहक जोड़ें (Create New Customer)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewCustomerForm(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {newCustomerError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{newCustomerError}</span>
                </div>
              )}

              <div className="space-y-2 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-0.5">
                    ग्राहक का नाम (Customer Name) *
                  </label>
                  <input
                    type="text"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    placeholder="e.g. Suresh Kumar"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium text-xs focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-0.5">
                      मोबाइल नंबर (Mobile)
                    </label>
                    <input
                      type="tel"
                      value={newCustMobile}
                      onChange={(e) => setNewCustMobile(e.target.value)}
                      placeholder="9876543210"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 font-mono text-xs focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-0.5">
                      ईमेल (Email)
                    </label>
                    <input
                      type="email"
                      value={newCustEmail}
                      onChange={(e) => setNewCustEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-xs focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-0.5">
                      पता (Billing Address)
                    </label>
                    <input
                      type="text"
                      value={newCustAddress}
                      onChange={(e) => setNewCustAddress(e.target.value)}
                      placeholder="City / Market"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-xs focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-0.5">
                      GSTIN (वैकल्पिक)
                    </label>
                    <input
                      type="text"
                      value={newCustGstin}
                      onChange={(e) => setNewCustGstin(e.target.value.toUpperCase())}
                      placeholder="22AAAAA0000A1Z5"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 uppercase font-mono text-xs focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewCustomerForm(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                  >
                    रद्द करें
                  </button>
                  <button
                    type="button"
                    disabled={isCreatingCustomer}
                    onClick={() => handleSaveNewCustomer()}
                    className="px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {isCreatingCustomer ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>ग्राहक बन रहा है...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>ग्राहक सुरक्षित करें (Save Customer)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Module 2: Multiple Matching Customers Selector */}
          {partyMatches.length > 0 && !selectedParty && !showNewCustomerForm && (
            <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200 space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-700" />
                  <span className="text-xs font-bold text-amber-900">
                    मिलते-जुलते संपर्क ({partyMatches.length} Matches Found)
                  </span>
                </div>
                <span className="text-[11px] text-amber-700">कृपया सही पार्टी चुनें:</span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {partyMatches.map((party) => (
                  <button
                    key={party.id}
                    type="button"
                    onClick={() => {
                      setSelectedParty(party);
                      setEditPartyName(party.name);
                    }}
                    className="w-full flex items-center justify-between p-2.5 bg-white hover:bg-amber-100/60 border border-amber-200/80 rounded-xl text-left transition-colors cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs">
                        {party.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-amber-900">
                          {party.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {party.phone || 'No phone'} • <span className="font-semibold text-slate-700">{party.partyTypeLabel}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-xs font-bold ${
                        party.currentBalance > 0 ? 'text-amber-700' : 'text-slate-600'
                      }`}>
                        {party.balanceLabel}
                      </div>
                      <span className="text-[10px] text-amber-600 font-semibold flex items-center justify-end gap-0.5">
                        चुनें (Select) <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-1 flex items-center justify-between text-[11px] border-t border-amber-200/60 text-amber-800">
                <span>इनमें से कोई नहीं?</span>
                <button
                  type="button"
                  onClick={() => {
                    setNewCustName(editPartyName || '');
                    setShowNewCustomerForm(true);
                  }}
                  className="font-bold underline text-amber-900 hover:text-black cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>"{editPartyName}" को नया ग्राहक बनाएं</span>
                </button>
              </div>
            </div>
          )}

          {/* Customer Not Found Indicator + Quick Add Button */}
          {partyMatches.length === 0 && !selectedParty && editPartyName && editType !== 'EXPENSE' && !showNewCustomerForm && (
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                  {editPartyName.charAt(0)}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>{editPartyName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                      New Customer (नया ग्राहक)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">कैटलॉग या संपर्क सूची में नहीं मिला</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setNewCustName(editPartyName);
                  setShowNewCustomerForm(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-sm flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>नया ग्राहक जोड़ें</span>
              </button>
            </div>
          )}

          {/* Module 3 & 4: Voice Invoice Preview Card */}
          {parsed && invoiceMode && matchedItems.length > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-white shadow-xs overflow-hidden divide-y divide-slate-100 animate-in fade-in">
              <div className="p-3.5 bg-emerald-50/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs font-bold text-emerald-950">
                    स्मार्ट चालान / बिल पूर्वावलोकन (Voice Invoice Preview)
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {matchedItems.length} Products
                </span>
              </div>

              {/* Customer Row */}
              <div className="p-3 bg-slate-50/50 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">ग्राहक (Customer)</span>
                  <span className="font-bold text-slate-900">
                    {selectedParty?.name || editPartyName || 'Walk-in Customer'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedParty?.phone ? (
                    <span className="text-slate-500 font-mono text-[11px]">{selectedParty.phone}</span>
                  ) : (
                    !selectedParty && editPartyName && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewCustName(editPartyName);
                          setShowNewCustomerForm(true);
                        }}
                        className="text-[10px] text-orange-600 hover:text-orange-700 font-bold underline"
                      >
                        + नया ग्राहक जोड़ें
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Line Items Table */}
              <div className="p-3 space-y-3 text-xs">
                <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 uppercase pb-1 border-b border-slate-100">
                  <div className="col-span-5">उत्पाद (Product)</div>
                  <div className="col-span-2 text-center">मात्रा (Qty)</div>
                  <div className="col-span-2 text-right">दर (Rate)</div>
                  <div className="col-span-3 text-right">कुल (Total)</div>
                </div>

                {matchedItems.map((item, idx) => (
                  <div key={idx} className="space-y-1.5 py-1.5 border-b border-slate-100/60 last:border-b-0">
                    <div className="grid grid-cols-12 items-center gap-1 text-xs">
                      <div className="col-span-5 truncate">
                        <div className="font-semibold text-slate-800 truncate">{item.name}</div>
                        {item.matched ? (
                          <span className="text-[10px] text-emerald-600 font-medium">✓ कैटलॉग दर</span>
                        ) : (
                          <span className="text-[10px] text-amber-600 font-medium">
                            कैटलॉग में नहीं (दर दर्ज करें)
                          </span>
                        )}
                      </div>
                      <div className="col-span-2 text-center">
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(idx, 'quantity', parseFloat(e.target.value) || 1)}
                          className="w-12 px-1 py-0.5 text-center font-bold border border-slate-200 rounded text-xs"
                        />
                      </div>
                      <div className="col-span-2 text-right">
                        <input
                          type="number"
                          min="0"
                          value={item.rate || ''}
                          onChange={(e) => handleUpdateItem(idx, 'rate', parseFloat(e.target.value) || 0)}
                          placeholder="₹ Rate"
                          className={`w-16 px-1 py-0.5 text-right font-mono font-bold border rounded text-xs ${
                            item.needsRateInput ? 'border-amber-400 bg-amber-50 text-amber-900 ring-2 ring-amber-300/40' : 'border-slate-200'
                          }`}
                        />
                      </div>
                      <div className="col-span-3 text-right font-black font-mono text-slate-900">
                        ₹{item.lineTotal.toLocaleString('en-IN')}
                      </div>
                    </div>

                    {/* Suggestions Chips if available */}
                    {item.suggestions && item.suggestions.length > 0 && !item.matched && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[10px] text-slate-400">सुझाव (Suggested):</span>
                        {item.suggestions.slice(0, 3).map((sug) => (
                          <button
                            key={sug.id}
                            type="button"
                            onClick={() => handleSelectSuggestion(idx, sug)}
                            className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200 rounded-md font-medium text-slate-700 transition-colors"
                          >
                            + {sug.name} (₹{sug.sellingPrice})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Discount, Cash Received & Balance Due */}
              <div className="p-3 bg-slate-50/70 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>उप-योग (Subtotal):</span>
                  <span className="font-bold font-mono">₹{itemsSubtotal.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span>छूट (Discount ₹):</span>
                  <input
                    type="number"
                    min="0"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="w-20 px-2 py-0.5 text-right font-mono font-bold border border-slate-200 rounded text-xs bg-white"
                  />
                </div>

                <div className="flex items-center justify-between text-slate-900 font-bold border-t border-slate-200 pt-1">
                  <span>कुल बिल (Grand Total):</span>
                  <span className="text-base text-emerald-700 font-mono">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex items-center justify-between text-emerald-800 bg-emerald-50 p-2 rounded-lg">
                  <span className="font-semibold">प्राप्त नकद (Cash/Paid):</span>
                  <input
                    type="number"
                    min="0"
                    value={cashReceivedInput}
                    onChange={(e) => setCashReceivedInput(e.target.value)}
                    className="w-24 px-2 py-1 text-right font-mono font-black border border-emerald-300 rounded text-xs bg-white text-emerald-800"
                  />
                </div>

                <div className="flex items-center justify-between text-rose-800 bg-rose-50 p-2 rounded-lg">
                  <span className="font-semibold">बाकी उधारी (Balance Due):</span>
                  <span className="font-black font-mono text-sm">₹{balanceDue.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Standard Transaction Preview Card (when not multi-item invoice) */}
          {parsed && (!invoiceMode || matchedItems.length === 0) && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden divide-y divide-slate-100">
              <div className="p-4 bg-slate-50/70 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">
                    एंट्री पूर्वावलोकन (Transaction Review)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'डन (Done)' : 'बदलें (Edit)'}</span>
                </button>
              </div>

              {!isEditing ? (
                /* Read-Only Summary Mode */
                <div className="p-4 space-y-3 text-xs">
                  {/* Type & Amount row */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">प्रकार (Type)</span>
                      <span className="font-bold text-sm text-slate-900">{parsed.typeLabelHi}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">रकम (Amount)</span>
                      <span className="font-black text-xl text-emerald-700 font-mono">
                        ₹{activeAmount ? Number(activeAmount).toLocaleString('en-IN') : '0.00'}
                      </span>
                    </div>
                  </div>

                  {/* Party Name */}
                  {editType !== 'EXPENSE' && (
                    <div className="space-y-1">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">व्यक्ति / पार्टी (Party)</span>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-800">
                          {selectedParty?.name || editPartyName || 'N/A'}
                        </span>
                        {selectedParty && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            {selectedParty.partyTypeLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Partial Payment Info for Sale with cash received */}
                  {parsed.type === 'SALE' && (parsed.cashReceived !== null || parsed.balanceDue !== null) && (
                    <div className="p-2.5 bg-slate-50 rounded-xl space-y-1 text-xs">
                      <div className="flex justify-between text-emerald-700">
                        <span>नकद मिला (Cash Received):</span>
                        <span className="font-bold font-mono">₹{(parsed.cashReceived || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-rose-700">
                        <span>बाकी उधार (Balance Due):</span>
                        <span className="font-bold font-mono">₹{(parsed.balanceDue || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  )}

                  {/* Payment Mode & Category */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">भुगतान माध्यम (Mode)</span>
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded inline-block mt-0.5">
                        {editPaymentMode}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">श्रेणी / विवरण (Category)</span>
                      <span className="font-semibold text-slate-700 truncate block mt-0.5">
                        {editCategory || editDescription || 'General Entry'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Inline Edit Mode */
                <div className="p-4 space-y-3 text-xs">
                  <div>
                    <label className="text-slate-600 font-semibold block mb-1">Transaction Type</label>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as VoiceTransactionType)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800"
                    >
                      <option value="PAYMENT_RECEIVED">भुगतान प्राप्त (Payment Received)</option>
                      <option value="PAYMENT_GIVEN">भुगतान दिया (Payment Given)</option>
                      <option value="EXPENSE">खर्च (Expense)</option>
                      <option value="TO_RECEIVE">लेना है (Money to Receive)</option>
                      <option value="TO_PAY">देना है (Money to Pay)</option>
                      <option value="SALE">बिक्री (Sale)</option>
                      <option value="PURCHASE">खरीद (Purchase)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-600 font-semibold block mb-1">रकम (Amount ₹) *</label>
                      <input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        placeholder="5000"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white font-bold text-emerald-800"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 font-semibold block mb-1">Payment Mode</label>
                      <select
                        value={editPaymentMode}
                        onChange={(e) => setEditPaymentMode(e.target.value as VoicePaymentMode)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800"
                      >
                        <option value="CASH">CASH (नकद)</option>
                        <option value="UPI">UPI (Google Pay/PhonePe)</option>
                        <option value="BANK">BANK / Transfer (बैंक)</option>
                      </select>
                    </div>
                  </div>

                  {editType !== 'EXPENSE' && (
                    <div>
                      <label className="text-slate-600 font-semibold block mb-1">Party / Contact Name *</label>
                      <input
                        type="text"
                        value={editPartyName}
                        onChange={(e) => {
                          setEditPartyName(e.target.value);
                          searchParty(e.target.value, editType);
                        }}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-slate-600 font-semibold block mb-1">विवरण / श्रेणी (Description)</label>
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="e.g. Petrol expense, Payment against bill"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Save Error Banner */}
          {saveError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}
        </div>

        {/* Modal Action Buttons: Confirm & Save, Edit, Cancel */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            रद्द करें (Cancel)
          </button>

          <div className="flex items-center gap-2">
            {invoiceMode && matchedItems.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={handleOpenFullInvoice}
                  disabled={isSaving}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>बिल एडिटर में खोलें</span>
                </button>

                <button
                  type="button"
                  disabled={isSaving || grandTotal <= 0 || Boolean(missingRateItem)}
                  onClick={handleCreateVoiceInvoice}
                  title={missingRateItem ? `Please enter rate for ${missingRateItem.name}` : undefined}
                  className="px-4 py-2 rounded-xl bg-[#008A36] hover:bg-[#006B2B] text-white font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>बिल बन रहा है...</span>
                    </>
                  ) : (
                    <>
                      <Receipt className="w-3.5 h-3.5" />
                      <span>चालान / बिल बनाएं (Create Invoice)</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={isSaving || !parsed || !activeAmount}
                onClick={handleConfirmAndSave}
                className="px-4 py-2 rounded-xl bg-[#173653] hover:bg-[#071D35] text-white font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>सुरक्षित हो रहा है...</span>
                  </>
                ) : (
                  <>
                    <span>पुष्टि करें व सेव करें (Confirm & Save)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
