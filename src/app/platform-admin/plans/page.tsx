'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import {
  Layers,
  Check,
  RefreshCw,
  ShieldAlert,
  Edit2,
  Save,
  X,
  IndianRupee,
  Calendar,
} from 'lucide-react';
import { BillingInterval } from '@/lib/subscription/plans';

interface PlanPricingTier {
  durationMonths: number;
  totalPrice: number;
  monthlyEquivalent: number;
  savingsAmount: number;
  savingsPercent: number;
}

interface PlanDetail {
  key: string;
  dbEnumKey: string;
  name: string;
  priceLabel: string;
  monthlyPrice: number;
  annualPrice: number;
  badge: string;
  features: string[];
  pricing: Record<BillingInterval, PlanPricingTier>;
  quotas: {
    maxMonthlyInvoices: number;
    maxStaffSeats: number;
    maxBranches: number;
    whatsAppQuota: number;
  };
  activeSubscribersCount: number;
}

export default function PlatformAdminPlansPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<PlanDetail[]>([]);
  const [editingPlanKey, setEditingPlanKey] = useState<string | null>(null);
  const [editingInterval, setEditingInterval] = useState<BillingInterval | null>(null);
  const [editPriceInput, setEditPriceInput] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');
  const [savingPrice, setSavingPrice] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/platform-admin/plans');
      if (!res.ok) throw new Error('Failed to load plan configuration');
      const data = await res.json();
      setPlans(data.plans || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error fetching plans');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (planKey: string, interval: BillingInterval, currentPrice: number) => {
    setEditingPlanKey(planKey);
    setEditingInterval(interval);
    setEditPriceInput(String(currentPrice));
    setEditReason('');
  };

  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlanKey || !editingInterval) return;

    const price = parseFloat(editPriceInput);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price greater than zero');
      return;
    }

    try {
      setSavingPrice(true);
      const res = await fetch('/api/platform-admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planKey: editingPlanKey,
          interval: editingInterval,
          price,
          reason: editReason || `Admin updated ${editingPlanKey} ${editingInterval} price to ₹${price}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update pricing');

      toast.success(data.message || 'Pricing updated successfully!');
      setEditingPlanKey(null);
      setEditingInterval(null);
      fetchPlans();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update price');
    } finally {
      setSavingPrice(false);
    }
  };

  const INTERVALS: { key: BillingInterval; label: string; months: number }[] = [
    { key: 'MONTHLY', label: '1 Month', months: 1 },
    { key: 'THREE_MONTHS', label: '3 Months', months: 3 },
    { key: 'SIX_MONTHS', label: '6 Months', months: 6 },
    { key: 'YEARLY', label: '12 Months (Yearly)', months: 12 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-[#EA580C]" />
            <span>Authoritative Package & Dynamic Price Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure live package prices for all billing durations (1, 3, 6, 12 months). Changes immediately propagate to website checkout and native mobile app APIs.
          </p>
        </div>

        <button
          onClick={fetchPlans}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs self-start cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Live Matrix</span>
        </button>
      </div>

      {/* Security Architecture Box */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950 to-slate-900 border border-purple-800 text-white shadow-sm flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-bold text-purple-300 uppercase tracking-wider text-[11px]">
            Server-Enforced Dynamic Pricing &amp; Historical Transaction Protection
          </div>
          <p className="text-purple-100/90 leading-relaxed">
            All prices below are stored in the authoritative database. Updating a price strictly impacts future orders only — existing active subscribers and historical orders retain their originally paid amounts. Free Khata remains permanently ₹0.
          </p>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-4 py-16 text-center text-xs text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#EA580C] mb-2" />
            <span>Loading authoritative plan matrix...</span>
          </div>
        ) : (
          plans.map((p) => {
            const isFree = p.monthlyPrice === 0 || p.key === 'FREE_KHATA';

            return (
              <div
                key={p.key}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between hover:border-orange-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-sm text-slate-900">{p.name}</span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        isFree
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-orange-50 text-[#EA580C] border border-orange-200'
                      }`}
                    >
                      {p.badge}
                    </span>
                  </div>

                  {/* Active Subscribers Badge */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs my-3">
                    <span className="text-slate-500 text-[11px]">Active Subscribers:</span>
                    <span className="font-black text-slate-900 font-mono">
                      {p.activeSubscribersCount}
                    </span>
                  </div>

                  {/* Billing Durations & Live Pricing Table */}
                  <div className="space-y-2 mb-4 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Billing Durations &amp; Prices
                    </span>
                    {INTERVALS.map((intv) => {
                      const tier = p.pricing?.[intv.key];
                      const price = tier?.totalPrice ?? (isFree ? 0 : 0);

                      return (
                        <div
                          key={intv.key}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 border border-slate-100 text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-800 block text-[11px]">{intv.label}</span>
                            {!isFree && tier && tier.durationMonths > 1 && (
                              <span className="text-[10px] text-emerald-600 font-semibold">
                                ₹{tier.monthlyEquivalent}/mo ({tier.savingsPercent}% savings)
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 font-mono text-sm">
                              ₹{price}
                            </span>
                            {!isFree && (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(p.key, intv.key, price)}
                                className="p-1 rounded-lg hover:bg-orange-100 text-slate-400 hover:text-[#EA580C] transition-colors cursor-pointer"
                                title={`Edit ${p.name} (${intv.label}) Price`}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Quotas Box */}
                  <div className="space-y-1.5 pb-4 mb-4 border-b border-slate-100 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Max Staff Seats:</span>
                      <strong className="text-slate-900">{p.quotas.maxStaffSeats}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Locations / Branches:</span>
                      <strong className="text-slate-900">{p.quotas.maxBranches}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Monthly Invoices:</span>
                      <strong className="text-slate-900">
                        {p.quotas.maxMonthlyInvoices >= 999999 ? 'Unlimited' : p.quotas.maxMonthlyInvoices}
                      </strong>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="space-y-1.5 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Key Entitlements
                    </span>
                    {p.features.slice(0, 6).map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-slate-700">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-tight text-[11px]">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Price Modal */}
      {editingPlanKey && editingInterval && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-[#EA580C]" />
                <span>Edit {editingPlanKey} Price</span>
              </h2>
              <button
                type="button"
                onClick={() => {
                  setEditingPlanKey(null);
                  setEditingInterval(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePrice} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Billing Duration: <span className="text-[#EA580C]">{editingInterval}</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={editPriceInput}
                    onChange={(e) => setEditPriceInput(e.target.value)}
                    required
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 font-mono font-black text-sm focus:outline-hidden focus:border-[#EA580C]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Price Change</label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g. Festival pricing promo, Annual revision"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#EA580C]"
                />
              </div>

              <div className="p-3 rounded-xl bg-orange-50 border border-orange-100 text-[11px] text-orange-950">
                <strong>Instant Cross-Platform Synchronization:</strong> This updated package price will immediately apply to all new checkout sessions on both the website and the Android application.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPlanKey(null);
                    setEditingInterval(null);
                  }}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPrice}
                  className="px-5 py-2 rounded-xl font-bold text-white bg-[#EA580C] hover:bg-[#D94E00] shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingPrice ? 'Saving...' : 'Update & Publish Price'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
