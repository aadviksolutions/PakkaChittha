'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import {
  Tag,
  Plus,
  RefreshCw,
  Check,
  X,
  Calendar,
  Percent,
  IndianRupee,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';

interface DiscountCodeItem {
  id: string;
  code: string;
  description: string | null;
  type: string;
  value: number;
  applicablePlans: string;
  applicableDurations: string;
  maxDiscountAmount: number | null;
  minPurchaseAmount: number | null;
  totalUsageLimit: number | null;
  usedCount: number;
  perCustomerLimit: number | null;
  startDate: string | null;
  expiryDate: string | null;
  newCustomersOnly: boolean;
  isActive: boolean;
  createdAt: string;
  _count?: { usages: number };
}

export default function PlatformAdminDiscountsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [discounts, setDiscounts] = useState<DiscountCodeItem[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [value, setValue] = useState('');
  const [applicablePlans, setApplicablePlans] = useState('ALL');
  const [applicableDurations, setApplicableDurations] = useState('ALL');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('');
  const [minPurchaseAmount, setMinPurchaseAmount] = useState('');
  const [totalUsageLimit, setTotalUsageLimit] = useState('');
  const [perCustomerLimit, setPerCustomerLimit] = useState('1');
  const [startDate, setStartDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [newCustomersOnly, setNewCustomersOnly] = useState(false);

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/platform-admin/discounts');
      if (!res.ok) throw new Error('Failed to load discount codes');
      const data = await res.json();
      setDiscounts(data.discounts || []);
    } catch (err: any) {
      toast.error(err.message || 'Error fetching discounts');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/platform-admin/discounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      toast.success(`Discount code ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchDiscounts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update code status');
    }
  };

  const handleDelete = async (id: string, codeName: string) => {
    if (!confirm(`Are you sure you want to delete discount code '${codeName}'?`)) return;
    try {
      const res = await fetch(`/api/platform-admin/discounts/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete code');
      toast.success(`Discount code '${codeName}' deleted`);
      fetchDiscounts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete code');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !value) {
      toast.error('Code and Value are required');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/platform-admin/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          description,
          type,
          value: parseFloat(value),
          applicablePlans,
          applicableDurations,
          maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
          minPurchaseAmount: minPurchaseAmount ? parseFloat(minPurchaseAmount) : 0,
          totalUsageLimit: totalUsageLimit ? parseInt(totalUsageLimit, 10) : null,
          perCustomerLimit: perCustomerLimit ? parseInt(perCustomerLimit, 10) : 1,
          startDate: startDate || null,
          expiryDate: expiryDate || null,
          newCustomersOnly,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create discount');

      toast.success(data.message || 'Discount code created successfully!');
      setShowCreateModal(false);
      resetForm();
      fetchDiscounts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create discount');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCode('');
    setDescription('');
    setType('PERCENTAGE');
    setValue('');
    setApplicablePlans('ALL');
    setApplicableDurations('ALL');
    setMaxDiscountAmount('');
    setMinPurchaseAmount('');
    setTotalUsageLimit('');
    setPerCustomerLimit('1');
    setStartDate('');
    setExpiryDate('');
    setNewCustomersOnly(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Tag className="w-6 h-6 text-[#EA580C]" />
            <span>Discount & Promotional Code Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Create coupon codes, enforce usage limits, restrict by plan or duration, and monitor redemptions in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDiscounts}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#EA580C] hover:bg-[#D94E00] shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Discount Code</span>
          </button>
        </div>
      </div>

      {/* Rules Notice */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="block font-bold">Server-Side Validation & Fraud Protection</strong>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            All coupon codes are cryptographically verified against server-authoritative plan prices. Discounts cannot exceed the order amount or cause negative billing. Per-customer and global usage limits are enforced atomically.
          </p>
        </div>
      </div>

      {/* Discounts List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Active & Historical Coupon Codes</h2>
          <span className="text-xs text-slate-500">{discounts.length} Total Codes</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#EA580C] mb-2" />
            <span>Loading discount codes...</span>
          </div>
        ) : discounts.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <Tag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">No discount codes created yet</p>
            <p className="text-slate-400 mt-1">Click &quot;Create Discount Code&quot; to offer promotions to customers.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="p-3.5">Code</th>
                  <th className="p-3.5">Discount</th>
                  <th className="p-3.5">Applicability</th>
                  <th className="p-3.5">Usage / Limit</th>
                  <th className="p-3.5">Validity</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {discounts.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 font-bold">
                      <span className="px-2.5 py-1 rounded-lg bg-orange-50 text-[#EA580C] border border-orange-200 font-mono text-xs">
                        {d.code}
                      </span>
                      {d.description && (
                        <span className="block text-[11px] font-normal text-slate-500 mt-1">
                          {d.description}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="font-extrabold text-slate-900 text-sm">
                        {d.type === 'PERCENTAGE' ? `${d.value}% OFF` : `₹${d.value} FLAT`}
                      </span>
                      {d.maxDiscountAmount && (
                        <span className="block text-[10px] text-slate-400">
                          Max: ₹{d.maxDiscountAmount}
                        </span>
                      )}
                      {d.minPurchaseAmount && d.minPurchaseAmount > 0 ? (
                        <span className="block text-[10px] text-slate-400">
                          Min order: ₹{d.minPurchaseAmount}
                        </span>
                      ) : null}
                    </td>
                    <td className="p-3.5">
                      <div className="space-y-0.5">
                        <span className="text-[11px] text-slate-700 block">
                          <strong>Plans:</strong> {d.applicablePlans}
                        </span>
                        <span className="text-[11px] text-slate-700 block">
                          <strong>Durations:</strong> {d.applicableDurations}
                        </span>
                        {d.newCustomersOnly && (
                          <span className="inline-block text-[10px] bg-purple-50 text-purple-700 font-bold px-1.5 py-0.5 rounded border border-purple-200 mt-0.5">
                            New Customers Only
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 font-mono">
                      <span className="font-bold text-slate-900">{d.usedCount}</span>
                      <span className="text-slate-400">
                        {d.totalUsageLimit !== null ? ` / ${d.totalUsageLimit}` : ' (Unlimited)'}
                      </span>
                      <span className="block text-[10px] text-slate-400 font-sans">
                        Per customer: {d.perCustomerLimit ?? 'Unlimited'}
                      </span>
                    </td>
                    <td className="p-3.5 text-[11px] text-slate-600">
                      {d.expiryDate ? (
                        <span>Expires {new Date(d.expiryDate).toLocaleDateString()}</span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">No Expiry</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(d.id, d.isActive)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                          d.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {d.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(d.id, d.code)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete code"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#EA580C]" />
                <span>Create New Discount Code</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Coupon Code *</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. WELCOME50, DIWALI20"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 uppercase font-mono font-bold focus:outline-hidden focus:border-[#EA580C]"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Description (Optional)</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. 50% discount on first month of Starter or Growth"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#EA580C]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Discount Type *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold focus:outline-hidden"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Discount Value * {type === 'PERCENTAGE' ? '(%)' : '(₹)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={type === 'PERCENTAGE' ? '100' : '99999'}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={type === 'PERCENTAGE' ? '25' : '200'}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold focus:outline-hidden focus:border-[#EA580C]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Applicable Plans</label>
                  <select
                    value={applicablePlans}
                    onChange={(e) => setApplicablePlans(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-hidden"
                  >
                    <option value="ALL">All Plans (Starter, Growth, Scale)</option>
                    <option value="STARTER">Starter Only</option>
                    <option value="GROWTH">Growth Only</option>
                    <option value="SCALE">Scale Only</option>
                    <option value="STARTER,GROWTH">Starter &amp; Growth</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Applicable Durations</label>
                  <select
                    value={applicableDurations}
                    onChange={(e) => setApplicableDurations(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-hidden"
                  >
                    <option value="ALL">All Durations (1, 3, 6, 12 Mo)</option>
                    <option value="MONTHLY">1 Month Only</option>
                    <option value="THREE_MONTHS">3 Months Only</option>
                    <option value="SIX_MONTHS">6 Months Only</option>
                    <option value="YEARLY">12 Months (Yearly) Only</option>
                  </select>
                </div>

                {type === 'PERCENTAGE' && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Max Cap Amount (₹)</label>
                    <input
                      type="number"
                      value={maxDiscountAmount}
                      onChange={(e) => setMaxDiscountAmount(e.target.value)}
                      placeholder="e.g. 500 (Optional)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Min Order Amount (₹)</label>
                  <input
                    type="number"
                    value={minPurchaseAmount}
                    onChange={(e) => setMinPurchaseAmount(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Total Usage Limit</label>
                  <input
                    type="number"
                    value={totalUsageLimit}
                    onChange={(e) => setTotalUsageLimit(e.target.value)}
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Per-Customer Limit</label>
                  <input
                    type="number"
                    value={perCustomerLimit}
                    onChange={(e) => setPerCustomerLimit(e.target.value)}
                    placeholder="1"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden"
                  />
                </div>

                <div className="col-span-2 flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="newCust"
                    checked={newCustomersOnly}
                    onChange={(e) => setNewCustomersOnly(e.target.checked)}
                    className="w-4 h-4 text-[#EA580C] rounded"
                  />
                  <label htmlFor="newCust" className="font-semibold text-slate-700 cursor-pointer">
                    Only allow for first-time subscribers (New Customers Only)
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl font-bold text-white bg-[#EA580C] hover:bg-[#D94E00] shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Save & Publish Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
