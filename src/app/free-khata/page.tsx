'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  Search,
  MessageSquare,
  AlertTriangle,
  Clock,
  ChevronRight,
  Plus,
  RefreshCw,
  Sparkles,
  Phone,
  Calendar,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  CreditCard,
  UserPlus,
  Filter,
  Download,
  Share2,
  Banknote,
  Building,
  QrCode,
  FileSpreadsheet,
} from 'lucide-react';
import { TransactionModal, ContactOption } from '@/components/free-khata/TransactionModal';
import { RepaymentModal, RepaymentTransactionTarget } from '@/components/free-khata/RepaymentModal';
import { WhatsAppReminderModal, WhatsAppReminderTarget } from '@/components/free-khata/WhatsAppReminderModal';
import { formatCurrency, formatDate } from '@/lib/services/khataService';
import { useTranslation } from '@/i18n/context';
import { LanguageSelector } from '@/components/shared/LanguageSelector';
import { PaymentMethod } from '@prisma/client';

interface KhataContactSummary {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  totalGiven: number;
  totalTaken: number;
  totalReceivedBack: number;
  totalReturned: number;
  amountToReceive: number;
  amountToPay: number;
  netPosition: number;
  status: 'TO_RECEIVE' | 'TO_PAY' | 'SETTLED';
  statusLabel: string;
  transactionCount: number;
  lastActivityDate: string;
  // Aliases
  gaveOutstanding: number;
  receivedOutstanding: number;
}

interface KhataTransactionItem {
  id: string;
  contactId: string;
  contactName: string;
  contactPhone: string | null;
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
  createdAt: string;
}

interface OverdueEntryItem {
  id: string;
  contactId: string;
  contactName: string;
  contactPhone: string | null;
  type: 'GAVE' | 'RECEIVED';
  amount: number;
  balanceAmount: number;
  date: string;
  dueDate: string;
  description: string | null;
  daysOverdue: number;
}

interface PaymentModeSummary {
  mode: PaymentMethod;
  label: string;
  totalGiven: number;
  totalReceived: number;
  count: number;
}

interface DashboardData {
  kpis: {
    amountToReceive: number;
    amountToPay: number;
    netPosition: number;
    netPositionDescription: string;
    totalGiven: number;
    totalTaken: number;
    totalReceivedBack: number;
    totalReturned: number;
    totalContacts: number;
    overdueCount: number;
    // Aliases
    moneyToCollect?: number;
    moneyToRepay?: number;
  };
  modeSummaries: PaymentModeSummary[];
  recentTransactions: KhataTransactionItem[];
  overdueEntries: OverdueEntryItem[];
  contacts: KhataContactSummary[];
}

