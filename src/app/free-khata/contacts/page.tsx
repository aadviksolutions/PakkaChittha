'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  Search,
  Plus,
  Phone,
  MessageSquare,
  ChevronRight,
  Sparkles,
  UserPlus,
  Trash2,
} from 'lucide-react';
import { TransactionModal } from '@/components/free-khata/TransactionModal';
import { WhatsAppReminderModal, WhatsAppReminderTarget } from '@/components/free-khata/WhatsAppReminderModal';
import { formatDate } from '@/lib/services/khataService';

interface ContactItem {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  totalGave: number;
  totalReceived: number;
  gaveOutstanding: number;
  receivedOutstanding: number;
  netBalance: number;
  transactionCount: number;
  lastActivityDate: string;
}

function ContactsContent() {
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modals
  const [addPersonModalOpen, setAddPersonModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [savingPerson, setSavingPerson] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // WhatsApp Modal
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waTarget, setWaTarget] = useState<WhatsAppReminderTarget | null>(null);

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/free-khata/contacts');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load contacts');
      }
      setContacts(json.contacts);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading contacts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!newName.trim() || newName.trim().length < 2) {
      setModalError('Please enter a valid name (at least 2 characters).');
      return;
    }

    setSavingPerson(true);
    try {
      const res = await fetch('/api/free-khata/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          phone: newPhone.trim() || null,
          notes: newNotes.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to add contact');
      }

      setNewName('');
      setNewPhone('');
      setNewNotes('');
      setAddPersonModalOpen(false);
      fetchContacts();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setSavingPerson(false);
    }
  };

  const handleDeleteContact = async (contactId: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to delete ${name} and all their entries? This cannot be undone.`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/free-khata/contacts/${contactId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete contact');
      fetchContacts();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error deleting contact');
    }
  };

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.notes && c.notes.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-5 pb-16 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && window.history.length > 1) {
                  router.back();
                } else {
                  router.push('/free-khata');
                }
              }}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Back to previous screen"
              aria-label="Back to previous screen"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-xl sm:text-2xl font-black text-[#071F38]">
              All People & Contacts
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 ml-8">
            Manage your personal lending directory • Unlimited people
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setModalError(null);
            setAddPersonModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#00B887] hover:bg-[#009E74] text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Add New Person</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or mobile number..."
          className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#00B887]/30 focus:border-[#00B887]"
        />
      </div>

      {/* Contacts List Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Directory ({filtered.length})
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No contacts found. Click "+ Add New Person" to get started.
            </div>
          ) : (
            filtered.map((c) => {
              const willGet = c.netBalance > 0;
              const willPay = c.netBalance < 0;
              const isSettled = c.netBalance === 0;

              return (
                <div
                  key={c.id}
                  className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3 group"
                >
                  <Link
                    href={`/free-khata/person/${c.id}`}
                    className="flex items-center gap-3.5 min-w-0 flex-1"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#071F38] font-black text-xs flex items-center justify-center shrink-0">
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs sm:text-sm text-[#071F38] truncate group-hover:text-[#008F91] transition-colors">
                          {c.name}
                        </strong>
                        {c.phone && (
                          <span className="text-[11px] text-slate-400 font-mono">
                            ({c.phone})
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {c.transactionCount} transactions • Last:{' '}
                        {formatDate(c.lastActivityDate)}
                      </div>
                    </div>
                  </Link>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      {willGet && (
                        <>
                          <span className="text-xs sm:text-sm font-black text-[#00B887] block">
                            ₹{c.netBalance.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            You'll Get
                          </span>
                        </>
                      )}
                      {willPay && (
                        <>
                          <span className="text-xs sm:text-sm font-black text-rose-600 block">
                            ₹{Math.abs(c.netBalance).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                            You'll Pay
                          </span>
                        </>
                      )}
                      {isSettled && (
                        <span className="text-[11px] font-bold text-slate-400">
                          Settled
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteContact(c.id, c.name)}
                      title="Delete Person"
                      className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <Link
                      href={`/free-khata/person/${c.id}`}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add New Person Modal */}
      {addPersonModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-sm text-[#071F38]">Add New Person</h3>
              <button
                type="button"
                onClick={() => setAddPersonModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {modalError}
              </div>
            )}

            <form onSubmit={handleAddPerson} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Suresh Verma"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#00B887]/30 focus:border-[#00B887]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Number <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="10-digit mobile"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#00B887]/30 focus:border-[#00B887]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notes <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Neighbor, College friend..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#00B887]/30 focus:border-[#00B887]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddPersonModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPerson}
                  className="px-4 py-2 bg-[#00B887] hover:bg-[#009E74] text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  {savingPerson ? 'Saving...' : 'Add Person'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      <WhatsAppReminderModal
        isOpen={waModalOpen}
        onClose={() => setWaModalOpen(false)}
        target={waTarget}
        onPhoneUpdated={fetchContacts}
      />
    </div>
  );
}

export default function ContactsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-slate-400">Loading contacts...</div>}>
      <ContactsContent />
    </Suspense>
  );
}
