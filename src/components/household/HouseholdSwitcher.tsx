'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Home, ChevronDown, Plus, Check, Loader2, X, Building, ShieldCheck } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export interface HouseholdOption {
  id: string;
  name: string;
  currency: string;
  monthlyBudget: number;
  role: string;
  membersCount: number;
  transactionsCount: number;
}

interface HouseholdSwitcherProps {
  activeHouseholdId?: string | null;
  onHouseholdChange?: (householdId: string) => void;
  variant?: 'header' | 'inline' | 'compact';
}

export function HouseholdSwitcher({
  activeHouseholdId,
  onHouseholdChange,
  variant = 'inline',
}: HouseholdSwitcherProps) {
  const toast = useToast();
  const [households, setHouseholds] = useState<HouseholdOption[]>([]);
  const [currentId, setCurrentId] = useState<string>(activeHouseholdId || '');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Household Form State
  const [newHomeName, setNewHomeName] = useState('');
  const [newHomeBudget, setNewHomeBudget] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchHouseholds = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/household', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.households)) {
        setHouseholds(json.households);
        const savedId =
          activeHouseholdId ||
          (typeof window !== 'undefined' ? localStorage.getItem('active_household_id') : null) ||
          json.activeHousehold?.id ||
          json.households[0]?.id;

        if (savedId) {
          setCurrentId(savedId);
          if (typeof document !== 'undefined') {
            document.cookie = `active_household_id=${savedId}; path=/; max-age=31536000; SameSite=Lax`;
          }
        }
      }
    } catch (err) {
      console.error('Failed to load households', err);
    } finally {
      setLoading(false);
    }
  }, [activeHouseholdId]);

  useEffect(() => {
    fetchHouseholds();
  }, [fetchHouseholds]);

  // Sync if prop changes
  useEffect(() => {
    if (activeHouseholdId && activeHouseholdId !== currentId) {
      setCurrentId(activeHouseholdId);
    }
  }, [activeHouseholdId, currentId]);

  // Outside click handler
  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [isOpen]);

  const handleSelect = (id: string) => {
    if (id === currentId) {
      setIsOpen(false);
      return;
    }
    setCurrentId(id);
    setIsOpen(false);

    if (typeof window !== 'undefined') {
      localStorage.setItem('active_household_id', id);
      document.cookie = `active_household_id=${id}; path=/; max-age=31536000; SameSite=Lax`;
      window.dispatchEvent(new CustomEvent('householdChanged', { detail: { householdId: id } }));
    }

    if (onHouseholdChange) {
      onHouseholdChange(id);
    } else {
      window.location.reload();
    }
  };

  const handleCreateHome = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newHomeName.trim();
    if (!trimmed || trimmed.length < 2) {
      setCreateError('Please enter a valid home/unit name (min 2 characters).');
      return;
    }

    if (households.length >= 3) {
      setCreateError('A maximum of 3 homes/units can be added per account (अधिकतम 3 होम/यूनिट).');
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);

      const res = await fetch('/api/household', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmed,
          currency: 'INR',
          monthlyBudget: newHomeBudget ? parseFloat(newHomeBudget) : 0,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to create home/unit.');
      }

      toast.success(`Home/Unit "${trimmed}" created successfully!`);
      setShowAddModal(false);
      setNewHomeName('');
      setNewHomeBudget('');

      // Refresh and switch to newly created home
      await fetchHouseholds();
      if (json.household?.id) {
        handleSelect(json.household.id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating home/unit.';
      setCreateError(msg);
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const activeHome = households.find((h) => h.id === currentId) || households[0];
  const canAddMore = households.length < 3;

  return (
    <>
      <div ref={containerRef} className="relative inline-block text-left">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer select-none ${
            variant === 'header'
              ? 'bg-[#EBF3FA] hover:bg-[#DDE9F5] border-blue-200/80 text-[#1761A0]'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-2xs'
          }`}
          title="Switch Home / Unit"
        >
          <Home className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-bold truncate max-w-[120px] xs:max-w-[160px] sm:max-w-[200px]">
              {activeHome?.name || (loading ? 'Loading...' : 'Select Home')}
            </span>
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded shrink-0">
              {households.length}/3
            </span>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 z-50 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-2.5 py-1.5 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                My Homes &amp; Units
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                {households.length} of 3 added
              </span>
            </div>

            {/* List of Units */}
            <div className="py-1 space-y-1 max-h-56 overflow-y-auto">
              {households.map((h) => {
                const isActive = h.id === currentId;
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => handleSelect(h.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                        : 'hover:bg-slate-50 text-slate-800 border border-transparent'
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isActive ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Home className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold truncate block">{h.name}</span>
                          {isActive && (
                            <span className="text-[9px] font-black bg-emerald-600 text-white px-1.5 py-0.2 rounded">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 block">
                          Budget: ₹{h.monthlyBudget.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>

            {/* Add Home / Unit Button */}
            <div className="pt-1.5 border-t border-slate-100 mt-1">
              {canAddMore ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setShowAddModal(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Home / Unit ({households.length}/3)</span>
                </button>
              ) : (
                <div className="p-2 text-center text-[11px] font-semibold text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
                  Maximum 3 homes/units reached
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Home/Unit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Home className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add New Home / Unit</h3>
                  <p className="text-[11px] text-slate-500">
                    Separate accounting and independent reports (Unit {households.length + 1} of 3)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateHome} className="p-5 space-y-4">
              {createError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Home / Unit Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Second Home, Flat 204, Farmhouse, Shop"
                  value={newHomeName}
                  onChange={(e) => setNewHomeName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Monthly Budget (₹) (Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 25000"
                  value={newHomeBudget}
                  onChange={(e) => setNewHomeBudget(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
                <span className="text-[10.5px] text-slate-500 block mt-1">
                  You can track spending against this monthly budget.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Create Home / Unit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
