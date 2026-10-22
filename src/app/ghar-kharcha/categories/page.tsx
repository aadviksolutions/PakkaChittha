'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  SlidersHorizontal,
  PlusCircle,
  Tag,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Zap,
  Smartphone,
  PhoneCall,
  Droplets,
  Flame,
  Wifi,
  Tv,
  Archive,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';

interface Category {
  id: string;
  householdId: string | null;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon: string | null;
  color: string | null;
  monthlyBudget: number | null;
  isDefault: boolean;
  isArchived: boolean;
  subcategories: string[];
}

const BILL_DEFINITIONS = [
  { id: 'MOBILE_RECHARGE', label: 'Mobile Recharge', icon: Smartphone, color: 'text-indigo-600 bg-indigo-50 border-indigo-200', desc: 'Prepaid SIM recharges (Jio, Airtel, Vi, BSNL)' },
  { id: 'MOBILE_POSTPAID', label: 'Mobile / Postpaid Bill', icon: PhoneCall, color: 'text-blue-600 bg-blue-50 border-blue-200', desc: 'Monthly cellular postpaid bills & family plans' },
  { id: 'ELECTRICITY', label: 'Electricity Bill', icon: Zap, color: 'text-amber-600 bg-amber-50 border-amber-200', desc: 'State discoms (BESCOM, Tata Power, BSES, Adani)' },
  { id: 'WATER', label: 'Water Bill', icon: Droplets, color: 'text-sky-600 bg-sky-50 border-sky-200', desc: 'Municipal water supply, DJB, tankers & bulk supply' },
  { id: 'GAS', label: 'LPG / Gas Bill', icon: Flame, color: 'text-orange-600 bg-orange-50 border-orange-200', desc: 'LPG cylinder refills (Indane, HP, Bharat Gas) & PNG' },
  { id: 'INTERNET', label: 'Internet & Broadband', icon: Wifi, color: 'text-cyan-600 bg-cyan-50 border-cyan-200', desc: 'Fiber broadband (ACT, JioFiber, Airtel Xstream)' },
  { id: 'DTH', label: 'DTH / Cable TV', icon: Tv, color: 'text-purple-600 bg-purple-50 border-purple-200', desc: 'Tata Play, Airtel DTH, Dish TV & local cable' },
];

