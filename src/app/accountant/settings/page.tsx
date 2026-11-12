'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, GitBranch, Plus, Settings, Check } from 'lucide-react';
import { AccountantScaleGate } from '@/components/accountant/AccountantScaleGate';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface BranchRow {
  id: string;
  name: string;
  code: string;
  gstin: string | null;
  state: string | null;
  city: string | null;
  isDefault: boolean;
  isActive: boolean;
}

interface FyRow {
  id: string;
  code: string;
  label: string;
  startDate: string;
  endDate: string;
  isClosed: boolean;
}

export default function AccountantSettingsPage() {
  return (
    <AccountantScaleGate>
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
            <div className="h-44 rounded-2xl bg-slate-100 animate-pulse" />
          </div>
        }
      >
        <SettingsContent />
      </Suspense>
    </AccountantScaleGate>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'branches' ? 'branches' : 'all';
  const toast = useToast();
  const { activeBusiness, refreshSession } = useAuth();

  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [maxBranches, setMaxBranches] = useState(3);
  const [fys, setFys] = useState<FyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [branchCity, setBranchCity] = useState('');
  const [branchState, setBranchState] = useState('');
  const [branchGstin, setBranchGstin] = useState('');
  const [creatingBranch, setCreatingBranch] = useState(false);

  const [newFyStartYear, setNewFyStartYear] = useState('2024');
  const [creatingFy, setCreatingFy] = useState(false);

  const isOwner = activeBusiness?.erpRole === 'OWNER';
  const canManageBranches = isOwner || activeBusiness?.erpRole === 'MANAGER';

  const loadSettingsData = useCallback(async () => {
    if (!activeBusiness?.id) return;
    setLoading(true);
    try {
      const [brRes, fyRes] = await Promise.all([
        fetch(`/api/branches?businessId=${activeBusiness.id}`, { cache: 'no-store' }),
        fetch(`/api/accounting/fiscal-years?businessId=${activeBusiness.id}`, {
          cache: 'no-store',
        }),
      ]);
      const [brData, fyData] = await Promise.all([brRes.json(), fyRes.json()]);
      if (brRes.ok) {
        setBranches(brData.branches || []);
        setMaxBranches(brData.maxBranches || 3);
      }
      if (fyRes.ok) {
        setFys(fyData.financialYears || []);
      }
    } finally {
      setLoading(false);
    }
  }, [activeBusiness?.id]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadSettingsData();
    });
    return () => {
      cancelled = true;
    };
  }, [loadSettingsData]);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) {
      toast.error('Branch name is required');
      return;
    }
    setCreatingBranch(true);
    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: branchName.trim(),
          code: branchCode.trim() || undefined,
          city: branchCity.trim() || undefined,
          state: branchState.trim() || undefined,
          gstin: branchGstin.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Could not create branch');
        return;
      }
      toast.success('Branch added successfully');
      setBranchName('');
      setBranchCode('');
      setBranchCity('');
      setBranchState('');
      setBranchGstin('');
      await refreshSession();
      await loadSettingsData();
    } finally {
      setCreatingBranch(false);
    }
  };

  const handleMakeDefault = async (branchId: string) => {
    const res = await fetch('/api/branches', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: branchId, isDefault: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data?.error || 'Failed to set default branch');
      return;
    }
    toast.success('Default branch updated');
    await refreshSession();
    await loadSettingsData();
  };

  const handleAddFy = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingFy(true);
    try {
      const res = await fetch('/api/accounting/fiscal-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startYear: Number(newFyStartYear) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Failed to add Financial Year');
        return;
      }
      toast.success(`Financial Year ${data.financialYear?.label || ''} enabled`);
      await refreshSession();
      await loadSettingsData();
    } finally {
      setCreatingFy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#EA580C]" />
          <h1 className="text-xl font-black text-[#071F38] tracking-tight">
            {initialTab === 'branches'
              ? 'Branches & Multi-Location Setup'
              : 'Accounting Settings · Branches & Financial Years'}
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Configure branches (up to {maxBranches} locations on Scale) and Indian April–March
          Financial Years.
        </p>
      </div>

      {/* Branches Section */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[#EA580C]" />
            <h2 className="text-sm font-bold text-[#071F38]">
              Branches ({branches.length} / {maxBranches})
            </h2>
          </div>
        </div>

        {loading ? (
          <div className="h-24 rounded-xl bg-slate-100 animate-pulse" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {branches.map((br) => (
              <div
                key={br.id}
                className={`p-3.5 rounded-xl border text-xs ${br.isDefault
                    ? 'bg-emerald-50/60 border-emerald-200'
                    : 'bg-slate-50 border-slate-200'
                  }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#071F38]">{br.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                    {br.code}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {[br.city, br.state].filter(Boolean).join(', ') || 'Location active'}
                </p>
                {br.gstin && (
                  <p className="text-[10.5px] font-mono text-slate-500 mt-0.5">
                    GSTIN: {br.gstin}
                  </p>
                )}
                <div className="mt-2.5 flex items-center justify-between">
                  {br.isDefault ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                      <Check className="w-3 h-3" /> Default Branch
                    </span>
                  ) : (
                    canManageBranches && (
                      <button
                        type="button"
                        onClick={() => handleMakeDefault(br.id)}
                        className="text-[11px] font-bold text-[#EA580C] hover:underline cursor-pointer"
                      >
                        Set as Default
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {canManageBranches && branches.length < maxBranches && (
          <form
            onSubmit={handleCreateBranch}
            className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-xs"
          >
            <input
              type="text"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="Branch Name * (e.g. Pune Godown)"
              className="sm:col-span-2 border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
              required
            />
            <input
              type="text"
              value={branchCode}
              onChange={(e) => setBranchCode(e.target.value)}
              placeholder="Code (e.g. PUN01)"
              className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-mono"
            />
            <input
              type="text"
              value={branchState}
              onChange={(e) => setBranchState(e.target.value)}
              placeholder="State (optional)"
              className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
            />
            <button
              type="submit"
              disabled={creatingBranch}
              className="px-4 py-2 rounded-xl bg-[#071F38] hover:bg-slate-800 text-white font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {creatingBranch ? 'Adding...' : 'Add Branch'}
            </button>
          </form>
        )}
      </div>

      {/* Financial Years Section */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#EA580C]" />
            <h2 className="text-sm font-bold text-[#071F38]">Indian Financial Years (Apr – Mar)</h2>
          </div>

          {isOwner && (
            <form onSubmit={handleAddFy} className="flex items-center gap-2 text-xs">
              <input
                type="number"
                min={2017}
                max={2035}
                value={newFyStartYear}
                onChange={(e) => setNewFyStartYear(e.target.value)}
                className="w-24 border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 font-mono"
              />
              <button
                type="submit"
                disabled={creatingFy}
                className="px-3.5 py-1.5 rounded-xl bg-[#EA580C] hover:bg-orange-700 text-white font-bold cursor-pointer"
              >
                {creatingFy ? 'Enabling...' : 'Enable FY'}
              </button>
            </form>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {fys.map((fy) => (
            <div key={fy.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#071F38]">{fy.label}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${fy.isClosed
                      ? 'bg-slate-200 text-slate-700 border-slate-300'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                >
                  {fy.isClosed ? 'Closed' : 'Open'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {new Date(fy.startDate).toLocaleDateString('en-IN')} –{' '}
                {new Date(fy.endDate).toLocaleDateString('en-IN')}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

