'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ModulePageShell } from '@/components/shared/ModulePageShell';
import {
  Printer,
  Bluetooth,
  BluetoothConnected,
  BluetoothOff,
  CheckCircle2,
  AlertTriangle,
  FileText,
  RotateCw,
  Sparkles,
  Settings2,
  Sliders,
  Smartphone,
  Info,
  Check,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import {
  PaperWidth,
  PrinterConfig,
  getSavedPrinterConfig,
  savePrinterConfig,
  isWebBluetoothSupported,
  bluetoothPrinter,
  buildTestReceiptBytes,
} from '@/lib/printer/bluetoothPrinter';

export default function PrinterSettingsPage() {
  const toast = useToast();
  const { activeBusiness } = useAuth();

  const [supported, setSupported] = useState(true);
  const [config, setConfig] = useState<PrinterConfig>(getSavedPrinterConfig());
  const [isConnected, setIsConnected] = useState(false);
  const [connectedName, setConnectedName] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setSupported(isWebBluetoothSupported());
    const initial = getSavedPrinterConfig();
    setConfig(initial);
    setIsConnected(bluetoothPrinter.isConnected);
    setConnectedName(bluetoothPrinter.connectedDeviceName || initial.deviceName || null);
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await bluetoothPrinter.connect(() => {
        setIsConnected(false);
        setConnectedName(null);
        toast.info('Bluetooth printer disconnected.');
      });

      setIsConnected(true);
      setConnectedName(res.deviceName);
      const updated = savePrinterConfig({ deviceName: res.deviceName, deviceId: res.deviceId });
      setConfig(updated);
      toast.success(`Connected to ${res.deviceName}!`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to connect Bluetooth printer.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await bluetoothPrinter.disconnect();
      setIsConnected(false);
      setConnectedName(null);
      toast.info('Printer disconnected.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error disconnecting.');
    }
  };

  const handleWidthChange = (paperWidth: PaperWidth) => {
    const updated = savePrinterConfig({ paperWidth });
    setConfig(updated);
    toast.success(`Paper size set to ${paperWidth}.`);
  };

  const handleToggleAutoCut = () => {
    const updated = savePrinterConfig({ autoCut: !config.autoCut });
    setConfig(updated);
  };

  const handleTestPrint = async () => {
    setTesting(true);
    try {
      const bizName = activeBusiness?.name || 'PakkaChittha Store';
      const testBytes = buildTestReceiptBytes(bizName, config.paperWidth);

      if (bluetoothPrinter.isConnected) {
        await bluetoothPrinter.sendRaw(testBytes);
        toast.success('Test receipt sent to Bluetooth printer!');
      } else {
        // Fallback: System print preview
        toast.info('Bluetooth printer not connected. Opening system thermal print preview.');
        window.print();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to print test receipt.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <ModulePageShell
      title="Thermal Printer & Bluetooth Settings"
      description="Configure Bluetooth thermal printers (58 mm / 80 mm) and POS receipt layouts for your bills, invoices, and quotations."
      targetPhase="All Subscription Plans"
    >
      <div className="space-y-6 max-w-5xl">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <Link
            href="/settings"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            ← Business Profile
          </Link>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
            Thermal &amp; Bluetooth Printer
          </span>
        </div>

        {/* 1. Bluetooth Connection Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                  isConnected
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    : 'bg-slate-100 border-slate-200 text-slate-500'
                }`}
              >
                {isConnected ? (
                  <BluetoothConnected className="w-6 h-6 animate-pulse" />
                ) : (
                  <Bluetooth className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-slate-900">
                    Bluetooth Thermal Printer
                  </h2>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isConnected
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    {isConnected ? 'ONLINE / CONNECTED' : 'NOT CONNECTED'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Connect to wireless Bluetooth ESC/POS receipt printers on Chrome, Edge, and Android devices.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isConnected ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-4 py-2 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  type="button"
                  disabled={connecting}
                  onClick={handleConnect}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xs"
                >
                  <Bluetooth className="w-3.5 h-3.5" />
                  <span>{connecting ? 'Searching...' : 'Scan & Connect Printer'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Active device info if known */}
          {connectedName && (
            <div className="mt-4 p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Paired Device: <strong>{connectedName}</strong>
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-700">ESC/POS Active</span>
            </div>
          )}

          {/* Browser Limitation Notice */}
          {!supported && (
            <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Web Bluetooth Direct Pairing Limitation:</strong> Your current browser or
                platform does not support direct Web Bluetooth pairing.
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-amber-800">
                  <li>Direct wireless Bluetooth printing requires Google Chrome, Microsoft Edge, or Chrome on Android.</li>
                  <li>
                    <strong>Universal Alternative:</strong> Standard System Printing (USB, Wi-Fi, Network, or Virtual Thermal Drivers) works 100% on all browsers via the print dialog.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* 2. Paper Width & Layout Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Settings Column */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-slate-600" />
                Paper Width &amp; Roll Size
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Select your thermal paper roll width. This formats the receipt layout to avoid line truncation.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleWidthChange('58mm')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  config.paperWidth === '58mm'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black">58 mm (2 Inch)</span>
                  {config.paperWidth === '58mm' && <Check className="w-4 h-4 text-white" />}
                </div>
                <p
                  className={`text-[11px] ${
                    config.paperWidth === '58mm' ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  Most portable &amp; handheld Bluetooth thermal POS printers (32 chars/line).
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleWidthChange('80mm')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  config.paperWidth === '80mm'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black">80 mm (3 Inch)</span>
                  {config.paperWidth === '80mm' && <Check className="w-4 h-4 text-white" />}
                </div>
                <p
                  className={`text-[11px] ${
                    config.paperWidth === '80mm' ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  Desktop billing thermal printers (48 chars/line) with wider tabular layout.
                </p>
              </button>
            </div>

            {/* Print Options */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Print Preferences
              </h4>

              <label className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-xl cursor-pointer hover:bg-slate-100/60 transition-colors">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Automatic Paper Cut</span>
                  <span className="text-[11px] text-slate-500">
                    Send paper cut command at the end of the receipt (for cutters).
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={config.autoCut}
                  onChange={handleToggleAutoCut}
                  className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-slate-900"
                />
              </label>
            </div>

            {/* Test Print Action */}
            <div className="pt-2">
              <button
                type="button"
                disabled={testing}
                onClick={handleTestPrint}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold text-slate-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-colors shadow-2xs"
              >
                <Printer className="w-4 h-4 text-emerald-700" />
                <span>
                  {testing ? 'Printing Test Receipt...' : `Print Test Receipt (${config.paperWidth})`}
                </span>
              </button>
              <p className="text-[11px] text-center text-slate-400 mt-2">
                Sends a verified ESC/POS test receipt containing business header, items, taxes &amp; cutter codes.
              </p>
            </div>
          </div>

          {/* Real-time Receipt Preview Column */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Live Receipt Preview
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-slate-600">
                Width: {config.paperWidth}
              </span>
            </div>

            {/* Thermal paper simulator */}
            <div
              className={`bg-amber-50/30 border border-dashed border-slate-300 p-4 font-mono text-[11px] text-slate-800 shadow-inner rounded-sm transition-all ${
                config.paperWidth === '58mm' ? 'w-64 max-w-[260px]' : 'w-80 max-w-[340px]'
              }`}
            >
              {/* Header */}
              <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-slate-400">
                <div className="font-black text-sm uppercase">
                  {activeBusiness?.name || 'PakkaChittha Store'}
                </div>
                <div className="text-[10px] text-slate-500">Retail &amp; Billing Counter</div>
                <div className="text-[10px] text-slate-500">Tel: +91 98765 43210</div>
                <div className="text-[10px] font-bold text-slate-700">
                  GSTIN: {activeBusiness?.gstin || '27AABCU9603R1ZM'}
                </div>
              </div>

              {/* Meta */}
              <div className="py-2 border-b border-dashed border-slate-400 text-[10px] space-y-0.5">
                <div className="flex justify-between">
                  <span>Bill No: #INV-2026-0042</span>
                  <span>14:30 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Date: 24 Oct 2026</span>
                  <span>Counter: 01</span>
                </div>
                <div>Customer: Cash Customer</div>
              </div>

              {/* Items Table */}
              <div className="py-2 border-b border-dashed border-slate-400 space-y-1">
                <div className="flex justify-between font-bold text-[10px] uppercase">
                  <span>Item</span>
                  <span>Amt</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>1. Premium Tea (100g) x 2</span>
                  <span>₹120.00</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>2. Whole Wheat Atta 5kg</span>
                  <span>₹250.00</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>3. Pure Ghee 500ml</span>
                  <span>₹380.00</span>
                </div>
              </div>

              {/* Totals */}
              <div className="py-2 border-b border-dashed border-slate-400 text-[10px] space-y-0.5">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹750.00</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>CGST (2.5%):</span>
                  <span>₹18.75</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>SGST (2.5%):</span>
                  <span>₹18.75</span>
                </div>
                <div className="flex justify-between font-black text-xs pt-1 border-t border-dashed border-slate-400">
                  <span>GRAND TOTAL:</span>
                  <span>₹787.50</span>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-2 text-center text-[10px] text-slate-500 space-y-0.5">
                <div>Thank you! Visit again.</div>
                <div className="font-bold text-slate-700">PakkaChittha Verified</div>
                <div className="text-[9px]">UPI QR Scannable on Bill</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModulePageShell>
  );
}
