'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { TrialCountdownBanner } from '../subscription/TrialCountdownBanner';
import { TrialExpiredLockScreen } from '../subscription/TrialExpiredLockScreen';
import { ActionModalProvider, useActionModal } from '@/context/ActionModalContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';

import { MobileBottomNavigation } from './MobileBottomNavigation';
import { CinematicIntro } from '../welcome/CinematicIntro';

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const { openAction } = useActionModal();
  const { activeBusiness, user } = useAuth();

  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname.endsWith('/print') ||
    pathname.startsWith('/view/invoice/');

  if (isAuthPage) {
    return (
      <>
        <CinematicIntro />
        <main className="min-h-screen bg-slate-50 text-slate-900">{children}</main>
      </>
    );
  }

  // Account lock calculation: when trial has expired and user has no active paid subscription
  const sub = activeBusiness?.subscription;
  const isSuperAdmin = user?.platformRole === 'SUPER_ADMIN';
  const isFreeKhata = sub?.plan === 'FREE_KHATA';
  const isTrial = Boolean(sub?.isTrial || sub?.status === 'TRIALING' || sub?.plan === 'FREE_TRIAL');
  const isExpired = Boolean(sub?.isExpired || sub?.status === 'EXPIRED' || sub?.status === 'SUSPENDED');
  const isLocked = !isSuperAdmin && !isFreeKhata && isTrial && isExpired && pathname !== '/subscription';

  return (
    <div className="min-h-screen bg-[#F6F9FC] flex flex-col font-sans text-slate-900 selection:bg-slate-200">
      <CinematicIntro />
      {/* Sidebar Navigation */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        isCollapsed={desktopCollapsed}
        onToggleCollapse={() => setDesktopCollapsed((prev) => !prev)}
      />

      {/* Main Content Area with dynamic left padding for sidebar */}
      <div
        className={`flex-1 flex flex-col transition-[padding] duration-200 ease-in-out ${
          desktopCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Trial Countdown Top Banner (appears prominently during last 72 hours) */}
        <TrialCountdownBanner />

        {/* Top Header */}
        <Header
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onOpenQuickActionModal={(type) => openAction(type)}
          isSidebarCollapsed={desktopCollapsed}
          onToggleSidebarCollapse={() => setDesktopCollapsed((prev) => !prev)}
        />

        {/* Dynamic Page Container with bottom padding for mobile navigation bar */}
        <main className="flex-1 p-3.5 sm:p-5 lg:p-7 pb-24 sm:pb-28 lg:pb-8 max-w-7xl w-full mx-auto">
          {isLocked ? (
            <TrialExpiredLockScreen businessName={activeBusiness?.name} />
          ) : (
            children
          )}
        </main>

        {/* Mobile-First Sticky Bottom Navigation Bar */}
        <MobileBottomNavigation onOpenMobileMenu={() => setMobileSidebarOpen(true)} />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ActionModalProvider>
        <ToastProvider>
          <React.Suspense
            fallback={
              <div className="min-h-screen bg-[#fcfbf9] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <AppShellInner>{children}</AppShellInner>
          </React.Suspense>
        </ToastProvider>
      </ActionModalProvider>
    </AuthProvider>
  );
}
