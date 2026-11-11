'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  Share2,
  Users,
  AlertCircle,
} from 'lucide-react';
import type {
  KhataConsolidatedReportResult,
  ReportAccountStatusFilter,
  ReportDatePreset,
  ReportDirectionFilter,
  ReportPaymentModeFilter,
} from '@/lib/services/khataReportService';
import ReportShareModal from '@/components/free-khata/ReportShareModal';

function formatInrClient(amount: number, includeSign = false): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const abs = Math.abs(safe);
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);
  if (safe < 0) return `-₹${formatted}`;
  if (includeSign && safe > 0) return `+₹${formatted}`;
  return `₹${formatted}`;
}

function formatDateTimeClient(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

interface FilterState {
  dateRange: ReportDatePreset;
  startDate: string;
  endDate: string;
  search: string;
  direction: ReportDirectionFilter;
  paymentMode: ReportPaymentModeFilter;
  accountStatus: ReportAccountStatusFilter;
}

const DEFAULT_FILTERS: FilterState = {
  dateRange: 'ALL',
  startDate: '',
  endDate: '',
  search: '',
  direction: 'ALL',
  paymentMode: 'ALL',
  accountStatus: 'OUTSTANDING',
};

interface KhataConsolidatedReportViewProps {
  backHref?: string;
  backLabel?: string;
}

export default function KhataConsolidatedReportView({
  backHref = '/free-khata',
  backLabel = 'Back to Personal Khata',
}: KhataConsolidatedReportViewProps) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [report, setReport] = useState<KhataConsolidatedReportResult | null>(null);
  const [shareMeta, setShareMeta] = useState<{ subject: string; text: string }>({
    subject: 'Personal Khata Report',
    text: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingFormat, setDownloadingFormat] = useState<'xlsx' | 'pdf' | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);

  // Debounce search typing smoothly
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const queryParamsString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('dateRange', filters.dateRange);
    if (filters.dateRange === 'CUSTOM') {
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
    }
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    params.set('direction', filters.direction);
    params.set('paymentMode', filters.paymentMode);
    params.set('accountStatus', filters.accountStatus);
    return params.toString();
  }, [
    filters.dateRange,
    filters.startDate,
    filters.endDate,
    debouncedSearch,
    filters.direction,
    filters.paymentMode,
    filters.accountStatus,
  ]);

  const fetchReport = useCallback(async () => {
    if (filters.dateRange === 'CUSTOM' && !filters.startDate && !filters.endDate) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/free-khata/reports?${queryParamsString}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load Khata consolidated report.');
      }
      setReport(json.report);
      setShareMeta(json.share || { subject: 'Personal Khata Report', text: '' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load report.');
    } finally {
      setLoading(false);
    }
  }, [queryParamsString, filters.dateRange, filters.startDate, filters.endDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleDownload = async (format: 'xlsx' | 'pdf', contactId?: string, personName?: string) => {
    try {
      setDownloadingFormat(format);
      setStatusMessage(null);
      setError(null);

      const url = contactId
        ? `/api/free-khata/reports/export?format=${format}&contactId=${encodeURIComponent(contactId)}&${queryParamsString}`
        : `/api/free-khata/reports/export?format=${format}&${queryParamsString}`;

      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        let message = `Failed to download ${format.toUpperCase()} report.`;
        try {
          const errJson = await res.json();
          if (errJson?.error) message = errJson.error;
        } catch {
          // Non-JSON response
        }
        throw new Error(message);
      }

      const blob = await res.blob();
      const cd = res.headers.get('content-disposition') || '';
      const filenameMatch = cd.match(/filename="([^"]+)"/);
      const defaultName = contactId
        ? `khata-party-${(personName || 'statement').toLowerCase().replace(/\s+/g, '-')}.${format}`
        : `pakkachittha-khata-report.${format}`;
      const filename = filenameMatch?.[1] || defaultName;

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);

      setStatusMessage(
        `${format === 'xlsx' ? 'Excel Workbook (.xlsx)' : 'PDF Statement (.pdf)'} downloaded: ${filename}`
      );
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setDebouncedSearch('');
  };

  const isFiltered =
    filters.dateRange !== 'ALL' ||
    filters.search.trim() !== '' ||
    filters.direction !== 'ALL' ||
    filters.paymentMode !== 'ALL' ||
    filters.accountStatus !== 'OUTSTANDING';

  const dateStamp = new Date().toISOString().slice(0, 10);
  const excelExportUrl = `/api/free-khata/reports/export?format=xlsx&${queryParamsString}`;
  const pdfExportUrl = `/api/free-khata/reports/export?format=pdf&${queryParamsString}`;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6 pb-24 lg:pb-12 print:p-0 print:max-w-none print:space-y-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-[#071F38] via-[#0B2A4B] to-[#0E3963] rounded-3xl p-5 sm:p-7 text-white shadow-lg print:bg-white print:text-slate-900 print:border print:border-slate-300 print:rounded-xl print:shadow-none">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <Link
                href={backHref}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 hover:text-emerald-200 bg-white/10 hover:bg-white/15 px-3 py-1 rounded-full transition-colors"
              >
                ← {backLabel}
              </Link>
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                Consolidated Statement
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {report?.metadata.businessName || 'Personal Khata'} — Consolidated Hisab Report
            </h1>
            <p className="text-sm text-slate-200 print:text-slate-600 max-w-3xl">
              किससे कितनी रकम लेनी है, किसको कितनी देनी है, और आपकी वर्तमान स्थिति — एक ही पेज पर साफ़ हिसाब।
            </p>
            {report && (
              <p className="text-xs text-slate-300 print:text-slate-600 pt-1">
                Period: <span className="font-semibold text-white print:text-slate-900">{report.filters.periodLabel}</span>
                {'  •  '}
                Ref: <span className="font-mono">{report.metadata.referenceNumber}</span>
                {'  •  '}
                Generated: {report.metadata.generatedAtDisplay}
              </p>
            )}
          </div>

          {/* Primary Export, Print & Share Controls */}
          <div className="flex flex-wrap items-center gap-2.5 print:hidden">
            <button
              type="button"
              disabled={downloadingFormat !== null || loading}
              onClick={() => handleDownload('xlsx')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm shadow-sm transition-colors disabled:opacity-60 cursor-pointer"
            >
              {downloadingFormat === 'xlsx' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              Download Excel (.xlsx)
            </button>

            <button
              type="button"
              disabled={downloadingFormat !== null || loading}
              onClick={() => handleDownload('pdf')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-[#071F38] font-bold text-xs sm:text-sm shadow-sm transition-colors disabled:opacity-60 cursor-pointer"
            >
              {downloadingFormat === 'pdf' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 text-rose-600" />
              )}
              Download PDF Statement
            </button>

            <button
              type="button"
              disabled={loading || !report}
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs sm:text-sm transition-colors disabled:opacity-60 cursor-pointer"
              title="Print Report"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              type="button"
              disabled={loading || !report}
              onClick={() => setIsShareOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs sm:text-sm shadow-sm transition-colors disabled:opacity-60 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              Share Report
            </button>
          </div>
        </div>
      </div>

      {/* Feedback & Error Notices */}
      {statusMessage && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-medium text-emerald-900 print:hidden">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-medium text-rose-900 print:hidden">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchReport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-5 space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-extrabold text-[#071F38]">
            <Filter className="w-4 h-4 text-emerald-600" />
            Filter & Search Report (सभी कार्ड और टेबल फिल्टर के हिसाब से अपडेट होंगे)
          </div>
          {isFiltered && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#071F38] bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>

        {/* Date Preset Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 mr-1">
            <Calendar className="w-3.5 h-3.5" />
            Period:
          </span>
          {(
            [
              { id: 'ALL', label: 'All Time' },
              { id: 'TODAY', label: 'Today' },
              { id: 'THIS_WEEK', label: 'This Week' },
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'THIS_YEAR', label: 'This Year' },
              { id: 'CUSTOM', label: 'Custom Range' },
            ] as Array<{ id: ReportDatePreset; label: string }>
          ).map((preset) => {
            const active = filters.dateRange === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    dateRange: preset.id,
                    startDate:
                      preset.id === 'CUSTOM' && !prev.startDate
                        ? dateStamp
                        : prev.startDate,
                    endDate:
                      preset.id === 'CUSTOM' && !prev.endDate
                        ? dateStamp
                        : prev.endDate,
                  }))
                }
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#071F38] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Custom Range Dates */}
        {filters.dateRange === 'CUSTOM' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                From Date (शुरुआत की तारीख)
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#071F38]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                To Date (अंतिम तारीख)
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#071F38]"
              />
            </div>
          </div>
        )}

        {/* Search, Direction, Payment Mode & Account Status Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Search person name or mobile..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#071F38]"
            />
          </div>

          <select
            aria-label="Filter by Receivable or Payable direction"
            value={filters.direction}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                direction: e.target.value as ReportDirectionFilter,
              }))
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#071F38]"
          >
            <option value="ALL">All Balances (लेनी और देनी दोनों)</option>
            <option value="TO_RECEIVE">Amount to Receive Only (सिर्फ़ लेनी)</option>
            <option value="TO_PAY">Amount to Pay Only (सिर्फ़ देनी)</option>
          </select>

          <select
            aria-label="Filter by Payment Mode"
            value={filters.paymentMode}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                paymentMode: e.target.value as ReportPaymentModeFilter,
              }))
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#071F38]"
          >
            <option value="ALL">All Payment Modes (सभी माध्यम)</option>
            <option value="CASH">Cash (नकद)</option>
            <option value="UPI">UPI</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CHEQUE">Cheque</option>
            <option value="OTHER">Other</option>
          </select>

          <select
            aria-label="Filter by Account Status"
            value={filters.accountStatus}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                accountStatus: e.target.value as ReportAccountStatusFilter,
              }))
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#071F38]"
          >
            <option value="OUTSTANDING">Outstanding Only (बकाया हिसाब)</option>
            <option value="SETTLED">Settled Accounts Only (हिसाब पूरा)</option>
            <option value="ALL">All Accounts (बकाया + पूरा)</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && !report ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#071F38] mx-auto" />
          <p className="text-sm font-bold text-slate-700">
            Calculating consolidated Khata statement...
          </p>
        </div>
      ) : report ? (
        <>
          {/* 4 KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Total Amount to Receive */}
            <div className="rounded-3xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 p-5 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
                    Total Amount to Receive
                  </p>
                  <p className="text-xs font-bold text-emerald-800/80 mt-0.5">
                    कुल मिलने वाली रकम
                  </p>
                </div>
                <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <ArrowDownLeft className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-3 tabular-nums">
                {formatInrClient(report.summary.totalAmountToReceive)}
              </p>
              <p className="text-xs text-emerald-800/75 font-medium mt-2">
                {report.summary.receivableAccountCount} party account(s) owe you
              </p>
            </div>

            {/* KPI 2: Total Amount to Pay */}
            <div className="rounded-3xl bg-gradient-to-br from-rose-50 to-white border border-rose-200 p-5 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-rose-700">
                    Total Amount to Pay
                  </p>
                  <p className="text-xs font-bold text-rose-800/80 mt-0.5">
                    कुल देने वाली रकम
                  </p>
                </div>
                <span className="p-2 rounded-xl bg-rose-100 text-rose-700">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-rose-700 mt-3 tabular-nums">
                {formatInrClient(report.summary.totalAmountToPay)}
              </p>
              <p className="text-xs text-rose-800/75 font-medium mt-2">
                {report.summary.payableAccountCount} party account(s) you owe
              </p>
            </div>

            {/* KPI 3: Net Position */}
            <div className="rounded-3xl bg-gradient-to-br from-blue-50 to-white border border-blue-200 p-5 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-[#071F38]">
                    Net Position
                  </p>
                  <p className="text-xs font-bold text-slate-600 mt-0.5">
                    मेरी वर्तमान स्थिति
                  </p>
                </div>
                <span className="p-2 rounded-xl bg-blue-100 text-[#071F38]">
                  <Scale className="w-4 h-4" />
                </span>
              </div>
              <p
                className={`text-2xl sm:text-3xl font-black mt-3 tabular-nums ${
                  report.summary.netPosition >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {formatInrClient(report.summary.netPosition, true)}
              </p>
              <p className="text-xs text-slate-600 font-semibold mt-2">
                {report.summary.netPositionLabel}
              </p>
            </div>

            {/* KPI 4: Total Active Accounts */}
            <div className="rounded-3xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 p-5 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Total Active Accounts
                  </p>
                  <p className="text-xs font-bold text-slate-500 mt-0.5">
                    कुल सक्रिय हिसाब
                  </p>
                </div>
                <span className="p-2 rounded-xl bg-slate-200 text-[#071F38]">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-[#071F38] mt-3 tabular-nums">
                {report.summary.totalActiveAccounts}
              </p>
              <p className="text-xs text-slate-600 font-medium mt-2">
                {report.summary.dualBalanceAccountCount > 0
                  ? `${report.summary.dualBalanceAccountCount} dual-balance • `
                  : ''}
                {report.summary.settledAccountCount} settled accounts
              </p>
            </div>
          </div>

          {/* Clarity Distinction Box: Live Balances vs Selected Period Activity vs Historical Lifetime Totals */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <div>
                <h2 className="text-sm font-extrabold text-[#071F38]">
                  Clear Accounting Distinction (वर्तमान बकाया बनाम चुनी गई अवधि और कुल इतिहास)
                </h2>
                <p className="text-xs text-slate-500">
                  Current outstanding balances always reflect each party&apos;s complete ledger history — never calculated solely from transactions within the selected date window.
                </p>
              </div>
              {isFiltered && (
                <div className="text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-xl shrink-0">
                  Full Workspace Live Net: {formatInrClient(report.workspaceLiveTotals.netPosition, true)} ({report.workspaceLiveTotals.totalActiveAccounts} active)
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3.5 space-y-1">
                <p className="font-extrabold text-[#071F38] uppercase tracking-wider text-[11px]">
                  1. Current Live Balances (आज की कुल स्थिति)
                </p>
                <p className="text-slate-700">
                  Receivable: <strong className="text-emerald-700">{formatInrClient(report.summary.totalAmountToReceive)}</strong>
                </p>
                <p className="text-slate-700">
                  Payable: <strong className="text-rose-700">{formatInrClient(report.summary.totalAmountToPay)}</strong>
                </p>
              </div>

              <div className="rounded-2xl bg-blue-50/60 border border-blue-200/70 p-3.5 space-y-1">
                <p className="font-extrabold text-[#071F38] uppercase tracking-wider text-[11px]">
                  2. Selected Period Activity ({report.periodSummary.transactionCount} txns)
                </p>
                <p className="text-slate-700">
                  Given: <strong>{formatInrClient(report.periodSummary.totalGivenInPeriod)}</strong> • Recv Back: <strong className="text-emerald-700">{formatInrClient(report.periodSummary.totalReceivedBackInPeriod)}</strong>
                </p>
                <p className="text-slate-700">
                  Taken: <strong>{formatInrClient(report.periodSummary.totalTakenInPeriod)}</strong> • Returned: <strong className="text-rose-700">{formatInrClient(report.periodSummary.totalReturnedInPeriod)}</strong>
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3.5 space-y-1">
                <p className="font-extrabold text-[#071F38] uppercase tracking-wider text-[11px]">
                  3. Historical Lifetime Totals (शुरुआत से अब तक)
                </p>
                <p className="text-slate-700">
                  Given: <strong>{formatInrClient(report.historicalSummary.totalGivenLifetime)}</strong> • Recv Back: <strong className="text-emerald-700">{formatInrClient(report.historicalSummary.totalReceivedBackLifetime)}</strong>
                </p>
                <p className="text-slate-700">
                  Taken: <strong>{formatInrClient(report.historicalSummary.totalTakenLifetime)}</strong> • Returned: <strong className="text-rose-700">{formatInrClient(report.historicalSummary.totalReturnedLifetime)}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* =================================================================
              SECTION A: Amount to Receive – किससे रकम लेनी है
             ================================================================= */}
          <section className="bg-white rounded-3xl border border-emerald-200 shadow-xs overflow-hidden">
            <div className="bg-emerald-50/90 border-b border-emerald-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-emerald-950 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-black">
                    A
                  </span>
                  Amount to Receive – किससे रकम लेनी है
                </h2>
                <p className="text-xs text-emerald-800/80 mt-0.5">
                  Outstanding receivables only ({report.amountToReceiveRows.length} accounts). Never offset automatically against amounts you owe.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold uppercase text-emerald-700 block">
                  Total Receivable
                </span>
                <span className="text-xl font-black text-emerald-700 tabular-nums">
                  {formatInrClient(report.summary.totalAmountToReceive)}
                </span>
              </div>
            </div>

            {report.amountToReceiveRows.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No outstanding receivable balances found for the selected filters.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-emerald-700 text-white text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3 text-center w-14">S.No.</th>
                        <th className="px-4 py-3">Person Name</th>
                        <th className="px-4 py-3">Mobile Number</th>
                        <th className="px-4 py-3 text-right">Total Amount Given</th>
                        <th className="px-4 py-3 text-right">Amount Received Back</th>
                        <th className="px-4 py-3 text-right">Balance to Receive</th>
                        <th className="px-4 py-3 text-right print:hidden">Party Report</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.amountToReceiveRows.map((row) => (
                        <tr key={`rec-${row.contactId}`} className="hover:bg-emerald-50/40 transition-colors">
                          <td className="px-4 py-3 text-center font-semibold text-slate-500">
                            {row.sNo}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/free-khata/person/${row.contactId}`}
                                className="font-bold text-[#071F38] hover:text-emerald-700 hover:underline"
                              >
                                {row.personName}
                              </Link>
                              {row.hasPayableAlso && (
                                <span
                                  className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200"
                                  title="This person also appears separately in Amount to Pay (never offset)"
                                >
                                  Also Payable: {formatInrClient(row.currentPayableBalance)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">
                            {row.mobileNumber}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-800 tabular-nums">
                            {formatInrClient(row.totalAmountGiven)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-700 tabular-nums">
                            {formatInrClient(row.amountReceivedBack)}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-emerald-700 bg-emerald-50/60 tabular-nums">
                            {formatInrClient(row.balanceToReceive)}
                          </td>
                          <td className="px-4 py-3 text-right print:hidden">
                            <div className="inline-flex items-center gap-1.5">
                              <Link
                                href={`/free-khata/person/${row.contactId}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#071F38]"
                              >
                                Ledger <ExternalLink className="w-3 h-3" />
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDownload('pdf', row.contactId, row.personName)}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                                title={`Download ${row.personName} PDF Statement`}
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-emerald-50 border-t-2 border-emerald-300 font-extrabold text-emerald-950">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-sm">
                          Total Receivable ({report.amountToReceiveRows.length} Parties)
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatInrClient(
                            report.amountToReceiveRows.reduce((s, r) => s + r.totalAmountGiven, 0)
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-700 tabular-nums">
                          {formatInrClient(
                            report.amountToReceiveRows.reduce((s, r) => s + r.amountReceivedBack, 0)
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-700 text-base tabular-nums">
                          {formatInrClient(report.summary.totalAmountToReceive)}
                        </td>
                        <td className="print:hidden" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </section>

          {/* =================================================================
              SECTION B: Amount to Pay – किसको रकम देनी है
             ================================================================= */}
          <section className="bg-white rounded-3xl border border-rose-200 shadow-xs overflow-hidden">
            <div className="bg-rose-50/90 border-b border-rose-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-rose-950 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-rose-600 text-white text-xs font-black">
                    B
                  </span>
                  Amount to Pay – किसको रकम देनी है
                </h2>
                <p className="text-xs text-rose-800/80 mt-0.5">
                  Outstanding payables only ({report.amountToPayRows.length} accounts). Shown independently from receivables.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold uppercase text-rose-700 block">
                  Total Payable
                </span>
                <span className="text-xl font-black text-rose-700 tabular-nums">
                  {formatInrClient(report.summary.totalAmountToPay)}
                </span>
              </div>
            </div>

            {report.amountToPayRows.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No outstanding payable balances found for the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-rose-700 text-white text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-center w-14">S.No.</th>
                      <th className="px-4 py-3">Person Name</th>
                      <th className="px-4 py-3">Mobile Number</th>
                      <th className="px-4 py-3 text-right">Total Amount Taken</th>
                      <th className="px-4 py-3 text-right">Amount Returned</th>
                      <th className="px-4 py-3 text-right">Balance to Pay</th>
                      <th className="px-4 py-3 text-right print:hidden">Party Report</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.amountToPayRows.map((row) => (
                      <tr key={`pay-${row.contactId}`} className="hover:bg-rose-50/40 transition-colors">
                        <td className="px-4 py-3 text-center font-semibold text-slate-500">
                          {row.sNo}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/free-khata/person/${row.contactId}`}
                              className="font-bold text-[#071F38] hover:text-rose-700 hover:underline"
                            >
                              {row.personName}
                            </Link>
                            {row.hasReceivableAlso && (
                              <span
                                className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200"
                                title="This person also appears separately in Amount to Receive (never offset)"
                              >
                                Also Receivable: {formatInrClient(row.currentReceivableBalance)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {row.mobileNumber}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800 tabular-nums">
                          {formatInrClient(row.totalAmountTaken)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-700 tabular-nums">
                          {formatInrClient(row.amountReturned)}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-rose-700 bg-rose-50/60 tabular-nums">
                          {formatInrClient(row.balanceToPay)}
                        </td>
                        <td className="px-4 py-3 text-right print:hidden">
                          <div className="inline-flex items-center gap-1.5">
                            <Link
                              href={`/free-khata/person/${row.contactId}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#071F38]"
                            >
                              Ledger <ExternalLink className="w-3 h-3" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDownload('pdf', row.contactId, row.personName)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                              title={`Download ${row.personName} PDF Statement`}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-rose-50 border-t-2 border-rose-300 font-extrabold text-rose-950">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-sm">
                        Total Payable ({report.amountToPayRows.length} Parties)
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatInrClient(
                          report.amountToPayRows.reduce((s, r) => s + r.totalAmountTaken, 0)
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-700 tabular-nums">
                        {formatInrClient(
                          report.amountToPayRows.reduce((s, r) => s + r.amountReturned, 0)
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-rose-700 text-base tabular-nums">
                        {formatInrClient(report.summary.totalAmountToPay)}
                      </td>
                      <td className="print:hidden" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>

          {/* Optional Settled Accounts Section when User Explicitly Selects Settled or All */}
          {filters.accountStatus !== 'OUTSTANDING' && report.settledAccounts.length > 0 && (
            <section className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-4">
                <h2 className="text-base font-extrabold text-[#071F38]">
                  Settled Accounts – जिनका हिसाब पूरा हो चुका है ({report.settledAccounts.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Zero outstanding balance. Kept separate from Receivable and Payable tables.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-700 text-white text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-center w-14">S.No.</th>
                      <th className="px-4 py-3">Person Name</th>
                      <th className="px-4 py-3">Mobile</th>
                      <th className="px-4 py-3 text-right">Given</th>
                      <th className="px-4 py-3 text-right">Received Back</th>
                      <th className="px-4 py-3 text-right">Taken</th>
                      <th className="px-4 py-3 text-right">Returned</th>
                      <th className="px-4 py-3 text-center">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.settledAccounts.map((acc) => (
                      <tr key={`set-${acc.contactId}`} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-center text-slate-500">{acc.sNo}</td>
                        <td className="px-4 py-3 font-bold">
                          <Link
                            href={`/free-khata/person/${acc.contactId}`}
                            className="text-[#071F38] hover:underline"
                          >
                            {acc.personName}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {acc.mobileNumber}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatInrClient(acc.totalGiven)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatInrClient(acc.totalReceivedBack)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatInrClient(acc.totalTaken)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatInrClient(acc.totalReturned)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                            Settled ₹0.00
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* =================================================================
              SECTION C: Detailed Transaction History (Filtered)
             ================================================================= */}
          <section className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#071F38]">
                  Transaction Details – सभी लेन-देन का विवरण ({report.transactions.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Chronological history showing exact Previous Balance & Updated Balance in each entry&apos;s bucket.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-full">
                {report.filters.periodLabel}
              </span>
            </div>

            {report.transactions.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No transactions match your active filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#071F38] text-white text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Date & Time</th>
                      <th className="px-4 py-3">Person Name</th>
                      <th className="px-4 py-3">Transaction Type</th>
                      <th className="px-4 py-3">Payment Mode</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3">Notes / Ref</th>
                      <th className="px-4 py-3 text-right">Previous Bal.</th>
                      <th className="px-4 py-3 text-right">Updated Bal.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
                          {formatDateTimeClient(tx.date)}
                        </td>
                        <td className="px-4 py-3 font-bold">
                          <Link
                            href={`/free-khata/person/${tx.contactId}`}
                            className="text-[#071F38] hover:text-blue-700 hover:underline"
                          >
                            {tx.personName}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              tx.balanceBucket === 'TO_RECEIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {tx.activityLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-700">
                          {tx.paymentModeLabel}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-extrabold tabular-nums ${
                            tx.moneyDirection === 'IN' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {tx.moneyDirection === 'IN' ? '+' : '-'}
                          {formatInrClient(tx.amount)}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 max-w-xs">
                          {tx.notes || tx.paymentRef || '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-semibold text-slate-600 tabular-nums">
                          {formatInrClient(tx.previousBalance)}
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-extrabold text-[#071F38] tabular-nums">
                          {formatInrClient(tx.updatedBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Share Report Modal */}
          <ReportShareModal
            isOpen={isShareOpen}
            onClose={() => setIsShareOpen(false)}
            title="Share Consolidated Khata Report"
            subject={shareMeta.subject}
            shareText={shareMeta.text}
            pdfExportUrl={pdfExportUrl}
            excelExportUrl={excelExportUrl}
            pdfFileName={`pakkachittha-khata-report-${dateStamp}.pdf`}
            excelFileName={`pakkachittha-khata-report-${dateStamp}.xlsx`}
            onPrint={handlePrint}
          />
        </>
      ) : null}
    </div>
  );
}

