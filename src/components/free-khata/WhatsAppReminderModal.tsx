'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  Phone,
  Send,
  AlertCircle,
  ExternalLink,
  Info,
} from 'lucide-react';
import { formatCurrency, formatDate, cleanPhone } from '@/lib/services/khataService';

export interface WhatsAppReminderTarget {
  transactionId?: string;
  contactId?: string;
  contactName: string;
  phone?: string | null;
  amount: number;
  date: string | Date;
  dueDate?: string | Date | null;
  type?: 'GAVE' | 'RECEIVED';
}

interface WhatsAppReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: WhatsAppReminderTarget | null;
  onPhoneUpdated?: (newPhone: string) => void;
}

export function WhatsAppReminderModal({
  isOpen,
  onClose,
  target,
  onPhoneUpdated,
}: WhatsAppReminderModalProps) {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && target) {
      setPhone(target.phone || '');
      setError(null);

      const formattedAmount = formatCurrency(target.amount);
      const formattedDate = formatDate(target.date);
      const formattedDueDate = target.dueDate ? formatDate(target.dueDate) : null;
      const isGave = target.type !== 'RECEIVED';

      let defaultMsg = '';
      if (isGave) {
        defaultMsg = `Namaste ${target.contactName} ji,\n\nThis is a friendly reminder regarding the pending amount of ${formattedAmount} given on ${formattedDate}${
          formattedDueDate ? ` (Due Date: ${formattedDueDate})` : ''
        }.\n\nPlease arrange for the payment at your convenience. Thank you! 🙏\n- Sent via Pakka Chittha`;
      } else {
        defaultMsg = `Namaste ${target.contactName} ji,\n\nThis message is regarding the balance of ${formattedAmount} borrowed on ${formattedDate}${
          formattedDueDate ? ` (Due Date: ${formattedDueDate})` : ''
        }. I am arranging to return this soon. Thank you! 🙏\n- Sent via Pakka Chittha`;
      }

      setMessage(defaultMsg);
    }
  }, [isOpen, target]);

  if (!isOpen || !target) return null;

  const handleOpenWhatsApp = async () => {
    setError(null);
    const cleaned = cleanPhone(phone);

    if (!cleaned || cleaned.length < 10) {
      setError('Please provide a valid 10-digit mobile number for WhatsApp.');
      return;
    }

    // If phone was changed/added and contactId exists, update the contact in background
    if (target.contactId && phone.trim() !== (target.phone || '')) {
      try {
        await fetch(`/api/free-khata/contacts/${target.contactId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phone.trim() }),
        });
        if (onPhoneUpdated) onPhoneUpdated(phone.trim());
      } catch {
        // Non-blocking
      }
    }

    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/${cleaned}?text=${encoded}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 my-auto">
        {/* Header */}
        <div className="p-5 bg-emerald-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm">Remind on WhatsApp</h3>
              <p className="text-[11px] text-emerald-100">
                Send a polite reminder message directly via WhatsApp
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Recipient Details & Phone */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Recipient:</span>
              <strong className="text-slate-800 text-sm">{target.contactName}</strong>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Pending Amount:</span>
              <span className="font-black text-[#00B887] text-sm">
                {formatCurrency(target.amount)}
              </span>
            </div>

            {target.dueDate && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Due Date:</span>
                <span className="font-semibold text-slate-700">
                  {formatDate(target.dueDate)}
                </span>
              </div>
            )}
          </div>

          {/* Recipient Phone input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              WhatsApp Mobile Number *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter 10-digit mobile number"
                className="block w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#00B887]/30 focus:border-[#00B887]"
              />
            </div>
            {!target.phone && (
              <p className="text-[10.5px] text-amber-600 mt-1">
                No phone on record. Enter recipient's number to launch WhatsApp.
              </p>
            )}
          </div>

          {/* Message Preview & Editor */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Message Preview (You can edit this)
              </label>
              <span className="text-[10px] text-slate-400">Free Manual Share</span>
            </div>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#00B887]/30 focus:border-[#00B887] font-sans leading-relaxed"
            />
          </div>

          {/* Compliance & Privacy Note */}
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-start gap-2 text-[11px] text-emerald-900 leading-snug">
            <Info className="w-4 h-4 text-[#00B887] shrink-0 mt-0.5" />
            <span>
              This will open WhatsApp on your phone or web with this message pre-filled. You can review and click send manually. No automated messages are dispatched.
            </span>
          </div>

          {/* Actions */}
          <div className="pt-1 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Open in WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5 ml-0.5 opacity-80" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
