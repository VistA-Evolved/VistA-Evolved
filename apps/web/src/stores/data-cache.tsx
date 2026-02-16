'use client';

import { createContext, useContext, useCallback, useRef, type ReactNode } from 'react';
import { useState } from 'react';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface Allergy { id: string; allergen: string; severity: string; reactions: string; }
export interface Problem { id: string; text: string; status: string; onset?: string; }
export interface Vital { type: string; value: string; takenAt: string; }
export interface Note { id: string; title: string; date: string; author: string; location: string; status: string; }
export interface Medication { id: string; name: string; sig: string; status: string; }
export interface DraftOrder {
  id: string;
  type: 'med' | 'lab' | 'imaging' | 'consult';
  name: string;
  status: 'draft' | 'queued' | 'unsigned' | 'signed' | 'discontinued';
  details: string;
  createdAt: string;
}

/* Phase 12 — 5 new clinical domains */
export interface Consult { id: string; date: string; status: string; service: string; type: string; }
export interface Surgery { id: string; caseNum: string; procedure: string; date: string; surgeon: string; }
export interface DCSummary { id: string; title: string; date: string; author: string; location: string; status: string; }
export interface LabResult { id: string; name: string; date: string; status: string; value: string; }
export interface ReportDef { id: string; name: string; hsType: string; }

export interface ClinicalData {
  allergies: Allergy[];
  problems: Problem[];
  vitals: Vital[];
  notes: Note[];
  medications: Medication[];
  orders: DraftOrder[];
  consults: Consult[];
  surgery: Surgery[];
  dcSummaries: DCSummary[];
  labs: LabResult[];
  reports: ReportDef[];
}

export interface DataCacheValue {
  /** Cached clinical data keyed by DFN */
  data: Record<string, Partial<ClinicalData>>;
  /** Loading states per DFN per domain */
  loading: Record<string, Record<string, boolean>>;
  /** Fetch a specific domain for a DFN */
  fetchDomain: (dfn: string, domain: keyof ClinicalData) => Promise<void>;
  /** Fetch all clinical domains for a DFN */
  fetchAll: (dfn: string) => Promise<void>;
  /** Get data for a domain (returns empty array if not loaded) */
  getDomain: <K extends keyof ClinicalData>(dfn: string, domain: K) => ClinicalData[K];
  /** Add a draft order locally */
  addDraftOrder: (dfn: string, order: DraftOrder) => void;
  /** Update order status */
  updateOrderStatus: (dfn: string, orderId: string, status: DraftOrder['status']) => void;
  /** Check if a domain is loading */
  isLoading: (dfn: string, domain: string) => boolean;
  /** Optimistic add for local data (e.g., draft problems) */
  addLocalItem: <K extends keyof ClinicalData>(dfn: string, domain: K, item: ClinicalData[K][number]) => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001';

/* ------------------------------------------------------------------ */
/* Fetch helpers                                                       */
/* ------------------------------------------------------------------ */

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

async function fetchAllergies(dfn: string): Promise<Allergy[]> {
  const d = await fetchJSON<{ ok: boolean; results?: Allergy[] }>(`/vista/allergies?dfn=${dfn}`);
  return d.results ?? [];
}
async function fetchProblems(dfn: string): Promise<Problem[]> {
  const d = await fetchJSON<{ ok: boolean; results?: Problem[] }>(`/vista/problems?dfn=${dfn}`);
  return d.results ?? [];
}
async function fetchVitals(dfn: string): Promise<Vital[]> {
  const d = await fetchJSON<{ ok: boolean; results?: Vital[] }>(`/vista/vitals?dfn=${dfn}`);
  return d.results ?? [];
}
async function fetchNotes(dfn: string): Promise<Note[]> {
  const d = await fetchJSON<{ ok: boolean; results?: Note[] }>(`/vista/notes?dfn=${dfn}`);
  return d.results ?? [];
}
async function fetchMedications(dfn: string): Promise<Medication[]> {
  const d = await fetchJSON<{ ok: boolean; results?: Medication[] }>(`/vista/medications?dfn=${dfn}`);
  return d.results ?? [];
}
async function fetchConsults(dfn: string): Promise<Consult[]> {
  const d = await fetchJSON<{ ok: boolean; results?: Consult[] }>(`/vista/consults?dfn=${dfn}`);
  return d.results ?? [];
}
async function fetchSurgery(dfn: string): Promise<Surgery[]> {
  const d = await fetchJSON<{ ok: boolean; results?: Surgery[] }>(`/vista/surgery?dfn=${dfn}`);
  return d.results ?? [];
}
async function fetchDCSummaries(dfn: string): Promise<DCSummary[]> {
  const d = await fetchJSON<{ ok: boolean; results?: DCSummary[] }>(`/vista/dc-summaries?dfn=${dfn}`);
  return d.results ?? [];
}
async function fetchLabs(dfn: string): Promise<LabResult[]> {
  const d = await fetchJSON<{ ok: boolean; results?: LabResult[]; rawText?: string }>(`/vista/labs?dfn=${dfn}`);
  if (d.results && d.results.length > 0) return d.results;
  // If only rawText, return a single synthetic entry so UI can display it
  if (d.rawText && d.rawText !== 'No Data Found') {
    return [{ id: 'raw-1', name: 'Lab Report', date: '', status: 'Final', value: d.rawText }];
  }
  return [];
}
async function fetchReports(_dfn: string): Promise<ReportDef[]> {
  const d = await fetchJSON<{ ok: boolean; reports?: ReportDef[] }>(`/vista/reports`);
  return d.reports ?? [];
}

type DomainFetcher = (dfn: string) => Promise<unknown[]>;
const FETCHERS: Record<string, DomainFetcher> = {
  allergies: fetchAllergies,
  problems: fetchProblems,
  vitals: fetchVitals,
  notes: fetchNotes,
  medications: fetchMedications,
  orders: async () => [], // orders are local-only for now
  consults: fetchConsults,
  surgery: fetchSurgery,
  dcSummaries: fetchDCSummaries,
  labs: fetchLabs,
  reports: fetchReports,
};

/* ------------------------------------------------------------------ */
/* Context + Provider                                                  */
/* ------------------------------------------------------------------ */

const DataCacheContext = createContext<DataCacheValue | null>(null);

export function DataCacheProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Record<string, Partial<ClinicalData>>>({});
  const [loading, setLoading] = useState<Record<string, Record<string, boolean>>>({});
  const inflightRef = useRef<Record<string, Promise<void>>>({});

