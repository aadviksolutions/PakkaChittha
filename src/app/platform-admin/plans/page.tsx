'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import {
  Layers,
  Check,
  X as CloseIcon,
  ShieldAlert,
  Users,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface PlanDetail {
  key: string;
  dbEnumKey: string;
  name: string;
  priceLabel: string;
  monthlyPrice: number;
  annualPrice: number;
  badge: string;
  features: string[];
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Package Matrix & Feature Gating Control</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative feature entitlements, database quotas, and active subscriber metrics across all Pakka Chittha tiers.
          </p>
        </div>

        <button
          onClick={fetchPlans}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Matrix</span>
        </button>
      </div>

      {/* Security Architecture Box */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950 to-slate-900 border border-purple-800 text-white shadow-sm flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-bold text-purple-300 uppercase tracking-wider text-[11px]">
            Server-Enforced Feature Entitlement Engine
          </div>
          <p className="text-purple-100/90 leading-relaxed">
            All feature permissions below are strictly enforced in both client views and API routes (`requireEntitlement()`, `requireCommercialAccess()`, `requireGrowthAccess()`). Free Khata has permanent zero pricing with unlimited personal ledger records. Starter, Growth, and Scale plans strictly isolate commercial billing, inventory, purchases, staff, and multi-location branch management.
          </p>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-4 py-16 text-center text-xs text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
            <span>Loading authoritative plan matrix...</span>
          </div>
        ) : (
          plans.map((p) => {
            const isFree = p.monthlyPrice === 0;

            return (
              <div
                key={p.key}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between hover:border-emerald-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-sm text-slate-900">{p.name}</span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        isFree
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {p.badge}
                    </span>
                  </div>

                  <div className="my-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">
                        {isFree ? '₹0' : `₹${p.monthlyPrice}`}
                      </span>
                      <span className="text-xs text-slate-500">
                        {isFree ? '/ permanent' : '/mo'}
                      </span>
                    </div>
                    {!isFree && (
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        ₹{p.annualPrice}/year billed annually
                      </span>
                    )}
                  </div>

                  {/* Active Subscribers Badge */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs mb-4">
                    <span className="text-slate-500 text-[11px]">Active Subscribers:</span>
                    <span className="font-black text-slate-900 font-mono">
                      {p.activeSubscribersCount}
                    </span>
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
                  <div className="space-y-2 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Included Capabilities
                    </span>
                    {p.features.map((feat, idx) => (
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
    </div>
  );
}
