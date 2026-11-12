'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2,
  Check,
  CheckCircle2,
  KeyRound,
  Mail,
  ShieldCheck,
  ArrowRight,
  GitBranch,
  Calendar,
} from 'lucide-react';
import { AccountantScaleGate } from '@/components/accountant/AccountantScaleGate';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface WorkspaceBusinessItem {
  businessId: string;
  name: string;
  legalName: string | null;
  gstin: string | null;
  city: string | null;
  state: string | null;
  role: string;
  erpRole: string;
  plan: string | null;
  planKey: string;
  isScalePlan: boolean;
  isActiveWorkspace: boolean;
  branchScope: string;
  fyScope: string;
  canApproveSensitive: boolean;
  canFileGst: boolean;
  branches: Array<{ id: string; name: string; code: string }>;
  financialYears: Array<{ id: string; code: string; label: string }>;
}

interface PendingInviteItem {
  id: string;
  businessId: string;
  businessName: string;
  businessGstin: string | null;
  invitedByName: string;
  invitedByEmail: string;
  branchScope: string;
  branchCount: number;
  fyScope: string;
  financialYears: string[];
  canApproveSensitive: boolean;
  canFileGst: boolean;
  expiresAt: string;
}

export default function AccountantBusinessesPage() {
  return (
    <AccountantScaleGate allowPendingInviteRoute>
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
            <div className="h-40 rounded-2xl bg-slate-100 animate-pulse" />
          </div>
        }
      >
        <BusinessesContent />
      </Suspense>
    </AccountantScaleGate>
  );
}

function BusinessesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { switchBusiness, refreshSession } = useAuth();

  const [businesses, setBusinesses] = useState<WorkspaceBusinessItem[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInviteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tokenInput, setTokenInput] = useState(searchParams.get('token') || '');
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/accountant/businesses', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setBusinesses(data.businesses || []);
        setPendingInvitations(data.pendingInvitations || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void fetchData();
    });
    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  const handleAcceptInvite = async (payload: { invitationId?: string; token?: string }) => {
    setAcceptingId(payload.invitationId || 'token');
    try {
      const res = await fetch('/api/accountant/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, switchToBusiness: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Could not accept invitation');
        return;
      }
      toast.success(`Joined ${data.business?.name || 'business'} workspace!`);
      setTokenInput('');
      await refreshSession();
      await fetchData();
      router.push('/accountant');
    } catch {
      toast.error('Failed to process invitation acceptance');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleOpenWorkspace = async (businessId: string, isScalePlan: boolean) => {
    setSwitchingId(businessId);
    try {
      const result = await switchBusiness(businessId);
      if (!result.ok) {
        toast.error(result.error || 'Failed to switch business');
        return;
      }
      toast.success('Switched active workspace');
      router.push(isScalePlan ? '/accountant' : '/');
    } finally {
      setSwitchingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5">
        <h1 className="text-xl font-black text-[#071F38] tracking-tight">
          Authorized Businesses & Accountant Invitations
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage all businesses you own or audit from a single login, with strict per-tenant isolation.
        </p>
      </div>

      {/* Accept Invitation by Token Box */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5">
        <div className="flex items-center gap-2 mb-3">
          <KeyRound className="w-4 h-4 text-[#EA580C]" />
          <h2 className="text-sm font-bold text-[#071F38]">Accept Invite via Token</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Paste invitation token shared by Business Owner..."
            className="flex-1 text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 font-mono"
          />
          <button
            type="button"
            disabled={!tokenInput.trim() || acceptingId !== null}
            onClick={() => handleAcceptInvite({ token: tokenInput.trim() })}
            className="px-5 py-2.5 rounded-xl bg-[#EA580C] hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors"
          >
            {acceptingId === 'token' ? 'Accepting...' : 'Accept & Join Business'}
          </button>
        </div>
      </div>

      {/* Pending Invitations matching user's email */}
      {pendingInvitations.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-amber-600" />
            Pending Invitations ({pendingInvitations.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {pendingInvitations.map((inv) => (
              <div
                key={inv.id}
                className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-black text-[#071F38]">{inv.businessName}</h3>
                      {inv.businessGstin && (
                        <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                          GSTIN: {inv.businessGstin}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                      ACCOUNTANT INVITE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-2">
                    Invited by <strong>{inv.invitedByName}</strong> ({inv.invitedByEmail})
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2.5 text-[10.5px]">
                    <span className="px-2 py-0.5 rounded bg-white border border-amber-200 text-slate-700">
                      Branches: {inv.branchScope === 'ALL' ? 'All Branches' : `${inv.branchCount} Selected`}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white border border-amber-200 text-slate-700">
                      FY Scope:{' '}
                      {inv.fyScope === 'ALL'
                        ? 'All Financial Years'
                        : inv.financialYears.join(', ') || 'Selected'}
                    </span>
                    {inv.canFileGst && (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800">
                        GST Filing Authorized
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={acceptingId !== null}
                  onClick={() => handleAcceptInvite({ invitationId: inv.id })}
                  className="w-full py-2.5 rounded-xl bg-[#071F38] hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {acceptingId === inv.id ? 'Activating Access...' : 'Accept & Open Workspace'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Business Workspaces */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-[#071F38]" />
          Your Active Businesses ({businesses.length})
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {[1, 2].map((i) => (
              <div key={i} className="h-36 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : businesses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
            No active business workspaces yet. Accept an owner invitation above to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {businesses.map((biz) => (
              <div
                key={biz.businessId}
                className={`bg-white rounded-2xl border p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all ${
                  biz.isActiveWorkspace
                    ? 'border-[#00B887] ring-2 ring-emerald-500/15'
                    : 'border-slate-200/90'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-black text-[#071F38]">{biz.name}</h3>
                        {biz.isActiveWorkspace && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3 h-3" /> Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {biz.gstin ? `GSTIN: ${biz.gstin}` : 'Unregistered / Composition'} ·{' '}
                        {biz.state || 'India'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                        {biz.erpRole}
                      </span>
                      <span
                        className={`text-[9.5px] font-bold px-2 py-0.5 rounded border ${
                          biz.isScalePlan
                            ? 'bg-orange-50 text-[#EA580C] border-orange-200'
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}
                      >
                        {biz.planKey}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <GitBranch className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {biz.branchScope === 'ALL'
                          ? `All Branches (${biz.branches.length || 1})`
                          : `${biz.branches.length} Assigned Branch(es)`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {biz.fyScope === 'ALL'
                          ? `All FYs (${biz.financialYears.map((f) => f.label).join(', ') || 'Current'})`
                          : biz.financialYears.map((f) => f.label).join(', ') || 'Scoped FY'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={switchingId === biz.businessId}
                  onClick={() => handleOpenWorkspace(biz.businessId, biz.isScalePlan)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    biz.isActiveWorkspace
                      ? 'bg-[#EA580C] hover:bg-orange-700 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-[#071F38]'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {switchingId === biz.businessId
                    ? 'Switching Workspace...'
                    : biz.isActiveWorkspace
                      ? biz.isScalePlan
                        ? 'Open Accountant Dashboard'
                        : 'Open Store Dashboard'
                      : 'Switch & Open Workspace'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

