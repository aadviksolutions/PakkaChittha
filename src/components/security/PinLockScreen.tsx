'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Shield, Lock, ArrowRight, LogOut, CheckCircle2, AlertCircle, KeyRound, Delete } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface PinLockScreenProps {
  hasPin: boolean;
  onUnlocked: () => void;
  onPinCreated: () => void;
}

export function PinLockScreen({ hasPin, onUnlocked, onPinCreated }: PinLockScreenProps) {
  const { logout, user } = useAuth();
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [confirmDigits, setConfirmDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isSettingMode, setIsSettingMode] = useState(!hasPin);
  const [step, setStep] = useState<'ENTER_NEW' | 'CONFIRM_NEW'>('ENTER_NEW');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, [step, isSettingMode]);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleDigitChange = (index: number, value: string, isConfirm: boolean = false) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const targetArray = isConfirm ? [...confirmDigits] : [...pinDigits];
    targetArray[index] = digit;

    if (isConfirm) {
      setConfirmDigits(targetArray);
    } else {
      setPinDigits(targetArray);
    }

    setError(null);

    // Auto advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit if 6th digit entered
    if (digit && index === 5) {
      const fullCode = targetArray.join('');
      if (fullCode.length === 6) {
        if (!hasPin || isSettingMode) {
          if (step === 'ENTER_NEW') {
            setStep('CONFIRM_NEW');
            setTimeout(() => inputRefs.current[0]?.focus(), 100);
          } else {
            handleSaveNewPin(pinDigits.join(''), fullCode);
          }
        } else {
          handleVerifyPin(fullCode);
        }
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>, isConfirm: boolean = false) => {
    if (e.key === 'Backspace') {
      const targetArray = isConfirm ? confirmDigits : pinDigits;
      if (!targetArray[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const arr = pasted.split('');
      if (!hasPin || isSettingMode) {
        if (step === 'ENTER_NEW') {
          setPinDigits(arr);
          setStep('CONFIRM_NEW');
        } else {
          setConfirmDigits(arr);
          handleSaveNewPin(pinDigits.join(''), pasted);
        }
      } else {
        setPinDigits(arr);
        handleVerifyPin(pasted);
      }
    }
  };

  const handleVerifyPin = async (code: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', pin: code }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        triggerShake();
        setError(data.error || 'Incorrect PIN. Please try again.');
        setPinDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        onUnlocked();
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNewPin = async (original: string, confirmation: string) => {
    if (original !== confirmation) {
      triggerShake();
      setError('PINs do not match. Please re-enter.');
      setConfirmDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set', pin: original }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        triggerShake();
        setError(data.error || 'Failed to save PIN.');
      } else {
        onPinCreated();
        onUnlocked();
      }
    } catch (err) {
      setError('Connection error while setting PIN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeypadPress = (num: string) => {
    const isConfirm = step === 'CONFIRM_NEW' && isSettingMode;
    const currentList = isConfirm ? confirmDigits : pinDigits;
    const firstEmptyIndex = currentList.findIndex((d) => !d);

    if (firstEmptyIndex !== -1) {
      handleDigitChange(firstEmptyIndex, num, isConfirm);
    }
  };

  const handleKeypadBackspace = () => {
    const isConfirm = step === 'CONFIRM_NEW' && isSettingMode;
    const currentList = isConfirm ? [...confirmDigits] : [...pinDigits];
    for (let i = 5; i >= 0; i--) {
      if (currentList[i]) {
        currentList[i] = '';
        if (isConfirm) setConfirmDigits(currentList);
        else setPinDigits(currentList);
        inputRefs.current[i]?.focus();
        break;
      }
    }
  };

  const currentDisplayDigits = (step === 'CONFIRM_NEW' && isSettingMode) ? confirmDigits : pinDigits;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Security Screen Lock"
      className="fixed inset-0 z-[99999] bg-[#071D35]/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        className={`bg-white rounded-3xl border border-[#DCE4EF] shadow-2xl max-w-sm w-full p-6 sm:p-8 text-center transition-transform duration-200 ${
          isShaking ? 'animate-[shake_0.4s_ease-in-out]' : ''
        }`}
      >
        {/* Shield Icon Badge */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#E8F7ED] border border-[#B8E6C7] flex items-center justify-center text-[#008A36] mb-4 shadow-xs">
          <Shield className="w-7 h-7" />
        </div>

        {/* Header Titles */}
        <h2 className="text-xl font-black text-[#172B4D] tracking-tight">
          {!hasPin || isSettingMode
            ? step === 'ENTER_NEW'
              ? 'Create 6-Digit PIN'
              : 'Confirm 6-Digit PIN'
            : 'Screen Locked'}
        </h2>
        <p className="text-xs text-[#64748B] mt-1.5 font-medium leading-relaxed">
          {!hasPin || isSettingMode
            ? step === 'ENTER_NEW'
              ? 'Set a 6-digit PIN for instant access and auto-screen protection.'
              : 'Re-enter your 6-digit PIN to confirm.'
            : 'Locked due to 5 minutes of inactivity. Enter your 6-digit security PIN to unlock.'}
        </p>

        {user?.name && (
          <div className="inline-block mt-2.5 px-3 py-1 bg-[#F8FAFC] border border-[#E1E7EF] rounded-full text-xs font-bold text-[#173653]">
            {user.name}
          </div>
        )}

        {/* 6-Digit PIN Boxes */}
        <div className="flex justify-center gap-2 sm:gap-2.5 my-6" onPaste={handlePaste}>
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const digit = currentDisplayDigits[index];
            return (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                autoComplete="off"
                disabled={isSubmitting}
                onChange={(e) =>
                  handleDigitChange(index, e.target.value, step === 'CONFIRM_NEW' && isSettingMode)
                }
                onKeyDown={(e) =>
                  handleKeyDown(index, e, step === 'CONFIRM_NEW' && isSettingMode)
                }
                className={`w-10 h-12 sm:w-11 sm:h-13 text-center text-xl font-black rounded-xl border transition-all outline-none ${
                  digit
                    ? 'border-[#2878CE] bg-[#F3F6FA] text-[#102A43] ring-2 ring-[#2878CE]/20'
                    : 'border-[#DCE4EF] bg-white text-[#172B4D] focus:border-[#2878CE] focus:ring-2 focus:ring-[#2878CE]/20'
                }`}
              />
            );
          })}
        </div>

        {/* Error Notice */}
        {error && (
          <div className="mb-4 p-2.5 bg-[#FFF0F0] border border-[#FFCCD2] text-[#E00016] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Numeric On-Screen Keypad for Fast Tapping */}
        <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto mb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              disabled={isSubmitting}
              onClick={() => handleKeypadPress(num)}
              className="h-11 rounded-xl bg-[#F8FAFC] hover:bg-[#EBF3FA] active:bg-[#DCE4EF] text-[#172B4D] font-bold text-base border border-[#E1E7EF] transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              if (step === 'CONFIRM_NEW' && isSettingMode) setConfirmDigits(['', '', '', '', '', '']);
              else setPinDigits(['', '', '', '', '', '']);
              setError(null);
              inputRefs.current[0]?.focus();
            }}
            className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-xs border border-slate-200 transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleKeypadPress('0')}
            className="h-11 rounded-xl bg-[#F8FAFC] hover:bg-[#EBF3FA] active:bg-[#DCE4EF] text-[#172B4D] font-bold text-base border border-[#E1E7EF] transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
          >
            0
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleKeypadBackspace}
            aria-label="Delete digit"
            className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs border border-slate-200 transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col gap-2 pt-2 border-t border-[#E1E7EF]">
          <button
            type="button"
            disabled={isSubmitting || currentDisplayDigits.join('').length < 6}
            onClick={() => {
              const fullCode = currentDisplayDigits.join('');
              if (!hasPin || isSettingMode) {
                if (step === 'ENTER_NEW') {
                  setStep('CONFIRM_NEW');
                  setTimeout(() => inputRefs.current[0]?.focus(), 100);
                } else {
                  handleSaveNewPin(pinDigits.join(''), fullCode);
                }
              } else {
                handleVerifyPin(fullCode);
              }
            }}
            className="w-full py-3 bg-[#102A43] hover:bg-[#173653] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>
                  {!hasPin || isSettingMode
                    ? step === 'ENTER_NEW'
                      ? 'Continue to Confirm'
                      : 'Set 6-Digit PIN'
                    : 'Unlock Screen'}
                </span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={logout}
            className="w-full py-2.5 bg-transparent hover:bg-slate-50 text-slate-500 hover:text-[#E00016] text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Switch User or Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}
