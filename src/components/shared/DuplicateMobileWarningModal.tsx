'use client';

import React from 'react';
import { AlertTriangle, Users, Building, ArrowLeft, Check } from 'lucide-react';

export interface DuplicatePartyItem {
  id: string;
  name: string;
  phone: string;
  type: 'Customer' | 'Supplier';
}

interface DuplicateMobileWarningModalProps {
  isOpen: boolean;
  phone: string;
  matches: DuplicatePartyItem[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function DuplicateMobileWarningModal({
  isOpen,
  phone,
  matches,
  onConfirm,
  onCancel,
}: DuplicateMobileWarningModalProps) {
  if (!isOpen) return null;

  const firstParty = matches[0];
  const isMultiple = matches.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="duplicate-warning-title"
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-amber-200 overflow-hidden transform transition-all"
      >
        {/* Header with Amber Banner */}
        <div className="bg-amber-50 px-6 py-5 border-b border-amber-100 flex items-start gap-4">
          <div className="p-3 bg-amber-100 rounded-xl text-amber-600 shrink-0 mt-0.5">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 id="duplicate-warning-title" className="text-lg font-bold text-slate-900">
              Duplicate Mobile Number
            </h3>
            <p className="text-xs text-amber-800 font-medium mt-0.5">
              मोबाइल नंबर पहले से पंजीकृत है
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            Mobile number <span className="font-semibold text-slate-900">{phone}</span> is already registered with{' '}
            {!isMultiple && firstParty ? (
              <span className="font-semibold text-amber-900">
                {firstParty.name} ({firstParty.type})
              </span>
            ) : (
              'existing contacts in your business'
            )}
            . Do you still want to continue?
          </p>

          {/* List of matching parties */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2 max-h-48 overflow-y-auto">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
              Registered Record{isMultiple ? 's' : ''} ({matches.length})
            </p>
            {matches.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 text-sm shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${
                    item.type === 'Customer' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                  }`}>
                    {item.type === 'Customer' ? <Users className="w-4 h-4" /> : <Building className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{item.name}</div>
                    <div className="text-xs text-slate-500">{item.phone}</div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  item.type === 'Customer' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                }`}>
                  {item.type}
                </span>
              </div>
            ))}
          </div>

          <div className="text-xs text-slate-500 bg-amber-50/70 rounded-lg p-2.5 border border-amber-100/60">
            Note: Continuing will save this party as an independent record without modifying or merging existing records.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-xl shadow-sm transition-colors"
          >
            <Check className="w-4 h-4" />
            Yes, Continue
          </button>
        </div>
      </div>
    </div>
  );
}
