'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  HelpCircle,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Check,
  X,
  Eye,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Layers,
} from 'lucide-react';

interface QuestionItem {
  id: string;
  slug: string;
  titleEn: string;
  titleHi: string;
  shortAnswerEn: string;
  shortAnswerHi: string;
  detailedAnswerEn?: string | null;
  detailedAnswerHi?: string | null;
  simpleExplanationEn?: string | null;
  simpleExplanationHi?: string | null;
  practicalExampleEn?: string | null;
  practicalExampleHi?: string | null;
  importantPointsEn?: string | null;
  importantPointsHi?: string | null;
  referencesEn?: string | null;
  referencesHi?: string | null;
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

function QuestionsContent() {
  const searchParams = useSearchParams();
  const actionParam = searchParams.get('action');

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    titleEn: '',
    titleHi: '',
    slug: '',
    categoryId: '',
    subcategoryId: '',
    status: 'PUBLISHED' as 'DRAFT' | 'PUBLISHED',
    language: 'BOTH' as 'EN' | 'HI' | 'BOTH',
    shortAnswerEn: '',
    shortAnswerHi: '',
    detailedAnswerEn: '',
    detailedAnswerHi: '',
    simpleExplanationEn: '',
    simpleExplanationHi: '',
    practicalExampleEn: '',
    practicalExampleHi: '',
    importantPointsEn: '',
    importantPointsHi: '',
    referencesEn: '',
    referencesHi: '',
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

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (categoryFilter) params.append('categoryId', categoryFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (search.trim()) params.append('search', search.trim());

      const res = await fetch(`/api/v1/admin/knowledge/questions?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch questions');
      }
      setQuestions(json.questions || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [categoryFilter, statusFilter, search]);

  useEffect(() => {
    if (actionParam === 'new') {
      handleOpenCreate();
    }
  }, [actionParam, categories]);

  const handleOpenCreate = () => {
    setEditingQuestion(null);
    setFormData({
      titleEn: '',
      titleHi: '',
      slug: '',
      categoryId: categories[0]?.id || '',
      subcategoryId: '',
      status: 'PUBLISHED',
      language: 'BOTH',
      shortAnswerEn: '',
      shortAnswerHi: '',
      detailedAnswerEn: '',
      detailedAnswerHi: '',
      simpleExplanationEn: '',
      simpleExplanationHi: '',
      practicalExampleEn: '',
      practicalExampleHi: '',
      importantPointsEn: '',
      importantPointsHi: '',
      referencesEn: '',
      referencesHi: '',
      isFeatured: false,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (q: QuestionItem) => {
    setEditingQuestion(q);
    setFormData({
      titleEn: q.titleEn,
      titleHi: q.titleHi,
      slug: q.slug,
      categoryId: q.categoryId,
      subcategoryId: q.subcategoryId || '',
      status: q.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
      language: q.language || 'BOTH',
      shortAnswerEn: q.shortAnswerEn,
      shortAnswerHi: q.shortAnswerHi,
      detailedAnswerEn: q.detailedAnswerEn || '',
      detailedAnswerHi: q.detailedAnswerHi || '',
      simpleExplanationEn: q.simpleExplanationEn || '',
      simpleExplanationHi: q.simpleExplanationHi || '',
      practicalExampleEn: q.practicalExampleEn || '',
      practicalExampleHi: q.practicalExampleHi || '',
      importantPointsEn: q.importantPointsEn || '',
      importantPointsHi: q.importantPointsHi || '',
      referencesEn: q.referencesEn || '',
      referencesHi: q.referencesHi || '',
      isFeatured: q.isFeatured,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titleEn.trim() || !formData.titleHi.trim()) {
      alert('Please enter both English and Hindi titles.');
      return;
    }
    if (!formData.shortAnswerEn.trim() || !formData.shortAnswerHi.trim()) {
      alert('Please enter both English and Hindi short answers.');
      return;
    }

    setSaving(true);
    try {
      const isEditing = Boolean(editingQuestion);
      const url = isEditing
        ? `/api/v1/admin/knowledge/questions/${editingQuestion!.id}`
        : '/api/v1/admin/knowledge/questions';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save question');
      }

      setModalOpen(false);
      fetchQuestions();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error saving question');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (q: QuestionItem) => {
    if (!confirm(`Delete question "${q.titleEn}"?`)) return;
    try {
      const res = await fetch(`/api/v1/admin/knowledge/questions/${q.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to delete');
      fetchQuestions();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleToggleStatus = async (q: QuestionItem) => {
    const nextStatus = q.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      const res = await fetch(`/api/v1/admin/knowledge/questions/${q.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      fetchQuestions();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  // Selected Category's subcategories for modal dropdown
  const selectedCatObj = categories.find((c) => c.id === formData.categoryId);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Questions & Answers (Q&A)
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Comprehensive repository of everyday questions with simple, verified answers
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchQuestions}
            disabled={loading}
            className="p-2.5 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-xs cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Q&A</span>
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
            placeholder="Search questions by keyword or topic..."
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
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
            className="text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
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

      {/* Questions Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Questions ({questions.length})
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {questions.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No questions found. Click &quot;New Q&A&quot; to add one.
            </div>
          ) : (
            questions.map((q) => (
              <div key={q.id} className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                      {q.category.nameEn}
                    </span>
                    {q.subcategory && (
                      <span className="text-[10px] font-medium text-slate-500">
                        › {q.subcategory.nameEn}
                      </span>
                    )}
                    {q.isFeatured && (
                      <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" /> Featured
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-black text-slate-900 leading-snug">
                    {q.titleEn}
                  </h3>
                  <p className="text-xs font-bold text-slate-600 mt-0.5">
                    {q.titleHi}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {q.shortAnswerEn}
                  </p>

                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                    <span>slug: /{q.slug}</span>
                    <span>•</span>
                    <span>Views: {q.viewCount}</span>
                    <span>•</span>
                    <span>Helpful: {q.helpfulCount}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(q)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                      q.status === 'PUBLISHED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {q.status}
                  </button>

                  <Link
                    href={`/knowledge/questions/${q.slug}`}
                    target="_blank"
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    title="View Public Page"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(q)}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(q)}
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

      {/* Q&A Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 my-auto max-h-[90vh] flex flex-col">
            <div className="p-5 bg-gradient-to-r from-[#071F38] to-[#0A2E5C] text-white flex items-center justify-between shrink-0">
              <h2 className="text-sm sm:text-base font-black">
                {editingQuestion ? 'Edit Question & Answer' : 'Create New Q&A'}
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
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
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
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
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
                    Question Title (English) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.titleEn}
                    onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                    placeholder="e.g. What is the difference between FD and RD?"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    सवाल का शीर्षक (हिन्दी) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.titleHi}
                    onChange={(e) => setFormData({ ...formData, titleHi: e.target.value })}
                    placeholder="उदा. एफडी और आरडी में क्या अंतर है?"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              {/* Short Answer En & Hi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Short Answer (English) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={formData.shortAnswerEn}
                    onChange={(e) => setFormData({ ...formData, shortAnswerEn: e.target.value })}
                    placeholder="1-2 sentences direct answer..."
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    संक्षिप्त उत्तर (हिन्दी) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={formData.shortAnswerHi}
                    onChange={(e) => setFormData({ ...formData, shortAnswerHi: e.target.value })}
                    placeholder="1-2 वाक्यों में सीधा और स्पष्ट उत्तर..."
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Detailed Answer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Detailed Explanation (English)</label>
                  <textarea
                    rows={4}
                    value={formData.detailedAnswerEn}
                    onChange={(e) => setFormData({ ...formData, detailedAnswerEn: e.target.value })}
                    placeholder="Detailed explanation with all context..."
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">विस्तृत व्याख्या (हिन्दी)</label>
                  <textarea
                    rows={4}
                    value={formData.detailedAnswerHi}
                    onChange={(e) => setFormData({ ...formData, detailedAnswerHi: e.target.value })}
                    placeholder="पूरी और विस्तृत जानकारी..."
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Practical Example */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Practical Example (English)</label>
                  <textarea
                    rows={2}
                    value={formData.practicalExampleEn}
                    onChange={(e) => setFormData({ ...formData, practicalExampleEn: e.target.value })}
                    placeholder="Real-life scenario or calculation..."
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">व्यावहारिक उदाहरण (हिन्दी)</label>
                  <textarea
                    rows={2}
                    value={formData.practicalExampleHi}
                    onChange={(e) => setFormData({ ...formData, practicalExampleHi: e.target.value })}
                    placeholder="दैनिक जीवन का कोई उदाहरण या गणना..."
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    <option value="PUBLISHED">Published (सार्वजनिक रूप से लाइव)</option>
                    <option value="DRAFT">Draft (अप्रकाशित ड्राफ्ट)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isFeatured" className="text-xs font-bold text-slate-700 cursor-pointer">
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Question'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function KnowledgeAdminQuestionsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading questions...</div>}>
      <QuestionsContent />
    </Suspense>
  );
}

