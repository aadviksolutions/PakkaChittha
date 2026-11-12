'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ModulePageShell } from '@/components/shared/ModulePageShell';
import { ReportPrintHeader, ReportPrintFooter } from '@/components/shared/ReportPrintChrome';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useEntitlements } from '@/hooks/useEntitlements';
import { getCurrentFinancialYear, getAvailableFinancialYears } from '@/lib/reports/financialYear';
import KhataConsolidatedReportView from '@/components/free-khata/KhataConsolidatedReportView';
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileJson,
  TrendingUp,
  Receipt,
  ShoppingBag,
  IndianRupee,
  ShieldCheck,
  Building,
  Calendar,
  Filter,
  RefreshCw,
  Printer,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Landmark,
  Layers,
  Search,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Users,
} from 'lucide-react';

type MainTab = 'overview' | 'sales' | 'purchases' | 'gst' | 'reconciliation' | 'registers' | 'khata';
type RegisterSubTab = 'cash' | 'bank' | 'expenses' | 'receivables' | 'payables' | 'pnl';
type GstSubTab = 'gstr1' | 'gstr3b';

const INDIAN_MONTH_OPTIONS = [
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
];

function getDefaultQuarterForMonth(monthNum: number): string {
  if (monthNum >= 4 && monthNum <= 6) return 'Q1';
  if (monthNum >= 7 && monthNum <= 9) return 'Q2';
  if (monthNum >= 10 && monthNum <= 12) return 'Q3';
  return 'Q4';
}

function resolveCalendarYearForMonth(financialYear: string, monthStr: string): number {
  const [startStr, endStr] = financialYear.split('-');
  const startYear = parseInt(startStr, 10) || new Date().getFullYear();
  const endYear = parseInt(endStr, 10) || startYear + 1;
  const m = parseInt(monthStr, 10);
  return m >= 1 && m <= 3 ? endYear : startYear;
}

