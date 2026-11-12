'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Printer,
  ChevronRight,
} from 'lucide-react';

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerMobile: string;
  invoiceDate: string;
  dueDate?: string;
  total: number;
  balanceDue: number;
  status: string;
}

interface ApiInvoiceRow {
  id: string;
  invoiceNumber: string;
  customerName?: string | null;
  customer?: { name?: string | null; mobile?: string | null } | null;
  customerMobile?: string | null;
  invoiceDate: string;
  dueDate?: string;
  total: number;
  balanceDue: number;
  status: string;
}

interface RecentTransactionsTableProps {
  onViewInvoice?: (invoice: InvoiceRow) => void;
}

export function RecentTransactionsTable(props: RecentTransactionsTableProps) {
  void props.onViewInvoice;
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL');

  useEffect(() => {
    let active = true;
    fetch('/api/invoices')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        if (data?.success && Array.isArray(data.invoices) && data.invoices.length > 0) {
          const rows = data.invoices as ApiInvoiceRow[];
          const mapped: InvoiceRow[] = rows.map((inv) => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            customerName: inv.customerName || inv.customer?.name || 'Walk-in Customer',
            customerMobile: inv.customerMobile || inv.customer?.mobile || '',
            invoiceDate: inv.invoiceDate,
            dueDate: inv.dueDate,
            total: inv.total,
            balanceDue: inv.balanceDue,
            status: inv.status,
          }));
          setInvoices(mapped);
        } else {
          setInvoices([]);
        }
      })
      .catch(() => {
        if (!active) return;
        setInvoices([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filtered = invoices.filter((inv) => {
    if (filter === 'PAID') return inv.status === 'PAID';
    if (filter === 'UNPAID') return inv.status !== 'PAID' && inv.status !== 'CANCELLED';
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-[#00B887] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            <CheckCircle2 className="w-3 h-3 text-[#00B887]" />
            Paid
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            <Clock className="w-3 h-3 text-amber-600" />
            Partial
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            Overdue
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            Void
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-[#071F38] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
            <Clock className="w-3 h-3 text-slate-500" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="p-3.5 sm:p-4.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-6.5 h-6.5 rounded-lg bg-teal-50 text-[#008F91] border border-teal-100 flex items-center justify-center shrink-0">
              <FileText className="w-3.5 h-3.5 text-[#008F91]" />
            </div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#071F38]">
              Recent Transactions
            </h3>
          </div>
          <p className="text-[10.5px] sm:text-[11px] text-slate-400 mt-0.5">
            Latest customer billing records and settlements
          </p>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          {/* Filter tabs */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold text-slate-600">
            {(['ALL', 'UNPAID', 'PAID'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`px-2 sm:px-2.5 py-1 rounded-md text-[10.5px] sm:text-[11px] transition-all cursor-pointer ${
                  filter === tab
                    ? 'bg-white text-[#071F38] shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab === 'ALL' ? 'All' : tab === 'UNPAID' ? 'Pending' : 'Settled'}
              </button>
            ))}
          </div>

          <Link
            href="/invoices"
            className="text-xs font-bold text-[#071F38] hover:text-[#00B887] flex items-center gap-0.5 px-2 py-1 rounded hover:bg-slate-50 transition-colors shrink-0"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {loading && (
        <div className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-slate-50 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="p-8 text-center text-slate-400 text-xs">
          <p className="font-medium text-slate-500">No transactions found for this filter.</p>
          <p className="text-[11px] mt-1">Create a new bill to start recording transactions.</p>
        </div>
      )}

      {/* MOBILE-FIRST VIEW: Touch-friendly card rows (block md:hidden) */}
      {!loading && filtered.length > 0 && (
        <div className="block md:hidden divide-y divide-slate-100">
          {filtered.slice(0, 6).map((inv) => (
            <Link
              key={inv.id}
              href={`/invoices/${inv.id}`}
              className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 active:bg-slate-100/70 transition-colors block"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-[#071F38] flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                  {inv.customerName ? inv.customerName.charAt(0).toUpperCase() : 'C'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-xs text-[#071F38] truncate block max-w-[140px] xs:max-w-[180px]">
                      {inv.customerName}
                    </span>
                    {getStatusBadge(inv.status)}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10.5px] text-slate-400 mt-0.5">
                    <span className="font-mono text-slate-600 font-semibold">{inv.invoiceNumber}</span>
                    <span>•</span>
                    <span>{inv.invoiceDate ? inv.invoiceDate.split('T')[0] : 'Today'}</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs xs:text-sm font-black text-[#071F38] tabular-nums block">
                  ₹{Number(inv.total).toLocaleString('en-IN')}
                </span>
                {inv.balanceDue > 0 ? (
                  <span className="text-[10px] font-bold text-amber-700 block tabular-nums">
                    ₹{Number(inv.balanceDue).toLocaleString('en-IN')} due
                  </span>
                ) : (
                  <span className="text-[10px] text-[#00B887] font-semibold block">Settled</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* DESKTOP VIEW: Full multi-column table (hidden md:block) */}
      {!loading && filtered.length > 0 && (
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-4">Invoice #</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
                <th className="py-2.5 px-4 text-right">Balance Due</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.slice(0, 7).map((inv) => (
                <tr
                  key={inv.id}
                  className="hover:bg-slate-50/80 transition-colors group"
                >
                  <td className="py-3 px-4 font-mono font-bold text-[#071F38]">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="hover:text-[#00B887] hover:underline"
                    >
                      {inv.invoiceNumber}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-900 block truncate max-w-[160px]">
                      {inv.customerName}
                    </span>
                    {inv.customerMobile && (
                      <span className="text-[10px] text-slate-400 font-mono block">
                        {inv.customerMobile}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                    {inv.invoiceDate ? inv.invoiceDate.split('T')[0] : '—'}
                  </td>
                  <td className="py-3 px-3">
                    {getStatusBadge(inv.status)}
                  </td>
                  <td className="py-3 px-4 text-right font-black text-[#071F38] tabular-nums">
                    ₹{Number(inv.total).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    {inv.balanceDue > 0 ? (
                      <span className="font-bold text-amber-700">
                        ₹{Number(inv.balanceDue).toLocaleString('en-IN')}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium">₹0</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="p-1.5 text-slate-500 hover:text-[#071F38] hover:bg-slate-100 rounded-lg transition-colors"
                        title="View bill"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      <Link
                        href={`/invoices/${inv.id}/print`}
                        className="p-1.5 text-slate-500 hover:text-[#00B887] hover:bg-slate-100 rounded-lg transition-colors"
                        title="Print invoice"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
