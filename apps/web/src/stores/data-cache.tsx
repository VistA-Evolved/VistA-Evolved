'use client';

import { createContext, useContext, useCallback, useRef, type ReactNode } from 'react';
import { useState } from 'react';
import { correlatedGet, correlatedPost } from '../lib/fetch-with-correlation';
import type { Allergy, Problem, Vital, Note, Medication } from '@vista-evolved/shared-types';

/* ------------------------------------------------------------------ */
/* Types — canonical clinical types re-exported from shared-types      */
/* ------------------------------------------------------------------ */

export type { Allergy, Problem, Vital, Note, Medication };
export interface DraftOrder {
  id: string;
  type: 'med' | 'lab' | 'imaging' | 'consult';
  name: string;
  status: 'draft' | 'unsigned' | 'signed' | 'released' | 'discontinued' | 'cancelled';
  details: string;
  createdAt: string;
  signedBy?: string;
  signedAt?: string;
  releasedAt?: string;
}

/* Phase 12 — 5 new clinical domains */
export interface Consult {
  id: string;
  date: string;
  status: string;
  service: string;
  type: string;
}
export interface Surgery {
  id: string;
  caseNum: string;
  procedure: string;
  date: string;
  surgeon: string;
}
export interface DCSummary {
  id: string;
  title: string;
  date: string;
  author: string;
  location: string;
  status: string;
}
export interface LabResult {
  id: string;
  name: string;
  date: string;
  status: string;
  value: string;
  flag?: string;
  refRange?: string;
  units?: string;
  specimen?: string;
}
export interface ReportDef {
  id: string;
  name: string;
  hsType: string;
}

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
  /** Sign an order (Draft/Unsigned → Signed) — calls server-side write-back */
  signOrder: (
    dfn: string,
    orderId: string,
    signedBy: string
  ) => Promise<{ mode: string; draftId?: string }>;
  /** Release a signed order (Signed → Released) — calls server-side write-back */
  releaseOrder: (dfn: string, orderId: string) => Promise<{ mode: string; draftId?: string }>;
  /** Acknowledge lab results — calls server-side write-back */
  acknowledgeLabs: (
    dfn: string,
    labIds: string[],
    acknowledgedBy: string
  ) => Promise<{ mode: string; count: number }>;
  /** Check RPC capabilities from API */
  fetchCapabilities: () => Promise<Record<string, { available: boolean }>>;
  /** Cached capability data */
  capabilities: Record<string, { available: boolean }> | null;
  /** Check if a domain is loading */
  isLoading: (dfn: string, domain: string) => boolean;
  /** Optimistic add for local data (e.g., draft problems) */
  addLocalItem: <K extends keyof ClinicalData>(
    dfn: string,
    domain: K,
    item: ClinicalData[K][number]
  ) => void;
}

/* ------------------------------------------------------------------ */
/* Fetch helpers (Phase 77: correlation ID propagation)                */
/* ------------------------------------------------------------------ */

