'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { SalesCollectionsChart } from '@/components/dashboard/SalesCollectionsChart';
import { RecentTransactionsTable } from '@/components/dashboard/RecentTransactionsTable';
import { OutstandingWatchlist } from '@/components/dashboard/OutstandingWatchlist';
import { LowStockAlertCard } from '@/components/dashboard/LowStockAlertCard';
import { SubscriptionUsageCard } from '@/components/dashboard/SubscriptionUsageCard';
import { GstOverviewCard } from '@/components/dashboard/GstOverviewCard';
import { useActionModal } from '@/context/ActionModalContext';
import { useAuth } from '@/context/AuthContext';
import { useEntitlements } from '@/hooks/useEntitlements';
import { Shield, AlertTriangle, PlusCircle } from 'lucide-react';
import ModeSelectionPage from './select-mode/page';

function DashboardContent() {
  const router = useRouter();
  const { openAction } = useActionModal();
  const { activeBusiness, user, loading } = useAuth();
  const { isFreeKhata, isAllowed, isSuperAdmin } = useEntitlements();
  const searchParams = useSearchParams();
  const hasForbiddenError = searchParams.get('error') === 'forbidden_admin_access';

  React.useEffect(() => {
    if (loading) return;
    if (isSuperAdmin) {
      router.replace('/platform-admin');
      return;
    }
    if (isFreeKhata) {
      router.replace('/free-khata');
    } else if (!activeBusiness && user) {
      router.replace('/ghar-kharcha');
    }
  }, [isFreeKhata, activeBusiness, user, loading, router, isSuperAdmin]);

  // If user is Super Admin, strictly route them to the Platform Admin panel (no store billing/stock)
  if (isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center text-slate-500 text-xs">
        <div className="w-6 h-6 border-2 border-[#00B887] border-t-transparent rounded-full animate-spin mb-3" />
        <span className="font-semibold text-slate-700">Opening Platform Administration...</span>
        <p className="text-[11px] text-slate-400 mt-1">Taking you to the Super Admin control center.</p>
      </div>
    );
  }

  // If user is on permanent Free Khata, strictly route them to the Free Khata ledger dashboard
  if (isFreeKhata) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center text-slate-500 text-xs">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="font-semibold text-slate-700">Opening your Free Udhaar Khata...</span>
        <p className="text-[11px] text-slate-400 mt-1">Taking you to your personal lending & borrowing ledger.</p>
      </div>
    );
  }

  // If user has no active business (e.g. Household Ghar Kharcha user), route to Ghar Kharcha
  if (!activeBusiness && user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center text-slate-500 text-xs">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="font-semibold text-slate-700">Opening Ghar Kharcha...</span>
        <p className="text-[11px] text-slate-400 mt-1">Taking you to your household expenses and budget.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Forbidden access notice if redirected from platform admin */}
      {hasForbiddenError && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Access Restricted:</strong> Platform Administration is accessible only to SUPER_ADMIN platform owners.
          </span>
        </div>
      )}

      {/* Super Admin Notice Banner */}
      {isSuperAdmin && (
        <div className="p-3.5 rounded-xl bg-purple-50/80 border border-purple-200 text-purple-950 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-purple-600 shrink-0" />
            <span>
              Signed in as <strong>SUPER_ADMIN</strong>. Platform workspace isolation remains active.
            </span>
          </div>
          <Link
            href="/platform-admin"
            className="px-3 py-1.5 bg-purple-900 text-white font-semibold rounded-lg hover:bg-purple-950 transition-colors shrink-0"
          >
            Open Admin Panel
          </Link>
        </div>
      )}

      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-[#071F38] tracking-tight">
              Hello, {user?.name ? user.name.split(' ')[0] : 'Vyapari'} 👋
            </h1>
            <span className="text-[11px] font-bold text-[#00B887] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              {activeBusiness ? 'Workspace Active' : 'Ready'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-slate-600">Aaj ka business kaisa chal raha hai?</span>
            <span className="text-slate-300 hidden xs:inline">•</span>
            <span className="text-slate-500">
              Workspace: <strong className="text-[#071F38]">{activeBusiness?.name || 'My Business'}</strong>
            </span>
            {activeBusiness?.gstin && (
              <>
                <span className="text-slate-300">•</span>
                <span className="font-mono text-slate-700 font-semibold text-[11px]">
                  GSTIN: {activeBusiness.gstin}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/invoices/new"
            className="inline-flex items-center gap-1.5 bg-[#00B887] hover:bg-[#009E74] text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-sm shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer min-h-[44px]"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>Add Sale Bill</span>
          </Link>
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <SummaryCards />

      {/* Quick Action Buttons (Adapted to assigned plan) */}
      <QuickActions
        onTriggerAction={(type) => {
          if (type === 'new_invoice') {
            router.push('/invoices/new');
          } else if (type === 'add_customer') {
            router.push('/customers?action=new');
          } else if (type === 'record_udhaar' || type === 'record_payment') {
            openAction('record_udhaar');
          } else if (type === 'new_purchase') {
            router.push('/purchases/new');
          } else if (type === 'new_item') {
            router.push('/inventory?action=new');
          } else if (type === 'whatsapp_reminder') {
            router.push('/whatsapp');
          } else if (type === 'view_reports') {
            router.push('/reports');
          } else {
            openAction(type);
          }
        }}
      />

      {/* Main Two-Column Grid: Charts & Tables on Left, Widgets on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column (2 spans): Sales & Collections Chart + Recent Invoices Table */}
        <div className="lg:col-span-2 space-y-5">
          {/* Sales & Collections Chart */}
          <SalesCollectionsChart />

          {/* Recent Invoices Table */}
          <RecentTransactionsTable
            onViewInvoice={(tx) => {
              if (tx?.id) router.push(`/invoices/${tx.id}`);
            }}
          />
        </div>

        {/* Right Column (1 span): Subscription Status, Udhaar Watchlist & Low Stock Alerts */}
        <div className="lg:col-span-1 space-y-5">
          {/* Subscription Usage & Renewal Card */}
          <SubscriptionUsageCard />

          {/* Outstanding Udhaar Watchlist */}
          <OutstandingWatchlist
            onSendReminder={(cust) =>
              openAction('whatsapp_reminder', {
                name: cust.name,
                phone: cust.phone,
                amount: cust.totalOutstanding,
              })
            }
            onRecordCredit={(cust) =>
              openAction('record_udhaar', {
                name: cust.name,
              })
            }
          />

          {/* Low Stock Alerts (Growth & Scale Plans Only) */}
          {isAllowed('canLowStockAlerts') && <LowStockAlertCard />}
        </div>
      </div>

      {/* GST Filing & Tax Overview (Growth & Scale Plans Only) */}
      {isAllowed('canAdvancedReports') && <GstOverviewCard />}
    </div>
  );
}

function HomeRouteContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#FFF9F5] flex flex-col items-center justify-center text-slate-800 px-4">
        <div className="w-10 h-10 border-3 border-[#EA580C] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-600">PakkaChittha khol rahe hain...</p>
      </div>
    );
  }

  // If unauthenticated: Home page is directly the Select Mode (Mera Ghar / Mera Vyapaar) page
  if (!user) {
    return <ModeSelectionPage />;
  }

  // If authenticated: Render the authorized workspace dashboard
  return <DashboardContent />;
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-slate-400">Loading...</div>}>
      <HomeRouteContent />
    </Suspense>
  );
}
