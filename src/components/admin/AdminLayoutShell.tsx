'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Building2,
  BookOpen,
  CreditCard,
  Receipt,
  BarChart3,
  Layers,
  ShieldCheck,
  Settings,
  LogOut,
  ArrowLeft,
  Menu,
  X,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';

interface AdminLayoutShellProps {
  children: React.ReactNode;
  user: {
    id: string;
    name: string;
    email: string;
    platformRole: string;
  };
}

const NAV_ITEMS = [
  { href: '/platform-admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/platform-admin/users', label: 'Users', icon: Users },
  { href: '/platform-admin/businesses', label: 'Businesses', icon: Building2 },
  { href: '/platform-admin/free-khata', label: 'Free Khata', icon: BookOpen },
  { href: '/platform-admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/platform-admin/payments', label: 'Payments', icon: Receipt },
  { href: '/platform-admin/reports', label: 'Revenue & Reports', icon: BarChart3 },
  { href: '/platform-admin/plans', label: 'Plans & Features', icon: Layers },
  { href: '/platform-admin/audit-logs', label: 'Audit Logs', icon: ShieldCheck },
  { href: '/platform-admin/settings', label: 'Platform Settings', icon: Settings },
];

export function AdminLayoutShell({ children, user }: AdminLayoutShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F9FC] text-slate-800 flex flex-col md:flex-row font-sans">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-[#071F38] text-white p-4 flex items-center justify-between border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#008F91] to-[#00B887] flex items-center justify-center font-black text-white text-base shadow-sm">
            P
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-white block">PAKKA CHITTHA</span>
            <span className="text-[10px] font-bold text-[#F58220] uppercase tracking-wider block">Control Center</span>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          aria-label="Toggle Navigation"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#071F38] border-r border-slate-800 shrink-0 sticky top-0 h-screen text-slate-300 select-none">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#071F38] to-[#F58220] flex items-center justify-center font-black text-white text-lg shadow-md border border-[#F58220]/30">
              P
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white">PAKKA CHITTHA</span>
                <span className="text-[9px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-[#F58220] border border-[#F58220]/30">
                  ROOT
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                Platform Control Center
              </span>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Platform Management
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/platform-admin'
                ? pathname === '/platform-admin'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-[#00B887] to-[#008F91] text-white shadow-md shadow-[#008F91]/20 font-bold'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Bottom Actions & User Info */}
        <div className="p-3 border-t border-slate-800/80 space-y-2 bg-[#05182d]">
          {/* Quick link to standard tenant app */}
          <Link
            href="/"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800/60 hover:bg-slate-800 hover:text-white transition-all border border-slate-700/50"
          >
            <div className="flex items-center gap-2">
              <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
              <span>Back to Store App</span>
            </div>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>

          {/* Admin User Card */}
          <div className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate block">{user.name}</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                  ADMIN
                </span>
              </div>
              <span className="text-[10px] text-slate-400 truncate block">{user.email}</span>
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              title="Secure Admin Logout"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex">
          <div className="w-72 bg-[#071F38] h-full flex flex-col p-4 text-slate-300">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#071F38] to-[#F58220] flex items-center justify-center font-black text-white text-base">
                  P
                </div>
                <div>
                  <span className="font-extrabold text-sm text-white block">PAKKA CHITTHA</span>
                  <span className="text-[10px] text-[#F58220] font-bold block uppercase">Control Center</span>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === '/platform-admin'
                    ? pathname === '/platform-admin'
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                      isActive
                        ? 'bg-gradient-to-r from-[#00B887] to-[#008F91] text-white font-bold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-2">
              <Link
                href="/"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Store Workspace</span>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-300 bg-red-950/40 border border-red-900/50"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out Admin Session</span>
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto min-h-screen">
        {/* Top Operational Bar */}
        <div className="bg-white border-b border-slate-200/80 px-6 py-3 flex items-center justify-between text-xs sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-700">Platform Status: Active & Operational</span>
            <span className="hidden sm:inline text-slate-400">|</span>
            <span className="hidden sm:inline text-slate-500 font-mono text-[11px]">PostgreSQL (Neon)</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[11px] font-bold">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
              <span>SUPER ADMIN AUTHENTICATED</span>
            </div>
          </div>
        </div>

        {/* Page Inner Container */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
