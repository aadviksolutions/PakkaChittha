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
  Edit2,
  Trash2,
  BarChart3,
} from 'lucide-react';
import {
  TransactionModal,
  ContactOption,
  EditingKhataTransaction,
} from '@/components/free-khata/TransactionModal';
import { RepaymentModal, RepaymentTransactionTarget } from '@/components/free-khata/RepaymentModal';
import { WhatsAppReminderModal, WhatsAppReminderTarget } from '@/components/free-khata/WhatsAppReminderModal';
import { ContactEditModal, EditableKhataContact } from '@/components/free-khata/ContactEditModal';
import { AddContactModal } from '@/components/free-khata/AddContactModal';
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
  createdAt?: string | Date;
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
  const { t, locale } = useTranslation();
  const isHi = locale === 'hi';
  const filterParam = searchParams.get('filter') || 'ALL'; // 'ALL', 'GAVE', 'RECEIVED'
  const viewParam = searchParams.get('view');
  const actionParam = searchParams.get('action');

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'CONTACTS' | 'TRANSACTIONS' | 'MODES' | 'OVERDUE'>(
    viewParam === 'reminders' ? 'OVERDUE' : 'CONTACTS'
  );

  // Contact list filters & sorting
  const [contactStatusFilter, setContactStatusFilter] = useState<'ALL' | 'TO_RECEIVE' | 'TO_PAY' | 'SETTLED'>('ALL');
  const [contactSortBy, setContactSortBy] = useState<'NAME' | 'RECEIVE_HIGH' | 'PAY_HIGH' | 'RECENT'>('RECENT');
  const [modeFilter, setModeFilter] = useState<string>('ALL');

  // Modals state
  const [addContactModalOpen, setAddContactModalOpen] = useState(false);
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txPrimaryIntent, setTxPrimaryIntent] = useState<'GAVE' | 'RECEIVED'>('GAVE');
  const [editingTx, setEditingTx] = useState<EditingKhataTransaction | null>(null);
  const [editingContact, setEditingContact] = useState<EditableKhataContact | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  // Handle action parameter from URL
  useEffect(() => {
    if (actionParam === 'new_contact' || actionParam === 'add_contact') {
      setActiveTab('CONTACTS');
      setAddContactModalOpen(true);
    } else if (actionParam === 'gave') {
      setEditingTx(null);
      setTxPrimaryIntent('GAVE');
      setTxModalOpen(true);
    } else if (actionParam === 'received') {
      setEditingTx(null);
      setTxPrimaryIntent('RECEIVED');
      setTxModalOpen(true);
    }
  }, [actionParam]);

  // Primary Action Button Handlers
  const handleOpenGave = () => {
    setEditingTx(null);
    setTxPrimaryIntent('GAVE');
    setTxModalOpen(true);
  };

  const handleOpenReceived = () => {
    setEditingTx(null);
    setTxPrimaryIntent('RECEIVED');
    setTxModalOpen(true);
  };

  const handleOpenEditTx = (tx: KhataTransactionItem) => {
    setEditingTx({
      id: tx.id,
      contactId: tx.contactId,
      contactName: tx.contactName,
      contactPhone: tx.contactPhone,
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
  };

  const handleDeleteTx = async (tx: KhataTransactionItem) => {
    const msg = isHi
      ? `क्या आप ₹${tx.amount.toLocaleString('en-IN')} का यह हिसाब (${tx.contactName}) हटाना चाहते हैं? इससे जुड़ी वापसी एंट्री भी हट जाएंगी।`
      : `Delete ₹${tx.amount.toLocaleString('en-IN')} transaction for ${tx.contactName}? Linked repayments will also be deleted.`;
    if (!confirm(msg)) return;
    setDeletingId(tx.id);
    try {
      const res = await fetch(`/api/free-khata/transactions/${tx.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete transaction');
      }
      fetchDashboardData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete transaction');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteContact = async (c: KhataContactSummary) => {
    const msg = isHi
      ? `क्या आप संपर्क "${c.name}" और उनके सभी ${c.transactionCount} लेन-देन स्थायी रूप से हटाना चाहते हैं?`
      : `Permanently delete contact "${c.name}" and all ${c.transactionCount} linked transactions?`;
    if (!confirm(msg)) return;
    setDeletingId(c.id);
    try {
      const res = await fetch(`/api/free-khata/contacts/${c.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete contact');
      }
      fetchDashboardData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete contact');
    } finally {
      setDeletingId(null);
    }
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

    const getContactTime = (c: KhataContactSummary) =>
      new Date(c.lastActivityDate || (c.createdAt ? String(c.createdAt) : 0)).getTime();

    list.sort((a, b) => {
      if (contactSortBy === 'RECEIVE_HIGH') {
        const diff = b.amountToReceive - a.amountToReceive;
        if (diff !== 0) return diff;
        return getContactTime(b) - getContactTime(a);
      }
      if (contactSortBy === 'PAY_HIGH') {
        const diff = b.amountToPay - a.amountToPay;
        if (diff !== 0) return diff;
        return getContactTime(b) - getContactTime(a);
      }
      if (contactSortBy === 'NAME') return a.name.localeCompare(b.name);
      return getContactTime(b) - getContactTime(a);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-[#E1E7EF]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-[#173653] tracking-tight">
              Personal Khata
            </h1>
            <span className="text-[10px] sm:text-[11px] font-bold text-[#006B2B] bg-[#E8F7ED] border border-[#B8E6C7] px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
              <Sparkles className="w-3 h-3 text-[#008A36]" />
              <span>100% Free Forever</span>
            </span>
          </div>
          <p className="text-xs font-medium text-[#64748B] mt-1">
            Har paise ka hisaab, bilkul aasaan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/free-khata/reports"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#173653] hover:bg-[#102A43] text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span>Reports &amp; PDF/Excel</span>
          </Link>
          <LanguageSelector variant="compact" />
          <button
            type="button"
            onClick={fetchDashboardData}
            title="Refresh Khata"
            className="p-2 bg-white border border-[#E1E7EF] text-[#64748B] hover:text-[#173653] rounded-xl hover:bg-[#F8FAFC] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-[#FFF0F0] border border-[#FFCCD2] text-[#B80012] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#E00016] shrink-0" />
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
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#008A36] to-[#006B2B] text-white shadow-md shadow-emerald-900/10 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider">
              {t('freeKhata.amountToReceive')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black tracking-tight block tabular-nums">
              ₹{kpis.amountToReceive.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-emerald-100 block mt-1 font-medium">
              {t('freeKhata.amountToReceiveDesc')}
            </span>
          </div>
        </div>

        {/* Card 2: कुल देने वाली रकम (Amount to Pay) - RED */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#E00016] to-[#B80012] text-white shadow-md shadow-rose-900/10 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-100 uppercase tracking-wider">
              {t('freeKhata.amountToPay')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black tracking-tight block tabular-nums">
              ₹{kpis.amountToPay.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-rose-100 block mt-1 font-medium">
              {t('freeKhata.amountToPayDesc')}
            </span>
          </div>
        </div>

        {/* Card 3: मेरी वर्तमान स्थिति (Net Position) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E1E7EF] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
              {t('freeKhata.netPosition')}
            </span>
            <span
              className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${kpis.netPosition > 0
                ? 'bg-[#E8F7ED] text-[#006B2B] border border-[#B8E6C7]'
                : kpis.netPosition < 0
                  ? 'bg-[#FFF0F0] text-[#B80012] border border-[#FFCCD2]'
                  : 'bg-[#F8FAFC] text-[#64748B] border border-[#E1E7EF]'
                }`}
            >
              {kpis.netPosition > 0 ? `+ ${t('freeKhata.toReceiveStatus')}` : kpis.netPosition < 0 ? `- ${t('freeKhata.toPayStatus')}` : t('freeKhata.settled')}
            </span>
          </div>

          <div className="mt-3">
            <span
              className={`text-2xl sm:text-3xl font-black tracking-tight block tabular-nums ${kpis.netPosition > 0
                ? 'text-[#008A36]'
                : kpis.netPosition < 0
                  ? 'text-[#E00016]'
                  : 'text-[#172B4D]'
                }`}
            >
              {kpis.netPosition > 0 && '+ '}
              {kpis.netPosition < 0 && '- '}₹
              {Math.abs(kpis.netPosition).toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-[#64748B] block mt-1 font-medium leading-relaxed">
              {kpis.netPosition > 0
                ? (isHi ? `आपको कुल ${Math.abs(kpis.netPosition).toLocaleString('en-IN')} रुपये अधिक मिलने बाकी हैं।` : `You have ₹${Math.abs(kpis.netPosition).toLocaleString('en-IN')} more to receive in total.`)
                : kpis.netPosition < 0
                  ? (isHi ? `आपको कुल ${Math.abs(kpis.netPosition).toLocaleString('en-IN')} रुपये अधिक देने बाकी हैं।` : `You have ₹${Math.abs(kpis.netPosition).toLocaleString('en-IN')} more to pay in total.`)
                  : (isHi ? 'आपका कुल हिसाब बराबर है।' : 'Your accounts are completely balanced.')}
            </span>
          </div>
        </div>
      </div>

      {/* 3. HISTORICAL CUMULATIVE TOTALS */}
      <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E1E7EF]">
        <span className="text-[10.5px] font-black uppercase tracking-wider text-[#64748B] block mb-2.5">
          {t('freeKhata.totalSummary')}
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 bg-white rounded-xl border border-[#E1E7EF] shadow-2xs">
            <span className="text-[10.5px] text-[#64748B] block">{t('freeKhata.totalAmountGiven')}</span>
            <strong className="text-sm font-black text-[#173653] block mt-0.5 tabular-nums">
              ₹{kpis.totalGiven.toLocaleString('en-IN')}
            </strong>
            <span className="text-[9.5px] text-[#64748B] block mt-0.5">Original Lent</span>
          </div>

          <div className="p-2.5 bg-white rounded-xl border border-[#E1E7EF] shadow-2xs">
            <span className="text-[10.5px] text-[#64748B] block">{t('freeKhata.totalAmountTaken')}</span>
            <strong className="text-sm font-black text-[#173653] block mt-0.5 tabular-nums">
              ₹{kpis.totalTaken.toLocaleString('en-IN')}
            </strong>
            <span className="text-[9.5px] text-[#64748B] block mt-0.5">Original Borrowed</span>
          </div>

          <div className="p-2.5 bg-white rounded-xl border border-[#E1E7EF] shadow-2xs">
            <span className="text-[10.5px] text-[#64748B] block">{t('freeKhata.totalAmountReceivedBack')}</span>
            <strong className="text-sm font-black text-[#008A36] block mt-0.5 tabular-nums">
              ₹{kpis.totalReceivedBack.toLocaleString('en-IN')}
            </strong>
            <span className="text-[9.5px] text-[#64748B] block mt-0.5">Repayments Received</span>
          </div>

          <div className="p-2.5 bg-white rounded-xl border border-[#E1E7EF] shadow-2xs">
            <span className="text-[10.5px] text-[#64748B] block">{t('freeKhata.totalAmountReturned')}</span>
            <strong className="text-sm font-black text-[#E00016] block mt-0.5 tabular-nums">
              ₹{kpis.totalReturned.toLocaleString('en-IN')}
            </strong>
            <span className="text-[9.5px] text-[#64748B] block mt-0.5">Repayments Returned</span>
          </div>
        </div>
      </div>

      {/* 4. ONLY TWO PRIMARY TRANSACTION BUTTONS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Button A: मैंने रकम दी */}
        <button
          type="button"
          onClick={handleOpenGave}
          className="p-4 sm:p-5 rounded-2xl bg-[#E00016] hover:bg-[#B80012] text-white shadow-md shadow-red-700/20 flex items-center justify-between group transition-all cursor-pointer active:scale-98 min-h-[56px]"
        >
          <div className="text-left">
            <span className="text-base sm:text-lg font-black block">
              {t('freeKhata.iGave')}
            </span>
            <span className="text-xs text-rose-100 font-medium block mt-0.5">
              {t('freeKhata.iGaveSub')}
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
          className="p-4 sm:p-5 rounded-2xl bg-[#008A36] hover:bg-[#006B2B] text-white shadow-md shadow-emerald-700/20 flex items-center justify-between group transition-all cursor-pointer active:scale-98 min-h-[56px]"
        >
          <div className="text-left">
            <span className="text-base sm:text-lg font-black block">
              {t('freeKhata.iReceived')}
            </span>
            <span className="text-xs text-emerald-100 font-medium block mt-0.5">
              {t('freeKhata.iReceivedSub')}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:translate-x-0.5 transition-transform">
            <ArrowDownLeft className="w-6 h-6 text-white" />
          </div>
        </button>
      </div>

      {/* 5. PAYMENT MODE SUMMARY BREAKDOWN (Additional Feature) */}
      {data?.modeSummaries && data.modeSummaries.length > 0 && (
        <div className="p-3.5 bg-white rounded-2xl border border-[#E1E7EF] shadow-2xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E1E7EF]">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#64748B]">
              माध्यम अनुसार हिसाब (Payment Mode Breakdown)
            </span>
            <span className="text-[10px] text-[#64748B]">
              5 Modes Tracked
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            {data.modeSummaries.map((m) => (
              <div
                key={m.mode}
                className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E1E7EF] flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#172B4D] text-[11px]">{m.label.split(' ')[0]}</span>
                  <span className="text-[10px] text-[#64748B]">{m.count} tx</span>
                </div>
                <div className="mt-2 space-y-0.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-[#64748B]">दी:</span>
                    <strong className="text-[#E00016] tabular-nums">₹{m.totalGiven.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-[#64748B]">मिली:</span>
                    <strong className="text-[#008A36] tabular-nums">₹{m.totalReceived.toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-[#E1E7EF] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('CONTACTS')}
          className={`py-2 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'CONTACTS'
            ? 'bg-[#173653] text-white shadow-xs'
            : 'bg-white text-[#64748B] hover:bg-[#F8FAFC] border border-[#E1E7EF]'
            }`}
        >
          {t('freeKhata.contacts')} ({data?.contacts?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('TRANSACTIONS')}
          className={`py-2 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'TRANSACTIONS'
            ? 'bg-[#173653] text-white shadow-xs'
            : 'bg-white text-[#64748B] hover:bg-[#F8FAFC] border border-[#E1E7EF]'
            }`}
        >
          {t('freeKhata.transactions')} ({data?.recentTransactions?.length || 0})
        </button>

        {kpis.overdueCount > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('OVERDUE')}
            className={`py-2 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'OVERDUE'
              ? 'bg-[#E00016] text-white shadow-xs'
              : 'bg-[#FFF0F0] text-[#B80012] hover:bg-rose-100 border border-[#FFCCD2]'
              }`}
          >
            {t('freeKhata.overdue')} ({kpis.overdueCount})
          </button>
        )}
      </div>

      {/* 7. TAB CONTENT: CONTACTS (मेरे संपर्क) */}
      {activeTab === 'CONTACTS' && (
        <div className="space-y-4">
          {/* Controls: Search, Filter, Sort */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('freeKhata.searchPlaceholder')}
                className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-[#E1E7EF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2878CE]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Add Contact Button */}
              <button
                type="button"
                onClick={() => setAddContactModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#008A36] hover:bg-[#006B2B] text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{isHi ? '+ नया संपर्क जोड़ें' : '+ Add Contact'}</span>
              </button>

              {/* Status Filter */}
              <select
                value={contactStatusFilter}
                onChange={(e) => setContactStatusFilter(e.target.value as any)}
                className="text-xs p-2 bg-white border border-[#E1E7EF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2878CE] font-medium text-[#172B4D]"
              >
                <option value="ALL">{isHi ? 'सभी संपर्क (All)' : 'All Contacts'}</option>
                <option value="TO_RECEIVE">{isHi ? 'मुझे लेने हैं (Receivable)' : 'To Receive'}</option>
                <option value="TO_PAY">{isHi ? 'मुझे देने हैं (Payable)' : 'To Pay'}</option>
                <option value="SETTLED">{isHi ? 'हिसाब पूरा (Settled)' : 'Settled'}</option>
              </select>

              {/* Sort By */}
              <select
                value={contactSortBy}
                onChange={(e) => setContactSortBy(e.target.value as any)}
                className="text-xs p-2 bg-white border border-[#E1E7EF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2878CE] font-medium text-[#172B4D]"
              >
                <option value="RECENT">{isHi ? 'हाल की गतिविधि' : 'Recent Activity'}</option>
                <option value="RECEIVE_HIGH">{isHi ? 'सबसे अधिक लेने हैं' : 'Highest to Receive'}</option>
                <option value="PAY_HIGH">{isHi ? 'सबसे अधिक देने हैं' : 'Highest to Pay'}</option>
                <option value="NAME">{isHi ? 'नाम (A-Z)' : 'Name (A-Z)'}</option>
              </select>
            </div>
          </div>

          {/* Contact Cards List */}
          {filteredContacts.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-[#E1E7EF] text-xs text-[#64748B]">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-[#172B4D]">{t('freeKhata.noContacts')}</p>
              <p className="mt-1 text-[#64748B]">
                {isHi ? 'सीधे नया संपर्क जोड़ें या ऊपर "मैंने रकम दी" / "मुझे रकम मिली" पर क्लिक करें।' : 'Directly add a new contact or click "I Gave Money" / "I Received Money" above.'}
              </p>
              <button
                type="button"
                onClick={() => setAddContactModalOpen(true)}
                className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 bg-[#008A36] hover:bg-[#006B2B] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isHi ? '+ नया संपर्क जोड़ें (Add Contact)' : '+ Add New Contact'}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredContacts.map((c) => {
                const isToReceive = c.amountToReceive > 0;
                const isToPay = c.amountToPay > 0;
                const isSettled = !isToReceive && !isToPay;
                const isNewContact = c.transactionCount === 0;
                const badgeLabel = isNewContact
                  ? (isHi ? 'नया संपर्क' : 'New Contact')
                  : c.status === 'TO_RECEIVE'
                  ? (isHi ? 'मुझे लेने हैं' : 'To Receive')
                  : c.status === 'TO_PAY'
                  ? (isHi ? 'मुझे देने हैं' : 'To Pay')
                  : (isHi ? 'हिसाब पूरा' : 'Settled');

                return (
                  <div
                    key={c.id}
                    className="p-4 bg-white rounded-2xl border border-[#E1E7EF] hover:border-[#2878CE]/40 transition-all shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Row: Name, Phone & Status Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link
                            href={`/free-khata/person/${c.id}`}
                            className="font-bold text-sm text-[#173653] hover:text-[#2878CE] transition-colors"
                          >
                            {c.name}
                          </Link>
                          {c.phone && (
                            <span className="text-[11px] text-[#64748B] flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-[#64748B]" />
                              <span>{c.phone}</span>
                            </span>
                          )}
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`text-[10px] font-black px-2.5 py-1 rounded-full ${c.status === 'TO_RECEIVE'
                            ? 'bg-[#E8F7ED] text-[#006B2B] border border-[#B8E6C7]'
                            : c.status === 'TO_PAY'
                              ? 'bg-[#FFF0F0] text-[#B80012] border border-[#FFCCD2]'
                              : 'bg-[#F8FAFC] text-[#64748B] border border-[#E1E7EF]'
                            }`}
                        >
                          {badgeLabel}
                        </span>
                      </div>

                      {/* Balances Display */}
                      <div className="mt-3.5 p-3 rounded-xl bg-[#F8FAFC] border border-[#E1E7EF] grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-[#64748B] block">{t('freeKhata.amountToReceive')}:</span>
                          <strong className="text-xs font-black text-[#008A36] block mt-0.5 tabular-nums">
                            ₹{c.amountToReceive.toLocaleString('en-IN')}
                          </strong>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-[#64748B] block">{t('freeKhata.amountToPay')}:</span>
                          <strong className="text-xs font-black text-[#E00016] block mt-0.5 tabular-nums">
                            ₹{c.amountToPay.toLocaleString('en-IN')}
                          </strong>
                        </div>
                      </div>

                      {/* Net Position if both exist */}
                      {isToReceive && isToPay && (
                        <div className="mt-1.5 px-1 flex items-center justify-between text-[10.5px]">
                          <span className="text-[#64748B]">{t('freeKhata.netPosition')}:</span>
                          <strong
                            className={`font-black tabular-nums ${c.netPosition >= 0 ? 'text-[#008A36]' : 'text-[#E00016]'
                              }`}
                          >
                            {c.netPosition >= 0 ? '+ ' : '- '}₹
                            {Math.abs(c.netPosition).toLocaleString('en-IN')}
                          </strong>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-4 pt-3 border-t border-[#E1E7EF] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {c.phone && (c.amountToReceive > 0 || c.amountToPay > 0) && (
                          <button
                            type="button"
                            onClick={() => handleOpenContactWhatsApp(c)}
                            title={isHi ? 'WhatsApp तकादा' : 'WhatsApp Reminder'}
                            className="p-1.5 bg-[#E8F7ED] text-[#006B2B] border border-[#B8E6C7] hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline text-[10.5px]">Reminder</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditingContact(c)}
                          title={isHi ? 'संपर्क संपादित करें' : 'Edit Contact'}
                          className="p-1.5 bg-[#F8FAFC] text-[#64748B] border border-[#E1E7EF] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === c.id}
                          onClick={() => handleDeleteContact(c)}
                          title={isHi ? 'संपर्क हटाएं' : 'Delete Contact'}
                          className="p-1.5 bg-[#FFF0F0] text-[#B80012] border border-[#FFCCD2] hover:bg-rose-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] text-[#64748B]">
                          {c.transactionCount} {isHi ? 'लेन-देन' : 'entries'}
                        </span>
                      </div>

                      <Link
                        href={`/free-khata/person/${c.id}`}
                        className="px-3 py-1.5 bg-[#173653] hover:bg-[#102A43] text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                      >
                        <span>{isHi ? 'खाता देखें' : 'View Ledger'}</span>
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
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="खोजें (व्यक्ति, विवरण, आदि)..."
                className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-[#E1E7EF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2878CE]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                className="text-xs p-2 bg-white border border-[#E1E7EF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2878CE] font-medium text-[#172B4D]"
              >
                <option value="ALL">सभी माध्यम (All Modes)</option>
                <option value="CASH">Cash (नकद)</option>
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="OTHER">Other</option>
              </select>

              <a
                href="/api/free-khata/reports/export?format=xlsx"
                className="p-2 bg-[#E8F7ED] border border-[#B8E6C7] text-[#006B2B] hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                title="Download Professional Excel (.xlsx) Workbook"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#008A36]" />
                <span className="hidden sm:inline">Excel (.xlsx)</span>
              </a>
              <Link
                href="/free-khata/reports"
                className="p-2 bg-[#173653] text-white hover:bg-[#102A43] rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                title="Open Consolidated Reports, PDF & Share"
              >
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Full Report</span>
              </Link>
              <button
                type="button"
                onClick={handleExportCSV}
                className="p-2 bg-white border border-[#E1E7EF] text-[#172B4D] hover:bg-[#F8FAFC] rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Quick CSV Export"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#64748B]" />
                <span className="hidden sm:inline">CSV</span>
              </button>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-[#E1E7EF] text-xs text-[#64748B]">
              {t('freeKhata.noTransactions')}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E1E7EF] overflow-hidden shadow-xs divide-y divide-[#E1E7EF]">
              {filteredTransactions.map((tx) => {
                const isGave = tx.type === 'GAVE';

                return (
                  <div
                    key={tx.id}
                    className="p-3.5 sm:p-4 hover:bg-[#F8FAFC] transition-colors flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isGave ? 'bg-[#FFF0F0] text-[#B80012]' : 'bg-[#E8F7ED] text-[#006B2B]'
                          }`}
                      >
                        {isGave ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <Link
                            href={`/free-khata/person/${tx.contactId}`}
                            className="font-bold text-sm text-[#173653] hover:text-[#2878CE] truncate max-w-[140px] xs:max-w-[180px] sm:max-w-none"
                          >
                            {tx.contactName}
                          </Link>
                          <span
                            className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded shrink-0 ${tx.paymentMode === 'UPI'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : tx.paymentMode === 'CASH'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                          >
                            {tx.paymentMode}
                          </span>
                        </div>

                        <span className="text-[11px] text-[#64748B] block mt-0.5 break-words-safe">
                          {formatDate(tx.date)}
                          {tx.description ? ` • ${tx.description}` : ''}
                          {tx.paymentRef ? ` • Ref: ${tx.paymentRef}` : ''}
                        </span>

                        {/* Status Chip & Action Buttons placed neatly in flex-wrap under details */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span
                            className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded shrink-0 ${tx.status === 'SETTLED'
                              ? 'bg-[#F8FAFC] text-[#64748B] border border-[#E1E7EF]'
                              : tx.status === 'PARTIAL'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-[#FFF0F0] text-[#B80012] border border-[#FFCCD2]'
                              }`}
                          >
                            {tx.status === 'SETTLED' ? (isHi ? 'हिसाब पूरा' : 'Settled') : tx.status === 'PARTIAL' ? (isHi ? 'आंशिक' : 'Partial') : (isHi ? 'बाकी' : 'Pending')}
                          </span>

                          {tx.balanceAmount > 0 && (
                            <button
                              type="button"
                              onClick={() => handleOpenRepay(tx)}
                              className="text-[10px] sm:text-[10.5px] font-bold text-[#2878CE] hover:underline cursor-pointer"
                            >
                              {isHi ? 'वापसी दर्ज करें' : 'Record Repayment'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEditTx(tx)}
                            title={isHi ? 'संपादित करें' : 'Edit Entry'}
                            className="p-1 text-[#64748B] hover:text-[#173653] hover:bg-slate-100 rounded-md cursor-pointer transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === tx.id}
                            onClick={() => handleDeleteTx(tx)}
                            title={isHi ? 'हटाएं' : 'Delete Entry'}
                            className="p-1 text-[#E00016] hover:text-[#B80012] hover:bg-[#FFF0F0] rounded-md cursor-pointer transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Transaction Amount - strictly isolated, right-aligned, whitespace-nowrap, never clipped */}
                    <div className="text-right shrink-0 pl-2">
                      <span
                        className={`font-black text-sm sm:text-base block tabular-nums whitespace-nowrap ${isGave ? 'text-[#E00016]' : 'text-[#008A36]'
                          }`}
                      >
                        {isGave ? '- ' : '+ '}₹{tx.amount.toLocaleString('en-IN')}
                      </span>
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
          <div className="p-3 bg-[#FFF0F0] border border-[#FFCCD2] rounded-xl text-xs text-[#B80012] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#E00016] shrink-0" />
            <span>
              {isHi
                ? 'नीचे दी गई प्रविष्टियों की देय तिथि (Due Date) समाप्त हो चुकी है और रकम अभी बाकी है।'
                : 'The following entries have passed their due date and remain outstanding.'}
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-[#E1E7EF] divide-y divide-[#E1E7EF] overflow-hidden">
            {(data?.overdueEntries || []).map((o) => (
              <div key={o.id} className="p-3.5 sm:p-4 flex items-start justify-between gap-3 text-xs">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/free-khata/person/${o.contactId}`}
                    className="font-bold text-sm text-[#173653] hover:text-[#2878CE] truncate block"
                  >
                    {o.contactName}
                  </Link>
                  <span className="text-[#E00016] text-[11px] block mt-0.5 font-semibold break-words-safe">
                    {o.daysOverdue} {isHi ? 'दिन पहले देय थी' : 'days overdue'} (Due: {formatDate(o.dueDate)})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenWhatsApp(o)}
                    className="mt-2 px-2.5 py-1 bg-[#008A36] hover:bg-[#006B2B] text-white rounded-lg text-[10.5px] font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>{isHi ? 'WhatsApp तकादा' : 'WhatsApp Reminder'}</span>
                  </button>
                </div>

                <div className="text-right shrink-0 pl-2">
                  <span className="font-black text-sm sm:text-base text-[#E00016] block tabular-nums whitespace-nowrap">
                    ₹{o.balanceAmount.toLocaleString('en-IN')}
                  </span>
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
          onClose={() => {
            setTxModalOpen(false);
            setEditingTx(null);
          }}
          onSuccess={() => {
            setEditingTx(null);
            fetchDashboardData();
          }}
          primaryIntent={txPrimaryIntent}
          editingTransaction={editingTx}
          existingContacts={existingContacts}
        />
      )}

      {editingContact && (
        <ContactEditModal
          isOpen={Boolean(editingContact)}
          onClose={() => setEditingContact(null)}
          onSuccess={() => {
            setEditingContact(null);
            fetchDashboardData();
          }}
          contact={editingContact}
        />
      )}

      {addContactModalOpen && (
        <AddContactModal
          isOpen={addContactModalOpen}
          onClose={() => setAddContactModalOpen(false)}
          onSuccess={() => {
            fetchDashboardData();
          }}
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
