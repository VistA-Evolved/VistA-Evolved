'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ThemeMode = 'light' | 'dark' | 'system';
export type DensityMode = 'comfortable' | 'compact';

export interface CoverSheetLayout {
  /** Panel order (by key) */
  panelOrder: string[];
  /** Panel heights as percentages (key -> pct of container) */
  panelHeights: Record<string, number>;
}

export interface CPRSPreferences {
  theme: ThemeMode;
  density: DensityMode;
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
  /** Update preferences (partial merge, persists to localStorage) */
  updatePreferences: (partial: Partial<CPRSPreferences>) => void;
  /** Open a modal/drawer by ID with optional data */
  openModal: (id: string, data?: Record<string, unknown>) => void;
  /** Close the active modal */
  closeModal: () => void;
}

/* ------------------------------------------------------------------ */
/* Defaults                                                            */
/* ------------------------------------------------------------------ */

const DEFAULT_COVER_LAYOUT: CoverSheetLayout = {
  panelOrder: ['problems', 'allergies', 'meds', 'vitals', 'notes', 'reminders'],
  panelHeights: { problems: 33, allergies: 33, meds: 33, vitals: 33, notes: 33, reminders: 33 },
};

const DEFAULT_PREFS: CPRSPreferences = {
  theme: 'light',
  density: 'comfortable',
  initialTab: 'cover',
  coverSheetLayout: DEFAULT_COVER_LAYOUT,
  enableDragReorder: false,
};

const LS_KEY = 'cprs_preferences';

function loadPrefs(): CPRSPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_PREFS;
}

function savePrefs(prefs: CPRSPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(prefs));
  } catch { /* ignore */ }
}

/* ------------------------------------------------------------------ */
/* Context + Provider                                                  */
/* ------------------------------------------------------------------ */

const CPRSUIContext = createContext<CPRSUIStateValue | null>(null);

export function CPRSUIProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<CPRSPreferences>(DEFAULT_PREFS);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalData, setModalData] = useState<Record<string, unknown> | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    setPreferences(loadPrefs());
  }, []);

  const updatePreferences = useCallback((partial: Partial<CPRSPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...partial };
      savePrefs(next);
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
      value={{ preferences, activeModal, modalData, updatePreferences, openModal, closeModal }}
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
