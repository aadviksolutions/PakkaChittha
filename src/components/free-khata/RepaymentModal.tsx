'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Calendar,
  AlertCircle,
  Check,
  FileText,
  Building,
  QrCode,
  Banknote,
} from 'lucide-react';
import { PaymentMethod } from '@prisma/client';
import { useTranslation } from '@/i18n/context';

export interface RepaymentTransactionTarget {
  id: string;
  contactName: string;
  type: 'GAVE' | 'RECEIVED';
  amount: number;
  balanceAmount: number;
  settledAmount: number;
  date: string | Date;
}

interface RepaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transaction: RepaymentTransactionTarget | null;
}

export function RepaymentModal({
  isOpen,
  onClose,
  onSuccess,
  transaction,
}: RepaymentModalProps) {
  const { t, locale } = useTranslation();
  const isHi = locale === 'hi';
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<PaymentMethod>('CASH');
  const [paymentRef, setPaymentRef] = useState('');
  const [upiApp, setUpiApp] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [otherModeDetails, setOtherModeDetails] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && transaction) {
      setAmount(transaction.balanceAmount.toString());
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentMode('CASH');
      setPaymentRef('');
      setUpiApp('');
      setBankName('');
      setChequeDate('');
      setOtherModeDetails('');
      setNotes('');
      setError(null);
    }
  }, [isOpen, transaction]);

  if (!isOpen || !transaction) return null;

  const isLent = transaction.type === 'GAVE'; // User gave money, now contact is returning it (Received Back)
  const parsedAmount = parseFloat(amount) || 0;
  const remainingBalance = Math.max(0, transaction.balanceAmount - parsedAmount);

  const handleSetFull = () => {
    setAmount(transaction.balanceAmount.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (parsedAmount <= 0) {
      setError('कृपया वैध रकम दर्ज करें जो 0 से अधिक हो। (Amount must be > ₹0).');
      return;
    }

    if (parsedAmount > transaction.balanceAmount) {
      setError(
        `वापसी रकम (₹${parsedAmount}) बाकी रकम (₹${transaction.balanceAmount}) से अधिक नहीं हो सकती।`
      );
      return;
    }

    setLoading(true);

    try {
      let paymentDetailsPayload: string | null = null;
      if (paymentMode === 'UPI' && upiApp.trim()) {
        paymentDetailsPayload = JSON.stringify({ app: upiApp.trim() });
      } else if (paymentMode === 'BANK_TRANSFER' && bankName.trim()) {
        paymentDetailsPayload = JSON.stringify({ bank: bankName.trim() });
      } else if (paymentMode === 'CHEQUE' && chequeDate) {
        paymentDetailsPayload = JSON.stringify({ chequeDate });
      } else if (paymentMode === 'OTHER' && otherModeDetails.trim()) {
        paymentDetailsPayload = JSON.stringify({ note: otherModeDetails.trim() });
      }

      const res = await fetch('/api/free-khata/repayments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: transaction.id,
          amount: parsedAmount,
          date: new Date(date).toISOString(),
          paymentMode,
          paymentRef: paymentRef.trim() || null,
          paymentDetails: paymentDetailsPayload,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record repayment');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 my-auto">
        {/* Header */}
        <div className={`p-5 border-b flex items-center justify-between ${isLent ? 'bg-emerald-50/80 border-emerald-100' : 'bg-slate-50/80 border-slate-200'
          }`}>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#071F38] bg-white px-2 py-0.5 rounded border border-slate-200">
              {isLent ? (isHi ? 'पहले दी गई रकम वापस मिली' : 'Received Lent Money Back') : (isHi ? 'पहले ली गई रकम वापस की' : 'Repaid Borrowed Amount')}
            </span>
            <h3 className="text-base font-black text-[#071F38] mt-1">
              {transaction.contactName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-white/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Balance Card */}
        <div className="px-5 pt-4 pb-1">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 block text-[10.5px]">{isHi ? 'मूल रकम (Original)' : 'Original Amount'}</span>
              <strong className="text-slate-800 font-bold">
                ₹{transaction.amount.toLocaleString('en-IN')}
              </strong>
            </div>

            <div className="text-right">
              <span className="text-slate-500 block text-[10.5px]">{isHi ? 'वर्तमान बाकी रकम' : 'Current Balance'}</span>
              <span className="font-black text-sm text-[#071F38]">
                ₹{transaction.balanceAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                {isHi ? 'वापस की जा रही रकम' : 'Repayment Amount'} <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleSetFull}
                className="text-[10.5px] font-bold text-[#EA580C] hover:underline cursor-pointer"
              >
                {isHi ? `पूरा हिसाब (Full: ₹${transaction.balanceAmount.toLocaleString('en-IN')})` : `Full (₹${transaction.balanceAmount.toLocaleString('en-IN')})`}
              </button>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-sm font-black text-slate-400">
                ₹
              </span>
              <input
                type="number"
                step="any"
                min="1"
                max={transaction.balanceAmount}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full text-base font-black pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C] focus:bg-white"
              />
            </div>

            {/* Remaining Balance Indicator */}
            {parsedAmount > 0 && parsedAmount <= transaction.balanceAmount && (
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-600 px-1">
                <span>वापसी के बाद बाकी रकम:</span>
                <strong className={`font-bold ${remainingBalance === 0 ? 'text-emerald-700' : 'text-slate-800'}`}>
                  ₹{remainingBalance.toLocaleString('en-IN')} {remainingBalance === 0 ? '(हिसाब पूरा)' : ''}
                </strong>
              </div>
            )}
          </div>

          {/* Date Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              तारीख (Date)
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C] focus:bg-white font-medium"
            />
          </div>

          {/* Payment Mode (MANDATORY) */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              भुगतान का माध्यम (Transaction Mode) <span className="text-rose-500">*</span>
            </label>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {(
                [
                  { mode: 'CASH', label: 'Cash (नकद)' },
                  { mode: 'UPI', label: 'UPI' },
                  { mode: 'BANK_TRANSFER', label: 'Bank' },
                  { mode: 'CHEQUE', label: 'Cheque' },
                  { mode: 'OTHER', label: 'Other' },
                ] as const
              ).map((m) => {
                const isSelected = paymentMode === m.mode;
                return (
                  <button
                    key={m.mode}
                    type="button"
                    onClick={() => setPaymentMode(m.mode)}
                    className={`py-1.5 px-1.5 text-[10.5px] font-bold rounded-lg border text-center transition-all cursor-pointer ${isSelected
                      ? 'bg-[#071F38] text-white border-[#071F38]'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>

            {paymentMode === 'UPI' && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <select
                  value={upiApp}
                  onChange={(e) => setUpiApp(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                >
                  <option value="">-- App चुनें --</option>
                  <option value="PhonePe">PhonePe</option>
                  <option value="Google Pay">Google Pay</option>
                  <option value="Paytm">Paytm</option>
                  <option value="BHIM">BHIM</option>
                  <option value="Other">Other UPI</option>
                </select>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="UPI UTR No."
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                />
              </div>
            )}

            {paymentMode === 'BANK_TRANSFER' && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Bank Name"
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                />
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="UTR / Ref No."
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                />
              </div>
            )}

            {paymentMode === 'CHEQUE' && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="Cheque No."
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                />
                <input
                  type="date"
                  value={chequeDate}
                  onChange={(e) => setChequeDate(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                />
              </div>
            )}

            {paymentMode === 'OTHER' && (
              <div className="pt-1">
                <input
                  type="text"
                  value={otherModeDetails}
                  onChange={(e) => setOtherModeDetails(e.target.value)}
                  placeholder="विवरण (e.g. Wallet, Gold)"
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              टिप्पणी (Note - Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received via cash / Online"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C] focus:bg-white"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              {isHi ? 'रद्द करें' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading || parsedAmount <= 0 || parsedAmount > transaction.balanceAmount}
              className="px-5 py-2.5 bg-[#071F38] hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50 active:scale-95 flex items-center gap-2"
            >
              {loading ? (
                <span>{isHi ? 'सहेजा जा रहा है...' : 'Saving...'}</span>
              ) : (
                <span>{isHi ? 'हिसाब दर्ज करें' : 'Record Repayment'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
