'use client';

import React, { useState, useEffect } from 'react';
import { ModulePageShell } from '@/components/shared/ModulePageShell';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useEntitlements } from '@/hooks/useEntitlements';
import { FeatureNotAvailable } from '@/components/shared/FeatureNotAvailable';
import { UpgradeGateModal } from '@/components/subscription/UpgradeGateModal';
import { normalizePlanKey, OFFICIAL_PLANS } from '@/lib/subscription/plans';
import { ShieldCheck, UserPlus, Trash2, X, Info, UserCheck, KeyRound } from 'lucide-react';

interface StaffMember {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  role: 'BUSINESS_OWNER' | 'BILLING_STAFF' | 'ACCOUNTANT' | 'INVENTORY_MANAGER';
  createdAt: string;
}

const ROLE_INFO: Record<
  string,
  { label: string; description: string; badge: string }
> = {
  BUSINESS_OWNER: {
    label: 'Business Owner',
    description: 'Full workspace administration: billing profile, GST settings, financial reports, inventory, and staff seats.',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  },
  BILLING_STAFF: {
    label: 'Billing & POS Operator',
    description: 'Generate invoices, print customer bills, record payments. No access to business settings or system configuration.',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  ACCOUNTANT: {
    label: 'Chartered Accountant / Auditor',
    description: 'Read & export GSTR-1, P&L reports, expenses, customer ledger statements, and reconcile tax totals.',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  INVENTORY_MANAGER: {
    label: 'Godown / Stock In-Charge',
    description: 'Catalog products, inward purchase orders, record stock adjustments, and monitor low-inventory alerts.',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
  },
};

export default function StaffPage() {
  const toast = useToast();
  const { activeBusiness } = useAuth();
  const { isAllowed } = useEntitlements();
  const canManageStaff = isAllowed('canManageStaff');

  const currentPlanKey = normalizePlanKey(activeBusiness?.subscription?.plan);
  const planLimits = OFFICIAL_PLANS[currentPlanKey]?.limits || { maxUsers: 1, maxLocations: 1 };

  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<'BILLING_STAFF' | 'ACCOUNTANT' | 'INVENTORY_MANAGER'>('BILLING_STAFF');
  const [formPassword, setFormPassword] = useState('');

  useEffect(() => {
    if (!canManageStaff) return;
    fetchStaff();
  }, [canManageStaff]);

  const fetchStaff = async () => {
    if (!canManageStaff) return;
    try {
      setLoading(true);
      const res = await fetch('/api/staff');
      if (!res.ok) throw new Error('Failed to load team members');
      const data = await res.json();
      setStaffList(data.staff || []);
      setCurrentUserRole(data.currentUserRole || '');
      setCurrentUserId(data.currentUserId || '');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error fetching staff');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
      toast.error('Name, email, and password are required');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          phone: formPhone,
          role: formRole,
          password: formPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add staff member');

      toast.success('Staff member successfully added to your workspace!');
      setIsModalOpen(false);
      setFormName('');
      setFormEmail('');
      setFormPhone('');
      setFormPassword('');
      fetchStaff();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error adding staff');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveStaff = async (membershipId: string, name: string) => {
    if (!confirm(`Are you sure you want to revoke access for ${name}?`)) return;

    try {
      const res = await fetch(`/api/staff?id=${membershipId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke staff access');

      toast.success(`Access revoked for ${name}`);
      fetchStaff();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error revoking access');
    }
  };

  const isOwner = currentUserRole === 'BUSINESS_OWNER';

  if (!canManageStaff) {
    return (
      <FeatureNotAvailable
        featureName="Staff Accounts & Roles"
        requiredPlanName="Growth or Scale"
        description="Adding team members (billing operators, accountants, inventory managers) requires a Pakka Chittha Growth (up to 3 users) or Scale (up to 10 users) subscription."
      />
    );
  }

  return (
    <ModulePageShell
      title="Business Staff & Delegated Permissions"
      description="Manage subordinate business workspace roles (Billing Staff, Accountant, Inventory Manager). These permissions are strictly scoped to your business."
      targetPhase="Team & Access Control"
    >
      <div className="space-y-6">
        {/* Architecture Scope Notice */}
        <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-950 flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-blue-900 block">
              Multi-Tenant Role Isolation Guarantee
            </span>
            <p className="text-blue-800/90 leading-relaxed">
              Every staff member added here operates strictly under your business tenant. They cannot see or modify other businesses on the platform, and only the <strong>Business Owner</strong> can invite or revoke staff credentials.
            </p>
          </div>
        </div>

        {/* Action Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              Active Team Seats ({staffList.length} / {planLimits.maxUsers})
            </h3>
            <p className="text-xs text-slate-500">
              {currentPlanKey === 'STARTER'
                ? 'Starter plan includes 1 user (Owner only)'
                : `${planLimits.maxUsers} seats available on ${OFFICIAL_PLANS[currentPlanKey]?.name || 'Plan'}`}
            </p>
          </div>
          {isOwner && (
            <button
              onClick={() => {
                if (staffList.length >= planLimits.maxUsers) {
                  setUpgradeModalOpen(true);
                } else {
                  setIsModalOpen(true);
                }
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Staff Member</span>
            </button>
          )}
        </div>

        {/* Staff Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Contact (Email / Phone)</th>
                  <th className="py-3 px-4">Permissions Scope</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Loading staff roster...
                    </td>
                  </tr>
                ) : staffList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      No staff members found.
                    </td>
                  </tr>
                ) : (
                  staffList.map((member) => {
                    const info = ROLE_INFO[member.role] || {
                      label: member.role,
                      description: 'Custom tenant role',
                      badge: 'bg-slate-100 text-slate-800 border-slate-200',
                    };
                    const isSelf = member.userId === currentUserId;
                    const isOwnerRole = member.role === 'BUSINESS_OWNER';

                    return (
                      <tr key={member.membershipId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{member.name}</div>
                          {isSelf && (
                            <span className="inline-block px-1.5 py-0.2 bg-slate-100 text-[10px] text-slate-600 rounded font-medium mt-0.5">
                              You (Active Session)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${info.badge}`}
                          >
                            {info.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          <div className="text-slate-800">{member.email}</div>
                          {member.phone && <div className="text-slate-500 text-[10px]">{member.phone}</div>}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs text-[11px] leading-relaxed">
                          {info.description}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isOwner && !isOwnerRole && !isSelf ? (
                            <button
                              onClick={() => handleRemoveStaff(member.membershipId, member.name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                              title="Revoke access"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">Protected</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">Invite New Staff Member</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ramesh@store.in"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mobile Phone (Optional)</label>
                  <input
                    type="text"
                    placeholder="9876543210"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Temporary Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Assigned Workspace Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="BILLING_STAFF">Billing & POS Staff (Invoice Creation Only)</option>
                  <option value="ACCOUNTANT">Accountant (Tax Reports & Expenses Access)</option>
                  <option value="INVENTORY_MANAGER">Inventory Manager (Stock & Purchases)</option>
                </select>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600">
                {ROLE_INFO[formRole]?.description}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-50"
                >
                  {submitting ? 'Creating Account...' : 'Invite Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upgrade Gate Modal when staff seat limit is reached */}
      <UpgradeGateModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        featureName="Additional Team Staff Seats"
        requiredPlan={currentPlanKey === 'STARTER' ? 'GROWTH' : 'SCALE'}
        description={`Your current ${OFFICIAL_PLANS[currentPlanKey]?.name || 'Plan'} is limited to ${planLimits.maxUsers} user(s). Upgrade to Growth (up to 3 users) or Scale (up to 10 users) to add more staff.`}
      />
    </ModulePageShell>
  );
}
