'use client';

import { createContext, useContext, useCallback, useRef, type ReactNode } from 'react';
import { useState } from 'react';
import { correlatedFetch, correlatedGet, correlatedPost } from '../lib/fetch-with-correlation';
import { csrfHeaders } from '../lib/csrf';
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
  source?: 'vista' | 'server-draft' | 'local';
  vistaOrderIen?: string;
  signedBy?: string;
  signedAt?: string;
  releasedAt?: string;
}

/* Phase 12 — 5 new clinical domains */
export interface Consult {
  id: string;
  date: string;
  status: string;
  statusCode?: string;
  statusCategory?: 'pending' | 'complete' | 'unknown';
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
  ackId?: string;
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
  qualifier?: string;
  qualifierType?: number;
  sectionId?: string;
  sectionLabel?: string;
  remote?: boolean;
  rpcName?: string;
  localOnly?: boolean;
}

export interface LabOrderResult {
  ok: boolean;
  mode?: 'real' | 'draft' | 'local';
  status?: string;
  draftId?: string;
  orderIEN?: string;
  message?: string;
  pendingNote?: string;
  error?: string;
  labTest?: string;
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

export interface DomainFetchMeta {
  fetched: boolean;
  ok: boolean;
  pending: boolean;
  status?: string;
  pendingTargets: string[];
  pendingNote?: string;
  error?: string;
  rpcUsed: string[];
}

interface DomainFetchResult<T> {
  items: T[];
  meta: DomainFetchMeta;
}

export interface DataCacheValue {
  /** Cached clinical data keyed by DFN */
  data: Record<string, Partial<ClinicalData>>;
  /** Fetch posture per DFN per domain */
  meta: Record<string, Record<string, DomainFetchMeta>>;
  /** Loading states per DFN per domain */
  loading: Record<string, Record<string, boolean>>;
  /** Fetch a specific domain for a DFN */
  fetchDomain: (dfn: string, domain: keyof ClinicalData) => Promise<void>;
  /** Fetch all clinical domains for a DFN */
  fetchAll: (dfn: string) => Promise<void>;
  /** Get data for a domain (returns empty array if not loaded) */
  getDomain: <K extends keyof ClinicalData>(dfn: string, domain: K) => ClinicalData[K];
  /** Get fetch posture for a domain */
  getDomainMeta: (dfn: string, domain: keyof ClinicalData) => DomainFetchMeta;
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
  /** Submit a lab order request through the live CPRS lab-order route */
  createLabOrder: (
    dfn: string,
    labTest: string,
    quickOrderIen?: string
  ) => Promise<LabOrderResult>;
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
  /** Update an existing cached problem item by id */
  updateProblem: (dfn: string, problemId: string, updater: (problem: Problem) => Problem) => void;
}

/* ------------------------------------------------------------------ */
/* Fetch helpers (Phase 77: correlation ID propagation)                */
/* ------------------------------------------------------------------ */

async function fetchJSON<T>(path: string): Promise<T> {
  return correlatedGet<T>(path);
}

interface FetchEnvelope {
  ok?: boolean;
  status?: string;
  pendingTargets?: string[];
  pendingNote?: string;
  error?: string;
  rpcUsed?: string[] | string;
  _integration?: string;
}

const DOMAIN_FALLBACK_TARGETS: Partial<Record<keyof ClinicalData, string[]>> = {
  allergies: ['ORQQAL LIST'],
  problems: ['ORQQPL PROBLEM LIST'],
  vitals: ['ORQQVI VITALS'],
  notes: ['TIU DOCUMENTS BY CONTEXT'],
  medications: ['ORWPS ACTIVE'],
  consults: ['ORQQCN GET CONSULTS'],
  surgery: ['ORWSR LIST'],
  dcSummaries: ['TIU DOCUMENTS BY CONTEXT'],
  labs: ['ORWLRR INTERIM'],
  reports: ['ORWRP REPORT LISTS'],
};

function emptyDomainMeta(): DomainFetchMeta {
  return {
    fetched: false,
    ok: true,
    pending: false,
    status: undefined,
    pendingTargets: [],
    pendingNote: undefined,
    error: undefined,
    rpcUsed: [],
  };
}

function buildPendingTargets(response: FetchEnvelope, fallbackTargets: string[]): string[] {
  if (Array.isArray(response.pendingTargets) && response.pendingTargets.length > 0) {
    return response.pendingTargets;
  }

  const shouldFallback =
    response.ok !== true ||
    response.status === 'integration-pending' ||
    response._integration === 'pending';
  return shouldFallback ? fallbackTargets : [];
}

function normalizeFetchMeta(response: FetchEnvelope, fallbackTargets: string[]): DomainFetchMeta {
  const pendingTargets = buildPendingTargets(response, fallbackTargets);
  const rpcUsed = Array.isArray(response.rpcUsed)
    ? response.rpcUsed
    : typeof response.rpcUsed === 'string'
      ? [response.rpcUsed]
      : [];

  return {
    fetched: true,
    ok: response.ok === true,
    pending:
      response.ok !== true ||
      response.status === 'integration-pending' ||
      response._integration === 'pending' ||
      pendingTargets.length > 0,
    status: response.status,
    pendingTargets,
    pendingNote: response.pendingNote,
    error: response.error,
    rpcUsed,
  };
}

function requestFailureMeta(error: unknown, fallbackTargets: string[]): DomainFetchMeta {
  return {
    fetched: true,
    ok: false,
    pending: true,
    status: 'request-failed',
    pendingTargets: fallbackTargets,
    pendingNote: undefined,
    error: error instanceof Error ? error.message : 'Request failed',
    rpcUsed: [],
  };
}

function dedupeById<T extends { id?: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = String(item?.id || '').trim();
    if (!id) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

async function fetchAllergies(dfn: string): Promise<DomainFetchResult<Allergy>> {
  const d = await fetchJSON<FetchEnvelope & { results?: Allergy[] }>(`/vista/allergies?dfn=${dfn}`);
  return { items: d.results ?? [], meta: normalizeFetchMeta(d, ['ORQQAL LIST']) };
}
async function fetchProblems(dfn: string): Promise<DomainFetchResult<Problem>> {
  const d = await fetchJSON<FetchEnvelope & { results?: Problem[] }>(`/vista/problems?dfn=${dfn}`);
  return {
    items: dedupeById(d.results ?? []),
    meta: normalizeFetchMeta(d, ['ORQQPL PROBLEM LIST']),
  };
}
async function fetchVitals(dfn: string): Promise<DomainFetchResult<Vital>> {
  const d = await fetchJSON<FetchEnvelope & { results?: Vital[] }>(`/vista/vitals?dfn=${dfn}`);
  return { items: d.results ?? [], meta: normalizeFetchMeta(d, ['ORQQVI VITALS']) };
}
async function fetchNotes(dfn: string): Promise<DomainFetchResult<Note>> {
  const d = await fetchJSON<FetchEnvelope & { results?: Note[] }>(`/vista/notes?dfn=${dfn}`);
  return { items: d.results ?? [], meta: normalizeFetchMeta(d, ['TIU DOCUMENTS BY CONTEXT']) };
}
async function fetchMedications(dfn: string): Promise<DomainFetchResult<Medication>> {
  const d = await fetchJSON<FetchEnvelope & { results?: Medication[] }>(
    `/vista/medications?dfn=${dfn}`
  );
  return { items: d.results ?? [], meta: normalizeFetchMeta(d, ['ORWPS ACTIVE']) };
}
async function fetchConsults(dfn: string): Promise<DomainFetchResult<Consult>> {
  const d = await fetchJSON<FetchEnvelope & { results?: Consult[] }>(`/vista/consults?dfn=${dfn}`);
  return { items: d.results ?? [], meta: normalizeFetchMeta(d, ['ORQQCN GET CONSULTS']) };
}
async function fetchSurgery(dfn: string): Promise<DomainFetchResult<Surgery>> {
  const d = await fetchJSON<FetchEnvelope & { results?: Surgery[] }>(`/vista/surgery?dfn=${dfn}`);
  return { items: d.results ?? [], meta: normalizeFetchMeta(d, ['ORWSR LIST']) };
}
async function fetchDCSummaries(dfn: string): Promise<DomainFetchResult<DCSummary>> {
  const d = await fetchJSON<FetchEnvelope & { results?: DCSummary[] }>(
    `/vista/dc-summaries?dfn=${dfn}`
  );
  return { items: d.results ?? [], meta: normalizeFetchMeta(d, ['TIU DOCUMENTS BY CONTEXT']) };
}
async function fetchLabs(dfn: string): Promise<DomainFetchResult<LabResult>> {
  interface ApiLab {
    ackId?: string;
    resultId?: string;
    testName?: string;
    result?: string;
    units?: string;
    refRange?: string;
    flag?: string;
    specimen?: string;
    collectionDate?: string;
  }
  const d = await fetchJSON<FetchEnvelope & { results?: ApiLab[]; rawText?: string }>(
    `/vista/labs?dfn=${dfn}`
  );
  const meta = normalizeFetchMeta(d, ['ORWLRR INTERIM']);
  if (d.results && d.results.length > 0) {
    return {
      items: d.results.map((r, i) => ({
        id: r.ackId || r.resultId || `lab-${i}`,
        ackId: r.ackId || r.resultId || undefined,
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
      })),
      meta,
    };
  }
  // If only rawText, return a single synthetic entry so UI can display it
  if (d.rawText && d.rawText !== 'No Data Found') {
    return {
      items: [
        {
          id: 'raw-1',
          name: 'Lab Report',
          date: '',
          status: 'Final',
          value: d.rawText,
          ackId: undefined,
        },
      ],
      meta,
    };
  }
  return { items: [], meta };
}
async function fetchReports(_dfn: string): Promise<DomainFetchResult<ReportDef>> {
  const d = await fetchJSON<FetchEnvelope & { reports?: ReportDef[] }>(`/vista/reports?dfn=${_dfn}`);
  return { items: d.reports ?? [], meta: normalizeFetchMeta(d, ['ORWRP REPORT LISTS']) };
}

type DomainFetcher = (dfn: string) => Promise<DomainFetchResult<unknown>>;
const FETCHERS: Record<string, DomainFetcher> = {
  allergies: fetchAllergies,
  problems: fetchProblems,
  vitals: fetchVitals,
  notes: fetchNotes,
  medications: fetchMedications,
  orders: async () => ({ items: [], meta: emptyDomainMeta() }), // orders are local-only for now
  consults: fetchConsults,
  surgery: fetchSurgery,
  dcSummaries: fetchDCSummaries,
  labs: fetchLabs,
  reports: fetchReports,
};

const FETCH_ALL_BATCH_SIZE = 3;

/* ------------------------------------------------------------------ */
/* Context + Provider                                                  */
/* ------------------------------------------------------------------ */

const DataCacheContext = createContext<DataCacheValue | null>(null);

export function DataCacheProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Record<string, Partial<ClinicalData>>>({});
  const [meta, setMeta] = useState<Record<string, Record<string, DomainFetchMeta>>>({});
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
        const { items, meta: domainMeta } = await fetcher(dfn);
        setData((prev) => ({
          ...prev,
          [dfn]: { ...prev[dfn], [domain]: items as ClinicalData[typeof domain] },
        }));
        setMeta((prev) => ({
          ...prev,
          [dfn]: { ...prev[dfn], [domain]: domainMeta },
        }));
      } catch (error) {
        setData((prev) => ({
          ...prev,
          [dfn]: { ...prev[dfn], [domain]: [] as unknown as ClinicalData[typeof domain] },
        }));
        setMeta((prev) => ({
          ...prev,
          [dfn]: {
            ...prev[dfn],
            [domain]: requestFailureMeta(error, DOMAIN_FALLBACK_TARGETS[domain] ?? []),
          },
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
      for (let i = 0; i < domains.length; i += FETCH_ALL_BATCH_SIZE) {
        const batch = domains.slice(i, i + FETCH_ALL_BATCH_SIZE);
        await Promise.allSettled(batch.map((domain) => fetchDomain(dfn, domain)));
      }
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

  const getDomainMeta = useCallback(
    (dfn: string, domain: keyof ClinicalData): DomainFetchMeta => {
      return meta[dfn]?.[domain] ?? emptyDomainMeta();
    },
    [meta]
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
      if (labIds.length === 0) {
        return { mode: 'unavailable', count: 0 };
      }
      try {
        const { data } = await correlatedPost<{ mode?: string }>('/vista/cprs/labs/ack', {
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

  const createLabOrder = useCallback(
    async (dfn: string, labTest: string, quickOrderIen?: string): Promise<LabOrderResult> => {
      try {
        const { data } = await correlatedFetch<LabOrderResult>('/vista/cprs/orders/lab', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': `lab-${dfn}-${Date.now()}`,
            ...csrfHeaders(),
          },
          body: JSON.stringify({
            dfn,
            labTest,
            ...(quickOrderIen ? { quickOrderIen } : {}),
          }),
        });

        if (data.ok && data.orderIEN) {
          addDraftOrder(dfn, {
            id: `vista-lab-${data.orderIEN}`,
            type: 'lab',
            name: data.labTest || labTest,
            status: data.status === 'unsigned' ? 'unsigned' : 'draft',
            details: data.message || 'Lab order placed via VistA.',
            createdAt: new Date().toISOString(),
            source: 'vista',
            vistaOrderIen: String(data.orderIEN),
          });
        } else if (
          data.mode === 'draft' ||
          data.status === 'unsupported-in-sandbox' ||
          data.status === 'sync-pending'
        ) {
          addDraftOrder(dfn, {
            id: data.draftId || `lab-${Date.now()}`,
            type: 'lab',
            name: data.labTest || labTest,
            status: 'draft',
            details: data.message || data.pendingNote || 'Lab order saved as draft.',
            createdAt: new Date().toISOString(),
            source: 'server-draft',
          });
        }

        return data;
      } catch (error: unknown) {
        return {
          ok: false,
          mode: 'local' as const,
          error: error instanceof Error ? error.message : 'Lab order request failed',
        };
      }
    },
    [addDraftOrder]
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

  const updateProblem = useCallback(
    (dfn: string, problemId: string, updater: (problem: Problem) => Problem) => {
      setData((prev) => {
        const existing = (prev[dfn]?.problems ?? []) as Problem[];
        const updated = existing.map((problem) =>
          problem.id === problemId ? updater(problem) : problem
        );
        return { ...prev, [dfn]: { ...prev[dfn], problems: updated } };
      });
    },
    []
  );

  return (
    <DataCacheContext.Provider
      value={{
        data,
        meta,
        loading,
        fetchDomain,
        fetchAll,
        getDomain,
        getDomainMeta,
        addDraftOrder,
        updateOrderStatus,
        signOrder,
        releaseOrder,
        acknowledgeLabs,
        createLabOrder,
        fetchCapabilities,
        capabilities,
        isLoading,
        addLocalItem,
        updateProblem,
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
