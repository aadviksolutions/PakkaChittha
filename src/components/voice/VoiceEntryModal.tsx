'use client';

import React, { useState, useEffect } from 'react';
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
  Building2, 
  Users, 
  Wallet, 
  Calendar, 
  ShieldAlert,
  Loader2,
  Tag,
  Check
} from 'lucide-react';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { 
  parseVoiceTransaction, 
  ParsedVoiceTransaction, 
  VoiceTransactionType, 
  VoicePaymentMode 
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
  isExactMatch: boolean;
  score: number;
}

export function VoiceEntryModal({ isOpen, onClose, onSuccess }: VoiceEntryModalProps) {
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

  // Auto-parse transcript when updated
  useEffect(() => {
    if (transcript && transcript.trim().length > 3) {
      const res = parseVoiceTransaction(transcript);
      setParsed(res);
      setEditType(res.type);
      setEditAmount(res.amount ? res.amount.toString() : '');
      setEditPartyName(res.partyName || '');
      setEditPaymentMode(res.paymentMode);
      setEditCategory(res.category || '');
      setEditDescription(res.description || '');

      // Trigger party search
      if (res.partyName) {
        searchParty(res.partyName, res.type);
      } else {
        setPartyMatches([]);
        setSelectedParty(null);
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
        // If exact match found, select automatically
        const exact = data.matches.find((m: PartyMatch) => m.isExactMatch);
        if (exact) {
          setSelectedParty(exact);
        } else if (data.matches.length > 0 && data.matches[0].score >= 80) {
          setSelectedParty(data.matches[0]);
        } else {
          setSelectedParty(null);
        }
      }
    } catch (e) {
      console.warn('Party search error', e);
    } finally {
      setIsSearchingParty(false);
    }
  };

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleConfirmAndSave = async () => {
    const amountVal = parseFloat(editAmount);
    if (!amountVal || isNaN(amountVal) || amountVal <= 0) {
      setSaveError('Please enter a valid amount.');
      return;
    }

    if (editType !== 'EXPENSE' && !editPartyName.trim()) {
      setSaveError('Please enter or select a customer/party name.');
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);

      const payload = {
        type: editType,
        amount: amountVal,
        partyName: editPartyName.trim() || undefined,
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

  const handleClose = () => {
    stopListening();
    resetTranscript();
    setParsed(null);
    setIsEditing(false);
    setSaveError(null);
    setPartyMatches([]);
    setSelectedParty(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-orange-50/50 via-white to-emerald-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Smart Voice Entry (बोलकर एंट्री करें)
              </h3>
              <p className="text-[11px] text-slate-500">
                Hindi • English • Hinglish • Instant Accounting
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <button
              type="button"
              onClick={() => {
                const next = selectedLang === 'hi-IN' ? 'en-IN' : 'hi-IN';
                setSelectedLang(next);
                if (isListening) {
                  stopListening();
                  setTimeout(() => startListening(next), 200);
                }
              }}
              className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 shadow-2xs"
            >
              {selectedLang === 'hi-IN' ? 'हिन्दी (Hinglish)' : 'English (India)'}
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Close voice modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
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
              {/* Pulsing rings when listening */}
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
                  : 'जैसे: "Ramesh se 5000 rupaye mile"'}
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
                  className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
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
                  'Ramesh se 5000 rupaye mile.',
                  'Mohan ko 2000 cash diye.',
                  'आज 1500 रुपये का पेट्रोल खर्च हुआ।',
                  'Suresh se das hazaar lene hain.',
                  'Sharma Traders se 25000 ka maal kharida.',
                  'Vikash se 15000 lene hain.',
                ].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTranscript(s)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-orange-50 hover:text-orange-800 text-slate-600 border border-slate-200/60 transition-colors text-left"
                  >
                    💬 {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Parsed Transaction Card Preview (Never saves automatically) */}
          {parsed && (
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
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
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
                        ₹{editAmount ? Number(editAmount).toLocaleString('en-IN') : '0.00'}
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

                  {/* Matching Party Candidates Picker if multiple exist */}
                  {partyMatches.length > 1 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        मिलती-जुलती पार्टियां (Select Matching Party):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {partyMatches.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setSelectedParty(m);
                              setEditPartyName(m.name);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                              selectedParty?.id === m.id
                                ? 'bg-orange-600 text-white border-orange-600'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {m.name} ({m.partyTypeLabel})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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
                      <option value="PURCHASE">खरीद (Purchase)</option>
                      <option value="SALE">बिक्री (Sale)</option>
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
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            रद्द करें (Cancel)
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSaving || !parsed || !editAmount}
              onClick={handleConfirmAndSave}
              className="px-5 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#D94E00] text-white font-bold text-xs shadow-md shadow-orange-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
          </div>
        </div>
      </div>
    </div>
  );
}

