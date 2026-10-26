'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Building2,
  User,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Check,
  BookOpen,
  Home,
} from 'lucide-react';
import { useTranslation } from '@/i18n/context';
import { LanguageSelector } from '@/components/shared/LanguageSelector';

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Delhi',
  'Gujarat',
  'Haryana',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Uttar Pradesh',
  'West Bengal',
];

const TRADE_TYPES = [
  'Retail & Wholesale',
  'Electronics & Hardware',
  'Garments & Apparel',
  'FMCG & Kirana',
  'Pharmacy & Healthcare',
  'Automobile & Spare Parts',
  'Building Materials & Steel',
  'Services & Consulting',
];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { user: loggedInUser, activeBusiness: loggedInBusiness, loading: authLoading } = useAuth();
  const planParam = searchParams.get('plan');
  const initialCategory =
    planParam === 'ghar_kharcha'
      ? 'GHAR_KHARCHA'
      : planParam === 'free_khata'
      ? 'FREE_KHATA'
      : 'BUSINESS';

  const [category, setCategory] = useState<'GHAR_KHARCHA' | 'FREE_KHATA' | 'BUSINESS'>(initialCategory);
  const rawPlanParam = searchParams.get('plan')?.toUpperCase();
  const initialSelectedPlan = rawPlanParam === 'STARTER' || rawPlanParam === 'SCALE' ? rawPlanParam : 'GROWTH';
  const [selectedPlan, setSelectedPlan] = useState<'STARTER' | 'GROWTH' | 'SCALE'>(initialSelectedPlan);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    householdName: '',
    monthlyBudget: '',
    businessName: '',
    tradeType: 'Retail & Wholesale',
    city: 'Raipur',
    state: 'Chhattisgarh',
    gstin: '',
  });

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-redirect if user is already logged in
  React.useEffect(() => {
    if (!authLoading && loggedInUser) {
      if (loggedInUser.platformRole === 'SUPER_ADMIN') {
        window.location.href = '/platform-admin';
      } else if (loggedInBusiness?.subscription?.plan === 'FREE_KHATA') {
        window.location.href = '/free-khata';
      } else if (!loggedInBusiness) {
        window.location.href = '/ghar-kharcha';
      } else {
        window.location.href = '/';
      }
    }
  }, [loggedInUser, loggedInBusiness, authLoading]);

  React.useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      if (errorParam === 'cancelled') {
        setError('Google sign-up was cancelled. You can try again or register using email and password below.');
      } else if (errorParam === 'invalid_state') {
        setError('Google sign-up session expired or security verification failed. Please try again.');
      } else if (errorParam === 'config_missing') {
        setError('Google Sign-Up is not configured yet. GOOGLE_CLIENT_ID is missing in environment variables or platform settings.');
      } else if (errorParam === 'google_secret_missing') {
        setError('Google Client Secret is not configured. Please set GOOGLE_CLIENT_SECRET in Vercel or environment variables.');
      } else if (errorParam === 'unverified_email') {
        setError('Your Google account email is not verified by Google. For security reasons, please verify your email on Google or register with email and password.');
      } else if (errorParam === 'account_suspended') {
        setError('Your account has been administratively suspended. Please contact platform support.');
      } else {
        setError('Google sign-up failed. Please try again or complete registration using the form below.');
      }
    }
  }, [searchParams]);

  const handleGoogleSignUp = () => {
    setError(null);
    setGoogleLoading(true);
    const params = new URLSearchParams();
    if (category === 'GHAR_KHARCHA') {
      params.set('mode', 'household');
      params.set('plan', 'ghar_kharcha');
      params.set('redirect', '/ghar-kharcha');
    } else if (category === 'FREE_KHATA') {
      params.set('mode', 'free_khata');
      params.set('plan', 'free_khata');
      params.set('redirect', '/free-khata');
    } else {
      params.set('mode', 'business');
      params.set('plan', selectedPlan.toLowerCase());
      params.set('redirect', '/');
    }
    params.set('origin', 'register');
    window.location.href = `/api/auth/google?${params.toString()}`;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (category === 'GHAR_KHARCHA') {
        const res = await fetch('/api/auth/register-household', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            password: formData.password,
            householdName: formData.householdName,
            monthlyBudget: formData.monthlyBudget ? parseFloat(formData.monthlyBudget) : 0,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to register Ghar Kharcha account.');
        }

        const redirectParam = searchParams.get('redirect');
        window.location.href = redirectParam || data.redirectUrl || '/ghar-kharcha';
      } else if (category === 'FREE_KHATA') {
        const res = await fetch('/api/auth/register-khata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            password: formData.password,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to register Free Khata account.');
        }

        window.location.href = data.redirectUrl || '/free-khata';
      } else {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, selectedPlan }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to register business workspace.');
        }

        window.location.href = '/';
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  const isGharKharcha = category === 'GHAR_KHARCHA';
  const isFreeKhata = category === 'FREE_KHATA';
  const isBusiness = category === 'BUSINESS';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-10 sm:px-6 lg:px-8 text-slate-100 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-xl relative z-10 text-center">
        <div className="flex justify-center mb-4">
          <LanguageSelector variant="pill" />
        </div>

        <div className="flex justify-center mb-3">
          <div className="w-16 h-16 rounded-2xl bg-white p-1.5 shadow-xl shadow-black/40 border border-slate-700/60 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Pakka Chittha"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <h2 className="text-2xl font-extrabold tracking-tight text-white">
          {isGharKharcha
            ? 'PakkaChittha Ghar Kharcha (100% Free)'
            : isFreeKhata
            ? 'Open Permanent Free Khata'
            : 'Create Business Workspace'}
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          {isGharKharcha
            ? 'Household budget & expense tracking • Unlimited Records • Family Collaboration • Permanently Free'
            : isFreeKhata
            ? 'Simple personal lending and borrowing ledger • 100% Free Forever • No Card Needed'
            : 'Get started with automated GST invoicing, customer udhaar khata, and instant ledger'}
        </p>

        {/* Category Selector Tabs */}
        <div className="mt-4 inline-flex p-1 bg-slate-900 border border-slate-800 rounded-2xl shadow-inner max-w-full overflow-x-auto">
          <button
            type="button"
            onClick={() => setCategory('GHAR_KHARCHA')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              isGharKharcha
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Ghar Kharcha (Free)</span>
          </button>

          <button
            type="button"
            onClick={() => setCategory('FREE_KHATA')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              isFreeKhata
                ? 'bg-[#00B887] text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
            <span>Free Udhaar Khata</span>
          </button>

          <button
            type="button"
            onClick={() => setCategory('BUSINESS')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              isBusiness
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Business (Invoicing)</span>
          </button>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl relative z-10 px-4 sm:px-0">
        <div className="bg-slate-900/90 backdrop-blur-md py-7 px-6 shadow-2xl rounded-2xl border border-slate-800 sm:px-8">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-950/60 border border-red-800/80 flex items-start gap-2.5 text-red-200 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* If Ghar Kharcha Selected: Show Optional Household Details */}
            {isGharKharcha && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-2">
                  <Home className="w-3.5 h-3.5" />
                  Household Details (Optional)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Household / Family Name
                    </label>
                    <input
                      name="householdName"
                      type="text"
                      value={formData.householdName}
                      onChange={handleChange}
                      placeholder="e.g. Sharma Family"
                      className="block w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Monthly Budget Target (₹)
                    </label>
                    <input
                      name="monthlyBudget"
                      type="number"
                      min="0"
                      step="500"
                      value={formData.monthlyBudget}
                      onChange={handleChange}
                      placeholder="e.g. 45000 (Optional)"
                      className="block w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* If Business Category Selected: Show Business Information */}
            {isBusiness && (
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-2">
                  <Building2 className="w-3.5 h-3.5" />
                  1. Business Identity
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Business / Trade Name *
                    </label>
                    <input
                      name="businessName"
                      type="text"
                      required
                      value={formData.businessName}
                      onChange={handleChange}
                      placeholder="e.g. Sharma Hardware & Electricals"
                      className="block w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Industry / Trade Category
                    </label>
                    <select
                      name="tradeType"
                      value={formData.tradeType}
                      onChange={handleChange}
                      className="block w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    >
                      {TRADE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      GSTIN (Optional)
                    </label>
                    <input
                      name="gstin"
                      type="text"
                      maxLength={15}
                      value={formData.gstin}
                      onChange={handleChange}
                      placeholder="22AAAAA0000A1Z5"
                      className="block w-full px-3 py-2 text-xs uppercase font-mono bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      City / District
                    </label>
                    <input
                      name="city"
                      type="text"
                      required
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="e.g. Raipur"
                      className="block w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      State
                    </label>
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="block w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    >
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Package Selection */}
                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      2. Select 7-Day Trial Package
                    </span>
                    <span className="text-[10px] text-slate-400">No payment required for trial</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Starter */}
                    <div
                      onClick={() => setSelectedPlan('STARTER')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedPlan === 'STARTER'
                          ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Starter</span>
                        <span className="text-[10px] text-slate-400">1 User</span>
                      </div>
                      <div className="text-xs font-black text-emerald-400 mt-1">₹199 / mo</div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                        Unlimited Invoices, Basic Udhaar &amp; Inventory
                      </p>
                    </div>

                    {/* Growth (Recommended) */}
                    <div
                      onClick={() => setSelectedPlan('GROWTH')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all relative ${
                        selectedPlan === 'GROWTH'
                          ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span className="absolute -top-2 right-2 bg-emerald-500 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase">
                        Popular
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Growth</span>
                        <span className="text-[10px] text-slate-400">3 Users</span>
                      </div>
                      <div className="text-xs font-black text-emerald-400 mt-1">₹499 / mo</div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                        Purchases, Low-Stock Alerts, Staff Roles
                      </p>
                    </div>

                    {/* Scale */}
                    <div
                      onClick={() => setSelectedPlan('SCALE')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedPlan === 'SCALE'
                          ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Scale</span>
                        <span className="text-[10px] text-slate-400">10 Users</span>
                      </div>
                      <div className="text-xs font-black text-emerald-400 mt-1">₹999 / mo</div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                        Multi-Branch Godowns, Stock Valuation
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Account Information (Required for Both) */}
            <div className={!isFreeKhata ? 'pt-2 border-t border-slate-800' : ''}>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-2">
                <User className="w-3.5 h-3.5" />
                {isFreeKhata ? 'Your Personal Account' : '3. Business Owner Account'}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Your Full Name *
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Atul Kumar"
                    className="block w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Phone Number <span className="text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className="block w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Address (Login ID) *
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="yourname@domain.com"
                    className="block w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Password (Min 8 characters) *
                  </label>
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••••••"
                    className="block w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-emerald-500/30 rounded-xl shadow-lg shadow-emerald-950/40 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>
                      {isFreeKhata
                        ? 'Open Free Udhaar Khata (100% Free Forever)'
                        : `Create Workspace & Start 7-Day ${selectedPlan} Trial`}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className="w-full border-t border-slate-800" />
            <span className="absolute px-3 bg-slate-900 text-xs font-normal text-slate-500">
              Or sign up with
            </span>
          </div>

          {/* Google Sign Up Button */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={googleLoading || loading}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-950/80 hover:bg-slate-800/80 flex items-center justify-center gap-2.5 text-xs font-semibold text-slate-200 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>
              {googleLoading
                ? 'Connecting to Google...'
                : isGharKharcha
                ? 'Sign up with Google (Ghar Kharcha)'
                : isFreeKhata
                ? 'Sign up with Google (Free Khata)'
                : 'Sign up with Google'}
            </span>
          </button>

          <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Already have an account?</span>
            <Link
              href="/login"
              className="font-semibold text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1"
            >
              Sign In
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="mt-5 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>
              {isFreeKhata
                ? 'No subscription payment • Unlimited entries • Permanently free'
                : 'Includes 7-day full feature trial • Dedicated Tenant Workspace'}
            </span>
          </div>
          <div className="flex items-center justify-center gap-2 sm:gap-3 pt-2 text-[11px] text-slate-400 font-medium flex-wrap">
            <span>Powered by <strong className="text-slate-200">Lakshya Studios</strong></span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="inline-flex items-center gap-1">
              Co-Powered by
              <img
                src="/lionoar-digital-logo.png"
                alt="Lionoar Digital"
                className="h-3.5 w-3.5 object-contain rounded-full inline"
              />
              <strong className="text-slate-200">Lionoar Digital</strong>
            </span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span>Developed by <span className="text-emerald-400 font-semibold tracking-wide">Aadvik Solutions</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <RegisterForm />
    </Suspense>
  );
}
