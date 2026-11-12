'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileJson,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { AccountantScaleGate } from '@/components/accountant/AccountantScaleGate';
import { useAuth } from '@/context/AuthContext';

interface InvoiceSummaryRow {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerGstin: string | null;
  total: number;
  b2bEligible: boolean;
  ewbMandatoryThreshold: boolean;
}

interface PrepValidationResult {
  valid: boolean;
  portalStatus: string;
  validationErrors: string[];
  payload: Record<string, unknown> | null;
}

interface InvoiceInspectionResponse {
  invoice: {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    customerName: string;
    customerGstin: string | null;
    total: number;
  };
  einvoice: PrepValidationResult;
  ewayBill: PrepValidationResult & { thresholdExceeded: boolean };
}

function formatInr(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0);
}

export default function EInvoiceAndEwayBillPage() {
  return (
    <AccountantScaleGate>
      <EInvoiceContent />
    </AccountantScaleGate>
  );
}

function EInvoiceContent() {
  const { activeBusiness } = useAuth();
  const activeBusinessId = activeBusiness?.id;

  const [invoices, setInvoices] = useState<InvoiceSummaryRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [distanceKm, setDistanceKm] = useState<string>('50');
  const [vehicleNo, setVehicleNo] = useState<string>('');
  const [transporterId, setTransporterId] = useState<string>('');
  const [inspection, setInspection] = useState<InvoiceInspectionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    if (!activeBusinessId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/gst/e-compliance?businessId=${encodeURIComponent(activeBusinessId)}`,
        { cache: 'no-store' }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load GST invoices');
      setInvoices(json.invoices || []);
      if (!selectedId && Array.isArray(json.invoices) && json.invoices.length > 0) {
        setSelectedId(json.invoices[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load GST invoices');
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId, selectedId]);

  const inspectInvoice = useCallback(async () => {
    if (!activeBusinessId || !selectedId) return;
    setError(null);
    try {
      const qs = new URLSearchParams({
        businessId: activeBusinessId,
        invoiceId: selectedId,
        distanceKm: distanceKm || '50',
        vehicleNo,
        transporterId,
      });
      const res = await fetch(`/api/gst/e-compliance?${qs.toString()}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Inspection failed');
      setInspection(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inspection failed');
    }
  }, [activeBusinessId, selectedId, distanceKm, vehicleNo, transporterId]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadList();
    });
    return () => {
      cancelled = true;
    };
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void inspectInvoice();
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId, inspectInvoice]);

  const buildDownloadHref = (mode: 'einvoice' | 'ewb') => {
    if (!activeBusinessId || !selectedId) return '#';
    const qs = new URLSearchParams({
      businessId: activeBusinessId,
      invoiceId: selectedId,
      mode,
      distanceKm: distanceKm || '50',
      vehicleNo,
      transporterId,
      download: 'true',
    });
    return `/api/gst/e-compliance?${qs.toString()}`;
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-[#EA580C]" />
            <h1 className="text-xl font-black text-[#071F38] tracking-tight">
              E-Invoice (IRN v1.1) &amp; E-Way Bill Preparation
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Strict NIC schema validation &amp; JSON export for portal/GSP upload. No fake IRNs or E-Way Bill numbers are ever generated.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadList()}
          className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer self-start"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-2">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            Select GST Tax Invoice
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
          >
            {invoices.length === 0 && <option value="">No GST invoices found</option>}
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.invoiceNumber} — {inv.customerName} ({formatInr(inv.total)})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            EWB Distance (km)
          </label>
          <input
            type="number"
            min="1"
            value={distanceKm}
            onChange={(e) => setDistanceKm(e.target.value)}
            className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            Vehicle No (Optional)
          </label>
          <input
            type="text"
            value={vehicleNo}
            onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
            placeholder="MH12AB1234"
            className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            Transporter ID (Optional)
          </label>
          <input
            type="text"
            value={transporterId}
            onChange={(e) => setTransporterId(e.target.value.toUpperCase())}
            placeholder="15-digit Transin"
            className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
          />
        </div>
      </div>

      {inspection && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ComplianceCard
            title="NIC IRP E-Invoice Schema (v1.1)"
            subtitle="Mandatory for B2B e-invoicing taxpayers via GSTN / GSP"
            result={inspection.einvoice}
            downloadHref={buildDownloadHref('einvoice')}
            downloadLabel="Download NIC E-Invoice JSON"
          />
          <ComplianceCard
            title="NIC E-Way Bill Payload (EWB)"
            subtitle={
              inspection.ewayBill.thresholdExceeded
                ? 'Invoice exceeds ₹50,000 threshold — E-Way Bill typically mandatory for movement.'
                : 'Under ₹50,000 threshold — optional unless interstate handicraft/job-work.'
            }
            result={inspection.ewayBill}
            downloadHref={buildDownloadHref('ewb')}
            downloadLabel="Download NIC E-Way Bill JSON"
          />
        </div>
      )}
    </div>
  );
}

function ComplianceCard({
  title,
  subtitle,
  result,
  downloadHref,
  downloadLabel,
}: {
  title: string;
  subtitle: string;
  result: PrepValidationResult;
  downloadHref: string;
  downloadLabel: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-[#071F38]">{title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <span
          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border inline-flex items-center gap-1 shrink-0 ${
            result.valid
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          {result.valid ? (
            <>
              <CheckCircle2 className="w-3 h-3" /> {result.portalStatus}
            </>
          ) : (
            <>
              <AlertTriangle className="w-3 h-3" /> {result.portalStatus}
            </>
          )}
        </span>
      </div>

      {!result.valid && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 space-y-1">
          <p className="text-[11px] font-black text-rose-800">
            Validation Issues to Fix Before Portal Upload:
          </p>
          <ul className="list-disc pl-4 text-xs text-rose-700 space-y-0.5">
            {result.validationErrors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {result.valid && result.payload && (
        <>
          <a
            href={downloadHref}
            className="w-full py-2.5 px-4 rounded-xl bg-[#071F38] hover:bg-[#0D2E52] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
          >
            <FileJson className="w-4 h-4" />
            {downloadLabel}
          </a>
          <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 text-[11px] overflow-x-auto max-h-64">
            {JSON.stringify(result.payload, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
}
