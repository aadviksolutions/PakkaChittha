'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  Shield,
  Copy,
  Check,
  Trash2,
  Clock,
  Sparkles,
  X,
  AlertCircle,
  Share2,
  Phone,
  Smartphone,
  Heart,
} from 'lucide-react';

interface Member {
  id: string;
  userId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  relationship?: string | null;
  isDirectRecord?: boolean;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  joinedAt: string;
}

interface Invitation {
  id: string;
  inviteeEmail: string | null;
  inviteToken: string;
  role: string;
  expiresAt: string;
  inviter: {
    name: string;
    email: string;
  };
}

export default function HouseholdMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState('MEMBER');
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(true);

  // Direct member addition modal (Mera Ghar Ka Hisab package)
  const [showDirectModal, setShowDirectModal] = useState(false);
  const [directName, setDirectName] = useState('');
  const [directMobile, setDirectMobile] = useState('');
  const [directRelationship, setDirectRelationship] = useState('Spouse');
  const [directRole, setDirectRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [addingDirect, setAddingDirect] = useState(false);
  const [directError, setDirectError] = useState<string | null>(null);

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const [membersRes, invitesRes] = await Promise.all([
        fetch('/api/household/members'),
        fetch('/api/household/invitations'),
      ]);

      const membersJson = await membersRes.json();
      const invitesJson = await invitesRes.json();

      if (membersJson.success) {
        setMembers(membersJson.members);
        setCurrentUserRole(membersJson.currentUserRole);
        setCurrentUserId(membersJson.currentUserId);
      }
      if (invitesJson.success) {
        setInvitations(invitesJson.invitations);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingInvite(true);
    try {
      const res = await fetch('/api/household/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteeEmail: inviteEmail || undefined,
          role: inviteRole,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to create invitation.');
      }

      const fullLink = `${window.location.origin}${json.invitation.inviteLink}`;
      setGeneratedLink(fullLink);
      fetchMembers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error generating invitation');
    } finally {
      setGeneratingInvite(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevokeInvite = async (id: string) => {
    if (!confirm('Revoke this invitation link?')) return;
    try {
      await fetch(`/api/household/invitations?invitationId=${id}`, { method: 'DELETE' });
      fetchMembers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveMember = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from this household?`)) return;
    try {
      const res = await fetch(`/api/household/members?memberId=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to remove member');
      }
      fetchMembers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error removing member');
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const res = await fetch('/api/household/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, newRole }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to change role');
      }
      fetchMembers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error changing role');
    }
  };

  const handleDirectAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setDirectError(null);
    setAddingDirect(true);

    try {
      const res = await fetch('/api/household/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: directName,
          mobile: directMobile,
          relationship: directRelationship,
          role: directRole,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to add family member.');
      }

      setShowDirectModal(false);
      setDirectName('');
      setDirectMobile('');
      setDirectRelationship('Spouse');
      fetchMembers();
    } catch (err: unknown) {
      setDirectError(err instanceof Error ? err.message : 'Error adding family member');
    } finally {
      setAddingDirect(false);
    }
  };

  const handleImportContact = async () => {
    if (typeof window !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window) {
      try {
        const contacts = await (navigator as any).contacts.select(['name', 'tel'], { multiple: false });
        if (contacts && contacts[0]) {
          const c = contacts[0];
          const rawName = c.name?.[0] || '';
          const rawPhone = (c.tel?.[0] || '').replace(/\D/g, '').slice(-10);

          if (rawPhone) {
            const exists = members.some((m) => m.phone && m.phone.replace(/\D/g, '').slice(-10) === rawPhone);
            if (exists) {
              setDirectError(`A family member with mobile ${rawPhone} is already in this household.`);
            }
          }

          if (rawName) setDirectName(rawName);
          if (rawPhone) setDirectMobile(rawPhone);
        }
      } catch (err) {
        console.warn('Contact picker cancelled or unavailable:', err);
      }
    } else {
      alert('Contact picker is not supported on this browser or platform. Please enter the contact details manually.');
    }
  };

  const isOwner = currentUserRole === 'OWNER';
  const canInvite = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/ghar-kharcha"
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Family Members &amp; Collaboration
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Mera Ghar Ka Hisab: Add family members directly or share invitation links to collaborate on household budgets.
          </p>
        </div>

        {canInvite && (
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => {
                setDirectError(null);
                setShowDirectModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Member Directly</span>
            </button>

            <button
              onClick={() => {
                setGeneratedLink(null);
                setInviteEmail('');
                setShowInviteModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all cursor-pointer"
            >
              <span>Invite via Link</span>
            </button>
          </div>
        )}
      </div>

      {/* Role Explanations Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-white p-3 rounded-xl border border-slate-200">
          <span className="font-bold text-emerald-700 block">Owner</span>
          <span className="text-[11px] text-slate-500 font-medium leading-tight">Full access, budget settings, member roles.</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200">
          <span className="font-bold text-blue-700 block">Admin</span>
          <span className="text-[11px] text-slate-500 font-medium leading-tight">Record entries, categories, invite members.</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200">
          <span className="font-bold text-slate-800 block">Member</span>
          <span className="text-[11px] text-slate-500 font-medium leading-tight">Add and view shared household records.</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200">
          <span className="font-bold text-slate-600 block">Viewer</span>
          <span className="text-[11px] text-slate-500 font-medium leading-tight">Read-only view of dashboard and ledger.</span>
        </div>
      </div>

      {/* Active Members List */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
        <h2 className="text-base font-extrabold text-slate-900 tracking-tight mb-4">
          Household Members ({members.length})
        </h2>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading members...</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {members.map((m) => (
              <div key={m.id} className="py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 font-black text-sm flex items-center justify-center shrink-0">
                    {m.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 truncate">{m.name}</span>
                      {m.userId === currentUserId && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                          You
                        </span>
                      )}
                      {m.isDirectRecord && (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                          Direct Record
                        </span>
                      )}
                      {m.relationship && (
                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded">
                          {m.relationship}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-medium block truncate">
                      {m.phone ? `Phone: ${m.phone}` : m.email || 'Direct Household Profile'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isOwner && m.role !== 'OWNER' ? (
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.id, e.target.value)}
                      className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MEMBER">Member</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  ) : (
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {m.role}
                    </span>
                  )}

                  {canInvite && m.role !== 'OWNER' && m.userId !== currentUserId && (
                    <button
                      onClick={() => handleRemoveMember(m.id, m.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight mb-3">
            Pending Invitations ({invitations.length})
          </h2>

          <div className="space-y-3">
            {invitations.map((inv) => {
              const fullLink = typeof window !== 'undefined'
                ? `${window.location.origin}/ghar-kharcha/join?token=${inv.inviteToken}`
                : '';
              return (
                <div
                  key={inv.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">
                        {inv.inviteeEmail || 'Open Family Invite Link'}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                        {inv.role}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(fullLink)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </button>
                    <button
                      onClick={() => handleRevokeInvite(inv.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="Revoke"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Invite Family Member
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {generatedLink ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                  <strong>Invitation Link Generated!</strong> Share this link with your family member via WhatsApp, SMS, or Email. They can open it to join your household.
                </div>

                <div className="p-3 bg-slate-100 rounded-xl break-all text-xs font-mono text-slate-800 select-all border border-slate-200">
                  {generatedLink}
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(generatedLink)}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Invitation Link'}</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Invitee Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="e.g. spouse@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-xs font-medium text-slate-800 placeholder:text-slate-400 bg-white"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Leave blank to generate a shareable link you can send directly.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Assign Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-xs font-bold text-slate-800 bg-white"
                  >
                    <option value="MEMBER">Member (Can add &amp; view transactions)</option>
                    <option value="ADMIN">Admin (Can manage categories, budgets &amp; invite)</option>
                    <option value="VIEWER">Viewer (Read-only)</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={generatingInvite}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-60"
                  >
                    {generatingInvite ? 'Generating Link...' : 'Generate Invitation Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Direct Add Family Member Modal (Mera Ghar Ka Hisab Package) */}
      {showDirectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => setShowDirectModal(false)}
              className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Add Family Member Directly
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Mera Ghar Ka Hisab &bull; No invitation or accept required
                </p>
              </div>
            </div>

            {directError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{directError}</span>
              </div>
            )}

            <form onSubmit={handleDirectAdd} className="space-y-3.5 text-xs">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    Member Full Name *
                  </label>
                  <button
                    type="button"
                    onClick={handleImportContact}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                    title="Import from phone address book"
                  >
                    <Phone className="w-3 h-3" />
                    <span>Choose from Contacts</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={directName}
                  onChange={(e) => setDirectName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-xs font-medium text-slate-800 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Mobile Number (Optional)
                </label>
                <input
                  type="tel"
                  value={directMobile}
                  onChange={(e) => setDirectMobile(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-xs font-medium text-slate-800 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                    Relationship
                  </label>
                  <select
                    value={directRelationship}
                    onChange={(e) => setDirectRelationship(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Child">Child / Son / Daughter</option>
                    <option value="Parent">Parent / Mother / Father</option>
                    <option value="Sibling">Sibling / Brother / Sister</option>
                    <option value="Grandparent">Grandparent</option>
                    <option value="Relative">Relative</option>
                    <option value="Other">Other Family Member</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                    Access Permission
                  </label>
                  <select
                    value={directRole}
                    onChange={(e) => setDirectRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                  >
                    <option value="MEMBER">Member (Can add &amp; view)</option>
                    <option value="ADMIN">Admin (Manage records)</option>
                    <option value="VIEWER">Viewer (Read-only)</option>
                  </select>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 leading-relaxed">
                Direct addition enables immediate expense splitting and recording without requiring the family member to create a login account.
              </p>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDirectModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingDirect}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-60"
                >
                  {addingDirect ? 'Adding Member...' : 'Add Family Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