export default function HouseholdCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'EXPENSE' | 'INCOME' | 'BILLS'>('EXPENSE');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<'ALL' | 'DEFAULT' | 'CUSTOM'>('ALL');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [subcategoriesInput, setSubcategoriesInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/household/categories');
      const json = await res.json();
      if (json.success) {
        setCategories(json.categories);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setCatName('');
    setCatType(activeTab === 'INCOME' ? 'INCOME' : 'EXPENSE');
    setSubcategoriesInput('');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatType(cat.type);
    setSubcategoriesInput(cat.subcategories?.join(', ') || '');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      setErrorMsg('Please enter a category name.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    const subcats = subcategoriesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      if (editingCategory) {
        // Edit category
        const res = await fetch(`/api/household/categories/${editingCategory.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: catName.trim(),
            subcategories: subcats,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to update category.');
        }

        setActionNotice(`Category "${catName.trim()}" updated successfully.`);
      } else {
        // Create category
        const res = await fetch('/api/household/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: catName.trim(),
            type: catType,
            subcategories: subcats,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to create category.');
        }

        setActionNotice(`Category "${catName.trim()}" created successfully.`);
      }

      setShowModal(false);
      fetchCategories();
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error saving category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOrArchive = async (id: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to remove custom category "${name}"?\n\nIf historical transactions depend on it, it will be safely archived so your expense history remains intact.`
      )
    ) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/household/categories/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete category');
      }

      setActionNotice(json.message || `Category "${name}" removed.`);
      fetchCategories();
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error deleting category');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      // Tab filter
      if (activeTab === 'EXPENSE' && c.type !== 'EXPENSE') return false;
      if (activeTab === 'INCOME' && c.type !== 'INCOME') return false;

      // Source filter
      if (filterSource === 'DEFAULT' && !c.isDefault) return false;
      if (filterSource === 'CUSTOM' && c.isDefault) return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = c.name.toLowerCase().includes(query);
        const matchesSub = c.subcategories?.some((s) => s.toLowerCase().includes(query));
        if (!matchesName && !matchesSub) return false;
      }

      return true;
    });
  }, [categories, activeTab, filterSource, searchQuery]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/ghar-kharcha"
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Household Categories
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Manage spending &amp; income classifications, subcategories, and dedicated utility bill types.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all self-start sm:self-center cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Custom Category</span>
        </button>
      </div>

      {actionNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl p-4 flex items-center justify-between animate-in fade-in">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab('EXPENSE')}
          className={`pb-3 text-xs sm:text-sm font-bold tracking-tight border-b-2 transition-all cursor-pointer ${
            activeTab === 'EXPENSE'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Expense Categories ({categories.filter((c) => c.type === 'EXPENSE').length})
        </button>

        <button
          onClick={() => setActiveTab('INCOME')}
          className={`pb-3 text-xs sm:text-sm font-bold tracking-tight border-b-2 transition-all cursor-pointer ${
            activeTab === 'INCOME'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Income Categories ({categories.filter((c) => c.type === 'INCOME').length})
        </button>

        <button
          onClick={() => setActiveTab('BILLS')}
          className={`pb-3 text-xs sm:text-sm font-bold tracking-tight border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'BILLS'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>Bills &amp; Recharge Types ({BILL_DEFINITIONS.length})</span>
        </button>
      </div>

      {/* BILLS & RECHARGE TAB */}
      {activeTab === 'BILLS' ? (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-xs text-amber-800 font-medium">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              These dedicated utility and recharge categories allow tracking provider details, consumer IDs, bill cycles, and due dates without entering sensitive credentials.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
            {BILL_DEFINITIONS.map((bill) => {
              const IconComp = bill.icon;
              return (
                <div
                  key={bill.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-start gap-3.5"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${bill.color}`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-xs text-slate-900">{bill.label}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                        Active
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{bill.desc}</p>
                    <div className="mt-2 text-[10px] font-semibold text-slate-400">
                      Supports: Provider name • Consumer ID • Bill Period • Due Date
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* EXPENSE & INCOME TAB */
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search categories or subcategories..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-slate-50/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs font-semibold">
              <span className="text-slate-400 text-[11px] mr-1">Filter:</span>
              <button
                onClick={() => setFilterSource('ALL')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterSource === 'ALL'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterSource('DEFAULT')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterSource === 'DEFAULT'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Standard Defaults
              </button>
              <button
                onClick={() => setFilterSource('CUSTOM')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterSource === 'CUSTOM'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Custom
              </button>
            </div>
          </div>

          {/* Category Grid */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            {loading ? (
              <div className="py-16 text-center">
                <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">Loading categories...</p>
              </div>
            ) : filteredCategories.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredCategories.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl border border-slate-200/80 hover:border-slate-300 bg-slate-50/50 flex flex-col justify-between gap-3 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                          <Tag className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-900 truncate block">
                            {c.name}
                          </span>
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              c.isDefault
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {c.isDefault ? 'Standard Default' : 'Custom Category'}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      {!c.isDefault && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleOpenEditModal(c)}
                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Category"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteOrArchive(c.id, c.name)}
                            disabled={deletingId === c.id}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove or Archive Category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Subcategories preview tags */}
                    {c.subcategories && c.subcategories.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/60">
                        <div className="text-[10px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          <span>Subcategories ({c.subcategories.length}):</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {c.subcategories.slice(0, 4).map((sub, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200/80 text-slate-600 font-medium"
                            >
                              {sub}
                            </span>
                          ))}
                          {c.subcategories.length > 4 && (
                            <span className="text-[9px] px-1.5 py-0.5 text-slate-400 font-bold self-center">
                              +{c.subcategories.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                No categories matching &quot;{searchQuery}&quot; found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                {editingCategory ? 'Edit Custom Category' : 'Add Custom Category'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="space-y-4">
              {!editingCategory && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Category Type
                  </label>
                  <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setCatType('EXPENSE')}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        catType === 'EXPENSE'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Expense
                    </button>
                    <button
                      type="button"
                      onClick={() => setCatType('INCOME')}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        catType === 'INCOME'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Income
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Pet Supplies, School Bus, Organic Farm"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-xs font-bold text-slate-800 placeholder:text-slate-400 bg-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Normalized case-insensitively to prevent duplicates within this household.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Optional Subcategories
                </label>
                <input
                  type="text"
                  value={subcategoriesInput}
                  onChange={(e) => setSubcategoriesInput(e.target.value)}
                  placeholder="Comma-separated, e.g. Food, Vet Visits, Grooming"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-xs font-medium text-slate-800 placeholder:text-slate-400 bg-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Separate subcategories with commas.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
