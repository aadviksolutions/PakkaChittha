'use client';

import React, { useState } from 'react';
import { Search, Loader2, CheckCircle2, AlertTriangle, XCircle, Building2, RefreshCw } from 'lucide-react';
import type { GstBusinessDetails } from '@/lib/services/gstinService';

interface GstFetchBoxProps {
  gstin: string;
  onGstinChange: (val: string) => void;
  onDetailsFetched: (details: GstBusinessDetails) => void;
  label?: string;
  required?: boolean;
}

export function GstFetchBox({
  gstin,
  onGstinChange,
  onDetailsFetched,
  label = 'GSTIN (Optional)',
  required = false,
}: GstFetchBoxProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedDetails, setFetchedDetails] = useState<GstBusinessDetails | null>(null);

  const handleFetch = async () => {
    const clean = gstin.replace(/[\s\-\u200B\u00A0]/g, '').trim().toUpperCase();
    if (!clean) {
      setError('Please enter a 15-character GSTIN first.');
      return;
    }
    if (clean.length !== 15) {
      setError(`GSTIN must be 15 characters (currently ${clean.length}).`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/gstin/lookup?gstin=${encodeURIComponent(clean)}`);
      const payload = await res.json();

      if (!res.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to retrieve GST details.');
      }

      const details: GstBusinessDetails = payload.data;
      setFetchedDetails(details);
      onDetailsFetched(details);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'GST lookup failed.';
      setError(msg);
      setFetchedDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const statusColor =
    fetchedDetails?.status === 'ACTIVE'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : fetchedDetails?.status === 'CANCELLED'
      ? 'bg-rose-50 text-rose-800 border-rose-200'
      : 'bg-amber-50 text-amber-800 border-amber-200';

  return (
    <div className="space-y-2">
      <div>
        <label className="block font-semibold text-slate-700 mb-1">
          {label} {required && <span className="text-rose-600">*</span>}
        </label>
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <input
              type="text"
              maxLength={15}
              placeholder="e.g. 22AAAAA0000A1Z5"
              value={gstin}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                onGstinChange(val);
                if (error) setError(null);
                if (fetchedDetails && val !== fetchedDetails.gstin) {
                  setFetchedDetails(null);
                }
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono uppercase text-xs focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>
          <button
            type="button"
            onClick={handleFetch}
            disabled={loading || gstin.trim().length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors shadow-2xs shrink-0 cursor-pointer"
            title="Fetch Legal Name, Address & Status from GST Registry"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Fetching...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>Fetch Details</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error / Warning Notice */}
      {error && (
        <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={handleFetch}
            className="text-[10px] font-bold underline hover:text-rose-900 shrink-0 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Retrieved GSTIN Information Preview Card */}
      {fetchedDetails && (
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-slate-900">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{fetchedDetails.tradeName || fetchedDetails.legalName}</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${statusColor}`}>
              {fetchedDetails.status}
            </span>
          </div>

          {fetchedDetails.legalName && fetchedDetails.legalName !== fetchedDetails.tradeName && (
            <div className="text-[11px] text-slate-500">
              Legal: <span className="text-slate-700 font-medium">{fetchedDetails.legalName}</span>
            </div>
          )}

          <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
            {fetchedDetails.constitution && (
              <span>Type: <strong className="text-slate-700 font-medium">{fetchedDetails.constitution}</strong></span>
            )}
            {fetchedDetails.taxpayerType && (
              <span>Taxpayer: <strong className="text-slate-700 font-medium">{fetchedDetails.taxpayerType}</strong></span>
            )}
            {fetchedDetails.registrationDate && (
              <span>Reg: <strong className="text-slate-700 font-medium">{fetchedDetails.registrationDate}</strong></span>
            )}
          </div>

          <div className="text-[11px] text-slate-600 border-t border-slate-200/60 pt-1">
            <span className="text-slate-400">Address: </span>
            {fetchedDetails.address}
          </div>

          <div className="flex items-center justify-between pt-0.5 text-[10px] text-emerald-700 font-medium">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Form fields populated. You can edit them before saving.
            </span>
            <span className="text-slate-400 font-mono text-[9px]">
              {fetchedDetails.source}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
