'use client';

/**
 * Adapter Health Dashboard — Phase 428 (W26 P6)
 *
 * Admin panel showing adapter status, VistA runtime matrix,
 * and domain write-back readiness. Combines data from:
 * - /api/adapters/health (adapter health checks)
 * - /vista/runtime-matrix (domain RPC availability)
 * - /vista/rpc-capabilities (raw RPC discovery)
 */

import { useState, useEffect, useCallback } from 'react';
import styles from '@/components/cprs/cprs.module.css';
import { API_BASE } from '@/lib/api-config';

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include', ...opts });
  return res.json();
}

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface AdapterEntry {
  type: string;
  ok: boolean;
  implementation: string;
  isStub: boolean;
  latencyMs: number;
}

interface DomainInfo {
  domain: string;
  readAvailable: boolean;
  writeAvailable: boolean;
  rpcs: { name: string; available: boolean; domain: string; tags?: string[] }[];
}

interface RuntimeMatrix {
  ok: boolean;
  instanceId: string;
  discoveredAt: string | null;
  domains: Record<string, DomainInfo>;
  totalAvailable: number;
  totalMissing: number;
  totalKnown: number;
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

type Tab = 'adapters' | 'domains' | 'rpcs';

const tabs: { id: Tab; label: string }[] = [
  { id: 'adapters', label: 'Adapter Health' },
  { id: 'domains', label: 'Domain Matrix' },
  { id: 'rpcs', label: 'RPC Coverage' },
];

/* ------------------------------------------------------------------ */
/* Status badges                                                       */
/* ------------------------------------------------------------------ */

function StatusBadge({ ok, label }: { ok: boolean; label?: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        background: ok ? '#d1e7dd' : '#f8d7da',
        color: ok ? '#0f5132' : '#842029',
      }}
    >
      {label ?? (ok ? 'HEALTHY' : 'ERROR')}
    </span>
  );
}

function ImplBadge({ impl, isStub }: { impl: string; isStub: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        background: isStub ? '#fff3cd' : '#cfe2ff',
        color: isStub ? '#664d03' : '#084298',
      }}
    >
      {impl.toUpperCase()}
      {isStub ? ' (stub)' : ''}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Adapter Health Tab                                                   */
/* ------------------------------------------------------------------ */

