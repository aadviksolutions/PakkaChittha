'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Receipt,
  Search,
  Filter,
  Download,
  PlusCircle,
  Calendar,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  ArrowDownRight,
  ArrowUpRight,
  X,
  AlertCircle,
  Check,
  Users,
  Scale,
  Zap,
  Tag,
  Clock,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { BILLS_AND_RECHARGE_TYPES } from '@/lib/household/defaultCategories';

interface SplitItem {
  id?: string;
  memberId: string;
  memberName: string;
  allocatedAmount: number;
  notes?: string;
}

interface ContributionItem {
  id?: string;
  memberId: string;
  memberName: string;
  amount: number;
}

interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  categoryId: string | null;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  subcategory: string | null;
  date: string;
  paymentMethod: string;
  description: string | null;
  payeeMerchant: string | null;
  notes: string | null;
  createdById: string;
  createdByName: string;
  createdAt: string;

  // Split & Payer
  isShared: boolean;
  splitType: 'EQUAL' | 'CUSTOM' | null;
  paidByMemberId: string | null;
  paidByName: string | null;
  splits: SplitItem[];
  contributions: ContributionItem[];

  // Bills & Recharge
  billType: string | null;
  billProvider: string | null;
  billConsumerId: string | null;
  billPeriod: string | null;
  billDueDate: string | null;
  billReferenceNo: string | null;
}

interface MemberOption {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
}

interface CategoryOption {
  id: string;
  name: string;
  type: string;
  subcategories: string[];
}

