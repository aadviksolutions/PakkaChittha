'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { Camera, Image as ImageIcon, Loader2, Sparkles, Trash2, Upload, AlertCircle } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useEntitlements } from '@/hooks/useEntitlements';

interface ProductImageUploaderProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  productId?: string;
  disabled?: boolean;
}

export function ProductImageUploader({
  value,
  onChange,
  productId,
  disabled = false,
}: ProductImageUploaderProps) {
  const toast = useToast();
  const { isAllowed, planName } = useEntitlements();
  const canUpload = isAllowed('canUploadProductImages');

  const [uploading, setUploading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be re-selected if needed
    e.target.value = '';

    if (!canUpload) {
      setShowUpgradeModal(true);
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.error('Image size must be less than 3 MB. Please choose a smaller photo.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (productId) {
        formData.append('productId', productId);
      }

      const res = await fetch('/api/inventory/upload-image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.upgradeRequired) {
          setShowUpgradeModal(true);
        } else {
          toast.error(data.error || 'Failed to upload product image.');
        }
        return;
      }

      onChange(data.imageUrl);
      toast.success('Product image uploaded successfully!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error uploading image');
    } finally {
      setUploading(false);
    }
  };

  const handleTriggerUpload = (isCamera = false) => {
    if (!canUpload) {
      setShowUpgradeModal(true);
      return;
    }

    if (isCamera && cameraInputRef.current) {
      cameraInputRef.current.click();
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    toast.success('Product image removed');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700">
          Product Image
        </label>
        {!canUpload ? (
          <button
            type="button"
            onClick={() => setShowUpgradeModal(true)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>Scale Plan Only</span>
          </button>
        ) : (
          <span className="text-[10px] text-slate-400">Max 3MB · JPG, PNG, WebP</span>
        )}
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || uploading}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || uploading}
      />

      {value ? (
        <div className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center p-2">
          <img
            src={value}
            alt="Product"
            className="w-full max-h-44 object-contain rounded-lg"
          />
          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-3">
            <button
              type="button"
              onClick={() => handleTriggerUpload(false)}
              disabled={disabled || uploading}
              className="px-3 py-1.5 bg-white text-slate-800 hover:bg-slate-100 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Change
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || uploading}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !disabled && !uploading && handleTriggerUpload(false)}
          className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer ${
            !canUpload
              ? 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/60'
              : 'border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50'
          }`}
        >
          {uploading ? (
            <div className="py-4 flex flex-col items-center justify-center text-slate-500 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
              <span>Uploading product photo...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                <ImageIcon className="w-5 h-5 text-slate-500" />
              </div>
              <p className="text-xs font-semibold text-slate-700">
                Click to upload product image
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                or take a live photo using camera
              </p>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTriggerUpload(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  Choose File
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTriggerUpload(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                  Take Photo
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upgrade Modal for Non-Scale Plans */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 border border-amber-200">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900">
              Scale Plan Feature
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Product catalog photos & camera uploads are available exclusively on the{' '}
              <strong className="text-slate-900">Pakka Chittha Scale</strong> plan (₹999/mo).
            </p>
            <div className="mt-4 p-3 bg-slate-50 rounded-xl text-left border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <span>✓ High-resolution product showcase</span>
              </div>
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <span>✓ Camera photo capture from mobile/tablet</span>
              </div>
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <span>✓ Visual invoice & quotation line items</span>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              <Link
                href="/settings/subscription"
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                View Upgrade Plans
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
