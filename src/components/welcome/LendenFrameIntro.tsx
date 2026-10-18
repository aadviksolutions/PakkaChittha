'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface LendenFrameIntroProps {
  onComplete?: () => void;
  forcePlay?: boolean;
}

const TOTAL_FRAMES = 180;
const DURATION_MS = 6000; // 6.0 seconds for 180 frames = 30 FPS
const TARGET_FPS = 30;
const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const PRELOAD_AHEAD_WINDOW = 50; // Sliding prefetch buffer ahead of current playhead
const INITIAL_BUFFER_FRAMES = 12; // Initial frames buffered before playback starts

// Exact verified sequence: ezgif-frame-001.jpg through ezgif-frame-180.jpg (all 1280x720, white background)
const FRAME_PATHS: string[] = Array.from({ length: TOTAL_FRAMES }, (_, i) => {
  const frameNum = String(i + 1).padStart(3, '0');
  return `/lenden-intro/ezgif-frame-${frameNum}.jpg`;
});

export function LendenFrameIntro({ onComplete, forcePlay = false }: LendenFrameIntroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Decouple onComplete prop from effect lifecycles
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // References for playback, prefetching and lifecycle
  const imageCacheRef = useRef<Map<number, HTMLImageElement>>(new Map());
  const loadingSetRef = useRef<Set<number>>(new Set());
  const rafIdRef = useRef<number | null>(null);
  const animIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastDrawnFrameRef = useRef<number>(-1);
  const isFinishedRef = useRef<boolean>(false);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Dismiss and finish transition smoothly into the main website
  const finishIntro = useCallback(() => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;

    // Clean up animation loops
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (animIntervalRef.current !== null) {
      clearInterval(animIntervalRef.current);
      animIntervalRef.current = null;
    }
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }

    // Set session storage flag to prevent repeat in current tab session
    try {
      sessionStorage.setItem('lenden_intro_played', 'true');
      sessionStorage.setItem('lenden_intro_seen', 'true');
    } catch {
      // Storage might be restricted in private browsing
    }

    // Smooth dissolve fade into website
    setIsFadingOut(true);
    fadeTimeoutRef.current = setTimeout(() => {
      setIsDismissed(true);
      // Restore scrolling on document body
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
      onCompleteRef.current?.();
    }, 500); // 500ms smooth dissolve fade
  }, []);

  // Preload and asynchronously decode a single image frame
  const preloadFrame = useCallback((index: number): Promise<HTMLImageElement | null> => {
    if (index < 0 || index >= TOTAL_FRAMES) return Promise.resolve(null);
    if (imageCacheRef.current.has(index)) {
      return Promise.resolve(imageCacheRef.current.get(index)!);
    }
    if (loadingSetRef.current.has(index)) {
      return Promise.resolve(null);
    }

    loadingSetRef.current.add(index);
    return new Promise((resolve) => {
      const img = new Image();
      let settled = false;

      const onDone = () => {
        if (settled) return;
        settled = true;
        imageCacheRef.current.set(index, img);
        loadingSetRef.current.delete(index);

        // If this is the current target frame or first frame, draw immediately
        if (canvasRef.current && (lastDrawnFrameRef.current < 0 || index === 0)) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx && img.naturalWidth > 0) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            lastDrawnFrameRef.current = index;
          }
        }
        resolve(img);
      };

      const onError = () => {
        if (settled) return;
        settled = true;
        loadingSetRef.current.delete(index);
        resolve(null);
      };

      img.onload = () => {
        onDone();
        // Asynchronously decode raster bytes off-main-thread (non-blocking)
        if (typeof img.decode === 'function') {
          img.decode().catch(() => {});
        }
      };
      img.onerror = onError;

      // Assign URL after event listeners are registered
      img.src = FRAME_PATHS[index];

      // If browser already completed loading (from memory/cache), resolve immediately
      if (img.complete && img.naturalWidth > 0) {
        onDone();
      }
    });
  }, []);

  // Controlled preloading window ahead of current playhead
  const maintainPrefetchBuffer = useCallback(
    (currentFrame: number) => {
      const start = currentFrame + 1;
      const end = Math.min(TOTAL_FRAMES - 1, currentFrame + PRELOAD_AHEAD_WINDOW);
      for (let i = start; i <= end; i++) {
        if (!imageCacheRef.current.has(i) && !loadingSetRef.current.has(i)) {
          preloadFrame(i);
        }
      }
    },
    [preloadFrame]
  );

  // Draw a frame to canvas with high quality and graceful fallback to closest decoded frame
  const drawFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let img = imageCacheRef.current.get(frameIndex);
    if (!img || !img.complete || img.naturalWidth === 0) {
      // Find the closest previous decoded frame to prevent any blank frame flash
      for (let i = frameIndex - 1; i >= 0; i--) {
        const fallback = imageCacheRef.current.get(i);
        if (fallback && fallback.complete && fallback.naturalWidth > 0) {
          img = fallback;
          break;
        }
      }
    }

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      lastDrawnFrameRef.current = frameIndex;
    }
  }, []);

  useEffect(() => {
    // 1. Accessibility: Skip intro immediately if user prefers reduced motion
    if (typeof window !== 'undefined') {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion && !forcePlay) {
        finishIntro();
        return;
      }
    }

    // 2. Session guard: Skip intro if already played in this tab session
    if (!forcePlay && typeof window !== 'undefined') {
      try {
        const seen =
          sessionStorage.getItem('lenden_intro_played') === 'true' ||
          sessionStorage.getItem('lenden_intro_seen') === 'true';
        if (seen) {
          setIsDismissed(true);
          onCompleteRef.current?.();
          return;
        }
      } catch {
        // Continue if storage is restricted
      }
    }

    // 3. Lock background scrolling while intro is visible
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }

    // 4. Pre-fill canvas with white immediately
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
    }

    // 5. Absolute safety fallback timer (7.5 seconds) to ensure the website is NEVER inaccessible
    safetyTimeoutRef.current = setTimeout(() => {
      finishIntro();
    }, DURATION_MS + 1500);

    // 6. Keyboard accessibility: Escape key exits immediately
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        finishIntro();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
    }

    let isCancelled = false;

    // 7. Preload initial frame buffer
    const initialPromises = [];
    for (let i = 0; i < Math.min(TOTAL_FRAMES, INITIAL_BUFFER_FRAMES); i++) {
      initialPromises.push(preloadFrame(i));
    }

    // Buffer timeout so we start playing without stalling
    const bufferTimeout = new Promise((resolve) => setTimeout(resolve, 200));

    Promise.race([Promise.all(initialPromises), bufferTimeout]).then(() => {
      if (isCancelled || isFinishedRef.current) return;

      // Draw initial frame 0 immediately
      drawFrame(0);

      // Start prefetching next chunk
      maintainPrefetchBuffer(0);

      const renderStep = (now: number) => {
        if (isCancelled || isFinishedRef.current) return;

        if (startTimeRef.current === null) {
          startTimeRef.current = now;
        }

        const elapsed = now - startTimeRef.current;
        const rawProgress = Math.min(1, elapsed / DURATION_MS);

        // Exact frame based on real elapsed time (guarantees 6.0s duration at 30 FPS)
        const currentFrameIndex = Math.min(
          TOTAL_FRAMES - 1,
          Math.floor(rawProgress * (TOTAL_FRAMES - 1))
        );

        if (currentFrameIndex !== lastDrawnFrameRef.current) {
          drawFrame(currentFrameIndex);
          maintainPrefetchBuffer(currentFrameIndex);
        }

        if (elapsed >= DURATION_MS) {
          if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
          }
          if (animIntervalRef.current) {
            clearInterval(animIntervalRef.current);
            animIntervalRef.current = null;
          }
          drawFrame(TOTAL_FRAMES - 1);
          setTimeout(() => {
            finishIntro();
          }, 250);
          return;
        }

        rafIdRef.current = requestAnimationFrame(renderStep);
      };

      // Primary RAF loop synchronized with screen refresh
      rafIdRef.current = requestAnimationFrame(renderStep);

      // Secondary heartbeat to prevent stall if browser throttles RAF in background
      animIntervalRef.current = setInterval(() => {
        if (isCancelled || isFinishedRef.current) return;
        renderStep(performance.now());
      }, Math.round(1000 / TARGET_FPS));
    });

    return () => {
      isCancelled = true;
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeyDown);
      }
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (animIntervalRef.current !== null) {
        clearInterval(animIntervalRef.current);
      }
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
      }
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, [forcePlay, finishIntro, preloadFrame, maintainPrefetchBuffer, drawFrame]);

  if (isDismissed) return null;

  return (
    <div
      role="region"
      aria-label="Pakka Chittha Introduction Animation"
      className={`fixed inset-0 flex items-center justify-center select-none overflow-hidden transition-opacity duration-500 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        maxWidth: '100vw',
        height: '100dvh',
        minHeight: '100svh',
        zIndex: 999999,
        backgroundColor: '#FFFFFF',
        margin: 0,
        padding: 0,
        touchAction: 'none',
        overscrollBehavior: 'none',
      }}
    >
      {/* 
        Full-Screen Canvas Viewport:
        - Pure white background matching the original 180-frame artwork
        - 16:9 aspect ratio preserved without stretching or distortion
        - Edge-to-edge horizontally on mobile devices
        - Maximum available viewport utilization without cards, borders, or black bars
      */}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="block max-w-full max-h-full object-contain pointer-events-none"
        style={{
          aspectRatio: '16 / 9',
          width: '100%',
          maxWidth: '100vw',
          maxHeight: '100dvh',
          height: 'auto',
          display: 'block',
          margin: 0,
          padding: 0,
          border: 'none',
          borderRadius: 0,
          boxShadow: 'none',
          backgroundColor: '#FFFFFF',
        }}
      />
    </div>
  );
}
