'use client';

/**
 * QA Dashboard -- Admin UI
 *
 * Phase 96B: QA/Audit OS v1.1
 *
 * Tabs: RPC Traces | QA Flows | Flow Results | Dead Clicks
 */

import React, { useEffect, useState, useCallback } from 'react';
import { csrfHeaders } from '@/lib/csrf';
import { API_BASE as API } from '@/lib/api-config';

/* -- Types ---------------------------------------------------- */

interface TraceEntry {
  id: string;
  requestId: string;
  rpcName: string;
  durationMs: number;
  success: boolean;
  error?: string;
  responseLines: number;
  duzHash: string;
  timestamp: string;
  httpRoute?: string;
}

interface TraceStats {
  totalCalls: number;
  successCount: number;
  failureCount: number;
  avgDurationMs: number;
  p95DurationMs: number;
  topRpcs: Array<{ rpcName: string; count: number; avgMs: number }>;
  errorRate: number;
  bufferSize: number;
  maxBufferSize: number;
}

interface QaFlow {
  id: string;
  name: string;
  domain: string;
  priority: string;
  description?: string;
  steps: Array<{ step: number; description?: string; method: string; path: string }>;
}

interface FlowResult {
  flowId: string;
  flowName: string;
  startedAt: string;
  durationMs: number;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  status: string;
  stepResults: Array<{
    step: number;
    description?: string;
    status: string;
    durationMs: number;
    error?: string;
  }>;
}

interface DeadClick {
  page: string;
  selector: string;
  text: string;
  elementType: string;
  hasOnClick: boolean;
  producedEffect: boolean;
  detectedAt: string;
}

/* -- Helpers -------------------------------------------------- */

async function api(path: string, tenantId?: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(tenantId ? { 'X-Tenant-Id': tenantId } : {}),
      ...csrfHeaders(),
      ...(opts?.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }
  return data;
}

type Tab = 'traces' | 'flows' | 'results' | 'deadclicks';

/* -- Component ------------------------------------------------ */

