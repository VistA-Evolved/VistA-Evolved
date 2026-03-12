'use client';

import { useEffect, useState } from 'react';
import { API_BASE as API } from '@/lib/api-config';

type Tab = 'ed' | 'or' | 'icu';

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: '12px 16px',
        minWidth: 140,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{label}</div>
    </div>
  );
}

async function fetchMetricsStrict<T>(path: string, metricKey: string): Promise<T> {
  const response = await fetch(`${API}${path}`, { credentials: 'include' });
  const text = await response.text();

  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Unexpected response from ${path}`);
  }

  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || `Request failed for ${path}`);
  }

  return data[metricKey] as T;
}

function EdDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchMetricsStrict<any>('/ed/board', 'metrics')
      .then((nextMetrics) => {
        if (cancelled) return;
        setMetrics(nextMetrics);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setMetrics(null);
        setError(err instanceof Error ? err.message : 'Failed to load ED board');
      });

    return () => {
      cancelled = true;
    };
  }, []);
  if (error) return <div>Unable to load ED board. {error}</div>;
  if (!metrics) return <div>Loading ED board...</div>;
  return (
    <div>
      <h3 style={{ margin: '8px 0' }}>Emergency Department Board</h3>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <MetricCard label="Total Visits" value={metrics.totalVisits} />
        <MetricCard label="Waiting" value={metrics.waitingCount} />
        <MetricCard label="Bedded" value={metrics.beddedCount} />
        <MetricCard label="Pending Admit" value={metrics.pendingAdmitCount} />
        <MetricCard label="Avg Wait (min)" value={metrics.avgWaitMinutes} />
        <MetricCard label="Avg LOS (min)" value={metrics.avgLosMinutes} />
        <MetricCard label="LWBS Rate %" value={metrics.lwbsRate} />
        <MetricCard label="Bed Occ %" value={metrics.bedOccupancyPct} />
      </div>
      {metrics.byAcuity && Object.keys(metrics.byAcuity).length > 0 && (
        <div>
          <strong>By Acuity:</strong>{' '}
          {Object.entries(metrics.byAcuity)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ')}
        </div>
      )}
    </div>
  );
}

function OrDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchMetricsStrict<any>('/or/board', 'metrics')
      .then((nextMetrics) => {
        if (cancelled) return;
        setMetrics(nextMetrics);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setMetrics(null);
        setError(err instanceof Error ? err.message : 'Failed to load OR board');
      });

    return () => {
      cancelled = true;
    };
  }, []);
  if (error) return <div>Unable to load OR board. {error}</div>;
  if (!metrics) return <div>Loading OR board...</div>;
  return (
    <div>
      <h3 style={{ margin: '8px 0' }}>Operating Room Board</h3>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <MetricCard label="Cases Today" value={metrics.totalCasesToday} />
        <MetricCard label="Completed" value={metrics.completedCases} />
        <MetricCard label="In Progress" value={metrics.inProgressCases} />
        <MetricCard label="Scheduled" value={metrics.scheduledRemaining} />
        <MetricCard label="Cancelled" value={metrics.cancelledCases} />
        <MetricCard label="Room Util %" value={metrics.roomUtilizationPct} />
      </div>
      {metrics.byRoom && (
        <div>
          <strong>Rooms:</strong>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            {Object.entries(metrics.byRoom).map(([roomId, info]: any) => (
              <span
                key={roomId}
                style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 12,
                  background:
                    info.status === 'in-use'
                      ? '#fef3c7'
                      : info.status === 'available'
                        ? '#d1fae5'
                        : '#e2e8f0',
                }}
              >
                {roomId}: {info.status}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function IcuDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchMetricsStrict<any>('/icu/metrics', 'metrics')
      .then((nextMetrics) => {
        if (cancelled) return;
        setMetrics(nextMetrics);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setMetrics(null);
        setError(err instanceof Error ? err.message : 'Failed to load ICU metrics');
      });

    return () => {
      cancelled = true;
    };
  }, []);
  if (error) return <div>Unable to load ICU metrics. {error}</div>;
  if (!metrics) return <div>Loading ICU metrics...</div>;
  return (
    <div>
      <h3 style={{ margin: '8px 0' }}>ICU Dashboard</h3>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <MetricCard label="Total Beds" value={metrics.totalBeds} />
        <MetricCard label="Occupied" value={metrics.occupiedBeds} />
        <MetricCard label="Occupancy %" value={metrics.occupancyPct} />
        <MetricCard label="Active" value={metrics.activeAdmissions} />
        <MetricCard label="Ventilated" value={metrics.ventilatedCount} />
        <MetricCard label="Avg LOS (hrs)" value={metrics.avgLosHours} />
      </div>
      {metrics.byUnit && (
        <div style={{ marginBottom: 8 }}>
          <strong>By Unit:</strong>{' '}
          {Object.entries(metrics.byUnit)
            .map(([unit, info]: any) => `${unit}: ${info.occupied}/${info.total}`)
            .join(', ')}
        </div>
      )}
      {metrics.byCodeStatus && Object.keys(metrics.byCodeStatus).length > 0 && (
        <div>
          <strong>Code Status:</strong>{' '}
          {Object.entries(metrics.byCodeStatus)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ')}
        </div>
      )}
    </div>
  );
}

export default function ServiceLineDashboardsPage() {
  const [tab, setTab] = useState<Tab>('ed');

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 16 }}>Service-Line Dashboards</h2>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {(['ed', 'or', 'icu'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 20px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: tab === t ? '#1e40af' : '#fff',
              color: tab === t ? '#fff' : '#1e293b',
              fontWeight: tab === t ? 700 : 400,
              cursor: 'pointer',
            }}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {tab === 'ed' && <EdDashboard />}
      {tab === 'or' && <OrDashboard />}
      {tab === 'icu' && <IcuDashboard />}
    </div>
  );
}
