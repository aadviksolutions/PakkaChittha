'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Eye,
  BookOpen,
} from 'lucide-react';

interface SubcategoryItem {
  id: string;
  slug: string;
  nameEn: string;
  nameHi: string;
  displayOrder: number;
  isActive: boolean;
}

interface CategoryItem {
  id: string;
  slug: string;
  nameEn: string;
  nameHi: string;
  descriptionEn: string | null;
  descriptionHi: string | null;
  icon: string | null;
  displayOrder: number;
  isActive: boolean;
  subcategories: SubcategoryItem[];
  _count: {
    questions: number;
    articles: number;
    submissions: number;
  };
}

export default function KnowledgeAdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);

  // Category Modal
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [catForm, setCatForm] = useState({
    nameEn: '',
    nameHi: '',
    slug: '',
    descriptionEn: '',
    descriptionHi: '',
    icon: 'BookOpen',
    displayOrder: 0,
    isActive: true,
  });
  const [savingCat, setSavingCat] = useState(false);

  // Subcategory Modal
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [targetCatId, setTargetCatId] = useState<string | null>(null);
  const [editingSub, setEditingSub] = useState<SubcategoryItem | null>(null);
  const [subForm, setSubForm] = useState({
    nameEn: '',
    nameHi: '',
    slug: '',
    displayOrder: 0,
  });
  const [savingSub, setSavingSub] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/v1/admin/knowledge/categories');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load categories');
      }
      setCategories(json.categories || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCatForm({
      nameEn: '',
      nameHi: '',
      slug: '',
      descriptionEn: '',
      descriptionHi: '',
      icon: 'BookOpen',
      displayOrder: categories.length + 1,
      isActive: true,
    });
    setCatModalOpen(true);
  };

  const handleOpenEditCategory = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setCatForm({
      nameEn: cat.nameEn,
      nameHi: cat.nameHi,
      slug: cat.slug,
      descriptionEn: cat.descriptionEn || '',
      descriptionHi: cat.descriptionHi || '',
      icon: cat.icon || 'BookOpen',
      displayOrder: cat.displayOrder,
      isActive: cat.isActive,
    });
    setCatModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.nameEn.trim() || !catForm.nameHi.trim()) {
      alert('Please fill both English and Hindi category names.');
      return;
    }
    setSavingCat(true);
    try {
      const isEditing = Boolean(editingCategory);
      const url = isEditing
        ? `/api/v1/admin/knowledge/categories/${editingCategory!.id}`
        : '/api/v1/admin/knowledge/categories';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catForm),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save category');
      }
      setCatModalOpen(false);
      fetchCategories();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setSavingCat(false);
    }
  };

  const handleDeleteCategory = async (cat: CategoryItem) => {
    const totalContent = cat._count.questions + cat._count.articles;
    const msg = totalContent > 0
      ? `Category "${cat.nameEn}" contains ${totalContent} items. Deleting it will deactivate it to prevent content loss. Proceed?`
      : `Permanently delete category "${cat.nameEn}"?`;

    if (!confirm(msg)) return;

    try {
      const res = await fetch(`/api/v1/admin/knowledge/categories/${cat.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to delete');
      fetchCategories();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  // Subcategory Actions
  const handleOpenAddSub = (categoryId: string) => {
    setTargetCatId(categoryId);
    setEditingSub(null);
    setSubForm({ nameEn: '', nameHi: '', slug: '', displayOrder: 1 });
    setSubModalOpen(true);
  };

  const handleOpenEditSub = (categoryId: string, sub: SubcategoryItem) => {
    setTargetCatId(categoryId);
    setEditingSub(sub);
    setSubForm({
      nameEn: sub.nameEn,
      nameHi: sub.nameHi,
      slug: sub.slug,
      displayOrder: sub.displayOrder,
    });
    setSubModalOpen(true);
  };

  const handleSaveSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subForm.nameEn.trim() || !subForm.nameHi.trim() || !targetCatId) {
      alert('Please fill English and Hindi names.');
      return;
    }
    setSavingSub(true);
    try {
      const isEditing = Boolean(editingSub);
      const url = isEditing
        ? `/api/v1/admin/knowledge/subcategories/${editingSub!.id}`
        : '/api/v1/admin/knowledge/subcategories';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...subForm, categoryId: targetCatId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to save subcategory');
      setSubModalOpen(false);
      fetchCategories();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error saving subcategory');
    } finally {
      setSavingSub(false);
    }
  };

  const handleDeleteSub = async (subId: string) => {
    if (!confirm('Delete this subcategory?')) return;
    try {
      const res = await fetch(`/api/v1/admin/knowledge/subcategories/${subId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to delete');
      fetchCategories();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Categories & Subcategories
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Manage all 15 master knowledge domains and their respective topics
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchCategories}
            disabled={loading}
            className="p-2.5 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-xs cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenAddCategory}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#EA580C] hover:bg-[#D94E00] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Category</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Categories List */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Category Directory ({categories.length})
          </span>
          <span className="text-xs text-slate-400">
            Click on category to expand subcategories
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {categories.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No categories found. Click &quot;New Category&quot; to create one.
            </div>
          ) : (
            categories.map((cat, idx) => {
              const isExpanded = expandedCatId === cat.id;

              return (
                <div key={cat.id} className="transition-colors">
                  {/* Category Header Row */}
                  <div className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/70">
                    <div
                      className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer"
                      onClick={() => setExpandedCatId(isExpanded ? null : cat.id)}
                    >
                      <button
                        type="button"
                        className="text-slate-400 hover:text-slate-600 p-1"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-700" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      <div className="w-9 h-9 rounded-xl bg-slate-100 text-[#071F38] font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black text-slate-900 truncate">
                            {cat.nameEn}
                          </h3>
                          <span className="text-xs font-bold text-slate-500">
                            • {cat.nameHi}
                          </span>
                          {!cat.isActive && (
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-200 text-slate-600">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          slug: /{cat.slug} • {cat.subcategories.length} subcategories • {cat._count.questions} questions • {cat._count.articles} articles
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/knowledge/category/${cat.slug}`}
                        target="_blank"
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="View on Live Site"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleOpenAddSub(cat.id)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                        title="Add Subcategory"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Subcategory</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditCategory(cat)}
                        className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit Category"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat)}
                        className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Subcategories Drawer */}
                  {isExpanded && (
                    <div className="bg-slate-50/80 px-6 py-4 border-t border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600">
                          Subcategories of {cat.nameEn}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenAddSub(cat.id)}
                          className="text-xs font-bold text-[#EA580C] hover:underline inline-flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Add Subcategory</span>
                        </button>
                      </div>

                      {cat.subcategories.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No subcategories created yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                          {cat.subcategories.map((sub) => (
                            <div
                              key={sub.id}
                              className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">{sub.nameEn}</p>
                                <p className="text-[11px] text-slate-500 truncate">{sub.nameHi}</p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditSub(cat.id, sub)}
                                  className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                                  title="Edit Subcategory"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSub(sub.id)}
                                  className="p-1 text-rose-400 hover:text-rose-700 rounded hover:bg-rose-50 cursor-pointer"
                                  title="Delete Subcategory"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Category Add/Edit Modal */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 my-auto">
            <div className="p-5 bg-gradient-to-r from-[#071F38] to-[#0A2E5C] text-white flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-black">
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </h2>
              <button
                type="button"
                onClick={() => setCatModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    English Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={catForm.nameEn}
                    onChange={(e) => setCatForm({ ...catForm, nameEn: e.target.value })}
                    placeholder="e.g. Small Business & Shop"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hindi Name (हिन्दी नाम) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={catForm.nameHi}
                    onChange={(e) => setCatForm({ ...catForm, nameHi: e.target.value })}
                    placeholder="उदा. छोटा व्यवसाय एवं दुकान"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">URL Slug</label>
                <input
                  type="text"
                  value={catForm.slug}
                  onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })}
                  placeholder="auto-generated from English name if empty"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">English Description</label>
                <textarea
                  rows={2}
                  value={catForm.descriptionEn}
                  onChange={(e) => setCatForm({ ...catForm, descriptionEn: e.target.value })}
                  placeholder="Short description for card display"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hindi Description (हिन्दी विवरण)</label>
                <textarea
                  rows={2}
                  value={catForm.descriptionHi}
                  onChange={(e) => setCatForm({ ...catForm, descriptionHi: e.target.value })}
                  placeholder="कार्ड के लिए संक्षिप्त विवरण"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={catForm.displayOrder}
                    onChange={(e) => setCatForm({ ...catForm, displayOrder: parseInt(e.target.value || '0', 10) })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="catIsActive"
                    checked={catForm.isActive}
                    onChange={(e) => setCatForm({ ...catForm, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-[#EA580C] focus:ring-[#EA580C]"
                  />
                  <label htmlFor="catIsActive" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Active / Published
                  </label>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCatModalOpen(false)}
                  disabled={savingCat}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCat}
                  className="px-5 py-2 bg-[#EA580C] hover:bg-[#D94E00] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{savingCat ? 'Saving...' : 'Save Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subcategory Add/Edit Modal */}
      {subModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 my-auto">
            <div className="p-5 bg-gradient-to-r from-[#071F38] to-[#0A2E5C] text-white flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-black">
                {editingSub ? 'Edit Subcategory' : 'Add New Subcategory'}
              </h2>
              <button
                type="button"
                onClick={() => setSubModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubcategory} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subcategory Name (English) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={subForm.nameEn}
                  onChange={(e) => setSubForm({ ...subForm, nameEn: e.target.value })}
                  placeholder="e.g. Household Budget"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subcategory Name (हिन्दी नाम) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={subForm.nameHi}
                  onChange={(e) => setSubForm({ ...subForm, nameHi: e.target.value })}
                  placeholder="उदा. घरेलू बजट"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">URL Slug</label>
                <input
                  type="text"
                  value={subForm.slug}
                  onChange={(e) => setSubForm({ ...subForm, slug: e.target.value })}
                  placeholder="auto-generated from English name if empty"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Display Order</label>
                <input
                  type="number"
                  value={subForm.displayOrder}
                  onChange={(e) => setSubForm({ ...subForm, displayOrder: parseInt(e.target.value || '0', 10) })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSubModalOpen(false)}
                  disabled={savingSub}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSub}
                  className="px-5 py-2 bg-[#00B887] hover:bg-[#009E74] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{savingSub ? 'Saving...' : 'Save Subcategory'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

