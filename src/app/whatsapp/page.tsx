'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  ShieldCheck,
  Send,
  Clock,
  Settings,
  ListFilter,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Play,
  Pause,
  Key,
  Users,
  FileText,
  Calendar,
  Loader2,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { WhatsAppShareModal } from '@/components/whatsapp/WhatsAppShareModal';

interface WhatsAppConfigData {
  id: string;
  businessId: string;
  status: 'NOT_CONFIGURED' | 'CONNECTED' | 'ERROR';
  phoneNumberId: string | null;
  wabaId: string | null;
  hasAccessToken: boolean;
  maskedAccessToken: string;
  webhookVerifyToken: string | null;
  businessDisplayName: string | null;
  autoRemindersEnabled: boolean;
  reminderDaysBeforeDue: number;
  reminderOnDueDate: boolean;
  reminderDaysAfterDue: number;
  quietHoursStart: number;
  quietHoursEnd: number;
  isPaused: boolean;
}

interface MessageLogItem {
  id: string;
  recipientPhone: string;
  recipientName: string | null;
  messageType: 'INVOICE_SHARE' | 'PAYMENT_RECEIPT' | 'ACCOUNT_STATEMENT' | 'PAYMENT_REMINDER';
  status: 'QUEUED' | 'SUBMITTED' | 'DELIVERED' | 'READ' | 'FAILED';
  contentSummary: string;
  errorMessage: string | null;
  actor: string | null;
  sentAt: string;
  deliveredAt: string | null;
  readAt: string | null;
  customer?: { name: string; mobile: string } | null;
  invoice?: { invoiceNumber: string; total: number; balanceDue: number } | null;
}

interface ReminderCandidate {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  dueDate: string;
  balanceDue: number;
  triggerType: 'ON_DUE_DATE' | 'BEFORE_DUE_DATE' | 'AFTER_DUE_DATE';
  daysDifference: number;
  shareUrl: string;
  messageText: string;
}

