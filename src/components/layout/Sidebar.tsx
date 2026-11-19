
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  NAVIGATION_GROUPS,
  FREE_KHATA_NAVIGATION_ITEMS,
  BUSINESS_NAVIGATION_ITEMS,
  HOUSEHOLD_NAVIGATION_ITEMS,
  ACCOUNTANT_NAVIGATION_ITEMS,
  NavigationItem,
} from '@/data/navigation';
import { BusinessProfileArea } from './BusinessProfileArea';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/i18n/context';
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
  Home,
  Landmark,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Briefcase,
  CheckSquare,
  Calculator,
  FileSpreadsheet,
  Scale,
  FolderLock,
  GitBranch,
  ClipboardList,
  Wallet,
  Percent,
  Sparkles,
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
  Home,
  Landmark,
  Briefcase,
  CheckSquare,
  Calculator,
  FileSpreadsheet,
  Scale,
  FolderLock,
  GitBranch,
  ClipboardList,
  Wallet,
  Percent,
  Sparkles,
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
  const { t } = useTranslation();
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

  const getTranslatedNavName = (item: NavigationItem): string => {
    switch (item.id) {
      case 'dashboard': return t('nav.overview');
      case 'invoices': return t('nav.invoices');
      case 'quotations': return t('nav.quotations');
      case 'customers': return t('nav.customers');
      case 'customer-ledger': return t('nav.customerLedger');
      case 'payments': return t('nav.payments');
      case 'inventory': return t('nav.inventory');
      case 'purchases': return t('nav.purchases');
      case 'suppliers': return t('nav.suppliers');
      case 'expenses': return t('nav.expenses');
      case 'reports': return t('nav.reports');
      case 'whatsapp': return t('nav.whatsapp');
      case 'staff': return t('nav.staff');
      case 'subscription': return t('nav.subscription');
      case 'settings': return t('nav.settings');
      case 'ghar-kharcha-overview':
      case 'ghar-kharcha': return t('nav.gharKharcha');
      case 'free-khata':
      case 'free-khata-link': return t('nav.freeKhata');
      case 'platform-overview': return t('nav.platformOverview');
      case 'businesses': return t('nav.businesses');
      case 'plans': return t('nav.plans');
      case 'platform-settings': return t('nav.platformSettings');
      case 'accountant-workspace': return t('accountant.workspaceTitle');
      case 'acc-dashboard': return t('accountant.dashboard');
      case 'acc-businesses': return t('accountant.businesses');
      case 'acc-daybook': return t('accountant.dayBook');
      case 'acc-ledgers': return t('accountant.ledgers');
      case 'acc-vouchers': return t('accountant.vouchers');
      case 'acc-journal': return t('accountant.journalRegister');
      case 'acc-sales-reg': return t('accountant.salesRegister');
      case 'acc-purchase-reg': return t('accountant.purchaseRegister');
      case 'acc-gstr1': return t('accountant.gstr1');
      case 'acc-gstr2b': return t('accountant.gstr2b');
      case 'acc-gstr3b': return t('accountant.gstr3b');
      case 'acc-einvoice': return t('accountant.einvoiceEway');
      case 'acc-tds-tcs': return t('accountant.tdsTcs');
      case 'acc-rec-pay': return t('accountant.receivablesPayables');
      case 'acc-bank-rec': return t('accountant.bankReconciliation');
      case 'acc-trial-bal': return t('accountant.trialBalance');
      case 'acc-pnl': return t('accountant.profitLoss');
      case 'acc-bs': return t('accountant.balanceSheet');
      case 'acc-cashflow': return t('accountant.cashFlow');
      case 'acc-inv-val': return t('accountant.inventoryValuation');
      case 'acc-fin-rep': return t('accountant.financialReports');
      case 'acc-ca-pack': return t('accountant.caAuditPack');
      case 'acc-branches': return t('accountant.branches');
      case 'acc-approvals': return t('accountant.approvals');
      case 'acc-audit': return t('accountant.auditTrail');
      case 'acc-settings': return t('accountant.settings');
      case 'acc-staff': return t('nav.staff');
      default: return item.name;
    }
  };

  const erpRole =
    activeBusiness?.erpRole ||
    (activeBusiness?.role === 'ACCOUNTANT' ? 'ACCOUNTANT' : 'OWNER');
  const canAccountantErp = isAllowed('canAccountantErp');

  const filteredAccountantItems = ACCOUNTANT_NAVIGATION_ITEMS.filter((item: NavigationItem) => {
    if (item.id === 'acc-staff') {
      return isAllowed('canManageStaff') && (erpRole === 'OWNER' || erpRole === 'MANAGER');
    }
    return true;
  });

  // Filter business items dynamically based on plan entitlements and role governance
  const filteredBusinessItems = BUSINESS_NAVIGATION_ITEMS.filter((item: NavigationItem) => {
    // Hide Free Udhaar Khata promotional link for customers on paid/commercial subscriptions
    if (item.id === 'free-khata-link') {
      return isFreeKhata;
    }
    if (item.id === 'purchases') return isAllowed('canManagePurchases');
    if (item.id === 'suppliers') return isAllowed('canManageSuppliers');
    if (item.id === 'staff') {
      return isAllowed('canManageStaff') && erpRole !== 'ACCOUNTANT' && erpRole !== 'VIEWER';
    }
    if (item.id === 'subscription') {
      // Accountant and read-only viewers must never manage subscription or Razorpay billing
      return erpRole === 'OWNER' || isSuperAdmin;
    }
    if (item.id === 'accountant-workspace') {
      return (
        canAccountantErp &&
        (erpRole === 'OWNER' || erpRole === 'ACCOUNTANT' || erpRole === 'MANAGER')
      );
    }
    return true;
  });

  // Construct visible navigation groups based on current path, plan and role
  const isGharKharcha = pathname.startsWith('/ghar-kharcha');
  const isFreeKhataMode = pathname.startsWith('/free-khata') || isFreeKhata;
  const isAccountantWorkspace = pathname.startsWith('/accountant') && canAccountantErp;

  const filteredHouseholdItems = HOUSEHOLD_NAVIGATION_ITEMS.filter((item: NavigationItem) => {
    if (item.id === 'business-workspace-switch') {
      return !isFreeKhata && Boolean(activeBusiness);
    }
    return true;
  });

  const filteredFreeKhataItems = FREE_KHATA_NAVIGATION_ITEMS.filter((item: NavigationItem) => {
    if (item.id === 'business-workspace-switch') {
      return !isFreeKhata && Boolean(activeBusiness);
    }
    return true;
  });

  let visibleGroups;
  if (isSuperAdmin) {
    // Strictly show only Super Admin platform options (no billing, no stock, no store items)
    visibleGroups = NAVIGATION_GROUPS.filter((g) => g.scope === 'PLATFORM_ADMIN');
  } else if (isGharKharcha) {
    visibleGroups = [
      {
        id: 'household_group',
        title: 'PakkaChittha Ghar Kharcha',
        scope: 'BUSINESS_WORKSPACE' as const,
        description: 'Household budget and expense tracking',
        badge: '100% Free',
        items: filteredHouseholdItems,
      },
    ];
  } else if (isFreeKhataMode) {
    visibleGroups = [
      {
        id: 'free_khata_group',
        title: 'Personal Khata',
        scope: 'BUSINESS_WORKSPACE' as const,
        description: 'Personal ledger and WhatsApp reminders',
        badge: '100% Free',
        items: filteredFreeKhataItems,
      },
    ];
  } else if (isAccountantWorkspace) {
    visibleGroups = [
      {
        id: 'accountant_erp_workspace',
        title: t('accountant.workspaceTitle'),
        scope: 'BUSINESS_WORKSPACE' as const,
        description: 'Professional Indian Accounting & GST ERP',
        badge: 'SCALE ERP',
        items: filteredAccountantItems,
      },
    ];
  } else {
    visibleGroups = [
      {
        id: 'business_workspace',
        title: 'Business Workspace',
        scope: 'BUSINESS_WORKSPACE' as const,
        description: 'Client workspace operations',
        badge: planName,
        items: filteredBusinessItems,
      },
    ];
  }

  const planStatus = activeBusiness?.subscription?.status || (isSuperAdmin ? 'ACTIVE' : 'TRIAL');

  return (
    <>
      {/* Mobile Backdrop - clicking outside closes the side menu without blurring screen */}
      {mobileOpen && (
        <div
          data-drawer-backdrop="true"
          className="fixed inset-0 z-[55] bg-slate-900/50 lg:hidden transition-opacity cursor-pointer"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container (strictly above mobile backdrop z-[55] and bottom nav z-40) */}
      <aside
        className={`print:hidden fixed top-0 bottom-0 left-0 z-[60] bg-[#071D35] border-r border-[#102A43] text-white flex flex-col transition-all duration-200 ease-in-out lg:translate-x-0 ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
          } ${isCollapsed ? 'lg:w-20' : 'lg:w-64 w-[85vw] max-w-[300px]'}`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#102A43] bg-[#071D35] shrink-0">
          <Link
            href={isSuperAdmin ? '/platform-admin' : '/'}
            onClick={onCloseMobile}
            className="flex items-center gap-2.5 min-w-0 group"
          >
            {/* Pakka Chittha Official Logo */}
            <div className="h-9 w-auto rounded-lg overflow-hidden bg-white p-0.5 flex items-center justify-center shrink-0 shadow-xs">
              <img
                src="/pakka-chittha-logo.png"
                alt="Pakka Chittha"
                className="h-8 w-auto object-contain"
              />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm text-white tracking-tight">
                    Pakka Chittha
                  </span>
                </div>
                <p className="text-[9.5px] text-slate-400 font-medium truncate">
                  {isSuperAdmin ? 'Platform Control Center' : t('common.tagline')}
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
                className="hidden lg:flex p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
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
              className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Business Profile Switcher */}
        <BusinessProfileArea collapsed={isCollapsed} />

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 overscroll-contain">
          {isAccountantWorkspace && !isCollapsed && (
            <Link
              href="/"
              onClick={onCloseMobile}
              className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-[11px] font-semibold transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <ChevronLeft className="w-3.5 h-3.5" />
                {t('accountant.backToBilling')}
              </span>
              <Store className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          )}
          {visibleGroups.map((group) => {
            const isPlatformAdminGroup = group.scope === 'PLATFORM_ADMIN';

            return (
              <div key={group.id} className="space-y-1">
                {/* Section Header */}
                {!isCollapsed ? (
                  <div className="px-2.5 pt-1 pb-1 flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${isPlatformAdminGroup ? 'text-purple-400' : 'text-slate-400'
                        }`}
                    >
                      {group.title}
                    </span>
                    {group.badge && (
                      <span
                        className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${isPlatformAdminGroup
                            ? 'bg-purple-900/60 text-purple-300 border-purple-700/50'
                            : 'bg-white/10 text-slate-300 border-white/10'
                          }`}
                      >
                        {group.badge}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="h-px bg-white/10 my-2 mx-1" />
                )}

                {/* Group Nav Items */}
                <div className="space-y-0.5">
                  {group.items.map((item: NavigationItem) => {
                    const Icon = ICON_MAP[item.iconName] || LayoutDashboard;
                    const itemPath = item.href.split('?')[0];
                    const isActive =
                      itemPath === '/'
                        ? pathname === '/'
                        : itemPath === '/platform-admin'
                          ? pathname === '/platform-admin'
                          : itemPath === '/accountant'
                            ? pathname === '/accountant'
                            : item.id === 'acc-branches'
                              ? false
                              : pathname === itemPath || pathname.startsWith(itemPath + '/');

                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={onCloseMobile}
                        title={isCollapsed ? item.name : undefined}
                        className={`group flex items-center ${isCollapsed ? 'justify-center p-2.5 min-h-[44px]' : 'justify-between px-3 py-2.5 min-h-[44px]'
                          } rounded-xl text-xs font-medium transition-all ${isActive
                            ? 'bg-[#1761A0] text-white shadow-xs font-bold'
                            : 'text-slate-300 hover:text-white hover:bg-white/10'
                          }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-colors ${isActive
                                ? 'text-white'
                                : 'text-slate-400 group-hover:text-white'
                              }`}
                          />
                          {!isCollapsed && <span className="truncate">{getTranslatedNavName(item)}</span>}
                        </div>

                        {!isCollapsed && item.badge && (
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.2 rounded transition-colors ${isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-white/10 text-slate-300 border border-white/10'
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
          <div className="p-3 border-t border-[#102A43] bg-[#071D35] shrink-0">
            <div className="p-2.5 rounded-xl bg-[#102A43] border border-[#1761A0]/40 shadow-xs">
              {isFreeKhataMode ? (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                      Personal Khata
                    </span>
                    <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded border uppercase text-emerald-300 bg-emerald-900/60 border-emerald-700">
                      100% FREE
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 font-medium leading-tight mb-2">
                    हर पैसे का हिसाब, बिल्कुल आसान। Lifetime free ledger.
                  </p>
                  <Link
                    href="/free-khata/reports"
                    onClick={onCloseMobile}
                    className="text-[10px] font-semibold text-emerald-300 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    Reports &amp; PDF/Excel
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </>
              ) : isGharKharcha ? (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                      <Home className="w-3.5 h-3.5 text-emerald-400" />
                      Ghar Kharcha
                    </span>
                    <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded border uppercase text-emerald-300 bg-emerald-900/60 border-emerald-700">
                      100% FREE
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 font-medium leading-tight mb-2">
                    Household budget, expenses and member splits.
                  </p>
                  <Link
                    href="/ghar-kharcha/reports"
                    onClick={onCloseMobile}
                    className="text-[10px] font-semibold text-emerald-300 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    View Household Reports
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                      {isSuperAdmin ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                      ) : (
                        <Crown className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      {isSuperAdmin ? 'Super Admin' : planName}
                    </span>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border uppercase ${isSuperAdmin
                        ? 'text-purple-300 bg-purple-900/60 border-purple-700'
                        : isExpired
                          ? 'text-rose-300 bg-rose-900/60 border-rose-700'
                          : isTrial
                            ? 'text-blue-300 bg-blue-900/60 border-blue-700'
                            : 'text-emerald-300 bg-emerald-900/60 border-emerald-700'
                      }`}>
                      {isSuperAdmin ? 'ROOT ACCESS' : isExpired ? 'EXPIRED' : planStatus}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 font-medium leading-tight mb-2">
                    {isSuperAdmin ? 'Platform Management & System Controls' : displayText}
                  </p>
                  {isSuperAdmin ? (
                    <Link
                      href="/platform-admin"
                      onClick={onCloseMobile}
                      className="text-[10px] font-semibold text-blue-300 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      Open Control Center
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  ) : erpRole === 'ACCOUNTANT' ? (
                    <Link
                      href="/accountant/businesses"
                      onClick={onCloseMobile}
                      className="text-[10px] font-semibold text-blue-300 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      Owner-Managed Plan · Switch Client
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  ) : (
                    <Link
                      href="/subscription"
                      onClick={onCloseMobile}
                      className="text-[10px] font-semibold text-blue-300 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      {isExpired ? 'Upgrade Subscription' : 'Subscription Details'}
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </>
              )}

              <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[9px] text-slate-400">
                <span title="Powered by Lakshya Studios • Co-Powered by Lionoar Digital • Developed by Aadvik Solutions">
                  Powered by Lakshya • Co-Powered by Lionoar • Dev by Aadvik
                </span>
                <span className="font-mono text-[8px] text-slate-400">v1.0</span>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
