'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Check, X } from 'lucide-react';
import { transliterateDevanagariToEnglish } from '@/lib/voice/transliterate';

/**
 * GlobalVoiceInputHelper
 *
 * Universal voice-to-text dictation helper for text inputs and textareas.
 *
 * Rules:
 * - NEVER attaches to calendar/date inputs, number spinners, passwords, or selects.
 * - NEVER overlays or covers inside text, clear buttons, or calendar icons.
 * - Floats non-intrusively outside above the input top-right edge.
 * - Works reliably on both mobile touch devices and desktop browsers.
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
  const activeInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const helperBoxRef = useRef<HTMLDivElement | null>(null);

  // Safely update input / textarea value in React
  const updateInputValue = useCallback((el: HTMLInputElement | HTMLTextAreaElement, textToAppend: string) => {
    if (!el) return;

    try {
      const isInput = el instanceof HTMLInputElement;
      const prototype = isInput ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
      const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

      const base = initialValueRef.current;
      const separator = base && !base.endsWith(' ') ? ' ' : '';
      const finalVal = base ? `${base}${separator}${textToAppend}` : textToAppend;

      if (nativeSetter) {
        nativeSetter.call(el, finalVal);
      } else {
        el.value = finalVal;
      }

      // Dispatch standard bubbles events so React controlled state hooks trigger
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (err) {
      console.warn('[GlobalVoiceInputHelper] Failed to update input value:', err);
    }
  }, []);

  // Update button position safely above the top-right edge of the input (NEVER inside or overlaying)
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

    // Position floating outside just above the top-right corner of the input
    // If input is near the very top of viewport (rect.top < 36), place it just below
    const badgeHeight = 24;
    const top = rect.top >= 34
      ? window.scrollY + rect.top - badgeHeight - 4
      : window.scrollY + rect.bottom + 4;

    const left = Math.max(8, window.scrollX + rect.right - 68);

    setButtonPos({
      top,
      left,
      visible: true,
    });
  }, []);

  // Stop listening cleanly
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    setTranscriptPreview('');
  }, []);

  // Start listening on speech recognition
  const startListening = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome, Edge, or an Android browser.');
      return;
    }

    const targetEl = activeInputRef.current;
    if (!targetEl) return;

    // Cache existing text
    initialValueRef.current = targetEl.value || '';

    try {
      // Explicit mic permission check on mobile browsers
      if (navigator?.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((track) => track.stop());
        } catch (micErr) {
          console.warn('[GlobalVoiceInputHelper] Microphone permission check:', micErr);
        }
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.lang = 'hi-IN';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
        }

        const transliterated = transliterateDevanagariToEnglish(fullTranscript);
        setTranscriptPreview(transliterated);

        if (activeInputRef.current) {
          updateInputValue(activeInputRef.current, transliterated);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[GlobalVoiceInputHelper] speech error:', event.error);
        if (event.error === 'not-allowed') {
          alert('Microphone access was denied. Please allow microphone permissions in your browser to use voice typing.');
        }
        stopListening();
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error('[GlobalVoiceInputHelper] start error:', err);
      setIsListening(false);
    }
  }, [stopListening, updateInputValue]);

  // Handle focus changes globally
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
        if (!isListening) {
          setActiveElement(null);
          activeInputRef.current = null;
          setButtonPos((prev) => ({ ...prev, visible: false }));
        }
        return;
      }

      const inputEl = target as HTMLInputElement | HTMLTextAreaElement;

      // STRICT ALLOW-LIST: Only text and search inputs or textareas.
      // NEVER attach to date, time, number, calendar, password, tel, email.
      if (isInput) {
        const inp = inputEl as HTMLInputElement;
        const type = (inp.type || 'text').toLowerCase();
        if (type !== 'text' && type !== 'search') {
          return;
        }

        // Exclude date/calendar/picker pickers or explicit no-voice inputs
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

      setActiveElement(inputEl);
      activeInputRef.current = inputEl;
      updatePosition(inputEl);
    };

    const handleFocusOut = (e: FocusEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (helperBoxRef.current && related && helperBoxRef.current.contains(related)) {
        return;
      }

      setTimeout(() => {
        if (!isListening && document.activeElement !== activeInputRef.current) {
          setActiveElement(null);
          activeInputRef.current = null;
          setButtonPos((prev) => ({ ...prev, visible: false }));
        }
      }, 350);
    };

    const handleScrollOrResize = () => {
      if (activeInputRef.current) {
        updatePosition(activeInputRef.current);
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
      stopListening();
    };
  }, [isListening, stopListening, updatePosition]);

  if (!buttonPos.visible || !activeElement) {
    return null;
  }

  return (
    <div
      ref={helperBoxRef}
      style={{
        position: 'absolute',
        top: `${buttonPos.top}px`,
        left: `${buttonPos.left}px`,
        zIndex: 9999,
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
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isListening) {
              stopListening();
            } else {
              startListening();
            }
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
          title={isListening ? 'Stop Voice Typing' : 'Voice Type (बोलकर लिखें)'}
          className={`h-6 px-2 rounded-full flex items-center gap-1 shadow-md transition-all cursor-pointer font-bold text-[10px] ${
            isListening
              ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-400 ring-offset-1'
              : 'bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200/90 hover:border-emerald-300'
          }`}
        >
          <Mic className={`w-3 h-3 ${isListening ? 'animate-bounce text-white' : 'text-emerald-600'}`} />
          <span>{isListening ? 'Listening...' : 'Voice'}</span>
        </button>

        {isListening && (
          <div
            onMouseDown={(e) => e.preventDefault()}
            onTouchStart={(e) => e.preventDefault()}
            className="absolute right-20 top-1/2 -translate-y-1/2 whitespace-nowrap bg-slate-900/95 text-white text-[11px] font-medium px-2.5 py-1 rounded-lg shadow-lg flex items-center gap-1.5 border border-slate-700 pointer-events-auto"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="max-w-[160px] truncate">
              {transcriptPreview || 'Listening... speak now'}
            </span>
            <button
              type="button"
              onClick={() => stopListening()}
              className="ml-1 p-0.5 text-slate-400 hover:text-white rounded cursor-pointer"
            >
              <Check className="w-3 h-3 text-emerald-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
