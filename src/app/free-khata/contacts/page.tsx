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
  Edit2,
} from 'lucide-react';
import { WhatsAppReminderModal, WhatsAppReminderTarget } from '@/components/free-khata/WhatsAppReminderModal';
import { ContactEditModal, EditableKhataContact } from '@/components/free-khata/ContactEditModal';
import { formatDate } from '@/lib/services/khataService';
import { useTranslation } from '@/i18n/context';

interface ContactItem {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  totalGiven: number;
  totalTaken: number;
  amountToReceive: number;
  amountToPay: number;
  netPosition: number;
  status: 'TO_RECEIVE' | 'TO_PAY' | 'SETTLED';
  statusLabel: string;
  transactionCount: number;
  lastActivityDate: string;
}

function ContactsContent() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const isHi = locale === 'hi';
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
  const [editingContact, setEditingContact] = useState<EditableKhataContact | null>(null);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);

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
      setModalError('कृपया वैध नाम दर्ज करें (कम से कम 2 अक्षर)।');
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
      setModalError(err instanceof Error ? err.message : 'Error saving contact');
    } finally {
      setSavingPerson(false);
    }
  };

  const handleOpenWhatsApp = (c: ContactItem) => {
    const outstanding = c.amountToReceive > 0 ? c.amountToReceive : c.amountToPay;
    setWaTarget({
      contactId: c.id,
      contactName: c.name,
      phone: c.phone,
      amount: outstanding,
      date: c.lastActivityDate,
      type: c.amountToReceive >= c.amountToPay ? 'GAVE' : 'RECEIVED',
    });
    setWaModalOpen(true);
  };

  const handleDeleteContact = async (c: ContactItem) => {
    const msg = isHi
      ? `क्या आप संपर्क "${c.name}" और उनके सभी ${c.transactionCount} लेन-देन स्थायी रूप से हटाना चाहते हैं?`
      : `Permanently delete contact "${c.name}" and all ${c.transactionCount} linked transactions?`;
    if (!confirm(msg)) return;
    setDeletingContactId(c.id);
    try {
      const res = await fetch(`/api/free-khata/contacts/${c.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete contact');
      }
      fetchContacts();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete contact');
    } finally {
      setDeletingContactId(null);
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
    <div className="space-y-5 pb-24 md:pb-12 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-xl sm:text-2xl font-black text-[#071F38]">
              मेरे संपर्क (Contacts)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 ml-8">
            Personal Khata • Har paise ka hisaab, bilkul aasaan.
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
          <span>+ नया व्यक्ति जोड़ें</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="नाम या मोबाइल नंबर से खोजें..."
          className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#00B887]/30 focus:border-[#00B887]"
        />
      </div>

      {/* Contacts List Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            संपर्क सूची ({filtered.length})
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              कोई संपर्क नहीं मिला। नया संपर्क जोड़ने के लिए &quot;+ नया व्यक्ति जोड़ें&quot; पर क्लिक करें।
            </div>
          ) : (
            filtered.map((c) => {
              const willGet = c.amountToReceive > 0;
              const willPay = c.amountToPay > 0;
              const isSettled = !willGet && !willPay;

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
                        <strong className="text-xs sm:text-sm text-[#071F38] truncate group-hover:text-[#EA580C] transition-colors">
                          {c.name}
                        </strong>
                        {c.phone && (
                          <span className="text-[11px] text-slate-400 font-mono">
                            ({c.phone})
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {c.transactionCount} लेन-देन • अंतिम:{' '}
                        {formatDate(c.lastActivityDate)}
                      </div>
                    </div>
                  </Link>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      {willGet && (
                        <>
                          <span className="text-xs sm:text-sm font-black text-[#00B887] block">
                            ₹{c.amountToReceive.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            मुझे लेने हैं
                          </span>
                        </>
                      )}
                      {willPay && (
                        <>
                          <span className="text-xs sm:text-sm font-black text-rose-600 block">
                            ₹{c.amountToPay.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                            मुझे देने हैं
                          </span>
                        </>
                      )}
                      {isSettled && (
                        <span className="text-[11px] font-bold text-slate-400">
                          हिसाब पूरा
                        </span>
                      )}
                    </div>

                    {c.phone && (c.amountToReceive > 0 || c.amountToPay > 0) && (
                      <button
                        type="button"
                        onClick={() => handleOpenWhatsApp(c)}
                        title={isHi ? 'WhatsApp तकादा' : 'WhatsApp Reminder'}
                        className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setEditingContact(c)}
                      title={isHi ? 'संपर्क संपादित करें' : 'Edit Contact'}
                      className="p-2 text-slate-500 hover:text-[#071F38] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      disabled={deletingContactId === c.id}
                      onClick={() => handleDeleteContact(c)}
                      title={isHi ? 'संपर्क हटाएं' : 'Delete Contact'}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <Link
                      href={`/free-khata/person/${c.id}`}
                      className="p-1.5 text-slate-400 group-hover:text-slate-700 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Person Modal */}
      {addPersonModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-black text-[#071F38] mb-1">
              {isHi ? 'नया संपर्क जोड़ें' : 'Add New Person'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {isHi ? 'व्यक्ति का नाम और वैकल्पिक मोबाइल नंबर दर्ज करें' : 'Enter person name and optional mobile number'}
            </p>

            {modalError && (
              <div className="p-3 mb-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
                {modalError}
              </div>
            )}

            <form onSubmit={handleAddPerson} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isHi ? 'व्यक्ति का नाम' : 'Person Name'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Ramesh Sharma"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B887]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isHi ? 'मोबाइल नंबर (वैकल्पिक)' : 'Mobile Number (Optional)'}
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B887]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isHi ? 'टिप्पणी (वैकल्पिक)' : 'Notes / Remarks (Optional)'}
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Colleague, Neighbor, Client"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B887]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddPersonModalOpen(false)}
                  disabled={savingPerson}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  {isHi ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={savingPerson || !newName.trim()}
                  className="px-4 py-2 bg-[#00B887] hover:bg-[#009E74] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {savingPerson ? (isHi ? 'सहेज रहे हैं...' : 'Saving...') : (isHi ? 'संपर्क जोड़ें' : 'Add Person')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {waModalOpen && waTarget && (
        <WhatsAppReminderModal
          isOpen={waModalOpen}
          onClose={() => {
            setWaModalOpen(false);
            setWaTarget(null);
          }}
          target={waTarget}
        />
      )}

      {editingContact && (
        <ContactEditModal
          isOpen={Boolean(editingContact)}
          onClose={() => setEditingContact(null)}
          onSuccess={() => {
            setEditingContact(null);
            fetchContacts();
          }}
          contact={editingContact}
        />
      )}
    </div>
  );
}

export default function ContactsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading contacts...</div>}>
      <ContactsContent />
    </Suspense>
  );
}
