'use client';

import React, { useEffect, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';

function DashboardRedirectContent() {
  const { user, activeBusiness, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        window.location.href = '/login?redirect=/';
        return;
      }
      if (user.platformRole === 'SUPER_ADMIN') {
        window.location.href = '/platform-admin';
        return;
      }
      if (activeBusiness?.subscription?.plan === 'FREE_KHATA') {
        window.location.href = '/free-khata';
        return;
      }
      if (!activeBusiness) {
        window.location.href = '/ghar-kharcha';
        return;
      }
      window.location.href = '/';
    }
  }, [user, activeBusiness, loading]);

  return (
    <div className="h-screen w-screen bg-[#FFF9F5] flex flex-col items-center justify-center text-slate-800 px-4">
      <div className="w-10 h-10 border-3 border-[#EA580C] border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-sm font-semibold text-slate-600">PakkaChittha Dashboard khol rahe hain...</p>
    </div>
  );
}

export default function DashboardRoutePage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-slate-400">Loading dashboard...</div>}>
      <DashboardRedirectContent />
    </Suspense>
  );
}