export default function ReportsPage() {
  const toast = useToast();
  const { activeBusiness } = useAuth();
  const { isAllowed } = useEntitlements();
  const canAdvancedReports = isAllowed('canAdvancedReports');
  const canAccountantErp = isAllowed('canAccountantErp');

  const currentMonthStr = String(new Date().getMonth() + 1);
  const financialYearOptions = getAvailableFinancialYears();

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<MainTab>('overview');
  const [registerSubTab, setRegisterSubTab] = useState<RegisterSubTab>('cash');
  const [gstSubTab, setGstSubTab] = useState<GstSubTab>('gstr1');

  // Universal Period Filters
  const [financialYear, setFinancialYear] = useState<string>(() => getCurrentFinancialYear());
  const [periodType, setPeriodType] = useState<'FY' | 'QUARTER' | 'MONTH' | 'CUSTOM'>('FY');
  const [periodValue, setPeriodValue] = useState<string>(currentMonthStr);
  const [gstMonth, setGstMonth] = useState<string>(currentMonthStr);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Secondary Filters
  const [salesSearch, setSalesSearch] = useState('');
  const [salesCustomerType, setSalesCustomerType] = useState('ALL');
  const [salesTaxRate, setSalesTaxRate] = useState('ALL');
  const [purchaseSearch, setPurchaseSearch] = useState('');
  const [purchaseItcEligibility, setPurchaseItcEligibility] = useState('ALL');
  const [purchaseStatus, setPurchaseStatus] = useState('ALL');

  // Loading & Error States
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tabError, setTabError] = useState<string | null>(null);

  // Data States
  const [overviewData, setOverviewData] = useState<any>(null);
  const [salesData, setSalesData] = useState<any>(null);
  const [purchaseData, setPurchaseData] = useState<any>(null);
  const [registersData, setRegistersData] = useState<any>(null);
  const [gstr1Data, setGstr1Data] = useState<any>(null);
  const [gstr3bData, setGstr3bData] = useState<any>(null);
  const [reconciliationData, setReconciliationData] = useState<any>(null);
  const [recentImports2b, setRecentImports2b] = useState<any[]>([]);
  const [uploading2b, setUploading2b] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getQueryString = useCallback(
    (extraParams?: Record<string, string>) => {
      const params = new URLSearchParams({
        financialYear,
        periodType,
        periodValue,
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        ...(extraParams || {}),
      });
      return params.toString();
    },
    [financialYear, periodType, periodValue, startDate, endDate]
  );

  const loadTabContent = useCallback(async () => {
    try {
      setLoading(true);
      setTabError(null);

      if (activeTab === 'overview') {
        const res = await fetch(`/api/reports/accounts-overview?${getQueryString()}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load accounts overview');
        setOverviewData(json.data);
      } else if (activeTab === 'sales') {
        const extra: Record<string, string> = {};
        if (salesCustomerType !== 'ALL') extra.customerType = salesCustomerType;
        if (salesTaxRate !== 'ALL') extra.taxRate = salesTaxRate;
        if (salesSearch.trim()) extra.search = salesSearch.trim();
        const res = await fetch(`/api/reports/sales-register?${getQueryString(extra)}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load sales register');
        setSalesData(json.data);
      } else if (activeTab === 'purchases') {
        const extra: Record<string, string> = {};
        if (purchaseItcEligibility !== 'ALL') extra.itcEligibility = purchaseItcEligibility;
        if (purchaseStatus !== 'ALL') extra.status = purchaseStatus;
        if (purchaseSearch.trim()) extra.search = purchaseSearch.trim();
        const res = await fetch(`/api/reports/purchase-register?${getQueryString(extra)}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load purchase register');
        setPurchaseData(json.data);
      } else if (activeTab === 'registers') {
        const res = await fetch(`/api/reports/financial-registers?${getQueryString()}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load financial registers');
        setRegistersData(json);
      } else if (activeTab === 'gst') {
        const calYear = resolveCalendarYearForMonth(financialYear, gstMonth);
        if (gstSubTab === 'gstr1') {
          const res = await fetch(`/api/reports/gstr1?month=${gstMonth}&year=${calYear}`, { cache: 'no-store' });
          const json = await res.json();
          if (!res.ok) {
            setGstr1Data(null);
            throw new Error(json?.error || 'Failed to generate GSTR-1 return');
          }
          setGstr1Data(json.data);
        } else {
          const res = await fetch(`/api/reports/gstr3b?month=${gstMonth}&year=${calYear}`, { cache: 'no-store' });
          const json = await res.json();
          if (!res.ok) {
            setGstr3bData(null);
            throw new Error(json?.error || 'Failed to generate GSTR-3B return');
          }
          setGstr3bData(json);
        }
      } else if (activeTab === 'reconciliation') {
        const res = await fetch('/api/reports/gstr2b', { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load GSTR-2B import history');
        setRecentImports2b(json.recentImports || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching report data';
      setTabError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    activeTab,
    financialYear,
    gstMonth,
    gstSubTab,
    getQueryString,
    purchaseItcEligibility,
    purchaseSearch,
    purchaseStatus,
    salesCustomerType,
    salesSearch,
    salesTaxRate,
    toast,
  ]);

  // Load data whenever filters, sub-tabs, or main tab changes
  useEffect(() => {
    if (!canAdvancedReports || activeTab === 'khata') return;
    if (periodType === 'CUSTOM' && (!startDate || !endDate)) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadTabContent();
    });
    return () => {
      cancelled = true;
    };
  }, [canAdvancedReports, activeTab, periodType, startDate, endDate, loadTabContent]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadTabContent();
  };

  const handlePrint = () => {
    window.print();
  };

  // Export handlers
  const handleExportSalesCsv = () => {
    const extra: Record<string, string> = { format: 'csv' };
    if (salesCustomerType !== 'ALL') extra.customerType = salesCustomerType;
    if (salesTaxRate !== 'ALL') extra.taxRate = salesTaxRate;
    if (salesSearch.trim()) extra.search = salesSearch.trim();
    window.open(`/api/reports/sales-register?${getQueryString(extra)}`, '_blank');
    toast.success('Sales Register CSV downloading...');
  };

  const handleExportPurchaseCsv = () => {
    const extra: Record<string, string> = { format: 'csv' };
    if (purchaseItcEligibility !== 'ALL') extra.itcEligibility = purchaseItcEligibility;
    if (purchaseStatus !== 'ALL') extra.status = purchaseStatus;
    if (purchaseSearch.trim()) extra.search = purchaseSearch.trim();
    window.open(`/api/reports/purchase-register?${getQueryString(extra)}`, '_blank');
    toast.success('Purchase Register CSV downloading...');
  };

  const handleExportFinancialRegisterCsv = (type: string) => {
    window.open(`/api/reports/financial-registers?${getQueryString({ bookType: type, format: 'csv' })}`, '_blank');
    toast.success(`${type.toUpperCase()} CSV report downloading...`);
  };

  const handleDownloadGstr1Json = () => {
    const m = gstMonth;
    const y = resolveCalendarYearForMonth(financialYear, m);
    window.open(`/api/reports/gstr1?month=${m}&year=${y}&download=true`, '_blank');
    toast.success('Official GSTN GSTR-1 JSON downloaded for portal upload!');
  };

  const handleDownloadGstr1Csv = () => {
    const m = gstMonth;
    const y = resolveCalendarYearForMonth(financialYear, m);
    window.open(`/api/reports/gstr1?month=${m}&year=${y}&format=csv&download=true`, '_blank');
    toast.success('GSTR-1 CSV summary downloaded!');
  };

  const handleDownloadGstr3bJson = () => {
    const m = gstMonth;
    const y = resolveCalendarYearForMonth(financialYear, m);
    window.open(`/api/reports/gstr3b?month=${m}&year=${y}&download=true`, '_blank');
    toast.success('Official GSTN GSTR-3B JSON downloaded for portal upload!');
  };

  const handleDownloadGstr3bCsv = () => {
    const m = gstMonth;
    const y = resolveCalendarYearForMonth(financialYear, m);
    window.open(`/api/reports/gstr3b?month=${m}&year=${y}&format=csv&download=true`, '_blank');
    toast.success('GSTR-3B CSV summary downloaded!');
  };

  const handleLoadSavedImport = async (importId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/gstr2b?importId=${encodeURIComponent(importId)}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok || !json.data) throw new Error(json?.error || 'Failed to load saved GSTR-2B run');
      const imp = json.data;
      const entries = Array.isArray(imp.entries) ? imp.entries : [];
      const matchedRows = entries.filter((e: any) => e.status === 'MATCHED');
      const atRiskRows = entries.filter((e: any) => e.status === 'MISSING_IN_2B');
      const unclaimedRows = entries.filter((e: any) => e.status === 'MISSING_IN_PURCHASES');
      setReconciliationData({
        returnPeriod: imp.returnPeriod,
        financialYear: imp.financialYear,
        summary: {
          totalInGstr2b: imp.totalInvoices || 0,
          matchedCount: imp.matchedCount || 0,
          mismatchCount: imp.mismatchCount || 0,
          missingIn2bCount: imp.missingIn2bCount || 0,
          missingInPurchasesCount: imp.missingInBooksCount || 0,
          reconciledItc: matchedRows.reduce((s: number, r: any) => s + Number(r.gstr2bTax || r.booksTax || 0), 0),
          atRiskItc: atRiskRows.reduce((s: number, r: any) => s + Number(r.booksTax || 0), 0),
          unclaimedItc: unclaimedRows.reduce((s: number, r: any) => s + Number(r.gstr2bTax || 0), 0),
          matchPercentage:
            entries.length > 0 ? Math.round(((imp.matchedCount || 0) / entries.length) * 100) : 0,
        },
        rows: entries.map((e: any) => ({
          status: e.status,
          supplierGstin: e.supplierGstin,
          supplierName: e.supplierName || '—',
          invoiceNumber: e.invoiceNumber,
          invoiceDate:
            typeof e.invoiceDate === 'string'
              ? e.invoiceDate.split('T')[0]
              : new Date(e.invoiceDate).toISOString().split('T')[0],
          booksTax: Number(e.booksTax ?? 0),
          gstr2bTax: Number(e.gstr2bTax ?? 0),
          taxDifference: Number(e.taxDifference ?? 0),
          notes: e.notes || '',
        })),
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to load saved reconciliation');
    } finally {
      setLoading(false);
    }
  };

  // GSTR-2B File Upload & Reconciliation
  const handleUploadGstr2b = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading2b(true);
      const calYear = resolveCalendarYearForMonth(financialYear, gstMonth);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('returnPeriod', `${String(gstMonth).padStart(2, '0')}${calYear}`);
      formData.append('financialYear', financialYear);

      const res = await fetch('/api/reports/gstr2b', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to reconcile GSTR-2B file');

      setReconciliationData(json.data);
      toast.success(`Successfully reconciled ${json.data.summary.totalInGstr2b} GSTR-2B invoices against your purchases!`);
      void loadTabContent();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error processing GSTR-2B file');
    } finally {
      setUploading2b(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportReconciliationCsv = () => {
    if (!reconciliationData) {
      toast.error('No reconciliation report available to export');
      return;
    }
    const headers = [
      'Status',
      'Supplier GSTIN',
      'Supplier Name',
      'Invoice Number',
      'Invoice Date',
      'Books Taxable',
      'Books Tax',
      'Books Total',
      'GSTR-2B Taxable',
      'GSTR-2B Tax',
      'GSTR-2B Total',
      'Tax Variance',
      'Notes',
    ];
    const rows = reconciliationData.rows.map((r: any) => [
      `"${r.status}"`,
      `"${r.supplierGstin}"`,
      `"${(r.supplierName || '').replace(/"/g, '""')}"`,
      `"${r.invoiceNumber}"`,
      `"${r.invoiceDate}"`,
      (r.booksTaxable || 0).toFixed(2),
      (r.booksTax || 0).toFixed(2),
      (r.booksTotal || 0).toFixed(2),
      (r.gstr2bTaxable || 0).toFixed(2),
      (r.gstr2bTax || 0).toFixed(2),
      (r.gstr2bTotal || 0).toFixed(2),
      (r.taxDifference || 0).toFixed(2),
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `gstr2b_reconciliation_${financialYear}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('GSTR-2B Reconciliation CSV downloaded!');
  };

  // Run Demo GSTR-2B Reconciliation (for testing with realistic data)
  const handleRunDemoReconciliation = async () => {
    try {
      setUploading2b(true);
      // Construct demo GSTR-2B payload with realistic invoices matching existing vendors
      const demoPayload = {
        gstin: '22AAAAA0000A1Z5',
        fp: `${String(periodValue).padStart(2, '0')}${financialYear.split('-')[0]}`,
        b2b: [
          {
            ctin: '22ABCDE1234F1Z5',
            cpty: 'Shree Balaji Traders',
            inv: [
              {
                inum: 'PUR-001',
                idt: '12-10-2026',
                val: 11800,
                pos: '22',
                rchrg: 'N',
                inv_typ: 'R',
                itcavl: 'Y',
                itms: [{ num: 1, itm_det: { rt: 18, txval: 10000, iamt: 0, camt: 900, samt: 900, csamt: 0 } }],
              },
              {
                inum: 'INV/2026/892',
                idt: '15-10-2026',
                val: 5900,
                pos: '22',
                rchrg: 'N',
                inv_typ: 'R',
                itcavl: 'Y',
                itms: [{ num: 1, itm_det: { rt: 18, txval: 5000, iamt: 0, camt: 450, samt: 450, csamt: 0 } }],
              },
            ],
          },
          {
            ctin: '27AABCT3518Q1ZV',
            cpty: 'Apex Wholesale India Ltd',
            inv: [
              {
                inum: 'APX-9941',
                idt: '18-10-2026',
                val: 23600,
                pos: '27',
                rchrg: 'N',
                inv_typ: 'R',
                itcavl: 'Y',
                itms: [{ num: 1, itm_det: { rt: 18, txval: 20000, iamt: 3600, camt: 0, samt: 0, csamt: 0 } }],
              },
            ],
          },
        ],
      };

      const res = await fetch('/api/reports/gstr2b', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonContent: demoPayload,
          fileName: 'demo_gst_portal_gstr2b.json',
          returnPeriod: demoPayload.fp,
          financialYear,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to run demo reconciliation');

      setReconciliationData(json.data);
      toast.success('Live Demo GSTR-2B reconciled against your real purchase register!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error in demo reconciliation');
    } finally {
      setUploading2b(false);
    }
  };

  if (!canAdvancedReports) {
    return (
      <div className="space-y-4">
        <KhataConsolidatedReportView
          backHref="/free-khata"
          backLabel="Back to Personal Khata"
        />
      </div>
    );
  }

  const activePrintTitleMap: Record<MainTab, string> = {
    overview: 'Accounts Overview & Tax Summary',
    sales: 'Sales Register & HSN Summary',
    purchases: 'Purchase Register & Eligible ITC',
    gst: gstSubTab === 'gstr1' ? 'GSTR-1 Outward Supplies Statement' : 'GSTR-3B Monthly Tax Summary',
    reconciliation: 'GSTR-2B ITC Reconciliation Report',
    registers:
      registerSubTab === 'cash'
        ? 'Physical Cash Book Ledger'
        : registerSubTab === 'bank'
          ? 'Bank & UPI Book Ledger'
          : registerSubTab === 'expenses'
            ? 'Operating Expense Register'
            : registerSubTab === 'receivables'
              ? 'Customer Outstanding Receivables'
              : registerSubTab === 'payables'
                ? 'Supplier Payable Ledger'
                : 'Statement of Profit & Loss (P&L)',
    khata: 'Personal Khata Consolidated Report',
  };

  const activePeriodLabel =
    activeTab === 'gst'
      ? `${INDIAN_MONTH_OPTIONS.find((m) => m.value === gstMonth)?.label || gstMonth} ${resolveCalendarYearForMonth(financialYear, gstMonth)} (FY ${financialYear})`
      : periodType === 'FY'
        ? `FY ${financialYear}`
        : periodType === 'QUARTER'
          ? `${periodValue} · FY ${financialYear}`
          : periodType === 'MONTH'
            ? `${INDIAN_MONTH_OPTIONS.find((m) => m.value === periodValue)?.label || periodValue} ${resolveCalendarYearForMonth(financialYear, periodValue)} (FY ${financialYear})`
            : startDate && endDate
              ? `${startDate} to ${endDate}`
              : `Custom · FY ${financialYear}`;

  return (
    <ModulePageShell
      title="Accounts & GST Reporting"
      description="Production-grade commercial financial intelligence: Sales Register with HSN, Purchase Register with ITC verification, GSTR-1 / GSTR-3B portal JSON returns, GSTR-2B reconciliation, Cash/Bank books, and Profit & Loss."
      targetPhase="Financial & Tax Intelligence"
      hideHeaderInPrint
    >
      <div className="space-y-6">
        <ReportPrintHeader
          title={activePrintTitleMap[activeTab]}
          subtitle={`Commercial Accounts & Statutory Register — ${activeBusiness?.name || 'Business Workspace'}`}
          periodLabel={activePeriodLabel}
        />

        {/* =========================================================================
            1. UNIVERSAL FILTER & ACTION CONTROL BAR
            Financial Year, Period Type, Refresh & Print actions
            ========================================================================= */}
        <div className="print:hidden bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Financial Year Selector */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="text-xs font-semibold text-slate-600">FY:</span>
              <select
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden cursor-pointer"
              >
                {financialYearOptions.map((fy) => (
                  <option key={fy} value={fy}>
                    {fy}
                  </option>
                ))}
              </select>
            </div>

            {/* Period Type Selector */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <Filter className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="text-xs font-semibold text-slate-600">View:</span>
              <select
                value={periodType}
                onChange={(e) => {
                  const next = e.target.value as 'FY' | 'QUARTER' | 'MONTH' | 'CUSTOM';
                  setPeriodType(next);
                  if (next === 'QUARTER' && !['Q1', 'Q2', 'Q3', 'Q4'].includes(periodValue)) {
                    setPeriodValue(getDefaultQuarterForMonth(new Date().getMonth() + 1));
                  } else if (next === 'MONTH' && ['Q1', 'Q2', 'Q3', 'Q4'].includes(periodValue)) {
                    setPeriodValue(gstMonth || currentMonthStr);
                  }
                }}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden cursor-pointer"
              >
                <option value="FY">Full Financial Year</option>
                <option value="QUARTER">Quarterly</option>
                <option value="MONTH">Monthly</option>
                <option value="CUSTOM">Custom Date Range</option>
              </select>
            </div>

            {/* Quarter or Month Selector */}
            {periodType === 'QUARTER' && (
              <select
                value={['Q1', 'Q2', 'Q3', 'Q4'].includes(periodValue) ? periodValue : 'Q3'}
                onChange={(e) => setPeriodValue(e.target.value)}
                className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 cursor-pointer"
              >
                <option value="Q1">Q1 (Apr - Jun)</option>
                <option value="Q2">Q2 (Jul - Sep)</option>
                <option value="Q3">Q3 (Oct - Dec)</option>
                <option value="Q4">Q4 (Jan - Mar)</option>
              </select>
            )}

            {periodType === 'MONTH' && (
              <select
                value={periodValue}
                onChange={(e) => {
                  setPeriodValue(e.target.value);
                  setGstMonth(e.target.value);
                }}
                className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 cursor-pointer"
              >
                {INDIAN_MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            )}

            {periodType === 'CUSTOM' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 text-xs text-slate-800"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 text-xs text-slate-800"
                />
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {canAccountantErp && (
              <Link
                href="/accountant"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-violet-50 hover:bg-violet-100 text-violet-800 border border-violet-200 text-xs font-bold rounded-xl transition-colors"
                title="Open Scale Accountant ERP Statements & Ledgers"
              >
                <Landmark className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Accountant ERP</span>
              </Link>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              title="Refresh report data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              title="Print active report in A4 format"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Statement</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            2. MAIN MODULE TABS
            Accounts Overview | Sales Register | Purchase Register | GST Returns | GSTR-2B Reconciler | Financial Books
            ========================================================================= */}
        <div className="print:hidden border-b border-slate-200 overflow-x-auto scrollbar-none">
          <nav className="flex space-x-2 sm:space-x-4 min-w-max">
            {[
              { id: 'overview', label: 'Accounts Overview', icon: Layers },
              { id: 'sales', label: 'Sales Register & HSN', icon: TrendingUp },
              { id: 'purchases', label: 'Purchase Register & ITC', icon: ShoppingBag },
              { id: 'gst', label: 'GST Returns (GSTR-1 & 3B)', icon: ShieldCheck },
              { id: 'reconciliation', label: 'GSTR-2B Reconciliation', icon: Sparkles },
              { id: 'registers', label: 'Financial Books & P&L', icon: Landmark },
              { id: 'khata', label: 'Personal Khata Report', icon: Users },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as MainTab)}
                  className={`flex items-center gap-2 py-3 px-3.5 border-b-2 text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'border-[#0F172A] text-[#0F172A]'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="print:hidden py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Aggregating live business transactions & tax registers...</p>
          </div>
        )}

        {/* Inline Error Banner (e.g. missing 15-digit GSTIN or validation error) */}
        {!loading && tabError && activeTab !== 'khata' && (
          <div className="print:hidden bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Could not load this report section</p>
                <p className="text-amber-800 mt-0.5">{tabError}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {tabError.toLowerCase().includes('gstin') && (
                <Link
                  href="/settings"
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                >
                  Add GSTIN in Settings
                </Link>
              )}
              <button
                type="button"
                onClick={() => void loadTabContent()}
                className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 text-xs font-bold hover:bg-amber-100 cursor-pointer"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 1: ACCOUNTS OVERVIEW
            ========================================================================= */}
        {!loading && activeTab === 'overview' && overviewData && (
          <div className="space-y-6">
            {/* Top Financial Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Sales Turnover */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[10.5px] uppercase font-bold tracking-wider">Gross Sales Turnover</span>
                  <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xl font-black text-slate-900 font-mono tabular-nums">
                  ₹{overviewData.sales.grossTurnover.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                  <span>Taxable: ₹{overviewData.sales.taxableTurnover.toLocaleString('en-IN')}</span>
                  <span className="text-emerald-600 font-semibold">{overviewData.sales.invoiceCount} Bills</span>
                </div>
              </div>

              {/* Purchases & Procurement */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[10.5px] uppercase font-bold tracking-wider">Gross Procurement</span>
                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xl font-black text-slate-900 font-mono tabular-nums">
                  ₹{overviewData.purchases.grossPurchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                  <span>Taxable: ₹{overviewData.purchases.taxablePurchases.toLocaleString('en-IN')}</span>
                  <span className="text-blue-600 font-semibold">{overviewData.purchases.purchaseCount} Purchases</span>
                </div>
              </div>

              {/* Operating Overheads */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[10.5px] uppercase font-bold tracking-wider">Operating Overheads</span>
                  <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                    <Receipt className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xl font-black text-slate-900 font-mono tabular-nums">
                  ₹{overviewData.profitability.operatingExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                  <span>Recorded Expenses</span>
                  <span className="text-amber-600 font-semibold">Petty Cash & Ops</span>
                </div>
              </div>

              {/* Estimated Net Profit */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[10.5px] uppercase font-bold tracking-wider">Estimated Net Profit</span>
                  <div className={`p-1.5 rounded-lg ${overviewData.profitability.netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    <IndianRupee className="w-4 h-4" />
                  </div>
                </div>
                <div className={`text-xl font-black font-mono tabular-nums ${overviewData.profitability.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ₹{overviewData.profitability.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                  <span>Gross: ₹{overviewData.profitability.grossProfit.toLocaleString('en-IN')}</span>
                  <span className="font-bold text-slate-700">{overviewData.profitability.netMarginPercent}% Margin</span>
                </div>
              </div>
            </div>

            {/* GST Liability & Input Tax Credit Position */}
            <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white p-5 rounded-2xl shadow-md print-surface-light">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-700/80 gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 print:hidden">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">GST Liability & Input Tax Credit (ITC) Position</h3>
                    <p className="text-xs text-slate-400">
                      Auto-computed from verifiable outward tax liability minus legal eligible procurement ITC.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                  <button
                    onClick={() => { setActiveTab('gst'); setGstSubTab('gstr3b'); }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    <span>Prepare GSTR-3B</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
                <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    Total Output GST (Liability)
                  </span>
                  <span className="text-base font-bold font-mono text-white">
                    ₹{overviewData.gstPosition.totalOutputTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <p className="text-[10.5px] text-slate-400 mt-1">
                    CGST: ₹{overviewData.sales.cgstTotal.toFixed(0)} | SGST: ₹{overviewData.sales.sgstTotal.toFixed(0)} | IGST: ₹{overviewData.sales.igstTotal.toFixed(0)}
                  </p>
                </div>

                <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mb-1">
                    Eligible Input Tax Credit (ITC)
                  </span>
                  <span className="text-base font-bold font-mono text-emerald-400">
                    ₹{overviewData.gstPosition.totalEligibleItc.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <p className="text-[10.5px] text-slate-400 mt-1">
                    Reconciled & Eligible vendor tax credits
                  </p>
                </div>

                <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
                  <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block mb-1">
                    Estimated Net GST Payable
                  </span>
                  <span className="text-base font-bold font-mono text-amber-400">
                    ₹{overviewData.gstPosition.estimatedNetGstPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <p className="text-[10.5px] text-slate-400 mt-1">
                    Cash liability to pay in Table 6.1
                  </p>
                </div>

                <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
                  <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block mb-1">
                    ITC Carried Forward
                  </span>
                  <span className="text-base font-bold font-mono text-cyan-400">
                    ₹{overviewData.gstPosition.itcCarriedForward.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <p className="text-[10.5px] text-slate-400 mt-1">
                    Excess ITC available for future set-off
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Row: Cash & Bank Flow + Receivables & Payables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Cash & Bank Flow Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-bold text-slate-900">Cash & Digital Banking Flow</h4>
                  </div>
                  <button
                    onClick={() => { setActiveTab('registers'); setRegisterSubTab('cash'); }}
                    className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Books</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10.5px] font-semibold text-slate-500 block mb-1">Physical Cash In / Out</span>
                    <div className="text-xs font-mono font-bold text-emerald-700">
                      +₹{overviewData.cashFlow.cashReceipts.toFixed(2)}
                    </div>
                    <div className="text-xs font-mono font-bold text-rose-600 mt-0.5">
                      -₹{overviewData.cashFlow.cashDisbursements.toFixed(2)}
                    </div>
                    <p className="text-[10.5px] text-slate-600 font-semibold mt-1 pt-1 border-t border-slate-200">
                      Net: ₹{overviewData.cashFlow.netCashFlow.toFixed(2)}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10.5px] font-semibold text-slate-500 block mb-1">Bank / UPI In / Out</span>
                    <div className="text-xs font-mono font-bold text-emerald-700">
                      +₹{overviewData.cashFlow.bankReceipts.toFixed(2)}
                    </div>
                    <div className="text-xs font-mono font-bold text-rose-600 mt-0.5">
                      -₹{overviewData.cashFlow.bankDisbursements.toFixed(2)}
                    </div>
                    <p className="text-[10.5px] text-slate-600 font-semibold mt-1 pt-1 border-t border-slate-200">
                      Net: ₹{overviewData.cashFlow.netBankFlow.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Outstanding Receivables vs Payables Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-blue-600" />
                    <h4 className="text-xs font-bold text-slate-900">Total Outstanding Ledger Balances</h4>
                  </div>
                  <button
                    onClick={() => { setActiveTab('registers'); setRegisterSubTab('receivables'); }}
                    className="print:hidden text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Ledgers</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                    <span className="text-[10.5px] font-bold text-emerald-800 uppercase block mb-1">Customer Receivables</span>
                    <div className="text-base font-black text-emerald-700 font-mono">
                      ₹{overviewData.balances.totalCustomerReceivables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-[10.5px] text-emerald-600 mt-1">Pending payments from customers</p>
                  </div>

                  <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-100">
                    <span className="text-[10.5px] font-bold text-rose-800 uppercase block mb-1">Supplier Payables</span>
                    <div className="text-base font-black text-rose-700 font-mono">
                      ₹{overviewData.balances.totalSupplierPayables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-[10.5px] text-rose-600 mt-1">Amounts due to suppliers</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: SALES REGISTER & HSN SUMMARY
            ========================================================================= */}
        {!loading && activeTab === 'sales' && salesData && (
          <div className="space-y-5">
            {/* Action & Filter Header */}
            <div className="print:hidden bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* Search */}
                <div className="relative min-w-[200px] flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search invoice, customer, GSTIN..."
                    value={salesSearch}
                    onChange={(e) => setSalesSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadTabContent()}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-slate-400"
                  />
                </div>

                {/* Customer Type Filter */}
                <select
                  value={salesCustomerType}
                  onChange={(e) => setSalesCustomerType(e.target.value)}
                  className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  <option value="ALL">All Buyers</option>
                  <option value="B2B">B2B (With GSTIN)</option>
                  <option value="B2C">B2C (Unregistered)</option>
                </select>

                {/* Tax Rate Filter */}
                <select
                  value={salesTaxRate}
                  onChange={(e) => setSalesTaxRate(e.target.value)}
                  className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  <option value="ALL">All Tax Rates</option>
                  <option value="0">0% (Nil/Exempt)</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>

                <button
                  onClick={loadTabContent}
                  className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Filter
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportSalesCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Sales CSV</span>
                </button>
              </div>
            </div>

            {/* Sales Aggregate Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Invoices</span>
                <span className="text-sm font-bold text-slate-900 font-mono">{salesData.summary.totalInvoices}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Taxable Value</span>
                <span className="text-sm font-bold text-slate-900 font-mono">₹{salesData.summary.taxableValue.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">CGST</span>
                <span className="text-sm font-bold text-slate-900 font-mono">₹{salesData.summary.cgstTotal.toFixed(2)}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">SGST</span>
                <span className="text-sm font-bold text-slate-900 font-mono">₹{salesData.summary.sgstTotal.toFixed(2)}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">IGST</span>
                <span className="text-sm font-bold text-slate-900 font-mono">₹{salesData.summary.igstTotal.toFixed(2)}</span>
              </div>
              <div className="bg-slate-900 text-white p-3 rounded-xl print-surface-light">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Sales</span>
                <span className="text-sm font-bold text-white font-mono">₹{salesData.summary.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Sales Table */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">POS</th>
                      <th className="py-3 px-4 text-right">Taxable</th>
                      <th className="py-3 px-4 text-right">CGST</th>
                      <th className="py-3 px-4 text-right">SGST</th>
                      <th className="py-3 px-4 text-right">IGST</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {salesData.items.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-8 text-center text-slate-400">
                          No sales vouchers found for this period.
                        </td>
                      </tr>
                    ) : (
                      salesData.items.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{item.invoiceNumber}</td>
                          <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">{item.invoiceDate.split('T')[0]}</td>
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-slate-800">{item.customerName}</div>
                            {item.customerGstin && (
                              <div className="text-[10px] font-mono text-slate-400">{item.customerGstin}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              item.customerType === 'B2B' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {item.customerType}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 text-[11px] whitespace-nowrap">{item.placeOfSupply}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-medium">₹{item.subtotal.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-600">₹{item.cgstTotal.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-600">₹{item.sgstTotal.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-600">₹{item.igstTotal.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">₹{item.total.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700'
                                : item.status === 'PARTIAL'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* HSN / SAC Summary Table */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-slate-900">HSN / SAC Summary of Outward Supplies (GSTR-1 Table 12)</h4>
                </div>
                <span className="text-[11px] text-slate-400">{salesData.hsnSummary.length} Unique HSN Groups</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">HSN/SAC</th>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3">UQC</th>
                      <th className="py-2 px-3 text-right">Quantity</th>
                      <th className="py-2 px-3 text-right">Rate</th>
                      <th className="py-2 px-3 text-right">Taxable</th>
                      <th className="py-2 px-3 text-right">CGST</th>
                      <th className="py-2 px-3 text-right">SGST</th>
                      <th className="py-2 px-3 text-right">IGST</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {salesData.hsnSummary.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-4 text-center text-slate-400 font-sans">
                          No HSN records recorded yet.
                        </td>
                      </tr>
                    ) : (
                      salesData.hsnSummary.map((h: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-slate-900">{h.hsnCode}</td>
                          <td className="py-2 px-3 font-sans text-slate-700">{h.description}</td>
                          <td className="py-2 px-3 font-sans text-slate-500">{h.uqc}</td>
                          <td className="py-2 px-3 text-right">{h.totalQuantity.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right">{h.taxRate}%</td>
                          <td className="py-2 px-3 text-right">₹{h.taxableValue.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right">₹{h.cgstAmount.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right">₹{h.sgstAmount.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right">₹{h.igstAmount.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">₹{h.totalValue.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: PURCHASE REGISTER & ITC CLASSIFICATION
            ========================================================= */}
        {!loading && activeTab === 'purchases' && purchaseData && (
          <div className="space-y-5">
            {/* Filter & Action Header */}
            <div className="print:hidden bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative min-w-[200px] flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search purchase #, bill #, vendor, GSTIN..."
                    value={purchaseSearch}
                    onChange={(e) => setPurchaseSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadTabContent()}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-slate-400"
                  />
                </div>

                {/* ITC Classification Filter */}
                <select
                  value={purchaseItcEligibility}
                  onChange={(e) => setPurchaseItcEligibility(e.target.value)}
                  className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  <option value="ALL">All ITC Types</option>
                  <option value="ELIGIBLE">Eligible ITC</option>
                  <option value="INELIGIBLE">Ineligible</option>
                  <option value="BLOCKED_SEC_17_5">Blocked (Sec 17(5))</option>
                  <option value="CAPITAL_GOODS">Capital Goods</option>
                  <option value="PENDING_VERIFICATION">Pending Verification</option>
                  <option value="RECONCILED">Reconciled</option>
                </select>

                {/* Status Filter */}
                <select
                  value={purchaseStatus}
                  onChange={(e) => setPurchaseStatus(e.target.value)}
                  className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  <option value="ALL">All Status</option>
                  <option value="RECEIVED">Received</option>
                  <option value="DRAFT">Draft</option>
                </select>

                <button
                  onClick={loadTabContent}
                  className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Filter
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPurchaseCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Purchase CSV</span>
                </button>
              </div>
            </div>

            {/* Purchase Aggregate Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Purchases</span>
                <span className="text-sm font-bold text-slate-900 font-mono">{purchaseData.summary.totalPurchases}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Taxable Procurement</span>
                <span className="text-sm font-bold text-slate-900 font-mono">₹{purchaseData.summary.taxableValue.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Tax</span>
                <span className="text-sm font-bold text-slate-900 font-mono">₹{purchaseData.summary.taxTotal.toFixed(2)}</span>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <span className="text-[10px] text-emerald-700 font-bold uppercase block">Eligible ITC</span>
                <span className="text-sm font-bold text-emerald-800 font-mono">₹{purchaseData.summary.eligibleItcTotal.toFixed(2)}</span>
              </div>
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
                <span className="text-[10px] text-rose-700 font-bold uppercase block">Ineligible/Blocked</span>
                <span className="text-sm font-bold text-rose-800 font-mono">₹{purchaseData.summary.ineligibleItcTotal.toFixed(2)}</span>
              </div>
              <div className="bg-slate-900 text-white p-3 rounded-xl print-surface-light">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Grand Total</span>
                <span className="text-sm font-bold text-white font-mono">₹{purchaseData.summary.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Purchase Register Table */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">PO #</th>
                      <th className="py-3 px-4">Vendor Bill #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Supplier</th>
                      <th className="py-3 px-4">ITC Classification</th>
                      <th className="py-3 px-4 text-right">Taxable</th>
                      <th className="py-3 px-4 text-right">CGST</th>
                      <th className="py-3 px-4 text-right">SGST</th>
                      <th className="py-3 px-4 text-right">IGST</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 text-center">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {purchaseData.items.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-8 text-center text-slate-400">
                          No purchase bills found for this period.
                        </td>
                      </tr>
                    ) : (
                      purchaseData.items.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{item.purchaseNumber}</td>
                          <td className="py-2.5 px-4 font-mono text-slate-600">{item.supplierInvoiceNumber || '—'}</td>
                          <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">{item.purchaseDate.split('T')[0]}</td>
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-slate-800">{item.supplierName}</div>
                            {item.supplierGstin && (
                              <div className="text-[10px] font-mono text-slate-400">{item.supplierGstin}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              item.itcEligibility === 'ELIGIBLE' || item.itcEligibility === 'RECONCILED'
                                ? 'bg-emerald-50 text-emerald-700'
                                : item.itcEligibility === 'BLOCKED_SEC_17_5' || item.itcEligibility === 'INELIGIBLE'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}>
                              {item.itcEligibility}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono">₹{item.subtotal.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-600">₹{item.cgstTotal.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-600">₹{item.sgstTotal.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-600">₹{item.igstTotal.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">₹{item.total.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.paymentStatus === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700'
                                : item.paymentStatus === 'PARTIAL'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {item.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: GST RETURNS (GSTR-1 & GSTR-3B)
            ========================================================================= */}
        {!loading && activeTab === 'gst' && (
          <div className="space-y-6">
            {/* Sub-tab Toggle & Return Month Selector */}
            <div className="print:hidden flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setGstSubTab('gstr1')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      gstSubTab === 'gstr1' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    GSTR-1 (Outward Supplies)
                  </button>
                  <button
                    onClick={() => setGstSubTab('gstr3b')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      gstSubTab === 'gstr3b' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    GSTR-3B (Monthly Summary)
                  </button>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500">Return Month:</span>
                  <select
                    value={gstMonth}
                    onChange={(e) => {
                      setGstMonth(e.target.value);
                      if (periodType === 'MONTH') setPeriodValue(e.target.value);
                    }}
                    className="bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden cursor-pointer"
                  >
                    {INDIAN_MONTH_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label} {resolveCalendarYearForMonth(financialYear, m.value)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {gstSubTab === 'gstr1' ? (
                  <>
                    <button
                      onClick={handleDownloadGstr1Json}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                      title="Download official JSON format for GST portal offline tool"
                    >
                      <FileJson className="w-3.5 h-3.5" />
                      <span>Download GSTR-1 JSON</span>
                    </button>
                    <button
                      onClick={handleDownloadGstr1Csv}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>GSTR-1 CSV</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleDownloadGstr3bJson}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                      title="Official GST Portal format accepted by offline utility"
                    >
                      <FileJson className="w-3.5 h-3.5" />
                      <span>Download GSTR-3B JSON</span>
                    </button>
                    <button
                      onClick={handleDownloadGstr3bCsv}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>GSTR-3B CSV</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* GSTR-1 View */}
            {gstSubTab === 'gstr1' && gstr1Data && (
              <div className="space-y-5">
                {/* Summary Banner */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Filing Period</span>
                    <span className="text-sm font-bold text-slate-900 font-mono">{gstr1Data.fp}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">B2B Invoices</span>
                    <span className="text-sm font-bold text-emerald-600 font-mono">{gstr1Data.summary.b2bCount} Bills</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">B2C Supplies</span>
                    <span className="text-sm font-bold text-blue-600 font-mono">{gstr1Data.summary.b2cCount} Bills</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Taxable Turnover</span>
                    <span className="text-sm font-bold text-slate-900 font-mono">₹{gstr1Data.summary.totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Table 4: B2B Invoices */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center justify-between">
                    <span>Table 4: B2B Supplies (Outward taxable supplies to registered persons)</span>
                    <span className="text-[11px] text-slate-400">{gstr1Data.b2b.length} Recipients</span>
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Recipient GSTIN</th>
                          <th className="py-2 px-3">Receiver Name</th>
                          <th className="py-2 px-3">Invoice #</th>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">POS</th>
                          <th className="py-2 px-3 text-right">Invoice Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {gstr1Data.b2b.length === 0 ? (
                          <tr><td colSpan={6} className="py-4 text-center text-slate-400">No B2B invoices in this period.</td></tr>
                        ) : (
                          gstr1Data.b2b.flatMap((r: any) =>
                            r.inv.map((inv: any, idx: number) => (
                              <tr key={`${r.ctin}_${inv.inum}_${idx}`} className="hover:bg-slate-50">
                                <td className="py-2 px-3 font-mono font-bold text-slate-900">{r.ctin}</td>
                                <td className="py-2 px-3 text-slate-700">{r.cpty}</td>
                                <td className="py-2 px-3 font-mono">{inv.inum}</td>
                                <td className="py-2 px-3 text-slate-500">{inv.idt}</td>
                                <td className="py-2 px-3 text-slate-600">{inv.pos}</td>
                                <td className="py-2 px-3 text-right font-mono font-bold">₹{inv.val.toFixed(2)}</td>
                              </tr>
                            ))
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Table 7: B2CS Summary */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-900">
                    Table 7: B2CS (Supplies to unregistered persons - aggregated by rate & POS)
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Supply Type</th>
                          <th className="py-2 px-3">Place Of Supply</th>
                          <th className="py-2 px-3 text-right">Tax Rate</th>
                          <th className="py-2 px-3 text-right">Taxable Value</th>
                          <th className="py-2 px-3 text-right">CGST</th>
                          <th className="py-2 px-3 text-right">SGST</th>
                          <th className="py-2 px-3 text-right">IGST</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {gstr1Data.b2cs.length === 0 ? (
                          <tr><td colSpan={7} className="py-4 text-center text-slate-400 font-sans">No B2CS transactions in this period.</td></tr>
                        ) : (
                          gstr1Data.b2cs.map((b: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-sans font-semibold">{b.sply_ty}</td>
                              <td className="py-2 px-3">{b.pos}</td>
                              <td className="py-2 px-3 text-right">{b.rt}%</td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900">₹{b.txval.toFixed(2)}</td>
                              <td className="py-2 px-3 text-right">₹{b.camt.toFixed(2)}</td>
                              <td className="py-2 px-3 text-right">₹{b.samt.toFixed(2)}</td>
                              <td className="py-2 px-3 text-right">₹{b.iamt.toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Table 5: B2CL (Inter-state Large > 2.5L) */}
                {(gstr1Data.b2cl?.length || 0) > 0 && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <h4 className="text-xs font-bold text-slate-900">
                      Table 5: B2CL (Inter-State B2C Large Invoices &gt; ₹2,50,000)
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-[10px]">
                          <tr>
                            <th className="py-2 px-3">Place of Supply</th>
                            <th className="py-2 px-3">Invoice #</th>
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3 text-right">Invoice Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          {gstr1Data.b2cl.flatMap((entry: any) =>
                            entry.inv.map((inv: any, idx: number) => (
                              <tr key={`${entry.pos}_${inv.inum}_${idx}`} className="hover:bg-slate-50">
                                <td className="py-2 px-3">{entry.pos}</td>
                                <td className="py-2 px-3 font-bold text-slate-900">{inv.inum}</td>
                                <td className="py-2 px-3 text-slate-500">{inv.idt}</td>
                                <td className="py-2 px-3 text-right font-bold">₹{inv.val.toFixed(2)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Table 9B: Credit / Debit Notes (CDNR) */}
                {(gstr1Data.cdnr?.length || 0) > 0 && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <h4 className="text-xs font-bold text-slate-900">
                      Table 9B: Credit &amp; Debit Notes (Registered Persons)
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-[10px]">
                          <tr>
                            <th className="py-2 px-3">Party GSTIN</th>
                            <th className="py-2 px-3">Note #</th>
                            <th className="py-2 px-3">Type</th>
                            <th className="py-2 px-3">Note Date</th>
                            <th className="py-2 px-3">Orig Invoice</th>
                            <th className="py-2 px-3 text-right">Note Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          {gstr1Data.cdnr.flatMap((party: any) =>
                            party.nt.map((nt: any, idx: number) => (
                              <tr key={`${party.ctin}_${nt.nt_num}_${idx}`} className="hover:bg-slate-50">
                                <td className="py-2 px-3 font-bold text-slate-900">{party.ctin}</td>
                                <td className="py-2 px-3">{nt.nt_num}</td>
                                <td className="py-2 px-3 font-sans">{nt.ntty === 'C' ? 'Credit Note' : 'Debit Note'}</td>
                                <td className="py-2 px-3 text-slate-500">{nt.nt_dt}</td>
                                <td className="py-2 px-3">{nt.inum}</td>
                                <td className="py-2 px-3 text-right font-bold">₹{nt.val.toFixed(2)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Table 12: HSN-wise Summary of Outward Supplies */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center justify-between">
                    <span>Table 12: HSN-wise Summary of Outward Supplies</span>
                    <span className="text-[11px] text-slate-400">{gstr1Data.hsn?.data?.length || 0} HSN Codes</span>
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase text-[10px]">
                        <tr>
                          <th className="py-2 px-3">HSN</th>
                          <th className="py-2 px-3">Description</th>
                          <th className="py-2 px-3">UQC</th>
                          <th className="py-2 px-3 text-right">Total Qty</th>
                          <th className="py-2 px-3 text-right">Taxable Value</th>
                          <th className="py-2 px-3 text-right">IGST</th>
                          <th className="py-2 px-3 text-right">CGST</th>
                          <th className="py-2 px-3 text-right">SGST</th>
                          <th className="py-2 px-3 text-right">Total Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {!gstr1Data.hsn?.data?.length ? (
                          <tr><td colSpan={9} className="py-4 text-center text-slate-400 font-sans">No HSN summary rows in this period.</td></tr>
                        ) : (
                          gstr1Data.hsn.data.map((h: any, idx: number) => (
                            <tr key={`${h.hsn_sc}_${idx}`} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-bold text-slate-900">{h.hsn_sc}</td>
                              <td className="py-2 px-3 font-sans text-slate-700">{h.desc || '—'}</td>
                              <td className="py-2 px-3">{h.uqc}</td>
                              <td className="py-2 px-3 text-right">{h.qty}</td>
                              <td className="py-2 px-3 text-right">₹{Number(h.txval || 0).toFixed(2)}</td>
                              <td className="py-2 px-3 text-right">₹{Number(h.iamt || 0).toFixed(2)}</td>
                              <td className="py-2 px-3 text-right">₹{Number(h.camt || 0).toFixed(2)}</td>
                              <td className="py-2 px-3 text-right">₹{Number(h.samt || 0).toFixed(2)}</td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900">₹{Number(h.val || 0).toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Table 13: Documents Issued */}
                {(gstr1Data.doc_issue?.doc_det?.length || 0) > 0 && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <h4 className="text-xs font-bold text-slate-900">
                      Table 13: Documents Issued Summary
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-[10px]">
                          <tr>
                            <th className="py-2 px-3">Nature of Document</th>
                            <th className="py-2 px-3">Sr. No. From</th>
                            <th className="py-2 px-3">Sr. No. To</th>
                            <th className="py-2 px-3 text-right">Total Number</th>
                            <th className="py-2 px-3 text-right">Cancelled</th>
                            <th className="py-2 px-3 text-right">Net Issued</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          {gstr1Data.doc_issue.doc_det.flatMap((d: any) =>
                            d.docs.map((doc: any, idx: number) => (
                              <tr key={`${d.doc_num}_${idx}`} className="hover:bg-slate-50">
                                <td className="py-2 px-3 font-sans font-semibold text-slate-800">{d.doc_typ}</td>
                                <td className="py-2 px-3">{doc.from}</td>
                                <td className="py-2 px-3">{doc.to}</td>
                                <td className="py-2 px-3 text-right">{doc.totnum}</td>
                                <td className="py-2 px-3 text-right text-rose-600">{doc.canc}</td>
                                <td className="py-2 px-3 text-right font-bold text-slate-900">{doc.net_issue}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* GSTR-3B View */}
            {gstSubTab === 'gstr3b' && gstr3bData && (
              <div className="space-y-5">
                {/* Summary Banner */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Return Period</span>
                    <span className="text-sm font-bold text-slate-900 font-mono">{gstr3bData.ret_period}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">GSTIN</span>
                    <span className="text-sm font-bold text-slate-900 font-mono">{gstr3bData.gstin || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Gross Turnover</span>
                    <span className="text-sm font-bold text-slate-900 font-mono">
                      ₹{Number(gstr3bData.filing_metadata?.grossTurnover || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Net GST Payable</span>
                    <span className="text-sm font-bold text-orange-700 font-mono">
                      ₹{Number(gstr3bData.filing_metadata?.netGstPayable?.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                {/* Table 3.1 Outward Liability */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-900">
                    Table 3.1: Details of Outward Supplies & Inward Supplies liable to Reverse Charge
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Nature of Supplies</th>
                          <th className="py-2.5 px-3 text-right">Total Taxable</th>
                          <th className="py-2.5 px-3 text-right">IGST</th>
                          <th className="py-2.5 px-3 text-right">CGST</th>
                          <th className="py-2.5 px-3 text-right">SGST</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-xs">
                        <tr>
                          <td className="py-2.5 px-3 font-sans font-medium text-slate-800">
                            (a) Outward taxable supplies (other than zero rated, nil, exempt)
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            ₹{(gstr3bData.sup_details?.osup_det?.txval || 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right">₹{(gstr3bData.sup_details?.osup_det?.iamt || 0).toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right">₹{(gstr3bData.sup_details?.osup_det?.camt || 0).toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right">₹{(gstr3bData.sup_details?.osup_det?.samt || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-sans font-medium text-slate-800">
                            (b) Outward taxable supplies (zero rated)
                          </td>
                          <td className="py-2.5 px-3 text-right">₹0.00</td>
                          <td className="py-2.5 px-3 text-right">₹0.00</td>
                          <td className="py-2.5 px-3 text-right">₹0.00</td>
                          <td className="py-2.5 px-3 text-right">₹0.00</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-sans font-medium text-slate-800">
                            (d) Inward supplies liable to reverse charge
                          </td>
                          <td className="py-2.5 px-3 text-right">₹0.00</td>
                          <td className="py-2.5 px-3 text-right">₹0.00</td>
                          <td className="py-2.5 px-3 text-right">₹0.00</td>
                          <td className="py-2.5 px-3 text-right">₹0.00</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Table 4 Eligible ITC */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-900">
                    Table 4: Eligible Input Tax Credit (ITC)
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Details</th>
                          <th className="py-2.5 px-3 text-right">IGST</th>
                          <th className="py-2.5 px-3 text-right">CGST</th>
                          <th className="py-2.5 px-3 text-right">SGST</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-xs">
                        <tr className="bg-emerald-50/40">
                          <td className="py-2.5 px-3 font-sans font-bold text-emerald-900">
                            (A) (5) All other ITC (Received Purchases & Services)
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                            ₹{(gstr3bData.itc_elg?.itc_net?.iamt || 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                            ₹{(gstr3bData.itc_elg?.itc_net?.camt || 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                            ₹{(gstr3bData.itc_elg?.itc_net?.samt || 0).toFixed(2)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-sans font-medium text-slate-800">
                            (B) ITC Reversed (Section 17(5) / Rule 42/43)
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-400">₹0.00</td>
                          <td className="py-2.5 px-3 text-right text-slate-400">₹0.00</td>
                          <td className="py-2.5 px-3 text-right text-slate-400">₹0.00</td>
                        </tr>
                        <tr className="bg-slate-900 text-white font-bold print-surface-light">
                          <td className="py-2.5 px-3 font-sans text-white">
                            (C) Net ITC Available (A - B)
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-400">
                            ₹{(gstr3bData.itc_elg?.itc_net?.iamt || 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-400">
                            ₹{(gstr3bData.itc_elg?.itc_net?.camt || 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-400">
                            ₹{(gstr3bData.itc_elg?.itc_net?.samt || 0).toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Table 3.2: Inter-state supplies to unregistered persons (when present) */}
                {(gstr3bData.inter_sup?.unreg_details?.length || 0) > 0 && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <h4 className="text-xs font-bold text-slate-900">
                      Table 3.2: Inter-State Supplies Made to Unregistered Persons
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-[10px]">
                          <tr>
                            <th className="py-2 px-3">Place of Supply (State Code)</th>
                            <th className="py-2 px-3 text-right">Total Taxable Value</th>
                            <th className="py-2 px-3 text-right">Amount of Integrated Tax (IGST)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-xs">
                          {gstr3bData.inter_sup.unreg_details.map((row: any, idx: number) => (
                            <tr key={`${row.pos}_${idx}`}>
                              <td className="py-2 px-3 font-semibold">{row.pos}</td>
                              <td className="py-2 px-3 text-right">₹{Number(row.txval || 0).toFixed(2)}</td>
                              <td className="py-2 px-3 text-right font-bold">₹{Number(row.iamt || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Table 6.1: Payment of Tax (Net GST Payable Summary) */}
                {gstr3bData.filing_metadata?.netGstPayable && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <h4 className="text-xs font-bold text-slate-900">
                      Table 6.1: Payment of Tax — Net GST Cash Liability After Eligible ITC
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">Tax Head</th>
                            <th className="py-2.5 px-3 text-right">Output Liability</th>
                            <th className="py-2.5 px-3 text-right">Eligible ITC Credit</th>
                            <th className="py-2.5 px-3 text-right">Net Payable in Cash</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-xs">
                          <tr>
                            <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">IGST</td>
                            <td className="py-2.5 px-3 text-right">₹{(gstr3bData.sup_details?.osup_det?.iamt || 0).toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right text-emerald-700">₹{(gstr3bData.itc_elg?.itc_net?.iamt || 0).toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹{(gstr3bData.filing_metadata.netGstPayable.igst || 0).toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">CGST</td>
                            <td className="py-2.5 px-3 text-right">₹{(gstr3bData.sup_details?.osup_det?.camt || 0).toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right text-emerald-700">₹{(gstr3bData.itc_elg?.itc_net?.camt || 0).toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹{(gstr3bData.filing_metadata.netGstPayable.cgst || 0).toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">SGST / UTGST</td>
                            <td className="py-2.5 px-3 text-right">₹{(gstr3bData.sup_details?.osup_det?.samt || 0).toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right text-emerald-700">₹{(gstr3bData.itc_elg?.itc_net?.samt || 0).toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹{(gstr3bData.filing_metadata.netGstPayable.sgst || 0).toFixed(2)}</td>
                          </tr>
                          <tr className="bg-orange-50/70 font-bold">
                            <td className="py-2.5 px-3 font-sans text-orange-950">Total Net Tax Payable</td>
                            <td colSpan={2} className="py-2.5 px-3" />
                            <td className="py-2.5 px-3 text-right text-orange-800">
                              ₹{(gstr3bData.filing_metadata.netGstPayable.total || 0).toFixed(2)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 5: GSTR-2B IMPORT & RECONCILIATION
            ========================================================================= */}
        {!loading && activeTab === 'reconciliation' && (
          <div className="space-y-6">
            {/* Upload & Reconcile Banner */}
            <div className="print:hidden bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">GSTR-2B Automated ITC Reconciler</h3>
                  <p className="text-xs text-slate-500">
                    Upload official GSTN GSTR-2B JSON (from gst.gov.in) to verify vendor filings, detect missing bills, and secure eligible ITC.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleUploadGstr2b}
                  accept=".json,.csv"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading2b}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploading2b ? 'Reconciling...' : 'Upload GSTR-2B JSON'}</span>
                </button>
                <button
                  onClick={handleRunDemoReconciliation}
                  disabled={uploading2b}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  title="Test with realistic demo GSTR-2B invoices"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Run Demo Reconcile</span>
                </button>
                {reconciliationData && (
                  <button
                    onClick={handleExportReconciliationCsv}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                )}
              </div>
            </div>

            {/* Saved Recent GSTR-2B Reconciliation Runs */}
            {recentImports2b.length > 0 && (
              <div className="print:hidden bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900">
                    Saved GSTR-2B Reconciliation Runs ({recentImports2b.length})
                  </h4>
                  <span className="text-[11px] text-slate-400">Click a saved import to view details</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {recentImports2b.map((imp: any) => (
                    <button
                      key={imp.id}
                      type="button"
                      onClick={() => void handleLoadSavedImport(imp.id)}
                      className="text-left p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 font-mono">
                          Period {imp.returnPeriod} ({imp.financialYear})
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {imp.matchedCount}/{imp.totalInvoices} Matched
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 truncate">
                        {imp.sourceFileName || 'GSTR-2B Import'} · Mismatches: {imp.mismatchCount}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reconciliation KPI Cards */}
            {reconciliationData && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* Matched */}
                  <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80">
                    <div className="flex items-center justify-between text-emerald-800 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Matched & Safe ITC</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-xl font-black text-emerald-900 font-mono">
                      {reconciliationData.summary.matchedCount} Bills
                    </div>
                    <p className="text-[11px] text-emerald-700 mt-1 font-semibold font-mono">
                      ₹{reconciliationData.summary.reconciledItc.toFixed(2)} ITC
                    </p>
                  </div>

                  {/* Tax Mismatch */}
                  <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80">
                    <div className="flex items-center justify-between text-amber-800 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Tax Mismatch</span>
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="text-xl font-black text-amber-900 font-mono">
                      {reconciliationData.summary.mismatchCount} Bills
                    </div>
                    <p className="text-[11px] text-amber-700 mt-1">Amount differences found</p>
                  </div>

                  {/* Missing in 2B (At-Risk) */}
                  <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200/80">
                    <div className="flex items-center justify-between text-rose-800 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Missing in GSTR-2B</span>
                      <XCircle className="w-4 h-4 text-rose-600" />
                    </div>
                    <div className="text-xl font-black text-rose-900 font-mono">
                      {reconciliationData.summary.missingIn2bCount} Bills
                    </div>
                    <p className="text-[11px] text-rose-700 mt-1 font-semibold font-mono">
                      ₹{reconciliationData.summary.atRiskItc.toFixed(2)} At-Risk ITC
                    </p>
                  </div>

                  {/* Missing in Books */}
                  <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200/80">
                    <div className="flex items-center justify-between text-blue-800 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Missing in Books</span>
                      <HelpCircle className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-xl font-black text-blue-900 font-mono">
                      {reconciliationData.summary.missingInPurchasesCount} Bills
                    </div>
                    <p className="text-[11px] text-blue-700 mt-1 font-semibold font-mono">
                      ₹{reconciliationData.summary.unclaimedItc.toFixed(2)} Extra ITC
                    </p>
                  </div>
                </div>

                {/* Reconciliation Comparison Table */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">
                      Detailed 2-Way Invoice Comparison Matrix
                    </h4>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      {reconciliationData.summary.matchPercentage}% Match Rate
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/70 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Supplier GSTIN</th>
                          <th className="py-3 px-4">Supplier Name</th>
                          <th className="py-3 px-4">Invoice #</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4 text-right">Books Tax</th>
                          <th className="py-3 px-4 text-right">GSTR-2B Tax</th>
                          <th className="py-3 px-4 text-right">Variance</th>
                          <th className="py-3 px-4">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reconciliationData.rows.map((row: any, idx: number) => {
                          const isMatched = row.status === 'MATCHED';
                          const isMismatch = row.status === 'MISMATCH_TAX';
                          const isMissing2b = row.status === 'MISSING_IN_2B';

                          return (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2.5 px-4">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  isMatched
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isMismatch
                                    ? 'bg-amber-100 text-amber-800'
                                    : isMissing2b
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {row.status.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{row.supplierGstin}</td>
                              <td className="py-2.5 px-4 text-slate-800 font-medium">{row.supplierName}</td>
                              <td className="py-2.5 px-4 font-mono">{row.invoiceNumber}</td>
                              <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">{row.invoiceDate}</td>
                              <td className="py-2.5 px-4 text-right font-mono">
                                {row.booksTax !== undefined ? `₹${row.booksTax.toFixed(2)}` : '—'}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono">
                                {row.gstr2bTax !== undefined ? `₹${row.gstr2bTax.toFixed(2)}` : '—'}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold">
                                {row.taxDifference ? `₹${row.taxDifference.toFixed(2)}` : '0.00'}
                              </td>
                              <td className="py-2.5 px-4 text-slate-600 text-[11px]">{row.notes}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 6: FINANCIAL BOOKS & PROFIT & LOSS
            Cash Book | Bank Book | Expense Register | Customer Outstanding | Supplier Payable | P&L
            ========================================================================= */}
        {!loading && activeTab === 'registers' && registersData && (
          <div className="space-y-5">
            {/* Sub-tab Navigation */}
            <div className="print:hidden flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                {[
                  { id: 'cash', label: 'Cash Book' },
                  { id: 'bank', label: 'Bank Book' },
                  { id: 'expenses', label: 'Expense Register' },
                  { id: 'receivables', label: 'Customer Outstanding' },
                  { id: 'payables', label: 'Supplier Payable' },
                  { id: 'pnl', label: 'Profit & Loss (P&L)' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setRegisterSubTab(s.id as RegisterSubTab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      registerSubTab === s.id ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handleExportFinancialRegisterCsv(registerSubTab)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export {registerSubTab.toUpperCase()} CSV</span>
              </button>
            </div>

            {/* Sub-Tab Content: Cash Book */}
            {registerSubTab === 'cash' && (
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-4 p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Physical Cash Book Ledger</h4>
                    <p className="text-[11px] text-slate-500">Chronological record of all physical cash receipts and disbursements.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Closing Cash Balance</span>
                    <span className="text-base font-black text-slate-900 font-mono">
                      ₹{registersData.cashBook.closingBalance.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Particulars</th>
                        <th className="py-2.5 px-3">Voucher Type</th>
                        <th className="py-2.5 px-3">Ref No</th>
                        <th className="py-2.5 px-3 text-right">Cash In (+)</th>
                        <th className="py-2.5 px-3 text-right">Cash Out (-)</th>
                        <th className="py-2.5 px-3 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {registersData.cashBook.transactions.length === 0 ? (
                        <tr><td colSpan={7} className="py-6 text-center text-slate-400 font-sans">No cash transactions in this period.</td></tr>
                      ) : (
                        registersData.cashBook.transactions.map((t: any) => (
                          <tr key={t.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 text-slate-500">{t.date.split('T')[0]}</td>
                            <td className="py-2.5 px-3 font-sans font-medium text-slate-900">{t.partyName}</td>
                            <td className="py-2.5 px-3 font-sans text-slate-500 text-[10px]">{t.voucherType.replace(/_/g, ' ')}</td>
                            <td className="py-2.5 px-3 text-slate-500">{t.referenceNumber || '—'}</td>
                            <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">
                              {t.amountIn > 0 ? `+₹${t.amountIn.toFixed(2)}` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right text-rose-600 font-bold">
                              {t.amountOut > 0 ? `-₹${t.amountOut.toFixed(2)}` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹{t.runningBalance.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sub-Tab Content: Bank Book */}
            {registerSubTab === 'bank' && (
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-4 p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Digital Banking & UPI Book</h4>
                    <p className="text-[11px] text-slate-500">Record of all bank transfers, UPI transactions, and cheques.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Closing Bank Balance</span>
                    <span className="text-base font-black text-slate-900 font-mono">
                      ₹{registersData.bankBook.closingBalance.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Particulars</th>
                        <th className="py-2.5 px-3">Payment Mode</th>
                        <th className="py-2.5 px-3">Ref No</th>
                        <th className="py-2.5 px-3 text-right">Bank In (+)</th>
                        <th className="py-2.5 px-3 text-right">Bank Out (-)</th>
                        <th className="py-2.5 px-3 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {registersData.bankBook.transactions.length === 0 ? (
                        <tr><td colSpan={7} className="py-6 text-center text-slate-400 font-sans">No digital banking transactions in this period.</td></tr>
                      ) : (
                        registersData.bankBook.transactions.map((t: any) => (
                          <tr key={t.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 text-slate-500">{t.date.split('T')[0]}</td>
                            <td className="py-2.5 px-3 font-sans font-medium text-slate-900">{t.partyName}</td>
                            <td className="py-2.5 px-3 font-sans text-slate-600">{t.paymentMethod}</td>
                            <td className="py-2.5 px-3 text-slate-500">{t.referenceNumber || '—'}</td>
                            <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">
                              {t.amountIn > 0 ? `+₹${t.amountIn.toFixed(2)}` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right text-rose-600 font-bold">
                              {t.amountOut > 0 ? `-₹${t.amountOut.toFixed(2)}` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹{t.runningBalance.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sub-Tab Content: Profit & Loss */}
            {registerSubTab === 'pnl' && registersData.profitability && (
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
                <div className="border-b border-slate-200 pb-4">
                  <h3 className="text-sm font-bold text-slate-900">Profit & Loss Statement (Operating Accounts)</h3>
                  <p className="text-xs text-slate-500">
                    Constructed strictly from verified sales vouchers, received purchase invoices, and recorded operating expenses.
                  </p>
                </div>

                <div className="space-y-4 max-w-3xl">
                  {/* Revenue */}
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-800">Operating Revenue (Taxable Turnover)</span>
                    <span className="text-sm font-mono font-bold text-slate-900">₹{registersData.profitability.revenue.toFixed(2)}</span>
                  </div>

                  {/* COGS */}
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-800">Direct Cost of Goods Sold (Procurement)</span>
                    <span className="text-sm font-mono text-rose-600">-₹{registersData.profitability.directCost.toFixed(2)}</span>
                  </div>

                  {/* Gross Profit */}
                  <div className="flex items-center justify-between py-2.5 bg-slate-50 px-3 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-900">GROSS PROFIT</span>
                    <div className="text-right">
                      <span className="text-sm font-mono font-black text-emerald-700">₹{registersData.profitability.grossProfit.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-500 block">Margin: {registersData.profitability.grossMarginPercent}%</span>
                    </div>
                  </div>

                  {/* Operating Expenses */}
                  <div className="pt-2">
                    <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Operating Expenses by Category</h5>
                    <div className="space-y-1.5 pl-3 border-l-2 border-slate-200">
                      {Object.entries(registersData.expenses.categoryBreakdown).map(([cat, amt]: any) => (
                        <div key={cat} className="flex items-center justify-between text-xs py-1">
                          <span className="text-slate-600">{cat}</span>
                          <span className="font-mono text-slate-800">₹{amt.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between py-2 mt-2 border-t border-slate-100">
                      <span className="text-xs font-semibold text-slate-800">Total Operating Overheads</span>
                      <span className="text-sm font-mono text-rose-600">-₹{registersData.profitability.operatingExpenses.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Net Profit */}
                  <div className="flex items-center justify-between py-3 bg-slate-900 text-white px-4 rounded-xl print-surface-light">
                    <span className="text-xs font-bold">ESTIMATED NET OPERATING PROFIT</span>
                    <div className="text-right">
                      <span className={`text-base font-mono font-black ${registersData.profitability.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ₹{registersData.profitability.netProfit.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">Net Margin: {registersData.profitability.netMarginPercent}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Tab Content: Customer Outstanding */}
            {registerSubTab === 'receivables' && (
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden p-5 space-y-4">
                <h4 className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-100">
                  Customer Outstanding Receivables Ledger
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Customer Name</th>
                        <th className="py-2.5 px-3">Mobile</th>
                        <th className="py-2.5 px-3">GSTIN</th>
                        <th className="py-2.5 px-3 text-right">Opening Bal</th>
                        <th className="py-2.5 px-3 text-right">Billed Total</th>
                        <th className="py-2.5 px-3 text-right">Collections</th>
                        <th className="py-2.5 px-3 text-right">Outstanding Due</th>
                        <th className="py-2.5 px-3 text-center">Unpaid Bills</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {registersData.customerOutstanding.length === 0 ? (
                        <tr><td colSpan={8} className="py-6 text-center text-slate-400 font-sans">No customer balances found.</td></tr>
                      ) : (
                        registersData.customerOutstanding.map((c: any) => (
                          <tr key={c.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-sans font-bold text-slate-900">{c.name}</td>
                            <td className="py-2.5 px-3 text-slate-600">{c.mobile}</td>
                            <td className="py-2.5 px-3 text-slate-400">{c.gstin || '—'}</td>
                            <td className="py-2.5 px-3 text-right">₹{c.openingBalance.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right font-medium text-slate-800">₹{c.billedTotal.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right text-emerald-600">₹{c.paidTotal.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-rose-600">₹{c.currentOutstanding.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-center font-sans">
                              <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[10px] font-bold">
                                {c.unpaidInvoicesCount}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sub-Tab Content: Supplier Payable */}
            {registerSubTab === 'payables' && (
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden p-5 space-y-4">
                <h4 className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-100">
                  Supplier Payable Ledger
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Supplier Name</th>
                        <th className="py-2.5 px-3">Phone</th>
                        <th className="py-2.5 px-3">GSTIN</th>
                        <th className="py-2.5 px-3 text-right">Opening Bal</th>
                        <th className="py-2.5 px-3 text-right">Purchases Total</th>
                        <th className="py-2.5 px-3 text-right">Paid Total</th>
                        <th className="py-2.5 px-3 text-right">Amount Payable</th>
                        <th className="py-2.5 px-3 text-center">Unpaid Bills</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {registersData.supplierPayable.length === 0 ? (
                        <tr><td colSpan={8} className="py-6 text-center text-slate-400 font-sans">No supplier payables recorded.</td></tr>
                      ) : (
                        registersData.supplierPayable.map((s: any) => (
                          <tr key={s.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-sans font-bold text-slate-900">{s.name}</td>
                            <td className="py-2.5 px-3 text-slate-600">{s.phone}</td>
                            <td className="py-2.5 px-3 text-slate-400">{s.gstin || '—'}</td>
                            <td className="py-2.5 px-3 text-right">₹{s.openingBalance.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right font-medium text-slate-800">₹{s.purchasesTotal.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right text-emerald-600">₹{s.paidTotal.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-rose-600">₹{s.currentPayable.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-center font-sans">
                              <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[10px] font-bold">
                                {s.unpaidPurchasesCount}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sub-Tab Content: Expense Register */}
            {registerSubTab === 'expenses' && (
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="text-xs font-bold text-slate-900">Operating Expenses Register</h4>
                  <span className="text-xs font-bold text-slate-900 font-mono">
                    Total: ₹{registersData.expenses.totalAmount.toFixed(2)}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Payee</th>
                        <th className="py-2.5 px-3">Payment Method</th>
                        <th className="py-2.5 px-3">Ref No</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                        <th className="py-2.5 px-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {registersData.expenses.items.length === 0 ? (
                        <tr><td colSpan={7} className="py-6 text-center text-slate-400">No expense records found.</td></tr>
                      ) : (
                        registersData.expenses.items.map((e: any) => (
                          <tr key={e.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono text-slate-500">{e.expenseDate.split('T')[0]}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">{e.category}</td>
                            <td className="py-2.5 px-3 text-slate-700">{e.payee}</td>
                            <td className="py-2.5 px-3 text-slate-500">{e.paymentMethod}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-400">{e.referenceNumber || '—'}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">₹{e.amount.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-slate-500">{e.notes || '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
        {/* =========================================================================
            TAB 7: PERSONAL KHATA CONSOLIDATED REPORT & EXCEL / PDF EXPORTS
            ========================================================================= */}
        {activeTab === 'khata' && (
          <KhataConsolidatedReportView
            backHref="/free-khata"
            backLabel="Open Personal Khata"
          />
        )}

        {activeTab !== 'khata' && <ReportPrintFooter />}
      </div>
    </ModulePageShell>
  );
}
