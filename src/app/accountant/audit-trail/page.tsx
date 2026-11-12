'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { AccountantScaleGate } from '@/components/accountant/AccountantScaleGate';
import { useAuth } from '@/context/AuthContext';

interface AuditItem {
  id: string;
  actorUserId: string;
  actorEmail: string | null;
  actorName: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  previousValue: unknown;
  newValue: unknown;
  reason: string | null;
  createdAt: string;
}

export default function AccountantAuditTrailPage() {
  return (
    <AccountantScaleGate>
      <AuditTrailContent />
    </AccountantScaleGate>
  );
}

function AuditTrailContent() {
  const { activeBusiness } = useAuth();
  const [events, setEvents] = useState<AuditItem[]>([]);
  const [total, setTotal] = useState(0);
  const [entityFilter, setEntityFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadAudit = useCallback(async () => {
    if (!activeBusiness?.id) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        businessId: activeBusiness.id,
        limit: '50',
      });
      if (entityFilter) qs.set('entityType', entityFilter);
      const res = await fetch(`/api/audit?${qs.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setEvents(data.events || []);
        setTotal(data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [activeBusiness?.id, entityFilter]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadAudit();
    });
    return () => {
      cancelled = true;
    };
  }, [loadAudit]);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#00B887]" />
            <h1 className="text-xl font-black text-[#071F38] tracking-tight">
              Immutable Audit Trail
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tamper-evident record of invitations, role changes, workspace switches, branch config,
            and owner approvals ({total} total events).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
          >
            <option value="">All Entity Types</option>
            <option value="AccountantInvitation">Accountant Invitations</option>
            <option value="AccountantBusinessAccess">Accountant Access</option>
            <option value="BusinessMembership">Staff Roles</option>
            <option value="ApprovalRequest">Approvals</option>
            <option value="Branch">Branches</option>
            <option value="FinancialYear">Financial Years</option>
            <option value="Session">Workspace Switches</option>
          </select>
          <button
            type="button"
            onClick={loadAudit}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            No audit events recorded for this filter.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {events.map((ev) => {
              const isExpanded = expandedId === ev.id;
              return (
                <div key={ev.id} className="p-4 hover:bg-slate-50/70 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-[#071F38]">{ev.action}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {ev.entityType}
                        </span>
                        {ev.actorRole && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-50 text-[#EA580C] border border-orange-200">
                            {ev.actorRole}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Actor: <strong>{ev.actorName || 'System'}</strong> ({ev.actorEmail || 'n/a'})
                        {ev.reason ? ` · Reason: ${ev.reason}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(ev.createdAt).toLocaleString('en-IN')}
                      </span>
                      {(Boolean(ev.previousValue) || Boolean(ev.newValue)) && (
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                          className="text-[11px] font-bold text-[#EA580C] hover:underline cursor-pointer"
                        >
                          {isExpanded ? 'Hide Diff' : 'View Payload'}
                        </button>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px]">
                      {Boolean(ev.previousValue) && (
                        <div className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-100 overflow-x-auto">
                          <span className="font-bold text-rose-800 block mb-1">Previous State</span>
                          <pre className="font-mono text-slate-700 whitespace-pre-wrap">
                            {JSON.stringify(ev.previousValue, null, 2)}
                          </pre>
                        </div>
                      )}
                      {Boolean(ev.newValue) && (
                        <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 overflow-x-auto">
                          <span className="font-bold text-emerald-800 block mb-1">New State</span>
                          <pre className="font-mono text-slate-700 whitespace-pre-wrap">
                            {JSON.stringify(ev.newValue, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

