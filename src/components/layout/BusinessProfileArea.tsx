'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Building2, ChevronDown, ShieldCheck, Shield } from 'lucide-react';

interface BusinessProfileAreaProps {
  collapsed?: boolean;
}

export function BusinessProfileArea({ collapsed = false }: BusinessProfileAreaProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { activeBusiness, user } = useAuth();

  const isSuperAdmin = user?.platformRole === 'SUPER_ADMIN';

  // Compute monogram
  const bizName = activeBusiness?.name || (isSuperAdmin ? 'Platform Admin' : 'Business Workspace');
  const monogram = bizName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="relative border-b border-slate-200/80 p-3 bg-slate-50/70">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 text-left p-2 rounded-lg hover:bg-white hover:shadow-xs border border-transparent hover:border-slate-200 transition-all group cursor-pointer"
        title="Business Profile"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Logo with theme */}
          {activeBusiness?.logoUrl ? (
            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <img
                src={activeBusiness.logoUrl}
                alt={bizName}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div
              className={`w-10 h-10 rounded-lg text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-xs shrink-0 group-hover:scale-105 transition-transform border ${
                isSuperAdmin && !activeBusiness
                  ? 'bg-purple-950 border-purple-800 text-purple-200'
                  : 'bg-slate-900 border-slate-700 text-emerald-400'
              }`}
            >
              {isSuperAdmin && !activeBusiness ? 'PA' : monogram || 'ST'}
            </div>
          )}

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-slate-900 truncate block">
                  {bizName}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] text-slate-500 font-mono tracking-tight truncate block">
                  {activeBusiness?.gstin ? `GST: ${activeBusiness.gstin}` : isSuperAdmin ? 'System Root' : 'Tenant Active'}
                </span>
              </div>
            </div>
          )}
        </div>

        {!collapsed && (
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 shrink-0 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {/* Info Popover / Switcher Drawer */}
      {isOpen && (
        <div className="absolute left-2 right-2 top-full mt-1.5 z-50 bg-white rounded-xl shadow-xl border border-slate-200 p-3 animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              {isSuperAdmin ? (
                <Shield className="w-3.5 h-3.5 text-purple-700" />
              ) : (
                <Building2 className="w-3.5 h-3.5 text-slate-700" />
              )}
              {isSuperAdmin ? 'Platform Management' : 'Active Tenant Workspace'}
            </span>
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                isSuperAdmin
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {isSuperAdmin ? 'SUPER_ADMIN' : activeBusiness?.role || 'Active'}
            </span>
          </div>

          <div className="space-y-1.5 text-slate-600">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                Legal Entity
              </span>
              <p className="font-medium text-slate-800">
                {activeBusiness?.legalName || activeBusiness?.name || 'Pakka Chittha Commercial Platform'}
              </p>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                Category
              </span>
              <p>{activeBusiness?.tradeType || (isSuperAdmin ? 'Multi-Tenant Host' : 'General Trade')}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                  Jurisdiction
                </span>
                <p className="font-mono">{activeBusiness?.state || 'India'}</p>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                  Current Plan
                </span>
                <p className="text-blue-700 font-medium">
                  {activeBusiness?.subscription?.plan || (isSuperAdmin ? 'ROOT' : 'FREE_TRIAL')}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 bg-slate-50 -mx-3 -mb-3 p-2.5 rounded-b-xl flex items-start gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Server-verified PostgreSQL tenant isolation enforced on every query.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