function AdapterHealthTab({ adapters, loading }: { adapters: AdapterEntry[]; loading: boolean }) {
  if (loading) return <p style={{ color: '#6c757d' }}>Loading adapter health...</p>;
  if (!adapters.length) return <p style={{ color: '#6c757d' }}>No adapters loaded.</p>;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>
          <th style={{ padding: '8px 12px' }}>Adapter</th>
          <th style={{ padding: '8px 12px' }}>Implementation</th>
          <th style={{ padding: '8px 12px' }}>Status</th>
          <th style={{ padding: '8px 12px' }}>Latency</th>
        </tr>
      </thead>
      <tbody>
        {adapters.map((a) => (
          <tr key={a.type} style={{ borderBottom: '1px solid #dee2e6' }}>
            <td style={{ padding: '8px 12px', fontWeight: 500 }}>{a.type}</td>
            <td style={{ padding: '8px 12px' }}>
              <ImplBadge impl={a.implementation} isStub={a.isStub} />
            </td>
            <td style={{ padding: '8px 12px' }}>
              <StatusBadge ok={a.ok} />
            </td>
            <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12 }}>
              {a.latencyMs >= 0 ? `${a.latencyMs}ms` : 'N/A'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ------------------------------------------------------------------ */
/* Domain Matrix Tab                                                    */
/* ------------------------------------------------------------------ */

function DomainMatrixTab({ matrix, loading }: { matrix: RuntimeMatrix | null; loading: boolean }) {
  if (loading) return <p style={{ color: '#6c757d' }}>Loading runtime matrix...</p>;
  if (!matrix) return <p style={{ color: '#6c757d' }}>Runtime matrix unavailable.</p>;

  const domains = Object.values(matrix.domains).sort((a, b) => a.domain.localeCompare(b.domain));

  return (
    <>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <span
          style={{
            padding: '4px 12px',
            borderRadius: 8,
            background: '#d1e7dd',
            color: '#0f5132',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {matrix.totalAvailable} available
        </span>
        <span
          style={{
            padding: '4px 12px',
            borderRadius: 8,
            background: '#f8d7da',
            color: '#842029',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {matrix.totalMissing} missing
        </span>
        <span
          style={{
            padding: '4px 12px',
            borderRadius: 8,
            background: '#e2e3e5',
            color: '#41464b',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {matrix.totalKnown} total RPCs
        </span>
        {matrix.instanceId && (
          <span
            style={{
              padding: '4px 12px',
              borderRadius: 8,
              background: '#cfe2ff',
              color: '#084298',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Instance: {matrix.instanceId}
          </span>
        )}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>
            <th style={{ padding: '8px 12px' }}>Domain</th>
            <th style={{ padding: '8px 12px' }}>Read</th>
            <th style={{ padding: '8px 12px' }}>Write</th>
            <th style={{ padding: '8px 12px' }}>RPCs</th>
          </tr>
        </thead>
        <tbody>
          {domains.map((d) => {
            const available = d.rpcs.filter((r) => r.available).length;
            const total = d.rpcs.length;
            return (
              <tr key={d.domain} style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: '8px 12px', fontWeight: 500 }}>{d.domain}</td>
                <td style={{ padding: '8px 12px' }}>
                  <StatusBadge ok={d.readAvailable} label={d.readAvailable ? 'YES' : 'NO'} />
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <StatusBadge ok={d.writeAvailable} label={d.writeAvailable ? 'YES' : 'NO'} />
                </td>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12 }}>
                  {available}/{total}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* RPC Coverage Tab                                                     */
/* ------------------------------------------------------------------ */

function RpcCoverageTab({ matrix, loading }: { matrix: RuntimeMatrix | null; loading: boolean }) {
  if (loading) return <p style={{ color: '#6c757d' }}>Loading RPC data...</p>;
  if (!matrix) return <p style={{ color: '#6c757d' }}>RPC data unavailable.</p>;

  const [filter, setFilter] = useState<'all' | 'available' | 'missing'>('all');
  const allRpcs = Object.values(matrix.domains).flatMap((d) =>
    d.rpcs.map((r) => ({ ...r, domain: d.domain }))
  );
  const filtered =
    filter === 'all'
      ? allRpcs
      : filter === 'available'
        ? allRpcs.filter((r) => r.available)
        : allRpcs.filter((r) => !r.available);

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['all', 'available', 'missing'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '4px 12px',
              border: '1px solid #dee2e6',
              borderRadius: 6,
              background: filter === f ? '#0d6efd' : '#fff',
              color: filter === f ? '#fff' : '#212529',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            {f === 'all'
              ? `All (${allRpcs.length})`
              : f === 'available'
                ? `Available (${allRpcs.filter((r) => r.available).length})`
                : `Missing (${allRpcs.filter((r) => !r.available).length})`}
          </button>
        ))}
      </div>

      <div style={{ maxHeight: 500, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr
              style={{
                borderBottom: '2px solid #dee2e6',
                textAlign: 'left',
                position: 'sticky',
                top: 0,
                background: '#fff',
              }}
            >
              <th style={{ padding: '6px 10px' }}>RPC Name</th>
              <th style={{ padding: '6px 10px' }}>Domain</th>
              <th style={{ padding: '6px 10px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={`${r.domain}-${r.name}`} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{r.name}</td>
                <td style={{ padding: '6px 10px' }}>{r.domain}</td>
                <td style={{ padding: '6px 10px' }}>
                  <StatusBadge ok={r.available} label={r.available ? 'AVAILABLE' : 'MISSING'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Main Page                                                            */
/* ------------------------------------------------------------------ */

export default function AdapterHealthPage() {
  const [tab, setTab] = useState<Tab>('adapters');
  const [adapters, setAdapters] = useState<AdapterEntry[]>([]);
  const [matrix, setMatrix] = useState<RuntimeMatrix | null>(null);
  const [loadingAdapters, setLoadingAdapters] = useState(true);
  const [loadingMatrix, setLoadingMatrix] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string>('');

  const refresh = useCallback(async () => {
    setLoadingAdapters(true);
    setLoadingMatrix(true);
    try {
      const [healthRes, matrixRes] = await Promise.all([
        apiFetch('/api/adapters/health'),
        apiFetch('/vista/runtime-matrix'),
      ]);
      if (healthRes?.ok && healthRes.adapters) {
        const entries: AdapterEntry[] = Object.entries(healthRes.adapters).map(
          ([type, v]: [string, any]) => ({ type, ...v })
        );
        setAdapters(entries);
      }
      if (matrixRes?.ok) {
        setMatrix(matrixRes);
      }
      setLastRefresh(new Date().toLocaleTimeString());
    } catch {
      /* network errors handled by empty state */
    } finally {
      setLoadingAdapters(false);
      setLoadingMatrix(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 30_000); // auto-refresh every 30s
    return () => clearInterval(iv);
  }, [refresh]);

  const allOk = adapters.length > 0 && adapters.every((a) => a.ok);
  const stubs = adapters.filter((a) => a.isStub).length;

  return (
    <div className={styles.cprsPage}>
      {/* Header */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid #dee2e6',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18 }}>Adapter Health</h2>
        {!loadingAdapters && (
          <StatusBadge
            ok={allOk}
            label={allOk ? 'ALL HEALTHY' : `${adapters.filter((a) => !a.ok).length} UNHEALTHY`}
          />
        )}
        {stubs > 0 && (
          <span
            style={{
              padding: '2px 10px',
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 600,
              background: '#fff3cd',
              color: '#664d03',
            }}
          >
            {stubs} STUB{stubs > 1 ? 'S' : ''}
          </span>
        )}
        <button
          onClick={refresh}
          style={{
            marginLeft: 'auto',
            padding: '4px 12px',
            border: '1px solid #dee2e6',
            borderRadius: 6,
            background: '#fff',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          Refresh
        </button>
        {lastRefresh && <span style={{ fontSize: 11, color: '#6c757d' }}>Last: {lastRefresh}</span>}
        <span style={{ fontSize: 11, color: '#6c757d' }}>Phase 428</span>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #dee2e6', background: '#f8f9fa' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid #0d6efd' : '2px solid transparent',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? '#0d6efd' : '#495057',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: '16px 24px', overflow: 'auto', flex: 1 }}>
        {tab === 'adapters' && <AdapterHealthTab adapters={adapters} loading={loadingAdapters} />}
        {tab === 'domains' && <DomainMatrixTab matrix={matrix} loading={loadingMatrix} />}
        {tab === 'rpcs' && <RpcCoverageTab matrix={matrix} loading={loadingMatrix} />}
      </div>
    </div>
  );
}
