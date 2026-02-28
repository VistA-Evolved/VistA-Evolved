'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { csrfHeaders } from '@/lib/csrf';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ThemeMode = 'light' | 'dark' | 'system';
export type DensityMode = 'comfortable' | 'compact' | 'dense' | 'balanced';
export type LayoutMode = 'cprs' | 'modern';

/**
 * Cover sheet layout -- versioned for forward compatibility.
 * Heights are in pixels (not percentages) for precise resize tracking.
 */
export interface CoverSheetLayout {
  schemaVersion: 1;
  /** Ordered panel keys -- determines render order */
  panelOrder: string[];
  /** Panel heights in pixels (key -> px) */
  panelHeights: Record<string, number>;
  /** Panel visibility (key -> boolean). Hidden panels are not rendered. */
  panelVisibility: Record<string, boolean>;
  /** Layout mode when this layout was saved */
  layoutMode: LayoutMode;
}

export interface CPRSPreferences {
  theme: ThemeMode;
  density: DensityMode;
  layoutMode: LayoutMode;
  initialTab: string;
  coverSheetLayout: CoverSheetLayout;
  enableDragReorder: boolean;
}

export interface CPRSUIStateValue {
  preferences: CPRSPreferences;
  /** Active modal/drawer ID (null = none open) */
  activeModal: string | null;
  /** Modal data payload */
  modalData: Record<string, unknown> | null;
  /** Update preferences (partial merge, persists to localStorage + server) */
  updatePreferences: (partial: Partial<CPRSPreferences>) => void;
  /** Save just the cover sheet layout (debounced to server) */
  saveCoverSheetLayout: (partial: Partial<CoverSheetLayout>) => void;
  /** Reset cover sheet layout to defaults */
  resetCoverSheetLayout: () => void;
  /** Open a modal/drawer by ID with optional data */
  openModal: (id: string, data?: Record<string, unknown>) => void;
  /** Close the active modal */
  closeModal: () => void;
  /** Whether prefs are loaded from server */
  prefsSource: 'loading' | 'server' | 'local' | 'defaults';
}

/* ------------------------------------------------------------------ */
/* Defaults -- matches CPRS panel arrangement                          */
/* ------------------------------------------------------------------ */

export const DEFAULT_PANEL_ORDER = [
  'problems', 'allergies', 'meds', 'vitals',
  'notes', 'labs', 'orders', 'appointments',
  'immunizations', 'reminders',
];

export const DEFAULT_PANEL_HEIGHTS: Record<string, number> = {
  problems: 200, allergies: 200, meds: 200, vitals: 200,
  notes: 200, labs: 200, orders: 200, appointments: 200,
  immunizations: 200, reminders: 200,
};

const DEFAULT_PANEL_VISIBILITY: Record<string, boolean> = {
  problems: true, allergies: true, meds: true, vitals: true,
  notes: true, labs: true, orders: true, appointments: true,
  immunizations: true, reminders: true,
};

export const DEFAULT_COVER_LAYOUT: CoverSheetLayout = {
  schemaVersion: 1,
  panelOrder: [...DEFAULT_PANEL_ORDER],
  panelHeights: { ...DEFAULT_PANEL_HEIGHTS },
  panelVisibility: { ...DEFAULT_PANEL_VISIBILITY },
  layoutMode: 'cprs',
};

const DEFAULT_PREFS: CPRSPreferences = {
  theme: 'light',
  density: 'comfortable',
  layoutMode: 'cprs',
  initialTab: 'cover',
  coverSheetLayout: DEFAULT_COVER_LAYOUT,
  enableDragReorder: false,
};

/* ------------------------------------------------------------------ */
/* localStorage persistence (fallback)                                 */
/* ------------------------------------------------------------------ */

const LS_KEY = 'cprs_preferences';

function loadPrefs(): CPRSPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate old format (panelHeights as percentages, no schemaVersion)
      if (parsed.coverSheetLayout && !parsed.coverSheetLayout.schemaVersion) {
        parsed.coverSheetLayout = {
          ...DEFAULT_COVER_LAYOUT,
          panelOrder: parsed.coverSheetLayout.panelOrder ?? DEFAULT_COVER_LAYOUT.panelOrder,
          layoutMode: parsed.layoutMode ?? 'cprs',
        };
      }
      return { ...DEFAULT_PREFS, ...parsed };
    }
  } catch { /* ignore corrupt localStorage */ }
  return DEFAULT_PREFS;
}

function savePrefs(prefs: CPRSPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(prefs));
  } catch { /* ignore quota errors */ }
}

/* ------------------------------------------------------------------ */
/* Server sync                                                         */
/* ------------------------------------------------------------------ */

