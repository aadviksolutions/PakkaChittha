'use client';

import React from 'react';
import { X, Info, Sparkles, MessageSquare, Receipt, UserPlus, CreditCard, Search } from 'lucide-react';
import { ActionMetadata } from '@/context/ActionModalContext';

export interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: string | null;
  metaData?: ActionMetadata;
}

export function ActionModal({
  isOpen,
  onClose,
  actionType,
  metaData,
}: ActionModalProps) {
  if (!isOpen || !actionType) return null;

  const metaRecord = metaData as Record<string, unknown> | null | undefined;
  const partyName = typeof metaRecord?.name === 'string' ? metaRecord.name : null;
  const partyPhone = typeof metaRecord?.phone === 'string' ? metaRecord.phone : null;
  const totalAmount = typeof metaRecord?.amount === 'number' ? metaRecord.amount : null;

  const renderContent = () => {
    switch (actionType) {
      case 'new_invoice':
        return (
          <div>
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm mb-1">
              <Receipt className="w-4 h-4 text-blue-600" />
              <span>GST Tax Invoice Generator (Phase 2 Preview)</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              The full multi-line invoice generator with real-time CGST/SGST calculation, HSN auto-lookup, and thermal/A4 PDF generation is scheduled for Phase 2.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Party / Customer</label>
                  <input
                    type="text"
                    defaultValue="Balaji Construction Works"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                    readOnly
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Invoice Number Series</label>
                  <input
                    type="text"
                    defaultValue="INV-2026-0843 (Auto)"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                    readOnly
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600 block mb-1">Sample Line Item Preview</label>
                <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between text-slate-500 text-[10px] uppercase pb-1 border-b border-slate-100">
                    <span>Item & HSN</span>
                    <span>Qty x Rate</span>
                    <span>Total (GST 18%)</span>
                  </div>
                  <div className="flex justify-between text-slate-800 pt-1">
                    <span>UltraTech Cement 50kg (HSN 2523)</span>
                    <span>50 bags @ ₹380</span>
                    <span className="font-semibold">₹22,420.00</span>
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200/60 text-blue-900 text-[11px] flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Phase 1 Notice:</strong> In this phase we are verifying the dashboard shell and layout. Database persistence and invoice numbering logic will be hooked in the next phase.
                </span>
              </div>
            </div>
          </div>
        );

      case 'record_udhaar':
        return (
          <div>
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm mb-1">
              <CreditCard className="w-4 h-4 text-amber-600" />
              <span>Record Customer Udhaar / Credit Entry</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Add a credit transaction to a customer khata with due dates and payment terms.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Party Name</label>
                  <input
                    type="text"
                    defaultValue={partyName || 'Kaveri Paints & Chemicals'}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                    readOnly
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Credit Amount</label>
                  <input
                    type="text"
                    defaultValue="₹25,000"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold"
                    readOnly
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-[11px]">
                Customer credit limit: ₹75,000 | Current balance: ₹51,200 (Safe limit headroom: ₹23,800).
              </div>
            </div>
          </div>
        );

      case 'add_customer':
        return (
          <div>
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm mb-1">
              <UserPlus className="w-4 h-4 text-emerald-600" />
              <span>Register New Customer / Party</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Add customer details with GSTIN validation, billing address, and credit terms.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Trade / Party Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Goyal Building Supplies"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                    readOnly
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">GSTIN (Optional for B2C)</label>
                  <input
                    type="text"
                    placeholder="07AAAAA0000A1Z5"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono"
                    readOnly
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Customer ledger creation and automated WhatsApp welcome messages will connect in Phase 2.
              </p>
            </div>
          </div>
        );

      case 'whatsapp_reminder':
        return (
          <div>
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm mb-1">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp Payment Reminder Broadcast</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Send an instant polite reminder with invoice PDF link and UPI QR code to party.
            </p>

            <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2 text-xs font-mono shadow-inner">
              <div className="text-emerald-400 font-bold text-[11px]">
                To: {partyPhone || '+91 98444 55667'} ({partyName || 'Kaveri Paints'})
              </div>
              <div className="text-slate-300 text-[11px] leading-relaxed bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                &ldquo;Namaste Mr. Arvind Gupta ji, this is a gentle reminder from Sharma Traders & Hardware regarding overdue balance of ₹{totalAmount ? totalAmount.toLocaleString('en-IN') : '51,200'} for invoice INV-2026-0839.
                <br /><br />
                Kindly settle via UPI: <strong>sharmatraders@hdfcbank</strong> or tap here to review statement: <u>https://pakkachittha.in/s/demo</u>&rdquo;
              </div>
            </div>

            <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Official WhatsApp Business API integration will be wired in Phase 5.</span>
            </div>
          </div>
        );

      case 'search':
        return (
          <div>
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm mb-1">
              <Search className="w-4 h-4 text-slate-600" />
              <span>Universal Search Preview</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Search across Invoices, Khata Customers, Items, and GSTINs.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-2">
              <div className="text-[11px] text-slate-400 font-semibold uppercase">Sample Match Candidates</div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="font-semibold text-slate-800">INV-2026-0842</span>
                  <span className="text-slate-500 ml-2">Balaji Construction Works</span>
                </div>
                <span className="font-mono text-emerald-600 font-medium">₹1,48,500</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="font-semibold text-slate-800">Kaveri Paints & Chemicals</span>
                  <span className="text-amber-600 text-[11px] ml-2">₹51,200 Overdue</span>
                </div>
                <span className="text-slate-400 text-[10px]">Customer Khata</span>
              </div>
            </div>
          </div>
        );

      case 'admin_manage_tenant':
        return (
          <div>
            <div className="flex items-center gap-2 text-purple-950 font-semibold text-sm mb-1">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Super Admin: Manage Tenant Subscription</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Simulated platform action for {partyName || 'Client Workspace'}.
            </p>
            <div className="bg-purple-50/60 border border-purple-200/80 rounded-xl p-4 space-y-3 text-xs">
              <div className="flex justify-between items-center text-slate-800">
                <span className="font-medium">Target Workspace:</span>
                <span className="font-bold">{partyName || 'Selected Business Tenant'}</span>
              </div>
              <div className="flex justify-between items-center text-slate-800">
                <span className="font-medium">Operation Requested:</span>
                <span className="font-mono text-purple-700 font-bold uppercase">{String(metaRecord?.action || 'Update Subscription')}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-purple-200 text-purple-900 text-[11px]">
                <strong>Planned Architecture Guard:</strong> In upcoming implementation phases, this action triggers a secured server-side mutation with audit logging, updating the tenant&apos;s subscription record and adjusting active quotas in the central database.
              </div>
            </div>
          </div>
        );

      case 'admin_create_plan':
      case 'admin_edit_plan':
        return (
          <div>
            <div className="flex items-center gap-2 text-purple-950 font-semibold text-sm mb-1">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Super Admin: Configure Plan Tiers & Quotas</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Adjust plan pricing, counter quotas, and feature entitlements.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs text-slate-700">
              <div className="flex justify-between items-center">
                <span>Selected Plan:</span>
                <span className="font-bold text-slate-900">{partyName || 'Growth Pro (Commercial)'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 text-[11px]">
                Plan tier configuration will directly synchronize with billing gateways (Razorpay/Stripe) and enforce feature-gating middleware in subsequent phases.
              </div>
            </div>
          </div>
        );

      case 'admin_save_settings':
      case 'add_tenant_mock':
        return (
          <div>
            <div className="flex items-center gap-2 text-purple-950 font-semibold text-sm mb-1">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Super Admin Platform Action</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Global platform configurations are queued for server-side persistence in Phase 2.
            </p>
            <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl text-purple-900 text-[11px]">
              Platform security settings, rate limit rules, and third-party webhook endpoints will be backed by encrypted database storage.
            </div>
          </div>
        );

      default:
        return (
          <div className="text-xs text-slate-600 p-4">
            <p className="font-semibold text-slate-800">Module Action Preview</p>
            <p className="text-slate-500 mt-1">Action Type: {actionType}</p>
          </div>
        );
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pakka Chittha Platform Shell
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5">{renderContent()}</div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Phase 1: Shell verification mode
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
