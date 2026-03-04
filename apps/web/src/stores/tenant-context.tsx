'use client';

/**
 * Tenant context — Phase 17C.
 *
 * Fetches current user's tenant config (enabled modules, feature flags, UI defaults,
 * note templates) via GET /admin/my-tenant. Provides hooks for:
 *   - `useTenant()` — full tenant data
 *   - `useFeatureFlag(flagId)` — boolean check
 *   - `useModuleEnabled(moduleId)` — boolean check
 *   - `useFacilityDefaults()` — UI defaults from tenant config
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useSession } from './session-context';
import { API_BASE } from '@/lib/api-config';

/* ------------------------------------------------------------------ */
/* Types (mirror API types for client)                                 */
/* ------------------------------------------------------------------ */

export type ModuleId =
  | 'cover'
  | 'problems'
  | 'meds'
  | 'orders'
  | 'notes'
  | 'consults'
  | 'surgery'
  | 'dcsumm'
  | 'labs'
  | 'reports'
  | 'vitals'
  | 'allergies'
  | 'imaging';

export interface UIDefaults {
  theme: 'light' | 'dark' | 'system';
  density: 'comfortable' | 'compact' | 'dense' | 'balanced';
  layoutMode: 'cprs' | 'modern';
  initialTab: string;
  enableDragReorder: boolean;
}

export interface NoteTemplate {
  id: string;
  title: string;
  body: string;
  specialty: string;
  roles: string[];
  active: boolean;
}

export interface TenantData {
  tenantId: string;
  facilityName: string;
  facilityStation: string;
  enabledModules: ModuleId[];
  /** System-level module IDs (kernel, clinical, rcm, etc.) — Phase 135 */
  systemModules: string[];
  featureFlags: Record<string, boolean>;
  uiDefaults: UIDefaults;
  noteTemplates: NoteTemplate[];
}

export interface TenantContextValue {
  /** Tenant data (null until loaded) */
  tenant: TenantData | null;
  /** Whether tenant data is loading */
  loading: boolean;
  /** Check if a module is enabled */
  isModuleEnabled: (moduleId: string) => boolean;
  /** Check if a feature flag is on */
  isFeatureEnabled: (flagId: string) => boolean;
  /** Get facility UI defaults */
  facilityDefaults: UIDefaults | null;
  /** Get active note templates */
  noteTemplates: NoteTemplate[];
  /** Refresh tenant config from server */
  refresh: () => Promise<void>;
}

/* ------------------------------------------------------------------ */
/* Defaults                                                            */
/* ------------------------------------------------------------------ */

const DEFAULT_UI: UIDefaults = {
  theme: 'light',
  density: 'comfortable',
  layoutMode: 'cprs',
  initialTab: 'cover',
  enableDragReorder: false,
};

/* ------------------------------------------------------------------ */
/* Context + Provider                                                  */
/* ------------------------------------------------------------------ */

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { authenticated } = useSession();
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTenant = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/my-tenant`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok && data.tenant) {
        setTenant(data.tenant);
      }
    } catch {
      // Graceful: if tenant fetch fails, use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch tenant config when authenticated
  useEffect(() => {
    if (authenticated) {
      fetchTenant();
    } else {
      setTenant(null);
    }
  }, [authenticated, fetchTenant]);

  const isModuleEnabled = useCallback(
    (moduleId: string): boolean => {
      if (!tenant) return true; // before config loads, allow everything
      // Check tab-level modules (cover, meds, etc.)
      if (tenant.enabledModules.includes(moduleId as ModuleId)) return true;
      // Check system-level modules (rcm, telehealth, imaging, etc.) — Phase 135
      if (tenant.systemModules?.includes(moduleId)) return true;
      return false;
    },
    [tenant]
  );

  const isFeatureEnabled = useCallback(
    (flagId: string): boolean => {
      if (!tenant) return true; // before config loads, allow everything
      return tenant.featureFlags[flagId] !== false;
    },
    [tenant]
  );

  const facilityDefaults = tenant?.uiDefaults ?? null;
  const noteTemplates = tenant?.noteTemplates ?? [];

  return (
    <TenantContext.Provider
      value={{
        tenant,
        loading,
        isModuleEnabled,
        isFeatureEnabled,
        facilityDefaults,
        noteTemplates,
        refresh: fetchTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be inside <TenantProvider>');
  return ctx;
}

/** Convenience: check single feature flag. */
export function useFeatureFlag(flagId: string): boolean {
  const { isFeatureEnabled } = useTenant();
  return isFeatureEnabled(flagId);
}

/** Convenience: check single module enabled. */
export function useModuleEnabled(moduleId: string): boolean {
  const { isModuleEnabled } = useTenant();
  return isModuleEnabled(moduleId);
}

/** Convenience: get facility UI defaults. */
export function useFacilityDefaults(): UIDefaults {
  const { facilityDefaults } = useTenant();
  return facilityDefaults ?? DEFAULT_UI;
}
