'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, ArrowRight, Play } from 'lucide-react';

interface CinematicIntroProps {
  onComplete?: () => void;
  forcePlay?: boolean;
}

export function CinematicIntro({ onComplete, forcePlay = false }: CinematicIntroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Clean finish handler with smooth dissolve fade
  const finishIntro = useCallback(() => {
    if (isFadingOut || isDismissed) return;

    try {
      sessionStorage.setItem('lenden_intro_seen_session', 'true');
      sessionStorage.setItem('lenden_intro_played', 'true');
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
    // Lock background scrolling while intro is active
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }

    const video = videoRef.current;
    if (!video) return;

    let mounted = true;

    const tryAutoPlay = async () => {
      try {
        video.muted = true;
        setIsMuted(true);
        const playPromise = video.play();
        if (playPromise !== undefined) {
          await playPromise;
          if (mounted) {
            setHasStartedPlaying(true);
            setAutoplayBlocked(false);
          }
        }
      } catch (err) {
        // Autoplay was blocked by browser policy
        if (mounted) {
          console.warn('Autoplay restricted by browser, awaiting user gesture:', err);
          setAutoplayBlocked(true);
        }
      }
    };

    const handlePlaying = () => {
      if (mounted) {
        setHasStartedPlaying(true);
        setAutoplayBlocked(false);
      }
    };

    const handleEnded = () => {
      if (mounted) {
        finishIntro();
      }
    };

    const handleError = (e: any) => {
      console.warn('Intro video error, gracefully advancing to site:', e);
      if (mounted) {
        finishIntro();
      }
    };

    video.addEventListener('playing', handlePlaying);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    tryAutoPlay();

    // Absolute fallback safety timeout (video is 10.0s, fallback at 11.5s)
    const safetyTimeout = setTimeout(() => {
      if (mounted && !isDismissed) {
        finishIntro();
      }
    }, 11500);

    return () => {
      mounted = false;
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      clearTimeout(safetyTimeout);
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, [finishIntro, isDismissed]);

  if (isDismissed) return null;

  const handleManualPlay = () => {
    const video = videoRef.current;
    if (video) {
      video.play().then(() => {
        setHasStartedPlaying(true);
        setAutoplayBlocked(false);
      }).catch(() => {
        finishIntro();
      });
    }
  };

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    finishIntro();
  };

  return (
    <div
      aria-label="Welcome Intro"
      className={`fixed inset-0 z-[99999] w-screen h-screen max-w-full max-h-full overflow-hidden bg-white flex items-center justify-center select-none transition-opacity duration-500 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
      style={{
        backgroundColor: '#FFFFFF',
      }}
    >
      {/* Top Controls: Sound Toggle and Skip Button */}
      <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-50 flex items-center gap-2 sm:gap-3">
        {hasStartedPlaying && (
          <button
            type="button"
            onClick={toggleSound}
            aria-label={isMuted ? 'Unmute intro video' : 'Mute intro video'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/10 hover:bg-slate-900/20 text-slate-700 text-xs font-semibold backdrop-blur-md transition-all cursor-pointer border border-slate-300/40"
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-[#EA580C]" />
                <span className="hidden sm:inline text-[#EA580C]">Sound On</span>
              </>
            )}
          </button>
        )}

        {/* Skip Button */}
        <button
          type="button"
          onClick={handleSkip}
          aria-label="Skip intro animation"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#071F38] hover:bg-[#EA580C] text-white text-xs font-bold transition-all shadow-md hover:shadow-lg cursor-pointer group"
        >
          <span>Skip</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* Main Full-Viewport Video Canvas (object-contain on white background prevents cropping) */}
      <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-4">
        <video
          ref={videoRef}
          src="/intro-video.mp4"
          autoPlay
          playsInline
          muted={isMuted}
          preload="auto"
          className="w-full h-full max-w-full max-h-full object-contain pointer-events-none"
        />

        {/* Browser Autoplay Blocked Fallback Overlay */}
        {autoplayBlocked && !hasStartedPlaying && (
          <div
            onClick={handleManualPlay}
            className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center cursor-pointer p-4 z-40 transition-opacity"
          >
            <div className="w-16 h-16 rounded-full bg-[#EA580C] text-white flex items-center justify-center shadow-2xl animate-bounce mb-3">
              <Play className="w-7 h-7 fill-current ml-1" />
            </div>
            <p className="font-bold text-sm text-[#071F38]">Click anywhere to play intro</p>
            <p className="text-xs text-slate-500 mt-1">Tap to start the cinematic preview</p>
          </div>
        )}
      </div>
    </div>
  );
}
