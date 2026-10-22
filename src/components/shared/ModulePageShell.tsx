'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useActionModal } from '@/context/ActionModalContext';

interface ModulePageShellProps {
  title: string;
  description: string;
  targetPhase: string;
  badgeText?: string;
  children: React.ReactNode;
  actionButtonText?: string;
  actionButtonType?: string;
}

export function ModulePageShell({
  title,
  description,
  targetPhase,
  badgeText = 'Shell Active',
  children,
  actionButtonText,
  actionButtonType,
}: ModulePageShellProps) {
  const router = useRouter();
  const { openAction } = useActionModal();

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation Back */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Previous Screen</span>
        </button>
        <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
          {targetPhase}
        </span>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {title}
            </h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              {badgeText}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            {description}
          </p>
        </div>

        {actionButtonText && actionButtonType && (
          <button
            onClick={() => openAction(actionButtonType)}
            className="self-start md:self-center px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0"
          >
            {actionButtonText}
          </button>
        )}
      </div>

      {/* Main Module Content */}
      {children}
    </div>
  );
}
