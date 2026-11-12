'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ModulePageShell } from '@/components/shared/ModulePageShell';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useEntitlements } from '@/hooks/useEntitlements';
import { FeatureNotAvailable } from '@/components/shared/FeatureNotAvailable';
import { UpgradeGateModal } from '@/components/subscription/UpgradeGateModal';
import { normalizePlanKey, OFFICIAL_PLANS } from '@/lib/subscription/plans';
import {
  ShieldCheck,
  UserPlus,
  Trash2,
  X,
  Info,
  Copy,
  Check,
  SlidersHorizontal,
  UserX,
  Building2,
  Calendar,
  ArrowUpRight,
  Sparkles,
  Mail,
} from 'lucide-react';

type AssignableStaffRole =
  | 'OPERATOR'
  | 'MANAGER'
  | 'ACCOUNTANT'
  | 'VIEWER'
  | 'BILLING_STAFF'
  | 'INVENTORY_MANAGER';

interface StaffMember {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  erpRole?: string;
  branchScope?: 'ALL' | 'SELECTED' | null;
  branchIds?: string[];
  fyScope?: 'ALL' | 'SELECTED' | null;
  financialYears?: string[];
  permissions?: string[];
  canApproveSensitive?: boolean;
  canFileGst?: boolean;
  createdAt: string;
}

interface BranchOption {
  id: string;
  name: string;
  code: string;
  isDefault: boolean;
}

interface FiscalYearOption {
  id: string;
  code: string;
  label: string;
  isClosed: boolean;
}

interface AssignablePermissionOption {
  code: string;
  module: string;
  label: string;
  description: string;
}

interface AccountantInvitationItem {
  id: string;
  invitedEmail: string;
  invitedName?: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  branchScope: 'ALL' | 'SELECTED';
  branchIds: string[];
  fyScope: 'ALL' | 'SELECTED';
  financialYears: string[];
  permissions: string[];
  canApproveSensitive: boolean;
  canFileGst: boolean;
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string | null;
  revokedAt?: string | null;
}

interface AccountantAccessRecord {
  id: string;
  userId: string;
  branchScope: 'ALL' | 'SELECTED';
  branchIds: string[];
  fyScope: 'ALL' | 'SELECTED';
  financialYears: string[];
  permissions: string[];
  canApproveSensitive: boolean;
  canFileGst: boolean;
  isActive: boolean;
  revokedAt?: string | null;
  revokedReason?: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  };
}

interface ScopeDraftState {
  branchScope: 'ALL' | 'SELECTED';
  branchIds: string[];
  fyScope: 'ALL' | 'SELECTED';
  financialYears: string[];
  permissions: string[];
  canApproveSensitive: boolean;
  canFileGst: boolean;
}

const ROLE_INFO: Record<
  string,
  { label: string; description: string; badge: string }
