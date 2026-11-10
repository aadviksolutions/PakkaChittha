'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageCircle,
  X,
  Send,
  QrCode,
  Copy,
  Check,
  Calendar,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface WhatsAppReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName: string;
  recipientPhone?: string | null;
  pendingAmount: number;
  senderName: string;
  invoiceNumber?: string | null;
  dueDate?: string | null;
  contactId?: string | null;
  customerId?: string | null;
  upiId?: string | null;
  upiQrImageUrl?: string | null;
  onReminderSent?: () => void;
}

export function WhatsAppReminderModal({
  isOpen,
  onClose,
  recipientName,
  recipientPhone,
  pendingAmount,
  senderName,
  invoiceNumber,
  dueDate,
  contactId,
  customerId,
  upiId,
  upiQrImageUrl,
  onReminderSent,
}: WhatsAppReminderModalProps) {
  const toast = useToast();
  const [phone, setPhone] = useState(recipientPhone || '');
  const [includeUpiDetails, setIncludeUpiDetails] = useState(true);
  const [includeQrLink, setIncludeQrLink] = useState(Boolean(upiQrImageUrl));
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  // Generate standard customizable message
  const getDefaultMessage = () => {
    let msg = `Hello ${recipientName || 'Ji'},\n\n`;

    if (invoiceNumber) {
      msg += `Aapke saath hamare Invoice #${invoiceNumber} ke hisaab ke anusaar ₹${pendingAmount.toLocaleString('en-IN')} ki rakam abhi baaki hai.\n\n`;
    } else {
      msg += `Aapke saath hamare hisaab ke anusaar ₹${pendingAmount.toLocaleString('en-IN')} ki rakam abhi baaki hai.\n\n`;
    }

    if (dueDate) {
      msg += `Due Date: ${dueDate}\n\n`;
    }

    msg += `Kripya suvidha anusar payment kar dein.\n\n`;

    if (includeUpiDetails && upiId) {
      msg += `Payment ke liye UPI ID: ${upiId}\n`;
      if (includeQrLink && upiQrImageUrl) {
        msg += `Payment ke liye UPI QR code bhi saath mein diya gaya hai.\n`;
      }
      msg += `\n`;
    }

    msg += `Thank you!\n${senderName || 'Pakka Chittha'}`;
    return msg;
  };

  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPhone(recipientPhone || '');
      setMessage(getDefaultMessage());
    }
  }, [isOpen, recipientName, recipientPhone, pendingAmount, senderName, invoiceNumber, dueDate, upiId, upiQrImageUrl]);

  if (!isOpen) return null;

  const handleShareWhatsApp = async () => {
    const cleanDigits = phone.replace(/\D/g, '');
    if (!cleanDigits) {
      toast.error('Please enter a valid WhatsApp mobile number');
      return;
    }

    // Format Indian mobile number if missing country code
    const formattedPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;

    try {
      setSending(true);

      // Track reminder timestamp on server
      if (contactId) {
        await fetch('/api/free-khata/reminder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contactId }),
        }).catch(() => {});
      } else if (customerId) {
        await fetch(`/api/customers/${customerId}/reminder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }).catch(() => {});
      }

      onReminderSent?.();

      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

      // Open WhatsApp web or native app
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      toast.success('WhatsApp payment reminder prepared!');
      onClose();
    } catch {
      toast.error('Could not prepare WhatsApp message');
    } finally {
      setSending(false);
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success('Reminder message copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900">Send Payment Reminder (WhatsApp)</h3>
              <p className="text-[11px] text-slate-500">
                Customizable reminder for {recipientName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount Pill */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px] block">Pending Amount</span>
            <span className="text-lg font-black text-rose-600 font-mono">
              ₹{pendingAmount.toLocaleString('en-IN')}
            </span>
          </div>
          {dueDate && (
            <div className="text-right">
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Due Date</span>
              <span className="font-semibold text-slate-700">{dueDate}</span>
            </div>
          )}
        </div>

        {/* WhatsApp Mobile Number */}
        <div className="space-y-1 text-xs">
          <label className="font-bold text-slate-700 block">WhatsApp Mobile Number *</label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-slate-400 font-bold">+91 /</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full pl-14 pr-3 py-2 rounded-xl border border-slate-200 font-mono font-semibold text-slate-900 focus:outline-hidden focus:border-emerald-500"
            />
          </div>
        </div>

        {/* UPI Details Options */}
        {(upiId || upiQrImageUrl) && (
          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs space-y-2">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
              Saved Payment Options
            </span>
            <div className="flex flex-col gap-1.5">
              {upiId && (
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={includeUpiDetails}
                    onChange={(e) => {
                      setIncludeUpiDetails(e.target.checked);
                    }}
                    className="w-3.5 h-3.5 text-emerald-600 rounded"
                  />
                  <span>Include UPI ID: <strong className="font-mono">{upiId}</strong></span>
                </label>
              )}
              {upiQrImageUrl && (
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={includeQrLink}
                    onChange={(e) => {
                      setIncludeQrLink(e.target.checked);
                    }}
                    className="w-3.5 h-3.5 text-emerald-600 rounded"
                  />
                  <span>Mention UPI QR code is provided</span>
                </label>
              )}
            </div>

            {upiQrImageUrl && (
              <div className="pt-2 border-t border-emerald-200/50 flex items-center gap-3">
                <img
                  src={upiQrImageUrl}
                  alt="Saved UPI QR"
                  className="w-16 h-16 rounded-lg border border-slate-200 bg-white object-contain p-1 shadow-2xs"
                />
                <div className="text-[11px] text-slate-600">
                  <span className="font-bold block text-slate-900">Your Saved UPI QR Code</span>
                  <span>Recipient can scan this directly to transfer funds.</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Editable Message Textarea */}
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-700">Customizable Reminder Message</label>
            <button
              type="button"
              onClick={handleCopyMessage}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={7}
            className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans focus:outline-hidden focus:border-emerald-500"
          />
        </div>

        {/* Compliance Guarantee */}
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 text-[10px] text-slate-500 leading-tight">
          <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <span>
            Sending a reminder records the follow-up timestamp for your records. The transaction or invoice will strictly remain pending until you explicitly record payment.
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleShareWhatsApp}
            disabled={sending}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sending ? 'Opening...' : 'Send via WhatsApp'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
