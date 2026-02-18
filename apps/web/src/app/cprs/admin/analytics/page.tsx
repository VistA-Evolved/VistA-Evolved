'use client';

/**
 * Analytics & BI Dashboard — Phase 25E.
 *
 * Provides a multi-tab analytics dashboard with:
 *   - Ops Dashboard: system health, RPC circuit breaker, event buffer, aggregation stats
 *   - Clinical Utilization: report access patterns, order activity, search activity
 *   - Events Explorer: raw (non-PHI) analytics event browser
 *   - Export: CSV export of analytics data
 *
 * Accessible at /cprs/admin/analytics. Requires analytics_viewer permission.
 */

import { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface OpsDashboard {
  ok: boolean;
  cached: boolean;
  timestamp: string;
  tenantId: string;
  process: { heapUsedMB: number; rssMB: number; uptime: number };
  rpcHealth: {
    circuitBreaker: { state: string; failures: number; totalCalls: number; totalFailures: number; totalTimeouts: number };
    cacheSize: number;
    totalCalled: number;
    totalSuccesses: number;
    totalFailures: number;
  };
  analytics: {
    eventBuffer: { totalEvents: number; bufferUsage: number; oldestEvent: string | null; newestEvent: string | null; categories: Record<string, number> };
    aggregation: { hourlyBuckets: number; dailyBuckets: number; oldestHourly: string | null; newestHourly: string | null; metrics: string[] };
  };
}

interface ClinicalDashboard {
  ok: boolean;
  cached: boolean;
  timestamp: string;
  clinicalReports: {
    dailyBuckets: number;
    recentViews: number;
    avgLatency: number;
    cacheHealth: { listCacheSize: number; textCacheSize: number; cacheTtlMs: number; maxCacheEntries: number };
  };
  orderActivity: { dailyBuckets: number; recentOrders: number };
  searchActivity: { dailyBuckets: number; recentSearches: number };
}

interface AnalyticsEvent {
  id: string;
  timestamp: string;
  category: string;
  metric: string;
  value: number;
  unit: string;
  tenantId: string;
  userHash: string;
  tags: Record<string, string>;
}

interface EventsResponse {
  ok: boolean;
  events: AnalyticsEvent[];
  total: number;
}

interface HealthResponse {
  ok: boolean;
  timestamp: string;
  eventBuffer: { totalEvents: number; bufferUsage: number };
  aggregation: { hourlyBuckets: number; dailyBuckets: number; metrics: string[] };
  clinicalReports: { listCacheSize: number; textCacheSize: number };
  dashboardCacheSize: number;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

type TabId = 'ops' | 'clinical' | 'events' | 'export';

const TAB_LABELS: Record<TabId, string> = {
  ops: 'Ops Dashboard',
  clinical: 'Clinical Utilization',
  events: 'Events Explorer',
  export: 'Export',
};

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    closed: '#4caf50', open: '#f44336', 'half-open': '#ff9800',
  };
  return <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: colors[status] ?? '#9e9e9e', marginRight: 6 }} />;
}

