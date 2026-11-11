'use client';

import React, { useState, useEffect } from 'react';
import { ModulePageShell } from '@/components/shared/ModulePageShell';
import { useToast } from '@/context/ToastContext';
import { useEntitlements } from '@/hooks/useEntitlements';
import { FeatureNotAvailable } from '@/components/shared/FeatureNotAvailable';
import { Plus, Search, Trash2, Edit2, Receipt, Calendar, CreditCard, Tag, X } from 'lucide-react';

interface Expense {
  id: string;
  category: string;
  payee?: string | null;
  description?: string | null;
  amount: number;
  paymentMethod: string;
  expenseDate: string;
  referenceNumber?: string | null;
}

const CATEGORIES = [
  'Logistics & Freight',
  'Shop Utilities',
  'Rent & Office',
  'Staff & Wages',
  'Refreshments & Petty Cash',
  'Packaging & Supplies',
  'Repairs & Maintenance',
  'Marketing & Advertising',
  'Other Overhead',
];

export default function ExpensesPage() {
  const toast = useToast();
  const { canAccessCommercial } = useEntitlements();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // New expense form state
  const [formCategory, setFormCategory] = useState(CATEGORIES[0]);
  const [formPayee, setFormPayee] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState('CASH');
  const [formExpenseDate, setFormExpenseDate] = useState('');
  const [formReferenceNumber, setFormReferenceNumber] = useState('');

  useEffect(() => {
    setFormExpenseDate(new Date().toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (!canAccessCommercial) return;
    fetchExpenses();
  }, [categoryFilter, search, canAccessCommercial]);

  const fetchExpenses = async () => {
    if (!canAccessCommercial) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (categoryFilter !== 'ALL') params.set('category', categoryFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/expenses?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load expenses');
      const data = await res.json();
      setExpenses(data.expenses || []);
      setTotalAmount(data.summary?.totalAmount || 0);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error fetching expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingExpenseId(null);
    setFormCategory(CATEGORIES[0]);
    setFormPayee('');
    setFormDescription('');
    setFormAmount('');
    setFormPaymentMethod('CASH');
    setFormExpenseDate(new Date().toISOString().split('T')[0]);
    setFormReferenceNumber('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (exp: Expense) => {
    setEditingExpenseId(exp.id);
    setFormCategory(CATEGORIES.includes(exp.category) ? exp.category : CATEGORIES[0]);
    setFormPayee(exp.payee || '');
    setFormDescription(exp.description || '');
    setFormAmount(String(exp.amount));
    setFormPaymentMethod(exp.paymentMethod || 'CASH');
    setFormExpenseDate(new Date(exp.expenseDate).toISOString().split('T')[0]);
    setFormReferenceNumber(exp.referenceNumber || '');
    setIsModalOpen(true);
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/expenses', {
        method: editingExpenseId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingExpenseId ? { id: editingExpenseId } : {}),
          category: formCategory,
          payee: formPayee,
          description: formDescription,
          amount: amountNum,
          paymentMethod: formPaymentMethod,
          expenseDate: formExpenseDate,
          referenceNumber: formReferenceNumber,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save expense');

      toast.success(editingExpenseId ? 'Expense updated successfully!' : 'Expense recorded successfully!');
      setIsModalOpen(false);
      setEditingExpenseId(null);
      // Reset form
      setFormPayee('');
      setFormDescription('');
      setFormAmount('');
      setFormReferenceNumber('');
      fetchExpenses();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error saving expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense record?')) return;
    try {
      const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete expense');

      toast.success('Expense record removed');
      fetchExpenses();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error deleting expense');
    }
  };

  if (!canAccessCommercial) {
    return (
      <FeatureNotAvailable
        featureName="Business Expense Management"
        requiredPlanName="Starter, Growth or Scale"
        description="Overheads, utility payments, and petty cash voucher management are commercial tools available on Starter, Growth, and Scale plans."
      />
    );
  }

  return (
    <ModulePageShell
      title="Expenses & Petty Cash"
      description="Track store overheads, logistics, utility bills, staff wages, and petty cash vouchers with full accounting records."
      targetPhase="Operational Accounting"
    >
      <div className="space-y-6">
        {/* Top Summary Banner & Action */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Recorded Overheads
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
              ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Across all matching records</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Expense Vouchers Count
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
              {expenses.length}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Logged transactions</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Quick Action
              </span>
              <p className="text-xs text-slate-600 mt-1">Record a new outlay or voucher</p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Record Expense</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setCategoryFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                categoryFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Categories
            </button>
            {CATEGORIES.slice(0, 4).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  categoryFilter === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search payee, ref, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
            />
          </div>
        </div>

        {/* Expenses Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Payee / Description</th>
                  <th className="py-3 px-4">Mode / Ref</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Loading recorded expenses...
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No expenses recorded yet. Click &quot;Record Expense&quot; to log your first voucher.
                    </td>
                  </tr>
                ) : (
                  expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-slate-500 font-mono">
                        {new Date(e.expenseDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px]">
                          {e.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900">{e.payee || 'Direct Expense'}</div>
                        {e.description && (
                          <div className="text-[11px] text-slate-500 mt-0.5">{e.description}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                        <div>{e.paymentMethod}</div>
                        {e.referenceNumber && (
                          <div className="text-[10px] text-slate-400">Ref: {e.referenceNumber}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 font-mono text-xs tabular-nums">
                        ₹{e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(e)}
                            className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
                            title="Edit expense"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(e.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Delete expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Record / Edit Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  {editingExpenseId ? 'Edit Expense Voucher' : 'Record Operational Expense'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingExpenseId(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Payee / Vendor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Electricity Board, Transport Co"
                    value={formPayee}
                    onChange={(e) => setFormPayee(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Payment Method</label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="CASH">Cash (Petty Cash)</option>
                    <option value="UPI">UPI Transfer</option>
                    <option value="BANK_TRANSFER">Bank IMPS / NEFT</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CARD">Credit / Debit Card</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Expense Date</label>
                  <input
                    type="date"
                    required
                    value={formExpenseDate}
                    onChange={(e) => setFormExpenseDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Voucher / Ref Number</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-98741 or Bill #102"
                    value={formReferenceNumber}
                    onChange={(e) => setFormReferenceNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional details or purpose of expenditure..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
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
                  {submitting ? 'Saving...' : editingExpenseId ? 'Update Expense' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ModulePageShell>
  );
}
