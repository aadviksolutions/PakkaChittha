'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Check, X } from 'lucide-react';
import { transliterateDevanagariToEnglish } from '@/lib/voice/transliterate';

/**
 * GlobalVoiceInputHelper
 *
 * Provides a universal voice-to-text dictation button for ANY focused typing field (<input>, <textarea>)
 * across the entire PakkaChittha platform.
 *
 * Features:
 * - Speaks in Hindi, English, or any tone -> instantly typed in English alphabets (Latin characters).
 * - Safe React-controlled input updating using native value setter + synthetic input/change events.
 * - Auto-positions alongside the active focused field without breaking responsive layout.
 * - Skips password, hidden, and disabled inputs.
 * - Zero layout shift, error-resilient, touch-friendly.
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

      // Dispatch standard bubbles events so React state hooks trigger
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (err) {
      console.warn('[GlobalVoiceInputHelper] Failed to update input value:', err);
    }
  }, []);

  // Update button position relative to focused input
  const updatePosition = useCallback((el: HTMLElement | null) => {
    if (!el || !document.body.contains(el)) {
      setButtonPos((prev) => ({ ...prev, visible: false }));
      return;
    }

    const rect = el.getBoundingClientRect();
    // Verify element is visible on screen
    if (rect.width === 0 || rect.height === 0 || rect.bottom < 0 || rect.top > window.innerHeight) {
      setButtonPos((prev) => ({ ...prev, visible: false }));
      return;
    }

    // Position the floating microphone button right at the top-right inner edge of the input
    // or just floating slightly inside so it doesn't spill out or cover text
    const btnWidth = 28;
    const btnHeight = 28;
    const top = window.scrollY + rect.top + Math.max(2, (rect.height - btnHeight) / 2);
    const left = window.scrollX + rect.right - btnWidth - 4;

    setButtonPos({
      top,
      left: Math.max(8, left),
      visible: true,
    });
  }, []);

  // Stop listening cleanly
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setTranscriptPreview('');
  }, []);

  // Start listening on speech recognition
  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or an Android browser.');
      return;
    }

    const targetEl = activeInputRef.current;
    if (!targetEl) return;

    // Cache existing text to append cleanly
    initialValueRef.current = targetEl.value || '';

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      // hi-IN recognizes Indian English, Hindi, and Hinglish accents accurately
      recognition.lang = 'hi-IN';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          interim += event.results[i][0].transcript;
        }

        // Transliterate speech to English alphabets
        const transliterated = transliterateDevanagariToEnglish(interim);
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

      // Don't shift focus away if clicking the helper itself
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

      // Ignore passwords, hidden, file inputs
      if (isInput) {
        const inp = inputEl as HTMLInputElement;
        const ignoredTypes = ['password', 'hidden', 'file', 'checkbox', 'radio', 'submit', 'button', 'reset', 'color', 'range'];
        if (ignoredTypes.includes(inp.type?.toLowerCase())) {
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
      // If moving focus to the helper button, do not hide
      if (helperBoxRef.current && related && helperBoxRef.current.contains(related)) {
        return;
      }

      // Give a tiny grace period so click events on the mic button register
      setTimeout(() => {
        if (!isListening && document.activeElement !== activeInputRef.current) {
          setActiveElement(null);
          activeInputRef.current = null;
          setButtonPos((prev) => ({ ...prev, visible: false }));
        }
      }, 200);
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
      className="pointer-events-auto transition-all"
    >
      <div className="relative flex items-center">
        <button
          type="button"
          onMouseDown={(e) => {
            // Prevent input blur when clicking mic button
            e.preventDefault();
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
          title={isListening ? 'Stop Voice Typing' : 'Voice Type in English (बोलकर लिखें)'}
          className={`w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer ${
            isListening
              ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-400 ring-offset-1'
              : 'bg-white/95 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 border border-slate-200/90 hover:border-emerald-300'
          }`}
        >
          {isListening ? (
            <Mic className="w-3.5 h-3.5 animate-bounce" />
          ) : (
            <Mic className="w-3.5 h-3.5" />
          )}
        </button>

        {isListening && (
          <div
            onMouseDown={(e) => e.preventDefault()}
            className="absolute right-8 top-1/2 -translate-y-1/2 whitespace-nowrap bg-slate-900/95 text-white text-[11px] font-medium px-2.5 py-1 rounded-lg shadow-lg flex items-center gap-1.5 border border-slate-700 pointer-events-auto"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="max-w-[160px] truncate">
              {transcriptPreview || 'Listening... speak in Hindi or English'}
            </span>
            <button
              type="button"
              onClick={() => stopListening()}
              className="ml-1 p-0.5 text-slate-400 hover:text-white rounded"
            >
              <Check className="w-3 h-3 text-emerald-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
