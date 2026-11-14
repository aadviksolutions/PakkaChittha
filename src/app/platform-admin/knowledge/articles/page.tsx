'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  Eye,
  RefreshCw,
  Sparkles,
  Clock,
  Layers,
} from 'lucide-react';

interface ArticleItem {
  id: string;
  slug: string;
  titleEn: string;
  titleHi: string;
  summaryEn: string;
  summaryHi: string;
  contentEn: string;
  contentHi: string;
  readingTimeMinutes: number;
  authorName?: string | null;
  reviewerName?: string | null;
  seoTitleEn?: string | null;
  seoTitleHi?: string | null;
  seoDescriptionEn?: string | null;
  seoDescriptionHi?: string | null;
  status: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'ARCHIVED';
  language: 'EN' | 'HI' | 'BOTH';
  viewCount: number;
  helpfulCount: number;
  isFeatured: boolean;
  publishedAt: string | null;
  categoryId: string;
  subcategoryId?: string | null;
  category: { id: string; nameEn: string; nameHi: string };
  subcategory?: { id: string; nameEn: string; nameHi: string } | null;
}

interface CategoryOption {
  id: string;
  nameEn: string;
  nameHi: string;
  subcategories: { id: string; nameEn: string; nameHi: string }[];
}

function ArticlesContent() {
  const searchParams = useSearchParams();
  const actionParam = searchParams.get('action');

  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<ArticleItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    titleEn: '',
    titleHi: '',
    slug: '',
    categoryId: '',
    subcategoryId: '',
    status: 'PUBLISHED' as 'DRAFT' | 'PUBLISHED',
    language: 'BOTH' as 'EN' | 'HI' | 'BOTH',
    summaryEn: '',
    summaryHi: '',
    contentEn: '',
    contentHi: '',
    readingTimeMinutes: 5,
    authorName: 'PakkaChittha Editorial Team',
    reviewerName: '',
    seoTitleEn: '',
    seoTitleHi: '',
    seoDescriptionEn: '',
    seoDescriptionHi: '',
    isFeatured: false,
  });

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/v1/admin/knowledge/categories');
      const json = await res.json();
      if (res.ok && json.success) {
        setCategories(json.categories || []);
      }
    } catch {}
  };

  const fetchArticles = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (categoryFilter) params.append('categoryId', categoryFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (search.trim()) params.append('search', search.trim());

      const res = await fetch(`/api/v1/admin/knowledge/articles?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load articles');
      }
      setArticles(json.articles || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading articles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [categoryFilter, statusFilter, search]);

  useEffect(() => {
    if (actionParam === 'new') {
      handleOpenCreate();
    }
  }, [actionParam, categories]);

  const handleOpenCreate = () => {
    setEditingArticle(null);
    setFormData({
      titleEn: '',
      titleHi: '',
      slug: '',
      categoryId: categories[0]?.id || '',
      subcategoryId: '',
      status: 'PUBLISHED',
      language: 'BOTH',
      summaryEn: '',
      summaryHi: '',
      contentEn: '',
      contentHi: '',
      readingTimeMinutes: 5,
      authorName: 'PakkaChittha Editorial Team',
      reviewerName: '',
      seoTitleEn: '',
      seoTitleHi: '',
      seoDescriptionEn: '',
      seoDescriptionHi: '',
      isFeatured: false,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (a: ArticleItem) => {
    setEditingArticle(a);
    setFormData({
      titleEn: a.titleEn,
      titleHi: a.titleHi,
      slug: a.slug,
      categoryId: a.categoryId,
      subcategoryId: a.subcategoryId || '',
      status: a.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
      language: a.language || 'BOTH',
      summaryEn: a.summaryEn,
      summaryHi: a.summaryHi,
      contentEn: a.contentEn,
      contentHi: a.contentHi,
      readingTimeMinutes: a.readingTimeMinutes,
      authorName: a.authorName || 'PakkaChittha Editorial Team',
      reviewerName: a.reviewerName || '',
      seoTitleEn: a.seoTitleEn || '',
      seoTitleHi: a.seoTitleHi || '',
      seoDescriptionEn: a.seoDescriptionEn || '',
      seoDescriptionHi: a.seoDescriptionHi || '',
      isFeatured: a.isFeatured,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titleEn.trim() || !formData.titleHi.trim()) {
      alert('Please enter both English and Hindi titles.');
      return;
    }
    if (!formData.summaryEn.trim() || !formData.summaryHi.trim()) {
      alert('Please enter both English and Hindi summaries.');
      return;
    }

    setSaving(true);
    try {
      const isEditing = Boolean(editingArticle);
      const url = isEditing
        ? `/api/v1/admin/knowledge/articles/${editingArticle!.id}`
        : '/api/v1/admin/knowledge/articles';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save article');
      }

      setModalOpen(false);
      fetchArticles();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error saving article');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: ArticleItem) => {
    if (!confirm(`Permanently delete article "${a.titleEn}"?`)) return;
    try {
      const res = await fetch(`/api/v1/admin/knowledge/articles/${a.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to delete');
      fetchArticles();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleToggleStatus = async (a: ArticleItem) => {
    const nextStatus = a.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      const res = await fetch(`/api/v1/admin/knowledge/articles/${a.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      fetchArticles();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const selectedCatObj = categories.find((c) => c.id === formData.categoryId);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Articles & Educational Guides
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                In-depth educational guides, business explainers and financial roadmaps
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchArticles}
            disabled={loading}
            className="p-2.5 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-xs cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#00B887] hover:bg-[#009E74] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Article</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles by title or topic..."
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          >
            <option value="">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameEn}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Articles Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Articles ({articles.length})
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {articles.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No articles found. Click &quot;New Article&quot; to write one.
            </div>
          ) : (
            articles.map((a) => (
              <div key={a.id} className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {a.category.nameEn}
                    </span>
                    {a.subcategory && (
                      <span className="text-[10px] font-medium text-slate-500">
                        › {a.subcategory.nameEn}
                      </span>
                    )}
                    {a.isFeatured && (
                      <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" /> Featured
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-black text-slate-900 leading-snug">
                    {a.titleEn}
                  </h3>
                  <p className="text-xs font-bold text-slate-600 mt-0.5">
                    {a.titleHi}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {a.summaryEn}
                  </p>

                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3" /> {a.readingTimeMinutes} min read
                    </span>
                    <span>•</span>
                    <span>Author: {a.authorName || 'Editorial'}</span>
                    <span>•</span>
                    <span>Views: {a.viewCount}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(a)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                      a.status === 'PUBLISHED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {a.status}
                  </button>

                  <Link
                    href={`/knowledge/articles/${a.slug}`}
                    target="_blank"
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    title="View Public Page"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(a)}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(a)}
                    className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Article Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 my-auto max-h-[92vh] flex flex-col">
            <div className="p-5 bg-gradient-to-r from-[#071F38] to-[#0A2E5C] text-white flex items-center justify-between shrink-0">
              <h2 className="text-sm sm:text-base font-black">
                {editingArticle ? 'Edit Article' : 'Write New Educational Guide'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {/* Category & Subcategory */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value, subcategoryId: '' })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameEn} ({c.nameHi})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subcategory</label>
                  <select
                    value={formData.subcategoryId}
                    onChange={(e) => setFormData({ ...formData, subcategoryId: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="">-- General / None --</option>
                    {selectedCatObj?.subcategories.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.nameEn} ({sub.nameHi})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title En & Hi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Article Title (English) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.titleEn}
                    onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                    placeholder="e.g. Complete Guide to GST for Beginners"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    लेख का शीर्षक (हिन्दी) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.titleHi}
                    onChange={(e) => setFormData({ ...formData, titleHi: e.target.value })}
                    placeholder="उदा. शुरुआती कारोबारियों के लिए जीएसटी की पूरी गाइड"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              {/* Summary En & Hi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Short Summary (English) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={formData.summaryEn}
                    onChange={(e) => setFormData({ ...formData, summaryEn: e.target.value })}
                    placeholder="2-3 sentence overview..."
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    संक्षिप्त सारांश (हिन्दी) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={formData.summaryHi}
                    onChange={(e) => setFormData({ ...formData, summaryHi: e.target.value })}
                    placeholder="2-3 वाक्यों में विषय का सार..."
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Full Content Markdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Content Markdown (English)
                  </label>
                  <textarea
                    rows={10}
                    value={formData.contentEn}
                    onChange={(e) => setFormData({ ...formData, contentEn: e.target.value })}
                    placeholder="Write article in Markdown (## Headings, paragraphs, bullet points)..."
                    className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    लेख का पूरा विवरण (हिन्दी)
                  </label>
                  <textarea
                    rows={10}
                    value={formData.contentHi}
                    onChange={(e) => setFormData({ ...formData, contentHi: e.target.value })}
                    placeholder="मार्कडाउन में लेख लिखें (## मुख्य शीर्षक, पैराग्राफ, बुलेट पॉइंट्स)..."
                    className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Author & Reviewer */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Author Name</label>
                  <input
                    type="text"
                    value={formData.authorName}
                    onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reviewer Name (Optional)</label>
                  <input
                    type="text"
                    value={formData.reviewerName}
                    onChange={(e) => setFormData({ ...formData, reviewerName: e.target.value })}
                    placeholder="e.g. CA Panel, Legal Expert"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reading Time (Minutes)</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.readingTimeMinutes}
                    onChange={(e) => setFormData({ ...formData, readingTimeMinutes: parseInt(e.target.value || '5', 10) })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Status and Flags */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Publication Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="PUBLISHED">Published (लाइव)</option>
                    <option value="DRAFT">Draft (ड्राफ्ट)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="isArtFeatured"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="isArtFeatured" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Feature on Homepage
                  </label>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#00B887] hover:bg-[#009E74] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Article'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function KnowledgeAdminArticlesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading articles...</div>}>
      <ArticlesContent />
    </Suspense>
  );
}

