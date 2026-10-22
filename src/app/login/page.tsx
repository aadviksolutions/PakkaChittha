'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  FileText,
  Package,
  Users,
  BarChart3,
  BarChart2,
  Store,
  UtensilsCrossed,
  Building2,
  Factory,
  Truck,
  Briefcase,
  HelpCircle,
  X,
  Phone,
  Info,
  Menu,
  Play,
  LayoutDashboard,
  Home,
} from 'lucide-react';

/* =====================================================================
   REALISTIC 3D DASHBOARD PREVIEW
   Positioned centrally, tilted with 3D perspective, extending behind login card
   ===================================================================== */
function DashboardTabletMockup() {
  return (
    <div
      className="relative select-none pointer-events-none rounded-2xl shadow-[0_25px_65px_-12px_rgba(0,0,0,0.7)] transition-transform duration-500"
      style={{
        transform: 'perspective(1200px) rotateY(-13deg) rotateX(2.5deg) rotateZ(-0.5deg)',
      }}
    >
      {/* Outer tablet frame */}
      <div
        className="bg-[#152234] rounded-2xl p-2.5 xl:p-3 border border-slate-700/60 backdrop-blur-md"
        style={{ width: '640px' }}
      >
        {/* Screen inner area */}
        <div className="flex bg-[#F8FAFC] rounded-xl overflow-hidden min-h-[320px] border border-slate-200/60 shadow-inner">
          {/* Mockup Left Dark Sidebar */}
          <div className="w-36 xl:w-40 bg-[#162132] p-3 text-white flex flex-col justify-between shrink-0">
            <div>
              {/* App logo in sidebar */}
              <div className="flex items-center gap-1.5 px-1 py-1 mb-3.5 border-b border-slate-800 pb-2.5">
                <div className="w-5 h-5 rounded-md bg-[#EA580C] flex items-center justify-center font-black text-[11px] text-white">
                  P
                </div>
                <span className="font-bold text-[12px] tracking-tight">Pakka Chittha</span>
              </div>

              {/* Sidebar Navigation items */}
              <div className="space-y-1 text-[10px] font-medium text-slate-300">
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#EA580C] text-white font-bold shadow-xs">
                  <LayoutDashboard className="w-3 h-3 text-white shrink-0" />
                  <span>Dashboard</span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-slate-400">
                  <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>Invoices</span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-slate-400">
                  <Users className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>Customers</span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-slate-400">
                  <Package className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>Inventory</span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-slate-400">
                  <span className="text-[10px] text-slate-400 font-bold shrink-0">₹</span>
                  <span>Udhaar Khata</span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-slate-400">
                  <BarChart3 className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>Reports</span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                  <span>Settings</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mockup Main Screen Content */}
          <div className="flex-1 flex flex-col justify-between text-slate-800 overflow-hidden bg-gradient-to-br from-white to-slate-50">
            <div>
              {/* Header: Solid Warm Orange Banner matching mockup */}
              <div className="bg-gradient-to-r from-[#EA580C] to-[#F57C00] text-white px-3.5 py-1.5 flex items-center justify-between shadow-xs">
                <span className="font-bold text-xs tracking-tight">Dashboard</span>
                <span className="text-[9px] font-semibold text-white/85">Oct 2026</span>
              </div>

              <div className="p-2.5">
                {/* Two KPI cards */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs flex items-center justify-between">
                    <div>
                      <div className="text-[8.5px] font-semibold text-slate-500">Total Sales</div>
                      <div className="text-xs sm:text-sm font-black text-[#071F38] mt-0.5">
                        ₹ 48,250
                      </div>
                      <div className="text-[8px] font-bold text-emerald-600 flex items-center gap-0.5 mt-0.5">
                        <span>↑ +12%</span>
                        <span className="text-slate-400 font-normal">from last month</span>
                      </div>
                    </div>
                    <BarChart2 className="w-4 h-4 text-[#EA580C] shrink-0" />
                  </div>

                  <div className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs flex items-center justify-between">
                    <div>
                      <div className="text-[8.5px] font-semibold text-slate-500">Outstanding</div>
                      <div className="text-xs sm:text-sm font-black text-[#071F38] mt-0.5">
                        ₹ 12,400
                      </div>
                      <div className="text-[8px] font-medium text-amber-600 mt-0.5">
                        5 customers
                      </div>
                    </div>
                    <Users className="w-4 h-4 text-[#EA580C] shrink-0" />
                  </div>
                </div>

                {/* Sales Overview Chart (SVG with warm orange line & fill) */}
                <div className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs mb-2">
                  <div className="flex items-center justify-between text-[8.5px] font-semibold text-slate-600 mb-1">
                    <span>Sales Overview</span>
                    <span className="text-[#EA580C] font-bold">Trend</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col justify-between text-[7px] text-slate-400 h-11 shrink-0 font-medium">
                      <span>40</span>
                      <span>30</span>
                      <span>20</span>
                      <span>10</span>
                      <span>0</span>
                    </div>

                    <div className="h-11 w-full flex-1">
                      <svg viewBox="0 0 240 45" className="w-full h-full" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chartFill" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#EA580C" stopOpacity="0.45" />
                            <stop offset="60%" stopColor="#EA580C" stopOpacity="0.12" />
                            <stop offset="100%" stopColor="#EA580C" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M0,38 Q30,34 50,28 T100,16 T140,22 T180,10 T240,4 L240,45 L0,45 Z"
                          fill="url(#chartFill)"
                        />
                        <path
                          d="M0,38 Q30,34 50,28 T100,16 T140,22 T180,10 T240,4"
                          fill="none"
                          stroke="#EA580C"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>

                  <div className="flex justify-between text-[7px] text-slate-400 pl-4 pr-1 mt-0.5">
                    <span>Jan</span>
                    <span>Feb</span>
                    <span>Mar</span>
                    <span>Apr</span>
                    <span>May</span>
                    <span>Jun</span>
                    <span>Aug</span>
                  </div>
                </div>

                {/* Mini Recent Invoices Table */}
                <div className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs">
                  <div className="text-[8.5px] font-semibold text-slate-600 mb-1">
                    Recent Invoices
                  </div>
                  <div className="space-y-1 text-[8px]">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="font-semibold text-[#EA580C]">INV-001</span>
                      <span>Rajesh Kumar</span>
                      <span className="font-bold">₹2,450</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="font-semibold text-[#EA580C]">INV-002</span>
                      <span>Sharma Traders</span>
                      <span className="font-bold">₹8,120</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="font-semibold text-[#EA580C]">INV-003</span>
                      <span>Patel Enterprises</span>
                      <span className="font-bold">₹5,600</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   PURE CSS & SVG GLOSSY WARM ORANGE & DEEP NAVY HERO BACKGROUND
   Rich dark navy to radiant warm orange gradient matching mockup image
   ===================================================================== */
function GlossyHeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {/* 1. Base Rich Multi-stop Background Gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(115deg, #071322 0%, #0A1B2E 28%, #14283D 45%, #662600 65%, #C2410C 82%, #EA580C 94%, #F57C00 100%)',
        }}
      />

      {/* 2. Soft Ambient Warm Orange & Golden Amber Radial Glows */}
      <div
        className="absolute -top-16 -right-16 w-[750px] h-[620px] rounded-full opacity-60 mix-blend-screen pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 65% 35%, rgba(255, 140, 0, 0.75) 0%, rgba(234, 88, 12, 0.5) 40%, rgba(184, 58, 0, 0.2) 70%, transparent 90%)',
          filter: 'blur(50px)',
        }}
      />

      <div
        className="absolute top-1/2 left-[58%] -translate-x-1/2 -translate-y-1/2 w-[850px] h-[550px] rounded-full opacity-45 mix-blend-screen pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(245, 124, 0, 0.5) 0%, rgba(234, 88, 12, 0.3) 45%, transparent 75%)',
          filter: 'blur(55px)',
        }}
      />

      <div
        className="absolute -bottom-20 left-[48%] w-[650px] h-[380px] rounded-full opacity-40 mix-blend-screen pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(255, 122, 0, 0.55) 0%, rgba(234, 88, 12, 0.25) 55%, transparent 80%)',
          filter: 'blur(45px)',
        }}
      />

      {/* 3. Floating Subtle Watermark Receipt Shapes */}
      <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
        <div className="absolute top-10 left-[38%] w-14 h-16 border-2 border-orange-300 rounded-lg rotate-12 flex flex-col justify-around p-2">
          <div className="w-8 h-1 bg-orange-300 rounded-full" />
          <div className="w-6 h-1 bg-orange-300/80 rounded-full" />
          <div className="w-7 h-1 bg-orange-300/60 rounded-full" />
        </div>

        <div className="absolute top-8 right-[22%] w-16 h-20 border-2 border-amber-300 rounded-lg -rotate-6 flex flex-col justify-around p-2">
          <div className="w-10 h-1 bg-amber-300 rounded-full" />
          <div className="w-8 h-1 bg-amber-300/80 rounded-full" />
          <div className="w-9 h-1 bg-amber-300/60 rounded-full" />
        </div>

        <div className="absolute bottom-12 left-[12%] w-16 h-18 border-2 border-orange-400 rounded-lg -rotate-12 flex flex-col justify-around p-2">
          <div className="w-9 h-1 bg-orange-400 rounded-full" />
          <div className="w-7 h-1 bg-orange-400/80 rounded-full" />
          <div className="w-8 h-1 bg-orange-400/60 rounded-full" />
        </div>
      </div>

      {/* 4. Luminous Sweeping Ribbons */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1664 615"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="waveOrangePrimary" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7C2D12" stopOpacity="0.1" />
            <stop offset="40%" stopColor="#C2410C" stopOpacity="0.35" />
            <stop offset="75%" stopColor="#EA580C" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#F57C00" stopOpacity="0.75" />
          </linearGradient>

          <linearGradient id="waveOrangeSecondary" x1="15%" y1="90%" x2="100%" y2="20%">
            <stop offset="0%" stopColor="#431407" stopOpacity="0.0" />
            <stop offset="50%" stopColor="#9A3412" stopOpacity="0.25" />
            <stop offset="85%" stopColor="#EA580C" stopOpacity="0.48" />
            <stop offset="100%" stopColor="#FB923C" stopOpacity="0.65" />
          </linearGradient>

          <linearGradient id="orangeEdgeGlow1" x1="0%" y1="80%" x2="100%" y2="10%">
            <stop offset="0%" stopColor="#FB923C" stopOpacity="0.1" />
            <stop offset="40%" stopColor="#FDBA74" stopOpacity="0.45" />
            <stop offset="75%" stopColor="#FED7AA" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.95" />
          </linearGradient>
        </defs>

        <path
          d="M 850 615 C 1050 540 1220 380 1420 180 C 1510 90 1590 35 1664 0 L 1664 615 Z"
          fill="url(#waveOrangeSecondary)"
          opacity="0.65"
        />

        <path
          d="M 680 615 C 880 570 1080 480 1260 340 C 1420 215 1550 110 1664 50 L 1664 615 Z"
          fill="url(#waveOrangePrimary)"
          opacity="0.8"
        />

        <path
          d="M 680 615 C 880 570 1080 480 1260 340 C 1420 215 1550 110 1664 50"
          stroke="url(#orangeEdgeGlow1)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      {/* 5. Subtle Dotted Matrix Accent */}
      <div
        className="absolute top-6 left-6 w-52 h-52 opacity-25 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.4) 1.2px, transparent 1.2px)',
          backgroundSize: '16px 16px',
        }}
      />
    </div>
  );
}

