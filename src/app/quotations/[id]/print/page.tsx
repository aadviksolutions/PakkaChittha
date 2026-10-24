import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireTenantAccess } from '@/lib/auth/guards';
import { getQuotationById } from '@/lib/services/quotationService';
import { amountToWordsIndian } from '@/lib/billing/numberToWords';
import { ArrowLeft } from 'lucide-react';
import { PrintButton } from '@/app/invoices/[id]/print/PrintButton';

export const dynamic = 'force-dynamic';

export default async function QuotationPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let authContext;
  try {
    authContext = await requireTenantAccess();
  } catch {
    redirect('/login');
  }

  const { id } = await params;
  const quotation = await getQuotationById(authContext.business.id, id);

  if (!quotation) {
    notFound();
  }

  const amountInWords = amountToWordsIndian(quotation.total);
  const effectiveLogo = quotation.businessLogoUrl || quotation.business?.logoUrl;

  return (
    <div className="min-h-screen bg-slate-100 py-6 sm:py-8 px-2 sm:px-4 print:p-0 print:bg-white text-slate-900 font-sans">
      {/* Top action toolbar (hidden during print) */}
      <div className="max-w-4xl mx-auto mb-4 flex items-center justify-between no-print px-2">
        <Link
          href={`/quotations/${quotation.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Quotation</span>
        </Link>

        <div className="flex items-center gap-2">
          <PrintButton />
        </div>
      </div>

      {/* A4 Document Container */}
      <div className="max-w-4xl mx-auto bg-white border border-slate-200/90 shadow-lg rounded-xl print:shadow-none print:border-none print:rounded-none p-8 sm:p-10 relative overflow-hidden">
        {/* Header & Client Business Details */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-5 border-b-2 border-slate-900">
          <div>
            <div className="flex items-center gap-3">
              {effectiveLogo ? (
                <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                  <img
                    src={effectiveLogo}
                    alt={quotation.businessName}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-tight border border-slate-800 shrink-0">
                  {quotation.businessName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  {quotation.businessName}
                </h1>
                {quotation.businessGstin && (
                  <p className="text-xs font-mono font-semibold text-slate-600">
                    GSTIN: {quotation.businessGstin}
                  </p>
                )}
              </div>
            </div>

            {quotation.businessAddress && (
              <p className="text-xs text-slate-600 mt-2 max-w-sm whitespace-pre-line leading-relaxed">
                {quotation.businessAddress}
              </p>
            )}
          </div>

          <div className="sm:text-right">
            <span className="inline-block bg-slate-900 text-white font-mono font-bold text-xs px-3 py-1 rounded-sm uppercase tracking-wider mb-2">
              ESTIMATE / QUOTATION
            </span>
            <div className="space-y-1 text-xs">
              <p>
                <span className="text-slate-500">Quote #: </span>
                <span className="font-mono font-bold text-slate-900">{quotation.quotationNumber}</span>
              </p>
              <p>
                <span className="text-slate-500">Date: </span>
                <span className="font-medium text-slate-800">
                  {new Date(quotation.quotationDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </p>
              <p>
                <span className="text-slate-500">Valid Until: </span>
                <span className="font-medium text-slate-800">
                  {new Date(quotation.validUntil).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Customer Details */}
        <div className="py-4 my-2 border-b border-slate-200 flex flex-col sm:flex-row justify-between gap-4 text-xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quotation Prepared For:</p>
            <p className="font-bold text-sm text-slate-900 mt-0.5">{quotation.customerName}</p>
            <p className="text-slate-600 font-mono mt-0.5">Phone: {quotation.customerMobile}</p>
            {quotation.customerBillingAddress && (
              <p className="text-slate-500 mt-1 max-w-xs whitespace-pre-line leading-relaxed">
                {quotation.customerBillingAddress}
              </p>
            )}
            {quotation.customerGstin && (
              <p className="font-mono text-slate-600 mt-1 font-semibold">
                GSTIN: {quotation.customerGstin}
              </p>
            )}
          </div>

          <div className="sm:text-right text-xs text-slate-500">
            <p className="font-semibold text-slate-700">Tax Type: {quotation.gstType}</p>
            <p className="mt-1">Status: {quotation.status}</p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mt-4">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b-2 border-slate-800 text-[10px] uppercase font-bold text-slate-600">
                <th className="py-2.5 px-2">#</th>
                <th className="py-2.5 px-2">Item Description</th>
                <th className="py-2.5 px-2 text-right">Qty</th>
                <th className="py-2.5 px-2 text-right">Unit Rate</th>
                <th className="py-2.5 px-2 text-right">Discount</th>
                <th className="py-2.5 px-2 text-right">GST %</th>
                <th className="py-2.5 px-2 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {quotation.items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="py-2.5 px-2 text-slate-400">{idx + 1}</td>
                  <td className="py-2.5 px-2">
                    <p className="font-semibold text-slate-900">{item.description}</p>
                    {item.hsnCode && <p className="text-[10px] font-mono text-slate-500">HSN: {item.hsnCode}</p>}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono">₹{item.rate.toFixed(2)}</td>
                  <td className="py-2.5 px-2 text-right font-mono">₹{item.discount.toFixed(2)}</td>
                  <td className="py-2.5 px-2 text-right font-mono">{item.taxRate}%</td>
                  <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                    ₹{item.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Breakdown */}
        <div className="mt-6 pt-4 border-t-2 border-slate-800 flex flex-col sm:flex-row justify-between items-start gap-6">
          <div className="w-full sm:w-1/2 space-y-3 text-xs">
            <div>
              <p className="font-bold text-slate-700">Amount in Words:</p>
              <p className="italic text-slate-600 mt-0.5 capitalize">{amountInWords} Only</p>
            </div>

            {quotation.termsAndConditions && (
              <div className="pt-2">
                <p className="font-bold text-slate-700">Terms &amp; Conditions:</p>
                <p className="text-[11px] text-slate-500 whitespace-pre-line mt-0.5 leading-relaxed">
                  {quotation.termsAndConditions}
                </p>
              </div>
            )}
          </div>

          <div className="w-full sm:w-64 space-y-1.5 text-xs text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal:</span>
              <span className="font-mono">₹{quotation.subtotal.toFixed(2)}</span>
            </div>
            {quotation.discountTotal > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount:</span>
                <span className="font-mono">-₹{quotation.discountTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Tax Total:</span>
              <span className="font-mono">₹{quotation.taxTotal.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-slate-900 flex justify-between font-black text-sm text-slate-900">
              <span>Grand Total:</span>
              <span className="font-mono text-base">
                ₹{quotation.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="mt-12 pt-8 flex justify-between items-end text-xs text-slate-500">
          <div>
            <p>Customer Acceptance Signature</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-slate-800">For {quotation.businessName}</p>
            <p className="mt-8 text-slate-400">Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
}
