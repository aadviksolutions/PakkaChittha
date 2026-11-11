'use client';

import React, { useState, useEffect, useCallback, use, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Phone,
  MessageSquare,
  Calendar,
  AlertCircle,
  FileText,
  Clock,
  Trash2,
  Edit2,
  CheckCircle2,
  CreditCard,
  Sparkles,
  Download,
  Printer,
  Share2,
  Search,
  Filter,
  FileSpreadsheet,
  Check,
  Loader2,
} from 'lucide-react';
import ReportShareModal from '@/components/free-khata/ReportShareModal';
import type { ReportDatePreset } from '@/lib/services/khataReportService';
import {
  TransactionModal,
  ContactOption,
  EditingKhataTransaction,
} from '@/components/free-khata/TransactionModal';
import {
  RepaymentModal,
  RepaymentTransactionTarget,
  EditingKhataRepayment,
} from '@/components/free-khata/RepaymentModal';
import { WhatsAppReminderModal, WhatsAppReminderTarget } from '@/components/free-khata/WhatsAppReminderModal';
import { ContactEditModal } from '@/components/free-khata/ContactEditModal';
import { formatCurrency, formatDate } from '@/lib/services/khataService';
import { PaymentMethod } from '@prisma/client';

interface ActivityLedgerItem {
  id: string;
  date: string;
  activityType: 'GAVE_NEW' | 'RECEIVED_NEW' | 'LENT_REPAY' | 'BORROWED_REPAY';
  title: string;
  moneyDirection: 'OUT' | 'IN';
  amount: number;
  balanceAfter?: number;
  previousBalance?: number;
  updatedBalance?: number;
  balanceBucket?: 'TO_RECEIVE' | 'TO_PAY';
  paymentMode: PaymentMethod;
  paymentRef?: string | null;
  paymentDetails?: string | null;
  notes?: string | null;
  dueDate?: string | null;
  status?: 'PENDING' | 'PARTIAL' | 'SETTLED';
  transactionId?: string;
}

interface PersonDetailData {
  contact: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  };
  summary: {
    totalGiven: number;
    totalTaken: number;
    totalReceivedBack: number;
    totalReturned: number;
    amountToReceive: number;
    amountToPay: number;
    netPosition: number;
    status: 'TO_RECEIVE' | 'TO_PAY' | 'SETTLED';
    statusLabel: string;
  };
  transactions: Array<{
    id: string;
    type: 'GAVE' | 'RECEIVED';
    amount: number;
    settledAmount: number;
    balanceAmount: number;
    date: string;
    dueDate: string | null;
    description: string | null;
    paymentMode: PaymentMethod;
    paymentRef: string | null;
    paymentDetails: string | null;
    status: 'PENDING' | 'PARTIAL' | 'SETTLED';
    repayments: Array<{
      id: string;
      amount: number;
      date: string;
      paymentMode: PaymentMethod;
      paymentRef: string | null;
      paymentDetails: string | null;
      notes: string | null;
    }>;
  }>;
  activityLedger: ActivityLedgerItem[];
}