  const fetchDomain = useCallback(async (dfn: string, domain: keyof ClinicalData) => {
    const key = `${dfn}:${domain}`;
    if (key in inflightRef.current) return inflightRef.current[key];

    setLoading((prev) => ({
      ...prev,
      [dfn]: { ...prev[dfn], [domain]: true },
    }));

    const promise = (async () => {
      try {
        const fetcher = FETCHERS[domain];
        if (!fetcher) return;
        const result = await fetcher(dfn);
        setData((prev) => ({
          ...prev,
          [dfn]: { ...prev[dfn], [domain]: result as ClinicalData[typeof domain] },
        }));
      } finally {
        setLoading((prev) => ({
          ...prev,
          [dfn]: { ...prev[dfn], [domain]: false },
        }));
        delete inflightRef.current[key];
      }
    })();

    inflightRef.current[key] = promise;
    return promise;
  }, []);

  const fetchAll = useCallback(async (dfn: string) => {
    const domains: (keyof ClinicalData)[] = [
      'allergies', 'problems', 'vitals', 'notes', 'medications',
      'consults', 'surgery', 'dcSummaries', 'labs', 'reports',
    ];
    await Promise.allSettled(domains.map((d) => fetchDomain(dfn, d)));
  }, [fetchDomain]);

  const getDomain = useCallback(<K extends keyof ClinicalData>(dfn: string, domain: K): ClinicalData[K] => {
    const d = data[dfn];
    if (!d || !d[domain]) return [] as unknown as ClinicalData[K];
    return d[domain] as ClinicalData[K];
  }, [data]);

  const addDraftOrder = useCallback((dfn: string, order: DraftOrder) => {
    setData((prev) => {
      const existing = (prev[dfn]?.orders ?? []) as DraftOrder[];
      return { ...prev, [dfn]: { ...prev[dfn], orders: [...existing, order] } };
    });
  }, []);

  const updateOrderStatus = useCallback((dfn: string, orderId: string, status: DraftOrder['status']) => {
    setData((prev) => {
      const existing = (prev[dfn]?.orders ?? []) as DraftOrder[];
      const updated = existing.map((o) => o.id === orderId ? { ...o, status } : o);
      return { ...prev, [dfn]: { ...prev[dfn], orders: updated } };
    });
  }, []);

  const isLoading = useCallback((dfn: string, domain: string): boolean => {
    return loading[dfn]?.[domain] ?? false;
  }, [loading]);

  const addLocalItem = useCallback(<K extends keyof ClinicalData>(
    dfn: string, domain: K, item: ClinicalData[K][number]
  ) => {
    setData((prev) => {
      const existing = (prev[dfn]?.[domain] ?? []) as ClinicalData[K];
      return { ...prev, [dfn]: { ...prev[dfn], [domain]: [...existing, item] } };
    });
  }, []);

  return (
    <DataCacheContext.Provider
      value={{ data, loading, fetchDomain, fetchAll, getDomain, addDraftOrder, updateOrderStatus, isLoading, addLocalItem }}
    >
      {children}
    </DataCacheContext.Provider>
  );
}

export function useDataCache(): DataCacheValue {
  const ctx = useContext(DataCacheContext);
  if (!ctx) throw new Error('useDataCache must be inside <DataCacheProvider>');
  return ctx;
}
