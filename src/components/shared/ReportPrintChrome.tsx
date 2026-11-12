'use client';

import React, { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';

interface ReportPrintHeaderProps {
  title: string;
  subtitle?: string;
  periodLabel?: string;
  branchLabel?: string;
  gstinOverride?: string;
  referenceLabel?: string;
}

/**
 * Print-only executive A4 letterhead shown exclusively on paper / Save-as-PDF.
 * Hidden on screen (`hidden print:block`) so screen UX remains unaffected.
 */
export function ReportPrintHeader({
  title,
  subtitle,
  periodLabel,
  branchLabel,
  gstinOverride,
  referenceLabel,
}: ReportPrintHeaderProps) {
  const { activeBusiness } = useAuth();

  const printedAt = useMemo(
    () =>
      new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    []
  );

  const displayName = activeBusiness?.legalName || activeBusiness?.name || 'PakkaChittha Business';
  const tradeName =
    activeBusiness?.legalName &&
    activeBusiness?.name &&
    activeBusiness.legalName !== activeBusiness.name
      ? activeBusiness.name
      : null;
  const gstin = gstinOverride || activeBusiness?.gstin || null;
  const locationLine = [activeBusiness?.city, activeBusiness?.state].filter(Boolean).join(', ');

  return (
    <header className="hidden print:block border-b-2 border-slate-900 pb-3.5 mb-5 text-slate-900">
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-start gap-3 min-w-0">
          {activeBusiness?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeBusiness.logoUrl}
              alt={displayName}
              className="w-11 h-11 rounded-md object-contain border border-slate-300 bg-white shrink-0"
            />
          ) : null}
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">
              Accounting &amp; Statutory Statement
            </p>
            <h1 className="text-lg font-black text-slate-950 tracking-tight leading-tight">
              {displayName}
            </h1>
            {tradeName && (
              <p className="text-[10.5px] font-medium text-slate-600">Trade Name: {tradeName}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[10.5px] text-slate-700">
              {gstin && (
                <span className="font-mono font-semibold text-slate-900">GSTIN: {gstin}</span>
              )}
              {locationLine && <span>{locationLine}</span>}
              {branchLabel && <span>Branch: {branchLabel}</span>}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="inline-block border border-slate-900 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-950">
            {title}
          </div>
          {periodLabel && (
            <p className="text-[11px] font-bold text-slate-900 mt-1.5">Period: {periodLabel}</p>
          )}
          {referenceLabel && (
            <p className="text-[10px] font-mono text-slate-700 mt-0.5">{referenceLabel}</p>
          )}
          <p className="text-[9.5px] text-slate-500 mt-0.5">Printed: {printedAt}</p>
        </div>
      </div>

      {subtitle && (
        <p className="mt-2 pt-2 border-t border-slate-200 text-[10.5px] text-slate-600">
          {subtitle}
        </p>
      )}
    </header>
  );
}

interface ReportPrintFooterProps {
  note?: string;
}

/**
 * Print-only statutory sign-off footer with Prepared By / Reviewed By / Signatory block.
 */
export function ReportPrintFooter({ note }: ReportPrintFooterProps) {
  const { activeBusiness } = useAuth();
  const displayName = activeBusiness?.legalName || activeBusiness?.name || 'Business';

  return (
    <footer className="hidden print:block mt-8 pt-4 border-t border-slate-300 text-slate-700 print-avoid-break">
      <div className="grid grid-cols-3 gap-6 text-[10px] pt-6 pb-3">
        <div className="border-t border-slate-400 pt-1.5">
          <p className="font-bold text-slate-900">Prepared By</p>
          <p className="text-slate-500">Accounts Executive / Operator</p>
        </div>
        <div className="border-t border-slate-400 pt-1.5">
          <p className="font-bold text-slate-900">Verified / Reviewed By</p>
          <p className="text-slate-500">Chartered Accountant / Auditor</p>
        </div>
        <div className="border-t border-slate-400 pt-1.5 text-right">
          <p className="font-bold text-slate-900">For {displayName}</p>
          <p className="text-slate-500">Authorised Signatory</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-[9px] text-slate-500 border-t border-slate-200 pt-2">
        <span>
          {note ||
            'System-generated accounting statement from PakkaChittha ERP. Figures in INR (₹) unless specified.'}
        </span>
        <span className="font-mono">PakkaChittha ERP</span>
      </div>
    </footer>
  );
}