async function fetchJSON<T>(path: string): Promise<T> {
  return correlatedGet<T>(path);
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
  const d = await fetchJSON<{ ok: boolean; results?: Medication[] }>(
    `/vista/medications?dfn=${dfn}`
  );
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
  const d = await fetchJSON<{ ok: boolean; results?: DCSummary[] }>(
    `/vista/dc-summaries?dfn=${dfn}`
  );
  return d.results ?? [];
}
async function fetchLabs(dfn: string): Promise<LabResult[]> {
  interface ApiLab {
    testName?: string;
    result?: string;
    units?: string;
    refRange?: string;
    flag?: string;
    specimen?: string;
    collectionDate?: string;
  }
  const d = await fetchJSON<{ ok: boolean; results?: ApiLab[]; rawText?: string }>(
    `/vista/labs?dfn=${dfn}`
  );
  if (d.results && d.results.length > 0) {
    return d.results.map((r, i) => ({
      id: `lab-${i}`,
      name: r.testName ?? 'Unknown',
      date: r.collectionDate ?? '',
      status: r.flag
        ? r.flag.toUpperCase() === 'H' || r.flag.toUpperCase() === 'L'
          ? 'Abnormal'
          : 'Final'
        : 'Final',
      value: r.result ?? '',
      flag: r.flag ?? '',
      refRange: r.refRange ?? '',
      units: r.units ?? '',
      specimen: r.specimen ?? '',
    }));
  }
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

  const fetchAll = useCallback(
    async (dfn: string) => {
      const domains: (keyof ClinicalData)[] = [
        'allergies',
        'problems',
        'vitals',
        'notes',
        'medications',
        'consults',
        'surgery',
        'dcSummaries',
        'labs',
        'reports',
      ];
      await Promise.allSettled(domains.map((d) => fetchDomain(dfn, d)));
    },
    [fetchDomain]
  );

  const getDomain = useCallback(
    <K extends keyof ClinicalData>(dfn: string, domain: K): ClinicalData[K] => {
      const d = data[dfn];
      if (!d || !d[domain]) return [] as unknown as ClinicalData[K];
      return d[domain] as ClinicalData[K];
    },
    [data]
  );

  const addDraftOrder = useCallback((dfn: string, order: DraftOrder) => {
    setData((prev) => {
      const existing = (prev[dfn]?.orders ?? []) as DraftOrder[];
      return { ...prev, [dfn]: { ...prev[dfn], orders: [...existing, order] } };
    });
  }, []);

  const updateOrderStatus = useCallback(
    (dfn: string, orderId: string, status: DraftOrder['status']) => {
      setData((prev) => {
        const existing = (prev[dfn]?.orders ?? []) as DraftOrder[];
        const updated = existing.map((o) => (o.id === orderId ? { ...o, status } : o));
        return { ...prev, [dfn]: { ...prev[dfn], orders: updated } };
      });
    },
    []
  );

  const signOrder = useCallback(async (dfn: string, orderId: string, signedBy: string) => {
    // Update local state optimistically
    setData((prev) => {
      const existing = (prev[dfn]?.orders ?? []) as DraftOrder[];
      const updated = existing.map((o) => {
        if (o.id !== orderId) return o;
        if (o.status !== 'draft' && o.status !== 'unsigned') return o;
        return { ...o, status: 'signed' as const, signedBy, signedAt: new Date().toISOString() };
      });
      return { ...prev, [dfn]: { ...prev[dfn], orders: updated } };
    });
    // Call server-side write-back
    try {
      const { data } = await correlatedPost<{ mode?: string; draftId?: string }>(
        '/vista/orders/sign',
        { dfn, orderId, signedBy }
      );
      return { mode: data.mode || 'draft', draftId: data.draftId };
    } catch {
      return { mode: 'local', draftId: undefined };
    }
  }, []);

  const releaseOrder = useCallback(async (dfn: string, orderId: string) => {
    setData((prev) => {
      const existing = (prev[dfn]?.orders ?? []) as DraftOrder[];
      const updated = existing.map((o) => {
        if (o.id !== orderId) return o;
        if (o.status !== 'signed') return o;
        return { ...o, status: 'released' as const, releasedAt: new Date().toISOString() };
      });
      return { ...prev, [dfn]: { ...prev[dfn], orders: updated } };
    });
    try {
      const { data } = await correlatedPost<{ mode?: string; draftId?: string }>(
        '/vista/orders/release',
        { dfn, orderId }
      );
      return { mode: data.mode || 'draft', draftId: data.draftId };
    } catch {
      return { mode: 'local', draftId: undefined };
    }
  }, []);

  const acknowledgeLabs = useCallback(
    async (dfn: string, labIds: string[], acknowledgedBy: string) => {
      try {
        const { data } = await correlatedPost<{ mode?: string }>('/vista/labs/ack', {
          dfn,
          labIds,
          acknowledgedBy,
        });
        return { mode: data.mode || 'draft', count: labIds.length };
      } catch {
        return { mode: 'local', count: labIds.length };
      }
    },
    []
  );

  const [capabilities, setCapabilities] = useState<Record<string, { available: boolean }> | null>(
    null
  );

  const fetchCapabilities = useCallback(async () => {
    try {
      const data = await correlatedGet<{
        ok?: boolean;
        rpcs?: Record<string, { available: boolean }>;
      }>('/vista/rpc-capabilities');
      if (data.ok && data.rpcs) {
        const caps: Record<string, { available: boolean }> = {};
        for (const [name, info] of Object.entries(data.rpcs)) {
          caps[name] = { available: (info as any).available };
        }
        setCapabilities(caps);
        return caps;
      }
    } catch {
      /* silent */
    }
    return {};
  }, []);

  const isLoading = useCallback(
    (dfn: string, domain: string): boolean => {
      return loading[dfn]?.[domain] ?? false;
    },
    [loading]
  );

  const addLocalItem = useCallback(
    <K extends keyof ClinicalData>(dfn: string, domain: K, item: ClinicalData[K][number]) => {
      setData((prev) => {
        const existing = (prev[dfn]?.[domain] ?? []) as ClinicalData[K];
        return { ...prev, [dfn]: { ...prev[dfn], [domain]: [...existing, item] } };
      });
    },
    []
  );

  return (
    <DataCacheContext.Provider
      value={{
        data,
        loading,
        fetchDomain,
        fetchAll,
        getDomain,
        addDraftOrder,
        updateOrderStatus,
        signOrder,
        releaseOrder,
        acknowledgeLabs,
        fetchCapabilities,
        capabilities,
        isLoading,
        addLocalItem,
      }}
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
