'use client';

import React, { useState, useEffect } from 'react';
import { ModulePageShell } from '@/components/shared/ModulePageShell';
import { useToast } from '@/context/ToastContext';
import { useEntitlements } from '@/hooks/useEntitlements';
import { FeatureNotAvailable } from '@/components/shared/FeatureNotAvailable';
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
} from 'lucide-react';

interface ReportSummary {
  totalSalesTurnover: number;
  taxableSalesValue: number;
  totalSalesTax: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalPaidCollections: number;
  totalUdhaarDue: number;
  totalProcurement: number;
  taxableProcurement: number;
  totalItcTax: number;
  netGstPayable: number;
  totalOverheads: number;
  grossProfit: number;
  netProfit: number;
  invoiceCount: number;
  purchaseCount: number;
  expenseCount: number;
}

interface SalesItem {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerGstin?: string | null;
  subtotal: number;
  taxTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  total: number;
  paidAmount: number;
  balanceDue: number;
  status: string;
}

export default function ReportsPage() {
  const toast = useToast();
  const { isAllowed } = useEntitlements();
  const canAdvancedReports = isAllowed('canAdvancedReports');

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [salesRegister, setSalesRegister] = useState<SalesItem[]>([]);

  // Period Selector for GSTR-3B (Initialized with static defaults for Next.js 16 partial prerender)
  const [selectedMonth, setSelectedMonth] = useState<string>('10');
  const [selectedYear, setSelectedYear] = useState<string>('2026');

  useEffect(() => {
    if (!canAdvancedReports) return;
    const now = new Date();
    setSelectedMonth(String(now.getMonth() + 1));
    setSelectedYear(String(now.getFullYear()));
    fetchReportData();
  }, [canAdvancedReports]);

  const fetchReportData = async () => {
    if (!canAdvancedReports) return;
    try {
      setLoading(true);
      const res = await fetch('/api/reports/summary');
      if (!res.ok) throw new Error('Failed to fetch reporting analytics');
      const data = await res.json();
      setSummary(data.summary);
      setSalesRegister(data.salesRegister || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error loading reports');
    } finally {
      setLoading(false);
    }
  };

  const exportSalesCsv = () => {
    if (!salesRegister.length) {
      toast.error('No sales data available to export');
      return;
    }

    const headers = [
      'Invoice Number',
      'Date',
      'Customer Name',
      'Customer GSTIN',
      'Taxable Value',
      'CGST',
      'SGST',
      'IGST',
      'Total Amount',
      'Paid Amount',
      'Balance Due',
      'Status',
    ];

    const rows = salesRegister.map((s) => [
      `"${s.invoiceNumber}"`,
      `"${new Date(s.invoiceDate).toISOString().split('T')[0]}"`,
      `"${s.customerName.replace(/"/g, '""')}"`,
      `"${s.customerGstin || ''}"`,
      s.subtotal.toFixed(2),
      s.cgstTotal.toFixed(2),
      s.sgstTotal.toFixed(2),
      s.igstTotal.toFixed(2),
      s.total.toFixed(2),
      s.paidAmount.toFixed(2),
      s.balanceDue.toFixed(2),
      `"${s.status}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `pakka_chittha_sales_register_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Sales Register CSV exported successfully!');
  };

  const exportJsonReport = () => {
    if (!summary) return;
    const reportPayload = {
      generatedAt: new Date().toISOString(),
      summary,
      salesRegister,
    };
    const blob = new Blob([JSON.stringify(reportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `pakka_chittha_audit_report_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Complete Business Audit JSON exported successfully!');
  };

  const exportGstr3bJson = () => {
    const url = `/api/reports/gstr3b?month=${selectedMonth}&year=${selectedYear}&download=true`;
    window.open(url, '_blank');
    toast.success('Official GSTN GSTR-3B JSON downloaded for portal upload!');
  };

  const exportGstr3bCsv = () => {
    const url = `/api/reports/gstr3b?month=${selectedMonth}&year=${selectedYear}&format=csv&download=true`;
    window.open(url, '_blank');
    toast.success('GSTR-3B Filing Summary CSV downloaded successfully!');
  };

  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const years = [2025, 2026, 2027, 2028];

  if (!canAdvancedReports) {
    return (
      <FeatureNotAvailable
        featureName="Advanced Reports & GST Tax Intelligence"
        requiredPlanName="Growth or Scale"
        description="Official GSTR-3B portal JSON exports, input tax credit (ITC) reconciliation, and advanced profit analytics require a Pakka Chittha Growth or Scale subscription."
      />
    );
  }

  return (
    <ModulePageShell
      title="Business Reports & GST Filing"
      description="Aggregated financial intelligence: GSTR-1 outward tax liability, GSTR-3B portal JSON exports, input tax credit (ITC), gross margin, and net profit."
      targetPhase="Financial Intelligence"
    >
      <div className="space-y-6">
        {/* Export Action Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-900">Live Financial Ledger & GST Exporter</p>
              <p className="text-[11px] text-slate-500">
                GSTN-compliant return exports with verified sales registers and ITC reconciliation.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={exportGstr3bJson}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
              title="Official GST Portal format accepted by offline utility"
            >
              <FileJson className="w-3.5 h-3.5" />
              <span>GSTR-3B JSON</span>
            </button>
            <button
              onClick={exportSalesCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Sales CSV</span>
            </button>
            <button
              onClick={exportJsonReport}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Audit JSON</span>
            </button>
          </div>
        </div>

        {/* Core KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Total Sales Turnover
            </span>
            <span className="text-lg font-black text-slate-900 font-mono tabular-nums">
              ₹{(summary?.totalSalesTurnover || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">
              Across {summary?.invoiceCount || 0} active tax vouchers
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Procurement & ITC
            </span>
            <span className="text-lg font-black text-slate-900 font-mono tabular-nums">
              ₹{(summary?.totalProcurement || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <p className="text-[11px] text-emerald-600 mt-1 font-medium font-mono">
              ITC: ₹{(summary?.totalItcTax || 0).toFixed(2)}
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Recorded Overheads
            </span>
            <span className="text-lg font-black text-slate-900 font-mono tabular-nums">
              ₹{(summary?.totalOverheads || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">
              {summary?.expenseCount || 0} operational expense entries
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Estimated Net Profit
            </span>
            <span
              className={`text-lg font-black font-mono tabular-nums ${
                (summary?.netProfit || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              ₹{(summary?.netProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">
              Gross: ₹{(summary?.grossProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Official GSTR-3B Filing Exporter & Liability Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <h3 className="font-bold text-sm text-slate-900">
                  Official GSTR-3B Portal Exporter & Return Filing
                </h3>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  GSTN Spec
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Exports Table 3.1 Outward supplies, Table 3.2 Inter-State, Table 4 ITC, and Net Tax for direct upload to <strong>gst.gov.in</strong>.
              </p>
            </div>

            {/* Period Selector Controls */}
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 shrink-0">
              <Calendar className="w-4 h-4 text-slate-500 ml-1.5" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer py-1"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer py-1 pr-1"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Row & Net Liability */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 to-slate-800 p-4 rounded-xl text-white">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                Net GST Cash Liability (After ITC Setoff)
              </span>
              <span className="text-xl font-mono font-black text-emerald-400 tabular-nums">
                ₹{(summary?.netGstPayable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-slate-300 ml-2">
                (Output GST ₹{(summary?.totalSalesTax || 0).toFixed(2)} − Purchase ITC ₹{(summary?.totalItcTax || 0).toFixed(2)})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportGstr3bJson}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
              >
                <FileJson className="w-3.5 h-3.5" />
                <span>Download GSTR-3B JSON</span>
              </button>
              <button
                onClick={exportGstr3bCsv}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Download GSTR-3B Excel/CSV</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Table 3.1 Central Tax (CGST)</span>
              <span className="text-sm font-extrabold text-slate-900 font-mono mt-0.5 block tabular-nums">
                ₹{(summary?.totalCgst || 0).toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500">Intra-State Central</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Table 3.1 State Tax (SGST)</span>
              <span className="text-sm font-extrabold text-slate-900 font-mono mt-0.5 block tabular-nums">
                ₹{(summary?.totalSgst || 0).toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500">Intra-State State</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Table 3.1 Integrated Tax (IGST)</span>
              <span className="text-sm font-extrabold text-slate-900 font-mono mt-0.5 block tabular-nums">
                ₹{(summary?.totalIgst || 0).toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500">Inter-State Supply</span>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Table 4 Eligible ITC</span>
              <span className="text-sm font-extrabold text-emerald-900 font-mono mt-0.5 block tabular-nums">
                ₹{(summary?.totalItcTax || 0).toFixed(2)}
              </span>
              <span className="text-[10px] text-emerald-700">All Other Inward ITC</span>
            </div>
          </div>
        </div>

        {/* Outward Sales Register Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="font-bold text-sm text-slate-900">Outward Supply Register (Sales Register)</span>
            <span className="text-xs text-slate-500 font-mono">
              Outstanding Udhaar: ₹{(summary?.totalUdhaarDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4 text-right">Taxable (₹)</th>
                  <th className="py-3 px-4 text-right">GST Total (₹)</th>
                  <th className="py-3 px-4 text-right">Invoice Total (₹)</th>
                  <th className="py-3 px-4 text-right">Balance Due (₹)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Computing financial metrics...
                    </td>
                  </tr>
                ) : salesRegister.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      No invoices recorded yet. Create invoices to generate your sales register.
                    </td>
                  </tr>
                ) : (
                  salesRegister.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {new Date(inv.invoiceDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        <div>{inv.customerName}</div>
                        {inv.customerGstin && (
                          <div className="text-[10px] font-mono text-slate-400">GST: {inv.customerGstin}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700 tabular-nums">
                        ₹{inv.subtotal.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700 tabular-nums">
                        ₹{inv.taxTotal.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                        ₹{inv.total.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-amber-700">
                        {inv.balanceDue > 0 ? `₹${inv.balanceDue.toFixed(2)}` : '₹0.00'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : inv.status === 'PARTIAL'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {inv.status}
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
    </ModulePageShell>
  );
}