> = {
  BUSINESS_OWNER: {
    label: 'Owner',
    description:
      'Full administration: billing, GST governance, approvals, staff & CA access, branches, and subscription.',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  },
  OWNER: {
    label: 'Owner',
    description:
      'Full administration: billing, GST governance, approvals, staff & CA access, branches, and subscription.',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  },
  MANAGER: {
    label: 'Manager',
    description:
      'Manages daily billing, invoice voids, inward purchases, stock adjustments, customers, and operational reports.',
    badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  OPERATOR: {
    label: 'Operator / Staff',
    description:
      'Creates sales bills, records customer receipts, manages parties, and updates daily stock quantities.',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  ACCOUNTANT: {
    label: 'Accountant (CA)',
    description:
      'Dedicated accounting, GST reconciliation, ledgers, banking, and audit workspace (no subscription or Owner controls).',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  VIEWER: {
    label: 'Viewer (Read-Only)',
    description:
      'Strictly read-only access to invoices, stock, ledgers, and reports; cannot create, edit, or void records.',
    badge: 'bg-slate-100 text-slate-700 border-slate-300',
  },
  BILLING_STAFF: {
    label: 'Billing & POS Staff',
    description:
      'Generate invoices, print customer bills, record payments. No access to business settings or system configuration.',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  INVENTORY_MANAGER: {
    label: 'Godown / Stock In-Charge',
    description:
      'Catalog products, inward purchase orders, record stock adjustments, and monitor low-inventory alerts.',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
  },
};

const INVITATION_STATUS_BADGE: Record<AccountantInvitationItem['status'], string> = {
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  ACCEPTED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  REVOKED: 'bg-rose-50 text-rose-700 border-rose-200',
  EXPIRED: 'bg-slate-100 text-slate-600 border-slate-200',
};

function AccountantScopeFields({
  draft,
  onChange,
  branches,
  financialYears,
  assignablePermissions,
}: {
  draft: ScopeDraftState;
  onChange: React.Dispatch<React.SetStateAction<ScopeDraftState>>;
  branches: BranchOption[];
  financialYears: FiscalYearOption[];
  assignablePermissions: AssignablePermissionOption[];
}) {
  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, AssignablePermissionOption[]>();
    for (const perm of assignablePermissions) {
      const list = groups.get(perm.module) || [];
      list.push(perm);
      groups.set(perm.module, list);
    }
    return Array.from(groups.entries());
  }, [assignablePermissions]);

  const toggleItem = (key: 'branchIds' | 'financialYears' | 'permissions', value: string) => {
    onChange((prev) => {
      const current = new Set(prev[key]);
      if (current.has(value)) current.delete(value);
      else current.add(value);
      return { ...prev, [key]: Array.from(current) };
    });
  };

  return (
    <div className="space-y-4">
      {/* Branch Scope */}
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-600" />
            Branch Access Scope
          </span>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => onChange((prev) => ({ ...prev, branchScope: 'ALL' }))}
              className={`px-2.5 py-1 rounded-md font-medium ${
                draft.branchScope === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Branches
            </button>
            <button
              type="button"
              onClick={() => onChange((prev) => ({ ...prev, branchScope: 'SELECTED' }))}
              className={`px-2.5 py-1 rounded-md font-medium ${
                draft.branchScope === 'SELECTED'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Selected Only
            </button>
          </div>
        </div>
        {draft.branchScope === 'SELECTED' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {branches.map((branch) => (
              <label
                key={branch.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 text-[11px] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={draft.branchIds.includes(branch.id)}
                  onChange={() => toggleItem('branchIds', branch.id)}
                  className="rounded border-slate-300"
                />
                <span className="font-medium text-slate-800 truncate">
                  {branch.name} ({branch.code})
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Financial Year Scope */}
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-600" />
            Financial Year (FY) Scope
          </span>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => onChange((prev) => ({ ...prev, fyScope: 'ALL' }))}
              className={`px-2.5 py-1 rounded-md font-medium ${
                draft.fyScope === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Years
            </button>
            <button
              type="button"
              onClick={() => onChange((prev) => ({ ...prev, fyScope: 'SELECTED' }))}
              className={`px-2.5 py-1 rounded-md font-medium ${
                draft.fyScope === 'SELECTED'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Selected FYs
            </button>
          </div>
        </div>
        {draft.fyScope === 'SELECTED' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {financialYears.map((fy) => (
              <label
                key={fy.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 text-[11px] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={draft.financialYears.includes(fy.code)}
                  onChange={() => toggleItem('financialYears', fy.code)}
                  className="rounded border-slate-300"
                />
                <span className="font-medium text-slate-800">{fy.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Granular Permissions */}
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-800">
            Granular Accountant Permissions ({draft.permissions.length}/{assignablePermissions.length})
          </span>
          <div className="flex items-center gap-2 text-[11px]">
            <button
              type="button"
              onClick={() =>
                onChange((prev) => ({
                  ...prev,
                  permissions: assignablePermissions.map((p) => p.code),
                }))
              }
              className="text-emerald-700 font-semibold hover:underline"
            >
              Select All
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() =>
                onChange((prev) => ({
                  ...prev,
                  permissions: assignablePermissions
                    .filter((p) => p.code.endsWith('.view'))
                    .map((p) => p.code),
                }))
              }
              className="text-slate-600 font-medium hover:underline"
            >
              Read-Only Preset
            </button>
          </div>
        </div>

        <div className="max-h-56 overflow-y-auto space-y-3 pr-1">
          {groupedPermissions.map(([moduleName, perms]) => (
            <div key={moduleName} className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {moduleName}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {perms.map((perm) => (
                  <label
                    key={perm.code}
                    className="flex items-start gap-2 p-2 rounded-lg bg-white border border-slate-200 text-[11px] cursor-pointer hover:border-slate-300"
                  >
                    <input
                      type="checkbox"
                      checked={draft.permissions.includes(perm.code)}
                      onChange={() => toggleItem('permissions', perm.code)}
                      className="mt-0.5 rounded border-slate-300"
                    />
                    <div>
                      <div className="font-semibold text-slate-800">{perm.label}</div>
                      <div className="text-[10px] text-slate-500 leading-snug">
                        {perm.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Governance Toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
        <label className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 cursor-pointer">
          <input
            type="checkbox"
            checked={draft.canApproveSensitive}
            onChange={(e) =>
              onChange((prev) => ({ ...prev, canApproveSensitive: e.target.checked }))
            }
            className="mt-0.5 rounded border-amber-400"
          />
          <div>
            <span className="font-semibold text-amber-950 block">
              Sensitive Adjustments Allowed
            </span>
            <span className="text-amber-800/80 text-[10px]">
              High-value edits/back-dated entries still route to Owner Approval queue.
            </span>
          </div>
        </label>

        <label className="flex items-start gap-2 p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 cursor-pointer">
          <input
            type="checkbox"
            checked={draft.canFileGst}
            onChange={(e) => onChange((prev) => ({ ...prev, canFileGst: e.target.checked }))}
            className="mt-0.5 rounded border-blue-400"
          />
          <div>
            <span className="font-semibold text-blue-950 block">
              Prepare & Finalize GST Returns
            </span>
            <span className="text-blue-800/80 text-[10px]">
              Final GST submission requires explicit Owner sign-off in Approvals.
            </span>
          </div>
        </label>
      </div>
    </div>
  );
}

export default function StaffPage() {
  const toast = useToast();
  const { activeBusiness } = useAuth();
  const { isAllowed } = useEntitlements();
  const canManageStaff = isAllowed('canManageStaff');
  const canAccountantErp = isAllowed('canAccountantErp');

  const currentPlanKey = normalizePlanKey(activeBusiness?.subscription?.plan);
  const planLimits = OFFICIAL_PLANS[currentPlanKey]?.limits || { maxUsers: 1, maxLocations: 1 };

  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [currentUserErpRole, setCurrentUserErpRole] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeModalFeature, setUpgradeModalFeature] = useState('Additional Team Staff Seats');
  const [upgradeRequiredPlan, setUpgradeRequiredPlan] = useState<'GROWTH' | 'SCALE'>(
    currentPlanKey === 'STARTER' ? 'GROWTH' : 'SCALE'
  );
  const [submitting, setSubmitting] = useState(false);

  // Add Staff modal form fields
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<AssignableStaffRole>('OPERATOR');
  const [formPassword, setFormPassword] = useState('');

  // Scale Accountant Invitation & Access state
  const [loadingAccountants, setLoadingAccountants] = useState(false);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [financialYears, setFinancialYears] = useState<FiscalYearOption[]>([]);
  const [assignablePermissions, setAssignablePermissions] = useState<AssignablePermissionOption[]>(
    []
  );
  const [invitations, setInvitations] = useState<AccountantInvitationItem[]>([]);
  const [accountants, setAccountants] = useState<AccountantAccessRecord[]>([]);
  const [seatInfo, setSeatInfo] = useState<{ activeSeats: number; maxStaffSeats: number } | null>(
    null
  );

  // Invite Accountant modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteDraft, setInviteDraft] = useState<ScopeDraftState>({
    branchScope: 'ALL',
    branchIds: [],
    fyScope: 'ALL',
    financialYears: [],
    permissions: [],
    canApproveSensitive: false,
    canFileGst: false,
  });
  const [sendingInvite, setSendingInvite] = useState(false);
  const [latestInvite, setLatestInvite] = useState<{
    invitedEmail: string;
    inviteToken: string;
    invitePath: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Edit Accountant Access modal state
  const [editingAccountant, setEditingAccountant] = useState<AccountantAccessRecord | null>(null);
  const [editDraft, setEditDraft] = useState<ScopeDraftState>({
    branchScope: 'ALL',
    branchIds: [],
    fyScope: 'ALL',
    financialYears: [],
    permissions: [],
    canApproveSensitive: false,
    canFileGst: false,
  });
  const [savingAccess, setSavingAccess] = useState(false);

  // Revoke Accountant Access confirmation modal state
  const [revokingAccountant, setRevokingAccountant] = useState<AccountantAccessRecord | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokingBusy, setRevokingBusy] = useState(false);

  const isOwner =
    currentUserRole === 'BUSINESS_OWNER' ||
    currentUserRole === 'OWNER' ||
    currentUserErpRole === 'OWNER' ||
    activeBusiness?.erpRole === 'OWNER' ||
    activeBusiness?.role === 'BUSINESS_OWNER' ||
    activeBusiness?.role === 'OWNER';

  const fetchStaff = useCallback(async () => {
    if (!canManageStaff) return;
    try {
      setLoading(true);
      const res = await fetch('/api/staff');
      if (!res.ok) throw new Error('Failed to load team members');
      const data = await res.json();
      setStaffList(data.staff || []);
      setCurrentUserRole(data.currentUserRole || '');
      setCurrentUserErpRole(data.currentUserErpRole || '');
      setCurrentUserId(data.currentUserId || '');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error fetching staff');
    } finally {
      setLoading(false);
    }
  }, [canManageStaff, toast]);

  const fetchAccountantControlData = useCallback(async () => {
    if (!canManageStaff || !canAccountantErp || !isOwner) return;
    try {
      setLoadingAccountants(true);
      const res = await fetch('/api/accountant/invitations');
      if (!res.ok) return;
      const data = await res.json();
      const loadedPerms: AssignablePermissionOption[] = data.assignablePermissions || [];
      setBranches(data.branches || []);
      setFinancialYears(data.financialYears || []);
      setAssignablePermissions(loadedPerms);
      setInvitations(data.invitations || []);
      setAccountants(data.accountants || []);
      setSeatInfo(data.seatLimit || null);
      setInviteDraft((prev) =>
        prev.permissions.length === 0 && loadedPerms.length > 0
          ? { ...prev, permissions: loadedPerms.map((p) => p.code) }
          : prev
      );
    } catch {
      // Non-fatal fallback; toast not triggered repeatedly unless user interacts
    } finally {
      setLoadingAccountants(false);
    }
  }, [canManageStaff, canAccountantErp, isOwner]);

  useEffect(() => {
    if (!canManageStaff) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void fetchStaff();
    });
    return () => {
      cancelled = true;
    };
  }, [canManageStaff, fetchStaff]);

  useEffect(() => {
    if (!canManageStaff || !canAccountantErp || !isOwner) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void fetchAccountantControlData();
    });
    return () => {
      cancelled = true;
    };
  }, [canManageStaff, canAccountantErp, isOwner, fetchAccountantControlData]);

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
      await fetchStaff();
      if (canAccountantErp) await fetchAccountantControlData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error adding staff');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeStaffRole = async (
    membershipId: string,
    newRole: string,
    memberName: string
  ) => {
    try {
      setUpdatingRoleId(membershipId);
      const res = await fetch('/api/staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipId, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update staff role');
      toast.success(`Updated ${memberName}'s role to ${ROLE_INFO[newRole]?.label || newRole}`);
      await fetchStaff();
      if (canAccountantErp) await fetchAccountantControlData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error updating role');
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleRemoveStaff = async (membershipId: string, name: string) => {
    if (!confirm(`Are you sure you want to revoke access for ${name}?`)) return;

    try {
      const res = await fetch(`/api/staff?id=${membershipId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke staff access');

      toast.success(`Access revoked for ${name}`);
      await fetchStaff();
      if (canAccountantErp) await fetchAccountantControlData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error revoking access');
    }
  };

  const handleSendAccountantInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      toast.error('Accountant email address is required');
      return;
    }
    if (inviteDraft.branchScope === 'SELECTED' && inviteDraft.branchIds.length === 0) {
      toast.error('Select at least one branch or choose All Branches');
      return;
    }
    if (inviteDraft.fyScope === 'SELECTED' && inviteDraft.financialYears.length === 0) {
      toast.error('Select at least one Financial Year or choose All Years');
      return;
    }

    try {
      setSendingInvite(true);
      const res = await fetch('/api/accountant/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitedEmail: inviteEmail.trim(),
          invitedName: inviteName.trim() || null,
          ...inviteDraft,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create accountant invitation');

      toast.success('Accountant invitation generated!');
      setLatestInvite({
        invitedEmail: data.invitation?.invitedEmail || inviteEmail.trim(),
        inviteToken: data.inviteToken,
        invitePath: data.invitePath,
      });
      setInviteModalOpen(false);
      setInviteEmail('');
      setInviteName('');
      await fetchAccountantControlData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error inviting accountant');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: string, email: string) => {
    if (!confirm(`Revoke pending invitation for ${email}?`)) return;
    try {
      const res = await fetch(`/api/accountant/invitations?id=${invitationId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke invitation');
      toast.success(`Invitation revoked for ${email}`);
      await fetchAccountantControlData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error revoking invitation');
    }
  };

  const openEditAccountantModal = (acc: AccountantAccessRecord) => {
    setEditingAccountant(acc);
    setEditDraft({
      branchScope: acc.branchScope,
      branchIds: [...(acc.branchIds || [])],
      fyScope: acc.fyScope,
      financialYears: [...(acc.financialYears || [])],
      permissions:
        acc.permissions && acc.permissions.length > 0
          ? [...acc.permissions]
          : assignablePermissions.map((p) => p.code),
      canApproveSensitive: acc.canApproveSensitive,
      canFileGst: acc.canFileGst,
    });
  };

  const handleSaveAccountantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccountant) return;
    if (editDraft.branchScope === 'SELECTED' && editDraft.branchIds.length === 0) {
      toast.error('Select at least one branch or switch to All Branches');
      return;
    }
    if (editDraft.fyScope === 'SELECTED' && editDraft.financialYears.length === 0) {
      toast.error('Select at least one Financial Year or switch to All Years');
      return;
    }

    try {
      setSavingAccess(true);
      const res = await fetch(`/api/accountant/access/${editingAccountant.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editDraft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update accountant access');
      toast.success(`Updated permissions for ${editingAccountant.user.name}`);
      setEditingAccountant(null);
      await Promise.all([fetchStaff(), fetchAccountantControlData()]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error saving permissions');
    } finally {
      setSavingAccess(false);
    }
  };

  const handleConfirmRevokeAccountant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokingAccountant) return;
    try {
      setRevokingBusy(true);
      const res = await fetch(`/api/accountant/access/${revokingAccountant.userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: revokeReason.trim() || 'Revoked by Business Owner from Staff & CA Access Control',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke accountant access');
      toast.success(`Immediately revoked access for ${revokingAccountant.user.name}`);
      setRevokingAccountant(null);
      setRevokeReason('');
      await Promise.all([fetchStaff(), fetchAccountantControlData()]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error revoking accountant access');
    } finally {
      setRevokingBusy(false);
    }
  };

  const copyToClipboard = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error('Unable to copy automatically — please copy the text manually');
    }
  };

  if (!canManageStaff) {
    return (
      <FeatureNotAvailable
        featureName="Staff Accounts & Roles"
        requiredPlanName="Growth or Scale"
        description="Adding team members (billing operators, managers, accountants, viewers) requires a Pakka Chittha Growth (up to 3 users) or Scale (up to 10 users) subscription."
      />
    );
  }

  return (
    <ModulePageShell
      title="Business Staff & Delegated Permissions"
      description="Manage workspace ERP roles (Owner, Manager, Operator, Accountant, Viewer) and Scale Accountant multi-business permissions."
      targetPhase="Team & Access Control"
    >
      <div className="space-y-6">
        {/* Architecture Scope Notice */}
        <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-950 flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-blue-900 block">
              Multi-Tenant Role Isolation & ERP RBAC
            </span>
            <p className="text-blue-800/90 leading-relaxed">
              Every staff member and Accountant operates strictly within your business boundary. Only the <strong>Business Owner</strong> can invite team members, assign roles, manage subscription plans, or approve sensitive accounting changes.
            </p>
          </div>
        </div>

        {/* Action Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              Active Team Seats ({seatInfo?.activeSeats ?? staffList.length} /{' '}
              {seatInfo?.maxStaffSeats ?? planLimits.maxUsers})
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
                  setUpgradeModalFeature('Additional Team Staff Seats');
                  setUpgradeRequiredPlan(currentPlanKey === 'STARTER' ? 'GROWTH' : 'SCALE');
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
                    const info = ROLE_INFO[member.role] || ROLE_INFO[member.erpRole || ''] || {
                      label: member.role,
                      description: 'Custom tenant role',
                      badge: 'bg-slate-100 text-slate-800 border-slate-200',
                    };
                    const isSelf = member.userId === currentUserId;
                    const isOwnerRole =
                      member.role === 'BUSINESS_OWNER' ||
                      member.role === 'OWNER' ||
                      member.erpRole === 'OWNER';

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
                        <td className="py-3.5 px-4 space-y-1">
                          <div>
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${info.badge}`}
                            >
                              {info.label}
                            </span>
                          </div>
                          {isOwner && !isOwnerRole && !isSelf && (
                            <select
                              aria-label={`Change role for ${member.name}`}
                              value={member.role}
                              disabled={updatingRoleId === member.membershipId}
                              onChange={(e) =>
                                handleChangeStaffRole(
                                  member.membershipId,
                                  e.target.value,
                                  member.name
                                )
                              }
                              className="mt-1 block bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
                            >
                              <option value="OPERATOR">Operator / Staff</option>
                              <option value="MANAGER">Manager</option>
                              <option value="ACCOUNTANT">Accountant (CA)</option>
                              <option value="VIEWER">Viewer (Read-Only)</option>
                              <option value="BILLING_STAFF">Billing & POS Staff</option>
                              <option value="INVENTORY_MANAGER">Inventory Manager</option>
                            </select>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          <div className="text-slate-800">{member.email}</div>
                          {member.phone && (
                            <div className="text-slate-500 text-[10px]">{member.phone}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs text-[11px] leading-relaxed">
                          <div>{info.description}</div>
                          {member.erpRole === 'ACCOUNTANT' && canAccountantErp && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[10px]">
                                Branches: {member.branchScope === 'SELECTED' ? member.branchIds?.length || 0 : 'All'}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[10px]">
                                FYs: {member.fyScope === 'SELECTED' ? member.financialYears?.length || 0 : 'All'}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isOwner && !isOwnerRole && !isSelf ? (
                            <button
                              onClick={() => handleRemoveStaff(member.membershipId, member.name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
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

        {/* Scale ERP Accountant (CA) Multi-Business Invitation & Governance Panel */}
        {isOwner && canAccountantErp && (
          <div className="bg-white rounded-2xl border border-amber-200/90 shadow-2xs p-5 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <h3 className="font-bold text-sm text-slate-900">
                    Chartered Accountant (CA) Invitations & Access Control
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                    Scale ERP
                  </span>
                </div>
                <p className="text-xs text-slate-600 max-w-2xl">
                  Invite an external or in-house Accountant with explicit Branch scope, Financial Year scope, and granular accounting/GST permissions. Revoking access clears their active workspace session immediately.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/accountant/approvals"
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <span>Approval Queue</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => setInviteModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-semibold hover:bg-amber-700 transition-colors shadow-xs cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Invite Accountant (CA)</span>
                </button>
              </div>
            </div>

            {/* Generated Invite Share Banner */}
            {latestInvite && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2 text-xs">
                <div className="font-bold text-emerald-950">
                  Invitation Ready for {latestInvite.invitedEmail}
                </div>
                <p className="text-emerald-900/90 text-[11px]">
                  Share this link or invite token with your Accountant. They must log in with{' '}
                  <strong>{latestInvite.invitedEmail}</strong> and accept it from{' '}
                  <code>/accountant/businesses</code>.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        'invite-link',
                        `${window.location.origin}${latestInvite.invitePath}`
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 cursor-pointer"
                  >
                    {copiedKey === 'invite-link' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>Copy Accept Link</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('invite-token', latestInvite.inviteToken)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-900 font-semibold hover:bg-emerald-100/60 cursor-pointer"
                  >
                    {copiedKey === 'invite-token' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>Copy Invite Token</span>
                  </button>
                </div>
              </div>
            )}

            {/* Permitted Accountants List */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Authorized Accountants ({accountants.filter((a) => a.isActive).length})
              </h4>
              {loadingAccountants ? (
                <div className="text-xs text-slate-400 py-3">Loading CA access records...</div>
              ) : accountants.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                  No Accountant has been granted explicit CA access yet. Click &ldquo;Invite Accountant (CA)&rdquo; to grant scoped workspace permissions.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {accountants.map((acc) => (
                    <div
                      key={acc.id}
                      className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${
                        acc.isActive
                          ? 'bg-white border-slate-200'
                          : 'bg-slate-50 border-slate-200/70 opacity-75'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900">{acc.user.name}</div>
                          <div className="font-mono text-[11px] text-slate-600">
                            {acc.user.email}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            acc.isActive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {acc.isActive ? 'Active Access' : 'Revoked'}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          Branches:{' '}
                          {acc.branchScope === 'ALL'
                            ? 'All'
                            : `${acc.branchIds.length} selected`}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          FYs:{' '}
                          {acc.fyScope === 'ALL'
                            ? 'All Years'
                            : acc.financialYears.join(', ') || 'None'}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 font-medium">
                          {acc.permissions.length} Permissions
                        </span>
                        {acc.canFileGst && (
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-medium">
                            GST Prep Enabled
                          </span>
                        )}
                      </div>

                      {acc.revokedReason && !acc.isActive && (
                        <div className="text-[11px] text-rose-700 bg-rose-50/70 rounded-lg px-2.5 py-1.5">
                          Reason: {acc.revokedReason}
                        </div>
                      )}

                      {acc.isActive && (
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => openEditAccountantModal(acc)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-800 font-semibold hover:bg-slate-200 cursor-pointer"
                          >
                            <SlidersHorizontal className="w-3 h-3" />
                            <span>Edit Scope & Permissions</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRevokingAccountant(acc);
                              setRevokeReason('');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 font-semibold hover:bg-rose-100 cursor-pointer"
                          >
                            <UserX className="w-3 h-3" />
                            <span>Revoke Access</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sent Accountant Invitations */}
            {invitations.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Invitation History ({invitations.length})
                </h4>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Invited Accountant</th>
                        <th className="py-2.5 px-3">Scope</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Expires</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invitations.map((inv) => (
                        <tr key={inv.id}>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">{inv.invitedEmail}</div>
                            {inv.invitedName && (
                              <div className="text-[11px] text-slate-500">{inv.invitedName}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-600">
                            Branches: {inv.branchScope === 'ALL' ? 'All' : inv.branchIds.length} · FYs:{' '}
                            {inv.fyScope === 'ALL' ? 'All' : inv.financialYears.join(', ')} ·{' '}
                            {inv.permissions.length} perms
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                INVITATION_STATUS_BADGE[inv.status]
                              }`}
                            >
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-500">
                            {new Date(inv.expiresAt).toLocaleDateString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {inv.status === 'PENDING' ? (
                              <button
                                type="button"
                                onClick={() => handleRevokeInvitation(inv.id, inv.invitedEmail)}
                                className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                              >
                                Revoke Invite
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scale ERP Upsell Notice for Starter/Growth Owners */}
        {isOwner && !canAccountantErp && (
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5 max-w-2xl">
              <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-bold text-amber-950">
                  Need Multi-Business CA Invitations, Branch/FY Scoping & Approvals?
                </div>
                <p className="text-amber-900/85">
                  Pakka Chittha <strong>Scale (₹999/mo)</strong> unlocks the dedicated Chartered Accountant ERP Workspace with branch/FY-scoped invitations, Maker-Checker Owner approvals, and immutable audit trails.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setUpgradeModalFeature('Accountant ERP & CA Governance');
                setUpgradeRequiredPlan('SCALE');
                setUpgradeModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 cursor-pointer"
            >
              View Scale ERP
            </button>
          </div>
        )}
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
                  <label className="font-semibold text-slate-700 block mb-1">
                    Mobile Phone (Optional)
                  </label>
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
                  onChange={(e) => setFormRole(e.target.value as AssignableStaffRole)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="OPERATOR">Operator / Staff (Billing, Receipts & Stock)</option>
                  <option value="MANAGER">Manager (Operations, Void & Reports)</option>
                  <option value="ACCOUNTANT">Accountant (CA, GST & Ledger Reports)</option>
                  <option value="VIEWER">Viewer (Read-Only Access)</option>
                  <option value="BILLING_STAFF">Billing & POS Staff (POS Invoices Only)</option>
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

      {/* Scale Invite Accountant Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Invite Chartered Accountant (CA)
                </h3>
              </div>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendAccountantInvite} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Accountant Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ca.sharma@firm.in"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Accountant / Firm Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sharma & Associates CA"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <AccountantScopeFields
                draft={inviteDraft}
                onChange={setInviteDraft}
                branches={branches}
                financialYears={financialYears}
                assignablePermissions={assignablePermissions}
              />

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingInvite}
                  className="px-5 py-2 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 disabled:opacity-50"
                >
                  {sendingInvite ? 'Generating Invite...' : 'Generate Accountant Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Accountant Permissions Modal */}
      {editingAccountant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Edit Accountant Scope & Permissions
                </h3>
                <p className="text-[11px] text-slate-500">
                  {editingAccountant.user.name} ({editingAccountant.user.email})
                </p>
              </div>
              <button
                onClick={() => setEditingAccountant(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAccountantAccess} className="space-y-4 text-xs">
              <AccountantScopeFields
                draft={editDraft}
                onChange={setEditDraft}
                branches={branches}
                financialYears={financialYears}
                assignablePermissions={assignablePermissions}
              />

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAccountant(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAccess}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-50"
                >
                  {savingAccess ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revoke Accountant Confirmation Modal */}
      {revokingAccountant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-rose-900">Revoke Accountant Access</h3>
              <button
                onClick={() => setRevokingAccountant(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleConfirmRevokeAccountant} className="space-y-3 text-xs">
              <p className="text-slate-600 leading-relaxed">
                This will immediately deactivate workspace access for{' '}
                <strong>{revokingAccountant.user.name}</strong> ({revokingAccountant.user.email}) and clear their active session for this business.
              </p>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Reason (Recorded in Audit Trail)
                </label>
                <input
                  type="text"
                  placeholder="e.g. FY audit completed"
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-600"
                />
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRevokingAccountant(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={revokingBusy}
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-700 disabled:opacity-50"
                >
                  {revokingBusy ? 'Revoking...' : 'Confirm Revocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upgrade Gate Modal */}
      <UpgradeGateModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        featureName={upgradeModalFeature}
        requiredPlan={upgradeRequiredPlan}
        description={`Your current ${OFFICIAL_PLANS[currentPlanKey]?.name || 'Plan'} is limited to ${planLimits.maxUsers} user(s). Upgrade to Growth (up to 3 users) or Scale (up to 10 users + Full Accountant ERP) to unlock more seats and CA governance.`}
      />
    </ModulePageShell>
  );
}
