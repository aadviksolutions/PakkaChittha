'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Check } from 'lucide-react';
import { transliterateDevanagariToEnglish } from '@/lib/voice/transliterate';

/**
 * GlobalVoiceInputHelper
 *
 * Universal, non-intrusive voice-to-text helper for text inputs and textareas.
 *
 * Design & Behavior Rules:
 * - Attaches ONLY to valid typing fields (input[type="text"], input[type="search"], textarea).
 * - NEVER attaches to calendar, date, time, password, or numeric stepper fields.
 * - Floats outside above the top-right corner using viewport-fixed positioning.
 * - Survives blur/tap on touch devices without losing target input reference.
 * - Uses Web Speech API directly without disruptive getUserMedia conflicts.
 */
export function GlobalVoiceInputHelper() {
  const [activeElement, setActiveElement] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [buttonPos, setButtonPos] = useState<{ top: number; left: number; visible: boolean }>({
    top: 0,
    left: 0,
    visible: false,
  });
  const [isListening, setIsListening] = useState(false);
  const [transcriptPreview, setTranscriptPreview] = useState<string>('');

  const recognitionRef = useRef<any>(null);
  const initialValueRef = useRef<string>('');
  const targetInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const helperBoxRef = useRef<HTMLDivElement | null>(null);

  // Synchronous lifecycle refs to avoid async state race conditions
  const isListeningRef = useRef(false);
  const isStartingRef = useRef(false);
  const hideTimeoutRef = useRef<any>(null);

  // Safely update input / textarea value in React
  const updateInputValue = useCallback((el: HTMLInputElement | HTMLTextAreaElement, textToAppend: string) => {
    if (!el) return;

    try {
      const isInput = el instanceof HTMLInputElement;
      const prototype = isInput ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
      const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

      const base = initialValueRef.current || '';
      const separator = base && !base.endsWith(' ') ? ' ' : '';
      const finalVal = base ? `${base}${separator}${textToAppend}` : textToAppend;

      if (nativeSetter) {
        nativeSetter.call(el, finalVal);
      } else {
        el.value = finalVal;
      }

      // Dispatch input & change events for React state bindings
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));

      // Keep cursor at end of input
      if (typeof el.setSelectionRange === 'function') {
        el.setSelectionRange(finalVal.length, finalVal.length);
      }
    } catch (err) {
      console.warn('[GlobalVoiceInputHelper] Failed to update input value:', err);
    }
  }, []);

  // Compute fixed position above input's top-right corner
  const updatePosition = useCallback((el: HTMLElement | null) => {
    if (!el || !document.body.contains(el)) {
      setButtonPos((prev) => ({ ...prev, visible: false }));
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0 || rect.bottom < 0 || rect.top > window.innerHeight) {
      setButtonPos((prev) => ({ ...prev, visible: false }));
      return;
    }

    // Position cleanly inside the right edge of the input so it NEVER overlays on outside labels or calendar controls
    const isTextArea = el instanceof HTMLTextAreaElement;
    const top = isTextArea ? rect.top + 6 : rect.top + (rect.height - 22) / 2;
    const left = rect.right - 26;

    setButtonPos({
      top,
      left,
      visible: true,
    });
  }, []);

  // Stop listening cleanly
  const stopListening = useCallback(() => {
    isStartingRef.current = false;
    isListeningRef.current = false;
    setIsListening(false);
    setTranscriptPreview('');

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    // Re-focus target element if still connected
    if (targetInputRef.current && document.body.contains(targetInputRef.current)) {
      try {
        targetInputRef.current.focus();
      } catch {}
    }
  }, []);

  // Start speech recognition
  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome, Microsoft Edge, or an Android browser.');
      return;
    }

    const targetEl = targetInputRef.current;
    if (!targetEl) return;

    // Clear any scheduled hide
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    isStartingRef.current = true;
    initialValueRef.current = targetEl.value || '';

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.lang = 'hi-IN'; // Robust support for Indian accent English & Hindi
      recognition.continuous = false; // Mobile-safe pattern
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isStartingRef.current = false;
        isListeningRef.current = true;
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let sessionTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          sessionTranscript += event.results[i][0].transcript;
        }

        if (!sessionTranscript) return;

        // Transliterate Devanagari to Romanized text & digits
        const transliterated = transliterateDevanagariToEnglish(sessionTranscript);
        const textToUse = transliterated || sessionTranscript;

        setTranscriptPreview(textToUse);

        const currentTarget = targetInputRef.current;
        if (currentTarget) {
          updateInputValue(currentTarget, textToUse);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[GlobalVoiceInputHelper] Speech error:', event.error);
        if (event.error === 'not-allowed') {
          alert('Microphone access was denied. Please allow microphone permissions in browser settings.');
        }
        isStartingRef.current = false;
        isListeningRef.current = false;
        setIsListening(false);
      };

      recognition.onend = () => {
        // If user is still in listening mode (e.g. paused between phrases on Android)
        if (isListeningRef.current) {
          if (targetInputRef.current) {
            initialValueRef.current = targetInputRef.current.value || '';
          }
          try {
            recognition.start();
          } catch {
            isListeningRef.current = false;
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognition.start();
    } catch (err: any) {
      console.error('[GlobalVoiceInputHelper] Failed to start:', err);
      isStartingRef.current = false;
      isListeningRef.current = false;
      setIsListening(false);
    }
  }, [updateInputValue]);

  // Global focus listener
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (helperBoxRef.current && helperBoxRef.current.contains(target)) {
        return;
      }

      const isInput = target instanceof HTMLInputElement;
      const isTextArea = target instanceof HTMLTextAreaElement;

      if (!isInput && !isTextArea) {
        if (!isListeningRef.current && !isStartingRef.current) {
          if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = setTimeout(() => {
            if (!isListeningRef.current && !isStartingRef.current) {
              setActiveElement(null);
              targetInputRef.current = null;
              setButtonPos((prev) => ({ ...prev, visible: false }));
            }
          }, 350);
        }
        return;
      }

      const inputEl = target as HTMLInputElement | HTMLTextAreaElement;

      // STRICT ALLOW-LIST: Only text & search inputs or textareas
      // NEVER attach to date, time, number, calendar, password, tel, email
      if (isInput) {
        const inp = inputEl as HTMLInputElement;
        const type = (inp.type || 'text').toLowerCase();
        if (type !== 'text' && type !== 'search') {
          return;
        }

        // Exclude date/calendar pickers or explicit no-voice inputs
        const cls = (inp.className || '').toLowerCase();
        const name = (inp.name || '').toLowerCase();
        const id = (inp.id || '').toLowerCase();
        if (
          inp.getAttribute('data-no-voice') === 'true' ||
          cls.includes('date') ||
          cls.includes('calendar') ||
          cls.includes('picker') ||
          name.includes('date') ||
          id.includes('date')
        ) {
          return;
        }
      }

      if (inputEl.readOnly || inputEl.disabled) {
        return;
      }

      // Valid typing field focused
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }

      targetInputRef.current = inputEl;
      setActiveElement(inputEl);
      updatePosition(inputEl);
    };

    const handleFocusOut = () => {
      // Never dismiss while speech recognition is active or starting
      if (isListeningRef.current || isStartingRef.current) {
        return;
      }

      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = setTimeout(() => {
        if (!isListeningRef.current && !isStartingRef.current && document.activeElement !== targetInputRef.current) {
          setActiveElement(null);
          targetInputRef.current = null;
          setButtonPos((prev) => ({ ...prev, visible: false }));
        }
      }, 400);
    };

    const handleScrollOrResize = () => {
      if (targetInputRef.current) {
        updatePosition(targetInputRef.current);
      }
    };

    window.addEventListener('focusin', handleFocusIn, true);
    window.addEventListener('focusout', handleFocusOut, true);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('focusin', handleFocusIn, true);
      window.removeEventListener('focusout', handleFocusOut, true);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      stopListening();
    };
  }, [stopListening, updatePosition]);

  if (!buttonPos.visible || !activeElement) {
    return null;
  }

  return (
    <div
      ref={helperBoxRef}
      style={{
        position: 'fixed',
        top: `${buttonPos.top}px`,
        left: `${buttonPos.left}px`,
        zIndex: 99999,
      }}
      className="pointer-events-auto transition-all select-none"
    >
      <div className="relative flex items-center">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isListening) {
              stopListening();
            } else {
              startListening();
            }
          }}
          title={isListening ? 'Stop Voice Typing' : 'बोलकर टाइप करें (Voice Input)'}
          className={`w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer ${
            isListening
              ? 'bg-rose-600 text-white animate-pulse shadow-sm'
              : 'bg-transparent text-slate-400 hover:text-emerald-600 hover:bg-slate-200/60'
          }`}
        >
          <Mic className={`w-3.5 h-3.5 ${isListening ? 'animate-bounce text-white' : ''}`} />
        </button>

        {isListening && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="absolute right-24 top-1/2 -translate-y-1/2 whitespace-nowrap bg-slate-900/95 text-white text-[11px] font-medium px-2.5 py-1 rounded-lg shadow-xl flex items-center gap-1.5 border border-slate-700 pointer-events-auto"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="max-w-[180px] truncate">
              {transcriptPreview || 'Listening... बोलिए'}
            </span>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                stopListening();
              }}
              className="ml-1 p-0.5 text-slate-400 hover:text-white rounded cursor-pointer"
              title="Done (हो गया)"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
