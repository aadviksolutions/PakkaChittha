'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { transliterateDevanagariToEnglish } from '@/lib/voice/transliterate';

interface UseVoiceRecognitionOptions {
  onResult?: (transcript: string) => void;
  lang?: string; // 'hi-IN' | 'en-IN'
}

export function useVoiceRecognition(options: UseVoiceRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [selectedLang, setSelectedLang] = useState(options.lang || 'hi-IN');

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setIsSupported(false);
      }
    }
  }, []);

  const startListening = useCallback(
    (langOverride?: string) => {
      setError(null);
      setPermissionDenied(false);

      if (typeof window === 'undefined') return;

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setIsSupported(false);
        setError('Browser does not support Web Speech Recognition.');
        return;
      }

      try {
        if (recognitionRef.current) {
          recognitionRef.current.abort();
        }

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        const useLang = langOverride || selectedLang;
        recognition.lang = useLang;
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsListening(true);
          setError(null);
        };

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          const englishTranscript = transliterateDevanagariToEnglish(currentTranscript);
          setTranscript(englishTranscript);
          if (options.onResult) {
            options.onResult(englishTranscript);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('[useVoiceRecognition] error:', event.error);
          setIsListening(false);
          if (event.error === 'not-allowed') {
            setPermissionDenied(true);
            setError('Microphone permission was denied. Please allow microphone access in browser settings.');
          } else if (event.error === 'no-speech') {
            setError('No speech was detected. Please tap the mic and speak clearly.');
          } else if (event.error === 'network') {
            setError('Network connection required for voice recognition.');
          } else {
            setError(`Speech recognition error: ${event.error}`);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.start();
      } catch (err: any) {
        console.error('Failed to start speech recognition', err);
        setIsListening(false);
        setError(err?.message || 'Could not access microphone.');
      }
    },
    [selectedLang, options]
  );

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
    setPermissionDenied(false);
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    setTranscript,
    error,
    permissionDenied,
    selectedLang,
    setSelectedLang,
    startListening,
    stopListening,
    resetTranscript,
  };
}

