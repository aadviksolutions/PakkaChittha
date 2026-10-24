'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  PlusCircle,
  Printer,
  ArrowRight,
  AlertCircle,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  Send,
  CheckCheck,
  RefreshCw,
  Share2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface QuotationListItem {
  id: string;
  quotationNumber: string;
  quotationDate: string;
  validUntil: string;
  customerName: string;
  customerMobile: string;
  total: number;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED' | 'EXPIRED';
  convertedInvoiceId?: string | null;
  customer: {
    id: string;
    name: string;
    mobile: string;
  };
  items: Array<{ id: string; description: string; quantity: number; lineTotal: number }>;
}

export default function QuotationsPage() {
  const { activeBusiness } = useAuth();
  const { toast } = useToast();
  const [quotations, setQuotations] = useState<QuotationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const res = await fetch(`/api/quotations?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setQuotations(data.quotations);
      } else {
        throw new Error(data.error || 'Failed to fetch quotations');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error loading quotations');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, toast]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const handleConvertToInvoice = async (id: string, quotationNumber: string) => {
    if (!confirm(`Convert Quotation ${quotationNumber} into a billable tax invoice?`)) return;

    try {
      setConvertingId(id);
      const res = await fetch(`/api/quotations/${id}/convert`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to convert quotation');
      }

      toast.success(data.message || 'Quotation converted successfully!');
      fetchQuotations();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Conversion failed');
    } finally {
      setConvertingId(null);
    }
  };

  const getStatusBadge = (status: QuotationListItem['status']) => {
    switch (status) {
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            <CheckCheck className="w-3 h-3 text-emerald-600" />
            Accepted
          </span>
        );
      case 'CONVERTED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3 text-blue-600" />
            Invoiced
          </span>
        );
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
            <Send className="w-3 h-3 text-indigo-600" />
            Sent
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
            Rejected
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
            Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3 text-amber-600" />
            Draft
          </span>
        );
    }
  };

  const totalValue = quotations.reduce((acc, q) => acc + q.total, 0);
  const acceptedValue = quotations.filter((q) => q.status === 'ACCEPTED' || q.status === 'CONVERTED').reduce((acc, q) => acc + q.total, 0);
  const pendingCount = quotations.filter((q) => q.status === 'DRAFT' || q.status === 'SENT').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Quotations &amp; Estimates
            </h1>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              All Plans
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Create professional price estimates, proposals, print or share with customers, and convert them to invoices upon acceptance.
          </p>
        </div>

        <Link
          href="/quotations/new"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all shrink-0 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-emerald-400" />
          <span>+ Create Quotation</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Quotes</p>
          <p className="text-lg sm:text-2xl font-black text-slate-900 mt-1">{quotations.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Accepted / Converted</p>
          <p className="text-lg sm:text-2xl font-black text-emerald-700 mt-1">₹{acceptedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{quotations.filter((q) => q.status === 'ACCEPTED' || q.status === 'CONVERTED').length} quotations</p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Pending Follow-up</p>
          <p className="text-lg sm:text-2xl font-black text-amber-700 mt-1">{pendingCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Drafts or sent quotes</p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Conversion Rate</p>
          <p className="text-lg sm:text-2xl font-black text-blue-700 mt-1">
            {quotations.length > 0 ? `${Math.round((quotations.filter((q) => q.status === 'CONVERTED').length / quotations.length) * 100)}%` : '0%'}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Turned into paid invoices</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by quote # or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['ALL', 'DRAFT', 'SENT', 'ACCEPTED', 'CONVERTED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Status' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Quotations List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
            Loading quotations...
          </div>
        ) : quotations.length === 0 ? (
          <div className="p-10 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-800">No quotations found</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Create and issue detailed quotations with item descriptions, taxes, and branding to pitch to customers before billing.
            </p>
            <Link
              href="/quotations/new"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-slate-800 transition-all cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Create First Quotation</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Quote #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Valid Until</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <Link href={`/quotations/${q.id}`} className="hover:text-emerald-700 hover:underline">
                        {q.quotationNumber}
                      </Link>
                    </td>

                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {new Date(q.quotationDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{q.customerName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{q.customerMobile}</div>
                    </td>

                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {new Date(q.validUntil).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      ₹{q.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {getStatusBadge(q.status)}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          href={`/quotations/${q.id}/print`}
                          target="_blank"
                          className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          title="Print Quotation"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </Link>

                        {q.status !== 'CONVERTED' ? (
                          <button
                            type="button"
                            onClick={() => handleConvertToInvoice(q.id, q.quotationNumber)}
                            disabled={convertingId === q.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            title="Convert to Bill / Invoice"
                          >
                            <span>Convert to Invoice</span>
                          </button>
                        ) : (
                          <Link
                            href={`/invoices/${q.convertedInvoiceId}`}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-800 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <span>View Bill</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}

                        <Link
                          href={`/quotations/${q.id}`}
                          className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
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
    </div>
  );
}
