import React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { verifyShareToken } from '@/lib/whatsapp/shareTokens';
import { amountToWordsIndian } from '@/lib/billing/numberToWords';
import { generateUpiQrDataUrl } from '@/lib/billing/upiQr';
import { AlertCircle, ShieldCheck, Smartphone } from 'lucide-react';
import { PrintButton } from '@/app/invoices/[id]/print/PrintButton';

export const dynamic = 'force-dynamic';

export default async function PublicInvoiceViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="min-h-screen bg-[#fcfbf9] flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 shadow-sm text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
          <h1 className="text-base font-bold text-slate-900">Missing Access Token</h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            This invoice document requires a secure authorization link shared via WhatsApp or SMS.
          </p>
        </div>
      </div>
    );
  }

  // Lookup invoice to retrieve business identity
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      business: true,
      items: true,
      payments: true,
    },
  });

  if (!invoice) {
    notFound();
  }

  // Cryptographically verify token signature, tenant ID, and expiration
  const tokenResult = verifyShareToken(token, 'INVOICE', id, invoice.businessId);

  if (!tokenResult.isValid) {
    return (
      <div className="min-h-screen bg-[#fcfbf9] flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white border border-rose-200 rounded-xl p-8 shadow-sm text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
          <h1 className="text-base font-bold text-slate-900">Document Access Denied</h1>
          <p className="text-xs text-rose-600 font-semibold">{tokenResult.error}</p>
          <p className="text-xs text-slate-500 leading-relaxed mt-2">
            The link may have expired or is invalid. Please request an updated share link from{' '}
            <strong>{invoice.businessName}</strong>.
          </p>
        </div>
      </div>
    );
  }

  const amountInWords = amountToWordsIndian(invoice.total);
  const isCancelled = invoice.status === 'CANCELLED';

  const bizMonogram = invoice.businessName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  let upiQrDataUrl: string | null = null;
  if (invoice.business?.bankUpiId && invoice.balanceDue > 0 && !isCancelled) {
    try {
      upiQrDataUrl = await generateUpiQrDataUrl({
        upiId: invoice.business.bankUpiId,
        payeeName: invoice.businessName,
        amount: invoice.balanceDue,
        invoiceNumber: invoice.invoiceNumber,
      });
    } catch (qrErr) {
      console.warn('Failed to generate UPI QR code:', qrErr);
    }
  }

  const effectiveLogo = invoice.businessLogoUrl || invoice.business?.logoUrl;

  return (
    <div className="min-h-screen bg-slate-100 py-6 sm:py-8 px-2 sm:px-4 print:p-0 print:bg-white text-slate-900 font-sans">
      {/* Top Banner & Security Indicator (Hidden on print) */}
      <div className="max-w-4xl mx-auto mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 no-print px-2">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Verified Document — Authorized Customer Access</span>
        </div>

        <div className="flex items-center gap-2">
          <PrintButton />
        </div>
      </div>

      {/* A4 Document Container */}
      <div className="max-w-4xl mx-auto bg-white border border-slate-200/90 shadow-lg rounded-xl print:shadow-none print:border-none print:rounded-none p-8 sm:p-10 relative overflow-hidden">
        {/* Watermark if Cancelled */}
        {isCancelled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-15">
            <span className="text-8xl font-black text-rose-600 -rotate-45 uppercase border-8 border-rose-600 p-8 rounded-3xl">
              CANCELLED
            </span>
          </div>
        )}

        {/* 1. Header & Client Business Details */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-5 border-b-2 border-slate-900">
          <div>
            <div className="flex items-center gap-3">
              {effectiveLogo ? (
                <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                  <img
                    src={effectiveLogo}
                    alt={invoice.businessName}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-tight border border-slate-800 shrink-0">
                  {bizMonogram || 'ST'}
                </div>
              )}
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {invoice.businessName}
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  {invoice.business.tradeType || 'Commercial Enterprise'}
                </p>
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-600 space-y-0.5">
              {invoice.businessAddress && <p>{invoice.businessAddress}</p>}
              {invoice.business.phone && <p>Phone: {invoice.business.phone}</p>}
              {invoice.business.email && <p>Email: {invoice.business.email}</p>}
              {invoice.businessGstin && (
                <p className="font-semibold text-slate-900 mt-1">
                  GSTIN: <span className="font-mono">{invoice.businessGstin}</span>
                </p>
              )}
            </div>
          </div>

          <div className="text-left sm:text-right">
            <div className="inline-block bg-slate-900 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md mb-2">
              {invoice.isGstInvoice ? 'TAX INVOICE' : 'COMMERCIAL BILL'}
            </div>
            <p className="text-xs text-slate-500">Invoice Number</p>
            <p className="text-base font-extrabold font-mono text-slate-900">{invoice.invoiceNumber}</p>

            <div className="mt-2 text-xs text-slate-600 space-y-0.5">
              <p>
                Date:{' '}
                <strong className="text-slate-900">
                  {new Date(invoice.invoiceDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </strong>
              </p>
              <p>
                Due Date:{' '}
                <strong className="text-slate-900">
                  {new Date(invoice.dueDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </strong>
              </p>
              <p>
                Place of Supply:{' '}
                <strong className="text-slate-900">{invoice.business.state || 'State'}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* 2. Customer & Status Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-5 border-b border-slate-200 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Billed To
            </span>
            <p className="text-sm font-bold text-slate-900">{invoice.customerName}</p>
            <p className="text-slate-600 mt-0.5">Mobile: {invoice.customerMobile}</p>
            {invoice.customerBillingAddress && (
              <p className="text-slate-600 mt-0.5 whitespace-pre-line">{invoice.customerBillingAddress}</p>
            )}
            {invoice.customerGstin && (
              <p className="font-semibold text-slate-900 mt-1">
                GSTIN: <span className="font-mono">{invoice.customerGstin}</span>
              </p>
            )}
          </div>

          <div className="sm:text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Payment Status
            </span>
            <div className="inline-flex items-center gap-1.5 font-bold text-xs">
              <span
                className={`px-2.5 py-0.5 rounded-full border ${
                  invoice.status === 'PAID'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : invoice.status === 'PARTIAL'
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : invoice.status === 'CANCELLED'
                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                    : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                {invoice.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Tax Regime: <strong>{invoice.gstType.replace('_', ' + ')}</strong>
            </p>
          </div>
        </div>

        {/* 3. Items Table */}
        <div className="py-5">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-2.5 pl-2">#</th>
                <th className="py-2.5">Item Description</th>
                <th className="py-2.5 text-right">Qty</th>
                <th className="py-2.5 text-right">Rate (₹)</th>
                <th className="py-2.5 text-right">Disc (₹)</th>
                {invoice.isGstInvoice && <th className="py-2.5 text-right">GST %</th>}
                <th className="py-2.5 pr-2 text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {invoice.items.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="py-2.5 pl-2 text-slate-400">{idx + 1}</td>
                  <td className="py-2.5 font-sans font-medium text-slate-900">{item.description}</td>
                  <td className="py-2.5 text-right text-slate-700 tabular-nums">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="py-2.5 text-right text-slate-700 tabular-nums">₹{item.rate.toFixed(2)}</td>
                  <td className="py-2.5 text-right text-slate-500 tabular-nums">
                    {item.discount > 0 ? `₹${item.discount.toFixed(2)}` : '-'}
                  </td>
                  {invoice.isGstInvoice && (
                    <td className="py-2.5 text-right text-slate-600 tabular-nums">{item.taxRate}%</td>
                  )}
                  <td className="py-2.5 pr-2 text-right font-bold text-slate-900 tabular-nums">
                    ₹{item.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 4. Totals Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3 border-t-2 border-slate-800 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Amount in Words
            </span>
            <p className="font-semibold text-slate-800 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              {amountInWords}
            </p>

            {(invoice.business?.bankAccountNumber || invoice.business?.bankUpiId) && (
              <div className="mt-4 p-3.5 bg-slate-50/90 rounded-xl border border-slate-200">
                <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
                  <div className="flex-1 space-y-1 w-full">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Bank & Payment Settlement
                    </span>
                    {invoice.business.bankName && (
                      <div className="flex justify-between text-[11px] text-slate-700">
                        <span className="text-slate-500">Bank Name:</span>
                        <span className="font-semibold">{invoice.business.bankName}</span>
                      </div>
                    )}
                    {invoice.business.bankAccountNumber && (
                      <div className="flex justify-between text-[11px] text-slate-700">
                        <span className="text-slate-500">Account No:</span>
                        <span className="font-mono font-semibold">{invoice.business.bankAccountNumber}</span>
                      </div>
                    )}
                    {invoice.business.bankIfsc && (
                      <div className="flex justify-between text-[11px] text-slate-700">
                        <span className="text-slate-500">IFSC Code:</span>
                        <span className="font-mono font-semibold">{invoice.business.bankIfsc}</span>
                      </div>
                    )}
                    {invoice.business.bankUpiId && (
                      <div className="flex justify-between text-[11px] text-emerald-800 pt-1 border-t border-slate-200">
                        <span className="font-medium text-slate-600">UPI ID:</span>
                        <span className="font-mono font-bold">{invoice.business.bankUpiId}</span>
                      </div>
                    )}
                  </div>

                  {upiQrDataUrl && (
                    <div className="shrink-0 flex flex-col items-center bg-white p-2 rounded-xl border border-slate-200/90 text-center shadow-2xs">
                      <img
                        src={upiQrDataUrl}
                        alt="Scan to Pay via UPI"
                        className="w-24 h-24 object-contain rounded-lg"
                      />
                      <div className="mt-1 flex items-center gap-1 text-[9px] font-bold text-slate-800">
                        <Smartphone className="w-2.5 h-2.5 text-emerald-600" />
                        <span>Scan & Pay (UPI)</span>
                      </div>
                      <div className="text-[8px] text-slate-400 font-semibold flex items-center gap-1 mt-0.5">
                        <span>GPay</span>
                        <span>•</span>
                        <span>PhonePe</span>
                        <span>•</span>
                        <span>Paytm</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/90 space-y-1.5">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono tabular-nums">₹{invoice.subtotal.toFixed(2)}</span>
            </div>

            {invoice.discountTotal > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount:</span>
                <span className="font-mono tabular-nums">-₹{invoice.discountTotal.toFixed(2)}</span>
              </div>
            )}

            {invoice.isGstInvoice && invoice.taxTotal > 0 && (
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Total Tax (GST):</span>
                <span className="font-mono tabular-nums">₹{invoice.taxTotal.toFixed(2)}</span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-300 flex justify-between font-bold text-sm text-slate-900">
              <span>Grand Total:</span>
              <span className="font-mono text-base tabular-nums">₹{invoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between text-emerald-700 font-semibold pt-1 border-t border-slate-200">
              <span>Amount Paid:</span>
              <span className="font-mono tabular-nums">₹{invoice.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between text-amber-900 font-bold text-xs bg-amber-50/80 -mx-4 -mb-4 p-3 rounded-b-xl border-t border-amber-200">
              <span>Balance Due:</span>
              <span className="font-mono text-sm tabular-nums">₹{invoice.balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* 5. Terms & Signatory */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6 mt-6 border-t border-slate-200 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Terms & Conditions
            </span>
            <p className="text-[10px] text-slate-500 whitespace-pre-line leading-relaxed font-mono">
              {invoice.termsAndConditions}
            </p>
          </div>

          <div className="text-center sm:text-right flex flex-col justify-end items-center sm:items-end">
            <div className="h-14 w-36 border-b border-slate-400 mb-1"></div>
            <p className="font-bold text-slate-900 text-xs">For {invoice.businessName}</p>
            <p className="text-[10px] text-slate-400">Authorized Signatory</p>
          </div>
        </div>

        <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
          <span>Standard GST Invoice</span>
          <div className="flex items-center gap-1.5">
            <img src="/logo.png" alt="Pakka Chittha" className="w-3.5 h-3.5 object-contain" />
            <span>Verified Document • Powered by Pakka Chittha</span>
          </div>
        </div>
      </div>
    </div>
  );
}
