'use client';

/**
 * Admin Reporting Dashboard — Phase 19C.
 *
 * Multi-tab operations analytics dashboard with:
 *   - Operations report (RPC health, circuit breaker, process metrics)
 *   - Integrations report (health summary, queue metrics)
 *   - Audit report (event summary, filtered event list)
 *   - Clinical report (action counts, no PHI text)
 *   - Export panel (CSV/JSON download with audit trail)
 *
 * Accessible at /cprs/admin/reports. Requires admin role.
 */

import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/stores/session-context';
import styles from '@/components/cprs/cprs.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface OpsReport {
  ok: boolean;
  cached: boolean;
  timestamp: string;
  uptime: number;
  process: { heapUsedMB: number; heapTotalMB: number; rssMB: number; pid: number };
  rpcHealth: {
    circuitBreaker: { state: string; failures: number; totalCalls: number; totalFailures: number; totalTimeouts: number };
    cacheSize: number;
    totalRpcsCalled: number;
    totalSuccesses: number;
    totalFailures: number;
    totalTimeouts: number;
  };
  rpcMetrics: Record<string, { calls: number; successes: number; failures: number; timeouts: number; avgDurationMs: number; p95DurationMs: number; lastCallAt: string }>;
}

interface IntReport {
  ok: boolean;
  cached: boolean;
  timestamp: string;
  tenantId: string;
  summary: { total: number; enabled: number; connected: number; disconnected: number; degraded: number; unknown: number; disabled: number };
  byType: Record<string, number>;
  entries: Array<{ id: string; label: string; type: string; status: string; enabled: boolean; lastChecked: string | null; queueMetrics: { pending: number; processed: number; errors: number; avgLatencyMs: number } }>;
}

interface AuditReport {
  ok: boolean;
  stats: { total: number; byAction: Record<string, number>; byOutcome: Record<string, number>; oldestTimestamp: string | null; newestTimestamp: string | null };
  page: { limit: number; returned: number };
  events: Array<{ id: string; timestamp: string; action: string; outcome: string; actorDuz: string; actorName: string; actorRole: string; requestId?: string; patientDfn?: string }>;
}

interface ClinicalReport {
  ok: boolean;
  cached: boolean;
  timestamp: string;
  totalClinicalActions: number;
  totalPhiAccess: number;
  clinicalActionCounts: Record<string, number>;
  phiAccessCounts: Record<string, number>;
  uniquePatientCount: number;
  uniqueProviderCount: number;
  note: string;
}

