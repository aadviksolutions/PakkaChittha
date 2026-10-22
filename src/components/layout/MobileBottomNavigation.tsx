'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  MessageSquare,
  Menu,
  CreditCard,
  Receipt,
  Package,
  Truck,
  Building2,
} from 'lucide-react';
import { useEntitlements } from '@/hooks/useEntitlements';

interface MobileBottomNavigationProps {
  onOpenMobileMenu: () => void;
}

export function MobileBottomNavigation({ onOpenMobileMenu }: MobileBottomNavigationProps) {
  const pathname = usePathname();
  const { isFreeKhata, isStarter, isAllowed, isSuperAdmin } = useEntitlements();

  // Do not render bottom navigation on public/auth/print pages
  const isExcludedPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname.endsWith('/print') ||
    pathname.startsWith('/view/invoice/');

  if (isExcludedPage) {
    return null;
  }

  // 1. SUPER ADMIN NAVIGATION (Strictly Platform Admin controls only - No billing, No stock)
  if (isSuperAdmin) {
    const superAdminItems = [
      {
        label: 'Overview',
        href: '/platform-admin',
        icon: LayoutDashboard,
        isActive: pathname === '/platform-admin',
      },
      {
        label: 'Users',
        href: '/platform-admin/users',
        icon: Users,
        isActive: pathname.startsWith('/platform-admin/users'),
      },
      {
        label: 'Tenants',
        href: '/platform-admin/businesses',
        icon: Building2,
        isActive: pathname.startsWith('/platform-admin/businesses'),
      },
      {
        label: 'Plans',
        href: '/platform-admin/plans',
        icon: CreditCard,
        isActive: pathname.startsWith('/platform-admin/plans'),
      },
      {
        label: 'Menu',
        onClick: onOpenMobileMenu,
        icon: Menu,
        isActive:
          pathname.startsWith('/platform-admin/subscriptions') ||
          pathname.startsWith('/platform-admin/payments') ||
          pathname.startsWith('/platform-admin/reports') ||
          pathname.startsWith('/platform-admin/audit-logs') ||
          pathname.startsWith('/platform-admin/settings'),
      },
    ];

    return (
      <nav
        aria-label="Super Admin Mobile Bar"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(7,31,56,0.06)] px-2 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))]"
      >
        <div className="max-w-md mx-auto grid grid-cols-5 gap-1 items-center">
          {superAdminItems.map((item, idx) => {
            const Icon = item.icon;
            const activeClasses = item.isActive
              ? 'text-purple-700 font-bold'
              : 'text-slate-500 hover:text-slate-900 font-medium';

            if (item.onClick) {
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={item.onClick}
                  className={`flex flex-col items-center justify-center min-h-[44px] py-1 px-1 rounded-xl transition-all active:scale-95 cursor-pointer ${activeClasses}`}
                  aria-label={item.label}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                      item.isActive ? 'bg-purple-50 text-purple-700' : 'text-slate-500'
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-[10px] tracking-tight mt-0.5 truncate w-full text-center">
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={idx}
                href={item.href || '/platform-admin'}
                className={`flex flex-col items-center justify-center min-h-[44px] py-1 px-1 rounded-xl transition-all active:scale-95 ${activeClasses}`}
                aria-label={item.label}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                    item.isActive ? 'bg-purple-50 text-purple-700' : 'text-slate-500'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] tracking-tight mt-0.5 truncate w-full text-center">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  // 1. FREE KHATA NAVIGATION (100% Free Ledger Only)
  if (isFreeKhata) {
    const freeKhataItems = [
      {
        label: 'Home',
        href: '/free-khata',
        icon: LayoutDashboard,
        isActive: pathname === '/free-khata' && !pathname.includes('filter='),
      },
      {
        label: 'People',
        href: '/free-khata/contacts',
        icon: Users,
        isActive: pathname.startsWith('/free-khata/contacts') || pathname.startsWith('/free-khata/person'),
      },
      {
        label: 'Maine Diye',
        href: '/free-khata?filter=GAVE',
        icon: CreditCard,
        isActive: pathname === '/free-khata' && typeof window !== 'undefined' && window.location.search.includes('GAVE'),
      },
      {
        label: 'Maine Liye',
        href: '/free-khata?filter=RECEIVED',
        icon: Receipt,
        isActive: pathname === '/free-khata' && typeof window !== 'undefined' && window.location.search.includes('RECEIVED'),
      },
      {
        label: 'Reminders',
        href: '/free-khata?view=reminders',
        icon: MessageSquare,
        isActive: pathname === '/free-khata' && typeof window !== 'undefined' && window.location.search.includes('reminders'),
      },
    ];

    return (
      <nav
        aria-label="Free Khata Mobile Bar"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(7,31,56,0.06)] px-2 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))]"
      >
        <div className="max-w-md mx-auto grid grid-cols-5 gap-1 items-center">
          {freeKhataItems.map((item, idx) => {
            const Icon = item.icon;
            const activeClasses = item.isActive
              ? 'text-[#EA580C] font-bold'
              : 'text-slate-500 hover:text-slate-900 font-medium';

            return (
              <Link
                key={idx}
                href={item.href}
                className={`flex flex-col items-center justify-center min-h-[44px] py-1 px-1 rounded-xl transition-all active:scale-95 ${activeClasses}`}
                aria-label={item.label}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                    item.isActive ? 'bg-orange-50 text-[#EA580C]' : 'text-slate-500'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] tracking-tight mt-0.5 truncate w-full text-center">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  // 2. COMMERCIAL PLANS (STARTER, GROWTH, SCALE)
  const commercialItems = [
    {
      label: 'Home',
      href: '/',
      icon: LayoutDashboard,
      isActive: pathname === '/',
    },
    {
      label: 'Billing',
      href: '/invoices',
      icon: FileText,
      isActive: pathname.startsWith('/invoices'),
    },
    {
      label: 'Customers',
      href: '/customers',
      icon: Users,
      isActive: pathname.startsWith('/customers'),
    },
    isAllowed('canManagePurchases')
      ? {
          label: 'Purchases',
          href: '/purchases',
          icon: Truck,
          isActive: pathname.startsWith('/purchases'),
        }
      : {
          label: 'Stock',
          href: '/inventory',
          icon: Package,
          isActive: pathname.startsWith('/inventory'),
        },
    {
      label: 'More',
      onClick: onOpenMobileMenu,
      icon: Menu,
      isActive:
        pathname.startsWith('/settings') ||
        pathname.startsWith('/staff') ||
        pathname.startsWith('/reports') ||
        pathname.startsWith('/subscription'),
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(7,31,56,0.06)] px-2 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))]"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 gap-1 items-center">
        {commercialItems.map((item, idx) => {
          const Icon = item.icon;
          const activeClasses = item.isActive
            ? 'text-[#EA580C] font-bold'
            : 'text-slate-500 hover:text-slate-900 font-medium';

          if (item.onClick) {
            return (
              <button
                key={idx}
                type="button"
                onClick={item.onClick}
                className={`flex flex-col items-center justify-center min-h-[44px] py-1 px-1 rounded-xl transition-all active:scale-95 cursor-pointer ${activeClasses}`}
                aria-label={item.label}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                    item.isActive ? 'bg-orange-50 text-[#EA580C]' : 'text-slate-500'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] tracking-tight mt-0.5 truncate w-full text-center">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={idx}
              href={item.href || '/'}
              className={`flex flex-col items-center justify-center min-h-[44px] py-1 px-1 rounded-xl transition-all active:scale-95 ${activeClasses}`}
              aria-label={item.label}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                  item.isActive ? 'bg-orange-50 text-[#EA580C]' : 'text-slate-500'
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 truncate w-full text-center">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
