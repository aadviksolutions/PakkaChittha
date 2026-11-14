'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  HelpCircle,
  FileText,
  Layers,
  Inbox,
  Eye,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Plus,
  RefreshCw,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface DashboardMetrics {
  totalCategories: number;
  totalSubcategories: number;
  totalQuestions: number;
  publishedQuestions: number;
  draftQuestions: number;
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  pendingSubmissions: number;
}

interface TopContent {
  id: string;
  slug: string;
  titleEn: string;
  titleHi: string;
  viewCount: number;
  status: string;
}

interface SubmissionItem {
  id: string;
  name: string | null;
  email: string | null;
  question: string;
  preferredLang: string;
  createdAt: string;
  category?: { nameEn: string; nameHi: string } | null;
}

export default function KnowledgeAdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [topQuestions, setTopQuestions] = useState<TopContent[]>([]);
  const [topArticles, setTopArticles] = useState<TopContent[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/v1/admin/knowledge/dashboard');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load dashboard data');
      }
      setMetrics(json.data.metrics);
      setTopQuestions(json.data.topQuestions || []);
      setTopArticles(json.data.topArticles || []);
      setRecentSubmissions(json.data.recentSubmissions || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Knowledge Hub Administration
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                हर सवाल का जवाब, अब एक ही जगह! • Central Public Awareness & Knowledge Engine
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchDashboard}
            disabled={loading}
            className="p-2.5 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-xs cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            href="/knowledge"
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#071F38] hover:bg-[#0c3156] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <span>Live Public Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Categories */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Categories</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {metrics?.totalCategories ?? 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {metrics?.totalSubcategories ?? 0} Subcategories active
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <Link
              href="/platform-admin/knowledge/categories"
              className="text-xs font-bold text-[#EA580C] hover:underline inline-flex items-center gap-1"
            >
              <span>Manage Categories</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Questions */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Q&A Repository</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {metrics?.totalQuestions ?? 0}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">
            {metrics?.publishedQuestions ?? 0} Published • {metrics?.draftQuestions ?? 0} Draft
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <Link
              href="/platform-admin/knowledge/questions"
              className="text-xs font-bold text-[#EA580C] hover:underline inline-flex items-center gap-1"
            >
              <span>Manage Questions</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Articles */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Articles & Guides</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {metrics?.totalArticles ?? 0}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">
            {metrics?.publishedArticles ?? 0} Published • {metrics?.draftArticles ?? 0} Draft
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <Link
              href="/platform-admin/knowledge/articles"
              className="text-xs font-bold text-[#EA580C] hover:underline inline-flex items-center gap-1"
            >
              <span>Manage Articles</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* User Submissions */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">User Questions</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {metrics?.pendingSubmissions ?? 0}
          </div>
          <p className="text-[11px] text-amber-600 font-semibold mt-1">
            Pending moderation
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <Link
              href="/platform-admin/knowledge/submissions"
              className="text-xs font-bold text-[#EA580C] hover:underline inline-flex items-center gap-1"
            >
              <span>Moderate Questions</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="p-6 bg-gradient-to-r from-[#071F38] via-[#0A2E5C] to-[#071F38] rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-amber-300 border border-white/10">
            Content Publishing
          </span>
          <h2 className="text-base sm:text-lg font-black mt-1.5">
            Add New Educational Content to PakkaChittha
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Create verified answers or practical guides in Hindi and English.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/platform-admin/knowledge/categories"
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Category</span>
          </Link>
          <Link
            href="/platform-admin/knowledge/questions?action=new"
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Q&A</span>
          </Link>
          <Link
            href="/platform-admin/knowledge/articles?action=new"
            className="px-3.5 py-2 bg-[#00B887] hover:bg-[#009E74] text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Article</span>
          </Link>
        </div>
      </div>

      {/* Two Column Grid: Popular Questions & Top Articles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Most Viewed Questions */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-black text-slate-900">Most Visited Questions</h3>
            </div>
            <Link
              href="/platform-admin/knowledge/questions"
              className="text-xs font-bold text-[#EA580C] hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {topQuestions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No questions published yet.</div>
            ) : (
              topQuestions.map((q) => (
                <div key={q.id} className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{q.titleHi}</p>
                    <p className="text-[11px] text-slate-500 truncate">{q.titleEn}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                      <Eye className="w-3 h-3 text-slate-400" />
                      {q.viewCount}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {q.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Most Viewed Articles */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-black text-slate-900">Top Educational Guides</h3>
            </div>
            <Link
              href="/platform-admin/knowledge/articles"
              className="text-xs font-bold text-[#EA580C] hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {topArticles.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No articles published yet.</div>
            ) : (
              topArticles.map((a) => (
                <div key={a.id} className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{a.titleHi}</p>
                    <p className="text-[11px] text-slate-500 truncate">{a.titleEn}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                      <Eye className="w-3 h-3 text-slate-400" />
                      {a.viewCount}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {a.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

