'use client';

import React, { useState, useEffect } from 'react';
import { X, UserPlus, Phone, FileText, AlertCircle, Check } from 'lucide-react';
import { useTranslation } from '@/i18n/context';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newContact?: any) => void;
}

export function AddContactModal({ isOpen, onClose, onSuccess }: AddContactModalProps) {
  const { locale } = useTranslation();
  const isHi = locale === 'hi';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasContactsApi, setHasContactsApi] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window) {
      setHasContactsApi(true);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setPhone('');
      setNotes('');
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

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

          if (rawName && !name) {
            setName(rawName);
          }
          if (rawPhone) {
            setPhone(rawPhone);
          }
        }
      } catch (err) {
        console.warn('Contact picker dismissed or not permitted:', err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setError(isHi ? 'कृपया व्यक्ति का नाम दर्ज करें (कम से कम 2 अक्षर)।' : 'Please enter a valid person name (at least 2 letters).');
      return;
    }

    const cleanPhoneDigits = phone.replace(/\D/g, '');
    if (phone.trim() && cleanPhoneDigits.length > 0 && cleanPhoneDigits.length < 10) {
      setError(isHi ? 'कृपया वैध 10-अंकों का मोबाइल नंबर दर्ज करें।' : 'Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/free-khata/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          phone: phone.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save contact.');
      }

      onSuccess(json.contact);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error saving contact');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 my-auto">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#071F38] to-[#0A2E5C] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-[#00B887]">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">
                {isHi ? 'नया संपर्क जोड़ें' : 'Add New Contact / Person'}
              </h2>
              <p className="text-[11px] text-slate-300">
                {isHi ? 'पर्सनल खाता में व्यक्ति का नाम और नंबर सहेजें' : 'Save contact to your Personal Khata ledger'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isHi ? 'व्यक्ति का नाम' : 'Person Name'} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isHi ? 'उदा. रमेश शर्मा या राजेश जी' : 'e.g. Ramesh Sharma'}
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B887] focus:bg-white font-medium"
            />
          </div>

          {/* Mobile Phone Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                {isHi ? 'मोबाइल नंबर (वैकल्पिक)' : 'Mobile Number (Optional)'}
              </label>
              {hasContactsApi && (
                <button
                  type="button"
                  onClick={handlePickPhoneContact}
                  className="text-[11px] font-bold text-[#00B887] hover:text-[#009E74] inline-flex items-center gap-1 cursor-pointer hover:underline"
                >
                  <Phone className="w-3 h-3" />
                  <span>{isHi ? 'फोन से चुनें' : 'Pick from Phone'}</span>
                </button>
              )}
            </div>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={isHi ? '10 अंकों का मोबाइल नंबर' : '10-digit mobile number'}
                className="w-full text-xs pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B887] focus:bg-white font-medium"
              />
            </div>
          </div>

          {/* Notes / Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isHi ? 'टिप्पणी / पहचान (वैकल्पिक)' : 'Notes / Remarks (Optional)'}
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isHi ? 'उदा. दोस्त, पड़ोसी, ग्राहक, रिश्तेदार' : 'e.g. Friend, Client, Neighbor'}
                className="w-full text-xs pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B887] focus:bg-white font-medium"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              {isHi ? 'रद्द करें' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-5 py-2.5 bg-[#00B887] hover:bg-[#009E74] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? (isHi ? 'सहेज रहे हैं...' : 'Saving...') : (isHi ? 'संपर्क सहेजें' : 'Save Contact')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