export default function PersonLedgerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const contactId = resolvedParams.id;

  const [data, setData] = useState<PersonDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters for History
  const [searchFilter, setSearchFilter] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('ALL');
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'OUT' | 'IN'>('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState<ReportDatePreset>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [downloadingExport, setDownloadingExport] = useState<'xlsx' | 'pdf' | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Modals state
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txPrimaryIntent, setTxPrimaryIntent] = useState<'GAVE' | 'RECEIVED'>('GAVE');
  const [editingTx, setEditingTx] = useState<EditingKhataTransaction | null>(null);
  const [editingRepayment, setEditingRepayment] = useState<EditingKhataRepayment | null>(null);
  const [contactEditOpen, setContactEditOpen] = useState(false);
  const [deletingContact, setDeletingContact] = useState(false);
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);
  const [repayModalOpen, setRepayModalOpen] = useState(false);
  const [repayTarget, setRepayTarget] = useState<RepaymentTransactionTarget | null>(null);
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waTarget, setWaTarget] = useState<WhatsAppReminderTarget | null>(null);

  const fetchContactDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/free-khata/contacts/${contactId}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load contact ledger');
      }
      setData(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading contact');
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    fetchContactDetail();
  }, [fetchContactDetail]);

  const handleOpenGave = () => {
    setEditingTx(null);
    setTxPrimaryIntent('GAVE');
    setTxModalOpen(true);
  };

  const handleEditActivity = (act: ActivityLedgerItem) => {
    if (!data) return;
    if (act.activityType === 'GAVE_NEW' || act.activityType === 'RECEIVED_NEW') {
      const tx = data.transactions.find((t) => t.id === act.id);
      if (!tx) return;
      setEditingTx({
        id: tx.id,
        contactId: data.contact.id,
        contactName: data.contact.name,
        contactPhone: data.contact.phone,
        type: tx.type,
        amount: tx.amount,
        settledAmount: tx.settledAmount,
        date: tx.date,
        dueDate: tx.dueDate,
        description: tx.description,
        paymentMode: tx.paymentMode,
        paymentRef: tx.paymentRef,
        paymentDetails: tx.paymentDetails,
      });
      setTxPrimaryIntent(tx.type);
      setTxModalOpen(true);
    } else {
      const parentTx = data.transactions.find((t) => t.id === act.transactionId);
      const rep = parentTx?.repayments.find((r) => r.id === act.id);
      if (!parentTx || !rep) return;
      setEditingRepayment({
        id: rep.id,
        transactionId: parentTx.id,
        contactName: data.contact.name,
        type: parentTx.type,
        transactionAmount: parentTx.amount,
        transactionSettledAmount: parentTx.settledAmount,
        amount: rep.amount,
        date: rep.date,
        paymentMode: rep.paymentMode,
        paymentRef: rep.paymentRef,
        paymentDetails: rep.paymentDetails,
        notes: rep.notes,
      });
      setRepayTarget(null);
      setRepayModalOpen(true);
    }
  };

  const handleDeleteContact = async () => {
    if (!data?.contact) return;
    if (
      !confirm(
        `क्या आप "${data.contact.name}" और उनके सभी लेन-देन हटाना चाहते हैं? (Delete this contact and all their Khata transactions?)`
      )
    ) {
      return;
    }

    setDeletingContact(true);
    try {
      const res = await fetch(`/api/free-khata/contacts/${data.contact.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete contact');
      }
      router.push('/free-khata');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete contact');
    } finally {
      setDeletingContact(false);
    }
  };

  const handleDeleteActivity = async (act: ActivityLedgerItem) => {
    const isRepay = act.activityType === 'LENT_REPAY' || act.activityType === 'BORROWED_REPAY';
    const ok = confirm(
      isRepay
        ? `क्या आप ₹${act.amount.toLocaleString('en-IN')} की यह वापसी एंट्री हटाना चाहते हैं? (Delete this repayment & restore balance?)`
        : `क्या आप ₹${act.amount.toLocaleString('en-IN')} का यह लेन-देन हटाना चाहते हैं? इससे जुड़ी वापसी भी हट जाएगी। (Delete this transaction?)`
    );
    if (!ok) return;
    setDeletingActivityId(act.id);
    try {
      const url = isRepay
        ? `/api/free-khata/repayments?id=${encodeURIComponent(act.id)}`
        : `/api/free-khata/transactions/${act.id}`;
      const res = await fetch(url, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete entry');
      }
      fetchContactDetail();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete entry');
    } finally {
      setDeletingActivityId(null);
    }
  };

  const handleOpenReceived = () => {
    setTxPrimaryIntent('RECEIVED');
    setTxModalOpen(true);
  };

  const handleOpenRepayForTx = (txId: string) => {
    const tx = data?.transactions.find((t) => t.id === txId);
    if (tx && data) {
      setRepayTarget({
        id: tx.id,
        contactName: data.contact.name,
        type: tx.type,
        amount: tx.amount,
        balanceAmount: tx.balanceAmount,
        settledAmount: tx.settledAmount,
        date: tx.date,
      });
      setRepayModalOpen(true);
    }
  };

  const handleOpenWhatsAppReminder = () => {
    if (!data) return;
    const pendingTx = data.transactions.find((t) => t.balanceAmount > 0 && t.type === 'GAVE');
    const outstanding = data.summary.amountToReceive > 0 ? data.summary.amountToReceive : data.summary.amountToPay;

    setWaTarget({
      transactionId: pendingTx?.id,
      contactId: data.contact.id,
      contactName: data.contact.name,
      phone: data.contact.phone,
      amount: outstanding,
      date: pendingTx?.date || new Date().toISOString(),
      dueDate: pendingTx?.dueDate || null,
      type: data.summary.amountToReceive >= data.summary.amountToPay ? 'GAVE' : 'RECEIVED',
    });
    setWaModalOpen(true);
  };

  // Filtered Activity Ledger
  const filteredActivities = useMemo(() => {
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    return (data?.activityLedger || []).filter((item) => {
      const q = searchFilter.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.notes && item.notes.toLowerCase().includes(q)) ||
        (item.paymentRef && item.paymentRef.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (modeFilter !== 'ALL' && item.paymentMode !== modeFilter) return false;
      if (directionFilter !== 'ALL' && item.moneyDirection !== directionFilter) return false;

      if (dateRangeFilter !== 'ALL') {
        const d = new Date(item.date);
        const itemYmd = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        if (dateRangeFilter === 'TODAY') {
          if (itemYmd !== todayStr) return false;
        } else if (dateRangeFilter === 'THIS_WEEK') {
          const anchor = new Date(`${todayStr}T00:00:00Z`);
          const diff = (anchor.getUTCDay() + 6) % 7;
          const monday = new Date(anchor);
          monday.setUTCDate(anchor.getUTCDate() - diff);
          const mondayStr = monday.toISOString().slice(0, 10);
          if (itemYmd < mondayStr || itemYmd > todayStr) return false;
        } else if (dateRangeFilter === 'THIS_MONTH') {
          if (itemYmd.slice(0, 7) !== todayStr.slice(0, 7)) return false;
        } else if (dateRangeFilter === 'THIS_YEAR') {
          if (itemYmd.slice(0, 4) !== todayStr.slice(0, 4)) return false;
        } else if (dateRangeFilter === 'CUSTOM') {
          if (customStartDate && itemYmd < customStartDate) return false;
          if (customEndDate && itemYmd > customEndDate) return false;
        }
      }

      return true;
    });
  }, [
    data?.activityLedger,
    searchFilter,
    modeFilter,
    directionFilter,
    dateRangeFilter,
    customStartDate,
    customEndDate,
  ]);

  const exportQueryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set('dateRange', dateRangeFilter);
    if (dateRangeFilter === 'CUSTOM') {
      if (customStartDate) params.set('startDate', customStartDate);
      if (customEndDate) params.set('endDate', customEndDate);
    }
    if (modeFilter !== 'ALL') params.set('paymentMode', modeFilter);
    return params.toString();
  }, [dateRangeFilter, customStartDate, customEndDate, modeFilter]);

  const handleDownloadStatement = async (format: 'xlsx' | 'pdf') => {
    if (!data) return;
    try {
      setDownloadingExport(format);
      const res = await fetch(
        `/api/free-khata/reports/export?format=${format}&contactId=${encodeURIComponent(contactId)}&${exportQueryParams}`,
        { credentials: 'include' }
      );
      if (!res.ok) {
        throw new Error(`Failed to generate ${format.toUpperCase()} statement.`);
      }
      const blob = await res.blob();
      const cd = res.headers.get('content-disposition') || '';
      const match = cd.match(/filename="([^"]+)"/);
      const filename =
        match?.[1] ||
        `khata-party-${data.contact.name.toLowerCase().replace(/\s+/g, '-')}.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Unable to download statement.');
    } finally {
      setDownloadingExport(null);
    }
  };

  // Print Statement
  const handlePrintStatement = () => {
    window.print();
  };

  // Export Statement to CSV
  const handleExportStatementCSV = () => {
    if (!data || !data.activityLedger.length) return;
    const headers = ['Date', 'Activity', 'Direction', 'Amount', 'Mode', 'Ref', 'Note', 'Balance After'];
    const rows = data.activityLedger.map((a) => [
      formatDate(a.date),
      `"${a.title}"`,
      a.moneyDirection === 'OUT' ? 'पैसे गए (Given)' : 'पैसे आए (Received)',
      a.amount,
      a.paymentMode,
      `"${a.paymentRef || ''}"`,
      `"${a.notes || ''}"`,
      a.balanceAfter ?? '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        `"Statement for ${data.contact.name}"`,
        `"Phone: ${data.contact.phone || 'N/A'}"`,
        `"Receivable: ₹${data.summary.amountToReceive}"`,
        `"Payable: ₹${data.summary.amountToPay}"`,
        `"Net Position: ₹${data.summary.netPosition}"`,
        '',
        headers.join(','),
        ...rows.map((e) => e.join(',')),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${data.contact.name}_Khata_Statement.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !data) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <span>लोड हो रहा है... (Loading person ledger...)</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-4">
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs">
          {error || 'संपर्क नहीं मिला'}
        </div>
        <Link
          href="/free-khata"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>पर्सनल खाता में वापस जाएं</span>
        </Link>
      </div>
    );
  }

  const contact = data.contact;
  const summary = data.summary;

  const contactOption: ContactOption = {
    id: contact.id,
    name: contact.name,
    phone: contact.phone,
    amountToReceive: summary.amountToReceive,
    amountToPay: summary.amountToPay,
  };

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-4xl mx-auto">
      {/* 1. Header with Back Button and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
              } else {
                router.push('/free-khata');
              }
            }}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-[#071F38]">
                {contact.name}
              </h1>
              <span
                className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${summary.status === 'TO_RECEIVE'
                  ? 'bg-emerald-100 text-emerald-800'
                  : summary.status === 'TO_PAY'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-slate-100 text-slate-700'
                  }`}
              >
                {summary.statusLabel}
              </span>
            </div>
            {contact.phone && (
              <span className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3 text-slate-400" />
                <span>{contact.phone}</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons: WhatsApp, Excel/PDF, Print, Share, Edit & Delete */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {contact.phone && (summary.amountToReceive > 0 || summary.amountToPay > 0) && (
            <button
              type="button"
              onClick={handleOpenWhatsAppReminder}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp Reminder</span>
            </button>
          )}

          <button
            type="button"
            disabled={downloadingExport !== null}
            onClick={() => handleDownloadStatement('xlsx')}
            className="px-2.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-60"
            title="Download Party Statement (Excel .xlsx)"
          >
            {downloadingExport === 'xlsx' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            )}
            <span className="hidden sm:inline">Excel</span>
          </button>

          <button
            type="button"
            disabled={downloadingExport !== null}
            onClick={() => handleDownloadStatement('pdf')}
            className="px-2.5 py-2 bg-[#071F38] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-60"
            title="Download Party Statement (PDF)"
          >
            {downloadingExport === 'pdf' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 text-rose-300" />
            )}
            <span className="hidden sm:inline">PDF</span>
          </button>

          <button
            type="button"
            onClick={handlePrintStatement}
            className="p-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
            title="Print Statement"
          >
            <Printer className="w-4 h-4 text-slate-700" />
          </button>

          <button
            type="button"
            onClick={() => setShareModalOpen(true)}
            className="px-2.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
            title="Share Party Report"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>

          <button
            type="button"
            onClick={handleExportStatementCSV}
            className="p-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
            title="Quick CSV Export"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span className="hidden md:inline">CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setContactEditOpen(true)}
            className="p-2 bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
            title="संपर्क संपादित करें (Edit Contact)"
          >
            <Edit2 className="w-4 h-4" />
            <span className="hidden sm:inline">Edit</span>
          </button>

          <button
            type="button"
            onClick={handleDeleteContact}
            disabled={deletingContact}
            className="p-2 bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="संपर्क हटाएं (Delete Contact)"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">{deletingContact ? 'Deleting...' : 'Delete'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrintStatement}
            className="p-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
            title="Print Statement"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* 2. THE 6 INDEPENDENT FIGURES + NET POSITION (Section 6) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        {/* A. Current Outstanding Balances & Net Position */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 5. मुझे लेने हैं */}
          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-100 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              मुझे लेने हैं (Receivable)
            </span>
            <div className="mt-2">
              <strong className="text-2xl font-black text-emerald-700 block">
                ₹{summary.amountToReceive.toLocaleString('en-IN')}
              </strong>
              <span className="text-[10px] text-emerald-600 block mt-0.5">
                इस व्यक्ति से बाकी रकम
              </span>
            </div>
          </div>

          {/* 6. मुझे देने हैं */}
          <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-100 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
              मुझे देने हैं (Payable)
            </span>
            <div className="mt-2">
              <strong className="text-2xl font-black text-rose-700 block">
                ₹{summary.amountToPay.toLocaleString('en-IN')}
              </strong>
              <span className="text-[10px] text-rose-600 block mt-0.5">
                इस व्यक्ति को बाकी रकम
              </span>
            </div>
          </div>

          {/* 7. मेरी वर्तमान स्थिति (Net Position) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              मेरी वर्तमान स्थिति (Net Position)
            </span>
            <div className="mt-2">
              <strong
                className={`text-2xl font-black block ${summary.netPosition > 0
                  ? 'text-emerald-700'
                  : summary.netPosition < 0
                    ? 'text-rose-700'
                    : 'text-slate-700'
                  }`}
              >
                {summary.netPosition > 0 && '+ '}
                {summary.netPosition < 0 && '- '}₹
                {Math.abs(summary.netPosition).toLocaleString('en-IN')}
              </strong>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {summary.netPosition > 0
                  ? `कुल ₹${summary.netPosition.toLocaleString('en-IN')} अधिक मिलने हैं`
                  : summary.netPosition < 0
                    ? `कुल ₹${Math.abs(summary.netPosition).toLocaleString('en-IN')} अधिक देने हैं`
                    : 'हिसाब पूरा (बराबर)'}
              </span>
            </div>
          </div>
        </div>

        {/* B. The 4 Historical Cumulative Totals */}
        <div className="pt-3 border-t border-slate-100">
          <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 block mb-2">
            ऐतिहासिक कुल हिसाब (Historical Totals)
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-500 block">1. कुल दी गई रकम</span>
              <strong className="text-xs font-black text-[#071F38] block mt-0.5">
                ₹{summary.totalGiven.toLocaleString('en-IN')}
              </strong>
              <span className="text-[9px] text-slate-400">Total Original Given</span>
            </div>

            <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-500 block">2. कुल ली गई रकम</span>
              <strong className="text-xs font-black text-[#071F38] block mt-0.5">
                ₹{summary.totalTaken.toLocaleString('en-IN')}
              </strong>
              <span className="text-[9px] text-slate-400">Total Original Taken</span>
            </div>

            <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-500 block">3. कुल वापस मिली रकम</span>
              <strong className="text-xs font-black text-emerald-700 block mt-0.5">
                ₹{summary.totalReceivedBack.toLocaleString('en-IN')}
              </strong>
              <span className="text-[9px] text-slate-400">Repayments Received</span>
            </div>

            <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-500 block">4. कुल वापस की गई रकम</span>
              <strong className="text-xs font-black text-rose-700 block mt-0.5">
                ₹{summary.totalReturned.toLocaleString('en-IN')}
              </strong>
              <span className="text-[9px] text-slate-400">Repayments Returned</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TWO PRIMARY TRANSACTION BUTTONS FOR THIS PERSON */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleOpenGave}
          className="p-3.5 sm:p-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center justify-between group transition-all cursor-pointer active:scale-98"
        >
          <div className="text-left">
            <span className="text-sm sm:text-base font-black block">
              मैंने रकम दी
            </span>
            <span className="text-[11px] text-rose-100 font-medium block mt-0.5">
              पैसे मेरे पास से गए
            </span>
          </div>
          <ArrowUpRight className="w-5 h-5 text-white" />
        </button>

        <button
          type="button"
          onClick={handleOpenReceived}
          className="p-3.5 sm:p-4 rounded-2xl bg-[#00B887] hover:bg-[#009E74] text-white shadow-sm flex items-center justify-between group transition-all cursor-pointer active:scale-98"
        >
          <div className="text-left">
            <span className="text-sm sm:text-base font-black block">
              मुझे रकम मिली
            </span>
            <span className="text-[11px] text-emerald-100 font-medium block mt-0.5">
              पैसे मेरे पास आए
            </span>
          </div>
          <ArrowDownLeft className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* 4. हिसाब का पूरा रिकॉर्ड (PERSON-WISE COMPLETE TRANSACTION HISTORY) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-[#071F38]">
              हिसाब का पूरा रिकॉर्ड (Transaction History)
            </h3>
            <span className="text-[11px] text-slate-500">
              {filteredActivities.length} लेन-देन दर्ज
            </span>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <select
              aria-label="Date range filter"
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value as ReportDatePreset)}
              className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="THIS_YEAR">This Year</option>
              <option value="CUSTOM">Custom Range</option>
            </select>

            {dateRangeFilter === 'CUSTOM' && (
              <>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </>
            )}

            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value as any)}
              className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
            >
              <option value="ALL">सभी दिशाएं (All)</option>
              <option value="OUT">पैसे गए (Out / Given)</option>
              <option value="IN">पैसे आए (In / Received)</option>
            </select>

            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
            >
              <option value="ALL">सभी माध्यम (All Modes)</option>
              <option value="CASH">Cash (नकद)</option>
              <option value="UPI">UPI</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        {/* History List */}
        {filteredActivities.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            इस संपर्क के लिए कोई लेन-देन नहीं मिला।
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredActivities.map((act) => {
              const isOut = act.moneyDirection === 'OUT';

              return (
                <div
                  key={act.id}
                  className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isOut ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}
                    >
                      {isOut ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs text-slate-800">
                          {act.title}
                        </strong>
                        <span
                          className={`text-[9.5px] font-bold px-2 py-0.5 rounded ${act.paymentMode === 'UPI'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : act.paymentMode === 'CASH'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                        >
                          {act.paymentMode}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 mt-0.5 space-x-1">
                        <span>
                          {new Date(act.date).toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </span>
                        {act.notes && <span>• {act.notes}</span>}
                        {act.paymentRef && <span>• Ref: {act.paymentRef}</span>}
                        {act.dueDate && <span>• Due: {formatDate(act.dueDate)}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`font-black text-sm block ${isOut ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                    >
                      {isOut ? '- ' : '+ '}₹{act.amount.toLocaleString('en-IN')}
                    </span>

                    {(act.previousBalance !== undefined && act.updatedBalance !== undefined) ? (
                      <span className="text-[10px] text-slate-500 block mt-0.5 tabular-nums">
                        Prev: ₹{act.previousBalance.toLocaleString('en-IN')} → New: <strong className="text-[#071F38]">₹{act.updatedBalance.toLocaleString('en-IN')}</strong>
                      </span>
                    ) : act.balanceAfter !== undefined ? (
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        बाकी: ₹{act.balanceAfter.toLocaleString('en-IN')}
                      </span>
                    ) : null}

                    <div className="flex items-center justify-end gap-1.5 mt-1 print:hidden">
                      {act.transactionId &&
                        (act.activityType === 'GAVE_NEW' || act.activityType === 'RECEIVED_NEW') &&
                        (data.transactions.find((t) => t.id === act.transactionId)?.balanceAmount ?? 0) > 0 && (
                          <button
                            type="button"
                            onClick={() => handleOpenRepayForTx(act.transactionId!)}
                            className="text-[10px] font-bold text-[#EA580C] hover:underline cursor-pointer"
                          >
                            वापसी दर्ज करें
                          </button>
                        )}
                      <button
                        type="button"
                        onClick={() => handleEditActivity(act)}
                        title="संपादित करें (Edit)"
                        className="p-1 text-slate-500 hover:text-[#071F38] hover:bg-slate-100 rounded cursor-pointer transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={deletingActivityId === act.id}
                        onClick={() => handleDeleteActivity(act)}
                        title="हटाएं (Delete)"
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {txModalOpen && (
        <TransactionModal
          isOpen={txModalOpen}
          onClose={() => {
            setTxModalOpen(false);
            setEditingTx(null);
          }}
          onSuccess={() => {
            setEditingTx(null);
            fetchContactDetail();
          }}
          primaryIntent={txPrimaryIntent}
          editingTransaction={editingTx}
          preselectedContact={contactOption}
          existingContacts={[contactOption]}
        />
      )}

      {repayModalOpen && (
        <RepaymentModal
          isOpen={repayModalOpen}
          onClose={() => {
            setRepayModalOpen(false);
            setRepayTarget(null);
            setEditingRepayment(null);
          }}
          onSuccess={() => {
            setRepayTarget(null);
            setEditingRepayment(null);
            fetchContactDetail();
          }}
          transaction={repayTarget}
          editingRepayment={editingRepayment}
        />
      )}

      {contactEditOpen && data && (
        <ContactEditModal
          isOpen={contactEditOpen}
          onClose={() => setContactEditOpen(false)}
          onSuccess={() => {
            setContactEditOpen(false);
            fetchContactDetail();
          }}
          contact={data.contact}
        />
      )}

      {waModalOpen && waTarget && (
        <WhatsAppReminderModal
          isOpen={waModalOpen}
          onClose={() => {
            setWaModalOpen(false);
            setWaTarget(null);
          }}
          target={waTarget}
        />
      )}

      {data && (
        <ReportShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          title={`Share Party Statement — ${contact.name}`}
          subject={`Khata Statement — ${contact.name} (Pakka Chittha)`}
          shareText={[
            `*Party Khata Statement: ${contact.name}*`,
            contact.phone ? `Mobile: ${contact.phone}` : '',
            '',
            `Current To Receive (लेनी है): ₹${summary.amountToReceive.toLocaleString('en-IN')}`,
            `Current To Pay (देनी है): ₹${summary.amountToPay.toLocaleString('en-IN')}`,
            `Net Position (वर्तमान स्थिति): ₹${summary.netPosition.toLocaleString('en-IN')}`,
            `Total Given: ₹${summary.totalGiven.toLocaleString('en-IN')} | Received Back: ₹${summary.totalReceivedBack.toLocaleString('en-IN')}`,
            `Total Taken: ₹${summary.totalTaken.toLocaleString('en-IN')} | Returned: ₹${summary.totalReturned.toLocaleString('en-IN')}`,
            `Entries Shown: ${filteredActivities.length}`,
            '',
            'Generated via Pakka Chittha / LenDen',
          ]
            .filter(Boolean)
            .join('\n')}
          recipientPhone={contact.phone}
          recipientEmail={contact.email}
          pdfExportUrl={`/api/free-khata/reports/export?format=pdf&contactId=${encodeURIComponent(contactId)}&${exportQueryParams}`}
          excelExportUrl={`/api/free-khata/reports/export?format=xlsx&contactId=${encodeURIComponent(contactId)}&${exportQueryParams}`}
          pdfFileName={`khata-party-${contact.name.toLowerCase().replace(/\s+/g, '-')}.pdf`}
          excelFileName={`khata-party-${contact.name.toLowerCase().replace(/\s+/g, '-')}.xlsx`}
          onPrint={handlePrintStatement}
        />
      )}
    </div>
  );
}
