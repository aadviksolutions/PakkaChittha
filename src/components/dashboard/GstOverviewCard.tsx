'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function GstOverviewCard() {
  const { activeBusiness } = useAuth();
  const [gstSummary, setGstSummary] = useState<{
    taxableSalesValue?: number;
    totalCgst?: number;
    totalSgst?: number;
    totalIgst?: number;
  } | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/reports/summary')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.summary) return;
        setGstSummary({
          taxableSalesValue: data.summary.taxableSalesValue,
          totalCgst: data.summary.totalCgst,
          totalSgst: data.summary.totalSgst,
          totalIgst: data.summary.totalIgst,
        });
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const gstin = activeBusiness?.gstin || 'Not Registered';
  const state = activeBusiness?.state || 'India';

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 sm:p-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#071F38]">
              GST Tax Summary
            </h3>
            <span className="text-[10px] font-semibold text-[#00B887] bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
              Current Period
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Jurisdiction: {state} • GSTIN:{' '}
            <span className="font-mono text-[#071F38] font-semibold">{gstin}</span>
          </p>
        </div>

        <Link
          href="/reports"
          className="text-xs font-bold text-[#071F38] hover:text-[#00B887] flex items-center gap-1 transition-colors"
        >
          <span>Tax Reports</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
            Taxable Value
          </span>
          <span className="text-sm sm:text-base font-extrabold text-slate-900 tabular-nums block">
            ₹{(gstSummary?.taxableSalesValue ?? 0).toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Taxable Sales</span>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
            CGST (Intra-state)
          </span>
          <span className="text-sm sm:text-base font-extrabold text-slate-900 tabular-nums block">
            ₹{(gstSummary?.totalCgst ?? 0).toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Central Tax</span>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
            SGST (Intra-state)
          </span>
          <span className="text-sm sm:text-base font-extrabold text-slate-900 tabular-nums block">
            ₹{(gstSummary?.totalSgst ?? 0).toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">State Tax</span>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
            IGST (Inter-state)
          </span>
          <span className="text-sm sm:text-base font-extrabold text-slate-900 tabular-nums block">
            ₹{(gstSummary?.totalIgst ?? 0).toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Integrated Tax</span>
        </div>
      </div>
    </div>
  );
}
