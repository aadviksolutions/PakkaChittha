'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  FileText,
  ArrowLeft,
  Printer,
  Share2,
  CheckCheck,
  CheckCircle2,
  Send,
  Trash2,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Building,
  Calendar,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface QuotationDetail {
  id: string;
  quotationNumber: string;
  quotationDate: string;
  validUntil: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED' | 'EXPIRED';
  convertedInvoiceId?: string | null;
  gstType: string;
  isTaxInclusive: boolean;
  isGstInvoice: boolean;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  total: number;
  customerName: string;
  customerMobile: string;
  customerGstin?: string | null;
  customerBillingAddress?: string | null;
  businessName: string;
  businessGstin?: string | null;
  businessAddress?: string | null;
  businessLogoUrl?: string | null;
  notes?: string | null;
  termsAndConditions?: string | null;
  customer: {
    id: string;
    name: string;
    mobile: string;
    email?: string | null;
  };
  business: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
  };
  items: Array<{
    id: string;
    description: string;
    hsnCode?: string | null;
    quantity: number;
    unit: string;
    rate: number;
    discount: number;
    taxRate: number;
    lineTotal: number;
    product?: {
      id: string;
      name: string;
      imageUrl?: string | null;
    } | null;
  }>;
}

export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { activeBusiness } = useAuth();
  const { toast } = useToast();

  const id = params?.id as string;
  const [quotation, setQuotation] = useState<QuotationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchQuotation = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/quotations/${id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setQuotation(data.quotation);
      } else {
        throw new Error(data.error || 'Failed to fetch quotation details');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error fetching quotation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchQuotation();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      setUpdatingStatus(true);
      const res = await fetch(`/api/quotations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update status');
      }
      toast.success(`Status updated to ${newStatus}`);
      fetchQuotation();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!quotation) return;
    if (!confirm(`Convert Quotation ${quotation.quotationNumber} into a commercial tax invoice?`)) return;

    try {
      setConverting(true);
      const res = await fetch(`/api/quotations/${id}/convert`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to convert quotation');
      }

      toast.success(data.message || 'Quotation converted successfully!');
      router.push(`/invoices/${data.invoice.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Conversion failed');
    } finally {
      setConverting(false);
    }
  };

  const handleWhatsAppShare = () => {
    if (!quotation) return;
    const phone = quotation.customerMobile.replace(/\D/g, '').slice(-10);
    const text = encodeURIComponent(
      `Hello ${quotation.customerName},\n\nHere is your quotation *${quotation.quotationNumber}* from *${quotation.businessName}* for *₹${quotation.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}*.\n\nValidity: Until ${new Date(quotation.validUntil).toLocaleDateString('en-IN')}.\n\nPlease let us know if you would like to proceed with this order.\n\nThank you!`
    );
    window.open(`https://wa.me/91${phone}?text=${text}`, '_blank');
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this quotation?')) return;
    try {
      const res = await fetch(`/api/quotations/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete quotation');
      }
      toast.success('Quotation deleted successfully.');
      router.push('/quotations');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
        Loading quotation details...
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="p-10 text-center">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <p className="text-sm font-bold text-slate-800">Quotation not found</p>
        <Link href="/quotations" className="mt-3 inline-block text-xs text-emerald-700 font-bold hover:underline">
          &larr; Back to Quotations List
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/quotations"
            className="p-1.5 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {quotation.quotationNumber}
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border bg-slate-100 text-slate-700 border-slate-200">
                {quotation.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Issued on {new Date(quotation.quotationDate).toLocaleDateString('en-IN')} &bull; Valid until {new Date(quotation.validUntil).toLocaleDateString('en-IN')}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {quotation.status !== 'CONVERTED' ? (
            <button
              type="button"
              onClick={handleConvertToInvoice}
              disabled={converting}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{converting ? 'Converting...' : 'Convert to Invoice'}</span>
            </button>
          ) : (
            <Link
              href={`/invoices/${quotation.convertedInvoiceId}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold rounded-xl hover:bg-blue-100 transition-all"
            >
              <span>View Generated Invoice</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}

          <Link
            href={`/quotations/${quotation.id}/print`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-2xs transition-all"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print / PDF</span>
          </Link>

          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-emerald-600" />
            <span>Share</span>
          </button>

          {quotation.status !== 'CONVERTED' && (
            <button
              type="button"
              onClick={handleDelete}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              title="Delete Quotation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Status Transition Pill Bar */}
      {quotation.status !== 'CONVERTED' && (
        <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
          <span className="font-bold text-slate-600">Update Status:</span>
          {['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'].map((st) => (
            <button
              key={st}
              disabled={updatingStatus || quotation.status === st}
              onClick={() => handleStatusChange(st)}
              className={`px-2.5 py-1 font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
                quotation.status === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      )}

      {/* Official Quotation Document Preview */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-lg p-6 sm:p-8 space-y-6">
        {/* Business Header & Logo */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-5 border-b border-slate-200">
          <div>
            {quotation.businessLogoUrl ? (
              <img
                src={quotation.businessLogoUrl}
                alt={quotation.businessName}
                className="h-12 w-auto object-contain mb-2"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm mb-2">
                {quotation.businessName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <h2 className="text-lg font-black text-slate-900">{quotation.businessName}</h2>
            {quotation.businessAddress && (
              <p className="text-xs text-slate-500 whitespace-pre-line mt-0.5">{quotation.businessAddress}</p>
            )}
            {quotation.businessGstin && (
              <p className="text-xs font-mono text-slate-600 mt-0.5">GSTIN: {quotation.businessGstin}</p>
            )}
          </div>

          <div className="sm:text-right">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">PRICE QUOTATION</span>
            <p className="text-xl font-black font-mono text-slate-900 mt-0.5">{quotation.quotationNumber}</p>
            <p className="text-xs text-slate-500 mt-1">Date: {new Date(quotation.quotationDate).toLocaleDateString('en-IN')}</p>
            <p className="text-xs text-slate-500">Valid Until: {new Date(quotation.validUntil).toLocaleDateString('en-IN')}</p>
          </div>
        </div>

        {/* Bill To / Customer Snapshot */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quotation For:</span>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{quotation.customerName}</p>
            <p className="font-mono text-slate-600 mt-0.5">{quotation.customerMobile}</p>
            {quotation.customerBillingAddress && (
              <p className="text-slate-500 mt-1 whitespace-pre-line">{quotation.customerBillingAddress}</p>
            )}
            {quotation.customerGstin && (
              <p className="font-mono text-slate-600 mt-1">GSTIN: {quotation.customerGstin}</p>
            )}
          </div>

          <div className="sm:text-right flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Estimate</span>
              <p className="text-2xl font-black font-mono text-slate-900 mt-0.5">
                ₹{quotation.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <p className="text-[11px] text-slate-500">Tax Type: {quotation.gstType}</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                <th className="py-2.5 px-3 text-right">Rate</th>
                <th className="py-2.5 px-3 text-right">Discount</th>
                <th className="py-2.5 px-3 text-right">GST %</th>
                <th className="py-2.5 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {quotation.items.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3 text-slate-400">{idx + 1}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      {item.product?.imageUrl && (
                        <img
                          src={item.product.imageUrl}
                          alt={item.description}
                          className="w-8 h-8 rounded-md object-cover border border-slate-200 shrink-0"
                        />
                      )}
                      <div>
                        <p className="font-bold text-slate-900">{item.description}</p>
                        {item.hsnCode && <p className="text-[10px] font-mono text-slate-400">HSN: {item.hsnCode}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">₹{item.rate.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right font-mono">₹{item.discount.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right font-mono">{item.taxRate}%</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                    ₹{item.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-4 border-t border-slate-200">
          <div className="w-full sm:w-1/2 space-y-3 text-xs">
            {quotation.notes && (
              <div>
                <span className="font-bold text-slate-700 block mb-0.5">Notes:</span>
                <p className="text-slate-600 whitespace-pre-line bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {quotation.notes}
                </p>
              </div>
            )}
            {quotation.termsAndConditions && (
              <div>
                <span className="font-bold text-slate-700 block mb-0.5">Terms &amp; Conditions:</span>
                <p className="text-slate-600 whitespace-pre-line bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {quotation.termsAndConditions}
                </p>
              </div>
            )}
          </div>

          <div className="w-full sm:w-72 space-y-1.5 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-mono">₹{quotation.subtotal.toFixed(2)}</span>
            </div>
            {quotation.discountTotal > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount:</span>
                <span className="font-mono">-₹{quotation.discountTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>GST Total:</span>
              <span className="font-mono">₹{quotation.taxTotal.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-sm">
              <span>Grand Total:</span>
              <span className="font-mono text-base font-black">
                ₹{quotation.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
