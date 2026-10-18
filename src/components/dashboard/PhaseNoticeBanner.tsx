'use client';

import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';

export function PhaseNoticeBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="mb-6 bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-800 relative overflow-hidden">
      {/* Subtle backdrop pattern */}
      <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-white tracking-tight">
                Pakka Chittha: Foundation & Business Dashboard
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Verified Preview
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              All views, navigation modules, and metrics are rendered with clearly labelled sample Indian business data. Database persistence, multi-tenant authentication, real-time GST e-invoicing and WhatsApp APIs will activate in subsequent phases.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <span className="text-xs text-slate-400 hidden lg:inline">
            Phase 1 of 5
          </span>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
            title="Dismiss notification"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
