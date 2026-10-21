'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, Home, CheckCircle2, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function JoinHouseholdInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { user, loading: authLoading } = useAuth();

  const [validation, setValidation] = useState<{
    valid: boolean;
    householdName: string;
    inviterName: string;
    role: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Missing invitation token.');
      setLoading(false);
      return;
    }

    fetch(`/api/household/invitations/validate?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          setError(data.error || 'Invalid or expired invitation link.');
        } else {
          setValidation(data);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Error validating link.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setJoining(true);
    try {
      const res = await fetch('/api/household/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to accept invitation.');
      }

      setSuccessMsg(data.message || 'Joined successfully!');
      setTimeout(() => {
        router.push('/ghar-kharcha');
        router.refresh();
      }, 1200);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error accepting invite');
    } finally {
      setJoining(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !validation) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-rose-200 text-center shadow-lg">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Invitation Invalid or Expired</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">{error || 'This invitation link could not be verified.'}</p>
        <Link
          href="/ghar-kharcha"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
        >
          <Home className="w-4 h-4" />
          <span>Go to PakkaChittha</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto my-12 p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-xl text-center relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 to-teal-600" />

      <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
        <Users className="w-7 h-7" />
      </div>

      <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-block mb-2">
        Family Collaboration
      </span>

      <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
        Join {validation.householdName}
      </h1>

      <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 mb-6">
        <strong>{validation.inviterName}</strong> has invited you to collaborate as a{' '}
        <span className="font-bold text-slate-800 uppercase">{validation.role}</span>.
      </p>

      {successMsg ? (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center justify-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg} Redirecting to your dashboard...</span>
        </div>
      ) : user ? (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium">
            Signed in as <strong>{user.name}</strong> ({user.email}).
          </div>

          <button
            onClick={handleAccept}
            disabled={joining}
            className="w-full py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {joining ? (
              'Joining Household...'
            ) : (
              <>
                <span>Accept Invitation &amp; Open Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 font-medium">
            Please log in or create a free account to join this household.
          </p>

          <Link
            href={`/login?redirect=/ghar-kharcha/join?token=${token}`}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 block"
          >
            Sign In to Accept
          </Link>

          <Link
            href={`/register?plan=ghar_kharcha&redirect=/ghar-kharcha/join?token=${token}`}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs transition-all flex items-center justify-center gap-2 block"
          >
            Register Free Account
          </Link>
        </div>
      )}
    </div>
  );
}

export default function JoinHouseholdPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <JoinHouseholdInner />
    </Suspense>
  );
}
