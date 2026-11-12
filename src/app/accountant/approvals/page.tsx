'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  CheckSquare,
  Clock,
  Plus,
  XCircle,
  Send,
} from 'lucide-react';
import { AccountantScaleGate } from '@/components/accountant/AccountantScaleGate';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface ApprovalItem {
  id: string;
  requestType: string;
  entityType: string;
  entityId: string | null;
  title: string;
  summary: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  decisionNotes: string | null;
  decidedAt: string | null;
  createdAt: string;
  requestedBy: { id: string; name: string; email: string };
  decidedBy: { id: string; name: string; email: string } | null;
}

export default function AccountantApprovalsPage() {
  return (
    <AccountantScaleGate>
      <ApprovalsContent />
    </AccountantScaleGate>
  );
}

function ApprovalsContent() {
  const { activeBusiness } = useAuth();
  const toast = useToast();

  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [canDecide, setCanDecide] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [showCreate, setShowCreate] = useState(false);
  const [requestType, setRequestType] = useState('GST_RETURN_FILING');
  const [title, setTitle] = useState('');
  const [entityId, setEntityId] = useState('');
  const [summary, setSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState<Record<string, string>>({});

  const fetchApprovals = useCallback(async () => {
    if (!activeBusiness?.id) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ businessId: activeBusiness.id });
      if (statusFilter !== 'ALL') qs.set('status', statusFilter);
      const res = await fetch(`/api/approvals?${qs.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setApprovals(data.approvals || []);
        setCanDecide(Boolean(data.canDecide));
      }
    } finally {
      setLoading(false);
    }
  }, [activeBusiness?.id, statusFilter]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void fetchApprovals();
    });
    return () => {
      cancelled = true;
    };
  }, [fetchApprovals]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a descriptive approval title');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: activeBusiness?.id,
          requestType,
          entityType: requestType === 'GST_RETURN_FILING' ? 'GstReturn' : 'AccountingPeriod',
          entityId: entityId.trim() || null,
          title: title.trim(),
          summary: summary.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Could not submit approval request');
        return;
      }
      toast.success('Approval request submitted to Business Owner');
      setTitle('');
      setEntityId('');
      setSummary('');
      setShowCreate(false);
      await fetchApprovals();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecision = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    setDecidingId(id);
    try {
      const res = await fetch('/api/approvals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: activeBusiness?.id,
          id,
          decision,
          decisionNotes: decisionNote[id] || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Decision failed');
        return;
      }
      toast.success(`Request ${decision.toLowerCase()} & recorded in Audit Trail`);
      await fetchApprovals();
    } finally {
      setDecidingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-[#EA580C]" />
            <h1 className="text-xl font-black text-[#071F38] tracking-tight">
              Maker-Checker Approvals Inbox
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            GST return filings, FY period locks, and sensitive accounting adjustments require Owner
            approval before execution.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2.5 rounded-xl bg-[#071F38] hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Approval Request
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 text-xs"
        >
          <h2 className="text-sm font-bold text-[#071F38]">Submit Request for Owner Sign-Off</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-600 block mb-1">Request Category</label>
              <select
                value={requestType}
                onChange={(e) => setRequestType(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-semibold"
              >
                <option value="GST_RETURN_FILING">GST Return Filing Approval</option>
                <option value="PERIOD_LOCK">Financial Period / Month Lock</option>
                <option value="SENSITIVE_ADJUSTMENT">Sensitive Accounting Adjustment</option>
                <option value="BACKDATED_VOUCHER">Backdated Voucher Authorization</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-600 block mb-1">
                Reference / Return Period (optional)
              </label>
              <input
                type="text"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                placeholder="e.g. 2026-2027:2026-10 or GSTR-3B Oct"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-600 block mb-1">Request Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Approve October GSTR-3B net tax payable ₹18,450"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
              required
            />
          </div>

          <div>
            <label className="font-semibold text-slate-600 block mb-1">CA Notes / Breakdown</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              placeholder="Explain output GST, ITC claim check, or adjustment rationale..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-[#EA580C] hover:bg-orange-700 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatusFilter(tab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
              statusFilter === tab
                ? 'bg-[#071F38] text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : approvals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center text-xs text-slate-500">
          No approval requests found under this filter.
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {item.requestType}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        item.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : item.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {item.status}
                    </span>
                    {item.entityId && (
                      <span className="text-[11px] font-mono text-slate-500">
                        Ref: {item.entityId}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-black text-[#071F38] mt-1.5">{item.title}</h3>
                  {item.summary && (
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.summary}</p>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 sm:text-right shrink-0">
                  <p>
                    By <strong>{item.requestedBy.name}</strong>
                  </p>
                  <p>{new Date(item.createdAt).toLocaleString('en-IN')}</p>
                </div>
              </div>

              {item.status === 'PENDING' && canDecide && (
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    value={decisionNote[item.id] || ''}
                    onChange={(e) =>
                      setDecisionNote((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    placeholder="Owner decision remark (optional)..."
                    className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={decidingId === item.id}
                      onClick={() => handleDecision(item.id, 'REJECTED')}
                      className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={decidingId === item.id}
                      onClick={() => handleDecision(item.id, 'APPROVED')}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Owner Approve
                    </button>
                  </div>
                </div>
              )}

              {item.status === 'PENDING' && !canDecide && (
                <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-amber-700">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Awaiting Business Owner approval decision.</span>
                </div>
              )}

              {item.status !== 'PENDING' && item.decidedBy && (
                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  Decided by <strong>{item.decidedBy.name}</strong> on{' '}
                  {item.decidedAt ? new Date(item.decidedAt).toLocaleString('en-IN') : ''}
                  {item.decisionNotes ? ` — "${item.decisionNotes}"` : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

