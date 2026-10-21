'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  SlidersHorizontal,
  PlusCircle,
  Tag,
  Trash2,
  Check,
  X,
  Lock,
  ArrowRight,
  Shield,
  Layers,
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
}

export default function HouseholdCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [submitting, setSubmitting] = useState(false);
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

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      alert('Please enter a category name.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/household/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: catName.trim(),
          type: catType,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to create category.');
      }

      setShowAddModal(false);
      setCatName('');
      fetchCategories();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error creating category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete custom category "${name}"? Existing transactions will retain this category name in their audit history.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/household/categories/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete category');
      }
      fetchCategories();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error deleting category');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredCategories = categories.filter((c) => c.type === activeTab);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
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
            Manage spending and income classifications tailored to your family.
          </p>
        </div>

        <button
          onClick={() => {
            setCatType(activeTab);
            setShowAddModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all self-start sm:self-center cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Custom Category</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
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
      </div>

      {/* Category Grid */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-medium">Loading categories...</p>
          </div>
        ) : filteredCategories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCategories.map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-2xl border border-slate-200/80 hover:border-slate-300 bg-slate-50/50 flex items-center justify-between gap-2 transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                    <Tag className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-slate-800 truncate block">
                      {c.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">
                      {c.isDefault ? 'Standard Default' : 'Custom'}
                    </span>
                  </div>
                </div>

                {!c.isDefault && (
                  <button
                    onClick={() => handleDelete(c.id, c.name)}
                    disabled={deletingId === c.id}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Delete custom category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 text-xs">
            No categories found.
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Add Custom Category
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Type
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

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Pet Care, Tuition, Organic Veggies"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-xs font-bold text-slate-800 placeholder:text-slate-400 bg-white"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
