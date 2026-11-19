'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { PinLockScreen } from './PinLockScreen';

interface InactivityLockContextType {
  isLocked: boolean;
  hasPin: boolean;
  lockScreen: () => void;
  unlockScreen: () => void;
  refreshPinStatus: () => Promise<void>;
}

const InactivityLockContext = createContext<InactivityLockContextType>({
  isLocked: false,
  hasPin: false,
  lockScreen: () => {},
  unlockScreen: () => {},
  refreshPinStatus: async () => {},
});

export const useInactivityLock = () => useContext(InactivityLockContext);

// 5 minutes in milliseconds
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;

export function InactivityLockProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const [isLocked, setIsLocked] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [checkedPin, setCheckedPin] = useState(false);

  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Exempt public & auth routes
  const isExempt =
    !user ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/select-mode' ||
    pathname === '/pricing' ||
    pathname === '/gst-billing-software' ||
    pathname === '/udhaar-khata-management' ||
    pathname === '/inventory-stock-software' ||
    pathname === '/ghar-kharcha-app' ||
    pathname.startsWith('/knowledge') ||
    pathname.startsWith('/view/invoice/');

  const refreshPinStatus = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/auth/pin');
      const data = await res.json();
      if (res.ok && data.success) {
        setHasPin(Boolean(data.hasPin));
      }
    } catch (err) {
      // ignore
    } finally {
      setCheckedPin(true);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshPinStatus();
    }
  }, [user, refreshPinStatus]);

  const lockScreen = useCallback(() => {
    if (!isExempt) {
      setIsLocked(true);
    }
  }, [isExempt]);

  const unlockScreen = useCallback(() => {
    setIsLocked(false);
    lastActivityRef.current = Date.now();
  }, []);

  // Inactivity tracking
  useEffect(() => {
    if (isExempt) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const resetActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const checkInactivity = () => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        setIsLocked(true);
      }
    };

    // User activity listeners
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((evt) => window.addEventListener(evt, resetActivity, { passive: true }));

    // Check every 10 seconds
    timerRef.current = setInterval(checkInactivity, 10000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, resetActivity));
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isExempt]);

  return (
    <InactivityLockContext.Provider
      value={{
        isLocked,
        hasPin,
        lockScreen,
        unlockScreen,
        refreshPinStatus,
      }}
    >
      {children}
      {isLocked && !isExempt && (
        <PinLockScreen
          hasPin={hasPin}
          onUnlocked={unlockScreen}
          onPinCreated={() => {
            setHasPin(true);
            refreshPinStatus();
          }}
        />
      )}
    </InactivityLockContext.Provider>
  );
}
