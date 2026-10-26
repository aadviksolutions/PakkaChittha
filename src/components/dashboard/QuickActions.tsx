'use client';

import React from 'react';
import {
  FilePlus2,
  CreditCard,
  UserPlus,
  MessageSquare,
  Sparkles,
  BarChart3,
  BookOpen,
  Truck,
  PackagePlus,
} from 'lucide-react';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useTranslation } from '@/i18n/context';

interface QuickActionsProps {
  onTriggerAction: (actionType: string) => void;
}

export function QuickActions({ onTriggerAction }: QuickActionsProps) {
  const { isAllowed } = useEntitlements();
  const { t } = useTranslation();

  // Dynamic actions tailored to user's assigned plan
  const actions = [
    {
      id: 'new_invoice',
      label: t('dashboard.addSaleBill'),
      subtitle: 'GST invoice',
      icon: FilePlus2,
      primary: true,
      color: 'emerald',
      visible: true,
    },
    {
      id: 'record_payment',
      label: t('invoices.recordPayment'),
      subtitle: 'Cash / UPI receipt',
      icon: CreditCard,
      primary: false,
      color: 'blue',
      visible: true,
    },
    {
      id: 'record_udhaar',
      label: t('dashboard.recordUdhaar'),
      subtitle: 'Credit entry',
      icon: BookOpen,
      primary: false,
      color: 'amber',
      visible: true,
    },
    {
      id: 'add_customer',
      label: t('dashboard.addCustomer'),
      subtitle: 'New ledger',
      icon: UserPlus,
      primary: false,
      color: 'purple',
      visible: true,
    },
    isAllowed('canManagePurchases')
      ? {
          id: 'new_purchase',
          label: t('dashboard.newPurchase'),
          subtitle: 'Vendor bill',
          icon: Truck,
          primary: false,
          color: 'indigo',
          visible: true,
        }
      : {
          id: 'new_item',
          label: t('dashboard.newItem'),
          subtitle: 'Stock item',
          icon: PackagePlus,
          primary: false,
          color: 'indigo',
          visible: true,
        },
    isAllowed('canAdvancedReports')
      ? {
          id: 'view_reports',
          label: t('dashboard.viewReports'),
          subtitle: 'Sales & GST',
          icon: BarChart3,
          primary: false,
          color: 'navy',
          visible: true,
        }
      : {
          id: 'whatsapp_reminder',
          label: t('dashboard.sendReminder'),
          subtitle: 'WhatsApp link',
          icon: MessageSquare,
          primary: false,
          color: 'teal',
          visible: true,
        },
  ].filter((a) => a.visible);

  return (
    <div className="mb-4 sm:mb-6 bg-white rounded-2xl p-3 sm:p-4.5 border border-slate-200/90 shadow-2xs">
      <div className="flex items-center justify-between mb-2.5 px-0.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#00B887]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#071F38]">
            {t('dashboard.quickActions')}
          </h2>
        </div>
        <span className="text-[10.5px] sm:text-[11px] text-slate-400 font-medium">
          Tap to start
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              type="button"
              onClick={() => onTriggerAction(act.id)}
              className={`flex items-center sm:flex-col sm:items-start lg:flex-row lg:items-center gap-2 sm:gap-2.5 p-2.5 sm:p-3 rounded-xl border text-left transition-all group cursor-pointer min-h-[48px] active:scale-[0.98] ${
                act.primary
                  ? 'bg-[#00B887] border-[#00B887] text-white hover:bg-[#00A377] shadow-sm shadow-emerald-500/20'
                  : 'bg-[#F8FAFC] border-slate-200/90 text-slate-800 hover:bg-white hover:border-[#00B887] hover:shadow-2xs'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                  act.primary
                    ? 'bg-white/20 text-white'
                    : 'bg-white text-[#071F38] border border-slate-200 group-hover:text-[#00B887] group-hover:border-[#00B887]/30'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span
                  className={`text-xs font-bold block leading-tight truncate ${
                    act.primary ? 'text-white' : 'text-[#071F38]'
                  }`}
                >
                  {act.label}
                </span>
                <span
                  className={`text-[10px] block mt-0.5 truncate ${
                    act.primary ? 'text-emerald-100' : 'text-slate-400'
                  }`}
                >
                  {act.subtitle}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
