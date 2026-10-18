'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  NAVIGATION_GROUPS,
  FREE_KHATA_NAVIGATION_ITEMS,
  BUSINESS_NAVIGATION_ITEMS,
  NavigationItem,
} from '@/data/navigation';
import { BusinessProfileArea } from './BusinessProfileArea';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  Truck,
  Receipt,
  BarChart3,
  MessageSquare,
  ShieldCheck,
  Crown,
  Settings,
  LayoutGrid,
  Building2,
  SlidersHorizontal,
  ShieldAlert,
  CreditCard,
  BookOpen,
  Store,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  Truck,
  Receipt,
  BarChart3,
  MessageSquare,
  ShieldCheck,
  Crown,
  Settings,
  LayoutGrid,
  Building2,
  SlidersHorizontal,
  ShieldAlert,
  CreditCard,
  BookOpen,
  Store,
};

import { useEntitlements } from '@/hooks/useEntitlements';

export function Sidebar({
  mobileOpen,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const { activeBusiness } = useAuth();
  const {
    isFreeKhata,
    isAllowed,
    planName,
    isSuperAdmin,
    isTrial,
    isExpired,
    displayText,
    trialDaysRemaining,
  } = useEntitlements();

  // Filter business items dynamically based on plan entitlements
  const filteredBusinessItems = BUSINESS_NAVIGATION_ITEMS.filter((item: NavigationItem) => {
    // Hide Free Udhaar Khata promotional link for customers on paid/commercial subscriptions
    if (item.id === 'free-khata-link') {
      return isFreeKhata;
    }
    if (item.id === 'purchases') return isAllowed('canManagePurchases');
    if (item.id === 'suppliers') return isAllowed('canManageSuppliers');
    if (item.id === 'reports') return isAllowed('canAdvancedReports');
    if (item.id === 'staff') return isAllowed('canManageStaff');
    return true;
  });

  // Construct visible navigation groups based on plan and role
  const visibleGroups = isFreeKhata
    ? [
        {
          id: 'free_khata_group',
          title: 'Free Udhaar Khata',
          scope: 'BUSINESS_WORKSPACE' as const,
          description: 'Personal ledger and WhatsApp reminders',
          badge: '100% Free',
          items: FREE_KHATA_NAVIGATION_ITEMS,
        },
        ...(isSuperAdmin
          ? NAVIGATION_GROUPS.filter((g) => g.scope === 'PLATFORM_ADMIN')
          : []),
      ]
    : [
        {
          id: 'business_workspace',
          title: 'Business Workspace',
          scope: 'BUSINESS_WORKSPACE' as const,
          description: 'Client workspace operations',
          badge: planName,
          items: filteredBusinessItems,
        },
        ...(isSuperAdmin
          ? NAVIGATION_GROUPS.filter((g) => g.scope === 'PLATFORM_ADMIN')
          : []),
      ];

  const planStatus = activeBusiness?.subscription?.status || (isSuperAdmin ? 'ACTIVE' : 'TRIAL');

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-white border-r border-slate-200/90 flex flex-col transition-all duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-64 w-72'}`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200/80 bg-white shrink-0">
          <Link
            href="/"
            onClick={onCloseMobile}
            className="flex items-center gap-2.5 min-w-0 group"
          >
            {/* Lenden Official Logo Mark */}
            <div className="w-8.5 h-8.5 rounded-lg overflow-hidden bg-white flex items-center justify-center shadow-xs border border-slate-200/90 shrink-0 p-0.5">
              <img
                src="/logo.png"
                alt="Lenden"
                className="w-full h-full object-contain"
              />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm text-[#071F38] tracking-tight">
                    Lenden
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-[#00B887] px-1.5 py-0.2 rounded border border-emerald-200">
                    SaaS
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium truncate">
                  Billing • Inventory • Udhaar
                </p>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <div className="flex items-center gap-1">
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden lg:flex p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Close button for Mobile */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Business Profile Switcher */}
        <BusinessProfileArea collapsed={isCollapsed} />

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
          {visibleGroups.map((group) => {
            const isPlatformAdminGroup = group.scope === 'PLATFORM_ADMIN';

            return (
              <div key={group.id} className="space-y-1">
                {/* Section Header */}
                {!isCollapsed ? (
                  <div className="px-2.5 pt-1 pb-1 flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isPlatformAdminGroup ? 'text-purple-700' : 'text-slate-400'
                      }`}
                    >
                      {group.title}
                    </span>
                    {group.badge && (
                      <span
                        className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${
                          isPlatformAdminGroup
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {group.badge}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="h-px bg-slate-100 my-2 mx-1" />
                )}

                {/* Group Nav Items */}
                <div className="space-y-0.5">
                  {group.items.map((item: NavigationItem) => {
                    const Icon = ICON_MAP[item.iconName] || LayoutDashboard;
                    const isActive =
                      item.href === '/'
                        ? pathname === '/'
                        : item.href === '/platform-admin'
                        ? pathname === '/platform-admin'
                        : pathname.startsWith(item.href);

                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={onCloseMobile}
                        title={isCollapsed ? item.name : undefined}
                        className={`group flex items-center ${
                          isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
                        } rounded-lg text-xs font-medium transition-all ${
                          isActive
                            ? isPlatformAdminGroup
                              ? 'bg-purple-900 text-white shadow-xs font-semibold'
                              : 'bg-[#071F38] text-white shadow-xs font-semibold border-l-3 border-[#00B887]'
                            : isPlatformAdminGroup
                            ? 'text-slate-700 hover:text-purple-900 hover:bg-purple-50/70'
                            : 'text-slate-600 hover:text-[#071F38] hover:bg-slate-100/80'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-colors ${
                              isActive
                                ? isPlatformAdminGroup
                                  ? 'text-purple-300'
                                  : 'text-[#00B887]'
                                : isPlatformAdminGroup
                                ? 'text-purple-600 group-hover:text-purple-800'
                                : 'text-slate-400 group-hover:text-[#071F38]'
                            }`}
                          />
                          {!isCollapsed && <span className="truncate">{item.name}</span>}
                        </div>

                        {!isCollapsed && item.badge && (
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.2 rounded transition-colors ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : item.badgeColor === 'violet'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : item.badgeColor === 'blue'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : item.badgeColor === 'amber'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : item.badgeColor === 'emerald'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Subscription Plan Card Footer */}
        {!isCollapsed && (
          <div className="p-3 border-t border-slate-200/80 bg-slate-50/60 shrink-0">
            <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                  {planName}
                </span>
                <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border uppercase ${
                  isExpired
                    ? 'text-rose-700 bg-rose-50 border-rose-200'
                    : isTrial
                    ? 'text-blue-700 bg-blue-50 border-blue-200'
                    : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                }`}>
                  {isExpired ? 'EXPIRED' : planStatus}
                </span>
              </div>
              <p className="text-[10px] text-slate-600 font-medium leading-tight mb-2">
                {isSuperAdmin ? 'Super Admin Privileges' : displayText}
              </p>
              <Link
                href={isSuperAdmin ? '/platform-admin/plans' : '/subscription'}
                onClick={onCloseMobile}
                className="text-[10px] font-semibold text-slate-800 hover:text-emerald-700 flex items-center gap-1 transition-colors"
              >
                {isSuperAdmin ? 'View Platform Plans' : isExpired ? 'Upgrade Subscription' : 'Subscription Details'}
                <ArrowRight className="w-3 h-3" />
              </Link>

              <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[9px] text-slate-400">
                <span>By Aadvik Solutions</span>
                <span className="font-mono text-[8px] text-slate-300">v1.0</span>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
