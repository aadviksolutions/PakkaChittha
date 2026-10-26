'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
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
} from 'lucide-react';
import { TransactionModal, ContactOption } from '@/components/free-khata/TransactionModal';
import { RepaymentModal, RepaymentTransactionTarget } from '@/components/free-khata/RepaymentModal';
import { WhatsAppReminderModal, WhatsAppReminderTarget } from '@/components/free-khata/WhatsAppReminderModal';
import { formatCurrency, formatDate } from '@/lib/services/khataService';
import { useTranslation } from '@/i18n/context';
import { LanguageSelector } from '@/components/shared/LanguageSelector';

interface KhataContactSummary {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  totalGave: number;
  totalReceived: number;
  gaveOutstanding: number;
  receivedOutstanding: number;
  netBalance: number;
  transactionCount: number;
  lastActivityDate: string;
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
  status: 'PENDING' | 'PARTIAL' | 'SETTLED';
  repayments: Array<{
    id: string;
    amount: number;
    date: string;
    paymentMode: string;
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

interface DashboardData {
  kpis: {
    totalGave: number;
    totalReceived: number;
    moneyToCollect: number;
    moneyToRepay: number;
    netPosition: number;
    totalContacts: number;
    overdueCount: number;
  };
  recentTransactions: KhataTransactionItem[];
  overdueEntries: OverdueEntryItem[];
  contacts: KhataContactSummary[];
}

function FreeKhataDashboardContent() {
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const filterParam = searchParams.get('filter') || 'ALL'; // 'ALL', 'GAVE', 'RECEIVED'
  const viewParam = searchParams.get('view'); // 'reminders'

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'PEOPLE' | 'TRANSACTIONS' | 'OVERDUE'>(
    viewParam === 'reminders' ? 'OVERDUE' : 'PEOPLE'
  );

  // Modals state
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txModalType, setTxModalType] = useState<'GAVE' | 'RECEIVED'>('GAVE');
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
        throw new Error(json.error || 'Failed to load Khata dashboard');
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

  // Quick action triggers
  const handleOpenGave = () => {
    setTxModalType('GAVE');
    setTxModalOpen(true);
  };

  const handleOpenReceived = () => {
    setTxModalType('RECEIVED');
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
    setWaTarget({
      contactId: c.id,
      contactName: c.name,
      phone: c.phone,
      amount: Math.abs(c.netBalance),
      date: c.lastActivityDate,
      type: c.netBalance >= 0 ? 'GAVE' : 'RECEIVED',
    });
    setWaModalOpen(true);
  };

  // Filtered contacts based on search query
  const filteredContacts = (data?.contacts || []).filter((c) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      c.name.toLowerCase().includes(query) ||
      (c.phone && c.phone.includes(query));

    if (!matchesSearch) return false;

    if (filterParam === 'GAVE') return c.gaveOutstanding > 0;
    if (filterParam === 'RECEIVED') return c.receivedOutstanding > 0;
    return true;
  });

  // Filtered transactions based on search query & filter
  const filteredTransactions = (data?.recentTransactions || []).filter((t) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      t.contactName.toLowerCase().includes(query) ||
      (t.contactPhone && t.contactPhone.includes(query)) ||
      (t.description && t.description.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    if (filterParam === 'GAVE') return t.type === 'GAVE';
    if (filterParam === 'RECEIVED') return t.type === 'RECEIVED';
    return true;
  });