function PersonalKhataDashboardContent() {
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const filterParam = searchParams.get('filter') || 'ALL'; // 'ALL', 'GAVE', 'RECEIVED'
  const viewParam = searchParams.get('view');

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'CONTACTS' | 'TRANSACTIONS' | 'MODES' | 'OVERDUE'>(
    viewParam === 'reminders' ? 'OVERDUE' : 'CONTACTS'
  );

  // Contact list filters & sorting
  const [contactStatusFilter, setContactStatusFilter] = useState<'ALL' | 'TO_RECEIVE' | 'TO_PAY' | 'SETTLED'>('ALL');
  const [contactSortBy, setContactSortBy] = useState<'NAME' | 'RECEIVE_HIGH' | 'PAY_HIGH' | 'RECENT'>('RECEIVE_HIGH');
  const [modeFilter, setModeFilter] = useState<string>('ALL');

  // Modals state
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txPrimaryIntent, setTxPrimaryIntent] = useState<'GAVE' | 'RECEIVED'>('GAVE');
  const [repayModalOpen, setRepayModalOpen] = useState(false);
  const [repayTarget, setRepayTarget] = useState<RepaymentTransactionTarget | null>(null);
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waTarget, setWaTarget] = useState<WhatsAppReminderTarget | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/free-khata/dashboard');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load Personal Khata dashboard');
      }
      setData(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Primary Action Button Handlers
  const handleOpenGave = () => {
    setTxPrimaryIntent('GAVE');
    setTxModalOpen(true);
  };

  const handleOpenReceived = () => {
    setTxPrimaryIntent('RECEIVED');
    setTxModalOpen(true);
  };

  const handleOpenRepay = (tx: KhataTransactionItem) => {
    setRepayTarget({
      id: tx.id,
      contactName: tx.contactName,
      type: tx.type,
      amount: tx.amount,
      balanceAmount: tx.balanceAmount,
      settledAmount: tx.settledAmount,
      date: tx.date,
    });
    setRepayModalOpen(true);
  };

  const handleOpenWhatsApp = (tx: KhataTransactionItem | OverdueEntryItem) => {
    setWaTarget({
      transactionId: tx.id,
      contactId: tx.contactId,
      contactName: tx.contactName,
      phone: tx.contactPhone,
      amount: tx.balanceAmount,
      date: tx.date,
      dueDate: tx.dueDate,
      type: tx.type,
    });
    setWaModalOpen(true);
  };

  const handleOpenContactWhatsApp = (c: KhataContactSummary) => {
    const outstanding = c.amountToReceive > 0 ? c.amountToReceive : c.amountToPay;
    setWaTarget({
      contactId: c.id,
      contactName: c.name,
      phone: c.phone,
      amount: outstanding,
      date: c.lastActivityDate,
      type: c.amountToReceive >= c.amountToPay ? 'GAVE' : 'RECEIVED',
    });
    setWaModalOpen(true);
  };

  // Filtered & Sorted Contacts List
  const filteredContacts = useMemo(() => {
    let list = (data?.contacts || []).filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q));

      if (!matchesSearch) return false;

      if (contactStatusFilter === 'TO_RECEIVE') return c.amountToReceive > 0;
      if (contactStatusFilter === 'TO_PAY') return c.amountToPay > 0;
      if (contactStatusFilter === 'SETTLED') return c.amountToReceive === 0 && c.amountToPay === 0;

      return true;
    });

    list.sort((a, b) => {
      if (contactSortBy === 'RECEIVE_HIGH') return b.amountToReceive - a.amountToReceive;
      if (contactSortBy === 'PAY_HIGH') return b.amountToPay - a.amountToPay;
      if (contactSortBy === 'NAME') return a.name.localeCompare(b.name);
      return new Date(b.lastActivityDate).getTime() - new Date(a.lastActivityDate).getTime();
    });

    return list;
  }, [data?.contacts, searchQuery, contactStatusFilter, contactSortBy]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return (data?.recentTransactions || []).filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.contactName.toLowerCase().includes(q) ||
        (t.contactPhone && t.contactPhone.includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (modeFilter !== 'ALL' && t.paymentMode !== modeFilter) return false;
      if (filterParam === 'GAVE') return t.type === 'GAVE';
      if (filterParam === 'RECEIVED') return t.type === 'RECEIVED';

      return true;
    });
  }, [data?.recentTransactions, searchQuery, modeFilter, filterParam]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!data?.recentTransactions?.length) return;
    const headers = ['Date', 'Person', 'Phone', 'Type', 'Amount', 'Payment Mode', 'Reference', 'Status', 'Balance'];
    const rows = data.recentTransactions.map((tx) => [
      formatDate(tx.date),
      `"${tx.contactName}"`,
      tx.contactPhone || '',
      tx.type === 'GAVE' ? 'दी गई रकम' : 'ली गई रकम',
      tx.amount,
      tx.paymentMode,
      `"${tx.paymentRef || ''}"`,
      tx.status === 'SETTLED' ? 'हिसाब पूरा' : tx.status === 'PARTIAL' ? 'आंशिक' : 'बाकी',
      tx.balanceAmount,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Personal_Khata_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const existingContacts: ContactOption[] = (data?.contacts || []).map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    amountToReceive: c.amountToReceive,
    amountToPay: c.amountToPay,
  }));

  const kpis = data?.kpis || {
    amountToReceive: 0,
    amountToPay: 0,
    netPosition: 0,
    netPositionDescription: 'आपका कुल हिसाब बराबर है।',
    totalGiven: 0,
    totalTaken: 0,
    totalReceivedBack: 0,
    totalReturned: 0,
    totalContacts: 0,
    overdueCount: 0,
  };

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-5xl mx-auto">
      {/* 1. Top Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-[#071F38] tracking-tight">
              Personal Khata
            </h1>
            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
              <Sparkles className="w-3 h-3 text-[#00B887]" />
              <span>100% Free Forever</span>
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Har paise ka hisaab, bilkul aasaan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSelector variant="compact" />
          <button
            type="button"
            onClick={fetchDashboardData}
            title="Refresh Khata"
            className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchDashboardData}
            className="font-bold underline text-xs cursor-pointer ml-3"
          >
            पुनः प्रयास करें (Retry)
          </button>
        </div>
      )}

      {/* 2. THE 3 MAIN DASHBOARD SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Card 1: कुल लेने वाली रकम (Amount to Receive) - GREEN */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#00B887] to-[#009E74] text-white shadow-md shadow-emerald-500/10 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider">
              कुल लेने वाली रकम
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black tracking-tight block">
              ₹{kpis.amountToReceive.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-emerald-100 block mt-1 font-medium">
              लोगों से मिलने वाली बाकी रकम
            </span>
          </div>
        </div>

        {/* Card 2: कुल देने वाली रकम (Amount to Pay) - RED */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-md shadow-rose-500/10 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-100 uppercase tracking-wider">
              कुल देने वाली रकम
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black tracking-tight block">
              ₹{kpis.amountToPay.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-rose-100 block mt-1 font-medium">
              लोगों को देने वाली बाकी रकम
            </span>
          </div>
        </div>

        {/* Card 3: मेरी वर्तमान स्थिति (Net Position) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              मेरी वर्तमान स्थिति (Net Position)
            </span>
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                kpis.netPosition > 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : kpis.netPosition < 0
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {kpis.netPosition > 0 ? '+ लेने हैं' : kpis.netPosition < 0 ? '- देने हैं' : 'बराबर'}
            </span>
          </div>

          <div className="mt-3">
            <span
              className={`text-2xl sm:text-3xl font-black tracking-tight block ${
                kpis.netPosition > 0
                  ? 'text-emerald-600'
                  : kpis.netPosition < 0
                  ? 'text-rose-600'
                  : 'text-slate-700'
              }`}
            >
              {kpis.netPosition > 0 && '+ '}
              {kpis.netPosition < 0 && '- '}₹
              {Math.abs(kpis.netPosition).toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-slate-600 block mt-1 font-medium leading-relaxed">
              {kpis.netPositionDescription}
            </span>
          </div>
        </div>
      </div>

      {/* 3. HISTORICAL CUMULATIVE TOTALS */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
        <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 block mb-2.5">
          ऐतिहासिक कुल हिसाब (Cumulative Historical Totals)
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 bg-white rounded-xl border border-slate-200/60 shadow-2xs">
            <span className="text-[10.5px] text-slate-500 block">कुल दी गई रकम</span>
            <strong className="text-sm font-black text-[#071F38] block mt-0.5">
              ₹{kpis.totalGiven.toLocaleString('en-IN')}
            </strong>
            <span className="text-[9.5px] text-slate-400 block mt-0.5">Original Lent</span>
          </div>

          <div className="p-2.5 bg-white rounded-xl border border-slate-200/60 shadow-2xs">
            <span className="text-[10.5px] text-slate-500 block">कुल ली गई रकम</span>
            <strong className="text-sm font-black text-[#071F38] block mt-0.5">
              ₹{kpis.totalTaken.toLocaleString('en-IN')}
            </strong>
            <span className="text-[9.5px] text-slate-400 block mt-0.5">Original Borrowed</span>
          </div>

          <div className="p-2.5 bg-white rounded-xl border border-slate-200/60 shadow-2xs">
            <span className="text-[10.5px] text-slate-500 block">कुल वापस मिली रकम</span>
            <strong className="text-sm font-black text-emerald-600 block mt-0.5">
              ₹{kpis.totalReceivedBack.toLocaleString('en-IN')}
            </strong>
            <span className="text-[9.5px] text-slate-400 block mt-0.5">Repayments Received</span>
          </div>

          <div className="p-2.5 bg-white rounded-xl border border-slate-200/60 shadow-2xs">
            <span className="text-[10.5px] text-slate-500 block">कुल वापस की गई रकम</span>
            <strong className="text-sm font-black text-rose-600 block mt-0.5">
              ₹{kpis.totalReturned.toLocaleString('en-IN')}
            </strong>
            <span className="text-[9.5px] text-slate-400 block mt-0.5">Repayments Returned</span>
          </div>
        </div>
      </div>

      {/* 4. ONLY TWO PRIMARY TRANSACTION BUTTONS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Button A: मैंने रकम दी */}
        <button
          type="button"
          onClick={handleOpenGave}
          className="p-4 sm:p-5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 flex items-center justify-between group transition-all cursor-pointer active:scale-98"
        >
          <div className="text-left">
            <span className="text-base sm:text-lg font-black block">
              मैंने रकम दी
            </span>
            <span className="text-xs text-rose-100 font-medium block mt-0.5">
              पैसे मेरे पास से गए
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:translate-x-0.5 transition-transform">
            <ArrowUpRight className="w-6 h-6 text-white" />
          </div>
        </button>

        {/* Button B: मुझे रकम मिली */}
        <button
          type="button"
          onClick={handleOpenReceived}
          className="p-4 sm:p-5 rounded-2xl bg-[#00B887] hover:bg-[#009E74] text-white shadow-md shadow-emerald-600/20 flex items-center justify-between group transition-all cursor-pointer active:scale-98"
        >
          <div className="text-left">
            <span className="text-base sm:text-lg font-black block">
              मुझे रकम मिली
            </span>
            <span className="text-xs text-emerald-100 font-medium block mt-0.5">
              पैसे मेरे पास आए
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:translate-x-0.5 transition-transform">
            <ArrowDownLeft className="w-6 h-6 text-white" />
          </div>
        </button>
      </div>

      {/* 5. PAYMENT MODE SUMMARY BREAKDOWN (Additional Feature) */}
      {data?.modeSummaries && data.modeSummaries.length > 0 && (
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              माध्यम अनुसार हिसाब (Payment Mode Breakdown)
            </span>
            <span className="text-[10px] text-slate-400">
              5 Modes Tracked
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            {data.modeSummaries.map((m) => (
              <div
                key={m.mode}
                className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 text-[11px]">{m.label.split(' ')[0]}</span>
                  <span className="text-[10px] text-slate-400">{m.count} tx</span>
                </div>
                <div className="mt-2 space-y-0.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">दी:</span>
                    <strong className="text-rose-600">₹{m.totalGiven.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">मिली:</span>
                    <strong className="text-emerald-600">₹{m.totalReceived.toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('CONTACTS')}
          className={`py-2 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'CONTACTS'
              ? 'bg-[#071F38] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          मेरे संपर्क ({data?.contacts?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('TRANSACTIONS')}
          className={`py-2 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'TRANSACTIONS'
              ? 'bg-[#071F38] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          हिसाब का पूरा रिकॉर्ड ({data?.recentTransactions?.length || 0})
        </button>

        {kpis.overdueCount > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('OVERDUE')}
            className={`py-2 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'OVERDUE'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            समय से बाकी ({kpis.overdueCount})
          </button>
        )}
      </div>

      {/* 7. TAB CONTENT: CONTACTS (मेरे संपर्क) */}
      {activeTab === 'CONTACTS' && (
        <div className="space-y-4">
          {/* Controls: Search, Filter, Sort */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="नाम या मोबाइल नंबर से खोजें..."
                className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Status Filter */}
              <select
                value={contactStatusFilter}
                onChange={(e) => setContactStatusFilter(e.target.value as any)}
                className="text-xs p-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C] font-medium"
              >
                <option value="ALL">सभी संपर्क (All)</option>
                <option value="TO_RECEIVE">मुझे लेने हैं (Receivable)</option>
                <option value="TO_PAY">मुझे देने हैं (Payable)</option>
                <option value="SETTLED">हिसाब पूरा (Settled)</option>
              </select>

              {/* Sort By */}
              <select
                value={contactSortBy}
                onChange={(e) => setContactSortBy(e.target.value as any)}
                className="text-xs p-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C] font-medium"
              >
                <option value="RECEIVE_HIGH">सबसे अधिक लेने हैं</option>
                <option value="PAY_HIGH">सबसे अधिक देने हैं</option>
                <option value="NAME">नाम (A-Z)</option>
                <option value="RECENT">हाल की गतिविधि</option>
              </select>
            </div>
          </div>

          {/* Contact Cards List */}
          {filteredContacts.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700">कोई संपर्क नहीं मिला।</p>
              <p className="mt-1 text-slate-400">
                नया लेन-देन दर्ज करने के लिए ऊपर &quot;मैंने रकम दी&quot; या &quot;मुझे रकम मिली&quot; पर क्लिक करें।
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredContacts.map((c) => {
                const isToReceive = c.amountToReceive > 0;
                const isToPay = c.amountToPay > 0;
                const isSettled = !isToReceive && !isToPay;

                return (
                  <div
                    key={c.id}
                    className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition-all shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Row: Name, Phone & Status Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link
                            href={`/free-khata/person/${c.id}`}
                            className="font-bold text-sm text-[#071F38] hover:text-[#EA580C] transition-colors"
                          >
                            {c.name}
                          </Link>
                          {c.phone && (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{c.phone}</span>
                            </span>
                          )}
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                            c.status === 'TO_RECEIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.status === 'TO_PAY'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {c.statusLabel}
                        </span>
                      </div>

                      {/* Balances Display */}
                      <div className="mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 block">मिलने वाली रकम:</span>
                          <strong className="text-xs font-black text-emerald-700 block mt-0.5">
                            ₹{c.amountToReceive.toLocaleString('en-IN')}
                          </strong>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block">देने वाली रकम:</span>
                          <strong className="text-xs font-black text-rose-700 block mt-0.5">
                            ₹{c.amountToPay.toLocaleString('en-IN')}
                          </strong>
                        </div>
                      </div>

                      {/* Net Position if both exist */}
                      {isToReceive && isToPay && (
                        <div className="mt-1.5 px-1 flex items-center justify-between text-[10.5px]">
                          <span className="text-slate-500">मेरी वर्तमान स्थिति:</span>
                          <strong
                            className={`font-black ${
                              c.netPosition >= 0 ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {c.netPosition >= 0 ? '+ ' : '- '}₹
                            {Math.abs(c.netPosition).toLocaleString('en-IN')}
                          </strong>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {c.phone && (c.amountToReceive > 0 || c.amountToPay > 0) && (
                          <button
                            type="button"
                            onClick={() => handleOpenContactWhatsApp(c)}
                            title="WhatsApp तगादा / Reminder"
                            className="p-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline text-[10.5px]">Reminder</span>
                          </button>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {c.transactionCount} लेन-देन
                        </span>
                      </div>

                      <Link
                        href={`/free-khata/person/${c.id}`}
                        className="px-3 py-1.5 bg-[#071F38] hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                      >
                        <span>खाता देखें</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 8. TAB CONTENT: TRANSACTION HISTORY (हिसाब का पूरा रिकॉर्ड) */}
      {activeTab === 'TRANSACTIONS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="खोजें (व्यक्ति, विवरण, आदि)..."
                className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                className="text-xs p-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C] font-medium"
              >
                <option value="ALL">सभी माध्यम (All Modes)</option>
                <option value="CASH">Cash (नकद)</option>
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="OTHER">Other</option>
              </select>

              <button
                type="button"
                onClick={handleExportCSV}
                className="p-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Excel / CSV Export"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span className="hidden sm:inline">Excel Export</span>
              </button>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
              कोई लेन-देन रिकॉर्ड नहीं मिला।
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
              {filteredTransactions.map((tx) => {
                const isGave = tx.type === 'GAVE';

                return (
                  <div
                    key={tx.id}
                    className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isGave ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {isGave ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/free-khata/person/${tx.contactId}`}
                            className="font-bold text-sm text-[#071F38] hover:text-[#EA580C]"
                          >
                            {tx.contactName}
                          </Link>
                          <span
                            className={`text-[9.5px] font-bold px-2 py-0.5 rounded ${
                              tx.paymentMode === 'UPI'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : tx.paymentMode === 'CASH'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {tx.paymentMode}
                          </span>
                        </div>

                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          {formatDate(tx.date)}
                          {tx.description ? ` • ${tx.description}` : ''}
                          {tx.paymentRef ? ` • Ref: ${tx.paymentRef}` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`font-black text-sm block ${
                          isGave ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {isGave ? '- ' : '+ '}₹{tx.amount.toLocaleString('en-IN')}
                      </span>

                      <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        <span
                          className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${
                            tx.status === 'SETTLED'
                              ? 'bg-slate-100 text-slate-600'
                              : tx.status === 'PARTIAL'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {tx.status === 'SETTLED' ? 'हिसाब पूरा' : tx.status === 'PARTIAL' ? 'आंशिक' : 'बाकी'}
                        </span>

                        {tx.balanceAmount > 0 && (
                          <button
                            type="button"
                            onClick={() => handleOpenRepay(tx)}
                            className="text-[10px] font-bold text-[#EA580C] hover:underline cursor-pointer ml-1"
                          >
                            वापसी दर्ज करें
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 9. TAB CONTENT: OVERDUE (समय से बाकी) */}
      {activeTab === 'OVERDUE' && (
        <div className="space-y-3">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              नीचे दी गई प्रविष्टियों की देय तिथि (Due Date) समाप्त हो चुकी है और रकम अभी बाकी है।
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {(data?.overdueEntries || []).map((o) => (
              <div key={o.id} className="p-4 flex items-center justify-between gap-3 text-xs">
                <div>
                  <Link
                    href={`/free-khata/person/${o.contactId}`}
                    className="font-bold text-sm text-[#071F38] hover:text-[#EA580C]"
                  >
                    {o.contactName}
                  </Link>
                  <span className="text-rose-600 text-[11px] block mt-0.5 font-semibold">
                    {o.daysOverdue} दिन पहले देय थी (Due: {formatDate(o.dueDate)})
                  </span>
                </div>

                <div className="text-right">
                  <span className="font-black text-sm text-rose-600 block">
                    ₹{o.balanceAmount.toLocaleString('en-IN')}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenWhatsApp(o)}
                    className="mt-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10.5px] font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>WhatsApp तगादा</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALS */}
      {txModalOpen && (
        <TransactionModal
          isOpen={txModalOpen}
          onClose={() => setTxModalOpen(false)}
          onSuccess={fetchDashboardData}
          primaryIntent={txPrimaryIntent}
          existingContacts={existingContacts}
        />
      )}

      {repayModalOpen && (
        <RepaymentModal
          isOpen={repayModalOpen}
          onClose={() => {
            setRepayModalOpen(false);
            setRepayTarget(null);
          }}
          onSuccess={fetchDashboardData}
          transaction={repayTarget}
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
    </div>
  );
}

export default function FreeKhataPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading Personal Khata...</div>}>
      <PersonalKhataDashboardContent />
    </Suspense>
  );
}
