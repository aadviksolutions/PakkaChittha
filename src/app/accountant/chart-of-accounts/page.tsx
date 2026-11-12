'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FolderTree,
  Plus,
  RefreshCw,
  BookOpen,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { AccountantScaleGate } from '@/components/accountant/AccountantScaleGate';
import { useAuth } from '@/context/AuthContext';

type GroupType = 'ASSETS' | 'LIABILITIES' | 'CAPITAL' | 'INCOME' | 'EXPENSES';

interface GroupItem {
  id: string;
  name: string;
  description: string | null;
  type: GroupType;
  parentGroupId: string | null;
  sortOrder: number;
  isSystem: boolean;
  ledgerCount: number;
}

interface LedgerItem {
  id: string;
  name: string;
  code: string | null;
  groupId: string;
  nature: 'DEBIT_NORMAL' | 'CREDIT_NORMAL';
  closingBalance: string;
  closingBalanceType: 'DR' | 'CR';
  isSystem: boolean;
}

const GROUP_SECTIONS: Array<{ type: GroupType; label: string; pill: string }> = [
  { type: 'ASSETS', label: 'Assets', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { type: 'LIABILITIES', label: 'Liabilities', pill: 'bg-amber-50 text-amber-700 border-amber-200' },
  { type: 'CAPITAL', label: 'Capital & Equity', pill: 'bg-violet-50 text-violet-700 border-violet-200' },
  { type: 'INCOME', label: 'Income & Revenue', pill: 'bg-blue-50 text-blue-700 border-blue-200' },
  { type: 'EXPENSES', label: 'Expenses', pill: 'bg-rose-50 text-rose-700 border-rose-200' },
];

export default function ChartOfAccountsPage() {
  return (
    <AccountantScaleGate>
      <ChartOfAccountsContent />
    </AccountantScaleGate>
  );
}

function ChartOfAccountsContent() {
  const { activeBusiness } = useAuth();
  const activeBusinessId = activeBusiness?.id;
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [ledgers, setLedgers] = useState<LedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState<GroupType>('EXPENSES');
  const [parentGroupId, setParentGroupId] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);

  const [addingLedgerForGroup, setAddingLedgerForGroup] = useState<string | null>(null);
  const [ledgerName, setLedgerName] = useState('');
  const [ledgerCode, setLedgerCode] = useState('');
  const [ledgerNature, setLedgerNature] = useState<'DEBIT_NORMAL' | 'CREDIT_NORMAL'>('DEBIT_NORMAL');
  const [openingBal, setOpeningBal] = useState('0');
  const [openingBalType, setOpeningBalType] = useState<'DR' | 'CR'>('DR');
  const [savingLedger, setSavingLedger] = useState(false);

  const loadData = useCallback(async () => {
    if (!activeBusinessId) return;
    setLoading(true);
    setError(null);
    try {
      const [gRes, lRes] = await Promise.all([
        fetch(`/api/accounting/groups?businessId=${encodeURIComponent(activeBusinessId)}`, {
          cache: 'no-store',
        }),
        fetch(`/api/accounting/ledgers?businessId=${encodeURIComponent(activeBusinessId)}`, {
          cache: 'no-store',
        }),
      ]);
      const gData = await gRes.json();
      const lData = await lRes.json();
      if (!gRes.ok) throw new Error(gData.error || 'Failed to load groups');
      if (!lRes.ok) throw new Error(lData.error || 'Failed to load ledgers');
      setGroups(gData.groups || []);
      setLedgers(lData.ledgers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Chart of Accounts');
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadData();
    });
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || !activeBusinessId) return;
    setSavingGroup(true);
    setError(null);
    try {
      const res = await fetch('/api/accounting/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: activeBusinessId,
          name: groupName.trim(),
          type: groupType,
          parentGroupId: parentGroupId || undefined,
          description: groupDesc.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create group');
      setGroupName('');
      setGroupDesc('');
      setParentGroupId('');
      setShowGroupForm(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setSavingGroup(false);
    }
  };

  const openLedgerForm = (group: GroupItem) => {
    const isDr = group.type === 'ASSETS' || group.type === 'EXPENSES';
    setAddingLedgerForGroup(group.id);
    setLedgerName('');
    setLedgerCode('');
    setLedgerNature(isDr ? 'DEBIT_NORMAL' : 'CREDIT_NORMAL');
    setOpeningBal('0');
    setOpeningBalType(isDr ? 'DR' : 'CR');
  };

  const handleCreateLedger = async (e: React.FormEvent, groupId: string) => {
    e.preventDefault();
    if (!ledgerName.trim() || !activeBusinessId) return;
    setSavingLedger(true);
    setError(null);
    try {
      const res = await fetch('/api/accounting/ledgers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: activeBusinessId,
          groupId,
          name: ledgerName.trim(),
          code: ledgerCode.trim() || undefined,
          nature: ledgerNature,
          openingBalance: Number(openingBal || 0),
          openingBalanceType: openingBalType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create ledger');
      setAddingLedgerForGroup(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ledger');
    } finally {
      setSavingLedger(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-[#EA580C]" />
            <h1 className="text-xl font-black text-[#071F38] tracking-tight">
              Chart of Accounts
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Indian GAAP hierarchical accounting groups & ledgers ({groups.length} groups,{' '}
            {ledgers.length} ledgers).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/accountant/ledgers"
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[#071F38] text-xs font-bold inline-flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            All Ledgers
          </Link>
          <button
            type="button"
            onClick={() => setShowGroupForm((v) => !v)}
            className="px-3.5 py-2 rounded-xl bg-[#EA580C] hover:bg-orange-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Group
          </button>
          <button
            type="button"
            onClick={() => void loadData()}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-xs font-semibold">
          {error}
        </div>
      )}

      {showGroupForm && (
        <form
          onSubmit={handleCreateGroup}
          className="bg-white rounded-2xl border border-orange-200 shadow-2xs p-5 space-y-3"
        >
          <h2 className="text-sm font-black text-[#071F38]">New Accounting Group</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="text"
              required
              placeholder="Group Name (e.g. Marketing)"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
            />
            <select
              value={groupType}
              onChange={(e) => setGroupType(e.target.value as GroupType)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
            >
              {GROUP_SECTIONS.map((s) => (
                <option key={s.type} value={s.type}>
                  {s.label}
                </option>
              ))}
            </select>
            <select
              value={parentGroupId}
              onChange={(e) => setParentGroupId(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
            >
              <option value="">Top-level (No Parent)</option>
              {groups
                .filter((g) => g.type === groupType)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    Under: {g.name}
                  </option>
                ))}
            </select>
            <input
              type="text"
              placeholder="Description (optional)"
              value={groupDesc}
              onChange={(e) => setGroupDesc(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={savingGroup}
              className="px-4 py-2 rounded-xl bg-[#071F38] text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
            >
              {savingGroup ? 'Creating...' : 'Create Group'}
            </button>
            <button
              type="button"
              onClick={() => setShowGroupForm(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-xs text-slate-500">
          No accounting groups found. Refresh to seed your standard Indian Chart of Accounts.
        </div>
      ) : (
        <div className="space-y-4">
          {GROUP_SECTIONS.map((section) => {
            const sectionGroups = groups.filter((g) => g.type === section.type);
            if (sectionGroups.length === 0) return null;

            return (
              <div
                key={section.type}
                className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden"
              >
                <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${section.pill}`}
                    >
                      {section.label}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">
                      {sectionGroups.length} groups
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {sectionGroups.map((group) => {
                    const groupLedgers = ledgers.filter((l) => l.groupId === group.id);
                    const isAddingHere = addingLedgerForGroup === group.id;

                    return (
                      <div key={group.id} className="p-4 sm:p-5 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              {group.parentGroupId && (
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                              )}
                              <h3 className="text-sm font-black text-[#071F38]">{group.name}</h3>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                {groupLedgers.length} ledgers
                              </span>
                              {group.isSystem && (
                                <span
                                  title="System default group"
                                  className="text-[10px] text-slate-400 inline-flex items-center gap-0.5"
                                >
                                  <Lock className="w-3 h-3" /> System
                                </span>
                              )}
                            </div>
                            {group.description && (
                              <p className="text-[11px] text-slate-500 mt-0.5">{group.description}</p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => openLedgerForm(group)}
                            className="self-start sm:self-auto px-3 py-1.5 rounded-lg border border-slate-200 hover:border-orange-300 hover:bg-orange-50 text-[#071F38] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3 text-[#EA580C]" />
                            Add Ledger
                          </button>
                        </div>

                        {isAddingHere && (
                          <form
                            onSubmit={(e) => void handleCreateLedger(e, group.id)}
                            className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                              <input
                                type="text"
                                required
                                placeholder="Ledger Name"
                                value={ledgerName}
                                onChange={(e) => setLedgerName(e.target.value)}
                                className="sm:col-span-2 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white"
                              />
                              <input
                                type="text"
                                placeholder="Code (opt.)"
                                value={ledgerCode}
                                onChange={(e) => setLedgerCode(e.target.value)}
                                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white"
                              />
                              <select
                                value={ledgerNature}
                                onChange={(e) =>
                                  setLedgerNature(
                                    e.target.value as 'DEBIT_NORMAL' | 'CREDIT_NORMAL'
                                  )
                                }
                                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white"
                              >
                                <option value="DEBIT_NORMAL">Debit Normal</option>
                                <option value="CREDIT_NORMAL">Credit Normal</option>
                              </select>
                              <div className="flex gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="Opening"
                                  value={openingBal}
                                  onChange={(e) => setOpeningBal(e.target.value)}
                                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
                                />
                                <select
                                  value={openingBalType}
                                  onChange={(e) =>
                                    setOpeningBalType(e.target.value as 'DR' | 'CR')
                                  }
                                  className="text-xs border border-slate-200 rounded-lg px-1.5 py-1.5 bg-white"
                                >
                                  <option value="DR">DR</option>
                                  <option value="CR">CR</option>
                                </select>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="submit"
                                disabled={savingLedger}
                                className="px-3 py-1.5 rounded-lg bg-[#EA580C] text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                              >
                                {savingLedger ? 'Saving...' : 'Save Ledger'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setAddingLedgerForGroup(null)}
                                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-bold cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        )}

                        {groupLedgers.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {groupLedgers.map((l) => (
                              <Link
                                key={l.id}
                                href={`/accountant/ledgers/${l.id}`}
                                className="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200/80 hover:border-orange-300 hover:bg-orange-50/30 transition-colors"
                              >
                                <div className="min-w-0 pr-2">
                                  <p className="text-xs font-bold text-[#071F38] truncate">
                                    {l.name}
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    {l.code ? `${l.code} · ` : ''}
                                    {l.nature === 'DEBIT_NORMAL' ? 'Dr' : 'Cr'}
                                  </p>
                                </div>
                                <span className="text-xs font-black text-[#071F38] shrink-0">
                                  ₹{Number(l.closingBalance).toLocaleString('en-IN', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}{' '}
                                  <span className="text-[10px] font-bold text-slate-500">
                                    {l.closingBalanceType}
                                  </span>
                                </span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

