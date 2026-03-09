'use client';

import { useEffect, useState, useCallback } from 'react';
import { API_BASE } from '@/lib/api-config';

/* ================================================================== */
/*  Phase 171 — Ops Admin Center                                       */
/* ================================================================== */

type Tab = 'overview' | 'alerts' | 'stores' | 'runbooks';

interface OpsAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  domain: string;
  message: string;
  runbookLink?: string;
  detectedAt: string;
}

interface OpsDomain {
  domain: string;
  score: number;
  passCount: number;
  totalGates: number;
  summary: string;
  alerts: OpsAlert[];
}

interface OpsOverview {
  overallScore: number;
  totalGates: number;
  passingGates: number;
  domains: OpsDomain[];
  alerts: OpsAlert[];
  storeCount: number;
  runbookCount: number;
  timestamp: string;
}

interface StoreInventory {
  total: number;
  byClassification: Record<string, number>;
  byDomain: Record<string, number>;
  byDurability: Record<string, number>;
  criticalInMemory: number;
}

interface RunbookEntry {
  name: string;
  path: string;
  domain: string;
}

export default function OpsAdminPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [overview, setOverview] = useState<OpsOverview | null>(null);
  const [alerts, setAlerts] = useState<OpsAlert[]>([]);
  const [stores, setStores] = useState<StoreInventory | null>(null);
  const [runbooks, setRunbooks] = useState<RunbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, alertRes, storeRes, rbRes] = await Promise.allSettled([
        fetch(`${API_BASE}/admin/ops/overview`, { credentials: 'include' }),
        fetch(`${API_BASE}/admin/ops/alerts`, { credentials: 'include' }),
        fetch(`${API_BASE}/admin/ops/store-inventory`, { credentials: 'include' }),
        fetch(`${API_BASE}/admin/ops/runbooks`, { credentials: 'include' }),
      ]);

      if (ovRes.status === 'fulfilled' && ovRes.value.ok) {
        const d = await ovRes.value.json();
        if (d.ok) setOverview(d.overview);
      }
      if (alertRes.status === 'fulfilled' && alertRes.value.ok) {
        const d = await alertRes.value.json();
        if (d.ok) setAlerts(d.alerts || []);
      }
      if (storeRes.status === 'fulfilled' && storeRes.value.ok) {
        const d = await storeRes.value.json();
        if (d.ok)
          setStores({
            total: d.total || 0,
            byClassification: d.byClassification || {},
            byDomain: d.byDomain || {},
            byDurability: d.byDurability || {},
            criticalInMemory: d.criticalInMemory || 0,
          });
      }
      if (rbRes.status === 'fulfilled' && rbRes.value.ok) {
        const d = await rbRes.value.json();
        if (d.ok) setRunbooks(d.runbooks || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch ops data');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'alerts', label: `Alerts${alerts.length > 0 ? ` (${alerts.length})` : ''}` },
    { key: 'stores', label: 'Store Inventory' },
    { key: 'runbooks', label: 'Runbooks' },
  ];

  function scoreColor(score: number): string {
    if (score >= 80) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  }

  function severityBadge(sev: string) {
    const colors: Record<string, string> = {
      critical: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6',
    };
    return (
      <span
        style={{
          background: colors[sev] || '#6b7280',
          color: 'white',
          padding: '2px 8px',
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 600,
          textTransform: 'uppercase',
        }}
      >
        {sev}
      </span>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Ops Admin Center</h1>
      <p style={{ color: '#6b7280', marginBottom: 16 }}>
        Unified operational visibility — posture, alerts, stores, runbooks
      </p>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e5e7eb', marginBottom: 16 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px',
              border: 'none',
              cursor: 'pointer',
              borderBottom: tab === t.key ? '2px solid #3b82f6' : '2px solid transparent',
              fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? '#3b82f6' : '#6b7280',
              background: 'transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p>Loading ops data...</p>}
      {error && <p style={{ color: '#ef4444' }}>Error: {error}</p>}

      {/* Overview Tab */}
      {tab === 'overview' && overview && (
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                padding: 16,
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                textAlign: 'center',
              }}
            >
              <div
                style={{ fontSize: 36, fontWeight: 700, color: scoreColor(overview.overallScore) }}
              >
                {overview.overallScore}%
              </div>
              <div style={{ color: '#6b7280', fontSize: 14 }}>Overall Score</div>
            </div>
            <div
              style={{
                padding: 16,
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 36, fontWeight: 700 }}>
                {overview.passingGates}/{overview.totalGates}
              </div>
              <div style={{ color: '#6b7280', fontSize: 14 }}>Gates Passing</div>
            </div>
            <div
              style={{
                padding: 16,
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 36, fontWeight: 700 }}>{overview.storeCount}</div>
              <div style={{ color: '#6b7280', fontSize: 14 }}>Tracked Stores</div>
            </div>
            <div
              style={{
                padding: 16,
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 36, fontWeight: 700 }}>{overview.runbookCount}</div>
              <div style={{ color: '#6b7280', fontSize: 14 }}>Runbooks</div>
            </div>
          </div>

          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Domain Health</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 12,
            }}
          >
            {overview.domains.map((d) => (
              <div
                key={d.domain}
                style={{
                  padding: 16,
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  borderLeft: `4px solid ${scoreColor(d.score)}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong style={{ textTransform: 'capitalize' }}>{d.domain}</strong>
                  <span style={{ color: scoreColor(d.score), fontWeight: 700 }}>{d.score}%</span>
                </div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>
                  {d.passCount}/{d.totalGates} gates passing
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{d.summary}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {tab === 'alerts' && (
        <div>
          {alerts.length === 0 && <p style={{ color: '#22c55e' }}>No active alerts.</p>}
          {alerts.map((a) => (
            <div
              key={a.id}
              style={{
                padding: 12,
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                marginBottom: 8,
                borderLeft: `4px solid ${a.severity === 'critical' ? '#ef4444' : a.severity === 'warning' ? '#f59e0b' : '#3b82f6'}`,
              }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                {severityBadge(a.severity)}
                <strong>{a.domain}</strong>
              </div>
              <div style={{ fontSize: 14 }}>{a.message}</div>
              {a.runbookLink && (
                <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 4 }}>{a.runbookLink}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Store Inventory Tab */}
      {tab === 'stores' && stores && (
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                padding: 16,
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 700 }}>{stores.total}</div>
              <div style={{ color: '#6b7280', fontSize: 14 }}>Total Stores</div>
            </div>
            <div
              style={{
                padding: 16,
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: stores.criticalInMemory > 20 ? '#ef4444' : '#22c55e',
                }}
              >
                {stores.criticalInMemory}
              </div>
              <div style={{ color: '#6b7280', fontSize: 14 }}>Critical In-Memory</div>
            </div>
            <div
              style={{
                padding: 16,
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 700 }}>
                {Object.keys(stores.byDomain).length}
              </div>
              <div style={{ color: '#6b7280', fontSize: 14 }}>Domains</div>
            </div>
          </div>

          <h3 style={{ fontWeight: 600, marginBottom: 8 }}>By Classification</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: 8 }}>Classification</th>
                <th style={{ textAlign: 'right', padding: 8 }}>Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stores.byClassification).map(([k, v]) => (
                <tr key={k} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: 8 }}>{k}</td>
                  <td style={{ textAlign: 'right', padding: 8 }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ fontWeight: 600, marginBottom: 8 }}>By Domain</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: 8 }}>Domain</th>
                <th style={{ textAlign: 'right', padding: 8 }}>Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stores.byDomain).map(([k, v]) => (
                <tr key={k} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: 8 }}>{k}</td>
                  <td style={{ textAlign: 'right', padding: 8 }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Runbooks Tab */}
      {tab === 'runbooks' && (
        <div>
          <p style={{ color: '#6b7280', marginBottom: 12 }}>{runbooks.length} runbooks indexed</p>
          {Object.entries(
            runbooks.reduce<Record<string, RunbookEntry[]>>((acc, rb) => {
              if (!acc[rb.domain]) acc[rb.domain] = [];
              acc[rb.domain].push(rb);
              return acc;
            }, {})
          ).map(([domain, rbs]) => (
            <div key={domain} style={{ marginBottom: 16 }}>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  marginBottom: 8,
                }}
              >
                {domain} ({rbs.length})
              </h3>
              {rbs.map((rb) => (
                <div
                  key={rb.name}
                  style={{
                    padding: 8,
                    borderBottom: '1px solid #f3f4f6',
                    fontSize: 14,
                  }}
                >
                  <span style={{ fontFamily: 'monospace' }}>{rb.name}</span>
                  <a
                    href={`https://github.com/nickmoul/VistA-Evolved/blob/main/${rb.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#2563eb',
                      marginLeft: 8,
                      textDecoration: 'underline',
                      fontSize: 12,
                    }}
                  >
                    {rb.path}
                  </a>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Refresh */}
      <div style={{ marginTop: 24 }}>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            padding: '8px 16px',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            cursor: 'pointer',
            background: 'white',
          }}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
        {overview && (
          <span style={{ color: '#9ca3af', marginLeft: 12, fontSize: 12 }}>
            Last updated: {new Date(overview.timestamp).toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}
