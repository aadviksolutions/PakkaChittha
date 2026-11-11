'use client';

import React, { useState } from 'react';
import {
  X,
  MessageCircle,
  Mail,
  Copy,
  Check,
  Share2,
  FileText,
  FileSpreadsheet,
  Printer,
  Loader2,
} from 'lucide-react';

interface ReportShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subject: string;
  shareText: string;
  recipientPhone?: string | null;
  recipientEmail?: string | null;
  pdfExportUrl: string;
  excelExportUrl: string;
  pdfFileName: string;
  excelFileName: string;
  onPrint?: () => void;
}

export default function ReportShareModal({
  isOpen,
  onClose,
  title,
  subject,
  shareText,
  recipientPhone,
  recipientEmail,
  pdfExportUrl,
  excelExportUrl,
  pdfFileName,
  excelFileName,
  onPrint,
}: ReportShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [sharingType, setSharingType] = useState<'pdf' | 'xlsx' | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const cleanWaDigits = (() => {
    if (!recipientPhone) return '';
    const digits = recipientPhone.replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    return digits;
  })();

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setShareFeedback('Report summary copied to clipboard.');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setShareFeedback('Could not copy automatically. Please copy from summary preview.');
    }
  };

  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(shareText);
    const url = cleanWaDigits
      ? `https://wa.me/${cleanWaDigits}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleEmailShare = () => {
    const mailtoTo = recipientEmail ? encodeURIComponent(recipientEmail) : '';
    const url = `mailto:${mailtoTo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      shareText.replace(/\*/g, '')
    )}`;
    window.location.href = url;
  };

  const handleShareBinaryFile = async (format: 'pdf' | 'xlsx') => {
    try {
      setSharingType(format);
      setShareFeedback(null);
      const exportUrl = format === 'pdf' ? pdfExportUrl : excelExportUrl;
      const filename = format === 'pdf' ? pdfFileName : excelFileName;
      const mimeType =
        format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      const res = await fetch(exportUrl, { credentials: 'include' });
      if (!res.ok) {
        throw new Error('Failed to prepare file for sharing.');
      }
      const blob = await res.blob();
      const file = new File([blob], filename, { type: mimeType });

      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
      };

      if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
        await nav.share({
          title: subject,
          text: shareText,
          files: [file],
        });
        setShareFeedback(`${format.toUpperCase()} shared successfully.`);
      } else {
        // Fallback: download file directly so user can attach anywhere
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);
        setShareFeedback(
          `Direct file share is not supported by this desktop browser — ${filename} downloaded so you can attach it on WhatsApp or Email.`
        );
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setShareFeedback(err instanceof Error ? err.message : 'Unable to share report file.');
    } finally {
      setSharingType(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-report-title"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
        <div className="bg-[#071F38] px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <Share2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 id="share-report-title" className="font-bold text-base">
                {title}
              </h3>
              <p className="text-xs text-slate-300">Share summary, PDF statement or Excel workbook</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
            aria-label="Close share dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp Summary
            </button>

            <button
              type="button"
              onClick={handleEmailShare}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              Share via Email
            </button>

            <button
              type="button"
              disabled={sharingType !== null}
              onClick={() => handleShareBinaryFile('pdf')}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-colors disabled:opacity-60 cursor-pointer"
            >
              {sharingType === 'pdf' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 text-rose-400" />
              )}
              Share / Send PDF
            </button>

            <button
              type="button"
              disabled={sharingType !== null}
              onClick={() => handleShareBinaryFile('xlsx')}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-sm transition-colors disabled:opacity-60 cursor-pointer"
            >
              {sharingType === 'xlsx' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              )}
              Share / Send Excel
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCopySummary}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied Summary!' : 'Copy Formatted Text'}
            </button>

            {onPrint && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setTimeout(() => onPrint(), 150);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print Statement
              </button>
            )}
          </div>

          {shareFeedback && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 px-3.5 py-2.5 text-xs text-blue-900 font-medium">
              {shareFeedback}
            </div>
          )}

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Preview Text
            </p>
            <pre className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 whitespace-pre-wrap max-h-44 overflow-y-auto font-sans">
              {shareText}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