interface ExportJob {
  id: string;
  reportType: string;
  format: string;
  status: string;
  requestedAt: string;
  completedAt?: string;
  rowCount?: number;
  requestedBy: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

type TabId = 'operations' | 'integrations' | 'audit' | 'clinical' | 'exports';

const TAB_LABELS: Record<TabId, string> = {
  operations: 'Operations',
  integrations: 'Integrations',
  audit: 'Audit Trail',
  clinical: 'Clinical Stats',
  exports: 'Exports',
};

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    connected: '#4caf50', closed: '#4caf50', open: '#f44336', 'half-open': '#ff9800',
    disconnected: '#f44336', degraded: '#ff9800', unknown: '#9e9e9e', disabled: '#bdbdbd',
  };
  return <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: colors[status] ?? '#9e9e9e', marginRight: 6 }} />;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function ReportsPage() {
  const { user, hasRole } = useSession();
  const [tab, setTab] = useState<TabId>('operations');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Report data
  const [opsReport, setOpsReport] = useState<OpsReport | null>(null);
  const [intReport, setIntReport] = useState<IntReport | null>(null);
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [clinicalReport, setClinicalReport] = useState<ClinicalReport | null>(null);
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);

  // Audit filters
  const [auditActionPrefix, setAuditActionPrefix] = useState('');
  const [auditLimit, setAuditLimit] = useState(100);

  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  /* ── Fetchers ──────────────────────────────────────────────────── */

  const fetchReport = useCallback(async (type: string, queryParams?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE}/reports/${type}${queryParams ? `?${queryParams}` : ''}`;
      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();
      if (!data.ok && data.error) { setError(data.error); return null; }
      return data;
    } catch (e: any) {
      setError(e.message || 'Failed to fetch report');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTab = useCallback(async (t: TabId) => {
    switch (t) {
      case 'operations': { const d = await fetchReport('operations'); if (d) setOpsReport(d); break; }
      case 'integrations': { const d = await fetchReport('integrations'); if (d) setIntReport(d); break; }
      case 'audit': {
        const params = new URLSearchParams();
        if (auditActionPrefix) params.set('actionPrefix', auditActionPrefix);
        params.set('limit', String(auditLimit));
        const d = await fetchReport('audit', params.toString());
        if (d) setAuditReport(d);
        break;
      }
      case 'clinical': { const d = await fetchReport('clinical'); if (d) setClinicalReport(d); break; }
      case 'exports': {
        try {
          const res = await fetch(`${API_BASE}/reports/export/jobs`, { credentials: 'include' });
          const data = await res.json();
          if (data.ok) setExportJobs(data.jobs);
        } catch { /* ignore */ }
        break;
      }
    }
  }, [fetchReport, auditActionPrefix, auditLimit]);

  useEffect(() => { loadTab(tab); }, [tab, loadTab]);

  /* ── Export handler ────────────────────────────────────────────── */

  const handleExport = useCallback(async (reportType: string, format: 'csv' | 'json') => {
    setExporting(true);
    setExportMsg(null);
    try {
      const res = await fetch(`${API_BASE}/reports/export`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType, format }),
      });
      const data = await res.json();
      if (data.ok) {
        setExportMsg(`Export created: ${data.jobId} (${data.rowCount} rows)`);
        // Auto-download if we got a URL
        if (data.downloadUrl) {
          const dlRes = await fetch(`${API_BASE}${data.downloadUrl}`, { credentials: 'include' });
          const blob = await dlRes.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${reportType}-export.${format}`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } else {
        setExportMsg(`Export failed: ${data.error}`);
      }
    } catch (e: any) {
      setExportMsg(`Export error: ${e.message}`);
    } finally {
      setExporting(false);
    }
  }, []);

  /* ── Guard ─────────────────────────────────────────────────────── */

  if (!user) {
    return <div className={styles.cprsPage}><p style={{ padding: 24 }}>Please log in to access reports.</p></div>;
  }

  if (!hasRole('admin')) {
    return <div className={styles.cprsPage}><p style={{ padding: 24 }}>Admin role required to access reporting dashboard.</p></div>;
  }

  /* ── Render ────────────────────────────────────────────────────── */

  return (
    <div className={styles.cprsPage}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #dee2e6' }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Reporting &amp; Export Governance</h2>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6c757d' }}>
          Phase 19 — Admin-only operations analytics. All report views and exports are fully audited.
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #dee2e6', background: '#f8f9fa' }}>
        {(Object.keys(TAB_LABELS) as TabId[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderBottom: tab === t ? '2px solid #0d6efd' : '2px solid transparent',
              background: tab === t ? '#fff' : 'transparent',
              color: tab === t ? '#0d6efd' : '#495057',
              fontWeight: tab === t ? 600 : 400,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ margin: '12px 24px', padding: 10, background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 4, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && <p style={{ padding: '12px 24px', fontSize: 13, color: '#6c757d' }}>Loading report…</p>}

      {/* Tab content */}
      <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1 }}>

        {/* ── Operations ────────────────────────────────────── */}
        {tab === 'operations' && opsReport && (
          <div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
              <StatCard label="Uptime" value={formatUptime(opsReport.uptime)} />
              <StatCard label="Circuit Breaker" value={opsReport.rpcHealth.circuitBreaker.state} />
              <StatCard label="Total RPCs" value={String(opsReport.rpcHealth.totalRpcsCalled)} />
              <StatCard label="Failures" value={String(opsReport.rpcHealth.totalFailures)} />
              <StatCard label="Timeouts" value={String(opsReport.rpcHealth.totalTimeouts)} />
              <StatCard label="Cache Entries" value={String(opsReport.rpcHealth.cacheSize)} />
              <StatCard label="Heap (MB)" value={String(opsReport.process.heapUsedMB)} />
              <StatCard label="RSS (MB)" value={String(opsReport.process.rssMB)} />
            </div>
            <h4 style={{ fontSize: 14, marginBottom: 8 }}>RPC Metrics</h4>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                  <th style={thStyle}>RPC Name</th>
                  <th style={thStyle}>Calls</th>
                  <th style={thStyle}>OK</th>
                  <th style={thStyle}>Fail</th>
                  <th style={thStyle}>Timeout</th>
                  <th style={thStyle}>Avg ms</th>
                  <th style={thStyle}>P95 ms</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(opsReport.rpcMetrics).map(([name, m]) => (
                  <tr key={name} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={tdStyle}>{name}</td>
                    <td style={tdStyle}>{m.calls}</td>
                    <td style={tdStyle}>{m.successes}</td>
                    <td style={tdStyle}>{m.failures}</td>
                    <td style={tdStyle}>{m.timeouts}</td>
                    <td style={tdStyle}>{m.avgDurationMs?.toFixed(1)}</td>
                    <td style={tdStyle}>{m.p95DurationMs?.toFixed(1)}</td>
                  </tr>
                ))}
                {Object.keys(opsReport.rpcMetrics).length === 0 && (
                  <tr><td colSpan={7} style={{ ...tdStyle, color: '#6c757d' }}>No RPC calls recorded yet</td></tr>
                )}
              </tbody>
            </table>
            <ExportBar reportType="operations" onExport={handleExport} exporting={exporting} />
          </div>
        )}

        {/* ── Integrations ──────────────────────────────────── */}
        {tab === 'integrations' && intReport && (
          <div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
              <StatCard label="Total" value={String(intReport.summary.total)} />
              <StatCard label="Enabled" value={String(intReport.summary.enabled)} />
              <StatCard label="Connected" value={String(intReport.summary.connected)} color="#4caf50" />
              <StatCard label="Disconnected" value={String(intReport.summary.disconnected)} color="#f44336" />
              <StatCard label="Degraded" value={String(intReport.summary.degraded)} color="#ff9800" />
              <StatCard label="Disabled" value={String(intReport.summary.disabled)} />
            </div>
            <h4 style={{ fontSize: 14, marginBottom: 8 }}>Integration Entries</h4>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Pending</th>
                  <th style={thStyle}>Processed</th>
                  <th style={thStyle}>Errors</th>
                  <th style={thStyle}>Avg ms</th>
                </tr>
              </thead>
              <tbody>
                {intReport.entries.map((e) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={tdStyle}>{e.label}</td>
                    <td style={tdStyle}>{e.type}</td>
                    <td style={tdStyle}><StatusDot status={e.status} />{e.status}</td>
                    <td style={tdStyle}>{e.queueMetrics?.pending ?? 0}</td>
                    <td style={tdStyle}>{e.queueMetrics?.processed ?? 0}</td>
                    <td style={tdStyle}>{e.queueMetrics?.errors ?? 0}</td>
                    <td style={tdStyle}>{e.queueMetrics?.avgLatencyMs?.toFixed(1) ?? '-'}</td>
                  </tr>
                ))}
                {intReport.entries.length === 0 && (
                  <tr><td colSpan={7} style={{ ...tdStyle, color: '#6c757d' }}>No integrations registered</td></tr>
                )}
              </tbody>
            </table>
            <ExportBar reportType="integrations" onExport={handleExport} exporting={exporting} />
          </div>
        )}

        {/* ── Audit ─────────────────────────────────────────── */}
        {tab === 'audit' && auditReport && (
          <div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
              <StatCard label="Total Events" value={String(auditReport.stats.total)} />
              {Object.entries(auditReport.stats.byOutcome).map(([k, v]) => (
                <StatCard key={k} label={k} value={String(v)} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <label style={{ fontSize: 12 }}>Filter prefix:</label>
              <input
                value={auditActionPrefix}
                onChange={(e) => setAuditActionPrefix(e.target.value)}
                placeholder="e.g. clinical, phi, auth"
                style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #ced4da', borderRadius: 3, width: 180 }}
              />
              <label style={{ fontSize: 12 }}>Limit:</label>
              <input
                type="number"
                value={auditLimit}
                onChange={(e) => setAuditLimit(Number(e.target.value) || 100)}
                style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #ced4da', borderRadius: 3, width: 60 }}
              />
              <button onClick={() => loadTab('audit')} style={btnStyle}>Apply</button>
            </div>
            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                  <th style={thStyle}>Timestamp</th>
                  <th style={thStyle}>Action</th>
                  <th style={thStyle}>Outcome</th>
                  <th style={thStyle}>Actor</th>
                  <th style={thStyle}>DFN</th>
                </tr>
              </thead>
              <tbody>
                {auditReport.events.map((e) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={tdStyle}>{new Date(e.timestamp).toLocaleString()}</td>
                    <td style={tdStyle}>{e.action}</td>
                    <td style={tdStyle}>{e.outcome}</td>
                    <td style={tdStyle}>{e.actorName} ({e.actorDuz})</td>
                    <td style={tdStyle}>{e.patientDfn || '-'}</td>
                  </tr>
                ))}
                {auditReport.events.length === 0 && (
                  <tr><td colSpan={5} style={{ ...tdStyle, color: '#6c757d' }}>No audit events match filters</td></tr>
                )}
              </tbody>
            </table>
            <p style={{ fontSize: 11, color: '#6c757d', marginTop: 8 }}>Showing {auditReport.page.returned} of {auditReport.stats.total} events</p>
            <ExportBar reportType="audit" onExport={handleExport} exporting={exporting} />
          </div>
        )}

        {/* ── Clinical ──────────────────────────────────────── */}
        {tab === 'clinical' && clinicalReport && (
          <div>
            <div style={{ padding: 10, background: '#e8f5e9', border: '1px solid #c8e6c9', borderRadius: 4, marginBottom: 16, fontSize: 12 }}>
              {clinicalReport.note}
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
              <StatCard label="Clinical Actions" value={String(clinicalReport.totalClinicalActions)} />
              <StatCard label="PHI Access Events" value={String(clinicalReport.totalPhiAccess)} />
              <StatCard label="Unique Patients" value={String(clinicalReport.uniquePatientCount)} />
              <StatCard label="Unique Providers" value={String(clinicalReport.uniqueProviderCount)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <h4 style={{ fontSize: 13, marginBottom: 8 }}>Clinical Action Counts</h4>
                {Object.entries(clinicalReport.clinicalActionCounts).length > 0 ? (
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <tbody>
                      {Object.entries(clinicalReport.clinicalActionCounts).map(([a, c]) => (
                        <tr key={a} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={tdStyle}>{a}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>{c}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p style={{ fontSize: 12, color: '#6c757d' }}>No clinical actions recorded</p>}
              </div>
              <div>
                <h4 style={{ fontSize: 13, marginBottom: 8 }}>PHI Access Counts</h4>
                {Object.entries(clinicalReport.phiAccessCounts).length > 0 ? (
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <tbody>
                      {Object.entries(clinicalReport.phiAccessCounts).map(([a, c]) => (
                        <tr key={a} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={tdStyle}>{a}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>{c}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p style={{ fontSize: 12, color: '#6c757d' }}>No PHI access events recorded</p>}
              </div>
            </div>
          </div>
        )}

        {/* ── Exports ───────────────────────────────────────── */}
        {tab === 'exports' && (
          <div>
            {exportMsg && (
              <div style={{ padding: 10, background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 4, marginBottom: 12, fontSize: 12 }}>
                {exportMsg}
              </div>
            )}
            <h4 style={{ fontSize: 14, marginBottom: 8 }}>Export Jobs</h4>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                  <th style={thStyle}>Job ID</th>
                  <th style={thStyle}>Report</th>
                  <th style={thStyle}>Format</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Rows</th>
                  <th style={thStyle}>Requested At</th>
                  <th style={thStyle}>By</th>
                </tr>
              </thead>
              <tbody>
                {exportJobs.map((j) => (
                  <tr key={j.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={tdStyle}>{j.id}</td>
                    <td style={tdStyle}>{j.reportType}</td>
                    <td style={tdStyle}>{j.format}</td>
                    <td style={tdStyle}>{j.status}</td>
                    <td style={tdStyle}>{j.rowCount ?? '-'}</td>
                    <td style={tdStyle}>{new Date(j.requestedAt).toLocaleString()}</td>
                    <td style={tdStyle}>{j.requestedBy}</td>
                  </tr>
                ))}
                {exportJobs.length === 0 && (
                  <tr><td colSpan={7} style={{ ...tdStyle, color: '#6c757d' }}>No export jobs</td></tr>
                )}
              </tbody>
            </table>
            <button onClick={() => loadTab('exports')} style={{ ...btnStyle, marginTop: 8 }}>Refresh</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                       */
/* ------------------------------------------------------------------ */

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: '10px 16px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 6, minWidth: 100, textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: '#6c757d', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || '#212529' }}>{value}</div>
    </div>
  );
}

function ExportBar({ reportType, onExport, exporting }: { reportType: string; onExport: (rt: string, fmt: 'csv' | 'json') => void; exporting: boolean }) {
  return (
    <div style={{ marginTop: 16, padding: '10px 0', borderTop: '1px solid #dee2e6', display: 'flex', gap: 8, alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: '#6c757d' }}>Export:</span>
      <button onClick={() => onExport(reportType, 'csv')} disabled={exporting} style={btnStyle}>CSV</button>
      <button onClick={() => onExport(reportType, 'json')} disabled={exporting} style={btnStyle}>JSON</button>
      {exporting && <span style={{ fontSize: 11, color: '#6c757d' }}>Exporting…</span>}
    </div>
  );
}

/* ---- Inline styles (matches existing CPRS admin patterns) ---- */

const thStyle: React.CSSProperties = { padding: '6px 10px', borderBottom: '2px solid #dee2e6', fontSize: 12, fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '5px 10px', fontSize: 12 };
const btnStyle: React.CSSProperties = {
  padding: '5px 14px', fontSize: 12, fontWeight: 500,
  background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer',
};
