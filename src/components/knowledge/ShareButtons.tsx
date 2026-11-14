'use client';

import React, { useState } from 'react';
import { Share2, Check, Copy, MessageCircle } from 'lucide-react';

export function ShareButtons({
  title,
  url,
}: {
  title: string;
  url?: string;
}) {
  const [copied, setCopied] = useState(false);

  const currentUrl = typeof window !== 'undefined' ? (url ? window.location.origin + url : window.location.href) : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const shareText = encodeURIComponent(`${title} | PakkaChittha Knowledge Hub\n${currentUrl}`);
  const whatsappUrl = `https://api.whatsapp.com/send?text=${shareText}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(currentUrl)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">
        Share:
      </span>

      {/* WhatsApp */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on WhatsApp"
        className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
        title="Share on WhatsApp"
      >
        <MessageCircle className="w-4 h-4 fill-emerald-600 text-transparent" />
      </a>

      {/* Twitter / X */}
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X"
        className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors font-bold text-xs"
        title="Share on X (Twitter)"
      >
        𝕏
      </a>

      {/* LinkedIn */}
      <a
        href={linkedinUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on LinkedIn"
        className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-bold text-xs"
        title="Share on LinkedIn"
      >
        in
      </a>

      {/* Copy Link */}
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy Link"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        title="Copy Link"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-emerald-700">Copied!</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            <span>Copy Link</span>
          </>
        )}
      </button>
    </div>
  );
}

