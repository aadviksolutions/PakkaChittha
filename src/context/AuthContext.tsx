'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  platformRole: 'SUPER_ADMIN' | 'USER';
}

export interface ActiveBusiness {
  id: string;
  name: string;
  legalName: string | null;
  tradeType: string | null;
  gstin: string | null;
  city: string | null;
  state: string | null;
  currency: string;
  role: 'BUSINESS_OWNER' | 'BILLING_STAFF' | 'ACCOUNTANT' | 'INVENTORY_MANAGER';
  logoUrl?: string | null;
  subscription: {
    plan: string;
    status: string;
    trialDaysRemaining: number;
    isTrial?: boolean;
    isExpired?: boolean;
    displayText?: string;
    endDate?: Date | string | null;
  } | null;
}

interface AuthContextType {
  user: AuthUser | null;
  activeBusiness: ActiveBusiness | null;
  memberships: {
    businessId: string;
    businessName: string;
    role: string;
  }[];
  loading: boolean;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  activeBusiness: null,
  memberships: [],
  loading: true,
  logout: async () => {},
  refreshSession: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeBusiness, setActiveBusiness] = useState<ActiveBusiness | null>(null);
  const [memberships, setMemberships] = useState<{
    businessId: string;
    businessName: string;
    role: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setUser(data.user);
          setActiveBusiness(data.activeBusiness);
          setMemberships(data.memberships || []);
          return;
        }
      }
      setUser(null);
      setActiveBusiness(null);
      setMemberships([]);
    } catch {
      setUser(null);
      setActiveBusiness(null);
      setMemberships([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        if (data && data.authenticated) {
          setUser(data.user);
          setActiveBusiness(data.activeBusiness);
          setMemberships(data.memberships || []);
        } else {
          setUser(null);
          setActiveBusiness(null);
          setMemberships([]);
        }
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setActiveBusiness(null);
        setMemberships([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setActiveBusiness(null);
      setMemberships([]);
      router.push('/login');
      router.refresh();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeBusiness,
        memberships,
        loading,
        logout,
        refreshSession: fetchSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
