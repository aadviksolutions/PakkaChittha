'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Inbox, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Mail, 
  MapPin, 
  Briefcase, 
  ExternalLink,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface Submission {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  occupation: string | null;
  question: string;
  context: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ANSWERED';
  adminNotes: string | null;
  convertedQuestionId: string | null;
  category: {
    id: string;
    nameEn: string;
    nameHi: string;
  } | null;
  createdAt: string;
}

export default function SubmissionsManagementPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Review modal state
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'ALL') {
        params.set('status', statusFilter);
      }
      params.set('page', page.toString());
      params.set('limit', '15');

      const res = await fetch(`/api/v1/admin/knowledge/submissions?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setSubmissions(data.submissions || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Failed to load submissions', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleUpdateStatus = async (status: 'APPROVED' | 'REJECTED' | 'ANSWERED') => {
    if (!selectedSub) return;
    try {
      setUpdating(true);
      const res = await fetch(`/api/v1/admin/knowledge/submissions/${selectedSub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          adminNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedSub(null);
        setAdminNotes('');
        fetchSubmissions();
      } else {
        alert(data.error || 'Failed to update submission');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating submission');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            Pending Review
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved
          </span>
        );
      case 'ANSWERED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Answered
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Inbox className="w-7 h-7 text-emerald-400" />
            Visitor Question Submissions
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Review questions submitted by citizens, shopkeepers, and business owners across India.
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-medium text-slate-400">Total Submissions:</span>
          <span className="ml-2 text-lg font-bold text-emerald-400">{totalCount}</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {['ALL', 'PENDING', 'APPROVED', 'ANSWERED', 'REJECTED'].map((st) => (
          <button
            key={st}
            onClick={() => {
              setStatusFilter(st);
              setPage(1);
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === st
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading submissions...
        </div>
      ) : submissions.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl">
          <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No submissions found</h3>
          <p className="text-sm text-slate-400 mt-1">
            {statusFilter === 'ALL'
              ? 'No visitor questions have been submitted yet.'
              : `No questions with status "${statusFilter}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <div
              key={sub.id}
              className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl hover:border-slate-700 transition-all space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    {getStatusBadge(sub.status)}
                    <span className="text-xs text-slate-500">
                      {new Date(sub.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {sub.category && (
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {sub.category.nameEn}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white mt-1.5 leading-snug">
                    {sub.question}
                  </h3>
                </div>

                <button
                  onClick={() => {
                    setSelectedSub(sub);
                    setAdminNotes(sub.adminNotes || '');
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors"
                >
                  Review / Action
                </button>
              </div>

              {sub.context && (
                <p className="text-sm text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                  {sub.context}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                <span className="font-semibold text-slate-200">{sub.name}</span>
                {sub.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    {sub.email}
                  </span>
                )}
                {sub.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    {sub.city}
                  </span>
                )}
                {sub.occupation && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                    {sub.occupation}
                  </span>
                )}
                {sub.adminNotes && (
                  <span className="text-amber-400/90 ml-auto font-mono text-[11px]">
                    Note: {sub.adminNotes}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-xs text-slate-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  Review Question Submission
                </span>
                <h3 className="text-lg font-bold text-white mt-1">{selectedSub.name}</h3>
              </div>
              <button
                onClick={() => setSelectedSub(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-sm">
              <div>
                <span className="text-xs font-semibold text-slate-400">Question:</span>
                <p className="text-white font-medium mt-0.5">{selectedSub.question}</p>
              </div>
              {selectedSub.context && (
                <div>
                  <span className="text-xs font-semibold text-slate-400">Context/Details:</span>
                  <p className="text-slate-300 mt-0.5 text-xs">{selectedSub.context}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-500">Email:</span>{' '}
                  <span className="text-slate-300">{selectedSub.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Phone:</span>{' '}
                  <span className="text-slate-300">{selectedSub.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500">City:</span>{' '}
                  <span className="text-slate-300">{selectedSub.city || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Occupation:</span>{' '}
                  <span className="text-slate-300">{selectedSub.occupation || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Internal Admin Notes
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="e.g. Good question, creating an answer under GST Category..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <Link
                  href={`/platform-admin/knowledge/questions?prefill=${encodeURIComponent(
                    selectedSub.question
                  )}`}
                  target="_blank"
                  className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Convert to Q&A
                </Link>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleUpdateStatus('REJECTED')}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleUpdateStatus('ANSWERED')}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30"
                >
                  Mark Answered
                </button>
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleUpdateStatus('APPROVED')}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-md"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

