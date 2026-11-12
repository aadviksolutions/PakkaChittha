'use client';

import React from 'react';
import Link from 'next/link';
import { Crown, ShieldAlert, ArrowRight, Building2, LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEntitlements } from '@/hooks/useEntitlements';

interface AccountantScaleGateProps {
  children: React.ReactNode;
  allowPendingInviteRoute?: boolean;
}

export function AccountantScaleGate({
  children,
  allowPendingInviteRoute = false,
}: AccountantScaleGateProps) {
  const { user, activeBusiness, loading } = useAuth();
  const { isAllowed, planName, isExpired } = useEntitlements();

  if (loading) {
    return (
      <div className="space-y-4 p-2 sm:p-4">
        <div className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
          <div className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
          <div className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-lg p-6 text-center">
          <LogIn className="w-10 h-10 text-[#EA580C] mx-auto mb-3" />
          <h2 className="text-lg font-black text-[#071F38]">Sign in Required</h2>
          <p className="text-xs text-slate-500 mt-1.5">
            Please log in to access your Accountant ERP Workspace or accept a client invitation.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#071F38] text-white text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            Go to Login <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  if (allowPendingInviteRoute) {
    return <>{children}</>;
  }

  const canAccountantErp = isAllowed('canAccountantErp');
  if (!canAccountantErp || !activeBusiness) {
    const isOwner =
      activeBusiness?.erpRole === 'OWNER' ||
      activeBusiness?.role === 'BUSINESS_OWNER';

    return (
      <div className="min-h-[65vh] flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 text-[#EA580C] border border-orange-200 flex items-center justify-center mx-auto mb-4">
            {isExpired ? <ShieldAlert className="w-7 h-7" /> : <Crown className="w-7 h-7" />}
          </div>

          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
            Scale Plan Exclusive
          </span>

          <h2 className="text-xl font-black text-[#071F38] tracking-tight mt-3">
            Professional Accountant & GST ERP Workspace
          </h2>

          <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
            {!activeBusiness ? (
              <>
                No active Scale business workspace is currently selected. If a client business owner
                invited you as an Accountant (CA), review and accept the invitation under{' '}
                <strong className="text-[#071F38]">Businesses & Invites</strong>.
              </>
            ) : isExpired ? (
              <>
                This workspace&apos;s <strong className="text-[#071F38]">{planName}</strong>{' '}
                subscription has expired. Renew the Scale plan to resume Accountant ERP actions.
              </>
            ) : (
              <>
                Your active business <strong className="text-[#071F38]">{activeBusiness.name}</strong>{' '}
                is on <strong className="text-[#071F38]">{planName}</strong>. Complete Accountant
                Workspace, multi-business CA switching, GST return approvals, multi-branch scope,
                and immutable Audit Trail are available exclusively on the{' '}
                <strong className="text-[#071F38]">Scale (₹999/month)</strong> plan. Starter
                (₹199) and Growth (₹499) features remain unchanged.
              </>
            )}
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <Link
              href="/accountant/businesses"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#071F38] text-xs font-bold transition-colors"
            >
              <Building2 className="w-3.5 h-3.5" />
              Businesses & Invites
            </Link>

            {isOwner && (
              <Link
                href="/subscription"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#EA580C] hover:bg-orange-700 text-white text-xs font-bold shadow-sm transition-colors"
              >
                <Crown className="w-3.5 h-3.5" />
                Upgrade to Scale (₹999/mo)
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