  // Extract contact options for dropdown
  const existingContacts: ContactOption[] = (data?.contacts || []).map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
  }));

  const kpis = data?.kpis || {
    totalGave: 0,
    totalReceived: 0,
    moneyToCollect: 0,
    moneyToRepay: 0,
    netPosition: 0,
    totalContacts: 0,
    overdueCount: 0,
  };

  return (
    <div className="space-y-5 pb-24 md:pb-12 max-w-5xl mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-[#071F38] tracking-tight">
              {t('freeKhata.title')}
            </h1>
            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
              <Sparkles className="w-3 h-3 text-[#00B887]" />
              <span>100% Free Forever</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t('freeKhata.tagline')}
          </p>
        </div>

        {/* Desktop Quick Actions */}
        <div className="hidden sm:flex items-center gap-2.5">
          <LanguageSelector variant="compact" />

          <button
            type="button"
            onClick={handleOpenGave}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>+ {t('freeKhata.youWillGive')}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenReceived}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#00B887] hover:bg-[#009E74] text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>+ {t('freeKhata.youWillGet')}</span>
          </button>

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
            Retry
          </button>
        </div>
      )}

      {/* 4 Primary KPI Summary Balance Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Money I Have to Collect (You Will Get) */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-[#009E74] text-white shadow-md shadow-emerald-500/10 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider">
              {t('freeKhata.youWillGet')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="mt-3">
            <span className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight block">
              ₹{kpis.moneyToCollect.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-emerald-100 block mt-0.5 font-medium">
              Lene Hai (Receivable)
            </span>
          </div>
        </div>

        {/* Card 2: Money I Have to Repay (You Will Pay) */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-md shadow-rose-500/10 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-100 uppercase tracking-wider">
              {t('freeKhata.youWillGive')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="mt-3">
            <span className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight block">
              ₹{kpis.moneyToRepay.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-rose-100 block mt-0.5 font-medium">
              Dene Hai (Payable)
            </span>
          </div>
        </div>

        {/* Card 3: Total I Gave (Original Sum Given) */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total I Gave
            </span>
            <span className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <CreditCard className="w-4 h-4" />
            </span>
          </div>

          <div className="mt-3">
            <span className="text-lg sm:text-xl font-black text-[#071F38] block">
              ₹{kpis.totalGave.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Original lending sum
            </span>
          </div>
        </div>

        {/* Card 4: Total I Received (Original Sum Received) */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total I Received
            </span>
            <span className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>

          <div className="mt-3">
            <span className="text-lg sm:text-xl font-black text-[#071F38] block">
              ₹{kpis.totalReceived.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Original borrowing sum
            </span>
          </div>
        </div>
      </div>

      {/* Overdue Entries Warning Alert (If Any) */}
      {kpis.overdueCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-2xs animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">
                {kpis.overdueCount} Overdue {kpis.overdueCount === 1 ? 'Entry' : 'Entries'}
              </strong>
              <p className="text-[11.5px] text-amber-800 mt-0.5">
                Some repayment dates have passed. You can send free reminder messages via WhatsApp.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('OVERDUE')}
            className="self-start sm:self-auto px-3.5 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl transition-colors cursor-pointer text-xs shrink-0"
          >
            Review Overdue ({kpis.overdueCount})
          </button>
        </div>
      )}

      {/* Main Container: Search, Tabs & Content */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Search & Tab Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, mobile number or note..."
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-[#00B887]/30 focus:border-[#00B887] transition-all"
            />
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('PEOPLE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'PEOPLE'
                  ? 'bg-white text-[#071F38] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              People ({data?.contacts.length || 0})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('TRANSACTIONS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'TRANSACTIONS'
                  ? 'bg-white text-[#071F38] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Recent Entries
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('OVERDUE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'OVERDUE'
                  ? 'bg-white text-[#071F38] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Overdue</span>
              {kpis.overdueCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-500 text-white font-extrabold">
                  {kpis.overdueCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab 1: People / Contacts List */}
        {activeTab === 'PEOPLE' && (
          <div className="divide-y divide-slate-100">
            {filteredContacts.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-14 h-14 rounded-3xl bg-emerald-50 text-[#00B887] border border-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <Users className="w-7 h-7 text-[#00B887]" />
                </div>
                <h3 className="font-bold text-sm text-[#071F38]">No Contacts Found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {searchQuery
                    ? `No person matches "${searchQuery}". Try a different name or number.`
                    : 'Start your personal ledger by adding someone you gave money to or received money from.'}
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenGave}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    + I Gave Money
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenReceived}
                    className="px-3.5 py-2 bg-[#00B887] hover:bg-[#009E74] text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    + I Received Money
                  </button>
                </div>
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const initials = contact.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                const willGet = contact.netBalance > 0;
                const willPay = contact.netBalance < 0;
                const isSettled = contact.netBalance === 0;

                return (
                  <div
                    key={contact.id}
                    className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3 group"
                  >
                    {/* Left: Avatar, Name & Phone */}
                    <Link
                      href={`/free-khata/person/${contact.id}`}
                      className="flex items-center gap-3.5 min-w-0 flex-1"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-200 border border-slate-200/80 text-[#071F38] font-black text-xs flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                        {initials}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs sm:text-sm text-[#071F38] truncate group-hover:text-[#008F91] transition-colors">
                            {contact.name}
                          </h4>
                          {contact.phone && (
                            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                              {contact.phone}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>{contact.transactionCount} entries</span>
                          <span>•</span>
                          <span>Last: {formatDate(contact.lastActivityDate)}</span>
                        </div>
                      </div>
                    </Link>

                    {/* Right: Net Balance & Quick Actions */}
                    <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
                      {/* Amount & Status Badge */}
                      <div className="text-right">
                        {willGet && (
                          <>
                            <span className="text-xs sm:text-sm font-black text-[#00B887] block">
                              ₹{contact.netBalance.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md">
                              You'll Get
                            </span>
                          </>
                        )}

                        {willPay && (
                          <>
                            <span className="text-xs sm:text-sm font-black text-rose-600 block">
                              ₹{Math.abs(contact.netBalance).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded-md">
                              You'll Pay
                            </span>
                          </>
                        )}

                        {isSettled && (
                          <>
                            <span className="text-xs sm:text-sm font-black text-slate-400 block">
                              ₹0.00
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded-md">
                              Settled
                            </span>
                          </>
                        )}
                      </div>

                      {/* WhatsApp Reminder Shortcut (if person owes money) */}
                      {willGet && (
                        <button
                          type="button"
                          onClick={() => handleOpenContactWhatsApp(contact)}
                          title="Remind on WhatsApp"
                          className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-4 h-4 text-[#00B887]" />
                        </button>
                      )}

                      {/* Arrow to Person Ledger */}
                      <Link
                        href={`/free-khata/person/${contact.id}`}
                        className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Recent Transactions Feed */}
        {activeTab === 'TRANSACTIONS' && (
          <div className="divide-y divide-slate-100">
            {filteredTransactions.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No transactions recorded yet. Use "+ I Gave" or "+ I Received" to create an entry.
              </div>
            ) : (
              filteredTransactions.map((tx) => {
                const isGave = tx.type === 'GAVE';
                const hasPendingBalance = tx.balanceAmount > 0;

                return (
                  <div
                    key={tx.id}
                    className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    {/* Left: Contact, Date, Note */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isGave
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : 'bg-emerald-50 text-[#00B887] border border-emerald-200'
                        }`}
                      >
                        {isGave ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/free-khata/person/${tx.contactId}`}
                            className="font-bold text-xs sm:text-sm text-[#071F38] hover:underline truncate"
                          >
                            {tx.contactName}
                          </Link>
                          <span
                            className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded ${
                              isGave
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {isGave ? 'I Gave' : 'I Received'}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {formatDate(tx.date)}
                          {tx.dueDate && (
                            <span className="text-amber-700 ml-2 font-medium">
                              (Due: {formatDate(tx.dueDate)})
                            </span>
                          )}
                          {tx.description && (
                            <span className="text-slate-400 ml-2 italic">
                              "{tx.description}"
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Right: Amounts & Action Buttons */}
                    <div className="flex items-center justify-between sm:justify-end gap-3.5 pl-12 sm:pl-0">
                      <div className="text-right">
                        <span className="text-xs sm:text-sm font-black text-slate-800 block">
                          ₹{tx.amount.toLocaleString('en-IN')}
                        </span>
                        <div className="text-[10.5px]">
                          {tx.status === 'SETTLED' ? (
                            <span className="font-bold text-emerald-600">Settled Full</span>
                          ) : (
                            <span className="text-slate-500">
                              Bal: <strong className="text-rose-600 font-bold">₹{tx.balanceAmount}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Repayment and WhatsApp buttons */}
                      <div className="flex items-center gap-1.5">
                        {hasPendingBalance && (
                          <button
                            type="button"
                            onClick={() => handleOpenRepay(tx)}
                            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg shadow-2xs transition-all cursor-pointer"
                          >
                            Repay
                          </button>
                        )}

                        {hasPendingBalance && isGave && (
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsApp(tx)}
                            title="Remind on WhatsApp"
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-[#00B887]" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 3: Overdue Entries */}
        {activeTab === 'OVERDUE' && (
          <div className="divide-y divide-slate-100">
            {data?.overdueEntries.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <span>Great job! No overdue entries found. All payments are on schedule.</span>
              </div>
            ) : (
              data?.overdueEntries.map((od) => (
                <div
                  key={od.id}
                  className="p-4 sm:p-5 hover:bg-amber-50/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-amber-700" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/free-khata/person/${od.contactId}`}
                          className="font-bold text-xs sm:text-sm text-[#071F38] hover:underline"
                        >
                          {od.contactName}
                        </Link>
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                          {od.daysOverdue} days overdue
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Due Date was: <strong>{formatDate(od.dueDate)}</strong>
                        {od.description && ` • "${od.description}"`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pl-12 sm:pl-0">
                    <div className="text-right">
                      <span className="text-xs sm:text-sm font-black text-rose-600 block">
                        ₹{od.balanceAmount.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-slate-400">Outstanding</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenWhatsApp(od)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Remind on WhatsApp</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Floating Bottom Action Bar for Mobile Screens */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200/90 z-40 sm:hidden flex items-center gap-2">
        <button
          type="button"
          onClick={handleOpenGave}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-rose-600 active:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 active:scale-95 transition-all cursor-pointer"
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>+ I Gave</span>
        </button>

        <button
          type="button"
          onClick={handleOpenReceived}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-[#00B887] active:bg-[#009E74] text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
        >
          <ArrowDownLeft className="w-4 h-4" />
          <span>+ I Received</span>
        </button>
      </div>

      {/* Modals */}
      <TransactionModal
        isOpen={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        onSuccess={fetchDashboardData}
        defaultType={txModalType}
        existingContacts={existingContacts}
      />

      <RepaymentModal
        isOpen={repayModalOpen}
        onClose={() => setRepayModalOpen(false)}
        onSuccess={fetchDashboardData}
        transaction={repayTarget}
      />

      <WhatsAppReminderModal
        isOpen={waModalOpen}
        onClose={() => setWaModalOpen(false)}
        target={waTarget}
        onPhoneUpdated={fetchDashboardData}
      />
    </div>
  );
}

export default function FreeKhataDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-slate-400">Loading Free Khata...</div>}>
      <FreeKhataDashboardContent />
    </Suspense>
  );
}
