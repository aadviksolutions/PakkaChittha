'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  Sparkles,
  RotateCcw,
  LogOut,
  ChevronRight,
  ShieldAlert,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { PlanKey, normalizePlanKey } from '@/lib/subscription/plans';

export function DemoBanner() {
  const router = useRouter();
  const toast = useToast();
  const { activeBusiness } = useAuth();
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [switching, setSwitching] = useState(false);

  // Determine if this is a demo workspace
  const isDemo = Boolean(
    activeBusiness?.id?.startsWith('demo_') || (activeBusiness as any)?.isDemo
  );

  if (!isDemo) return null;

  const planKey: PlanKey = normalizePlanKey(activeBusiness?.subscription?.plan);
  const planColor =
    planKey === 'STARTER'
      ? 'bg-blue-600 text-white'
      : planKey === 'GROWTH'
      ? 'bg-[#00B887] text-white'
      : 'bg-purple-600 text-white';

  const planHighlights =
    planKey === 'STARTER'
      ? '1 User • 1 Location • Basic Billing & Udhaar'
      : planKey === 'GROWTH'
      ? '3 Users • 1 Location • Purchases & Low-Stock Alerts'
      : '10 Users • 3 Branches • Multi-Location & Audit Trail';

  const handleResetDemo = async () => {
    try {
      setResetting(true);
      const res = await fetch('/api/demo/reset', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to reset demo');
      toast.success(data.message || 'Demo workspace data reset successfully!');
      setShowResetConfirm(false);
      router.refresh();
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Error resetting demo data');
    } finally {
      setResetting(false);
    }
  };

  const handleExitDemo = async () => {
    try {
      await fetch('/api/demo/exit', { method: 'POST' });
      toast.info('Exited demo mode. Welcome back!');
      router.push('/login');
      router.refresh();
      window.location.href = '/login';
    } catch (err: any) {
      window.location.href = '/login';
    }
  };

  const handleSwitchDemo = async (targetPlan: PlanKey) => {
    if (targetPlan === planKey) return;
    try {
      setSwitching(true);
      const res = await fetch('/api/demo/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: targetPlan }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to switch plan');
      toast.success(`Switched to ${data.businessName}`);
      window.location.href = '/';
    } catch (err: any) {
      toast.error(err.message || 'Error switching demo plan');
      setSwitching(false);
    }
  };

  return (
    <>
      <aside aria-label="Demo Mode Notification" className="w-full bg-[#071F38] text-white px-3 sm:px-6 py-2.5 shadow-md border-b border-slate-700/80 z-40 relative">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
          {/* Left: Banner Title & Plan Indicator */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 font-black uppercase tracking-wider text-[11px] text-amber-300">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>YOU ARE EXPLORING PAKKA CHITTHA {planKey} DEMO</span>
            </div>

            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${planColor}`}>
              {planKey}
            </span>

            <span className="hidden lg:inline text-slate-300 font-medium">
              ({planHighlights})
            </span>

            <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
              Sample data only • No real charges
            </span>
          </div>

          {/* Right: Switcher, Reset, Exit Actions */}
          <div className="flex items-center gap-2 self-end md:self-auto shrink-0 flex-wrap">
            {/* Quick Switch Plan Pills */}
            <div className="flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700 text-[10px]">
              <span className="text-slate-400 px-1.5 hidden sm:inline">Switch:</span>
              {(['STARTER', 'GROWTH', 'SCALE'] as PlanKey[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={switching || p === planKey}
                  onClick={() => handleSwitchDemo(p)}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer font-bold ${
                    p === planKey
                      ? 'bg-[#00B887] text-white shadow-2xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/80'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Reset Data Button */}
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              disabled={resetting}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 transition-colors cursor-pointer"
              title="Reset sample data for this demo"
            >
              <RotateCcw className={`w-3 h-3 ${resetting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Reset Demo</span>
            </button>

            {/* Exit Demo Button */}
            <button
              type="button"
              onClick={handleExitDemo}
              className="flex items-center gap-1 px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              <span>Exit Demo</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 text-slate-800">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <RotateCcw className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-[#071F38]">
                Reset {planKey} Demo Data?
              </h3>
            </div>

            <p className="py-3 text-xs text-slate-600 leading-relaxed">
              This will restore the sample customers, products, invoices, and payments in this{' '}
              <strong>{planKey}</strong> demo workspace back to their initial test state.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetDemo}
                disabled={resetting}
                className="px-4 py-1.5 rounded-lg bg-[#071F38] hover:bg-[#0D2C4D] text-white text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5"
              >
                {resetting && <RotateCcw className="w-3 h-3 animate-spin" />}
                <span>Reset to Sample Data</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
