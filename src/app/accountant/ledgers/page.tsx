'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, FolderTree, Plus, RefreshCw, Search } from 'lucide-react';
import { AccountantScaleGate } from '@/components/accountant/AccountantScaleGate';
import { useAuth } from '@/context/AuthContext';

interface GroupOption {
  id: string;
  name: string;
  type: 'ASSETS' | 'LIABILITIES' | 'CAPITAL' | 'INCOME' | 'EXPENSES';
}

interface LedgerRow {
  id: string;
  name: string;
  code: string | null;
  groupId: string;
  groupName: string;
  groupType: string;
  nature: 'DEBIT_NORMAL' | 'CREDIT_NORMAL';
  openingBalance: string;
  openingBalanceType: 'DR' | 'CR';
  periodDr: string;
  periodCr: string;
  closingBalance: string;
  closingBalanceType: 'DR' | 'CR';
  isSystem: boolean;
}

export default function LedgersPage() {
  return (
    <AccountantScaleGate>
      <LedgersContent />
    </AccountantScaleGate>
  );
}

function LedgersContent() {
  const { activeBusiness } = useAuth();
  const activeBusinessId = activeBusiness?.id;
  const [ledgers, setLedgers] = useState<LedgerRow[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [groupId, setGroupId] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [openingBalanceType, setOpeningBalanceType] = useState<'DR' | 'CR'>('DR');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!activeBusinessId) return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ businessId: activeBusinessId });
      if (typeFilter) qs.set('type', typeFilter);

      const [lRes, gRes] = await Promise.all([
        fetch(`/api/accounting/ledgers?${qs.toString()}`, { cache: 'no-store' }),
        fetch(`/api/accounting/groups?businessId=${encodeURIComponent(activeBusinessId)}`, {
          cache: 'no-store',
        }),
      ]);
      const lData = await lRes.json();
      const gData = await gRes.json();
      if (!lRes.ok) throw new Error(lData.error || 'Failed to load ledgers');
      if (!gRes.ok) throw new Error(gData.error || 'Failed to load groups');
      setLedgers(lData.ledgers || []);
      const fetchedGroups: GroupOption[] = gData.groups || [];
      setGroups(fetchedGroups);
      if (!groupId && fetchedGroups.length > 0) {
        setGroupId(fetchedGroups[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ledgers');
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId, typeFilter, groupId]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadData();
    });
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusinessId || !name.trim() || !groupId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/accounting/ledgers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: activeBusinessId,
          name: name.trim(),
          code: code.trim() || undefined,
          groupId,
          openingBalance: Number(openingBalance || 0),
          openingBalanceType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create ledger');
      setName('');
      setCode('');
      setOpeningBalance('0');
      setShowCreate(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ledger');
    } finally {
      setSaving(false);
    }
  };

  const filtered = ledgers.filter((l) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      (l.code && l.code.toLowerCase().includes(q)) ||
      l.groupName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#EA580C]" />
            <h1 className="text-xl font-black text-[#071F38] tracking-tight">Ledgers</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Inspect account balances, opening balances, and click any ledger for its chronological
            statement.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/accountant/chart-of-accounts"
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[#071F38] text-xs font-bold inline-flex items-center gap-1.5"
          >
            <FolderTree className="w-3.5 h-3.5" />
            Chart of Accounts
          </Link>
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="px-3.5 py-2 rounded-xl bg-[#EA580C] hover:bg-orange-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Ledger
          </button>
          <button
            type="button"
            onClick={() => void loadData()}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
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

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-2xl border border-orange-200 shadow-2xs p-5 space-y-3"
        >
          <h2 className="text-sm font-black text-[#071F38]">Create New Ledger</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="text"
              required
              placeholder="Ledger Name (e.g. HDFC Bank)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
            />
            <input
              type="text"
              placeholder="Ledger Code (optional)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
            />
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.type})
                </option>
              ))}
            </select>
            <div className="flex gap-1.5">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Opening Balance"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
              />
              <select
                value={openingBalanceType}
                onChange={(e) => setOpeningBalanceType(e.target.value as 'DR' | 'CR')}
                className="text-xs border border-slate-200 rounded-xl px-2.5 py-2 bg-slate-50"
              >
                <option value="DR">DR</option>
                <option value="CR">CR</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-[#071F38] text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Saving...' : 'Create Ledger'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by ledger name, code, or group..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
        >
          <option value="">All Account Types</option>
          <option value="ASSETS">Assets</option>
          <option value="LIABILITIES">Liabilities</option>
          <option value="CAPITAL">Capital</option>
          <option value="INCOME">Income</option>
          <option value="EXPENSES">Expenses</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-2.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            No ledgers yet. Set up your Chart of Accounts first.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Ledger Name</th>
                  <th className="py-3 px-4">Group</th>
                  <th className="py-3 px-4">Nature</th>
                  <th className="py-3 px-4 text-right">Period Dr</th>
                  <th className="py-3 px-4 text-right">Period Cr</th>
                  <th className="py-3 px-4 text-right">Closing Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-orange-50/40 transition-colors">
                    <td className="py-3 px-4">
                      <Link
                        href={`/accountant/ledgers/${l.id}`}
                        className="font-bold text-[#071F38] hover:text-[#EA580C] block"
                      >
                        {l.name}
                      </Link>
                      {l.code && <span className="text-[10px] text-slate-400">{l.code}</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {l.groupName}
                      <span className="block text-[10px] text-slate-400">{l.groupType}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          l.nature === 'DEBIT_NORMAL'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {l.nature === 'DEBIT_NORMAL' ? 'DR' : 'CR'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-600">
                      ₹{Number(l.periodDr).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-600">
                      ₹{Number(l.periodCr).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-[#071F38]">
                      <Link href={`/accountant/ledgers/${l.id}`}>
                        ₹
                        {Number(l.closingBalance).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}{' '}
                        <span className="text-[10px] font-bold text-slate-500">
                          {l.closingBalanceType}
                        </span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