export default function WhatsAppHubPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'reminders' | 'credentials' | 'logs'>('overview');
  const [config, setConfig] = useState<WhatsAppConfigData | null>(null);
  const [logs, setLogs] = useState<MessageLogItem[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  // Form state for credentials
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [webhookVerifyToken, setWebhookVerifyToken] = useState('');
  const [businessDisplayName, setBusinessDisplayName] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Reminders settings form state
  const [autoRemindersEnabled, setAutoRemindersEnabled] = useState(false);
  const [reminderOnDueDate, setReminderOnDueDate] = useState(true);
  const [reminderDaysBeforeDue, setReminderDaysBeforeDue] = useState(3);
  const [reminderDaysAfterDue, setReminderDaysAfterDue] = useState(3);
  const [quietHoursStart, setQuietHoursStart] = useState(21);
  const [quietHoursEnd, setQuietHoursEnd] = useState(9);
  const [isPaused, setIsPaused] = useState(false);

  // Reminder trigger / test modal
  const [evaluatingReminders, setEvaluatingReminders] = useState(false);
  const [reminderSummary, setReminderSummary] = useState<{
    candidatesFound: number;
    sentCount: number;
    skippedDueToQuietHours: number;
    skippedDueToOptOut: number;
    skippedDueToDuplicate: number;
    candidates: ReminderCandidate[];
    errors: string[];
  } | null>(null);
  const [showReminderResultsModal, setShowReminderResultsModal] = useState(false);
  const [executingReminders, setExecutingReminders] = useState(false);

  // Quick share modal state
  const [quickShareOpen, setQuickShareOpen] = useState(false);
  const [quickShareCustomer, setQuickShareCustomer] = useState('');
  const [quickSharePhone, setQuickSharePhone] = useState('');
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch('/api/whatsapp/config');
      const data = await res.json();
      if (res.ok && data.success && data.config) {
        const c = data.config;
        setConfig(c);
        setPhoneNumberId(c.phoneNumberId || '');
        setWabaId(c.wabaId || '');
        setWebhookVerifyToken(c.webhookVerifyToken || '');
        setBusinessDisplayName(c.businessDisplayName || '');
        setAutoRemindersEnabled(c.autoRemindersEnabled);
        setReminderOnDueDate(c.reminderOnDueDate);
        setReminderDaysBeforeDue(c.reminderDaysBeforeDue);
        setReminderDaysAfterDue(c.reminderDaysAfterDue);
        setQuietHoursStart(c.quietHoursStart);
        setQuietHoursEnd(c.quietHoursEnd);
        setIsPaused(c.isPaused);
      }
    } catch {
      // ignore
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const url = statusFilter
        ? `/api/whatsapp/logs?status=${statusFilter}`
        : '/api/whatsapp/logs';
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        setLogs(data.logs || []);
        setTotalLogs(data.totalCount || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoadingLogs(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchConfig();
    fetchLogs();
  }, [fetchConfig, fetchLogs]);

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/whatsapp/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumberId,
          wabaId,
          accessToken: accessToken || undefined,
          webhookVerifyToken,
          businessDisplayName,
          autoRemindersEnabled,
          reminderOnDueDate,
          reminderDaysBeforeDue: Number(reminderDaysBeforeDue),
          reminderDaysAfterDue: Number(reminderDaysAfterDue),
          quietHoursStart: Number(quietHoursStart),
          quietHoursEnd: Number(quietHoursEnd),
          isPaused,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConfig(data.config);
        setAccessToken('');
        setTestResult({ success: true, message: 'Settings saved successfully!' });
      } else {
        setTestResult({ success: false, message: data.error || 'Failed to update credentials' });
      }
    } catch {
      setTestResult({ success: false, message: 'Network error saving configuration' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/whatsapp/config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumberId: phoneNumberId || undefined,
          accessToken: accessToken || undefined,
        }),
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message || (data.success ? 'Connected successfully!' : 'Connection failed'),
      });
      if (data.success) {
        fetchConfig();
      }
    } catch {
      setTestResult({ success: false, message: 'Network error testing connection' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleTogglePause = async () => {
    if (!config) return;
    const newPause = !isPaused;
    setIsPaused(newPause);
    try {
      const res = await fetch('/api/whatsapp/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaused: newPause }),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
      }
    } catch {
      setIsPaused(!newPause);
    }
  };

  const handleRunReminderCheck = async (dryRun: boolean = true) => {
    setEvaluatingReminders(true);
    try {
      const res = await fetch('/api/whatsapp/reminders/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun, ignoreQuietHours: true }),
      });
      const data = await res.json();
      if (data.success) {
        setReminderSummary(data.summary);
        setShowReminderResultsModal(true);
        toast.info(dryRun ? 'Dry-run evaluation complete' : 'Reminders evaluated');
      } else {
        toast.error(data.error || 'Failed to run reminder check');
      }
    } catch {
      toast.error('Network error executing reminder engine');
    } finally {
      setEvaluatingReminders(false);
    }
  };

  const handleExecuteRemindersNow = async () => {
    setExecutingReminders(true);
    try {
      const res = await fetch('/api/whatsapp/reminders/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false, ignoreQuietHours: true }),
      });
      const data = await res.json();
      if (data.success) {
        setReminderSummary(data.summary);
        toast.success(`Dispatched ${data.summary?.sent || 0} reminders successfully!`);
        fetchLogs();
      } else {
        toast.error(data.error || 'Failed to dispatch reminders');
      }
    } catch {
      toast.error('Error dispatching reminders');
    } finally {
      setExecutingReminders(false);
    }
  };

  const webhookCallbackUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/whatsapp/webhook`
    : '/api/whatsapp/webhook';

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookCallbackUrl);
    setCopiedWebhookUrl(true);
    toast.success('Webhook URL copied to clipboard');
    setTimeout(() => setCopiedWebhookUrl(false), 2000);
  };

  const isCloudConnected = config?.status === 'CONNECTED';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                WhatsApp Messaging & Reminders
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Share bills, payment receipts, khata summaries and schedule automated overdue reminders.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {config?.isPaused ? (
            <button
              onClick={handleTogglePause}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-xl border border-amber-300 transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Resume Reminders</span>
            </button>
          ) : (
            <button
              onClick={handleTogglePause}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause Reminders</span>
            </button>
          )}

          <button
            onClick={() => handleRunReminderCheck(true)}
            disabled={evaluatingReminders}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {evaluatingReminders ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span>Check Due Reminders</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Overview & Quick Share</span>
        </button>

        <button
          onClick={() => setActiveTab('reminders')}
          className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'reminders'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Automated Reminders & Rules</span>
        </button>

        <button
          onClick={() => setActiveTab('credentials')}
          className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'credentials'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Official Meta Cloud API</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'logs'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ListFilter className="w-4 h-4" />
          <span>Message Logs & Delivery ({totalLogs})</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & QUICK SHARE */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Status KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                Platform Integration
              </span>
              <div className="flex items-center gap-2 pt-1">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    isCloudConnected
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : config?.status === 'ERROR'
                      ? 'bg-rose-50 text-rose-800 border-rose-300'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  {isCloudConnected ? 'Cloud API Connected' : config?.status === 'ERROR' ? 'Connection Error' : 'Manual Links Only'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                {isCloudConnected
                  ? `Verified Display: ${config?.businessDisplayName || 'Business Profile'}`
                  : 'Manual click-to-chat links available for all bills and receipts.'}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                Automated Reminders
              </span>
              <div className="flex items-center gap-2 pt-1">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    config?.isPaused
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : config?.autoRemindersEnabled
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  {config?.isPaused ? 'Paused' : config?.autoRemindersEnabled ? 'Enabled' : 'Disabled (Manual)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                Rules: On due date & {config?.reminderDaysBeforeDue || 3}d before / after.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                Messages Logged
              </span>
              <p className="text-2xl font-black font-mono text-slate-900 pt-0.5">{totalLogs}</p>
              <p className="text-[11px] text-slate-500">
                Audited WhatsApp shares and automated messages.
              </p>
            </div>
          </div>

          {/* Quick Share Feature Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Manual WhatsApp Click-to-Chat Action
                </h3>
                <p className="text-xs text-slate-500">
                  Generate an instant WhatsApp message for any customer number with a single tap.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickShareOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Launch Quick Share</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Invoice & Bill Sharing</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Available directly on every invoice detail page with authorized time-limited PDF access links.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Payment Receipts</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Dispatched whenever a payment is logged against an invoice with remaining balance details.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>Khata Account Statements</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Shared from the customer details ledger, showing net outstanding balances and credit history.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUTOMATED REMINDERS & RULES */}
      {activeTab === 'reminders' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Payment Reminder Configuration
            </h3>
            <p className="text-xs text-slate-500">
              Define when overdue bills trigger reminders and enforce quiet hours.
            </p>
          </div>

          <form onSubmit={handleSaveCredentials} className="space-y-6 text-xs">
            {/* Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Automated Dispatch</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    When active, reminders are automatically sent via Cloud API. If disabled, reminders are queued for manual 1-click sharing.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoRemindersEnabled}
                  onChange={(e) => setAutoRemindersEnabled(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 mt-1"
                />
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Emergency Pause</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Instantly stops all automated reminder evaluation and outgoing messages for this business.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isPaused}
                  onChange={(e) => setIsPaused(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 mt-1"
                />
              </div>
            </div>

            {/* Reminder Schedule Rules */}
            <div className="p-4 rounded-xl border border-slate-200 space-y-4">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Schedule Rules & Intervals
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Reminder on Due Date
                  </label>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="onDueDate"
                      checked={reminderOnDueDate}
                      onChange={(e) => setReminderOnDueDate(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <label htmlFor="onDueDate" className="text-slate-600 cursor-pointer">
                      Send reminder on the exact due date
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Days Before Due Date
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="14"
                    value={reminderDaysBeforeDue}
                    onChange={(e) => setReminderDaysBeforeDue(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">e.g. 3 days before payment is due</p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Days After Due Date (Overdue)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={reminderDaysAfterDue}
                    onChange={(e) => setReminderDaysAfterDue(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">e.g. 3 days after overdue status</p>
                </div>
              </div>
            </div>

            {/* Quiet Hours */}
            <div className="p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Quiet Hours Enforcement (24-Hour Clock)
                </h4>
              </div>
              <p className="text-[11px] text-slate-500">
                Messages will not be sent to customers during quiet hours (default: 9:00 PM to 9:00 AM).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Quiet Hours Start (Hour 0-23)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={quietHoursStart}
                    onChange={(e) => setQuietHoursStart(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">21 = 9:00 PM</p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Quiet Hours End (Hour 0-23)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={quietHoursEnd}
                    onChange={(e) => setQuietHoursEnd(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">9 = 9:00 AM</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={savingConfig}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {savingConfig ? 'Saving...' : 'Save Reminder Preferences'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: OFFICIAL WHATSAPP CLOUD API */}
      {activeTab === 'credentials' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Official WhatsApp Business Platform (Cloud API)
            </h3>
            <p className="text-xs text-slate-500">
              Configure credentials from Meta for Developers to enable automated server-to-server messaging.
            </p>
          </div>

          <form onSubmit={handleSaveCredentials} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Meta Phone Number ID *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 104829105829104"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  WhatsApp Business Account ID (WABA ID)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 293810293810293"
                  value={wabaId}
                  onChange={(e) => setWabaId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Permanent System User Access Token *
              </label>
              <input
                type="password"
                placeholder={config?.hasAccessToken ? config.maskedAccessToken : 'Enter Meta EAAB... token'}
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Stored securely on the server and never returned in plaintext.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Webhook Verification Token
                </label>
                <input
                  type="text"
                  placeholder="e.g. lenden_meta_verify_secret"
                  value={webhookVerifyToken}
                  onChange={(e) => setWebhookVerifyToken(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Verified Business Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sharma Traders (Official)"
                  value={businessDisplayName}
                  onChange={(e) => setBusinessDisplayName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            {/* Webhook Callback Display */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 text-xs block">
                Meta Webhook Callback URL
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookCallbackUrl}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-[11px] text-slate-600 select-all"
                />
                <button
                  type="button"
                  onClick={copyWebhookUrl}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg text-xs"
                >
                  {copiedWebhookUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWebhookUrl ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Configure this URL in the Meta WhatsApp App dashboard under Webhooks subscription.
              </p>
            </div>

            {/* Test result banner */}
            {testResult && (
              <div
                className={`p-3 rounded-xl border flex items-center gap-2 text-xs ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {testingConnection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Test Connection</span>
              </button>

              <button
                type="submit"
                disabled={savingConfig}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {savingConfig ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: MESSAGE LOGS & AUDIT TRAIL */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                WhatsApp Dispatch Audit Ledger
              </h3>
              <p className="text-xs text-slate-500">
                Real-time delivery events and logs for manual shares and automated reminders.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
              >
                <option value="">All Statuses</option>
                <option value="QUEUED">Queued</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="DELIVERED">Delivered</option>
                <option value="READ">Read</option>
                <option value="FAILED">Failed</option>
              </select>

              <button
                onClick={fetchLogs}
                disabled={loadingLogs}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
                title="Refresh Logs"
              >
                <RefreshCw className={`w-4 h-4 ${loadingLogs ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {logs.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No WhatsApp messages recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-4">Date / Time</th>
                    <th className="py-2.5 px-3">Recipient</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Summary</th>
                    <th className="py-2.5 px-3">Actor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 text-slate-600 font-sans">
                        {new Date(log.sentAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3 text-slate-900">
                        <span className="font-sans font-semibold block">{log.recipientName || 'Customer'}</span>
                        <span className="text-[10px] text-slate-400">{log.recipientPhone}</span>
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {log.messageType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                            log.status === 'DELIVERED' || log.status === 'READ'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : log.status === 'FAILED'
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : log.status === 'QUEUED'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-blue-50 text-blue-800 border-blue-300'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate font-sans text-[11px]" title={log.contentSummary}>
                        {log.contentSummary}
                        {log.errorMessage && (
                          <span className="block text-rose-600 text-[10px] truncate">{log.errorMessage}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-sans text-[10px]">
                        {log.actor || 'System'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reminder Results Evaluation Modal */}
      {showReminderResultsModal && reminderSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Due Invoices & Reminder Candidates ({reminderSummary.candidatesFound})
                </h3>
              </div>
              <button
                onClick={() => setShowReminderResultsModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Eligible Bills</span>
                  <p className="text-base font-bold text-slate-900">{reminderSummary.candidatesFound}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Quiet Hours Skipped</span>
                  <p className="text-base font-bold text-slate-900">{reminderSummary.skippedDueToQuietHours}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Opted-Out</span>
                  <p className="text-base font-bold text-slate-900">{reminderSummary.skippedDueToOptOut}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Duplicate Today</span>
                  <p className="text-base font-bold text-slate-900">{reminderSummary.skippedDueToDuplicate}</p>
                </div>
              </div>

              {reminderSummary.candidates.length === 0 ? (
                <div className="p-8 text-center text-slate-400 border border-slate-100 rounded-xl bg-slate-50/50">
                  No invoices are due or eligible for reminders at this moment.
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Candidate Invoices:
                  </span>
                  {reminderSummary.candidates.map((c) => (
                    <div
                      key={c.invoiceId}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{c.customerName}</span>
                          <span className="font-mono text-slate-500">({c.customerMobile})</span>
                          <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded font-bold">
                            {c.triggerType.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Invoice {c.invoiceNumber} • Due Date: {c.dueDate}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-rose-700">
                          ₹{c.balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowReminderResultsModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Close Preview
              </button>

              {reminderSummary.candidates.length > 0 && (
                <button
                  type="button"
                  onClick={handleExecuteRemindersNow}
                  disabled={executingReminders}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {executingReminders ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isCloudConnected ? 'Dispatch Reminders via Cloud API' : 'Queue Reminders in Log'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Share Launcher Modal */}
      <WhatsAppShareModal
        isOpen={quickShareOpen}
        onClose={() => setQuickShareOpen(false)}
        type="STATEMENT"
        defaultPhone={quickSharePhone}
        defaultName={quickShareCustomer || 'Customer'}
        documentTitle="Quick WhatsApp Share"
      />
    </div>
  );
}