/* =====================================================================
   MAIN PAGE COMPONENT
   ===================================================================== */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';
  const modeParam = searchParams.get('mode');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals for functional links
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('lenden_remembered_email');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }

      // Handle OAuth callback errors
      const errorParam = searchParams.get('error');
      if (errorParam) {
        if (errorParam === 'cancelled') {
          setError('Google sign-in was cancelled. You can try again or sign in with your email and password.');
        } else if (errorParam === 'invalid_state') {
          setError('Google sign-in session expired or security verification failed. Please try again.');
        } else if (errorParam === 'config_missing') {
          setError('Google Sign-In is not configured yet. GOOGLE_CLIENT_ID is missing in environment variables or platform settings.');
          setShowGoogleModal(true);
        } else if (errorParam === 'google_secret_missing') {
          setError('Google Client Secret is not configured. Please set GOOGLE_CLIENT_SECRET in Vercel or environment variables.');
          setShowGoogleModal(true);
        } else if (errorParam === 'token_exchange_failed') {
          setError('Could not complete authorization code exchange with Google. Please check your OAuth Client credentials.');
        } else if (errorParam === 'unverified_email') {
          setError('Your Google account email is not verified by Google. For security reasons, please verify your email on Google or log in with your email and password.');
        } else if (errorParam === 'account_suspended') {
          setError('Your account has been administratively suspended. Please contact platform support.');
        } else {
          setError('Google authentication failed. Please try again or use your email and password.');
        }
      }
    } catch {
      // Ignore
    }
  }, [searchParams]);

  const handleSignInFocus = () => {
    emailInputRef.current?.focus();
    emailInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (rememberMe) {
        localStorage.setItem('lenden_remembered_email', email.trim());
      } else {
        localStorage.removeItem('lenden_remembered_email');
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error || 'Invalid credentials. Please verify your email/mobile and password.'
        );
      }

      if (data.user?.platformRole === 'SUPER_ADMIN' && redirectUrl === '/') {
        router.push('/platform-admin');
      } else if (data.business?.plan === 'FREE_KHATA' && redirectUrl === '/') {
        router.push('/free-khata');
      } else if (!data.business && redirectUrl === '/') {
        router.push('/ghar-kharcha');
      } else {
        router.push(redirectUrl);
      }
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'An error occurred during login. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setError(null);
    setGoogleLoading(true);
    const params = new URLSearchParams();
    if (redirectUrl && redirectUrl !== '/') {
      params.set('redirect', redirectUrl);
    }
    if (modeParam) {
      params.set('mode', modeParam);
    }
    params.set('origin', 'login');
    window.location.href = `/api/auth/google?${params.toString()}`;
  };

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden w-full overflow-x-hidden bg-white font-sans selection:bg-[#EA580C] selection:text-white flex flex-col justify-between">

      {/* =========================================================
          1. HEADER NAVBAR (Compact, sleek height, full width)
          ========================================================= */}
      <header className="w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 h-[50px] lg:h-[54px] shrink-0">
        <div className="mx-auto px-4 sm:px-6 lg:px-10 h-full flex items-center justify-between max-w-[1580px] w-full">
          {/* Left: Official Pakka Chittha Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <img
              src="/pakka-chittha-logo.png"
              alt="Pakka Chittha"
              className="h-8 lg:h-9 w-auto object-contain transition-transform group-hover:scale-[1.02]"
              loading="eager"
            />
          </Link>

          {/* Center: Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-[13px] font-semibold text-slate-700">
            <button
              onClick={() => setShowHelpModal(true)}
              className="hover:text-[#EA580C] transition-colors cursor-pointer"
            >
              Features
            </button>
            <Link href="/select-mode" className="hover:text-[#EA580C] transition-colors">
              Mode Selection
            </Link>
            <Link href="/pricing" className="hover:text-[#EA580C] transition-colors">
              Pricing
            </Link>
            <Link
              href="/register?plan=ghar_kharcha"
              className="text-emerald-400 font-bold hover:text-emerald-300 transition-colors"
            >
              Ghar Kharcha
            </Link>
            <Link
              href="/register?plan=free_khata"
              className="hover:text-[#EA580C] transition-colors"
            >
              Free Khata
            </Link>
            <button
              onClick={() => setShowAboutModal(true)}
              className="hover:text-[#EA580C] transition-colors cursor-pointer"
            >
              About Us
            </button>
            <button
              onClick={() => setShowContactModal(true)}
              className="hover:text-[#EA580C] transition-colors cursor-pointer"
            >
              Contact
            </button>
            <button
              onClick={() => setShowHelpModal(true)}
              className="hover:text-[#EA580C] transition-colors cursor-pointer"
            >
              Help
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.removeItem('pc_intro_v4_seen');
                } catch {}
                window.location.href = '/login?intro=true';
              }}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 hover:bg-amber-100 text-[#EA580C] text-xs font-semibold transition-all cursor-pointer border border-[#EA580C]/25 shadow-2xs"
              title="Watch Pakka Chittha Intro"
            >
              <Play className="w-3 h-3 fill-current text-[#EA580C]" />
              <span>Intro</span>
            </button>
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleSignInFocus}
              className="hidden sm:inline-flex px-3.5 py-1.5 rounded-lg border border-slate-300 hover:border-slate-400 bg-white text-slate-800 font-semibold text-xs transition-all cursor-pointer shadow-2xs"
            >
              Sign In
            </button>
            <Link
              href="/register"
              className="px-3 sm:px-4 py-1.5 rounded-lg bg-[#EA580C] hover:bg-[#D94E00] text-white font-bold text-xs transition-all shadow-sm flex items-center gap-1"
            >
              Get Started
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 text-slate-700 hover:text-slate-950 rounded-lg hover:bg-slate-100"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-[50px] left-0 right-0 bg-white border-b border-slate-200 px-5 py-4 space-y-3 z-50 shadow-2xl animate-in fade-in slide-in-from-top-2">
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700 pb-2 border-b border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleSignInFocus();
                }}
                className="text-left px-2 py-1.5 rounded-lg hover:bg-slate-50 font-bold text-[#EA580C]"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowHelpModal(true);
                }}
                className="text-left px-2 py-1.5 rounded-lg hover:bg-slate-50"
              >
                Features
              </button>
              <Link
                href="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="px-2 py-1.5 rounded-lg hover:bg-slate-50"
              >
                Pricing
              </Link>
              <Link
                href="/register?plan=ghar_kharcha"
                onClick={() => setMobileMenuOpen(false)}
                className="px-2 py-1.5 rounded-lg hover:bg-slate-50 text-emerald-600 font-bold"
              >
                Ghar Kharcha
              </Link>
              <Link
                href="/register?plan=free_khata"
                onClick={() => setMobileMenuOpen(false)}
                className="px-2 py-1.5 rounded-lg hover:bg-slate-50 text-[#EA580C] font-bold"
              >
                Free Khata
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowAboutModal(true);
                }}
                className="text-left px-2 py-1.5 rounded-lg hover:bg-slate-50"
              >
                About Us
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowContactModal(true);
                }}
                className="text-left px-2 py-1.5 rounded-lg hover:bg-slate-50"
              >
                Contact
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowHelpModal(true);
                }}
                className="text-left px-2 py-1.5 rounded-lg hover:bg-slate-50"
              >
                Help
              </button>
            </div>
          </div>
        )}
      </header>

      {/* =========================================================
          2. MAIN HERO SECTION (Takes all remaining flex height, zero scroll)
          Three coordinated zones: Left Marketing, Center 3D Tablet, Right Login Card
          ========================================================= */}
      <section className="flex-1 min-h-0 w-full relative overflow-hidden flex items-center justify-center py-6 sm:py-8 lg:py-0">
        {/* Glossy gradient background */}
        <GlossyHeroBackground />

        {/* Hero Content Container: Stacks vertically on mobile, side-by-side on desktop */}
        <div className="mx-auto px-4 sm:px-6 lg:px-10 h-full w-full max-w-[1580px] flex flex-col lg:flex-row items-center justify-center lg:justify-between relative z-10 gap-6 lg:gap-8">
          {/* ZONE 1: MARKETING CONTENT */}
          <div className="shrink-0 relative z-20 flex flex-col justify-center text-center lg:text-left items-center lg:items-start py-2 max-w-[430px] w-full">
            {/* Tagline */}
            <div className="inline-flex items-center gap-2 mb-1.5">
              <span className="text-[10px] xl:text-[11px] font-bold tracking-[0.2em] text-slate-200 uppercase">
                BUSINESS MANAGEMENT MADE SIMPLE
              </span>
              <div className="h-[2px] w-10 bg-[#EA580C] rounded-full hidden lg:block" />
            </div>

            {/* Headline */}
            <h1 className="text-[34px] sm:text-4xl lg:text-[42px] xl:text-[48px] font-black tracking-tight leading-[1.08] text-[#FA8223] drop-shadow-sm">
              Har Hisab,
              <br className="hidden lg:inline" />{' '}
              <span>Ab Aasaan.</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-2 leading-relaxed text-slate-200 text-xs sm:text-sm xl:text-[15px] font-normal max-w-[360px]">
              Billing, inventory aur customer payments —
              <br className="hidden sm:inline" /> sab ek jagah.
            </p>

            {/* 4 Feature Badges (2x2 grid on mobile, horizontal row on desktop) */}
            <div className="grid grid-cols-2 lg:flex items-center gap-2.5 sm:gap-3 xl:gap-3.5 mt-4 xl:mt-4.5 w-full max-w-[280px] sm:max-w-[320px] lg:max-w-none">
              {/* 1. Simple Billing */}
              <div className="flex flex-col items-center text-center w-full lg:w-[68px] xl:w-[76px] p-2 lg:p-0 rounded-xl lg:rounded-none bg-black/15 lg:bg-transparent backdrop-blur-2xs lg:backdrop-blur-none border border-white/10 lg:border-none">
                <div className="w-10 h-10 xl:w-11 xl:h-11 rounded-xl bg-[#EA580C] flex items-center justify-center text-white shadow-md transition-transform hover:scale-105">
                  <FileText className="w-5 h-5 xl:w-5.5 xl:h-5.5 stroke-[2.2]" />
                </div>
                <span className="text-white font-semibold text-[10.5px] xl:text-xs mt-1.5 leading-tight">
                  Simple
                  <br />
                  Billing
                </span>
              </div>

              {/* 2. Inventory Control */}
              <div className="flex flex-col items-center text-center w-full lg:w-[68px] xl:w-[76px] p-2 lg:p-0 rounded-xl lg:rounded-none bg-black/15 lg:bg-transparent backdrop-blur-2xs lg:backdrop-blur-none border border-white/10 lg:border-none">
                <div className="w-10 h-10 xl:w-11 xl:h-11 rounded-xl bg-[#EA580C] flex items-center justify-center text-white shadow-md transition-transform hover:scale-105">
                  <Package className="w-5 h-5 xl:w-5.5 xl:h-5.5 stroke-[2.2]" />
                </div>
                <span className="text-white font-semibold text-[10.5px] xl:text-xs mt-1.5 leading-tight">
                  Inventory
                  <br />
                  Control
                </span>
              </div>

              {/* 3. Udhaar & Payments */}
              <div className="flex flex-col items-center text-center w-full lg:w-[68px] xl:w-[76px] p-2 lg:p-0 rounded-xl lg:rounded-none bg-black/15 lg:bg-transparent backdrop-blur-2xs lg:backdrop-blur-none border border-white/10 lg:border-none">
                <div className="w-10 h-10 xl:w-11 xl:h-11 rounded-xl bg-[#EA580C] flex items-center justify-center text-white shadow-md transition-transform hover:scale-105">
                  <Users className="w-5 h-5 xl:w-5.5 xl:h-5.5 stroke-[2.2]" />
                </div>
                <span className="text-white font-semibold text-[10.5px] xl:text-xs mt-1.5 leading-tight">
                  Udhaar &amp;
                  <br />
                  Payments
                </span>
              </div>

              {/* 4. Business Reports */}
              <div className="flex flex-col items-center text-center w-full lg:w-[68px] xl:w-[76px] p-2 lg:p-0 rounded-xl lg:rounded-none bg-black/15 lg:bg-transparent backdrop-blur-2xs lg:backdrop-blur-none border border-white/10 lg:border-none">
                <div className="w-10 h-10 xl:w-11 xl:h-11 rounded-xl bg-[#EA580C] flex items-center justify-center text-white shadow-md transition-transform hover:scale-105">
                  <BarChart3 className="w-5 h-5 xl:w-5.5 xl:h-5.5 stroke-[2.2]" />
                </div>
                <span className="text-white font-semibold text-[10.5px] xl:text-xs mt-1.5 leading-tight">
                  Business
                  <br />
                  Reports
                </span>
              </div>
            </div>
          </div>

          {/* ZONE 2: CENTER 3D DASHBOARD PREVIEW (Desktop only, exact mockup angle) */}
          <div
            className="hidden lg:block absolute top-1/2 -translate-y-1/2 z-10 pointer-events-none"
            style={{
              left: 'clamp(410px, 28vw, 510px)',
            }}
          >
            <div className="scale-[0.70] xl:scale-[0.80] 2xl:scale-[0.90] origin-left">
              <DashboardTabletMockup />
            </div>
          </div>

          {/* ZONE 3: LOGIN CARD (Centered on mobile, right on desktop) */}
          <div
            className="shrink-0 relative z-30 w-full max-w-[350px] sm:max-w-[365px] xl:max-w-[385px] mx-auto lg:mx-0 my-auto"
          >
            <div className="bg-white rounded-2xl xl:rounded-3xl p-4 sm:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] border border-slate-100 text-slate-800">
              {/* Actual Pakka Chittha Logo Centered at Top */}
              <div className="flex flex-col items-center justify-center">
                <img
                  src="/pakka-chittha-logo.png"
                  alt="Pakka Chittha"
                  className="h-7 xl:h-8 w-auto object-contain"
                />
                <Link
                  href="/select-mode"
                  className="mt-1 text-[10px] text-slate-400 hover:text-slate-700 transition-colors inline-flex items-center gap-1"
                >
                  <span>← Mode Badlein</span>
                </Link>
              </div>

              {/* Mode indicator badge if specified */}
              {modeParam === 'household' ? (
                <div className="flex items-center justify-center mt-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Home className="w-3 h-3 text-emerald-600" />
                    Mera Ghar • Ghar Kharcha Login
                  </span>
                </div>
              ) : modeParam === 'business' ? (
                <div className="flex items-center justify-center mt-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-orange-50 text-[#EA580C] border border-orange-200">
                    <Store className="w-3 h-3 text-[#EA580C]" />
                    Mera Vyapaar • Business Login
                  </span>
                </div>
              ) : null}

              {/* Welcome back Heading */}
              <h2 className="text-xl xl:text-2xl font-bold text-[#071F38] text-center mt-1 tracking-tight">
                Welcome back
              </h2>
              <p className="text-slate-500 text-[11px] xl:text-xs text-center mt-0.5">
                {modeParam === 'household'
                  ? 'Sign in to access your Household expenses & family budget'
                  : modeParam === 'business'
                  ? 'Sign in to access your billing, inventory & business khata'
                  : 'Please enter your details to sign in'}
              </p>

              {/* Error Banner */}
              {error && (
                <div className="mt-2 p-1.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-[11px] flex items-start gap-1.5">
                  <span className="font-bold shrink-0">⚠️</span>
                  <span className="flex-1 leading-snug">{error}</span>
                </div>
              )}

              {/* Sign In Form */}
              <form onSubmit={handleSubmit} className="mt-2.5 space-y-2.5">
                {/* Email address field */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      ref={emailInputRef}
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      disabled={loading}
                      required
                      className="w-full pl-8 pr-3 py-1.5 xl:py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] text-xs xl:text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-all disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Password field with show/hide control */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      disabled={loading}
                      required
                      className="w-full pl-8 pr-8 py-1.5 xl:py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] text-xs xl:text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-all disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember me & Forgot password row */}
                <div className="flex items-center justify-between text-[11px] pt-0.5">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-[#EA580C] focus:ring-[#EA580C] cursor-pointer"
                    />
                    <span className="text-slate-600 font-medium">Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="font-medium text-[#EA580C] hover:text-[#C2410C] transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 xl:py-2.5 px-4 rounded-xl bg-[#EA580C] hover:bg-[#D94E00] text-white font-bold text-xs xl:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99] mt-1"
                >
                  {loading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider: Or continue with */}
              <div className="relative flex items-center justify-center my-2 xl:my-2.5">
                <div className="w-full border-t border-slate-200" />
                <span className="absolute px-2.5 bg-white text-[10.5px] font-normal text-slate-400">
                  Or continue with
                </span>
              </div>

              {/* Continue with Google button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full py-1.5 xl:py-2 px-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 flex items-center justify-center gap-2 text-xs font-semibold text-slate-700 transition-all shadow-2xs cursor-pointer active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {googleLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
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
                <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
              </button>

              {/* Don't have an account? Sign up */}
              <p className="text-center text-[11px] text-slate-500 mt-2">
                {modeParam === 'household' ? (
                  <>
                    Naya parivaar hisaab?{' '}
                    <Link
                      href="/register?plan=ghar_kharcha"
                      className="font-semibold text-emerald-600 hover:underline"
                    >
                      Free Ghar Kharcha Banayein
                    </Link>
                  </>
                ) : (
                  <>
                    Don&apos;t have an account?{' '}
                    <Link
                      href="/register"
                      className="font-semibold text-[#EA580C] hover:underline"
                    >
                      Sign up
                    </Link>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          3. BOTTOM SECTION: BUSINESS CATEGORIES + POWERED/DEVELOPED ATTRIBUTION
          Compact single-band layout strictly within viewport
          ========================================================= */}
      <footer className="w-full bg-white border-t border-slate-200/80 shrink-0 py-2 xl:py-2.5 z-30">
        <div className="mx-auto px-4 sm:px-6 lg:px-10 max-w-[1580px] w-full">
          {/* Section Divider with Headline */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-1.5">
            <div className="h-px bg-slate-200 w-8 sm:w-24 xl:w-32" />
            <span className="text-[10px] xl:text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] text-center">
              BUILT FOR GROWING INDIAN BUSINESSES
            </span>
            <div className="h-px bg-slate-200 w-8 sm:w-24 xl:w-32" />
          </div>

          {/* SIX Category Cards in 2 Columns on Mobile, 6 on Desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 xl:gap-3 max-w-[1540px] mx-auto">
            {/* Card 1: Retail Stores */}
            <div className="bg-white rounded-xl py-1.5 px-2.5 xl:py-2 xl:px-3 border border-slate-200/90 shadow-2xs hover:border-[#EA580C] transition-all flex items-center gap-2 xl:gap-2.5 min-w-0">
              <div className="w-7 h-7 xl:w-8 xl:h-8 rounded-lg bg-[#E6F8F3] text-[#00B887] flex items-center justify-center shrink-0">
                <Store className="w-4 h-4 xl:w-4.5 xl:h-4.5" />
              </div>
              <span className="text-[11px] xl:text-xs font-bold text-slate-800 leading-tight truncate">
                Retail Stores
              </span>
            </div>

            {/* Card 2: Restaurants & Cafes */}
            <div className="bg-white rounded-xl py-1.5 px-2.5 xl:py-2 xl:px-3 border border-slate-200/90 shadow-2xs hover:border-[#EA580C] transition-all flex items-center gap-2 xl:gap-2.5 min-w-0">
              <div className="w-7 h-7 xl:w-8 xl:h-8 rounded-lg bg-[#FFF4E5] text-[#F97316] flex items-center justify-center shrink-0">
                <UtensilsCrossed className="w-4 h-4 xl:w-4.5 xl:h-4.5" />
              </div>
              <span className="text-[11px] xl:text-xs font-bold text-slate-800 leading-tight truncate">
                Restaurants &amp; Cafes
              </span>
            </div>

            {/* Card 3: Wholesalers */}
            <div className="bg-white rounded-xl py-1.5 px-2.5 xl:py-2 xl:px-3 border border-slate-200/90 shadow-2xs hover:border-[#EA580C] transition-all flex items-center gap-2 xl:gap-2.5 min-w-0">
              <div className="w-7 h-7 xl:w-8 xl:h-8 rounded-lg bg-[#E8F4FD] text-[#0284C7] flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 xl:w-4.5 xl:h-4.5" />
              </div>
              <span className="text-[11px] xl:text-xs font-bold text-slate-800 leading-tight truncate">
                Wholesalers
              </span>
            </div>

            {/* Card 4: Manufacturers */}
            <div className="bg-white rounded-xl py-1.5 px-2.5 xl:py-2 xl:px-3 border border-slate-200/90 shadow-2xs hover:border-[#EA580C] transition-all flex items-center gap-2 xl:gap-2.5 min-w-0">
              <div className="w-7 h-7 xl:w-8 xl:h-8 rounded-lg bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center shrink-0">
                <Factory className="w-4 h-4 xl:w-4.5 xl:h-4.5" />
              </div>
              <span className="text-[11px] xl:text-xs font-bold text-slate-800 leading-tight truncate">
                Manufacturers
              </span>
            </div>

            {/* Card 5: Distributors */}
            <div className="bg-white rounded-xl py-1.5 px-2.5 xl:py-2 xl:px-3 border border-slate-200/90 shadow-2xs hover:border-[#EA580C] transition-all flex items-center gap-2 xl:gap-2.5 min-w-0">
              <div className="w-7 h-7 xl:w-8 xl:h-8 rounded-lg bg-[#E6F8F3] text-[#008F91] flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4 xl:w-4.5 xl:h-4.5" />
              </div>
              <span className="text-[11px] xl:text-xs font-bold text-slate-800 leading-tight truncate">
                Distributors
              </span>
            </div>

            {/* Card 6: Service Businesses */}
            <div className="bg-white rounded-xl py-1.5 px-2.5 xl:py-2 xl:px-3 border border-slate-200/90 shadow-2xs hover:border-[#EA580C] transition-all flex items-center gap-2 xl:gap-2.5 min-w-0">
              <div className="w-7 h-7 xl:w-8 xl:h-8 rounded-lg bg-[#E8F4FD] text-[#2563EB] flex items-center justify-center shrink-0">
                <Briefcase className="w-4 h-4 xl:w-4.5 xl:h-4.5" />
              </div>
              <span className="text-[11px] xl:text-xs font-bold text-slate-800 leading-tight truncate">
                Service Businesses
              </span>
            </div>
          </div>

          {/* ATTRIBUTION — POWERED BY LAKSHYA STUDIOS, CO-POWERED BY LIONOR DIGITAL & DEVELOPED BY AADVIK SOLUTIONS */}
          <div className="flex items-center justify-center gap-3 sm:gap-6 mt-2 pt-1 border-t border-slate-100 flex-wrap">
            {/* Powered by Lakshya Studios */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] xl:text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Powered by
              </span>
              <div className="flex items-center bg-[#121B2C] px-2 py-0.5 rounded-md border border-slate-700/30 shadow-2xs transition-transform hover:scale-105">
                <img
                  src="/lakshya-studios-logo.jpg"
                  alt="Lakshya Studios"
                  className="h-4.5 xl:h-5 w-auto object-contain rounded"
                />
              </div>
            </div>

            {/* Subtle Vertical Divider */}
            <div className="hidden sm:block h-4 w-px bg-slate-200" />

            {/* Co-Powered by Lionor Digital */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] xl:text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Co-Powered by
              </span>
              <div className="flex items-center gap-1.5 transition-transform hover:scale-105">
                <img
                  src="/lionor-digital-logo.png"
                  alt="Lionor Digital"
                  className="h-5 xl:h-5.5 w-auto object-contain rounded-full shadow-2xs"
                />
                <span className="text-[11px] xl:text-xs font-bold text-slate-800 tracking-tight">Lionor Digital</span>
              </div>
            </div>

            {/* Subtle Vertical Divider */}
            <div className="hidden sm:block h-4 w-px bg-slate-200" />

            {/* Developed by Aadvik Solutions */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] xl:text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Developed by
              </span>
              <div className="flex items-center transition-transform hover:scale-105">
                <img
                  src="/aadvik-horizontal.png"
                  alt="Aadvik Solutions"
                  className="h-4.5 xl:h-5 w-auto object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* =========================================================
          4. MODALS FOR FULL FUNCTIONALITY
          ========================================================= */}

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#EA580C]" />
                <h3 className="font-bold text-sm text-[#071F38]">Forgot Password?</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-slate-600">
              <p>
                To maintain database security and strict multi-tenant privacy, password recoveries are verified securely.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <p className="font-semibold text-slate-800">Workspace Administrator Support</p>
                <p className="text-[11px] text-slate-500">
                  Email support at:{' '}
                  <span className="font-mono font-medium text-[#071F38]">admin@lenden.local</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Or contact your business owner to generate an administrative password reset.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-4 py-2 bg-[#071F38] text-white rounded-xl text-xs font-semibold hover:bg-[#0D2C4D] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Sign-in Diagnostic & Status Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#EA580C]" />
                <h3 className="font-bold text-sm text-[#071F38]">Google Authentication</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-2.5 text-xs text-slate-600">
              <p>
                Single Sign-On with Google connects with your configured Google Cloud OAuth credentials.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 font-mono text-[11px] text-slate-700">
                <div>
                  <span className="text-slate-400 font-sans block text-[10px] font-semibold uppercase">Authorized Redirect URI:</span>
                  <span className="text-[#071F38] break-all select-all">https://lenden-pi.vercel.app/api/auth/callback/google</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                You can also sign in directly using your registered email and password at any time.
              </p>
            </div>

            <div className="pt-2 flex justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowGoogleModal(false);
                  handleGoogleSignIn();
                }}
                className="px-4 py-2 bg-[#EA580C] text-white rounded-xl text-xs font-semibold hover:bg-[#D94E00] transition-colors cursor-pointer"
              >
                Continue with Google
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About Us Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#EA580C]" />
                <h3 className="font-bold text-base text-[#071F38]">About Pakka Chittha</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAboutModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <p>
                <strong>Pakka Chittha</strong> is India&apos;s modern commercial billing and credit-management platform built specifically for retail stores, wholesalers, manufacturers, and growing businesses.
              </p>
              <p>
                From professional GST invoicing to permanent Free Udhaar Khata, Pakka Chittha streamlines your entire business bookkeeping.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                Powered by <strong>Lakshya Studios</strong> • Co-Powered by <strong>Lionor Digital</strong> • Developed by <strong>Aadvik Solutions</strong>.
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAboutModal(false)}
                className="px-4 py-2 bg-[#071F38] text-white rounded-xl text-xs font-semibold hover:bg-[#0D2C4D] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#EA580C]" />
                <h3 className="font-bold text-base text-[#071F38]">Contact Support</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs sm:text-sm text-slate-600">
              <p>
                Our engineering and customer support team is here to assist your business setup and onboarding:
              </p>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#EA580C]" />
                  <span>support@lenden.local / admin@lenden.local</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#EA580C]" />
                  <span>+91 (Helpline - Available Mon-Sat)</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="px-4 py-2 bg-[#071F38] text-white rounded-xl text-xs font-semibold hover:bg-[#0D2C4D] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#EA580C]" />
                <h3 className="font-bold text-base text-[#071F38]">Help &amp; Quick FAQs</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="font-bold text-slate-800">What is Free Khata?</p>
                <p className="text-[11px] text-slate-500">
                  Free Khata gives you a permanent, lifetime-free personal lending and borrowing ledger.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="font-bold text-slate-800">What are the commercial plans?</p>
                <p className="text-[11px] text-slate-500">
                  Starter, Growth, and Scale plans include GST invoicing, multi-staff access, and inventory tracking.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-[#071F38] text-white rounded-xl text-xs font-semibold hover:bg-[#0D2C4D] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google OAuth Configuration Guidance Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-[#EA580C]" />
                <h3 className="font-bold text-base text-[#071F38]">Google Authentication Setup</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs text-slate-600 max-h-[60vh] overflow-y-auto">
              <p>
                To enable <strong>Continue with Google</strong> in production and local development, configure the following credentials:
              </p>

              <div className="space-y-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="font-bold text-slate-800 text-[11px]">1. Required Environment Variables</p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-600 font-mono text-[10.5px]">
                    <li>GOOGLE_CLIENT_ID</li>
                    <li>GOOGLE_CLIENT_SECRET</li>
                  </ul>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Add these in Vercel Project Settings &rarr; Environment Variables (for Production) and in your local <code>.env</code> file.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="font-bold text-slate-800 text-[11px]">2. Google Cloud Console Redirect URIs</p>
                  <p className="text-[10.5px] text-slate-500 mt-0.5">
                    In Google Cloud Console &rarr; Credentials &rarr; OAuth 2.0 Client IDs, add:
                  </p>
                  <div className="mt-1.5 p-2 bg-slate-100 rounded-lg font-mono text-[10px] text-slate-800 break-all space-y-1">
                    <div>https://lenden-pi.vercel.app/api/auth/callback/google</div>
                    <div>http://localhost:3000/api/auth/callback/google</div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="font-bold text-slate-800 text-[11px]">3. Authorized JavaScript Origins</p>
                  <div className="mt-1.5 p-2 bg-slate-100 rounded-lg font-mono text-[10px] text-slate-800 break-all space-y-1">
                    <div>https://lenden-pi.vercel.app</div>
                    <div>http://localhost:3000</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="px-4 py-2 bg-[#EA580C] hover:bg-[#D94E00] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#071F38]" />}>
      <LoginForm />
    </Suspense>
  );
}
