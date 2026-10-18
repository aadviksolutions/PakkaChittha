'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, ArrowRight, Sparkles } from 'lucide-react';

interface WelcomeVideoIntroProps {
  onComplete?: () => void;
  autoPlay?: boolean;
}

export function WelcomeVideoIntro({ onComplete, autoPlay = true }: WelcomeVideoIntroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0); // 0 to 100%
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const START_TIME = 2.0; // 00.02
  const END_TIME = 8.0;   // 00.08
  const DURATION = END_TIME - START_TIME; // 6.0 seconds

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let initialSeekDone = false;

    const startPlayback = () => {
      try {
        if (!initialSeekDone) {
          initialSeekDone = true;
          video.currentTime = START_TIME;
        }
        if (autoPlay) {
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              // Browser blocked unmuted autoplay -> mute and retry
              video.muted = true;
              setIsMuted(true);
              video.play().catch(() => {});
            });
          }
        }
      } catch (err) {
        console.warn('Video start error:', err);
      }
    };

    const handleLoadedMetadata = () => {
      startPlayback();
    };

    const handleTimeUpdate = () => {
      const current = video.currentTime;

      if (current < START_TIME) {
        setProgress(0);
        return;
      }

      if (current >= END_TIME) {
        setProgress(100);
        finishIntro();
        return;
      }

      const pct = Math.min(100, Math.max(0, ((current - START_TIME) / DURATION) * 100));
      setProgress(pct);
    };

    const handleEnded = () => {
      finishIntro();
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    if (video.readyState >= 1) {
      startPlayback();
    }

    // Fallback safety timer: in case video fails or gets stuck, dismiss after 8.5 seconds
    const fallbackTimer = setTimeout(() => {
      finishIntro();
    }, 8500);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      clearTimeout(fallbackTimer);
    };
  }, [autoPlay]);

  const finishIntro = () => {
    if (isFadingOut || isDismissed) return;
    setIsFadingOut(true);
    setTimeout(() => {
      setIsDismissed(true);
      if (onComplete) onComplete();
    }, 700); // 700ms smooth fade transition
  };

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    finishIntro();
  };

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  const handleScreenClick = () => {
    // If user clicks anywhere on the screen, unmute sound for richer experience
    if (videoRef.current && isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
    }
  };

  if (isDismissed) return null;

  return (
    <div
      onClick={handleScreenClick}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white transition-opacity duration-700 select-none ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
      style={{
        backgroundColor: '#FFFFFF',
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Top Header Bar */}
      <div className="absolute top-5 left-6 right-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#EA580C] animate-ping" />
          <span className="text-[11px] font-bold tracking-[0.2em] text-slate-400 uppercase">
            Pakka Chittha Welcome Intro
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Sound Toggle Button */}
          <button
            type="button"
            onClick={toggleSound}
            aria-label={isMuted ? 'Unmute video' : 'Mute video'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                <span>Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-[#EA580C]" />
                <span className="text-[#EA580C]">Sound On</span>
              </>
            )}
          </button>

          {/* Skip Intro Button */}
          <button
            type="button"
            onClick={handleSkip}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#071F38] hover:bg-[#EA580C] text-white text-xs font-semibold transition-all shadow-md hover:shadow-lg cursor-pointer group"
          >
            <span>Skip Intro</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* Centered Video Showcase (Exact Pure White Match) */}
      <div className="relative w-full max-w-4xl px-4 flex flex-col items-center justify-center">
        <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-white flex items-center justify-center">
          <video
            ref={videoRef}
            src="/lenden-welcome.mp4#t=2,8"
            autoPlay
            playsInline
            muted={isMuted}
            preload="auto"
            className="w-full h-full object-contain pointer-events-none"
          />
        </div>

        {/* Ambient warm orange glow below video */}
        <div
          className="w-3/4 h-8 opacity-25 rounded-full pointer-events-none -mt-4"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(234, 88, 12, 0.45) 0%, transparent 75%)',
            filter: 'blur(16px)',
          }}
        />
      </div>

      {/* Bottom Bar: Progress Indicator & Sound Hint */}
      <div className="absolute bottom-6 left-8 right-8 flex flex-col items-center z-20">
        {isMuted && (
          <p className="text-[11px] text-slate-400 font-medium mb-3 flex items-center gap-1.5 animate-pulse">
            <Sparkles className="w-3 h-3 text-[#EA580C]" />
            <span>Click anywhere to unmute sound</span>
          </p>
        )}

        {/* Progress Bar Container */}
        <div className="w-full max-w-md h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-[#071F38] via-[#EA580C] to-[#FA8223] transition-all duration-150 ease-linear rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
