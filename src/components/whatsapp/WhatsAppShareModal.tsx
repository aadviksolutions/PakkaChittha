'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  ExternalLink,
  Copy,
  Check,
  Send,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Edit3,
  RotateCcw,
  Smartphone,
  Globe,
  Info,
} from 'lucide-react';
import { sanitizePhoneNumber } from '@/lib/whatsapp/formatters';

export interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: 'INVOICE' | 'RECEIPT' | 'STATEMENT';
  shareType?: 'INVOICE' | 'RECEIPT' | 'STATEMENT' | string;
  invoiceId?: string;
  paymentId?: string;
  customerId?: string;
  defaultPhone?: string;
  defaultName?: string;
  customerName?: string;
  customerPhone?: string;
  invoiceNumber?: string;
  invoiceTotal?: number;
  balanceDue?: number;
  dueDate?: string;
  amount?: number;
  documentTitle?: string;
}

export function WhatsAppShareModal({
  isOpen,
  onClose,
  type,
  shareType,
  invoiceId,
  paymentId,
  customerId,
  defaultPhone = '',
  defaultName = '',
  customerName,
  customerPhone,
  invoiceNumber,
  documentTitle,
}: WhatsAppShareModalProps) {
  const resolvedType = (type || (shareType as 'INVOICE' | 'RECEIPT' | 'STATEMENT') || 'INVOICE') as
    | 'INVOICE'
    | 'RECEIPT'
    | 'STATEMENT';
  const resolvedPhone = defaultPhone || customerPhone || '';
  const resolvedName = defaultName || customerName || '';

  const [recipientPhone, setRecipientPhone] = useState(resolvedPhone);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [messagePreview, setMessagePreview] = useState('');
  const [originalMessage, setOriginalMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [documentUrl, setDocumentUrl] = useState('');
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [handoffDone, setHandoffDone] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const initialPhone = resolvedPhone || '';
      setRecipientPhone(initialPhone);
      setPhoneError(null);
      setFetchError(null);
      setHandoffDone(false);
      setIsEditing(false);
      fetchSharePayload(initialPhone);
    }
  }, [isOpen, resolvedPhone, invoiceId, paymentId, customerId, resolvedType]);

  async function fetchSharePayload(phone: string) {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/whatsapp/share-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: resolvedType,
          invoiceId,
          paymentId,
          customerId,
          customPhone: phone,
          logShare: false, // Don't log until user actually initiates WhatsApp handoff
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessagePreview(data.message);
        setOriginalMessage(data.message);
        setDocumentUrl(data.documentUrl || '');
        if (data.sanitizedPhone && !data.sanitizedPhone.isValid && phone) {
          setPhoneError(data.sanitizedPhone.error || 'Please enter a valid phone number.');
        } else {
          setPhoneError(null);
        }
      } else {
        setFetchError(data.error || 'Failed to prepare share preview');
      }
    } catch {
      setFetchError('Network error preparing message preview');
    } finally {
      setLoading(false);
    }
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setRecipientPhone(val);
    const sanitized = sanitizePhoneNumber(val);
    if (!val.trim()) {
      setPhoneError('Customer phone number is required to send via WhatsApp.');
    } else if (!sanitized.isValid) {
      setPhoneError(sanitized.error || 'Invalid phone format (enter 10-digit Indian number or with +91).');
    } else {
      setPhoneError(null);
    }
  }

  function handlePhoneBlur() {
    if (recipientPhone.trim()) {
      fetchSharePayload(recipientPhone);
    }
  }

  function handleResetMessage() {
    setMessagePreview(originalMessage);
    setIsEditing(false);
  }

  function handleOpenWhatsApp(preferredMode: 'auto' | 'app' | 'web' = 'auto') {
    const sanitized = sanitizePhoneNumber(recipientPhone);
    if (!sanitized.isValid) {
      setPhoneError('Please enter a valid mobile number with country code before sending.');
      return;
    }

    const cleanDigits = sanitized.cleanDigits;
    const encoded = encodeURIComponent(messagePreview);

    // Detect mobile environment
    const isMobile =
      typeof navigator !== 'undefined' &&
      (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        (typeof window !== 'undefined' && window.innerWidth < 768));

    let targetUrl: string;
    const useApp = preferredMode === 'app' || (preferredMode === 'auto' && isMobile);

    if (preferredMode === 'web') {
      targetUrl = `https://web.whatsapp.com/send?phone=${cleanDigits}&text=${encoded}`;
    } else if (useApp) {
      targetUrl = `whatsapp://send?phone=${cleanDigits}&text=${encoded}`;
    } else {
      // Desktop browser auto default: WhatsApp Web
      targetUrl = `https://web.whatsapp.com/send?phone=${cleanDigits}&text=${encoded}`;
    }

    // Log manual handoff in audit log
    try {
      fetch('/api/whatsapp/share-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: resolvedType,
          invoiceId,
          paymentId,
          customerId,
          customPhone: recipientPhone,
          logShare: true,
        }),
      }).catch(() => {});
    } catch {
      // ignore
    }

    // Handoff to device WhatsApp
    if (useApp) {
      const startTime = Date.now();
      window.location.href = targetUrl;
      // Fallback timer if app is not installed
      setTimeout(() => {
        if (Date.now() - startTime < 2200 && typeof document !== 'undefined' && !document.hidden) {
          window.open(`https://wa.me/${cleanDigits}?text=${encoded}`, '_blank', 'noopener,noreferrer');
        }
      }, 1500);
    } else {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }

    setHandoffDone(true);
  }

  function handleCopyMessage() {
    navigator.clipboard.writeText(messagePreview);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  }

  function handleCopyLink() {
    if (documentUrl) {
      navigator.clipboard.writeText(documentUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  }

  if (!isOpen) return null;

  const phoneCheck = sanitizePhoneNumber(recipientPhone);
  const isPhoneValid = phoneCheck.isValid;
  const hasPhone = Boolean(recipientPhone.trim());
  const isMessageEdited = messagePreview !== originalMessage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-emerald-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Send to WhatsApp
              </h3>
              <p className="text-[11px] text-emerald-800 font-medium">
                {documentTitle || (invoiceNumber ? `Invoice ${invoiceNumber} • ${resolvedName || 'Customer'}` : `Bill for ${resolvedName || 'Customer'}`)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Missing / Phone Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Customer Mobile Number <span className="text-rose-600">*</span>
              </label>
              {isPhoneValid && (
                <span className="text-[11px] font-mono text-emerald-700 font-semibold">
                  Formatted: {phoneCheck.formattedDisplay}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="tel"
                value={recipientPhone}
                onChange={handlePhoneChange}
                onBlur={handlePhoneBlur}
                placeholder="e.g. 9876543210 or +91 98765 43210"
                className={`flex-1 text-xs px-3 py-2 border rounded-lg font-mono focus:outline-hidden transition-all ${
                  !hasPhone || phoneError
                    ? 'border-amber-400 bg-amber-50/30 focus:ring-2 focus:ring-amber-500'
                    : 'border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500'
                }`}
              />
              <button
                type="button"
                onClick={() => fetchSharePayload(recipientPhone)}
                disabled={loading || !hasPhone}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
              >
                Refresh
              </button>
            </div>

            {!hasPhone ? (
              <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>This customer has no saved phone number. Please enter their mobile number above to proceed.</span>
              </div>
            ) : phoneError ? (
              <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{phoneError}</span>
              </p>
            ) : (
              <p className="text-[10px] text-slate-500 mt-1">
                Indian 10-digit numbers automatically formatted with country code +91.
              </p>
            )}
          </div>

          {/* Message Preview & Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <span>Message Preview</span>
                  {isMessageEdited && (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                      Edited
                    </span>
                  )}
                </label>
              </div>

              <div className="flex items-center gap-2">
                {isMessageEdited && (
                  <button
                    type="button"
                    onClick={handleResetMessage}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 transition-colors"
                    title="Reset to default message"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 font-medium transition-colors"
                >
                  {copiedMessage ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  {copiedMessage ? 'Copied' : 'Copy Text'}
                </button>
                {documentUrl && (
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 font-medium transition-colors"
                  >
                    {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copiedLink ? 'Copied' : 'Copy PDF Link'}
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              {loading ? (
                <div className="h-44 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                </div>
              ) : (
                <div className="relative group">
                  <textarea
                    rows={7}
                    value={messagePreview}
                    onChange={(e) => {
                      setMessagePreview(e.target.value);
                      setIsEditing(true);
                    }}
                    placeholder="Message to be sent via WhatsApp..."
                    className="w-full text-xs p-3 bg-slate-50/70 border border-slate-200 rounded-xl font-mono text-slate-800 leading-relaxed resize-y focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                  <div className="absolute right-2.5 bottom-2.5 pointer-events-none text-[10px] text-slate-400 font-sans">
                    You can edit before sending
                  </div>
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
              <Edit3 className="w-3 h-3 text-slate-400" />
              <span>Review and customize the text above. Your changes will be sent directly to WhatsApp.</span>
            </p>
          </div>

          {/* Secure Document Link Notice */}
          {documentUrl && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2 text-xs text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-tight space-y-1">
                <p>
                  <strong>Secure PDF link included:</strong> The URL in the message allows your customer to view, verify, and download their bill without needing an account.
                </p>
                <p className="text-slate-500 text-[10px]">
                  Note: WhatsApp text links do not automatically attach files. To send the raw PDF file, download it from Pakka Chittha and attach it in the chat.
                </p>
              </div>
            </div>
          )}

          {/* Post-Handoff Guidance */}
          {handoffDone && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold">WhatsApp opened on your device!</p>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Review the pre-filled message inside WhatsApp and press <strong>Send</strong>. (Pakka Chittha does not mark this bill as delivered until sent manually by you).
                </p>
              </div>
            </div>
          )}

          {fetchError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{fetchError}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer text-center"
          >
            Cancel
          </button>

          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
            {/* Desktop WhatsApp Web Alternative */}
            <button
              type="button"
              onClick={() => handleOpenWhatsApp('web')}
              disabled={loading || !isPhoneValid}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
              title="Open directly in WhatsApp Web browser tab"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span>WhatsApp Web</span>
            </button>

            {/* Primary Action: Open WhatsApp & Send */}
            <button
              type="button"
              onClick={() => handleOpenWhatsApp('auto')}
              disabled={loading || !isPhoneValid}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5 text-white" />
              <span>Open WhatsApp & Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
