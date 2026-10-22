'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import {
  Settings,
  Lock,
  Server,
  Key,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Save,
  RefreshCw,
  ShieldCheck,
  Clock,
} from 'lucide-react';

interface PlatformConfig {
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  defaultTrialDays: number;
  gracePeriodDays: number;
  maintenanceMode: boolean;
  allowPublicRegistration: boolean;
  razorpayKeyIdStatus: string;
  razorpayKeySecretStatus: string;
  whatsappGatewayStatus: string;
}

export default function PlatformAdminSettingsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PlatformConfig | null>(null);

  // Form states
  const [platformName, setPlatformName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [defaultTrialDays, setDefaultTrialDays] = useState(7);
  const [gracePeriodDays, setGracePeriodDays] = useState(3);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [allowPublicRegistration, setAllowPublicRegistration] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/platform-admin/settings');
      if (!res.ok) throw new Error('Failed to load settings');
      const data = await res.json();
      const cfg = data.settings as PlatformConfig;
      setSettings(cfg);
      setPlatformName(cfg.platformName);
      setSupportEmail(cfg.supportEmail);
      setSupportPhone(cfg.supportPhone);
      setDefaultTrialDays(cfg.defaultTrialDays);
      setGracePeriodDays(cfg.gracePeriodDays);
      setMaintenanceMode(cfg.maintenanceMode);
      setAllowPublicRegistration(cfg.allowPublicRegistration);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error fetching settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSetting = async (key: string, value: any, category: string) => {
    try {
      setSaving(true);
      const res = await fetch('/api/platform-admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          value,
          category,
          reason: `Admin updated ${key}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save setting');

      toast.success(`Updated ${key} successfully`);
      fetchSettings();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Global Platform Settings & Policies</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure system-wide parameters, support contact points, trial windows, and security baselines.
          </p>
        </div>

        <button
          onClick={fetchSettings}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Settings</span>
        </button>
      </div>

      {/* Security Architecture Box */}
      <div className="p-4 rounded-2xl bg-[#071F38] border border-slate-800 text-white shadow-sm flex items-start gap-3">
        <Lock className="w-5 h-5 text-[#00B887] shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-bold text-[#00B887] uppercase tracking-wider text-[11px]">
            Security & Zero-Leakage Policy
          </div>
          <p className="text-slate-300 leading-relaxed">
            API secrets, payment webhook verification keys, and database credentials are never rendered in plaintext to client browsers. Administrative configuration updates are recorded in the immutable platform audit log.
          </p>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Identity & Support */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-600" />
            <span>Platform Branding & Customer Support</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Platform Brand Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white"
                />
                <button
                  onClick={() => handleSaveSetting('platformName', platformName, 'GENERAL')}
                  disabled={saving}
                  className="px-3 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 text-xs shadow-xs"
                >
                  Save
                </button>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Official Support Email</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white"
                />
                <button
                  onClick={() => handleSaveSetting('supportEmail', supportEmail, 'GENERAL')}
                  disabled={saving}
                  className="px-3 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 text-xs shadow-xs"
                >
                  Save
                </button>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Customer Support Phone / Helpline</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white"
                />
                <button
                  onClick={() => handleSaveSetting('supportPhone', supportPhone, 'GENERAL')}
                  disabled={saving}
                  className="px-3 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 text-xs shadow-xs"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Policy & Trial Windows */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-600" />
            <span>Subscription & Grace Period Windows</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Default Trial Duration (Days)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={defaultTrialDays}
                  onChange={(e) => setDefaultTrialDays(parseInt(e.target.value, 10))}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white"
                />
                <button
                  onClick={() => handleSaveSetting('defaultTrialDays', defaultTrialDays, 'BILLING')}
                  disabled={saving}
                  className="px-3 py-2 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 text-xs shadow-xs"
                >
                  Save
                </button>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Subscription Grace Period (Days)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={gracePeriodDays}
                  onChange={(e) => setGracePeriodDays(parseInt(e.target.value, 10))}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white"
                />
                <button
                  onClick={() => handleSaveSetting('gracePeriodDays', gracePeriodDays, 'BILLING')}
                  disabled={saving}
                  className="px-3 py-2 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 text-xs shadow-xs"
                >
                  Save
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Days after expiry before write operations on commercial stores are restricted.
              </p>
            </div>
          </div>
        </div>

        {/* Payment Gateways Status */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Key className="w-4 h-4 text-teal-600" />
            <span>Integrated Gateway Status</span>
          </h2>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">Razorpay Payment Gateway</span>
                <span className="text-[11px] text-slate-500">Checkout API & Webhook Listener</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {settings?.razorpayKeyIdStatus || 'CONFIGURED'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">Bank Transfer / UPI Reconciliation</span>
                <span className="text-[11px] text-slate-500">Manual UTR Reconciliation Protocol</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ACTIVE
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">WhatsApp Cloud API (Meta)</span>
                <span className="text-[11px] text-slate-500">Automated Reminders & Invoices</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {settings?.whatsappGatewayStatus || 'READY'}
              </span>
            </div>
          </div>
        </div>

        {/* Global Security & Mode Switches */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-red-600" />
            <span>Platform Security Flags</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">Public Self-Serve Registration</span>
                <span className="text-[11px] text-slate-500">Allow new clients to sign up from landing page</span>
              </div>
              <button
                onClick={() => {
                  const nextVal = !allowPublicRegistration;
                  setAllowPublicRegistration(nextVal);
                  handleSaveSetting('allowPublicRegistration', nextVal.toString(), 'SECURITY');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  allowPublicRegistration
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-300 text-slate-700'
                }`}
              >
                {allowPublicRegistration ? 'ENABLED' : 'PAUSED'}
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">Emergency Maintenance Mode</span>
                <span className="text-[11px] text-slate-500">Blocks non-admin login during migrations</span>
              </div>
              <button
                onClick={() => {
                  const nextVal = !maintenanceMode;
                  setMaintenanceMode(nextVal);
                  handleSaveSetting('maintenanceMode', nextVal.toString(), 'SECURITY');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  maintenanceMode
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {maintenanceMode ? 'ACTIVE' : 'OFF'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
