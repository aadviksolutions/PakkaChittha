'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  Search,
  Bell,
  Calendar,
  PlusCircle,
  Shield,
  Building,
  LogOut,
  ChevronDown,
  User,
  PanelLeft,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  onOpenQuickActionModal: (actionType: string) => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
}

export function Header({
  onOpenMobileSidebar,
  onOpenQuickActionModal,
  isSidebarCollapsed,
  onToggleSidebarCollapse,
}: HeaderProps) {
  const pathname = usePathname();
  const isPlatformAdmin = pathname.startsWith('/platform-admin');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('Today');

  const { user, activeBusiness, logout } = useAuth();

  const getMonogram = () => {
    if (!user?.name) return 'U';
    const parts = user.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const isSuperAdmin = user?.platformRole === 'SUPER_ADMIN';

  // Compute readable page title for top context
  const getPageTitle = () => {
    if (pathname === '/') return 'Dashboard';
    if (pathname.startsWith('/free-khata/person')) return 'Person Ledger';
    if (pathname.startsWith('/free-khata')) return 'Free Udhaar Khata';
    if (pathname.startsWith('/invoices/new')) return 'New Tax Invoice';
    if (pathname.startsWith('/invoices')) return 'Invoices';
    if (pathname.startsWith('/customers')) return 'Customers & Udhaar';
    if (pathname.startsWith('/inventory')) return 'Products & Stock';
    if (pathname.startsWith('/purchases')) return 'Purchases & Vendors';
    if (pathname.startsWith('/expenses')) return 'Expenses';
    if (pathname.startsWith('/reports')) return 'Reports & Taxes';
    if (pathname.startsWith('/whatsapp')) return 'WhatsApp Automation';
    if (pathname.startsWith('/settings')) return 'Settings';
    if (pathname.startsWith('/staff')) return 'Staff & RBAC';
    if (pathname.startsWith('/subscription')) return 'Subscription';
    if (pathname.startsWith('/platform-admin')) return 'Platform Administration';
    return 'Pakka Chittha';
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle & Business Name with Logo */}
      <div className="flex items-center gap-3 flex-1 max-w-xl min-w-0">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Business Branding with Pakka Chittha Logo */}
        <div className="flex items-center gap-2 min-w-0 shrink">
          <div className="h-8 w-auto rounded-lg overflow-hidden bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center p-0.5 shrink-0">
            <img src="/pakka-chittha-logo.png" alt="Pakka Chittha" className="h-full w-auto object-contain" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs sm:text-sm text-[#071F38] truncate block leading-tight max-w-[100px] xs:max-w-[150px] sm:max-w-[200px]">
                {activeBusiness?.name || 'Pakka Chittha'}
              </span>
              <span className="hidden xs:inline-block text-[9px] font-bold uppercase tracking-wider bg-orange-50 text-[#EA580C] px-1.5 py-0.2 rounded border border-orange-200 shrink-0">
                Active
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate hidden sm:block">
              {activeBusiness?.gstin ? `GSTIN: ${activeBusiness.gstin}` : 'Smart Financial Billing'}
            </p>
          </div>
        </div>

        {/* Desktop Sidebar Toggle Icon */}
        {onToggleSidebarCollapse && (
          <button
            type="button"
            onClick={onToggleSidebarCollapse}
            className="hidden lg:flex p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0 ml-1"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}

        {/* Search: Full Bar on sm+, Compact Icon on mobile */}
        <div className="hidden sm:block relative flex-1 min-w-[120px] max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search bills, customers... (⌘K)"
            className="w-full pl-8 pr-10 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#071F38] focus:border-[#071F38] transition-all cursor-pointer"
            readOnly
            onClick={() => onOpenQuickActionModal('search')}
          />
          <div className="hidden md:flex absolute right-2.5 top-1/2 -translate-y-1/2 items-center text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-1 py-0.2 rounded">
            <span>⌘K</span>
          </div>
        </div>
      </div>

      {/* Right: Actions, Notifications, User */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Mobile Search Button */}
        <button
          type="button"
          onClick={() => onOpenQuickActionModal('search')}
          className="sm:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          aria-label="Search bills and customers"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Date Filter selector */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="Today">Today</option>
            <option value="Week">This Week</option>
            <option value="Month">This Month</option>
            <option value="Quarter">This Quarter</option>
          </select>
        </div>

        {/* Quick Create Invoice Primary Action */}
        <Link
          href="/invoices/new"
          className="flex items-center gap-1 bg-[#EA580C] hover:bg-[#D94E00] text-white text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg shadow-2xs hover:shadow-xs transition-all cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5 text-white" />
          <span className="hidden xs:inline">New Bill</span>
          <span className="xs:hidden">Bill</span>
        </Link>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors relative cursor-pointer"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#EA580C] ring-2 ring-white" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-lg border border-slate-200 p-3 text-xs z-50 animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                <span className="font-semibold text-slate-900">Notifications</span>
                <span className="text-[10px] text-[#EA580C] bg-orange-50 px-1.5 py-0.5 rounded font-bold">
                  2 Pending
                </span>
              </div>
              <div className="space-y-2">
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="font-semibold text-slate-800 text-[11px]">
                    Udhaar Payment Due
                  </p>
                  <p className="text-slate-500 text-[10px] mt-0.5">
                    Metro Electricals has ₹38,200 overdue since 3 days.
                  </p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="font-semibold text-slate-800 text-[11px]">
                    GST Return Filing Notice
                  </p>
                  <p className="text-slate-500 text-[10px] mt-0.5">
                    GSTR-1 return filing window closes on the 11th of this month.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Account Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-lg hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all cursor-pointer"
            aria-label="User account menu"
          >
            <div className="w-7.5 h-7.5 rounded-lg bg-[#071F38] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              {getMonogram()}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-slate-900 leading-tight truncate max-w-[100px]">
                {user?.name || 'Account'}
              </p>
              <p className="text-[10px] text-slate-500 leading-tight">
                {isSuperAdmin ? 'Super Admin' : activeBusiness?.role || 'Staff'}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 p-2 text-xs z-50 animate-in fade-in slide-in-from-top-1">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <p className="font-semibold text-slate-900 truncate">{user?.name || 'User'}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Building className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] font-medium text-slate-700 truncate">
                    {activeBusiness?.name || 'Workspace'}
                  </span>
                </div>
              </div>

              <div className="space-y-0.5">
                <Link
                  href="/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Business Settings</span>
                </Link>

                {isSuperAdmin && (
                  <Link
                    href="/platform-admin"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-3 py-1.5 text-purple-700 hover:text-purple-900 hover:bg-purple-50 rounded-lg transition-colors font-medium"
                  >
                    <Shield className="w-3.5 h-3.5 text-purple-600" />
                    <span>Platform Admin</span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors text-left font-medium"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
