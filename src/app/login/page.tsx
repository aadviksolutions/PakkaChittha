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
} from 'lucide-react';
import { LendenFrameIntro } from '@/components/welcome/LendenFrameIntro';

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
        className="bg-[#071F38] rounded-2xl p-2.5 xl:p-3 border border-slate-700/60 backdrop-blur-md"
        style={{ width: '680px' }}
      >
        {/* Screen inner area */}
        <div className="flex bg-[#F8FAFC] rounded-xl overflow-hidden min-h-[350px] border border-slate-200/60 shadow-inner">
          {/* Mockup Left Dark Sidebar */}
          <div className="w-36 xl:w-40 bg-[#071F38] p-3 text-white flex flex-col justify-between shrink-0">
            <div>
              {/* App logo in sidebar */}
              <div className="flex items-center gap-1.5 px-1 py-1 mb-3.5 border-b border-slate-800 pb-2.5">
                <div className="w-5 h-5 rounded-md bg-[#00B887] flex items-center justify-center font-black text-[11px] text-[#071F38]">
                  ₹
                </div>
                <span className="font-bold text-[13px] tracking-tight">Lenden</span>
              </div>

              {/* Sidebar Navigation items */}
              <div className="space-y-1 text-[10px] font-medium text-slate-300">
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#00B887]/20 text-[#00E5A3] font-semibold">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00B887]" />
                  <span>Dashboard</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 text-slate-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                  <span>Invoices</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 text-slate-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                  <span>Customers</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 text-slate-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                  <span>Inventory</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 text-slate-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                  <span>Udhaar Khata</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 text-slate-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                  <span>Reports</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 text-slate-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                  <span>Settings</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mockup Main Screen Content */}
          <div className="flex-1 p-3.5 flex flex-col justify-between text-slate-800 overflow-hidden bg-gradient-to-br from-white to-slate-50">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-[#071F38]">Dashboard</span>
                <span className="text-[9.5px] font-semibold text-slate-400">Oct 2026</span>
              </div>

              {/* Two KPI cards */}
              <div className="grid grid-cols-2 gap-2 mb-2.5">
                <div className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs flex items-center justify-between">
                  <div>
                    <div className="text-[9px] font-semibold text-slate-500">Total Sales</div>
                    <div className="text-xs sm:text-sm font-black text-[#071F38] mt-0.5">
                      ₹ 48,250
                    </div>
                    <div className="text-[8.5px] font-bold text-emerald-600 flex items-center gap-0.5 mt-0.5">
                      <span>↑ +12%</span>
                      <span className="text-slate-400 font-normal">from last month</span>
                    </div>
                  </div>
                  <BarChart2 className="w-5 h-5 text-emerald-500 shrink-0" />
                </div>

                <div className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs flex items-center justify-between">
                  <div>
                    <div className="text-[9px] font-semibold text-slate-500">Outstanding</div>
                    <div className="text-xs sm:text-sm font-black text-[#071F38] mt-0.5">
                      ₹ 12,400
                    </div>
                    <div className="text-[8.5px] font-medium text-sky-600 mt-0.5">
                      5 customers
                    </div>
                  </div>
                  <Users className="w-5 h-5 text-sky-500 shrink-0" />
                </div>
              </div>

              {/* Sales Overview Chart (SVG) */}
              <div className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs mb-2.5">
                <div className="flex items-center justify-between text-[9px] font-semibold text-slate-600 mb-1">
                  <span>Sales Overview</span>
                  <span className="text-emerald-600 font-bold">Trend</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col justify-between text-[7.5px] text-slate-400 h-13 shrink-0 font-medium">
                    <span>40</span>
                    <span>30</span>
                    <span>20</span>
                    <span>10</span>
                    <span>0</span>
                  </div>
                  <div className="h-13 flex-1">
                    <svg viewBox="0 0 200 60" className="w-full h-full" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="mockGradFull" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#00B887" stopOpacity="0.45" />
                          <stop offset="100%" stopColor="#00B887" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,50 Q30,45 60,35 T120,20 T160,25 T200,10 L200,60 L0,60 Z"
                        fill="url(#mockGradFull)"
                      />
                      <path
                        d="M0,50 Q30,45 60,35 T120,20 T160,25 T200,10"
                        fill="none"
                        stroke="#00B887"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>
                <div className="flex justify-between text-[7.5px] text-slate-400 font-medium px-4 mt-0.5">
                  <span>Jan</span>
                  <span>Feb</span>
                  <span>Mar</span>
                  <span>Apr</span>
                  <span>May</span>
                  <span>Jun</span>
                  <span>Aug</span>
                </div>
              </div>

              {/* Recent Invoices mini table */}
              <div className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs">
                <div className="text-[9px] font-semibold text-slate-600 mb-1">Recent Invoices</div>
                <div className="flex items-center justify-between text-[8px] font-semibold text-slate-400 border-b border-slate-100 pb-1 mb-1">
                  <span>Invoice No.</span>
                  <span>Customer</span>
                  <span>Amount</span>
                </div>
                <div className="space-y-1 text-[8.5px]">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-semibold text-emerald-600">INV-001</span>
                    <span>Rajesh Kumar</span>
                    <span className="font-bold">₹2,450</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-semibold text-emerald-600">INV-002</span>
                    <span>Sharma Traders</span>
                    <span className="font-bold">₹8,120</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-semibold text-emerald-600">INV-003</span>
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
  );
}

/* =====================================================================
   PURE CSS & SVG GLOSSY TRANSLUCENT HERO BACKGROUND
   Layered gradients, luminous curved ribbons, soft ambient glows and matrix dots
   ===================================================================== */
function GlossyHeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {/* 1. Base Rich Multi-stop Background Gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(125deg, #071F38 0%, #06233F 22%, #003756 42%, #00566E 60%, #007C7D 75%, #009E7B 88%, #00B887 100%)',
        }}
      />

      {/* 2. Soft Ambient Radial Glows */}
      {/* Top-Right Emerald Aurora Glow */}
      <div
        className="absolute -top-20 -right-20 w-[720px] h-[600px] rounded-full opacity-45 mix-blend-screen pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 65% 35%, rgba(0, 229, 163, 0.75) 0%, rgba(0, 184, 135, 0.4) 40%, rgba(0, 143, 145, 0.15) 70%, transparent 90%)',
          filter: 'blur(45px)',
        }}
      />

      {/* Center Behind-Dashboard Teal Glow */}
      <div
        className="absolute top-1/2 left-[52%] -translate-x-1/2 -translate-y-1/2 w-[850px] h-[550px] rounded-full opacity-35 mix-blend-screen pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0, 184, 135, 0.4) 0%, rgba(0, 143, 145, 0.25) 38%, rgba(7, 31, 56, 0.0) 70%)',
          filter: 'blur(55px)',
        }}
      />

      {/* Bottom Center Teal Accent */}
      <div
        className="absolute -bottom-20 left-[45%] w-[650px] h-[380px] rounded-full opacity-30 mix-blend-screen pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0, 229, 163, 0.45) 0%, rgba(0, 143, 145, 0.2) 50%, transparent 80%)',
          filter: 'blur(50px)',
        }}
      />

      {/* 3. Luminous Sweeping Ribbons (Pure Vector Paths matching reference) */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1664 615"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="waveGradPrimary" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#004D61" stopOpacity="0.1" />
            <stop offset="40%" stopColor="#008F91" stopOpacity="0.32" />
            <stop offset="75%" stopColor="#00B887" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#00E5A3" stopOpacity="0.65" />
          </linearGradient>

          <linearGradient id="waveGradSecondary" x1="15%" y1="90%" x2="100%" y2="20%">
            <stop offset="0%" stopColor="#003550" stopOpacity="0.0" />
            <stop offset="50%" stopColor="#008F91" stopOpacity="0.22" />
            <stop offset="85%" stopColor="#00B887" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#00E5A3" stopOpacity="0.55" />
          </linearGradient>

          <linearGradient id="waveGradTertiary" x1="40%" y1="100%" x2="95%" y2="40%">
            <stop offset="0%" stopColor="#071F38" stopOpacity="0.0" />
            <stop offset="45%" stopColor="#00727B" stopOpacity="0.25" />
            <stop offset="80%" stopColor="#00B887" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#00E5A3" stopOpacity="0.5" />
          </linearGradient>

          <linearGradient id="edgeGlow1" x1="0%" y1="80%" x2="100%" y2="10%">
            <stop offset="0%" stopColor="#00E5A3" stopOpacity="0.05" />
            <stop offset="40%" stopColor="#00E5A3" stopOpacity="0.4" />
            <stop offset="75%" stopColor="#00FFA8" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id="edgeGlow2" x1="20%" y1="100%" x2="100%" y2="30%">
            <stop offset="0%" stopColor="#00E5A3" stopOpacity="0.0" />
            <stop offset="50%" stopColor="#00E5A3" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#A3FFDF" stopOpacity="0.7" />
          </linearGradient>

          <linearGradient id="edgeGlow3" x1="10%" y1="100%" x2="100%" y2="60%">
            <stop offset="0%" stopColor="#00B887" stopOpacity="0.0" />
            <stop offset="60%" stopColor="#00E5A3" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#00FFA8" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Deep background soft wave: sweeps up through upper right */}
        <path
          d="M 850 615 C 1050 540 1220 380 1420 180 C 1510 90 1590 35 1664 0 L 1664 615 Z"
          fill="url(#waveGradSecondary)"
          opacity="0.6"
        />

        {/* Primary sweeping translucent wave with graceful curve */}
        <path
          d="M 680 615 C 880 570 1080 480 1260 340 C 1420 215 1550 110 1664 50 L 1664 615 Z"
          fill="url(#waveGradPrimary)"
          opacity="0.75"
        />

        {/* Luminous crest line on Primary Wave */}
        <path
          d="M 680 615 C 880 570 1080 480 1260 340 C 1420 215 1550 110 1664 50"
          stroke="url(#edgeGlow1)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Foreground flowing translucent ribbon along bottom right */}
        <path
          d="M 920 615 C 1100 585 1280 520 1440 430 C 1540 370 1615 310 1664 260 L 1664 615 Z"
          fill="url(#waveGradTertiary)"
          opacity="0.8"
        />

        {/* Luminous crest line on Foreground Wave */}
        <path
          d="M 920 615 C 1100 585 1280 520 1440 430 C 1540 370 1615 310 1664 260"
          stroke="url(#edgeGlow2)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Subtle low swoop curve in bottom center-left */}
        <path
          d="M 400 615 C 560 590 720 540 880 490 C 1040 440 1200 420 1380 470"
          stroke="url(#edgeGlow3)"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.4"
        />
      </svg>

      {/* 4. Subtle Dotted Matrix Accent in Upper-Left Corner */}
      <div
        className="absolute top-6 left-6 w-48 h-48 opacity-25 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#00E5A3 1.2px, transparent 1.2px)',
          backgroundSize: '18px 18px',
          maskImage: 'radial-gradient(ellipse at 25% 25%, black 40%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 25% 25%, black 40%, transparent 80%)',
        }}
      />

      {/* 5. Delicate Glass Reflection Overlay */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 35%)',
        }}
      />
    </div>
  );
}

/* =====================================================================
   MOBILE-FIRST HERO BACKGROUND
   Compact glossy navy-teal-emerald gradient with subtle vector curves
   ===================================================================== */
function MobileHeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(155deg, #071F38 0%, #062644 32%, #003756 55%, #007C7D 80%, #00B887 100%)',
        }}
      />
      {/* Top right emerald glow */}
      <div
        className="absolute -top-10 -right-10 w-60 h-60 rounded-full opacity-40 mix-blend-screen"
        style={{
          background: 'radial-gradient(circle, rgba(0, 229, 163, 0.7) 0%, transparent 70%)',
          filter: 'blur(35px)',
        }}
      />
      {/* Bottom center teal glow */}
      <div
        className="absolute -bottom-10 left-1/4 w-72 h-48 rounded-full opacity-35 mix-blend-screen"
        style={{
          background: 'radial-gradient(ellipse, rgba(0, 184, 135, 0.5) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      {/* Subtle sweeping vector curve */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 600"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M 100 600 C 180 480 260 320 400 180 L 400 600 Z"
          fill="#00B887"
          opacity="0.14"
        />
        <path
          d="M 100 600 C 180 480 260 320 400 180"
          stroke="rgba(0, 229, 163, 0.4)"
          strokeWidth="1.5"
        />
      </svg>
      {/* Dot matrix corner accent */}
      <div
        className="absolute top-3 left-3 w-28 h-28 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#00E5A3 1px, transparent 1px)',
          backgroundSize: '14px 14px',
        }}
      />
    </div>
  );
}