export default function TransactionsRegisterPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [userRole, setUserRole] = useState('MEMBER');

  // Metadata options
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  // Filter state
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [memberId, setMemberId] = useState('');
  const [isSharedFilter, setIsSharedFilter] = useState<'ALL' | 'SHARED' | 'PERSONAL'>('ALL');
  const [billTypeFilter, setBillTypeFilter] = useState('');
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [txType, setTxType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [txAmount, setTxAmount] = useState('');
  const [txCategoryId, setTxCategoryId] = useState('');
  const [txCategoryName, setTxCategoryName] = useState('');
  const [txSubcategory, setTxSubcategory] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txPaymentMethod, setTxPaymentMethod] = useState('CASH');
  const [txDescription, setTxDescription] = useState('');
  const [txPayee, setTxPayee] = useState('');
  const [txNotes, setTxNotes] = useState('');
  const [txPaidByMemberId, setTxPaidByMemberId] = useState('');

  // Splitting state in modal
  const [txIsShared, setTxIsShared] = useState(false);
  const [txSplitType, setTxSplitType] = useState<'EQUAL' | 'CUSTOM'>('EQUAL');
  const [selectedSplitMemberIds, setSelectedSplitMemberIds] = useState<string[]>([]);
  const [customSplitAmounts, setCustomSplitAmounts] = useState<Record<string, string>>({});

  // Multiple contributors state
  const [hasMultipleContributors, setHasMultipleContributors] = useState(false);
  const [contributorAmounts, setContributorAmounts] = useState<Record<string, string>>({});

  // Bills & Recharge state in modal
  const [isBillSectionOpen, setIsBillSectionOpen] = useState(false);
  const [txBillType, setTxBillType] = useState('');
  const [txBillProvider, setTxBillProvider] = useState('');
  const [txBillConsumerId, setTxBillConsumerId] = useState('');
  const [txBillPeriod, setTxBillPeriod] = useState('');
  const [txBillDueDate, setTxBillDueDate] = useState('');
  const [txBillReferenceNo, setTxBillReferenceNo] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter !== 'ALL') params.set('type', typeFilter);
      if (search.trim()) params.set('search', search.trim());
      if (month) params.set('month', month);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (categoryId) params.set('categoryId', categoryId);
      if (subcategory) params.set('subcategory', subcategory);
      if (memberId) params.set('memberId', memberId);
      if (billTypeFilter) params.set('billType', billTypeFilter);
      if (isSharedFilter === 'SHARED') params.set('isShared', 'true');
      if (isSharedFilter === 'PERSONAL') params.set('isShared', 'false');
      params.set('page', String(page));
      params.set('pageSize', '25');

      const res = await fetch(`/api/household/transactions?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setTransactions(json.transactions || []);
        setTotalCount(json.pagination.totalCount || 0);
        setTotalPages(json.pagination.totalPages || 1);
        setTotalAmount(json.pagination.totalAmount || 0);
        if (json.authContext?.role) setUserRole(json.authContext.role);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [
    typeFilter,
    search,
    month,
    startDate,
    endDate,
    categoryId,
    subcategory,
    memberId,
    billTypeFilter,
    isSharedFilter,
    page,
  ]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Load members and categories metadata
  useEffect(() => {
    Promise.all([
      fetch('/api/household/categories').then((r) => r.json()),
      fetch('/api/household/members').then((r) => r.json()),
    ])
      .then(([catJson, memJson]) => {
        if (catJson.categories) setCategories(catJson.categories);
        if (memJson.members) {
          setMembers(memJson.members);
          if (memJson.members.length > 0 && !txPaidByMemberId) {
            setTxPaidByMemberId(memJson.members[0].id);
          }
        }
      })
      .catch((e) => console.error(e));
  }, []);

  // Live calculation of equal splits
  const calculatedEqualSplits = useMemo(() => {
    const amt = parseFloat(txAmount);
    if (isNaN(amt) || amt <= 0 || selectedSplitMemberIds.length === 0) return [];

    const totalPaise = Math.round(amt * 100);
    const n = selectedSplitMemberIds.length;
    const basePaise = Math.floor(totalPaise / n);
    const remainder = totalPaise % n;

    return selectedSplitMemberIds.map((mId, index) => {
      const paise = basePaise + (index < remainder ? 1 : 0);
      const member = members.find((m) => m.id === mId);
      return {
        memberId: mId,
        memberName: member?.name || 'Member',
        amount: paise / 100,
      };
    });
  }, [txAmount, selectedSplitMemberIds, members]);

  // Custom split totals
  const customSplitSum = useMemo(() => {
    let sum = 0;
    for (const mId of selectedSplitMemberIds) {
      const val = parseFloat(customSplitAmounts[mId] || '0');
      if (!isNaN(val) && val > 0) sum += val;
    }
    return Math.round(sum * 100) / 100;
  }, [customSplitAmounts, selectedSplitMemberIds]);

  // Contributor total
  const contributorSum = useMemo(() => {
    let sum = 0;
    for (const m of members) {
      const val = parseFloat(contributorAmounts[m.id] || '0');
      if (!isNaN(val) && val > 0) sum += val;
    }
    return Math.round(sum * 100) / 100;
  }, [contributorAmounts, members]);

  const activeCategoryObject = useMemo(() => {
    return categories.find((c) => c.id === txCategoryId || c.name === txCategoryName);
  }, [categories, txCategoryId, txCategoryName]);

  const handleOpenAddModal = () => {
    setEditingTx(null);
    setTxType('EXPENSE');
    setTxAmount('');
    setTxCategoryId(categories[0]?.id || '');
    setTxCategoryName(categories[0]?.name || 'Grocery & Ration');
    setTxSubcategory('');
    setTxDate(new Date().toISOString().split('T')[0]);
    setTxPaymentMethod('CASH');
    setTxDescription('');
    setTxPayee('');
    setTxNotes('');
    setTxPaidByMemberId(members[0]?.id || '');

    setTxIsShared(false);
    setTxSplitType('EQUAL');
    setSelectedSplitMemberIds(members.map((m) => m.id));
    setCustomSplitAmounts({});
    setHasMultipleContributors(false);
    setContributorAmounts({});

    setIsBillSectionOpen(false);
    setTxBillType('');
    setTxBillProvider('');
    setTxBillConsumerId('');
    setTxBillPeriod('');
    setTxBillDueDate('');
    setTxBillReferenceNo('');

    setModalError('');
    setShowModal(true);
  };

  const handleOpenEditModal = (t: Transaction) => {
    setEditingTx(t);
    setTxType(t.type);
    setTxAmount(String(t.amount));
    setTxCategoryId(t.categoryId || '');
    setTxCategoryName(t.categoryName);
    setTxSubcategory(t.subcategory || '');
    setTxDate(new Date(t.date).toISOString().split('T')[0]);
    setTxPaymentMethod(t.paymentMethod);
    setTxDescription(t.description || '');
    setTxPayee(t.payeeMerchant || '');
    setTxNotes(t.notes || '');
    setTxPaidByMemberId(t.paidByMemberId || members[0]?.id || '');

    setTxIsShared(t.isShared);
    setTxSplitType(t.splitType || 'EQUAL');
    if (t.splits && t.splits.length > 0) {
      setSelectedSplitMemberIds(t.splits.map((s) => s.memberId));
      const customMap: Record<string, string> = {};
      t.splits.forEach((s) => {
        customMap[s.memberId] = String(s.allocatedAmount);
      });
      setCustomSplitAmounts(customMap);
    } else {
      setSelectedSplitMemberIds(members.map((m) => m.id));
      setCustomSplitAmounts({});
    }

    if (t.contributions && t.contributions.length > 1) {
      setHasMultipleContributors(true);
      const contribMap: Record<string, string> = {};
      t.contributions.forEach((c) => {
        contribMap[c.memberId] = String(c.amount);
      });
      setContributorAmounts(contribMap);
    } else {
      setHasMultipleContributors(false);
      setContributorAmounts({});
    }

    if (t.billType) {
      setIsBillSectionOpen(true);
      setTxBillType(t.billType);
      setTxBillProvider(t.billProvider || '');
      setTxBillConsumerId(t.billConsumerId || '');
      setTxBillPeriod(t.billPeriod || '');
      setTxBillDueDate(t.billDueDate ? new Date(t.billDueDate).toISOString().split('T')[0] : '');
      setTxBillReferenceNo(t.billReferenceNo || '');
    } else {
      setIsBillSectionOpen(false);
      setTxBillType('');
      setTxBillProvider('');
      setTxBillConsumerId('');
      setTxBillPeriod('');
      setTxBillDueDate('');
      setTxBillReferenceNo('');
    }

    setModalError('');
    setShowModal(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(txAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      setModalError('Please enter a valid positive monetary amount.');
      return;
    }

    // Split validation
    let splitsPayload: { memberId: string; amount: number }[] = [];
    if (txIsShared && txType === 'EXPENSE') {
      if (selectedSplitMemberIds.length < 2) {
        setModalError('Please select at least 2 family members to split this expense.');
        return;
      }

      if (txSplitType === 'EQUAL') {
        splitsPayload = calculatedEqualSplits.map((s) => ({
          memberId: s.memberId,
          amount: s.amount,
        }));
      } else {
        splitsPayload = selectedSplitMemberIds.map((mId) => ({
          memberId: mId,
          amount: parseFloat(customSplitAmounts[mId] || '0'),
        }));
        const sum = Math.round(splitsPayload.reduce((acc, s) => acc + s.amount, 0) * 100) / 100;
        if (Math.abs(sum - amountVal) > 0.005) {
          setModalError(`Custom split shares (₹${sum.toFixed(2)}) must exactly equal the total expense amount (₹${amountVal.toFixed(2)}).`);
          return;
        }
      }
    }

    // Contribution validation
    let contributionsPayload: { memberId: string; amount: number }[] = [];
    if (hasMultipleContributors && txType === 'EXPENSE') {
      contributionsPayload = Object.entries(contributorAmounts)
        .map(([mId, amtStr]) => ({ memberId: mId, amount: parseFloat(amtStr || '0') }))
        .filter((c) => c.amount > 0);

      const sum = Math.round(contributionsPayload.reduce((acc, c) => acc + c.amount, 0) * 100) / 100;
      if (Math.abs(sum - amountVal) > 0.005) {
        setModalError(`Member contributions (₹${sum.toFixed(2)}) must equal the total expense amount (₹${amountVal.toFixed(2)}).`);
        return;
      }
    }

    setSubmitting(true);
    setModalError('');

    try {
      const payload = {
        type: txType,
        amount: amountVal,
        categoryId: txCategoryId || null,
        categoryName: txCategoryName || (txType === 'INCOME' ? 'Salary' : 'Grocery & Ration'),
        subcategory: txSubcategory || null,
        date: txDate,
        paymentMethod: txPaymentMethod,
        description: txDescription,
        payeeMerchant: txPayee,
        notes: txNotes,
        paidByMemberId: txPaidByMemberId || null,

        // Splitting
        isShared: txIsShared && txType === 'EXPENSE',
        splitType: txIsShared ? txSplitType : null,
        splits: splitsPayload,
        contributions: contributionsPayload,

        // Bills & Recharge
        billType: isBillSectionOpen && txBillType ? txBillType : null,
        billProvider: isBillSectionOpen ? txBillProvider : null,
        billConsumerId: isBillSectionOpen ? txBillConsumerId : null,
        billPeriod: isBillSectionOpen ? txBillPeriod : null,
        billDueDate: isBillSectionOpen && txBillDueDate ? txBillDueDate : null,
        billReferenceNo: isBillSectionOpen ? txBillReferenceNo : null,
      };

      const url = editingTx
        ? `/api/household/transactions/${editingTx.id}`
        : '/api/household/transactions';
      const method = editingTx ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save transaction');
      }

      setShowModal(false);
      fetchTransactions();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Error saving transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction record?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/household/transactions/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to delete');
      fetchTransactions();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error deleting');
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearFilters = () => {
    setTypeFilter('ALL');
    setSearch('');
    setMonth('');
    setStartDate('');
    setEndDate('');
    setCategoryId('');
    setSubcategory('');
    setMemberId('');
    setIsSharedFilter('ALL');
    setBillTypeFilter('');
    setPage(1);
  };

  const activeFilterChips = [
    typeFilter !== 'ALL' && { label: `Type: ${typeFilter}`, clear: () => setTypeFilter('ALL') },
    month && { label: `Month: ${month}`, clear: () => setMonth('') },
    startDate && { label: `From: ${startDate}`, clear: () => setStartDate('') },
    endDate && { label: `To: ${endDate}`, clear: () => setEndDate('') },
    categoryId && {
      label: `Category: ${categories.find((c) => c.id === categoryId)?.name || 'Selected'}`,
      clear: () => setCategoryId(''),
    },
    subcategory && { label: `Subcategory: ${subcategory}`, clear: () => setSubcategory('') },
    memberId && {
      label: `Member: ${members.find((m) => m.id === memberId)?.name || 'Selected'}`,
      clear: () => setMemberId(''),
    },
    isSharedFilter !== 'ALL' && {
      label: isSharedFilter === 'SHARED' ? 'Shared Only' : 'Personal Only',
      clear: () => setIsSharedFilter('ALL'),
    },
    billTypeFilter && { label: `Bill: ${billTypeFilter}`, clear: () => setBillTypeFilter('') },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/ghar-kharcha"
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-600" />
            <span>Kharcha Register</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Search, filter, record household expenses, utility bills, and family shared splits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/ghar-kharcha/reports"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Reports &amp; Export</span>
          </Link>

          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record Expense / Income</span>
          </button>
        </div>
      </div>

      {/* SEARCH & FILTER CONTROLS BAR */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items, notes, payee, provider..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50/50 focus:outline-none focus:border-emerald-600"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Quick Type Tabs */}
            <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                onClick={() => setTypeFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  typeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTypeFilter('EXPENSE')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  typeFilter === 'EXPENSE' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-500'
                }`}
              >
                Expenses
              </button>
              <button
                onClick={() => setTypeFilter('INCOME')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  typeFilter === 'INCOME' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500'
                }`}
              >
                Income
              </button>
            </div>

            <button
              onClick={() => setShowFiltersDrawer(!showFiltersDrawer)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                showFiltersDrawer || activeFilterChips.length > 0
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50'
                  : 'border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>More Filters</span>
              {activeFilterChips.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-black">
                  {activeFilterChips.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* EXPANDABLE ADVANCED FILTERS */}
        {showFiltersDrawer && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs animate-in fade-in">
            <div>
              <label className="block font-bold text-slate-500 mb-1">Select Month</label>
              <input
                type="month"
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  setStartDate('');
                  setEndDate('');
                }}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-500 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs font-semibold"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-500 mb-1">Household Member</label>
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs font-semibold"
              >
                <option value="">All Members</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-500 mb-1">Personal vs Shared</label>
              <select
                value={isSharedFilter}
                onChange={(e) => setIsSharedFilter(e.target.value as any)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs font-semibold"
              >
                <option value="ALL">All Status</option>
                <option value="SHARED">Shared Splits Only</option>
                <option value="PERSONAL">Personal Only</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-500 mb-1">Bill / Utility Type</label>
              <select
                value={billTypeFilter}
                onChange={(e) => setBillTypeFilter(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs font-semibold"
              >
                <option value="">All Transactions</option>
                {BILLS_AND_RECHARGE_TYPES.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-500 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setMonth('');
                }}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-500 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setMonth('');
                }}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs font-semibold"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleClearFilters}
                className="w-full py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition-all text-xs"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}

        {/* ACTIVE FILTER CHIPS */}
        {activeFilterChips.length > 0 && (
          <div className="pt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Active:</span>
            {activeFilterChips.map((chip, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold"
              >
                <span>{chip.label}</span>
                <button onClick={chip.clear} className="text-emerald-600 hover:text-emerald-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* TRANSACTION REGISTER TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table summary bar */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-600">
            Showing {transactions.length} of {totalCount} records
          </span>
          <span className="font-black text-slate-900">
            Filtered Total: ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-medium">Loading register...</p>
          </div>
        ) : transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] bg-slate-50/50">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description / Details</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Paid By</th>
                  <th className="py-3 px-4">Type / Split</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => {
                  const isExpense = t.type === 'EXPENSE';
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                        {new Date(t.date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Description / Item */}
                      <td className="py-3.5 px-4 min-w-[200px]">
                        <div className="font-bold text-slate-900 text-xs">
                          {t.description || t.categoryName}
                        </div>
                        {t.payeeMerchant && (
                          <div className="text-[11px] text-slate-400">Merchant: {t.payeeMerchant}</div>
                        )}
                        {/* Bill Metadata */}
                        {t.billType && (
                          <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                              {t.billType}
                            </span>
                            {t.billProvider && (
                              <span className="text-slate-500 font-medium">({t.billProvider})</span>
                            )}
                            {t.billConsumerId && (
                              <span className="text-slate-400">ID: {t.billConsumerId}</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Category & Subcategory */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-800 block text-xs">{t.categoryName}</span>
                        {t.subcategory && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold inline-block mt-0.5">
                            {t.subcategory}
                          </span>
                        )}
                      </td>

                      {/* Paid By */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 font-medium">
                        <span>{t.paidByName || t.createdByName}</span>
                      </td>

                      {/* Split Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isExpense ? (
                          t.isShared ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold">
                                <Users className="w-3 h-3" />
                                <span>Split ({t.splits.length})</span>
                              </span>
                              <div className="text-[9px] text-slate-400 mt-0.5">
                                {t.splits.map((s) => s.memberName).join(', ')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              Personal
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            Income
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td
                        className={`py-3.5 px-4 text-right font-black text-sm whitespace-nowrap ${
                          isExpense ? 'text-slate-900' : 'text-emerald-700'
                        }`}
                      >
                        {isExpense ? '' : '+'}₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(t)}
                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Transaction"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(t.id)}
                            disabled={deletingId === t.id}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-400 text-xs">
            No transaction records match the active criteria.
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE / EDIT EXPENSE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                {editingTx ? 'Edit Transaction' : 'Record Household Transaction'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveTransaction} className="space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTxType('EXPENSE')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    txType === 'EXPENSE'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Household Expense
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTxType('INCOME');
                    setTxIsShared(false);
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    txType === 'INCOME'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Household Income
                </button>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Amount (INR) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 font-bold text-slate-400 text-xs">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      placeholder="0.00"
                      required
                      autoFocus
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-base font-black text-slate-900 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Transaction Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Category & Subcategory */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={txCategoryId}
                    onChange={(e) => {
                      const selId = e.target.value;
                      setTxCategoryId(selId);
                      const catObj = categories.find((c) => c.id === selId);
                      if (catObj) {
                        setTxCategoryName(catObj.name);
                        setTxSubcategory('');
                      }
                    }}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-emerald-600"
                  >
                    {categories
                      .filter((c) => c.type === txType)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Subcategory (Optional)
                  </label>
                  {activeCategoryObject && activeCategoryObject.subcategories?.length > 0 ? (
                    <select
                      value={txSubcategory}
                      onChange={(e) => setTxSubcategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-emerald-600"
                    >
                      <option value="">None / General</option>
                      {activeCategoryObject.subcategories.map((sub, idx) => (
                        <option key={idx} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={txSubcategory}
                      onChange={(e) => setTxSubcategory(e.target.value)}
                      placeholder="e.g. Staples, Vegetables"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-emerald-600"
                    />
                  )}
                </div>
              </div>

              {/* Description & Payee */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Description / Item
                  </label>
                  <input
                    type="text"
                    value={txDescription}
                    onChange={(e) => setTxDescription(e.target.value)}
                    placeholder="e.g. Monthly groceries from D-Mart"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Paid By (Family Member)
                  </label>
                  <select
                    value={txPaidByMemberId}
                    onChange={(e) => setTxPaidByMemberId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-emerald-600"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SHARED EXPENSE SPLIT SECTION (EXPENSES ONLY) */}
              {txType === 'EXPENSE' && (
                <div className="p-4 rounded-2xl border border-indigo-200/80 bg-indigo-50/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={txIsShared}
                        onChange={(e) => setTxIsShared(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Split this expense with family members</span>
                      </span>
                    </label>

                    {txIsShared && (
                      <div className="flex p-0.5 bg-white border border-indigo-200 rounded-lg text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setTxSplitType('EQUAL')}
                          className={`px-2 py-1 rounded transition-all ${
                            txSplitType === 'EQUAL' ? 'bg-indigo-600 text-white' : 'text-slate-600'
                          }`}
                        >
                          Equal Split
                        </button>
                        <button
                          type="button"
                          onClick={() => setTxSplitType('CUSTOM')}
                          className={`px-2 py-1 rounded transition-all ${
                            txSplitType === 'CUSTOM' ? 'bg-indigo-600 text-white' : 'text-slate-600'
                          }`}
                        >
                          Custom Shares
                        </button>
                      </div>
                    )}
                  </div>

                  {txIsShared && (
                    <div className="pt-2 border-t border-indigo-200/60 space-y-3">
                      <div className="text-[11px] font-semibold text-indigo-900">
                        Select participating family members:
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {members.map((m) => {
                          const isSelected = selectedSplitMemberIds.includes(m.id);
                          return (
                            <label
                              key={m.id}
                              className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-between cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-indigo-500 bg-white text-indigo-950 shadow-2xs'
                                  : 'border-slate-200 bg-white/50 text-slate-500'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    if (isSelected) {
                                      setSelectedSplitMemberIds(selectedSplitMemberIds.filter((id) => id !== m.id));
                                    } else {
                                      setSelectedSplitMemberIds([...selectedSplitMemberIds, m.id]);
                                    }
                                  }}
                                  className="w-3.5 h-3.5 text-indigo-600 rounded"
                                />
                                <span className="truncate">{m.name}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>

                      {/* Equal Split Preview */}
                      {txSplitType === 'EQUAL' && (
                        <div className="p-2.5 rounded-xl bg-white border border-indigo-200/80 text-[11px] space-y-1">
                          <div className="font-bold text-indigo-950 flex justify-between">
                            <span>Calculated Share per Member:</span>
                            <span className="text-emerald-700">
                              ₹{calculatedEqualSplits[0]?.amount.toFixed(2) || '0.00'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Paise rounding distributed evenly. Total allocation strictly sums to ₹{txAmount || '0.00'}.
                          </div>
                        </div>
                      )}

                      {/* Custom Split Inputs */}
                      {txSplitType === 'CUSTOM' && (
                        <div className="space-y-2 pt-1">
                          <div className="flex justify-between text-[11px] font-bold">
                            <span className="text-slate-600">Enter Individual Shares:</span>
                            <span
                              className={`font-black ${
                                Math.abs(customSplitSum - (parseFloat(txAmount) || 0)) < 0.01
                                  ? 'text-emerald-700'
                                  : 'text-rose-600'
                              }`}
                            >
                              Allocated: ₹{customSplitSum.toFixed(2)} / ₹{txAmount || '0.00'}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {selectedSplitMemberIds.map((mId) => {
                              const m = members.find((mem) => mem.id === mId);
                              return (
                                <div key={mId} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-indigo-200">
                                  <span className="text-xs font-bold text-slate-800 w-24 truncate">
                                    {m?.name}:
                                  </span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={customSplitAmounts[mId] || ''}
                                    onChange={(e) =>
                                      setCustomSplitAmounts({
                                        ...customSplitAmounts,
                                        [mId]: e.target.value,
                                      })
                                    }
                                    placeholder="₹0.00"
                                    className="w-full px-2 py-1 text-xs font-bold rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-600 text-right"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* DEDICATED BILLS & RECHARGE DETAILS ACCORDION */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsBillSectionOpen(!isBillSectionOpen)}
                  className="w-full p-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-800 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Utility Bill &amp; Recharge Details (Optional)</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      isBillSectionOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isBillSectionOpen && (
                  <div className="p-4 bg-white space-y-3 border-t border-slate-200 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-600 mb-1">Select Bill Type</label>
                        <select
                          value={txBillType}
                          onChange={(e) => setTxBillType(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-semibold text-slate-800"
                        >
                          <option value="">None / Regular</option>
                          {BILLS_AND_RECHARGE_TYPES.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-600 mb-1">Provider / Discom Name</label>
                        <input
                          type="text"
                          value={txBillProvider}
                          onChange={(e) => setTxBillProvider(e.target.value)}
                          placeholder="e.g. Jio, BESCOM, Adani Gas, Tata Play"
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-medium text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-slate-600 mb-1">Consumer / Mobile ID</label>
                        <input
                          type="text"
                          value={txBillConsumerId}
                          onChange={(e) => setTxBillConsumerId(e.target.value)}
                          placeholder="Account or mobile number"
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-medium text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-600 mb-1">Bill Period</label>
                        <input
                          type="text"
                          value={txBillPeriod}
                          onChange={(e) => setTxBillPeriod(e.target.value)}
                          placeholder="e.g. Oct 2026"
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-medium text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-600 mb-1">Bill Due Date</label>
                        <input
                          type="date"
                          value={txBillDueDate}
                          onChange={(e) => setTxBillDueDate(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-medium text-slate-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-600 mb-1">Reference / Transaction ID</label>
                      <input
                        type="text"
                        value={txBillReferenceNo}
                        onChange={(e) => setTxBillReferenceNo(e.target.value)}
                        placeholder="Receipt / UPI Ref No."
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-medium text-slate-800"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Optional Notes
                </label>
                <input
                  type="text"
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  placeholder="Additional notes for your family"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 bg-white"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Saving Transaction...' : editingTx ? 'Update Transaction' : 'Save Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