const API_BASE = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001')
  : '';

async function fetchServerPrefs(): Promise<{ layout: CoverSheetLayout; source: string } | null> {
  try {
    const res = await fetch(`${API_BASE}/ui-prefs/coversheet`, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.ok && data.layout) {
      return { layout: data.layout, source: data.source };
    }
  } catch { /* server unreachable -- use local */ }
  return null;
}

async function pushServerPrefs(layout: CoverSheetLayout): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/ui-prefs/coversheet`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
      credentials: 'include',
      body: JSON.stringify(layout),
    });
    return res.ok;
  } catch { return false; }
}

async function resetServerPrefs(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/ui-prefs/coversheet`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { ...csrfHeaders() },
    });
    return res.ok;
  } catch { return false; }
}

/* ------------------------------------------------------------------ */
/* Context + Provider                                                  */
/* ------------------------------------------------------------------ */

const CPRSUIContext = createContext<CPRSUIStateValue | null>(null);

export function CPRSUIProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<CPRSPreferences>(DEFAULT_PREFS);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalData, setModalData] = useState<Record<string, unknown> | null>(null);
  const [prefsSource, setPrefsSource] = useState<'loading' | 'server' | 'local' | 'defaults'>('loading');
  const serverSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from server first, fall back to localStorage
  useEffect(() => {
    const localPrefs = loadPrefs();
    setPreferences(localPrefs);

    fetchServerPrefs().then((serverResult) => {
      if (serverResult && serverResult.source === 'server') {
        const merged = {
          ...localPrefs,
          coverSheetLayout: serverResult.layout,
          layoutMode: serverResult.layout.layoutMode,
        };
        setPreferences(merged);
        savePrefs(merged); // sync local with server
        setPrefsSource('server');
      } else {
        setPrefsSource('local');
      }
    }).catch(() => {
      setPrefsSource('local');
    });
  }, []);

  // Phase 280 (BUG-071 fix): Apply data-theme attribute on DOM + system theme detection
  useEffect(() => {
    const resolveTheme = (mode: ThemeMode): 'light' | 'dark' => {
      if (mode === 'system') {
        if (typeof window !== 'undefined' && window.matchMedia) {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'light';
      }
      return mode;
    };

    const applyTheme = (mode: ThemeMode) => {
      const resolved = resolveTheme(mode);
      document.documentElement.setAttribute('data-theme', resolved);
    };

    applyTheme(preferences.theme);

    // Listen for OS theme changes when mode is 'system'
    if (preferences.theme === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme('system');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [preferences.theme]);

  // Debounced server push (500ms after last layout change)
  const pushLayoutToServer = useCallback((layout: CoverSheetLayout) => {
    if (serverSyncTimerRef.current) clearTimeout(serverSyncTimerRef.current);
    serverSyncTimerRef.current = setTimeout(() => {
      pushServerPrefs(layout).then((ok) => {
        if (ok) setPrefsSource('server');
      });
    }, 500);
  }, []);

  const updatePreferences = useCallback((partial: Partial<CPRSPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...partial };
      savePrefs(next);
      return next;
    });
  }, []);

  const saveCoverSheetLayout = useCallback((partial: Partial<CoverSheetLayout>) => {
    setPreferences((prev) => {
      const merged: CoverSheetLayout = {
        ...prev.coverSheetLayout,
        ...partial,
        schemaVersion: 1,
      };
      const next = { ...prev, coverSheetLayout: merged };
      savePrefs(next);
      pushLayoutToServer(merged);
      return next;
    });
  }, [pushLayoutToServer]);

  const resetCoverSheetLayout = useCallback(() => {
    setPreferences((prev) => {
      const next = { ...prev, coverSheetLayout: { ...DEFAULT_COVER_LAYOUT } };
      savePrefs(next);
      resetServerPrefs();
      setPrefsSource('defaults');
      return next;
    });
  }, []);

  const openModal = useCallback((id: string, data?: Record<string, unknown>) => {
    setActiveModal(id);
    setModalData(data ?? null);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setModalData(null);
  }, []);

  return (
    <CPRSUIContext.Provider
      value={{
        preferences, activeModal, modalData, prefsSource,
        updatePreferences, saveCoverSheetLayout, resetCoverSheetLayout,
        openModal, closeModal,
      }}
    >
      {children}
    </CPRSUIContext.Provider>
  );
}

export function useCPRSUI(): CPRSUIStateValue {
  const ctx = useContext(CPRSUIContext);
  if (!ctx) throw new Error('useCPRSUI must be inside <CPRSUIProvider>');
  return ctx;
}