export default function QaDashboardPage() {
  const [tab, setTab] = useState<Tab>('traces');
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [traces, setTraces] = useState<TraceEntry[]>([]);
  const [stats, setStats] = useState<TraceStats | null>(null);
  const [flows, setFlows] = useState<QaFlow[]>([]);
  const [results, setResults] = useState<FlowResult[]>([]);
  const [deadClicks, setDeadClicks] = useState<DeadClick[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusError, setStatusError] = useState('');
  const [statusLoading, setStatusLoading] = useState(true);
  const [qaEnabled, setQaEnabled] = useState<boolean | null>(null);

  /* -- Check QA status -------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    async function loadQaStatus() {
      setStatusLoading(true);
      setStatusError('');
      try {
        const tenantData = await api('/admin/my-tenant');
        const resolvedTenantId = tenantData?.tenant?.tenantId;
        if (!resolvedTenantId) {
          throw new Error('Tenant context unavailable');
        }

        const statusData = await api('/qa/status', resolvedTenantId);
        if (cancelled) return;

        setTenantId(resolvedTenantId);
        setQaEnabled(statusData.qaEnabled === true);
      } catch (err) {
        if (cancelled) return;
        setTenantId(null);
        setQaEnabled(null);
        setStatusError(
          err instanceof Error ? err.message : 'Unable to load QA dashboard status.'
        );
      } finally {
        if (!cancelled) {
          setStatusLoading(false);
        }
      }
    }

    loadQaStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  /* -- Load traces ------------------------------------------ */

  const loadTraces = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError('');
    try {
      const [tracesData, statsData] = await Promise.all([
        api('/qa/traces?limit=200', tenantId),
        api('/qa/traces/stats', tenantId),
      ]);
      setTraces(tracesData.traces || []);
      setStats(statsData.stats || null);
    } catch (e) {
      setTraces([]);
      setStats(null);
      setError(e instanceof Error ? e.message : 'Unable to load QA traces.');
    }
    setLoading(false);
  }, [tenantId]);

  /* -- Load flows ------------------------------------------- */

  const loadFlows = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError('');
    try {
      const data = await api('/qa/flows', tenantId);
      setFlows(data.flows || []);
    } catch (e) {
      setFlows([]);
      setError(e instanceof Error ? e.message : 'Unable to load QA flows.');
    }
    setLoading(false);
  }, [tenantId]);

  /* -- Load results ----------------------------------------- */

  const loadResults = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError('');
    try {
      const data = await api('/qa/results', tenantId);
      setResults(data.results || []);
    } catch (e) {
      setResults([]);
      setError(e instanceof Error ? e.message : 'Unable to load QA results.');
    }
    setLoading(false);
  }, [tenantId]);

  /* -- Load dead clicks ------------------------------------ */

  const loadDeadClicks = useCallback(async () => {
    if (!tenantId) return;
    setError('');
    try {
      const data = await api('/qa/dead-clicks', tenantId);
      setDeadClicks(data.entries || []);
    } catch (e) {
      setDeadClicks([]);
      setError(e instanceof Error ? e.message : 'Unable to load dead-click reports.');
    }
  }, [tenantId]);

  /* -- Tab switch ------------------------------------------- */

  useEffect(() => {
    if (!tenantId || qaEnabled !== true) return;
    if (tab === 'traces') loadTraces();
    if (tab === 'flows') loadFlows();
    if (tab === 'results') loadResults();
    if (tab === 'deadclicks') loadDeadClicks();
  }, [tab, tenantId, qaEnabled, loadTraces, loadFlows, loadResults, loadDeadClicks]);

  /* -- Run flow --------------------------------------------- */

  async function runFlow(flowId: string) {
    if (!tenantId) {
      alert('Unable to load QA dashboard status.');
      return;
    }

    const data = await api(`/qa/flows/${flowId}/run`, tenantId, {
      method: 'POST',
      body: JSON.stringify({ baseUrl: API }),
    });
    alert(
      `Flow ${data.result.status}: ${data.result.passedSteps}/${data.result.totalSteps} steps passed (${data.result.durationMs}ms)`
    );
    loadResults();
  }

  async function reloadCatalog() {
    if (!tenantId) {
      alert('Unable to load QA dashboard status.');
      return;
    }

    const data = await api('/qa/flows/reload', tenantId, { method: 'POST' });
    alert(`Loaded ${data.loaded} flows${data.errors?.length ? `, ${data.errors.length} errors` : ''}`);
    loadFlows();
  }

  /* -- Styles ----------------------------------------------- */

  const headerStyle: React.CSSProperties = {
    padding: '16px 24px',
    borderBottom: '1px solid #e5e7eb',
  };
  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    marginRight: 4,
    cursor: 'pointer',
    fontSize: 13,
    background: active ? '#7c3aed' : '#f3f4f6',
    color: active ? '#fff' : '#374151',
    border: 'none',
    borderRadius: '6px 6px 0 0',
    fontWeight: active ? 600 : 400,
  });
  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 12,
  };
  const cellStyle: React.CSSProperties = {
    padding: '6px 10px',
    borderBottom: '1px solid #e5e7eb',
    textAlign: 'left',
  };
  const btnStyle: React.CSSProperties = {
    padding: '4px 12px',
    background: '#7c3aed',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    fontSize: 11,
    cursor: 'pointer',
  };
  const badgeStyle = (status: string): React.CSSProperties => ({
    padding: '2px 6px',
    borderRadius: 3,
    fontSize: 10,
    fontWeight: 600,
    background:
      status === 'passed' || status === 'true'
        ? '#dcfce7'
        : status === 'failed' || status === 'false'
          ? '#fce7e7'
          : '#fef3c7',
    color:
      status === 'passed' || status === 'true'
        ? '#166534'
        : status === 'failed' || status === 'false'
          ? '#991b1b'
          : '#92400e',
  });

  if (statusLoading) {
    return (
      <div style={{ padding: 32, textAlign: 'center', fontSize: 12, color: '#6b7280' }}>
        Loading QA dashboard...
      </div>
    );
  }

  if (qaEnabled === false && !statusError) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>QA Routes Disabled</h2>
        <p style={{ fontSize: 12, color: '#6b7280' }}>
          Set <code>QA_ROUTES_ENABLED=true</code> or <code>NODE_ENV=test</code> to enable QA
          dashboard.
        </p>
      </div>
    );
  }

  if (statusError) {
    return (
      <div style={{ padding: 32 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>QA Dashboard</h2>
        <p style={{ margin: '8px 0 0', fontSize: 12, color: '#dc2626' }}>
          Unable to load QA dashboard status. {statusError}
        </p>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={headerStyle}>
        <h2 style={{ margin: 0, fontSize: 16 }}>QA Dashboard</h2>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#6b7280' }}>
          Phase 96B -- QA/Audit OS v1.1. RPC traces, flow execution, dead-click detection.
        </p>
      </div>

      <div style={{ padding: '8px 24px 0', display: 'flex', gap: 2 }}>
        {(['traces', 'flows', 'results', 'deadclicks'] as Tab[]).map((t) => (
          <button key={t} style={tabStyle(tab === t)} onClick={() => setTab(t)}>
            {t === 'deadclicks' ? 'Dead Clicks' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
        {error && <div style={{ color: '#dc2626', marginBottom: 8, fontSize: 12 }}>{error}</div>}

        {/* === TRACES TAB === */}
        {tab === 'traces' && (
          <>
            {!error && stats && (
              <div
                style={{
                  marginBottom: 12,
                  padding: 10,
                  background: '#f9fafb',
                  borderRadius: 6,
                  fontSize: 11,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 12,
                }}
              >
                <div>
                  Buffer:{' '}
                  <strong>
                    {stats.bufferSize}/{stats.maxBufferSize}
                  </strong>
                </div>
                <div>
                  Avg: <strong>{stats.avgDurationMs}ms</strong>
                </div>
                <div>
                  P95: <strong>{stats.p95DurationMs}ms</strong>
                </div>
                <div>
                  Error Rate: <strong>{(stats.errorRate * 100).toFixed(1)}%</strong>
                </div>
              </div>
            )}
            {!error && stats?.topRpcs && stats.topRpcs.length > 0 && (
              <div style={{ marginBottom: 12, fontSize: 11 }}>
                <strong>Top RPCs:</strong>{' '}
                {stats.topRpcs
                  .slice(0, 5)
                  .map((r) => `${r.rpcName}(${r.count}x, ${r.avgMs}ms)`)
                  .join(' | ')}
              </div>
            )}
            {error ? (
              <p style={{ fontSize: 12, color: '#dc2626' }}>Unable to load QA traces. {error}</p>
            ) : loading ? (
              <p style={{ fontSize: 12 }}>Loading...</p>
            ) : (
              <table style={tableStyle}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={cellStyle}>Time</th>
                    <th style={cellStyle}>RPC</th>
                    <th style={cellStyle}>Duration</th>
                    <th style={cellStyle}>Status</th>
                    <th style={cellStyle}>Lines</th>
                    <th style={cellStyle}>Route</th>
                    <th style={cellStyle}>Request ID</th>
                  </tr>
                </thead>
                <tbody>
                  {traces.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ ...cellStyle, color: '#9ca3af' }}>
                        No RPC traces recorded
                      </td>
                    </tr>
                  )}
                  {traces.slice(0, 100).map((t) => (
                    <tr key={t.id}>
                      <td style={{ ...cellStyle, fontSize: 10, whiteSpace: 'nowrap' }}>
                        {t.timestamp?.slice(11, 23)}
                      </td>
                      <td style={{ ...cellStyle, fontFamily: 'monospace' }}>{t.rpcName}</td>
                      <td style={cellStyle}>{t.durationMs}ms</td>
                      <td style={cellStyle}>
                        <span style={badgeStyle(String(t.success))}>
                          {t.success ? 'OK' : 'FAIL'}
                        </span>
                      </td>
                      <td style={cellStyle}>{t.responseLines}</td>
                      <td style={{ ...cellStyle, fontSize: 10 }}>{t.httpRoute || '--'}</td>
                      <td style={{ ...cellStyle, fontSize: 9, fontFamily: 'monospace' }}>
                        {t.requestId?.slice(0, 8)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* === FLOWS TAB === */}
        {tab === 'flows' && (
          <>
            {error ? (
              <p style={{ fontSize: 12, color: '#dc2626' }}>Unable to load QA flows. {error}</p>
            ) : (
              <>
                <div style={{ marginBottom: 12 }}>
                  <button style={btnStyle} onClick={reloadCatalog}>
                    Reload Catalog
                  </button>
                </div>
                <table style={tableStyle}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={cellStyle}>ID</th>
                      <th style={cellStyle}>Name</th>
                      <th style={cellStyle}>Domain</th>
                      <th style={cellStyle}>Priority</th>
                      <th style={cellStyle}>Steps</th>
                      <th style={cellStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flows.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ ...cellStyle, color: '#9ca3af' }}>
                          No flows loaded. Click Reload Catalog.
                        </td>
                      </tr>
                    )}
                    {flows.map((f) => (
                      <tr key={f.id}>
                        <td style={{ ...cellStyle, fontFamily: 'monospace', fontSize: 11 }}>
                          {f.id}
                        </td>
                        <td style={cellStyle}>{f.name}</td>
                        <td style={cellStyle}>{f.domain}</td>
                        <td style={cellStyle}>
                          <span
                            style={badgeStyle(
                              f.priority === 'smoke'
                                ? 'passed'
                                : f.priority === 'deep'
                                  ? 'failed'
                                  : 'partial'
                            )}
                          >
                            {f.priority}
                          </span>
                        </td>
                        <td style={cellStyle}>{f.steps.length}</td>
                        <td style={cellStyle}>
                          <button
                            style={{ ...btnStyle, padding: '3px 8px' }}
                            onClick={() => runFlow(f.id)}
                          >
                            Run
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}

        {/* === RESULTS TAB === */}
        {tab === 'results' && (
          error ? (
            <p style={{ fontSize: 12, color: '#dc2626' }}>Unable to load QA results. {error}</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={cellStyle}>Time</th>
                  <th style={cellStyle}>Flow</th>
                  <th style={cellStyle}>Status</th>
                  <th style={cellStyle}>Steps</th>
                  <th style={cellStyle}>Duration</th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ ...cellStyle, color: '#9ca3af' }}>
                      No flow results yet. Run a flow first.
                    </td>
                  </tr>
                )}
                {results.map((r, i) => (
                  <tr key={i}>
                    <td style={{ ...cellStyle, fontSize: 10 }}>{r.startedAt?.slice(0, 19)}</td>
                    <td style={cellStyle}>{r.flowName}</td>
                    <td style={cellStyle}>
                      <span style={badgeStyle(r.status)}>{r.status}</span>
                    </td>
                    <td style={cellStyle}>
                      {r.passedSteps}/{r.totalSteps} ({r.failedSteps} failed)
                    </td>
                    <td style={cellStyle}>{r.durationMs}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {/* === DEAD CLICKS TAB === */}
        {tab === 'deadclicks' && (
          <>
            {error ? (
              <p style={{ fontSize: 12, color: '#dc2626' }}>
                Unable to load dead-click reports. {error}
              </p>
            ) : (
              <>
                <div style={{ marginBottom: 8, fontSize: 11, color: '#6b7280' }}>
                  Dead clicks are reported by the Playwright dead-click crawler spec.
                </div>
                <table style={tableStyle}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={cellStyle}>Page</th>
                      <th style={cellStyle}>Element</th>
                      <th style={cellStyle}>Text</th>
                      <th style={cellStyle}>Type</th>
                      <th style={cellStyle}>Detected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deadClicks.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ ...cellStyle, color: '#16a34a' }}>
                          No dead clicks detected
                        </td>
                      </tr>
                    )}
                    {deadClicks.map((dc, i) => (
                      <tr key={i}>
                        <td style={{ ...cellStyle, fontSize: 10 }}>{dc.page}</td>
                        <td style={{ ...cellStyle, fontFamily: 'monospace', fontSize: 10 }}>
                          {dc.selector}
                        </td>
                        <td style={cellStyle}>{dc.text}</td>
                        <td style={cellStyle}>{dc.elementType}</td>
                        <td style={{ ...cellStyle, fontSize: 10 }}>
                          {dc.detectedAt?.slice(0, 19)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
