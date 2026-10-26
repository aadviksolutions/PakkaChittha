'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ModulePageShell } from '@/components/shared/ModulePageShell';
import {
  Building2,
  Landmark,
  QrCode,
  FileText,
  Upload,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  Sparkles,
  Languages,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { UpiQrCode } from '@/components/shared/UpiQrCode';
import { useTranslation } from '@/i18n/context';
import { LanguageSelector } from '@/components/shared/LanguageSelector';

interface BusinessSettings {
  id: string;
  name: string;
  legalName?: string | null;
  gstin?: string | null;
  state: string;
  address?: string | null;
  pincode?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  bankUpiId?: string | null;
  invoiceTerms?: string | null;
  allowNegativeStock: boolean;
  logoUrl?: string | null;
}

export default function SettingsPage() {
  const toast = useToast();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [settings, setSettings] = useState<BusinessSettings>({
    id: '',
    name: '',
    legalName: '',
    gstin: '',
    state: 'Maharashtra (27)',
    address: '',
    pincode: '',
    bankName: '',
    bankAccountNumber: '',
    bankIfsc: '',
    bankUpiId: '',
    invoiceTerms: '1. Payment due within 15 days.\n2. Goods once sold will not be taken back.\n3. Subject to local jurisdiction.',
    allowNegativeStock: false,
    logoUrl: null,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings');
      if (!res.ok) {
        throw new Error('Failed to load business settings');
      }
      const data = await res.json();
      if (data.business) {
        setSettings({
          id: data.business.id || '',
          name: data.business.name || '',
          legalName: data.business.legalName || '',
          gstin: data.business.gstin || '',
          state: data.business.state || 'Maharashtra (27)',
          address: data.business.address || '',
          pincode: data.business.pincode || '',
          bankName: data.business.bankName || '',
          bankAccountNumber: data.business.bankAccountNumber || '',
          bankIfsc: data.business.bankIfsc || '',
          bankUpiId: data.business.bankUpiId || '',
          invoiceTerms: data.business.invoiceTerms || '1. Payment due within 15 days.\n2. Subject to local jurisdiction.',
          allowNegativeStock: Boolean(data.business.allowNegativeStock),
          logoUrl: data.business.logoUrl || null,
        });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error fetching settings');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      toast.error('Please upload a PNG, JPEG, WebP, or SVG image.');
      return;
    }

    if (file.size > 2.5 * 1024 * 1024) {
      toast.error('Logo file size must be under 2.5 MB.');
      return;
    }

    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/settings/logo', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload logo');
      }

      setSettings((prev) => ({ ...prev, logoUrl: data.logoUrl }));
      toast.success('Brand logo uploaded and applied to invoices successfully!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error uploading logo');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    if (!confirm('Are you sure you want to remove your custom brand logo?')) return;

    try {
      setUploadingLogo(true);
      const res = await fetch('/api/settings/logo', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to remove logo');
      }

      setSettings((prev) => ({ ...prev, logoUrl: null }));
      toast.success('Brand logo removed. Invoice headers will display monogram.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error removing logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings.name.trim()) {
      toast.error('Trade Business Name is required');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update settings');
      }

      toast.success('Business settings and payment details saved successfully!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModulePageShell
      title="Business Settings & Workspace Profile"
      description="Configure your business legal details, custom brand logo, GST jurisdiction, bank account, UPI ID, and default invoice terms printed on all tax vouchers."
      targetPhase="Business Operations"
    >
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center text-slate-500 text-sm">
          Loading business configuration...
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Brand Logo & Visual Identity */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">Brand Logo & Visual Identity</h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                Printed on bills, invoices, and share links
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5 pt-1">
              {/* Logo Preview Box */}
              <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-inner relative group">
                {settings.logoUrl ? (
                  <img
                    src={settings.logoUrl}
                    alt={settings.name || 'Business Logo'}
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <div className="text-center p-2">
                    <span className="font-black text-xl text-slate-400">
                      {settings.name
                        ? settings.name
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((w) => w[0])
                            .join('')
                            .toUpperCase()
                        : 'LOGO'}
                    </span>
                    <span className="block text-[9px] text-slate-400 font-medium mt-0.5">Monogram</span>
                  </div>
                )}
              </div>

              {/* Upload Controls & Guidelines */}
              <div className="space-y-2 text-xs flex-1">
                <div>
                  <h4 className="font-semibold text-slate-800">Custom Business Logo</h4>
                  <p className="text-slate-500 text-[11px] leading-relaxed mt-0.5">
                    Upload your high-resolution business logo. Transparent PNG or SVG formats work best on A4 tax invoices and thermal receipts.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleLogoFileSelect}
                    className="hidden"
                  />

                  <button
                    type="button"
                    disabled={uploadingLogo}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{uploadingLogo ? 'Uploading...' : 'Upload Logo Image'}</span>
                  </button>

                  {settings.logoUrl && (
                    <button
                      type="button"
                      disabled={uploadingLogo}
                      onClick={handleRemoveLogo}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-medium hover:bg-rose-100 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">Supported: PNG, JPG, WebP, SVG • Maximum size: 2.5 MB</p>
              </div>
            </div>
          </div>

          {/* General Business Identity */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">General Business Identification</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Trade Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  placeholder="e.g. Acme Enterprise"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Legal Registered Entity Name</label>
                <input
                  type="text"
                  value={settings.legalName || ''}
                  onChange={(e) => setSettings({ ...settings, legalName: e.target.value })}
                  placeholder="e.g. Acme Enterprise Private Limited"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">GSTIN Number (15 Characters)</label>
                <input
                  type="text"
                  maxLength={15}
                  value={settings.gstin || ''}
                  onChange={(e) => setSettings({ ...settings, gstin: e.target.value.toUpperCase() })}
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">State / POS Jurisdiction</label>
                <input
                  type="text"
                  value={settings.state}
                  onChange={(e) => setSettings({ ...settings, state: e.target.value })}
                  placeholder="e.g. Maharashtra (27)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Registered Business Address</label>
                  <input
                    type="text"
                    value={settings.address || ''}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    placeholder="Shop No. 12, Commercial Complex, MG Road"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Postal Pincode</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={settings.pincode || ''}
                    onChange={(e) => setSettings({ ...settings, pincode: e.target.value })}
                    placeholder="400001"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bank & UPI Settlement Information + Live QR Code Preview */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Landmark className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">Bank & Digital UPI Settlement Details</h3>
            </div>
            <p className="text-xs text-slate-500">
              These payment details and the instant scannable UPI QR code will be printed directly on your customer invoices and public view links so clients can transfer funds via GPay, PhonePe, Paytm, or BHIM.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Form Fields */}
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={settings.bankName || ''}
                    onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                    placeholder="e.g. HDFC Bank, ICICI Bank, State Bank of India"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Bank Account Number</label>
                  <input
                    type="text"
                    value={settings.bankAccountNumber || ''}
                    onChange={(e) => setSettings({ ...settings, bankAccountNumber: e.target.value })}
                    placeholder="e.g. 50200012345678"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Bank IFSC Code</label>
                  <input
                    type="text"
                    maxLength={11}
                    value={settings.bankIfsc || ''}
                    onChange={(e) => setSettings({ ...settings, bankIfsc: e.target.value.toUpperCase() })}
                    placeholder="e.g. HDFC0001234"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1 flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                    Primary UPI ID / VPA <span className="text-emerald-600 font-bold">(Generates QR)</span>
                  </label>
                  <input
                    type="text"
                    value={settings.bankUpiId || ''}
                    onChange={(e) => setSettings({ ...settings, bankUpiId: e.target.value.toLowerCase() })}
                    placeholder="e.g. business@okhdfcbank"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono lowercase focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Right Col: Live Interactive UPI QR Preview Card */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Invoice QR Code Preview
                </span>
                {settings.bankUpiId ? (
                  <UpiQrCode
                    upiId={settings.bankUpiId}
                    payeeName={settings.name || 'Merchant Store'}
                    amount={2499}
                    invoiceNumber="INV-SAMPLE"
                    size={140}
                  />
                ) : (
                  <div className="py-6 px-4 text-center space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center mx-auto text-slate-400">
                      <QrCode className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Enter a UPI ID to preview live QR</p>
                    <p className="text-[10px] text-slate-400">Scannable by Google Pay, PhonePe, Paytm, etc.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Invoice Terms & Operational Rules */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">Invoice Terms & Operational Policy</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Default Invoice Terms & Conditions (Printed in Invoice Footer)
                </label>
                <textarea
                  rows={3}
                  value={settings.invoiceTerms || ''}
                  onChange={(e) => setSettings({ ...settings, invoiceTerms: e.target.value })}
                  placeholder="Enter terms, return policy, payment due timelines, etc."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white leading-relaxed"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800 text-xs">Allow Negative Stock Invoicing</p>
                  <p className="text-[11px] text-slate-500">
                    When enabled, allows creating invoices even if on-hand inventory count falls below zero.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.allowNegativeStock}
                    onChange={(e) => setSettings({ ...settings, allowNegativeStock: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Language & Regional Preferences */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Languages className="w-4 h-4 text-[#EA580C]" />
              <div>
                <h3 className="font-bold text-sm text-slate-900">{t('settings.languagePreference')}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{t('settings.languageHelp')}</p>
              </div>
            </div>

            <div className="pt-1">
              <LanguageSelector variant="settings" />
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Changes apply instantly across your tenant profile and invoice templates.
            </span>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white font-semibold text-xs rounded-xl hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {saving ? t('common.saving') : t('settings.saveSettings')}
            </button>
          </div>
        </form>
      )}
    </ModulePageShell>
  );
}