/* =====================================================================
   MOBILE DASHBOARD PREVIEW CARD
   Compact, native app-style horizontal preview of business metrics
   ===================================================================== */
function MobileDashboardMockup() {
  return (
    <div className="w-full bg-[#071F38] rounded-2xl p-3 sm:p-3.5 border border-slate-700/60 shadow-xl text-white select-none overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-md bg-[#00B887] flex items-center justify-center font-black text-[11px] text-[#071F38] shrink-0">
            ₹
          </div>
          <span className="font-bold text-xs tracking-tight truncate">Lenden Dashboard</span>
        </div>
        <span className="text-[10px] font-semibold text-slate-400 shrink-0">Oct 2026</span>
      </div>

      {/* Two Metric Pills */}
      <div className="grid grid-cols-2 gap-2 my-2.5">
        <div className="bg-white/5 rounded-xl p-2 sm:p-2.5 border border-white/10 min-w-0">
          <div className="text-[9.5px] sm:text-[10px] text-slate-400 font-medium truncate">Total Sales</div>
          <div className="text-sm sm:text-base font-black text-white mt-0.5">₹ 48,250</div>
          <div className="text-[8.5px] sm:text-[9px] font-bold text-[#00E5A3] mt-0.5 flex flex-wrap items-center gap-1">
            <span>↑ +12%</span>
            <span className="text-slate-400 font-normal truncate">this mo</span>
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-2 sm:p-2.5 border border-white/10 min-w-0">
          <div className="text-[9.5px] sm:text-[10px] text-slate-400 font-medium truncate">Outstanding</div>
          <div className="text-sm sm:text-base font-black text-white mt-0.5">₹ 12,400</div>
          <div className="text-[8.5px] sm:text-[9px] font-medium text-sky-400 mt-0.5 truncate">
            5 customers
          </div>
        </div>
      </div>

      {/* Sales Overview Sparkline */}
      <div className="bg-white/5 rounded-xl p-2 sm:p-2.5 border border-white/10 mb-2.5 overflow-hidden">
        <div className="flex items-center justify-between text-[10px] text-slate-300 font-semibold mb-1">
          <span>Sales Overview</span>
          <span className="text-[#00E5A3] font-bold">Trend</span>
        </div>
        <div className="h-9 sm:h-10 w-full overflow-hidden">
          <svg viewBox="0 0 200 50" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="mobileGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00B887" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#00B887" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M0,42 Q30,38 60,30 T120,16 T160,20 T200,8 L200,50 L0,50 Z"
              fill="url(#mobileGrad)"
            />
            <path
              d="M0,42 Q30,38 60,30 T120,16 T160,20 T200,8"
              fill="none"
              stroke="#00E5A3"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="flex justify-between text-[8px] text-slate-400 font-medium px-1 mt-0.5">
          <span>Jan</span>
          <span>Mar</span>
          <span>May</span>
          <span>Jul</span>
          <span>Oct</span>
        </div>
      </div>

      {/* Mini Recent Invoice */}
      <div className="bg-white/5 rounded-xl px-2 sm:px-2.5 py-1.5 border border-white/10 flex items-center justify-between text-[9.5px] sm:text-[10px]">
        <span className="font-bold text-[#00E5A3] shrink-0">INV-001</span>
        <span className="text-slate-300 truncate px-1.5">Rajesh Kumar</span>
        <span className="font-bold text-white shrink-0">₹2,450</span>
      </div>
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
  const [showIntro, setShowIntro] = useState(false);
  const [isIntroForced, setIsIntroForced] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const mobileEmailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('lenden_remembered_email');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
      const noIntroParam = searchParams.get('nointro');
      const forceIntroParam =
        searchParams.get('forceintro') === 'true' || searchParams.get('intro') === 'true';
      const introAlreadySeen =
        sessionStorage.getItem('lenden_intro_played') === 'true' ||
        sessionStorage.getItem('lenden_intro_seen') === 'true';
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (forceIntroParam) {
        setIsIntroForced(true);
        setShowIntro(true);
      } else if (!noIntroParam && !introAlreadySeen && !prefersReducedMotion) {
        setShowIntro(true);
      }

      // Handle OAuth callback errors
      const errorParam = searchParams.get('error');
      if (errorParam) {
        if (errorParam === 'cancelled') {
          setError('Google sign-in was cancelled. You can try again or sign in with your email and password.');
        } else if (errorParam === 'invalid_state') {
          setError('Google sign-in session expired or security verification failed. Please try again.');
        } else if (errorParam === 'config_missing') {
          setError('Google Single Sign-On is not configured yet (missing Client ID).');
          setShowGoogleModal(true);
        } else if (errorParam === 'google_secret_missing') {
          setError('Google Client Secret is not configured. Please add GOOGLE_CLIENT_SECRET in platform settings or Vercel.');
          setShowGoogleModal(true);
        } else if (errorParam === 'token_exchange_failed') {
          setError('Could not complete authentication with Google. Please check your credentials or try again.');
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

  const handleMobileScrollToLogin = () => {
    setMobileMenuOpen(false);
    const el = document.getElementById('mobile-login-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => {
        mobileEmailInputRef.current?.focus();
      }, 500);
    }
  };

  const handleSignInFocus = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      handleMobileScrollToLogin();
    } else {
      emailInputRef.current?.focus();
      emailInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
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
    const targetRedirect =
      redirectUrl && redirectUrl !== '/'
        ? `?redirect=${encodeURIComponent(redirectUrl)}`
        : '';
    window.location.href = `/api/auth/google${targetRedirect}`;
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden lg:h-screen lg:overflow-hidden bg-white font-sans selection:bg-[#00B887] selection:text-white flex flex-col justify-between">
      {/* Lenden JPG Frame Intro: 180 frames @ 30 FPS over ~6s with canvas and black letterbox */}
      {showIntro && (
        <LendenFrameIntro
          forcePlay={isIntroForced}
          onComplete={() => {
            setShowIntro(false);
            setIsIntroForced(false);
          }}
        />
      )}

      {/* =========================================================
          1. HEADER (70px Tall on desktop, 62px on mobile, clean white)
          ========================================================= */}
      <header className="w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 h-[62px] lg:h-[70px] shrink-0">
        <div
          className="mx-auto px-3.5 sm:px-6 lg:px-10 h-full flex items-center justify-between max-w-[1580px] w-full"
        >
          {/* Left: Official Lenden Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <img
              src="/logo-horizontal.png"
              alt="Lenden"
              className="h-7 sm:h-8 lg:h-9 w-auto object-contain transition-transform group-hover:scale-[1.02]"
              loading="eager"
            />
          </Link>

          {/* Center: Desktop Navigation Links (hidden on mobile) */}
          <nav className="hidden lg:flex items-center gap-7 lg:gap-9 text-[14px] font-semibold text-slate-700">
            <button
              onClick={() => setShowHelpModal(true)}
              className="hover:text-[#00B887] transition-colors cursor-pointer"
            >
              Features
            </button>
            <Link href="/pricing" className="hover:text-[#00B887] transition-colors">
              Pricing
            </Link>
            <Link
              href="/register?plan=free_khata"
              className="hover:text-[#00B887] transition-colors"
            >
              Free Khata
            </Link>
            <button
              onClick={() => setShowAboutModal(true)}
              className="hover:text-[#00B887] transition-colors cursor-pointer"
            >
              About Us
            </button>
            <button
              onClick={() => setShowContactModal(true)}
              className="hover:text-[#00B887] transition-colors cursor-pointer"
            >
              Contact
            </button>
            <button
              onClick={() => setShowHelpModal(true)}
              className="hover:text-[#00B887] transition-colors cursor-pointer"
            >
              Help
            </button>
            <button
              type="button"
              onClick={() => {
                setIsIntroForced(true);
                setShowIntro(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-[#008F91] hover:text-[#00B887] text-xs font-semibold transition-all cursor-pointer border border-[#00B887]/25 shadow-2xs"
              title="Watch Lenden Intro"
            >
              <Play className="w-3 h-3 fill-current text-[#00B887]" />
              <span>Intro</span>
            </button>
          </nav>

          {/* Right: Desktop Actions (hidden on mobile) */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleSignInFocus}
              className="px-4 sm:px-5 py-2 rounded-lg border border-[#00B887] hover:bg-emerald-50 text-[#071F38] hover:text-[#00B887] font-semibold text-xs sm:text-sm transition-colors cursor-pointer shadow-2xs"
            >
              Sign In
            </button>
            <Link
              href="/register"
              className="px-4 sm:px-5 py-2 rounded-lg bg-[#00B887] hover:bg-[#009E74] text-white font-semibold text-xs sm:text-sm transition-colors shadow-xs"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Right Bar: Quick Sign In + Hamburger Toggle */}
          <div className="flex lg:hidden items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleMobileScrollToLogin}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-[#00B887] text-[#00B887] hover:bg-emerald-50 font-bold text-xs transition-colors cursor-pointer shrink-0"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="p-1.5 sm:p-2 text-slate-700 hover:text-slate-950 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-[62px] left-0 right-0 bg-white border-b border-slate-200 px-5 py-4 space-y-3.5 z-50 shadow-2xl animate-in fade-in slide-in-from-top-2">
            <div className="grid grid-cols-2 gap-1 text-sm font-semibold text-slate-700 pb-2 border-b border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowHelpModal(true);
                }}
                className="text-left px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Features
              </button>
              <Link
                href="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/register?plan=free_khata"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50 text-emerald-600 font-bold transition-colors"
              >
                Free Khata
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowAboutModal(true);
                }}
                className="text-left px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                About Us
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowContactModal(true);
                }}
                className="text-left px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Contact
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowHelpModal(true);
                }}
                className="text-left px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Help
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsIntroForced(true);
                  setShowIntro(true);
                }}
                className="col-span-2 text-left px-3 py-2 rounded-lg hover:bg-emerald-50 text-emerald-700 font-semibold flex items-center gap-2 transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Watch Intro Animation</span>
              </button>
            </div>

            {/* Mobile Drawer Action Buttons */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleMobileScrollToLogin();
                }}
                className="w-full py-2.5 rounded-xl border border-[#00B887] text-[#071F38] font-bold text-xs text-center hover:bg-emerald-50 transition-colors cursor-pointer"
              >
                Sign In to Account
              </button>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 rounded-xl bg-[#00B887] text-white font-bold text-xs text-center shadow-xs hover:bg-[#009E74] transition-colors"
              >
                Get Started / Register Your Business
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* =========================================================
          2. DESKTOP HERO — THREE DISTINCT VISUAL ZONES (Exact Reference Match)
          Approved Desktop Design: 100% Preserved
          ========================================================= */}
      <section className="hidden lg:block relative w-full overflow-hidden min-h-[580px] lg:h-[610px] shrink-0 py-6 lg:py-0">
        {/* Pure CSS & SVG Glossy, Translucent Background */}
        <GlossyHeroBackground />

        {/* Hero Content Container: 3 coordinated zones */}
        <div
          className="mx-auto px-6 sm:px-10 h-full relative"
          style={{
            maxWidth: '1580px',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* ZONE 1: LEFT MARKETING CONTENT (Strictly bounded left width: 450px) */}
          <div
            className="shrink-0 relative z-20 flex flex-col justify-center text-left items-start py-4 lg:py-0"
            style={{ width: '450px', maxWidth: '100%' }}
          >
            {/* Small uppercase label with accent line */}
            <div className="inline-flex items-center gap-2 mb-2">
              <span className="text-[11px] xl:text-xs font-bold tracking-[0.2em] text-slate-200 uppercase">
                BUSINESS MANAGEMENT MADE SIMPLE
              </span>
              <div className="h-[2px] w-12 bg-[#00B887] rounded-full" />
            </div>

            {/* Headline on exactly TWO lines */}
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] xl:text-[62px] font-black tracking-tight leading-[1.05] text-white mt-1">
              Har Hisab,
              <br />
              <span className="text-[#00E5A3]">Ab Aasaan.</span>
            </h1>

            {/* Description */}
            <p
              className="mt-3.5 leading-relaxed max-w-[420px]"
              style={{ color: '#E2E8F0', fontSize: '19px', fontWeight: 400 }}
            >
              Billing, inventory aur customer payments —
              <br className="hidden sm:inline" />
              {' '}sab ek jagah.
            </p>

            {/* FOUR Feature Tiles in ONE Horizontal Row */}
            <div className="flex items-center gap-3 sm:gap-4 mt-6 w-full max-w-[420px]">
              {/* 1. Simple Billing */}
              <div className="flex flex-col items-center text-center w-[80px] shrink-0">
                <div
                  className="flex items-center justify-center transition-transform hover:scale-105"
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'rgba(0, 184, 135, 0.25)',
                    border: '2px solid #00E5A3',
                    boxShadow: '0 0 16px rgba(0, 229, 163, 0.35)',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <FileText className="w-6 h-6 text-[#00FFA8] stroke-[2.2]" />
                </div>
                <span className="text-white font-semibold text-xs mt-2 leading-tight">
                  Simple
                  <br />
                  Billing
                </span>
              </div>

              {/* 2. Inventory Control */}
              <div className="flex flex-col items-center text-center w-[80px] shrink-0">
                <div
                  className="flex items-center justify-center transition-transform hover:scale-105"
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'rgba(2, 132, 199, 0.25)',
                    border: '2px solid #38BDF8',
                    boxShadow: '0 0 16px rgba(56, 189, 248, 0.35)',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <Package className="w-6 h-6 text-[#7DD3FC] stroke-[2.2]" />
                </div>
                <span className="text-white font-semibold text-xs mt-2 leading-tight">
                  Inventory
                  <br />
                  Control
                </span>
              </div>

              {/* 3. Udhaar & Payments */}
              <div className="flex flex-col items-center text-center w-[80px] shrink-0">
                <div
                  className="flex items-center justify-center transition-transform hover:scale-105"
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'rgba(217, 119, 6, 0.25)',
                    border: '2px solid #FBBF24',
                    boxShadow: '0 0 16px rgba(251, 191, 36, 0.35)',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <Users className="w-6 h-6 text-[#FDE68A] stroke-[2.2]" />
                </div>
                <span className="text-white font-semibold text-xs mt-2 leading-tight">
                  Udhaar &amp;
                  <br />
                  Payments
                </span>
              </div>

              {/* 4. Business Reports */}
              <div className="flex flex-col items-center text-center w-[80px] shrink-0">
                <div
                  className="flex items-center justify-center transition-transform hover:scale-105"
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'rgba(147, 51, 234, 0.25)',
                    border: '2px solid #C084FC',
                    boxShadow: '0 0 16px rgba(192, 132, 252, 0.35)',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <BarChart3 className="w-6 h-6 text-[#E9D5FF] stroke-[2.2]" />
                </div>
                <span className="text-white font-semibold text-xs mt-2 leading-tight">
                  Business
                  <br />
                  Reports
                </span>
              </div>
            </div>
          </div>

          {/* ZONE 2: CENTER 3D DASHBOARD PREVIEW
              Positioned centrally, starts to the right of Zone 1, extends behind login card */}
          <div
            className="hidden lg:block absolute top-1/2 -translate-y-1/2 z-10 pointer-events-none"
            style={{
              left: 'clamp(460px, 31vw, 550px)',
            }}
          >
            <div className="scale-[0.80] xl:scale-[0.92] 2xl:scale-100 origin-left">
              <DashboardTabletMockup />
            </div>
          </div>

          {/* ZONE 3: RIGHT LOGIN CARD (Prominent White Card Layered in Front) */}
          <div
            className="py-4 lg:py-0"
            style={{ width: '425px', maxWidth: '100%', flexShrink: 0, position: 'relative', zIndex: 30 }}
          >
            <div
              className="bg-white rounded-[22px] p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.35)] border border-slate-100 text-slate-800"
              style={{ width: '100%' }}
            >
              {/* Actual Lenden Logo Centered at Top */}
              <div className="flex items-center justify-center">
                <img
                  src="/logo-horizontal.png"
                  alt="Lenden"
                  className="h-7 sm:h-8 w-auto object-contain"
                />
              </div>

              {/* Welcome back Heading */}
              <h2 className="text-2xl sm:text-[25px] font-bold text-[#071F38] text-center mt-2.5 tracking-tight">
                Welcome back
              </h2>
              <p className="text-slate-500 text-xs sm:text-[13px] text-center mt-1">
                Please enter your details to sign in
              </p>

              {/* Error Banner */}
              {error && (
                <div className="mt-2.5 p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
                  <span className="font-bold shrink-0 mt-0.5">⚠️</span>
                  <span className="flex-1 leading-snug">{error}</span>
                </div>
              )}

              {/* Sign In Form */}
              <form onSubmit={handleSubmit} className="mt-3.5 space-y-3">
                {/* Email address field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      ref={emailInputRef}
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      disabled={loading}
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00B887]/25 focus:border-[#00B887] text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-all disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Password field with show/hide control */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      disabled={loading}
                      required
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00B887]/25 focus:border-[#00B887] text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-all disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember me & Forgot password row */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#00B887] focus:ring-[#00B887] cursor-pointer"
                    />
                    <span className="text-slate-600 font-medium">Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="font-medium text-[#00B887] hover:text-[#009E74] transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Full-width Sign In Button with navy-to-emerald gradient */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#071F38] via-[#004D61] to-[#00B887] hover:from-[#0a2745] hover:to-[#009E74] text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99] mt-1.5"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider: Or continue with */}
              <div className="relative flex items-center justify-center my-3">
                <div className="w-full border-t border-slate-200" />
                <span className="absolute px-3 bg-white text-xs font-normal text-slate-400">
                  Or continue with
                </span>
              </div>

              {/* Continue with Google button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full py-2 px-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 flex items-center justify-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-700 transition-all shadow-2xs cursor-pointer active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {googleLoading ? (
                  <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
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
                <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
              </button>

              {/* Don't have an account? Sign up */}
              <p className="text-center text-xs text-slate-500 mt-3">
                Don&apos;t have an account?{' '}
                <Link
                  href="/register"
                  className="font-semibold text-[#00B887] hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          3. BUSINESS CATEGORIES & AADVIK SOLUTIONS ATTRIBUTION (DESKTOP)
          Shares remaining vertical space; guaranteed no-scroll at 1664x936
          ========================================================= */}
      <section className="hidden lg:flex w-full bg-white py-3 sm:py-4 border-t border-slate-100 flex-1 flex-col justify-center min-h-0">
        <div
          className="mx-auto px-6 sm:px-10 w-full"
          style={{ maxWidth: '1580px' }}
        >
          {/* Section Divider with Headline */}
          <div className="flex items-center justify-center gap-4 max-w-4xl mx-auto mb-3">
            <div className="h-px bg-slate-200 flex-1 max-w-[200px]" />
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-[0.2em] text-center whitespace-nowrap">
              BUILT FOR GROWING INDIAN BUSINESSES
            </span>
            <div className="h-px bg-slate-200 flex-1 max-w-[200px]" />
          </div>

          {/* SIX Cards in ONE Horizontal Row */}
          <div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 max-w-[1540px] mx-auto"
          >
            {/* Card 1: Retail Stores */}
            <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-[#00B887] transition-all flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#E6F8F3] text-[#00B887] flex items-center justify-center shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <span className="text-xs sm:text-[13px] font-bold text-slate-800 leading-tight">
                Retail Stores
              </span>
            </div>

            {/* Card 2: Restaurants & Cafes */}
            <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-[#00B887] transition-all flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#FFF4E5] text-[#F97316] flex items-center justify-center shrink-0">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <span className="text-xs sm:text-[13px] font-bold text-slate-800 leading-tight">
                Restaurants
                <br />
                &amp; Cafes
              </span>
            </div>

            {/* Card 3: Wholesalers */}
            <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-[#00B887] transition-all flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#E8F4FD] text-[#0284C7] flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="text-xs sm:text-[13px] font-bold text-slate-800 leading-tight">
                Wholesalers
              </span>
            </div>

            {/* Card 4: Manufacturers */}
            <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-[#00B887] transition-all flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center shrink-0">
                <Factory className="w-5 h-5" />
              </div>
              <span className="text-xs sm:text-[13px] font-bold text-slate-800 leading-tight">
                Manufacturers
              </span>
            </div>

            {/* Card 5: Distributors */}
            <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-[#00B887] transition-all flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#E6F8F3] text-[#008F91] flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <span className="text-xs sm:text-[13px] font-bold text-slate-800 leading-tight">
                Distributors
              </span>
            </div>

            {/* Card 6: Service Businesses */}
            <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-[#00B887] transition-all flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#E8F4FD] text-[#2563EB] flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <span className="text-xs sm:text-[13px] font-bold text-slate-800 leading-tight">
                Service
                <br />
                Businesses
              </span>
            </div>
          </div>

          {/* =========================================================
              4. POWERED BY AADVIK SOLUTIONS — BOTTOM CENTER
              ========================================================= */}
          <div className="flex flex-col items-center justify-center text-center mt-3">
            <span className="text-[11px] font-medium text-slate-400 tracking-wide">
              Powered by
            </span>
            <div className="flex items-center justify-center gap-3 mt-1">
              <div className="h-px bg-slate-200 w-16 sm:w-28" />
              <img
                src="/aadvik-horizontal.png"
                alt="Aadvik Solutions - Infinite Solutions. One Vision."
                className="h-7 sm:h-8 w-auto object-contain transition-transform hover:scale-105"
              />
              <div className="h-px bg-slate-200 w-16 sm:w-28" />
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          NATIVE APP-STYLE MOBILE EXPERIENCE (< 1024px)
          Dedicated mobile-first single column, compact, touch-friendly
          ========================================================= */}
      <main className="block lg:hidden w-full overflow-x-hidden">
        {/* --- 1. MOBILE HERO & FEATURE TILES --- */}
        <section className="relative w-full overflow-hidden bg-[#071F38] pt-5 sm:pt-6 pb-7 px-4 sm:px-5 text-white">
          <MobileHeroBackground />

          <div className="relative z-10 max-w-md mx-auto">
            {/* Small Eyebrow */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-xs border border-white/15 mb-3 max-w-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E5A3] shrink-0 animate-pulse" />
              <span className="text-[9.5px] sm:text-[11px] font-bold tracking-[0.14em] sm:tracking-[0.16em] uppercase text-[#00E5A3] truncate">
                BUSINESS MANAGEMENT MADE SIMPLE
              </span>
            </div>

            {/* Headline: 34-40px responsive typography */}
            <h1 className="text-[28px] xs:text-[32px] sm:text-[38px] font-extrabold leading-[1.12] tracking-tight">
              <span>Har Hisab,</span>
              <br />
              <span className="text-[#00E5A3]">Ab Aasaan.</span>
            </h1>

            {/* Description */}
            <p className="text-[14.5px] sm:text-base text-slate-200/90 leading-relaxed mt-2.5 max-w-sm">
              Billing, inventory aur customer payments — sab ek jagah.
            </p>

            {/* Mobile Hero Actions */}
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5 mt-5">
              <button
                type="button"
                onClick={handleMobileScrollToLogin}
                className="w-full py-2.5 sm:py-3 px-2 sm:px-3 rounded-xl bg-[#00B887] hover:bg-[#009E74] active:scale-[0.98] text-white font-bold text-xs sm:text-sm text-center shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <Link
                href="/register"
                className="w-full py-2.5 sm:py-3 px-2 sm:px-3 rounded-xl bg-white/10 hover:bg-white/20 active:scale-[0.98] border border-white/20 text-white font-semibold text-xs sm:text-sm text-center backdrop-blur-xs transition-all flex items-center justify-center gap-1.5"
              >
                <span>Get Started</span>
              </Link>
            </div>

            {/* Compact Free Khata Banner */}
            <Link
              href="/register?plan=free_khata"
              className="mt-3 flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/30 hover:border-emerald-400/60 transition-colors gap-2"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span className="px-1.5 py-0.5 rounded-md bg-[#00B887] text-[8.5px] sm:text-[9px] font-black uppercase text-[#071F38] shrink-0">
                  Free
                </span>
                <span className="text-[11px] sm:text-xs font-semibold text-white truncate">
                  100% Free Khata Plan Available
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#00E5A3] shrink-0">Start →</span>
            </Link>

            {/* Compact 4-Feature 2-Column Grid */}
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5 mt-5 sm:mt-6">
              {/* Feature 1 */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 sm:p-3 border border-white/15 flex items-center gap-2 sm:gap-2.5 shadow-xs min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#00B887]/25 text-[#00E5A3] flex items-center justify-center shrink-0 border border-[#00B887]/30">
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] sm:text-[12px] font-bold text-white leading-tight truncate">
                    Simple Billing
                  </div>
                  <div className="text-[9.5px] sm:text-[10px] text-slate-300 leading-tight mt-0.5 truncate">
                    GST &amp; Non-GST
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 sm:p-3 border border-white/15 flex items-center gap-2 sm:gap-2.5 shadow-xs min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-teal-500/25 text-teal-300 flex items-center justify-center shrink-0 border border-teal-500/30">
                  <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] sm:text-[12px] font-bold text-white leading-tight truncate">
                    Inventory Control
                  </div>
                  <div className="text-[9.5px] sm:text-[10px] text-slate-300 leading-tight mt-0.5 truncate">
                    Low stock alerts
                  </div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 sm:p-3 border border-white/15 flex items-center gap-2 sm:gap-2.5 shadow-xs min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-500/25 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] sm:text-[12px] font-bold text-white leading-tight truncate">
                    Udhaar &amp; Payments
                  </div>
                  <div className="text-[9.5px] sm:text-[10px] text-slate-300 leading-tight mt-0.5 truncate">
                    Payment reminders
                  </div>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 sm:p-3 border border-white/15 flex items-center gap-2 sm:gap-2.5 shadow-xs min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-indigo-500/25 text-indigo-300 flex items-center justify-center shrink-0 border border-indigo-500/30">
                  <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] sm:text-[12px] font-bold text-white leading-tight truncate">
                    Business Reports
                  </div>
                  <div className="text-[9.5px] sm:text-[10px] text-slate-300 leading-tight mt-0.5 truncate">
                    P&amp;L &amp; GST tax
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Dashboard Mockup Preview */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  App Overview
                </span>
                <span className="text-[10px] font-medium text-[#00E5A3] bg-[#00B887]/15 px-2 py-0.5 rounded-full border border-[#00B887]/25">
                  Live UI
                </span>
              </div>
              <MobileDashboardMockup />
            </div>
          </div>
        </section>

        {/* --- 2. MOBILE APP-STYLE LOGIN EXPERIENCE --- */}
        <section
          id="mobile-login-section"
          className="w-full bg-[#F6F9FC] py-8 px-5 border-t border-slate-200/80 scroll-mt-14"
        >
          <div className="w-full max-w-md mx-auto bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-sm">
            {/* Logo at Top of Card */}
            <div className="flex justify-center mb-3">
              <img
                src="/logo-horizontal.png"
                alt="Lenden"
                className="h-8 w-auto object-contain"
              />
            </div>

            <div className="text-center mb-5">
              <h2 className="text-lg font-black text-[#071F38] tracking-tight">
                Sign In to your account
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your credentials to access your business
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-start gap-2 animate-in fade-in">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <span className="leading-tight">{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Address or Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    ref={mobileEmailInputRef}
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@business.com or mobile"
                    autoComplete="username"
                    required
                    className="w-full pl-10 pr-3.5 h-12 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-[#00B887] focus:ring-2 focus:ring-[#00B887]/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-xs font-semibold text-[#008F91] hover:text-[#00B887] transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    className="w-full pl-10 pr-10 h-12 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-[#00B887] focus:ring-2 focus:ring-[#00B887]/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center">
                <input
                  id="mobile-remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-[#00B887] border-slate-300 rounded-md focus:ring-[#00B887]"
                />
                <label
                  htmlFor="mobile-remember-me"
                  className="ml-2 text-xs font-medium text-slate-600 cursor-pointer select-none"
                >
                  Remember my login on this device
                </label>
              </div>

              {/* Primary Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-[#00B887] to-[#009E74] hover:from-[#009E74] hover:to-[#008F91] active:scale-[0.99] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing In...</span>
                  </div>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="h-px bg-slate-200 flex-1" />
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                or
              </span>
              <div className="h-px bg-slate-200 flex-1" />
            </div>

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full h-11 rounded-xl border border-slate-200 hover:bg-slate-50 active:scale-[0.99] text-slate-700 font-semibold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {googleLoading ? (
                <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
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
              <span>{googleLoading ? 'Connecting to Google...' : 'Sign in with Google'}</span>
            </button>

            {/* Registration Links */}
            <div className="mt-5 pt-4 border-t border-slate-100 text-center space-y-2">
              <p className="text-xs text-slate-600">
                Don&apos;t have an account?{' '}
                <Link
                  href="/register"
                  className="font-bold text-[#00B887] hover:underline"
                >
                  Create an account
                </Link>
              </p>
              <p className="text-xs text-slate-500">
                Looking for 100% Free Khata?{' '}
                <Link
                  href="/register?plan=free_khata"
                  className="font-bold text-[#008F91] hover:underline"
                >
                  Start free
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* --- 3. MOBILE BUSINESS CATEGORIES --- */}
        <section className="w-full bg-white py-6 sm:py-7 px-4 sm:px-5 border-t border-slate-200/80">
          <div className="max-w-md mx-auto">
            {/* Header */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-px bg-slate-200 flex-1 max-w-[50px] sm:max-w-[60px]" />
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-[0.14em] sm:tracking-[0.16em] text-center truncate">
                BUILT FOR GROWING INDIAN BUSINESSES
              </span>
              <div className="h-px bg-slate-200 flex-1 max-w-[50px] sm:max-w-[60px]" />
            </div>

            {/* 2-Column Grid for Mobile */}
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
              {/* Card 1 */}
              <div className="bg-white rounded-xl p-2 sm:p-2.5 border border-slate-200/90 shadow-2xs flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#E6F8F3] text-[#00B887] flex items-center justify-center shrink-0">
                  <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <span className="text-[11.5px] sm:text-xs font-bold text-slate-800 leading-tight truncate">
                  Retail Stores
                </span>
              </div>

              {/* Card 2 */}
              <div className="bg-white rounded-xl p-2 sm:p-2.5 border border-slate-200/90 shadow-2xs flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#FFF4E5] text-[#F97316] flex items-center justify-center shrink-0">
                  <UtensilsCrossed className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <span className="text-[11.5px] sm:text-xs font-bold text-slate-800 leading-tight truncate">
                  Restaurants &amp; Cafes
                </span>
              </div>

              {/* Card 3 */}
              <div className="bg-white rounded-xl p-2 sm:p-2.5 border border-slate-200/90 shadow-2xs flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#E8F4FD] text-[#0284C7] flex items-center justify-center shrink-0">
                  <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <span className="text-[11.5px] sm:text-xs font-bold text-slate-800 leading-tight truncate">
                  Wholesalers
                </span>
              </div>

              {/* Card 4 */}
              <div className="bg-white rounded-xl p-2 sm:p-2.5 border border-slate-200/90 shadow-2xs flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center shrink-0">
                  <Factory className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <span className="text-[11.5px] sm:text-xs font-bold text-slate-800 leading-tight truncate">
                  Manufacturers
                </span>
              </div>

              {/* Card 5 */}
              <div className="bg-white rounded-xl p-2 sm:p-2.5 border border-slate-200/90 shadow-2xs flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#E6F8F3] text-[#008F91] flex items-center justify-center shrink-0">
                  <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <span className="text-[11.5px] sm:text-xs font-bold text-slate-800 leading-tight truncate">
                  Distributors
                </span>
              </div>

              {/* Card 6 */}
              <div className="bg-white rounded-xl p-2 sm:p-2.5 border border-slate-200/90 shadow-2xs flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#E8F4FD] text-[#2563EB] flex items-center justify-center shrink-0">
                  <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <span className="text-[11.5px] sm:text-xs font-bold text-slate-800 leading-tight truncate">
                  Service Businesses
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* --- 4. MOBILE FOOTER & POWERED BY AADVIK SOLUTIONS --- */}
        <footer className="w-full bg-[#F6F9FC] py-6 px-4 sm:px-5 border-t border-slate-200/70 text-center">
          <div className="max-w-md mx-auto flex flex-col items-center">
            {/* Nav Links */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-600 mb-4">
              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className="hover:text-[#00B887] transition-colors cursor-pointer"
              >
                Features
              </button>
              <Link href="/pricing" className="hover:text-[#00B887] transition-colors">
                Pricing
              </Link>
              <Link
                href="/register?plan=free_khata"
                className="hover:text-[#00B887] text-emerald-600 font-bold transition-colors"
              >
                Free Khata
              </Link>
              <button
                type="button"
                onClick={() => setShowAboutModal(true)}
                className="hover:text-[#00B887] transition-colors cursor-pointer"
              >
                About Us
              </button>
              <button
                type="button"
                onClick={() => setShowContactModal(true)}
                className="hover:text-[#00B887] transition-colors cursor-pointer"
              >
                Contact
              </button>
              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className="hover:text-[#00B887] transition-colors cursor-pointer"
              >
                Help
              </button>
            </div>

            {/* Attribution */}
            <span className="text-[11px] font-medium text-slate-400 tracking-wide">
              Powered by
            </span>
            <div className="flex items-center justify-center gap-3 my-1.5">
              <div className="h-px bg-slate-200 w-12" />
              <img
                src="/aadvik-horizontal.png"
                alt="Aadvik Solutions"
                className="h-6 w-auto object-contain transition-transform hover:scale-105"
              />
              <div className="h-px bg-slate-200 w-12" />
            </div>

            <p className="text-[10px] text-slate-400 mt-2">
              © {new Date().getFullYear()} Lenden. All rights reserved.
            </p>
          </div>
        </footer>
      </main>

      {/* =========================================================
          5. MODALS FOR FULL FUNCTIONALITY
          ========================================================= */}

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#00B887]" />
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
                <Info className="w-4 h-4 text-[#00B887]" />
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
                className="px-4 py-2 bg-[#00B887] text-white rounded-xl text-xs font-semibold hover:bg-[#009E74] transition-colors cursor-pointer"
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
                <Info className="w-4 h-4 text-[#00B887]" />
                <h3 className="font-bold text-base text-[#071F38]">About Lenden</h3>
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
                <strong>Lenden</strong> is India&apos;s modern commercial billing and credit-management platform built specifically for retail stores, wholesalers, manufacturers, and growing businesses.
              </p>
              <p>
                From professional GST invoicing to permanent Free Udhaar Khata, Lenden streamlines your entire business bookkeeping.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                Powered and maintained by <strong>Aadvik Solutions</strong>.
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
                <Phone className="w-4 h-4 text-[#00B887]" />
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
                  <Mail className="w-4 h-4 text-[#00B887]" />
                  <span>support@lenden.local / admin@lenden.local</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#00B887]" />
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
                <HelpCircle className="w-4 h-4 text-[#00B887]" />
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