function MetricCard({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: '12px 16px', minWidth: 140, background: '#fafafa' }}>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600 }}>
        {value}{unit && <span style={{ fontSize: 12, color: '#999', marginLeft: 2 }}>{unit}</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function AnalyticsPage() {
  const [tab, setTab] = useState<TabId>('ops');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [opsDash, setOpsDash] = useState<OpsDashboard | null>(null);
  const [clinicalDash, setClinicalDash] = useState<ClinicalDashboard | null>(null);
  const [events, setEvents] = useState<EventsResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);

  // Event filters
  const [eventCategory, setEventCategory] = useState('');
  const [eventLimit, setEventLimit] = useState(50);

  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  /* ── Fetchers ──────────────────────────────────────────────────── */

  const apiFetch = useCallback(async (path: string, opts?: RequestInit) => {
    const res = await fetch(`${API_BASE}${path}`, { credentials: 'include', ...opts });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error || res.statusText);
    }
    return res;
  }, []);

  const loadTab = useCallback(async (t: TabId) => {
    setLoading(true);
    setError(null);
    try {
      switch (t) {
        case 'ops': {
          const res = await apiFetch('/analytics/dashboards/ops');
          const data = await res.json();
          setOpsDash(data);
          break;
        }
        case 'clinical': {
          const res = await apiFetch('/analytics/dashboards/clinical');
          const data = await res.json();
          setClinicalDash(data);
          break;
        }
        case 'events': {
          const params = new URLSearchParams();
          if (eventCategory) params.set('category', eventCategory);
          params.set('limit', String(eventLimit));
          const res = await apiFetch(`/analytics/events?${params.toString()}`);
          const data = await res.json();
          setEvents(data);
          break;
        }
        case 'export': {
          const res = await apiFetch('/analytics/health');
          const data = await res.json();
          setHealth(data);
          break;
        }
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, eventCategory, eventLimit]);

  useEffect(() => { loadTab(tab); }, [tab, loadTab]);

  /* ── Export handler ────────────────────────────────────────────── */

  const handleExport = useCallback(async (exportType: 'events' | 'aggregated') => {
    setExporting(true);
    setExportMsg(null);
    try {
      const res = await apiFetch('/analytics/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: exportType, format: 'csv', filters: {} }),
      });
      const csv = await res.text();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${exportType}-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setExportMsg(`Exported ${exportType} data successfully`);
    } catch (e: any) {
      setExportMsg(`Export failed: ${e.message}`);
    } finally {
      setExporting(false);
    }
  }, [apiFetch]);

  /* ── Render ────────────────────────────────────────────────────── */

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Analytics & BI Dashboard</h1>
      <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
        Phase 25 — Enterprise BI, Analytics & Clinical Reporting
      </p>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '2px solid #e0e0e0', marginBottom: 20 }}>
        {(Object.keys(TAB_LABELS) as TabId[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: tab === t ? '#1976d2' : 'transparent',
              color: tab === t ? '#fff' : '#333',
              cursor: 'pointer',
              borderRadius: '6px 6px 0 0',
              fontWeight: tab === t ? 600 : 400,
              fontSize: 14,
            }}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
        <button
          onClick={() => loadTab(tab)}
          style={{ marginLeft: 'auto', padding: '6px 12px', border: '1px solid #ccc', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 12 }}
        >
          Refresh
        </button>
      </div>

      {loading && <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>Loading...</div>}
      {error && <div style={{ padding: 12, background: '#ffebee', color: '#c62828', borderRadius: 6, marginBottom: 16 }}>{error}</div>}

      {/* ── Ops Dashboard Tab ── */}
      {tab === 'ops' && opsDash && !loading && (
        <div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            <MetricCard label="Uptime" value={formatUptime(opsDash.process.uptime)} />
            <MetricCard label="Heap Used" value={opsDash.process.heapUsedMB} unit="MB" />
            <MetricCard label="RSS" value={opsDash.process.rssMB} unit="MB" />
            <MetricCard label="RPC Calls" value={opsDash.rpcHealth.totalCalled} />
            <MetricCard label="RPC Successes" value={opsDash.rpcHealth.totalSuccesses} />
            <MetricCard label="RPC Failures" value={opsDash.rpcHealth.totalFailures} />
          </div>

          <h3 style={{ marginBottom: 8 }}>Circuit Breaker</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <StatusDot status={opsDash.rpcHealth.circuitBreaker.state} />
            <span style={{ fontWeight: 600 }}>{opsDash.rpcHealth.circuitBreaker.state.toUpperCase()}</span>
            <span style={{ color: '#666', fontSize: 13 }}>
              — {opsDash.rpcHealth.circuitBreaker.failures} failures,
              {opsDash.rpcHealth.cacheSize} cached RPCs
            </span>
          </div>

          <h3 style={{ marginBottom: 8 }}>Analytics Engine</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <MetricCard label="Events Buffered" value={opsDash.analytics.eventBuffer.totalEvents} />
            <MetricCard label="Buffer Usage" value={`${Math.round(opsDash.analytics.eventBuffer.bufferUsage * 100)}%`} />
            <MetricCard label="Hourly Buckets" value={opsDash.analytics.aggregation.hourlyBuckets} />
            <MetricCard label="Daily Buckets" value={opsDash.analytics.aggregation.dailyBuckets} />
          </div>

          {opsDash.analytics.aggregation.metrics.length > 0 && (
            <div>
              <h4 style={{ marginBottom: 4, fontSize: 13 }}>Tracked Metrics</h4>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {opsDash.analytics.aggregation.metrics.map(m => (
                  <span key={m} style={{ padding: '2px 8px', background: '#e3f2fd', borderRadius: 4, fontSize: 12 }}>{m}</span>
                ))}
              </div>
            </div>
          )}

          {opsDash.analytics.eventBuffer.categories && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ marginBottom: 4, fontSize: 13 }}>Event Categories</h4>
              <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%', maxWidth: 500 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                    <th style={{ textAlign: 'left', padding: '4px 8px' }}>Category</th>
                    <th style={{ textAlign: 'right', padding: '4px 8px' }}>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(opsDash.analytics.eventBuffer.categories).map(([cat, count]) => (
                    <tr key={cat} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>{cat}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>{count as number}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Clinical Utilization Tab ── */}
      {tab === 'clinical' && clinicalDash && !loading && (
        <div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            <MetricCard label="Report Views" value={clinicalDash.clinicalReports.recentViews} />
            <MetricCard label="Avg Latency" value={clinicalDash.clinicalReports.avgLatency} unit="ms" />
            <MetricCard label="Recent Orders" value={clinicalDash.orderActivity.recentOrders} />
            <MetricCard label="Recent Searches" value={clinicalDash.searchActivity.recentSearches} />
          </div>

          <h3 style={{ marginBottom: 8 }}>Clinical Report Cache</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <MetricCard label="List Cache" value={clinicalDash.clinicalReports.cacheHealth.listCacheSize} />
            <MetricCard label="Text Cache" value={clinicalDash.clinicalReports.cacheHealth.textCacheSize} />
            <MetricCard label="Cache TTL" value={clinicalDash.clinicalReports.cacheHealth.cacheTtlMs} unit="ms" />
          </div>

          <h3 style={{ marginBottom: 8 }}>Activity Summary</h3>
          <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%', maxWidth: 600 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                <th style={{ textAlign: 'left', padding: '4px 8px' }}>Metric</th>
                <th style={{ textAlign: 'right', padding: '4px 8px' }}>Daily Buckets</th>
                <th style={{ textAlign: 'right', padding: '4px 8px' }}>Recent Count</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f5f5f5' }}>
                <td style={{ padding: '4px 8px' }}>Report Views</td>
                <td style={{ padding: '4px 8px', textAlign: 'right' }}>{clinicalDash.clinicalReports.dailyBuckets}</td>
                <td style={{ padding: '4px 8px', textAlign: 'right' }}>{clinicalDash.clinicalReports.recentViews}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f5f5f5' }}>
                <td style={{ padding: '4px 8px' }}>Orders</td>
                <td style={{ padding: '4px 8px', textAlign: 'right' }}>{clinicalDash.orderActivity.dailyBuckets}</td>
                <td style={{ padding: '4px 8px', textAlign: 'right' }}>{clinicalDash.orderActivity.recentOrders}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f5f5f5' }}>
                <td style={{ padding: '4px 8px' }}>Searches</td>
                <td style={{ padding: '4px 8px', textAlign: 'right' }}>{clinicalDash.searchActivity.dailyBuckets}</td>
                <td style={{ padding: '4px 8px', textAlign: 'right' }}>{clinicalDash.searchActivity.recentSearches}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── Events Explorer Tab ── */}
      {tab === 'events' && !loading && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 2 }}>Category</label>
              <select
                value={eventCategory}
                onChange={(e) => setEventCategory(e.target.value)}
                style={{ padding: '6px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 13 }}
              >
                <option value="">All</option>
                <option value="ops.api">ops.api</option>
                <option value="ops.rpc">ops.rpc</option>
                <option value="ops.auth">ops.auth</option>
                <option value="ops.error">ops.error</option>
                <option value="usage.report">usage.report</option>
                <option value="usage.order">usage.order</option>
                <option value="usage.search">usage.search</option>
                <option value="usage.imaging">usage.imaging</option>
                <option value="perf.latency">perf.latency</option>
                <option value="perf.rpc_duration">perf.rpc_duration</option>
                <option value="system.startup">system.startup</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 2 }}>Limit</label>
              <input
                type="number"
                value={eventLimit}
                onChange={(e) => setEventLimit(Number(e.target.value) || 50)}
                min={1}
                max={1000}
                style={{ padding: '6px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 13, width: 80 }}
              />
            </div>
            <button
              onClick={() => loadTab('events')}
              style={{ padding: '6px 16px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
            >
              Search
            </button>
          </div>

          {events && (
            <>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
                Showing {events.events.length} of {events.total} events
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e0e0e0', background: '#fafafa' }}>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Timestamp</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Category</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Metric</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Value</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Unit</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>User Hash</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Tags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.events.map((ev) => (
                      <tr key={ev.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                        <td style={{ padding: '4px 8px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                          {new Date(ev.timestamp).toLocaleString()}
                        </td>
                        <td style={{ padding: '4px 8px' }}>
                          <span style={{ padding: '1px 6px', background: '#e3f2fd', borderRadius: 3, fontSize: 11 }}>{ev.category}</span>
                        </td>
                        <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>{ev.metric}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{ev.value}</td>
                        <td style={{ padding: '4px 8px' }}>{ev.unit}</td>
                        <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 11 }}>{ev.userHash || '-'}</td>
                        <td style={{ padding: '4px 8px', fontSize: 11 }}>
                          {Object.entries(ev.tags || {}).map(([k, v]) => `${k}=${v}`).join(', ') || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Export Tab ── */}
      {tab === 'export' && !loading && (
        <div>
          {health && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ marginBottom: 8 }}>Analytics Health</h3>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                <MetricCard label="Events" value={health.eventBuffer.totalEvents} />
                <MetricCard label="Buffer Usage" value={`${Math.round(health.eventBuffer.bufferUsage * 100)}%`} />
                <MetricCard label="Hourly Buckets" value={health.aggregation.hourlyBuckets} />
                <MetricCard label="Daily Buckets" value={health.aggregation.dailyBuckets} />
                <MetricCard label="Dashboard Cache" value={health.dashboardCacheSize} />
              </div>
            </div>
          )}

          <h3 style={{ marginBottom: 8 }}>Export Analytics Data</h3>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
            Export analytics data as CSV. All exported data is aggregated or de-identified (no PHI).
          </p>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              disabled={exporting}
              onClick={() => handleExport('events')}
              style={{
                padding: '8px 20px', background: '#1976d2', color: '#fff', border: 'none',
                borderRadius: 4, cursor: exporting ? 'not-allowed' : 'pointer', fontSize: 13,
                opacity: exporting ? 0.6 : 1,
              }}
            >
              Export Events (CSV)
            </button>
            <button
              disabled={exporting}
              onClick={() => handleExport('aggregated')}
              style={{
                padding: '8px 20px', background: '#388e3c', color: '#fff', border: 'none',
                borderRadius: 4, cursor: exporting ? 'not-allowed' : 'pointer', fontSize: 13,
                opacity: exporting ? 0.6 : 1,
              }}
            >
              Export Aggregated (CSV)
            </button>
          </div>

          {exportMsg && (
            <div style={{
              marginTop: 12, padding: '8px 12px', borderRadius: 4, fontSize: 13,
              background: exportMsg.includes('failed') ? '#ffebee' : '#e8f5e9',
              color: exportMsg.includes('failed') ? '#c62828' : '#2e7d32',
            }}>
              {exportMsg}
            </div>
          )}

          <div style={{ marginTop: 24 }}>
            <h3 style={{ marginBottom: 8 }}>Trigger Aggregation</h3>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
              Force an immediate analytics aggregation run (normally runs hourly).
            </p>
            <button
              onClick={async () => {
                try {
                  await apiFetch('/analytics/aggregate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                  });
                  setExportMsg('Aggregation triggered successfully');
                  loadTab('export');
                } catch (e: any) {
                  setExportMsg(`Aggregation failed: ${e.message}`);
                }
              }}
              style={{
                padding: '8px 20px', background: '#f57c00', color: '#fff', border: 'none',
                borderRadius: 4, cursor: 'pointer', fontSize: 13,
              }}
            >
              Run Aggregation Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
