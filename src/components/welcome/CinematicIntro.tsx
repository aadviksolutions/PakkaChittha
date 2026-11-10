'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight } from 'lucide-react';

interface CinematicIntroProps {
  onComplete?: () => void;
  forcePlay?: boolean;
}

// Module-level flag to avoid repeated playback during SPA client routing
let hasPlayedThisSession = false;

export function CinematicIntro({ onComplete, forcePlay = false }: CinematicIntroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldRender, setShouldRender] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Determine whether the intro should play on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const noIntro = urlParams.get('nointro') === '1' || urlParams.get('nointro') === 'true';
      const forceIntro =
        forcePlay ||
        urlParams.get('forceintro') === 'true' ||
        urlParams.get('intro') === 'true' ||
        urlParams.get('replay') === 'true';

      const alreadySeenThisTab = sessionStorage.getItem('pc_intro_v4_seen') === 'true';
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isAndroidApp =
        typeof navigator !== 'undefined' &&
        /PakkachitthaApp/i.test(navigator.userAgent);

      // In the native Android app, open directly into the interface without video delay
      if (isAndroidApp && !forceIntro) {
        setIsDismissed(true);
        onCompleteRef.current?.();
        return;
      }

      if (noIntro) {
        setIsDismissed(true);
        onCompleteRef.current?.();
        return;
      }

      if (forceIntro) {
        setShouldRender(true);
        return;
      }

      // If already played during this active session/tab and not forced, skip
      if (hasPlayedThisSession || (alreadySeenThisTab && !forceIntro)) {
        setIsDismissed(true);
        onCompleteRef.current?.();
        return;
      }

      // Respect reduced motion preference if user has not explicitly forced intro
      if (prefersReducedMotion) {
        setIsDismissed(true);
        onCompleteRef.current?.();
        return;
      }

      // Fresh visit -> show intro
      setShouldRender(true);
    } catch {
      setShouldRender(true);
    }
  }, [forcePlay]);

  // Clean finish handler with smooth dissolve fade
  const finishIntro = useCallback(() => {
    if (isFadingOut || isDismissed) return;

    hasPlayedThisSession = true;
    try {
      sessionStorage.setItem('pc_intro_v4_seen', 'true');
    } catch {
      // Ignore private browsing storage restrictions
    }

    setIsFadingOut(true);
    setTimeout(() => {
      setIsDismissed(true);
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
      onCompleteRef.current?.();
    }, 450); // 450ms smooth dissolve fade
  }, [isFadingOut, isDismissed]);

  useEffect(() => {
    if (!shouldRender || isDismissed) return;

    // Lock background scrolling while intro is active
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }

    const video = videoRef.current;
    if (!video) return;

    let mounted = true;

    // Strictly enforce muted attributes required by mobile and desktop autoplay policies
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.playbackRate = 2.0; // 2x speed for 4–5 second completion
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', 'true');
    video.setAttribute('autoplay', '');

    const attemptPlay = async () => {
      if (!video) return;
      try {
        video.muted = true;
        video.playbackRate = 2.0;
        const playPromise = video.play();
        if (playPromise !== undefined) {
          await playPromise;
          if (mounted) {
            setHasStartedPlaying(true);
          }
        }
      } catch (err) {
        if (mounted) {
          // Gracefully complete if autoplay is blocked
          finishIntro();
        }
      }
    };

    const handlePlaying = () => {
      if (mounted) {
        video.playbackRate = 2.0;
        setHasStartedPlaying(true);
      }
    };

    const handleEnded = () => {
      if (mounted) {
        finishIntro();
      }
    };

    const handleError = (_e: any) => {
      if (mounted) {
        finishIntro();
      }
    };

    video.addEventListener('canplay', attemptPlay);
    video.addEventListener('loadeddata', attemptPlay);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    if (video.readyState >= 2) {
      attemptPlay();
    } else {
      attemptPlay();
    }

    // Strict 4.5s total duration limit
    const safetyTimeout = setTimeout(() => {
      if (mounted && !isDismissed) {
        finishIntro();
      }
    }, 4600);

    return () => {
      mounted = false;
      video.removeEventListener('canplay', attemptPlay);
      video.removeEventListener('loadeddata', attemptPlay);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      clearTimeout(safetyTimeout);
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, [shouldRender, finishIntro, isDismissed]);

  if (!shouldRender || isDismissed) return null;

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    finishIntro();
  };

  return (
    <div
      aria-label="Welcome Intro"
      onClick={handleSkip}
      className={`fixed inset-0 z-[999999] w-screen h-screen max-w-full max-h-full overflow-hidden bg-white flex items-center justify-center select-none transition-opacity duration-500 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
      style={{
        backgroundColor: '#FFFFFF',
      }}
    >
      {/* Top Skip Button */}
      <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-50 flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={handleSkip}
          aria-label="Skip into application"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/10 hover:bg-slate-900/20 text-slate-800 text-xs font-bold backdrop-blur-md transition-all cursor-pointer border border-slate-300/40"
        >
          <span>Skip</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Video Player Running at 2x Speed */}
      <video
        ref={videoRef}
        src="/intro.mp4"
        playsInline
        muted
        autoPlay
        preload="auto"
        className="w-full h-full object-contain pointer-events-none"
      />
    </div>
  );
}
