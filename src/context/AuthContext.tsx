'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { ErpRole } from '@/lib/rbac/roles';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  platformRole: 'SUPER_ADMIN' | 'USER';
  preferredLanguage?: string;
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
  role:
    | 'BUSINESS_OWNER'
    | 'BILLING_STAFF'
    | 'ACCOUNTANT'
    | 'INVENTORY_MANAGER'
    | 'OWNER'
    | 'MANAGER'
    | 'OPERATOR'
    | 'VIEWER';
  erpRole?: ErpRole;
  permissions?: string[];
  activeBranchId?: string | null;
  branches?: Array<{
    id: string;
    name: string;
    code: string;
    isDefault: boolean;
    state: string | null;
  }>;
  financialYears?: Array<{
    id: string;
    code: string;
    label: string;
    isClosed: boolean;
  }>;
  accountantAccess?: {
    branchScope: 'ALL' | 'SELECTED';
    branchIds: string[];
    fyScope: 'ALL' | 'SELECTED';
    financialYears: string[];
    canApproveSensitive: boolean;
    canFileGst: boolean;
    grantedByUserId: string;
  } | null;
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

export interface AuthMembershipItem {
  businessId: string;
  businessName: string;
  role: string;
  erpRole?: ErpRole;
  plan?: string | null;
  branchScope?: string;
  fyScope?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  activeBusiness: ActiveBusiness | null;
  memberships: AuthMembershipItem[];
  loading: boolean;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  switchBusiness: (
    businessId: string,
    branchId?: string
  ) => Promise<{ ok: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  activeBusiness: null,
  memberships: [],
  loading: true,
  logout: async () => {},
  refreshSession: async () => {},
  switchBusiness: async () => ({ ok: false, error: 'Auth not ready' }),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeBusiness, setActiveBusiness] = useState<ActiveBusiness | null>(null);
  const [memberships, setMemberships] = useState<AuthMembershipItem[]>([]);
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

  const switchBusiness = useCallback(
    async (businessId: string, branchId?: string) => {
      try {
        const res = await fetch('/api/accountant/switch-business', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId, branchId }),
        });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          return { ok: false, error: data?.error || 'Failed to switch workspace' };
        }
        await fetchSession();
        router.refresh();
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : 'Failed to switch workspace',
        };
      }
    },
    [fetchSession, router]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        activeBusiness,
        memberships,
        loading,
        logout,
        refreshSession: fetchSession,
        switchBusiness,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
