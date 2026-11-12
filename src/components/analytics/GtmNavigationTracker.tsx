'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  classifyRouteArea,
  pushToDataLayer,
  sanitizeAnalyticsPath,
} from '@/lib/analytics/gtm';

/**
 * Tracks client-side App Router SPA transitions for Google Tag Manager without
 * duplicating the initial page load page_view or leaking query/PII parameters.
 */
export function GtmNavigationTracker() {
  const pathname = usePathname();
  const lastTrackedPathRef = useRef<string | null>(null);
  const lastPushRef = useRef<{ path: string; ts: number } | null>(null);

  useEffect(() => {
    const rawPath = pathname || '/';
    const sanitizedPath = sanitizeAnalyticsPath(rawPath);

    // Initial document load is handled once by GTM's native gtm.js initialization.
    // Record the initial path silently so we do not emit a duplicate page_view on load.
    if (lastTrackedPathRef.current === null) {
      lastTrackedPathRef.current = sanitizedPath;
      return;
    }

    if (lastTrackedPathRef.current === sanitizedPath) {
      return;
    }

    lastTrackedPathRef.current = sanitizedPath;

    // Defer until next animation frame so Next.js commits the destination <title>.
    window.requestAnimationFrame(() => {
      if (lastTrackedPathRef.current !== sanitizedPath) return;

      const now = Date.now();
      if (
        lastPushRef.current &&
        lastPushRef.current.path === sanitizedPath &&
        now - lastPushRef.current.ts < 150
      ) {
        return;
      }

      lastPushRef.current = { path: sanitizedPath, ts: now };

      pushToDataLayer({
        event: 'virtual_page_view',
        page_path: sanitizedPath,
        page_location: `${window.location.origin}${sanitizedPath}`,
        page_title: document.title || 'Pakka Chittha',
        route_group: classifyRouteArea(rawPath),
      });
    });
  }, [pathname]);

  return null;
}

