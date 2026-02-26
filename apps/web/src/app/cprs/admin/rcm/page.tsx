'use client';

/**
 * RCM (Revenue Cycle Management) -- Phase 38 + Phase 39 Billing Grounding + Phase 40 Payer Connectivity
 *
 * Tabbed interface for the RCM Gateway:
 *   - Claim Workqueue -- list claims by status, create/validate/submit/export
 *   - Payer Registry -- browse/search payers, CSV import, view integration mode
 *   - Connectors -- view connector health and EDI pipeline
 *   - VistA Billing -- live VistA encounter/insurance data + integration-pending surfaces
 *   - Audit -- hash-chained claim lifecycle audit trail
 *
 * Accessible at /cprs/admin/rcm. Requires session.
 */

import { useState, useEffect, useCallback } from 'react';
import styles from '@/components/cprs/cprs.module.css';
import { getCsrfTokenSync, getCsrfToken as fetchCsrfToken } from '@/lib/csrf';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type Tab = 'payers' | 'claims' | 'connectors' | 'audit' | 'vista-billing' | 'draft-from-vista' | 'workqueues' | 'rules' | 'directory' | 'transactions' | 'gateways' | 'adapters' | 'jobs' | 'eligibility' | 'claim-status' | 'ops-dashboard' | 'credential-vault' | 'accreditation' | 'claim-lifecycle' | 'evidence' | 'durable-jobs' | 'evidence-gate';

function getCsrfToken(): string {
  return getCsrfTokenSync();
}

async function apiFetch(path: string, opts?: RequestInit) {
  const headers: Record<string, string> = { ...((opts?.headers as Record<string, string>) ?? {}) };
  // Inject CSRF token for non-safe methods (Phase 132: from session, not cookie)
  const method = (opts?.method ?? 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    let token = getCsrfTokenSync();
    if (!token) token = await fetchCsrfToken();
    headers['x-csrf-token'] = token;
  }
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include', ...opts, headers });
  return res.json();
}

export default function RcmPage() {
  const [tab, setTab] = useState<Tab>('claims');
  const [health, setHealth] = useState<any>(null);
  const [safetyStatus, setSafetyStatus] = useState<any>(null);
  const [backendInfo, setBackendInfo] = useState<{ backend: string } | null>(null);

  useEffect(() => {
    apiFetch('/rcm/health').then(setHealth).catch(() => {});
    apiFetch('/rcm/submission-safety').then(setSafetyStatus).catch(() => {});
    apiFetch('/admin/payer-db/backend').then(setBackendInfo).catch(() => {});
  }, []);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'claims', label: 'Claim Workqueue' },
    { id: 'workqueues', label: 'Denial Workqueues' },
    { id: 'draft-from-vista', label: 'Draft from VistA' },
    { id: 'payers', label: 'Payer Registry' },
    { id: 'directory', label: 'Payer Directory' },
    { id: 'rules', label: 'Payer Rules' },
    { id: 'connectors', label: 'Connectors & EDI' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'vista-billing', label: 'VistA Billing' },
    { id: 'gateways', label: 'Gateway Readiness' },
    { id: 'adapters', label: 'Payer Adapters' },
    { id: 'jobs', label: 'Jobs & Polling' },
    { id: 'eligibility', label: 'Eligibility Checks' },
    { id: 'claim-status', label: 'Claim Status' },
    { id: 'ops-dashboard', label: 'Ops Dashboard' },
    { id: 'credential-vault', label: 'Credential Vault' },
    { id: 'accreditation', label: 'Accreditation' },
    { id: 'claim-lifecycle', label: 'Claim Lifecycle' },
    { id: 'evidence', label: 'Evidence Registry' },
    { id: 'durable-jobs', label: 'Durable Jobs' },
    { id: 'evidence-gate', label: 'Evidence Gate' },
    { id: 'audit', label: 'Audit Trail' },
  ];

  return (
    <div className={styles.cprsPage}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #dee2e6', display: 'flex', alignItems: 'center', gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Revenue Cycle Management</h2>
        {health && (
          <span style={{ fontSize: 11, color: health.ok ? '#198754' : '#dc3545', fontWeight: 600 }}>
            {health.ok ? 'ONLINE' : 'OFFLINE'}
          </span>
        )}
        {backendInfo && (
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
            background: backendInfo.backend === 'pg' ? '#d1e7dd' : '#e2e3e5',
            color: backendInfo.backend === 'pg' ? '#0f5132' : '#41464b',
          }}>
            {backendInfo.backend === 'pg' ? 'PostgreSQL' : 'SQLite'}
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6c757d' }}>Phase 40 -- Global RCM</span>
      </div>

      {/* Submission Safety Banner (Phase 40) */}
      {safetyStatus && !safetyStatus.enabled && (
        <div style={{
          padding: '8px 24px', background: '#fff3cd', borderBottom: '1px solid #ffecb5',
          fontSize: 12, color: '#664d03', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <strong>EXPORT-ONLY MODE</strong> -- Claims will be exported as X12 artifacts, not submitted to payers.
          Set CLAIM_SUBMISSION_ENABLED=true to enable live submission.
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #dee2e6', background: '#f8f9fa' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 20px', border: 'none', borderBottom: tab === t.id ? '2px solid #0d6efd' : '2px solid transparent',
              background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? '#0d6efd' : '#495057',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 20 }}>
        {tab === 'claims' && <ClaimsTab />}
        {tab === 'workqueues' && <WorkqueuesTab />}
        {tab === 'draft-from-vista' && <DraftFromVistaTab />}
        {tab === 'payers' && <PayersTab />}
        {tab === 'directory' && <DirectoryTab />}
        {tab === 'rules' && <RulesTab />}
        {tab === 'connectors' && <ConnectorsTab />}
        {tab === 'transactions' && <TransactionsTab />}
        {tab === 'vista-billing' && <VistaBillingTab />}
        {tab === 'gateways' && <GatewaysTab />}
        {tab === 'adapters' && <AdaptersTab />}
        {tab === 'jobs' && <JobsTab />}
        {tab === 'eligibility' && <EligibilityTab />}
        {tab === 'claim-status' && <ClaimStatusTab />}
        {tab === 'ops-dashboard' && <OpsDashboardTab />}
        {tab === 'credential-vault' && <CredentialVaultTab />}
        {tab === 'accreditation' && <AccreditationTab />}
        {tab === 'claim-lifecycle' && <ClaimLifecycleTab />}
        {tab === 'evidence' && <EvidenceRegistryTab />}
        {tab === 'durable-jobs' && <DurableJobsTab />}
        {tab === 'evidence-gate' && <EvidenceGateTab />}
        {tab === 'audit' && <AuditTab />}
      </div>
    </div>
  );
}

/* ─── Claims Tab ──────────────────────────────────────────────────── */

function ClaimsTab() {
  const [claims, setClaims] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch('/rcm/claims?limit=100'),
      apiFetch('/rcm/claims/stats'),
    ]).then(([claimData, statsData]) => {
      setClaims(claimData.items ?? []);
      setStats(statsData.stats ?? null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const statusColors: Record<string, string> = {
    draft: '#6c757d', validated: '#0d6efd', ready_to_submit: '#17a2b8',
    submitted: '#ffc107', accepted: '#198754', rejected: '#dc3545',
    paid: '#198754', denied: '#dc3545', appealed: '#fd7e14', closed: '#495057',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>Claim Workqueue</h3>
        <button onClick={refresh} style={{ padding: '6px 14px', fontSize: 12, cursor: 'pointer', borderRadius: 4, border: '1px solid #dee2e6', background: '#fff' }}>
          Refresh
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {Object.entries(stats.byStatus ?? {}).map(([status, count]) => (
            <div key={status} style={{ padding: '8px 14px', background: '#f8f9fa', borderRadius: 4, border: '1px solid #dee2e6', fontSize: 12 }}>
              <span style={{ color: statusColors[status] ?? '#495057', fontWeight: 600, textTransform: 'capitalize' }}>{status}</span>
              <span style={{ marginLeft: 8 }}>{count as number}</span>
            </div>
          ))}
          <div style={{ padding: '8px 14px', background: '#f8f9fa', borderRadius: 4, border: '1px solid #dee2e6', fontSize: 12 }}>
            <span style={{ fontWeight: 600 }}>Total</span>
            <span style={{ marginLeft: 8 }}>{stats.total ?? 0}</span>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ color: '#6c757d', fontSize: 13 }}>Loading claims...</p>
      ) : claims.length === 0 ? (
        <p style={{ color: '#6c757d', fontSize: 13 }}>No claims yet. Create a draft claim via the API.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Claim ID</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Patient</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Payer</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Type</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Amount</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Status</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Score</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Export</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {claims.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 11 }}>{c.id?.slice(0, 16)}...</td>
                <td style={{ padding: '6px 10px' }}>{c.patientLastName ? `${c.patientLastName}, ${c.patientFirstName ?? ''}` : c.patientDfn}</td>
                <td style={{ padding: '6px 10px' }}>{c.payerName ?? c.payerId}</td>
                <td style={{ padding: '6px 10px', textTransform: 'capitalize' }}>{c.claimType}</td>
                <td style={{ padding: '6px 10px' }}>${(c.totalCharge ?? 0).toFixed(2)}</td>
                <td style={{ padding: '6px 10px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, color: '#fff', background: statusColors[c.status] ?? '#6c757d' }}>
                    {c.status}
                  </span>
                  {c.isDemo && <span style={{ marginLeft: 4, fontSize: 10, color: '#dc3545', fontWeight: 600 }}>DEMO</span>}
                </td>
                <td style={{ padding: '6px 10px' }}>{c.validationResult?.readinessScore ?? '-'}</td>
                <td style={{ padding: '6px 10px' }}>
                  {c.exportArtifactPath
                    ? <span style={{ fontSize: 10, color: '#198754', fontWeight: 600 }} title={c.exportArtifactPath}>EXPORTED</span>
                    : '-'}
                </td>
                <td style={{ padding: '6px 10px', color: '#6c757d' }}>{c.serviceDate ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ─── Payers Tab ──────────────────────────────────────────────────── */

function PayersTab() {
  const [payers, setPayers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (country) params.set('country', country);
    params.set('limit', '200');

    Promise.all([
      apiFetch(`/rcm/payers?${params.toString()}`),
      apiFetch('/rcm/payers/stats'),
    ]).then(([payerData, statsData]) => {
      setPayers(payerData.items ?? []);
      setStats(statsData.stats ?? null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [search, country]);

  useEffect(() => { refresh(); }, [refresh]);

  const modeLabels: Record<string, string> = {
    clearinghouse_edi: 'EDI Clearinghouse',
    direct_api: 'Direct API',
    portal_batch: 'Portal/Batch',
    government_portal: 'Gov Portal',
    fhir_payer: 'FHIR',
    not_classified: 'Unclassified',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>Payer Registry</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Search payers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '6px 10px', fontSize: 12, borderRadius: 4, border: '1px solid #dee2e6', width: 200 }}
          />
          <select
            value={country}
            onChange={e => setCountry(e.target.value)}
            style={{ padding: '6px 10px', fontSize: 12, borderRadius: 4, border: '1px solid #dee2e6' }}
          >
            <option value="">All Countries</option>
            <option value="US">US</option>
            <option value="PH">Philippines</option>
            <option value="AU">Australia</option>
            <option value="SG">Singapore</option>
            <option value="NZ">New Zealand</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', fontSize: 12 }}>
          <span><strong>Total:</strong> {stats.total}</span>
          {Object.entries(stats.byCountry ?? {}).map(([c, n]) => (
            <span key={c}><strong>{c}:</strong> {n as number}</span>
          ))}
          {Object.entries(stats.byMode ?? {}).map(([m, n]) => (
            <span key={m}><strong>{modeLabels[m] ?? m}:</strong> {n as number}</span>
          ))}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#6c757d', fontSize: 13 }}>Loading payers...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Payer ID</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Name</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Country</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Integration</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Status</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Category</th>
            </tr>
          </thead>
          <tbody>
            {payers.map(p => (
              <tr key={p.payerId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 11 }}>{p.payerId}</td>
                <td style={{ padding: '6px 10px' }}>{p.name}</td>
                <td style={{ padding: '6px 10px' }}>{p.country}</td>
                <td style={{ padding: '6px 10px' }}>
                  <span style={{ padding: '2px 6px', background: '#e9ecef', borderRadius: 4, fontSize: 11 }}>
                    {modeLabels[p.integrationMode] ?? p.integrationMode}
                  </span>
                </td>
                <td style={{ padding: '6px 10px' }}>
                  <span style={{ color: p.status === 'active' ? '#198754' : '#dc3545', fontWeight: 600 }}>{p.status}</span>
                </td>
                <td style={{ padding: '6px 10px', textTransform: 'capitalize' }}>{p.category ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ─── Connectors Tab ──────────────────────────────────────────────── */

function ConnectorsTab() {
  const [connectors, setConnectors] = useState<any[]>([]);
  const [health, setHealth] = useState<Record<string, any>>({});
  const [pipelineStats, setPipelineStats] = useState<any>(null);
  const [jobStats, setJobStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/rcm/connectors'),
      apiFetch('/rcm/connectors/health'),
      apiFetch('/rcm/edi/pipeline/stats'),
      apiFetch('/rcm/jobs/stats'),
    ]).then(([cData, hData, pData, jData]) => {
      setConnectors(cData.connectors ?? []);
      setHealth(hData.health ?? {});
      setPipelineStats(pData.stats ?? null);
      setJobStats(jData.stats ?? null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>Connectors & EDI Pipeline</h3>

      {loading ? (
        <p style={{ color: '#6c757d', fontSize: 13 }}>Loading...</p>
      ) : (
        <>
          {/* Connector list */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 24 }}>
            {connectors.map((c: any) => {
              const h = health[c.id];
              return (
                <div key={c.id} style={{ padding: 16, border: '1px solid #dee2e6', borderRadius: 6, background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <strong style={{ fontSize: 13 }}>{c.name}</strong>
                    <span style={{ fontSize: 11, color: h?.healthy ? '#198754' : '#dc3545', fontWeight: 600 }}>
                      {h?.healthy ? 'HEALTHY' : 'DEGRADED'}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#6c757d' }}>
                    <div>ID: <code>{c.id}</code></div>
                    <div>Modes: {c.supportedModes?.join(', ')}</div>
                    <div>Transactions: {c.supportedTransactions?.slice(0, 5).join(', ')}{c.supportedTransactions?.length > 5 ? '...' : ''}</div>
                    {h?.details && <div style={{ marginTop: 4, fontStyle: 'italic' }}>{h.details}</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pipeline stats */}
          {pipelineStats && (
            <div>
              <h4 style={{ fontSize: 14, marginBottom: 8 }}>EDI Pipeline Statistics</h4>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12 }}>
                <span><strong>Total entries:</strong> {pipelineStats.total}</span>
                <span><strong>Errors:</strong> {pipelineStats.errorCount}</span>
              </div>
              {pipelineStats.byStage && Object.keys(pipelineStats.byStage).length > 0 && (
                <div style={{ marginTop: 8, fontSize: 12 }}>
                  <strong>By Stage:</strong>{' '}
                  {Object.entries(pipelineStats.byStage).map(([s, n]) => `${s}: ${n}`).join(' | ')}
                </div>
              )}
              {pipelineStats.byTransaction && Object.keys(pipelineStats.byTransaction).length > 0 && (
                <div style={{ marginTop: 4, fontSize: 12 }}>
                  <strong>By Transaction:</strong>{' '}
                  {Object.entries(pipelineStats.byTransaction).map(([t, n]) => `${t}: ${n}`).join(' | ')}
                </div>
              )}
            </div>
          )}

          {/* Job Queue Stats */}
          {jobStats && (
            <div style={{ marginTop: 24 }}>
              <h4 style={{ fontSize: 14, marginBottom: 8 }}>Job Queue</h4>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12 }}>
                <span><strong>Total:</strong> {jobStats.total ?? 0}</span>
                {Object.entries(jobStats.byStatus ?? {}).map(([s, n]) => (
                  <span key={s}><strong>{s}:</strong> {n as number}</span>
                ))}
              </div>
              {jobStats.byType && Object.keys(jobStats.byType).length > 0 && (
                <div style={{ marginTop: 4, fontSize: 12 }}>
                  <strong>By Type:</strong>{' '}
                  {Object.entries(jobStats.byType).map(([t, n]) => `${t}: ${n}`).join(' | ')}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Durable Jobs Tab (Phase 142) ──────────────────────────────── */

function DurableJobsTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    apiFetch('/rcm/ops/jobs/durable')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handlePurge = async () => {
    setPurgeResult(null);
    try {
      const res = await apiFetch('/rcm/ops/jobs/durable/purge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ olderThanMs: 86400000 }),
      });
      setPurgeResult(res.ok ? `Purged ${res.purged ?? 0} jobs` : (res.error ?? 'Purge failed'));
      refresh();
    } catch {
      setPurgeResult('Purge request failed');
    }
  };

  const handleFollowupTick = async () => {
    try {
      const res = await apiFetch('/rcm/ops/denial-followup/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      setPurgeResult(res.ok
        ? `Followup tick: ${res.approachingSla ?? 0} approaching, ${res.overdueSla ?? 0} overdue, ${res.workItemsCreated ?? 0} work items`
        : (res.error ?? 'Followup tick failed'));
    } catch {
      setPurgeResult('Followup tick request failed');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>Durable Job Queue</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleFollowupTick} style={{ padding: '6px 14px', fontSize: 12, cursor: 'pointer', borderRadius: 4, border: '1px solid #fd7e14', background: '#fff3cd', color: '#664d03' }}>
            Run Denial Followup
          </button>
          <button onClick={handlePurge} style={{ padding: '6px 14px', fontSize: 12, cursor: 'pointer', borderRadius: 4, border: '1px solid #dc3545', background: '#f8d7da', color: '#842029' }}>
            Purge Completed
          </button>
          <button onClick={refresh} style={{ padding: '6px 14px', fontSize: 12, cursor: 'pointer', borderRadius: 4, border: '1px solid #dee2e6', background: '#fff' }}>
            Refresh
          </button>
        </div>
      </div>

      {purgeResult && (
        <div style={{ padding: '8px 16px', marginBottom: 12, background: '#d1e7dd', border: '1px solid #badbcc', borderRadius: 4, fontSize: 12 }}>
          {purgeResult}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#6c757d', fontSize: 13 }}>Loading...</p>
      ) : !data?.ok ? (
        <p style={{ color: '#dc3545', fontSize: 13 }}>Failed to load durable job data: {data?.error ?? 'unknown error'}</p>
      ) : (
        <>
          {/* Stats summary */}
          {data.stats && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              {Object.entries(data.stats).map(([k, v]) => (
                <div key={k} style={{ padding: '8px 14px', background: '#f8f9fa', borderRadius: 4, border: '1px solid #dee2e6', fontSize: 12 }}>
                  <span style={{ fontWeight: 600 }}>{k}</span>
                  <span style={{ marginLeft: 8 }}>{String(v)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Recent jobs */}
          {data.jobs && Array.isArray(data.jobs.jobs) && data.jobs.jobs.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid #dee2e6' }}>ID</th>
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid #dee2e6' }}>Type</th>
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid #dee2e6' }}>Status</th>
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid #dee2e6' }}>Attempts</th>
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid #dee2e6' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {data.jobs.jobs.map((job: any) => (
                  <tr key={job.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11 }}>{job.id?.slice(0, 8)}...</td>
                    <td style={{ padding: '8px 12px' }}>{job.type}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                        background: job.status === 'completed' ? '#d1e7dd' : job.status === 'failed' ? '#f8d7da' : job.status === 'processing' ? '#cfe2ff' : '#e2e3e5',
                        color: job.status === 'completed' ? '#0f5132' : job.status === 'failed' ? '#842029' : job.status === 'processing' ? '#084298' : '#41464b',
                      }}>
                        {job.status}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>{job.attempts ?? 0}/{job.maxAttempts ?? 3}</td>
                    <td style={{ padding: '8px 12px', fontSize: 11, color: '#6c757d' }}>{job.createdAt ? new Date(job.createdAt).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#6c757d', fontSize: 13 }}>No durable jobs found.</p>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Evidence Gate Tab (Phase 142) ─────────────────────────────── */

function EvidenceGateTab() {
  const [payerId, setPayerId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkGate = async () => {
    if (!payerId.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await apiFetch(`/rcm/ops/evidence-gate/check?payerId=${encodeURIComponent(payerId.trim())}`);
      setResult(res);
    } catch {
      setResult({ ok: false, error: 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 style={{ margin: '0 0 16px 0', fontSize: 15 }}>Evidence Gate Check</h3>
      <p style={{ fontSize: 12, color: '#6c757d', margin: '0 0 16px 0' }}>
        Check whether a payer has verified evidence for each integration method.
        Missing or stale evidence blocks live integration calls.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          value={payerId}
          onChange={e => setPayerId(e.target.value)}
          placeholder="Enter payer ID"
          style={{ padding: '6px 12px', fontSize: 13, border: '1px solid #dee2e6', borderRadius: 4, width: 300 }}
        />
        <button
          onClick={checkGate}
          disabled={loading || !payerId.trim()}
          style={{ padding: '6px 14px', fontSize: 12, cursor: 'pointer', borderRadius: 4, border: '1px solid #0d6efd', background: '#0d6efd', color: '#fff' }}
        >
          {loading ? 'Checking...' : 'Check'}
        </button>
      </div>

      {result && !result.ok && (
        <div style={{ padding: '8px 16px', background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: 4, fontSize: 12, color: '#842029' }}>
          {result.error ?? 'Unknown error'}
        </div>
      )}

      {result?.ok && result.overview && (
        <div>
          <h4 style={{ fontSize: 13, margin: '16px 0 8px 0' }}>Evidence Overview for {result.payerId}</h4>
          <p style={{ fontSize: 12, color: result.overview.hasAnyVerified ? '#0f5132' : '#842029', margin: '0 0 12px 0' }}>
            {result.overview.recommendation}
          </p>
          {Array.isArray(result.overview.methods) && result.overview.methods.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid #dee2e6' }}>Method</th>
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid #dee2e6' }}>Status</th>
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid #dee2e6' }}>Last Verified</th>
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid #dee2e6' }}>Stale</th>
                </tr>
              </thead>
              <tbody>
                {result.overview.methods.map((m: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{m.method}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                        background: m.status === 'verified' ? '#d1e7dd' : '#f8d7da',
                        color: m.status === 'verified' ? '#0f5132' : '#842029',
                      }}>
                        {m.status?.toUpperCase() ?? 'UNKNOWN'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', color: '#6c757d', fontSize: 11 }}>{m.lastVerified ? new Date(m.lastVerified).toLocaleString() : 'Never'}</td>
                    <td style={{ padding: '8px 12px' }}>
                      {m.stale && <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, background: '#fff3cd', color: '#664d03' }}>STALE</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#6c757d', fontSize: 12 }}>No evidence records registered for this payer.</p>
          )}
        </div>
      )}

      {result?.ok && !result.overview && result.allowed !== undefined && (
        <div style={{ padding: '12px 16px', marginTop: 12, background: result.allowed ? '#d1e7dd' : '#f8d7da', border: `1px solid ${result.allowed ? '#badbcc' : '#f5c6cb'}`, borderRadius: 4, fontSize: 12 }}>
          <strong>{result.allowed ? 'ALLOWED' : 'BLOCKED'}</strong>
          {result.reason && <span style={{ marginLeft: 8 }}> {result.reason}</span>}
        </div>
      )}
    </div>
  );
}

/* ─── Audit Tab ───────────────────────────────────────────────────── */

function AuditTab() {
  const [entries, setEntries] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [chainValid, setChainValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/rcm/audit?limit=100'),
      apiFetch('/rcm/audit/stats'),
      apiFetch('/rcm/audit/verify'),
    ]).then(([auditData, statsData, verifyData]) => {
      setEntries(auditData.items ?? []);
      setStats(statsData.stats ?? null);
      setChainValid(verifyData.valid ?? null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>RCM Audit Trail</h3>
        {chainValid !== null && (
          <span style={{
            padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
            background: chainValid ? '#d1e7dd' : '#f8d7da',
            color: chainValid ? '#0f5132' : '#842029',
          }}>
            Chain: {chainValid ? 'VALID' : 'BROKEN'}
          </span>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', fontSize: 12 }}>
          <span><strong>Total entries:</strong> {stats.total}</span>
          {Object.entries(stats.byAction ?? {}).slice(0, 8).map(([a, n]) => (
            <span key={a}><strong>{a}:</strong> {n as number}</span>
          ))}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#6c757d', fontSize: 13 }}>Loading audit trail...</p>
      ) : entries.length === 0 ? (
        <p style={{ color: '#6c757d', fontSize: 13 }}>No audit entries yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Seq</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Action</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Claim ID</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Payer</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Timestamp</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Hash</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '6px 10px' }}>{e.seq}</td>
                <td style={{ padding: '6px 10px' }}>
                  <code style={{ fontSize: 11, background: '#e9ecef', padding: '1px 4px', borderRadius: 2 }}>{e.action}</code>
                </td>
                <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 11 }}>{e.claimId?.slice(0, 12) ?? '-'}</td>
                <td style={{ padding: '6px 10px' }}>{e.payerId ?? '-'}</td>
                <td style={{ padding: '6px 10px', color: '#6c757d' }}>{new Date(e.timestamp).toLocaleString()}</td>
                <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 10, color: '#adb5bd' }}>{e.hash?.slice(0, 12)}...</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ─── Draft from VistA Tab (Phase 42) ─────────────────────────────── */

function DraftFromVistaTab() {
  const [patientIen, setPatientIen] = useState('3');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [encounters, setEncounters] = useState<any>(null);
  const [coverage, setCoverage] = useState<any>(null);
  const [draftResult, setDraftResult] = useState<any>(null);
  const [selectedEncounter, setSelectedEncounter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'select' | 'review' | 'done'>('select');
  const [rpcCheck, setRpcCheck] = useState<any>(null);

  const checkRpcAvailability = () => {
    setLoading(true);
    apiFetch('/rcm/vista/rpc-check')
      .then(data => { setRpcCheck(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const fetchEncounters = () => {
    if (!patientIen) return;
    setLoading(true);
    setDraftResult(null);
    setStep('select');
    const params = new URLSearchParams({ patientIen });
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);

    Promise.all([
      apiFetch(`/rcm/vista/encounters?${params}`),
      apiFetch(`/rcm/vista/coverage?patientIen=${patientIen}`),
    ]).then(([enc, cov]) => {
      setEncounters(enc);
      setCoverage(cov);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  const generateDraft = () => {
    setLoading(true);
    const body: any = { patientIen };
    if (selectedEncounter) body.encounterId = selectedEncounter;
    if (dateFrom) body.dateFrom = dateFrom;
    if (dateTo) body.dateTo = dateTo;

    apiFetch('/rcm/vista/claim-drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(result => {
      setDraftResult(result);
      setStep('review');
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  const prerequisitesCheck = () => {
    // Determine wrapper RPC status from rpcCheck if available
    const wrapperRpc = rpcCheck?.rpcs?.find((r: any) => r.name === 'VE RCM PROVIDER INFO');
    const wrapperStatus: 'ok' | 'missing' | 'pending' = wrapperRpc
      ? (wrapperRpc.available ? 'ok' : 'pending')
      : 'pending';
    const issues: Array<{ field: string; source: string; status: 'ok' | 'missing' | 'pending' }> = [
      { field: 'Encounters (PCE)', source: 'ORWPCE VISIT', status: encounters?.ok && encounters.count > 0 ? 'ok' : 'missing' },
      { field: 'Insurance Coverage', source: 'IBCN INSURANCE QUERY', status: coverage?.ok && coverage.count > 0 ? 'ok' : 'missing' },
      { field: 'Provider NPI/Facility', source: 'VE RCM PROVIDER INFO', status: wrapperStatus },
      { field: 'IB Charges', source: '^IB(350)', status: 'pending' },
      { field: 'Claims Tracking', source: '^DGCR(399)', status: 'pending' },
    ];
    return issues;
  };

  return (
    <div>
      <div style={{ background: '#e8f4fd', border: '1px solid #bee5eb', borderRadius: 6, padding: 14, marginBottom: 16 }}>
        <strong style={{ fontSize: 14 }}>Draft Claims from VistA Encounters</strong>
        <p style={{ fontSize: 12, color: '#0c5460', margin: '6px 0 0' }}>
          Select a patient, review encounters, and generate claim drafts from real VistA PCE data.
          Missing data is annotated with the exact VistA source needed.
        </p>
      </div>

      {/* RPC Availability Check */}
      <div style={{ marginBottom: 16 }}>
        <button onClick={checkRpcAvailability} disabled={loading} style={{
          padding: '5px 14px', background: '#6c757d', color: 'white', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer',
        }}>
          {loading && !encounters ? 'Checking...' : '0. Check RPC Availability'}
        </button>
        {rpcCheck && (
          <div style={{ border: '1px solid #dee2e6', borderRadius: 6, padding: 10, marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              RPC Availability: {rpcCheck.summary || 'unknown'}
              {rpcCheck.allRequired === true && <span style={{ color: '#198754', marginLeft: 8 }}>All required RPCs available</span>}
              {rpcCheck.allRequired === false && <span style={{ color: '#dc3545', marginLeft: 8 }}>Some required RPCs missing</span>}
            </div>
            {rpcCheck.rpcs?.map((r: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, marginBottom: 2 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                  background: r.available === true ? '#198754' : r.available === false ? '#dc3545' : '#fd7e14',
                }} />
                <span style={{ fontFamily: 'monospace' }}>{r.name}</span>
                <span style={{ color: '#6c757d' }}>({r.source})</span>
                {r.required && <span style={{ fontSize: 9, fontWeight: 700, color: '#dc3545' }}>REQUIRED</span>}
                {r.available === false && r.error && (
                  <span style={{ color: '#dc3545', fontSize: 10 }}>-- {r.description}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 1: Patient + Date Selection */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Patient IEN:</label>
        <input
          value={patientIen} onChange={e => setPatientIen(e.target.value)}
          style={{ padding: '4px 8px', border: '1px solid #ced4da', borderRadius: 4, width: 80, fontSize: 13 }}
        />
        <label style={{ fontSize: 12, fontWeight: 600 }}>From:</label>
        <input
          type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          style={{ padding: '4px 8px', border: '1px solid #ced4da', borderRadius: 4, fontSize: 12 }}
        />
        <label style={{ fontSize: 12, fontWeight: 600 }}>To:</label>
        <input
          type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          style={{ padding: '4px 8px', border: '1px solid #ced4da', borderRadius: 4, fontSize: 12 }}
        />
        <button onClick={fetchEncounters} disabled={loading} style={{
          padding: '5px 14px', background: '#0d6efd', color: 'white', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer',
        }}>
          {loading ? 'Loading...' : '1. Fetch Encounters'}
        </button>
      </div>

      {/* Prerequisites Checklist */}
      {encounters && (
        <div style={{ border: '1px solid #dee2e6', borderRadius: 6, padding: 12, marginBottom: 16 }}>
          <strong style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>Prerequisites Checklist</strong>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {prerequisitesCheck().map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                  background: item.status === 'ok' ? '#198754' : item.status === 'pending' ? '#fd7e14' : '#dc3545',
                }} />
                <span>{item.field}</span>
                <span style={{ color: '#6c757d', fontSize: 10 }}>({item.source})</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                  color: item.status === 'ok' ? '#198754' : item.status === 'pending' ? '#fd7e14' : '#dc3545',
                }}>{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coverage Summary */}
      {coverage?.ok && coverage.count > 0 && (
        <div style={{ background: '#d1e7dd', border: '1px solid #badbcc', borderRadius: 6, padding: 10, marginBottom: 14, fontSize: 12 }}>
          <strong>Insurance:</strong> {coverage.results.map((p: any) => p.insuranceName || p.policyId).join(', ')}
        </div>
      )}

      {/* Encounter Selection */}
      {encounters?.ok && encounters.count > 0 && step === 'select' && (
        <div style={{ border: '1px solid #dee2e6', borderRadius: 6, padding: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <strong style={{ fontSize: 13 }}>Select Encounter(s)</strong>
            <span style={{ fontSize: 11, color: '#6c757d' }}>{encounters.count} encounters found</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                <th style={{ padding: '6px 8px', borderBottom: '1px solid #dee2e6', width: 40 }}></th>
                <th style={{ padding: '6px 8px', borderBottom: '1px solid #dee2e6' }}>Visit IEN</th>
                <th style={{ padding: '6px 8px', borderBottom: '1px solid #dee2e6' }}>Date/Time</th>
                <th style={{ padding: '6px 8px', borderBottom: '1px solid #dee2e6' }}>Location</th>
                <th style={{ padding: '6px 8px', borderBottom: '1px solid #dee2e6' }}>Type</th>
              </tr>
            </thead>
            <tbody>
              {encounters.results.slice(0, 25).map((e: any, i: number) => (
                <tr key={i} style={{
                  borderBottom: '1px solid #f0f0f0',
                  background: selectedEncounter === e.visitIen ? '#e7f1ff' : 'transparent',
                  cursor: 'pointer',
                }} onClick={() => setSelectedEncounter(selectedEncounter === e.visitIen ? '' : e.visitIen)}>
                  <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                    <input type="radio" checked={selectedEncounter === e.visitIen} readOnly />
                  </td>
                  <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>{e.visitIen}</td>
                  <td style={{ padding: '4px 8px' }}>{e.dateTime}</td>
                  <td style={{ padding: '4px 8px' }}>{e.location}</td>
                  <td style={{ padding: '4px 8px' }}>{e.visitType || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={generateDraft} disabled={loading} style={{
            marginTop: 12, padding: '6px 18px', background: '#198754', color: 'white',
            border: 'none', borderRadius: 4, fontSize: 13, cursor: 'pointer', fontWeight: 600,
          }}>
            {loading ? 'Generating...' : `2. Generate Draft${selectedEncounter ? ` (Visit ${selectedEncounter})` : ' (All Encounters)'}`}
          </button>
        </div>
      )}

      {/* Draft Results */}
      {step === 'review' && draftResult && (
        <div style={{ border: '1px solid #dee2e6', borderRadius: 6, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <strong style={{ fontSize: 14 }}>3. Review Draft Candidates</strong>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
              color: draftResult.ok ? '#198754' : '#dc3545',
              border: `1px solid ${draftResult.ok ? '#198754' : '#dc3545'}`,
            }}>{draftResult.ok ? `${draftResult.candidates?.length || 0} DRAFTS` : 'ERROR'}</span>
          </div>

          {draftResult.errors?.length > 0 && (
            <div style={{ background: '#fff3cd', border: '1px solid #ffecb5', borderRadius: 4, padding: 8, marginBottom: 12, fontSize: 12, color: '#664d03' }}>
              {draftResult.errors.map((e: string, i: number) => <div key={i}>{e}</div>)}
            </div>
          )}

          {draftResult.candidates?.map((c: any, i: number) => (
            <div key={i} style={{ border: '1px solid #e9ecef', borderRadius: 6, padding: 12, marginBottom: 12, background: '#fafafa' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <strong style={{ fontSize: 13 }}>Visit {c.encounter?.visitIen}</strong>
                <span style={{ fontSize: 11, color: '#6c757d' }}>{c.encounter?.dateTime} - {c.encounter?.location}</span>
                <code style={{ fontSize: 10, background: '#e9ecef', padding: '1px 4px', borderRadius: 2 }}>{c.claim?.id?.slice(0, 8)}</code>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, marginBottom: 8 }}>
                <div><strong>Diagnoses:</strong> {c.claim?.diagnoses?.length || 0}</div>
                <div><strong>Procedures:</strong> {c.claim?.lines?.length || 0}</div>
                <div><strong>Payer:</strong> {c.claim?.payerName || c.claim?.payerId || 'None'}</div>
                <div><strong>Total Charge:</strong> ${((c.claim?.totalCharge || 0) / 100).toFixed(2)}</div>
              </div>

              {/* Missing fields */}
              {c.missingFields?.length > 0 && (
                <div style={{ background: '#fff8f0', border: '1px solid #ffc107', borderRadius: 4, padding: 8, fontSize: 11 }}>
                  <strong style={{ color: '#856404' }}>Missing Fields:</strong>
                  <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                    {c.sourceMissing?.map((m: any, j: number) => (
                      <li key={j} style={{ color: '#856404', marginBottom: 2 }}>
                        <strong>{m.field}:</strong> {m.reason} <span style={{ color: '#adb5bd' }}>({m.vistaSource})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* RPCs called */}
              <div style={{ fontSize: 10, color: '#adb5bd', marginTop: 6 }}>
                RPCs: {c.rpcsCalled?.join(', ')}
              </div>
            </div>
          ))}

          <div style={{ fontSize: 11, color: '#6c757d', marginTop: 8 }}>
            RPCs called: {draftResult.rpcsCalled?.join(', ')}
          </div>
        </div>
      )}

      {/* Empty state */}
      {encounters?.ok && encounters.count === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#6c757d', fontSize: 13 }}>
          No encounters found for patient {patientIen}. Try a different patient or date range.
        </div>
      )}
    </div>
  );
}

/* ─── VistA Billing Tab (Phase 39) ────────────────────────────────── */

function VistaBillingTab() {
  const [dfn, setDfn] = useState('3');
  const [encounters, setEncounters] = useState<any>(null);
  const [insurance, setInsurance] = useState<any>(null);
  const [charges, setCharges] = useState<any>(null);
  const [claimsStatus, setClaimsStatus] = useState<any>(null);
  const [arStatus, setArStatus] = useState<any>(null);
  const [icdText, setIcdText] = useState('');
  const [icdResults, setIcdResults] = useState<any>(null);
  const [capMap, setCapMap] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(() => {
    if (!dfn) return;
    setLoading(true);
    Promise.all([
      apiFetch(`/vista/rcm/encounters?dfn=${dfn}`),
      apiFetch(`/vista/rcm/insurance?dfn=${dfn}`),
      apiFetch(`/vista/rcm/charges?dfn=${dfn}`),
      apiFetch(`/vista/rcm/claims-status?dfn=${dfn}`),
      apiFetch(`/vista/rcm/ar-status?dfn=${dfn}`),
      apiFetch('/vista/rcm/capability-map'),
    ]).then(([enc, ins, chg, cls, ar, cm]) => {
      setEncounters(enc);
      setInsurance(ins);
      setCharges(chg);
      setClaimsStatus(cls);
      setArStatus(ar);
      setCapMap(cm);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [dfn]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const searchIcd = () => {
    if (!icdText || icdText.length < 2) return;
    apiFetch(`/vista/rcm/icd-search?text=${encodeURIComponent(icdText)}`).then(setIcdResults);
  };

  const statusBadge = (status: string) => {
    const color = status === 'live' ? '#198754' : status === 'integration-pending' ? '#fd7e14' : '#6c757d';
    return (
      <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', padding: '2px 6px', border: `1px solid ${color}`, borderRadius: 3 }}>
        {status}
      </span>
    );
  };

  const pendingPanel = (data: any, title: string) => {
    if (!data || !data.vistaGrounding) return null;
    const g = data.vistaGrounding;
    return (
      <div style={{ background: '#fff8f0', border: '1px solid #ffc107', borderRadius: 6, padding: 14, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <strong style={{ fontSize: 13 }}>{title}</strong>
          {statusBadge('integration-pending')}
        </div>
        <div style={{ fontSize: 12, color: '#856404' }}>
          <p style={{ margin: '4px 0' }}><strong>VistA Files:</strong> {g.vistaFiles.join(', ')}</p>
          <p style={{ margin: '4px 0' }}><strong>Target Routines:</strong> {g.targetRoutines.join(', ')}</p>
          <p style={{ margin: '4px 0' }}><strong>Migration Path:</strong> {g.migrationPath}</p>
          <p style={{ margin: '4px 0', fontStyle: 'italic' }}>{g.sandboxNote}</p>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 600 }}>Patient DFN:</label>
        <input
          value={dfn} onChange={(e) => setDfn(e.target.value)}
          style={{ padding: '4px 8px', border: '1px solid #ced4da', borderRadius: 4, width: 80, fontSize: 13 }}
        />
        <button onClick={fetchAll} disabled={loading} style={{ padding: '4px 12px', background: '#0d6efd', color: 'white', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>
          {loading ? 'Loading...' : 'Fetch Billing Data'}
        </button>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6c757d' }}>Phase 39 -- VistA-First Billing Grounding</span>
      </div>

      {/* Capability Summary */}
      {capMap && capMap.summary && (
        <div style={{ background: '#f0f7ff', border: '1px solid #b6d4fe', borderRadius: 6, padding: 12, marginBottom: 16, fontSize: 12 }}>
          <strong>Capability Summary:</strong>{' '}
          {capMap.summary.liveEndpoints} live endpoints, {capMap.summary.pendingEndpoints} integration-pending |{' '}
          {capMap.summary.totalRpcsProbed} billing RPCs probed
        </div>
      )}

      {/* LIVE: Encounters */}
      {encounters && encounters.ok && (
        <div style={{ border: '1px solid #dee2e6', borderRadius: 6, padding: 14, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <strong style={{ fontSize: 13 }}>Encounters (PCE Visits)</strong>
            {statusBadge(encounters.status || 'live')}
            <span style={{ fontSize: 11, color: '#6c757d' }}>RPC: {encounters.rpcUsed}</span>
          </div>
          {encounters.count === 0 ? (
            <p style={{ fontSize: 12, color: '#6c757d' }}>No encounters found for this patient.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #dee2e6' }}>Visit IEN</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #dee2e6' }}>Date/Time</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #dee2e6' }}>Location</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #dee2e6' }}>Type</th>
                </tr>
              </thead>
              <tbody>
                {encounters.results.slice(0, 20).map((e: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>{e.visitIen}</td>
                    <td style={{ padding: '4px 8px' }}>{e.dateTime}</td>
                    <td style={{ padding: '4px 8px' }}>{e.location}</td>
                    <td style={{ padding: '4px 8px' }}>{e.visitType || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ fontSize: 10, color: '#adb5bd', marginTop: 6 }}>
            VistA Files: {(encounters.vistaFiles || []).join(', ')}
          </div>
        </div>
      )}

      {/* LIVE: Insurance */}
      {insurance && insurance.ok && (
        <div style={{ border: '1px solid #dee2e6', borderRadius: 6, padding: 14, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <strong style={{ fontSize: 13 }}>Insurance Coverage</strong>
            {statusBadge(insurance.status || 'live')}
            <span style={{ fontSize: 11, color: '#6c757d' }}>RPC: {insurance.rpcUsed}</span>
          </div>
          {insurance.count === 0 ? (
            <p style={{ fontSize: 12, color: '#6c757d' }}>No insurance records found for this patient.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #dee2e6' }}>Policy ID</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #dee2e6' }}>Insurance</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #dee2e6' }}>Group #</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #dee2e6' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {insurance.results.map((p: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>{p.policyId}</td>
                    <td style={{ padding: '4px 8px' }}>{p.insuranceName}</td>
                    <td style={{ padding: '4px 8px' }}>{p.groupNumber || '-'}</td>
                    <td style={{ padding: '4px 8px' }}>{p.status || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ fontSize: 10, color: '#adb5bd', marginTop: 6 }}>
            VistA Files: {(insurance.vistaFiles || []).join(', ')}
          </div>
        </div>
      )}

      {/* ICD Search */}
      <div style={{ border: '1px solid #dee2e6', borderRadius: 6, padding: 14, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <strong style={{ fontSize: 13 }}>ICD-10 Code Search</strong>
          {statusBadge('live')}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            value={icdText} onChange={(e) => setIcdText(e.target.value)}
            placeholder="e.g. diabetes, hypertension..."
            onKeyDown={(e) => e.key === 'Enter' && searchIcd()}
            style={{ padding: '4px 8px', border: '1px solid #ced4da', borderRadius: 4, flex: 1, fontSize: 12 }}
          />
          <button onClick={searchIcd} style={{ padding: '4px 12px', background: '#0d6efd', color: 'white', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>
            Search
          </button>
        </div>
        {icdResults && icdResults.ok && (
          <div>
            <p style={{ fontSize: 11, color: '#6c757d', marginBottom: 6 }}>{icdResults.count} results for &quot;{icdResults.searchText}&quot; (RPC: {icdResults.rpcUsed})</p>
            {icdResults.results.slice(0, 15).map((r: any, i: number) => (
              <div key={i} style={{ fontSize: 12, padding: '3px 0', borderBottom: '1px solid #f0f0f0' }}>
                <code style={{ background: '#e9ecef', padding: '1px 4px', borderRadius: 2, fontSize: 11 }}>{r.code || r.ien}</code>{' '}
                {r.displayText}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* INTEGRATION-PENDING panels */}
      {pendingPanel(charges, 'IB Charges')}
      {pendingPanel(claimsStatus, 'Claims Tracking')}
      {pendingPanel(arStatus, 'Accounts Receivable')}
    </div>
  );
}

/* ─── Denial Workqueues Tab (Phase 43) ────────────────────────────── */

function WorkqueuesTab() {
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('open');

  const refresh = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterType) params.set('type', filterType);
    if (filterStatus) params.set('status', filterStatus);
    params.set('limit', '100');

    Promise.all([
      apiFetch(`/rcm/workqueues?${params.toString()}`),
      apiFetch('/rcm/workqueues/stats'),
    ]).then(([wqData, statsData]) => {
      setItems(wqData.items ?? []);
      setStats(statsData.stats ?? null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [filterType, filterStatus]);

  useEffect(() => { refresh(); }, [refresh]);

  const priorityColors: Record<string, string> = {
    critical: '#dc3545', high: '#fd7e14', medium: '#ffc107', low: '#198754',
  };
  const typeLabels: Record<string, string> = {
    rejection: 'Rejection (999/277CA)', denial: 'Denial (835)', missing_info: 'Missing Info (277)',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>Denial Workqueues</h3>
        <button onClick={refresh} style={{ padding: '6px 14px', fontSize: 12, cursor: 'pointer', borderRadius: 4, border: '1px solid #dee2e6', background: '#fff' }}>
          Refresh
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {Object.entries(stats.byType ?? {}).map(([type, count]) => (
            <div key={type} style={{ padding: '8px 14px', background: '#f8f9fa', borderRadius: 4, border: '1px solid #dee2e6', fontSize: 12 }}>
              <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{type.replace('_', ' ')}</span>
              <span style={{ marginLeft: 8 }}>{count as number}</span>
            </div>
          ))}
          <div style={{ padding: '8px 14px', background: '#f8f9fa', borderRadius: 4, border: '1px solid #dee2e6', fontSize: 12 }}>
            <span style={{ fontWeight: 600 }}>Total</span>
            <span style={{ marginLeft: 8 }}>{stats.total ?? 0}</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          style={{ padding: '4px 8px', border: '1px solid #ced4da', borderRadius: 4, fontSize: 12 }}>
          <option value="">All Types</option>
          <option value="rejection">Rejections</option>
          <option value="denial">Denials</option>
          <option value="missing_info">Missing Info</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '4px 8px', border: '1px solid #ced4da', borderRadius: 4, fontSize: 12 }}>
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="escalated">Escalated</option>
        </select>
      </div>

      {loading ? (
        <p style={{ color: '#6c757d', fontSize: 13 }}>Loading workqueue items...</p>
      ) : items.length === 0 ? (
        <p style={{ color: '#6c757d', fontSize: 13 }}>No workqueue items match the filters.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Priority</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Type</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Claim</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Reason Code</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Description</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Recommended Action</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Status</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '6px 10px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, color: '#fff', background: priorityColors[item.priority] ?? '#6c757d' }}>
                    {item.priority}
                  </span>
                </td>
                <td style={{ padding: '6px 10px', textTransform: 'capitalize' }}>{typeLabels[item.type] ?? item.type}</td>
                <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 11 }}>{item.claimId?.slice(0, 12)}...</td>
                <td style={{ padding: '6px 10px' }}>
                  <code style={{ background: '#e9ecef', padding: '1px 4px', borderRadius: 2, fontSize: 11 }}>{item.reasonCode}</code>
                  {item.reasonCategory && <span style={{ marginLeft: 4, fontSize: 10, color: '#6c757d' }}>({item.reasonCategory})</span>}
                </td>
                <td style={{ padding: '6px 10px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.reasonDescription}>
                  {item.reasonDescription}
                </td>
                <td style={{ padding: '6px 10px', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#0d6efd' }} title={item.recommendedAction}>
                  {item.recommendedAction}
                </td>
                <td style={{ padding: '6px 10px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                    background: item.status === 'open' ? '#ffc107' : item.status === 'resolved' ? '#198754' : '#17a2b8',
                    color: item.status === 'open' ? '#000' : '#fff' }}>
                    {item.status}
                  </span>
                </td>
                <td style={{ padding: '6px 10px', color: '#6c757d', fontSize: 11 }}>{item.createdAt?.slice(0, 16)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ─── Payer Rules Tab (Phase 43) ──────────────────────────────────── */

function RulesTab() {
  const [rules, setRules] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch('/rcm/rules?limit=200'),
      apiFetch('/rcm/rules/stats'),
    ]).then(([rulesData, statsData]) => {
      setRules(rulesData.rules ?? []);
      setStats(statsData.stats ?? null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>Payer Rules</h3>
        <button onClick={refresh} style={{ padding: '6px 14px', fontSize: 12, cursor: 'pointer', borderRadius: 4, border: '1px solid #dee2e6', background: '#fff' }}>
          Refresh
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ padding: '8px 14px', background: '#f8f9fa', borderRadius: 4, border: '1px solid #dee2e6', fontSize: 12 }}>
            <span style={{ fontWeight: 600 }}>Total Rules</span>
            <span style={{ marginLeft: 8 }}>{stats.total ?? 0}</span>
          </div>
          <div style={{ padding: '8px 14px', background: '#f8f9fa', borderRadius: 4, border: '1px solid #dee2e6', fontSize: 12 }}>
            <span style={{ fontWeight: 600, color: '#198754' }}>Enabled</span>
            <span style={{ marginLeft: 8 }}>{stats.enabled ?? 0}</span>
          </div>
          <div style={{ padding: '8px 14px', background: '#f8f9fa', borderRadius: 4, border: '1px solid #dee2e6', fontSize: 12 }}>
            <span style={{ fontWeight: 600, color: '#dc3545' }}>Disabled</span>
            <span style={{ marginLeft: 8 }}>{stats.disabled ?? 0}</span>
          </div>
          {Object.entries(stats.byCategory ?? {}).map(([cat, count]) => (
            <div key={cat} style={{ padding: '8px 14px', background: '#f8f9fa', borderRadius: 4, border: '1px solid #dee2e6', fontSize: 12 }}>
              <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{cat.replace('_', ' ')}</span>
              <span style={{ marginLeft: 8 }}>{count as number}</span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#6c757d', fontSize: 13 }}>Loading rules...</p>
      ) : rules.length === 0 ? (
        <p style={{ color: '#6c757d', fontSize: 13 }}>No payer rules configured.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Payer</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Name</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Category</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Severity</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Condition</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Action on Fail</th>
              <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Enabled</th>
            </tr>
          </thead>
          <tbody>
            {rules.map(rule => (
              <tr key={rule.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '6px 10px', fontWeight: 600 }}>{rule.payerId === '*' ? 'ALL' : rule.payerId}</td>
                <td style={{ padding: '6px 10px' }}>{rule.name}</td>
                <td style={{ padding: '6px 10px', textTransform: 'capitalize' }}>{rule.category?.replace('_', ' ')}</td>
                <td style={{ padding: '6px 10px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                    background: rule.severity === 'error' ? '#dc3545' : rule.severity === 'warning' ? '#ffc107' : '#17a2b8',
                    color: rule.severity === 'warning' ? '#000' : '#fff' }}>
                    {rule.severity}
                  </span>
                </td>
                <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 10, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={JSON.stringify(rule.condition)}>
                  {rule.condition?.type}: {rule.condition?.field ?? rule.condition?.maxDaysFromService ?? rule.condition?.minCents ?? ''}
                </td>
                <td style={{ padding: '6px 10px', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rule.actionOnFail}>
                  {rule.actionOnFail}
                </td>
                <td style={{ padding: '6px 10px' }}>
                  {rule.enabled
                    ? <span style={{ color: '#198754', fontWeight: 600, fontSize: 11 }}>YES</span>
                    : <span style={{ color: '#dc3545', fontWeight: 600, fontSize: 11 }}>NO</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ─── Payer Directory Tab (Phase 44) ──────────────────────────────── */

function DirectoryTab() {
  const [stats, setStats] = useState<any>(null);
  const [payers, setPayers] = useState<any[]>([]);
  const [importers, setImporters] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [enrollment, setEnrollment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'payers' | 'importers' | 'enrollment' | 'history'>('payers');
  const [countryFilter, setCountryFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch('/rcm/directory/stats'),
      apiFetch('/rcm/directory/payers' + (countryFilter ? `?country=${countryFilter}` : '')),
      apiFetch('/rcm/directory/importers'),
      apiFetch('/rcm/directory/history'),
      apiFetch('/rcm/enrollment'),
    ]).then(([statsData, payersData, importersData, historyData, enrollmentData]) => {
      setStats(statsData);
      setPayers(payersData.payers ?? []);
      setImporters(importersData.importers ?? []);
      setHistory(historyData.history ?? []);
      setEnrollment(enrollmentData.packets ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [countryFilter]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await apiFetch('/rcm/directory/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const subTabs: { id: typeof subTab; label: string }[] = [
    { id: 'payers', label: 'Directory Payers' },
    { id: 'importers', label: 'Importers' },
    { id: 'enrollment', label: 'Enrollment Packets' },
    { id: 'history', label: 'Refresh History' },
  ];

  const typeColors: Record<string, string> = {
    NATIONAL: '#198754', PRIVATE: '#0d6efd', NETWORK: '#17a2b8',
    CLEARINGHOUSE: '#ffc107', GOVERNMENT: '#6f42c1',
  };

  const statusColors: Record<string, string> = {
    NOT_STARTED: '#6c757d', IN_PROGRESS: '#ffc107', TESTING: '#17a2b8',
    LIVE: '#198754', SUSPENDED: '#dc3545',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>Payer Directory Engine</h3>
        {stats && (
          <span style={{ fontSize: 11, color: '#6c757d' }}>
            {stats.total ?? 0} payers across {Object.keys(stats.byCountry ?? {}).length} jurisdictions
          </span>
        )}
        <button onClick={handleRefresh} disabled={refreshing}
          style={{ marginLeft: 'auto', padding: '4px 12px', fontSize: 11, background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          {refreshing ? 'Refreshing...' : 'Refresh Directory'}
        </button>
      </div>

      {/* Country filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {['', 'US', 'PH', 'AU', 'SG', 'NZ'].map(c => (
          <button key={c} onClick={() => setCountryFilter(c)}
            style={{
              padding: '4px 10px', fontSize: 11, border: '1px solid #dee2e6', borderRadius: 4,
              background: countryFilter === c ? '#0d6efd' : '#fff', color: countryFilter === c ? '#fff' : '#333',
              cursor: 'pointer',
            }}>
            {c || 'All'}
          </button>
        ))}
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #dee2e6', marginBottom: 16 }}>
        {subTabs.map(st => (
          <button key={st.id} onClick={() => setSubTab(st.id)}
            style={{
              padding: '8px 16px', border: 'none', borderBottom: subTab === st.id ? '2px solid #0d6efd' : '2px solid transparent',
              background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: subTab === st.id ? 600 : 400,
              color: subTab === st.id ? '#0d6efd' : '#495057',
            }}>
            {st.label}
          </button>
        ))}
      </div>

      {loading ? <div style={{ color: '#6c757d', fontSize: 13 }}>Loading...</div> : (
        <>
          {subTab === 'payers' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Payer ID</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Name</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Country</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Type</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Channels</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Source</th>
                </tr>
              </thead>
              <tbody>
                {payers.map((p: any) => (
                  <tr key={p.payerId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 11 }}>{p.payerId}</td>
                    <td style={{ padding: '6px 10px', fontWeight: 500 }}>{p.displayName}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>{p.country}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                        background: typeColors[p.payerType] ?? '#6c757d', color: p.payerType === 'CLEARINGHOUSE' ? '#000' : '#fff' }}>
                        {p.payerType}
                      </span>
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', fontSize: 11 }}>
                      {(p.channels ?? []).map((ch: any) => ch.channelType).join(', ')}
                    </td>
                    <td style={{ padding: '6px 10px', fontSize: 10, color: '#6c757d' }}>{typeof p.regulatorySource === 'object' && p.regulatorySource ? (p.regulatorySource.authority ?? JSON.stringify(p.regulatorySource)) : (p.regulatorySource ?? '-')}</td>
                  </tr>
                ))}
                {payers.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 16, textAlign: 'center', color: '#6c757d' }}>No directory payers found. Click Refresh Directory.</td></tr>
                )}
              </tbody>
            </table>
          )}

          {subTab === 'importers' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Importer ID</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Name</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Country</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>File Import</th>
                </tr>
              </thead>
              <tbody>
                {importers.map((imp: any) => (
                  <tr key={imp.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 11 }}>{imp.id}</td>
                    <td style={{ padding: '6px 10px' }}>{imp.name}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>{imp.country}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                      {imp.supportsFileImport
                        ? <span style={{ color: '#198754', fontWeight: 600 }}>YES</span>
                        : <span style={{ color: '#6c757d' }}>No</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {subTab === 'enrollment' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Payer ID</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Status</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Cert Requirements</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Go-Live Steps</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {enrollment.map((pkt: any) => (
                  <tr key={pkt.payerId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 11 }}>{pkt.payerId}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                        background: statusColors[pkt.enrollmentStatus] ?? '#6c757d', color: pkt.enrollmentStatus === 'IN_PROGRESS' ? '#000' : '#fff' }}>
                        {pkt.enrollmentStatus}
                      </span>
                    </td>
                    <td style={{ padding: '6px 10px', fontSize: 11 }}>{(pkt.certRequirements ?? []).length}</td>
                    <td style={{ padding: '6px 10px', fontSize: 11 }}>{(pkt.goLiveChecklist ?? []).length}</td>
                    <td style={{ padding: '6px 10px', fontSize: 11, color: '#6c757d', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pkt.notes ?? '-'}
                    </td>
                  </tr>
                ))}
                {enrollment.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 16, textAlign: 'center', color: '#6c757d' }}>No enrollment packets yet.</td></tr>
                )}
              </tbody>
            </table>
          )}

          {subTab === 'history' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Timestamp</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Importer</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Added</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Removed</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Modified</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 10 }}>
                      {new Date(h.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: '6px 10px' }}>{h.importerId}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', color: '#198754', fontWeight: 600 }}>
                      {h.diff?.added?.length ?? 0}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', color: '#dc3545', fontWeight: 600 }}>
                      {h.diff?.removed?.length ?? 0}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', color: '#ffc107', fontWeight: 600 }}>
                      {h.diff?.modified?.length ?? 0}
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 16, textAlign: 'center', color: '#6c757d' }}>No refresh history yet.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Transactions Tab (Phase 45) ────────────────────────────────── */

function TransactionsTab() {
  const [txns, setTxns] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [translators, setTranslators] = useState<any[]>([]);
  const [connectivity, setConnectivity] = useState<any>(null);
  const [dlq, setDlq] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'list' | 'stats' | 'translators' | 'connectivity' | 'dlq'>('list');

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch('/rcm/transactions?limit=100'),
      apiFetch('/rcm/transactions/stats'),
      apiFetch('/rcm/translators'),
      apiFetch('/rcm/connectivity/health'),
      apiFetch('/rcm/transactions/dlq'),
    ]).then(([txnData, statsData, trData, connData, dlqData]) => {
      setTxns(txnData.items ?? []);
      setStats(statsData.stats ?? null);
      setTranslators(trData.translators ?? []);
      setConnectivity(connData);
      setDlq(dlqData.items ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const stateColors: Record<string, string> = {
    created: '#6c757d', serialized: '#0d6efd', validated: '#17a2b8', queued: '#ffc107',
    transmitted: '#0d6efd', ack_pending: '#ffc107', ack_accepted: '#198754', ack_rejected: '#dc3545',
    response_pending: '#ffc107', response_received: '#198754', reconciled: '#198754',
    failed: '#dc3545', cancelled: '#6c757d', dlq: '#dc3545',
  };

  const subTabs: { id: typeof subTab; label: string }[] = [
    { id: 'list', label: 'Transaction List' },
    { id: 'stats', label: 'Statistics' },
    { id: 'translators', label: 'Translators' },
    { id: 'connectivity', label: 'Connectivity' },
    { id: 'dlq', label: `DLQ (${dlq.length})` },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>Transaction Engine</h3>
        <span style={{ fontSize: 11, color: '#6c757d' }}>Phase 45</span>
        <button onClick={refresh} style={{ marginLeft: 'auto', padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>
          Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {subTabs.map(st => (
          <button key={st.id} onClick={() => setSubTab(st.id)}
            style={{
              padding: '6px 14px', fontSize: 12, border: '1px solid #dee2e6',
              borderRadius: 4, cursor: 'pointer',
              background: subTab === st.id ? '#0d6efd' : '#fff',
              color: subTab === st.id ? '#fff' : '#495057',
            }}>
            {st.label}
          </button>
        ))}
      </div>

      {loading ? <p style={{ color: '#6c757d', fontSize: 13 }}>Loading...</p> : (
        <>
          {subTab === 'list' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>ID</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Type</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>State</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Control #</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Sender</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Receiver</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Retries</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((t: any) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 10 }}>{t.id?.slice(0, 20)}</td>
                    <td style={{ padding: '6px 10px', fontWeight: 600 }}>{t.envelope?.transactionSet}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                        background: stateColors[t.state] ?? '#6c757d', color: '#fff' }}>
                        {t.state}
                      </span>
                    </td>
                    <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 10 }}>{t.envelope?.controlNumber}</td>
                    <td style={{ padding: '6px 10px', fontSize: 11 }}>{t.envelope?.senderId?.trim()}</td>
                    <td style={{ padding: '6px 10px', fontSize: 11 }}>{t.envelope?.receiverId?.trim()}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>{t.retryCount ?? 0}</td>
                    <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 10 }}>
                      {t.createdAt ? new Date(t.createdAt).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
                {txns.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: 16, textAlign: 'center', color: '#6c757d' }}>No transactions yet.</td></tr>
                )}
              </tbody>
            </table>
          )}

          {subTab === 'stats' && stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div style={{ padding: 16, background: '#f8f9fa', borderRadius: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.total ?? 0}</div>
                <div style={{ fontSize: 12, color: '#6c757d' }}>Total Transactions</div>
              </div>
              <div style={{ padding: 16, background: '#f8f9fa', borderRadius: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#dc3545' }}>{stats.dlqCount ?? 0}</div>
                <div style={{ fontSize: 12, color: '#6c757d' }}>Dead Letter Queue</div>
              </div>
              <div style={{ padding: 16, background: '#f8f9fa', borderRadius: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#dc3545' }}>{stats.failedCount ?? 0}</div>
                <div style={{ fontSize: 12, color: '#6c757d' }}>Failed</div>
              </div>
              {stats.byState && Object.keys(stats.byState).length > 0 && (
                <div style={{ padding: 16, background: '#f8f9fa', borderRadius: 8, gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>By State</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {Object.entries(stats.byState).map(([state, count]) => (
                      <span key={state} style={{ padding: '4px 10px', background: stateColors[state] ?? '#6c757d', color: '#fff', borderRadius: 10, fontSize: 11 }}>
                        {state}: {count as number}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {subTab === 'translators' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>ID</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Name</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Available</th>
                </tr>
              </thead>
              <tbody>
                {translators.map((tr: any) => (
                  <tr key={tr.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{tr.id}</td>
                    <td style={{ padding: '6px 10px' }}>{tr.name}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                        background: tr.available ? '#198754' : '#dc3545', color: '#fff' }}>
                        {tr.available ? 'YES' : 'NO'}
                      </span>
                    </td>
                  </tr>
                ))}
                {translators.length === 0 && (
                  <tr><td colSpan={3} style={{ padding: 16, textAlign: 'center', color: '#6c757d' }}>No translators registered.</td></tr>
                )}
              </tbody>
            </table>
          )}

          {subTab === 'connectivity' && connectivity && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div style={{ padding: 16, background: '#f8f9fa', borderRadius: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 700,
                  color: connectivity.status === 'healthy' ? '#198754' : connectivity.status === 'degraded' ? '#ffc107' : '#dc3545' }}>
                  {(connectivity.status ?? 'unknown').toUpperCase()}
                </div>
                <div style={{ fontSize: 12, color: '#6c757d' }}>Connectivity Status</div>
              </div>
              <div style={{ padding: 16, background: '#f8f9fa', borderRadius: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{connectivity.dlqDepth ?? 0}</div>
                <div style={{ fontSize: 12, color: '#6c757d' }}>DLQ Depth</div>
              </div>
              <div style={{ padding: 16, background: '#f8f9fa', borderRadius: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{connectivity.overdueAcks ?? 0}</div>
                <div style={{ fontSize: 12, color: '#6c757d' }}>Overdue Acks</div>
              </div>
            </div>
          )}

          {subTab === 'dlq' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>ID</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Type</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Retries</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Last Error</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #dee2e6' }}>Updated</th>
                </tr>
              </thead>
              <tbody>
                {dlq.map((t: any) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 10 }}>{t.id?.slice(0, 20)}</td>
                    <td style={{ padding: '6px 10px', fontWeight: 600 }}>{t.envelope?.transactionSet}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>{t.retryCount ?? 0}</td>
                    <td style={{ padding: '6px 10px', fontSize: 11, color: '#dc3545' }}>
                      {(t.errors ?? []).length > 0 ? t.errors[t.errors.length - 1]?.description : '-'}
                    </td>
                    <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 10 }}>
                      {t.updatedAt ? new Date(t.updatedAt).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
                {dlq.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 16, textAlign: 'center', color: '#198754' }}>Dead letter queue is empty.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * Gateway Readiness Tab (Phase 46)
 * ═══════════════════════════════════════════════════════════════════ */

function GatewaysTab() {
  const [gateways, setGateways] = useState<any[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
  const [conformance, setConformance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch('/rcm/gateways/readiness')
      .then((d: any) => setGateways(d.gateways ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadConformance = useCallback((id: string) => {
    setSelectedGateway(id);
    apiFetch(`/rcm/conformance/gateways/${id}`)
      .then((d: any) => setConformance(d.conformance ?? null))
      .catch(() => setConformance(null));
  }, []);

  const statusColor = (s: string) => s === 'green' ? '#198754' : s === 'amber' ? '#fd7e14' : '#dc3545';
  const statusIcon = (s: string) => s === 'green' ? '\u2705' : s === 'amber' ? '\u26A0\uFE0F' : '\u274C';

  if (loading) return <div style={{ padding: 20, color: '#6c757d' }}>Loading gateway readiness...</div>;

  return (
    <div>
      <h3 style={{ margin: '0 0 8px 0', fontSize: 16 }}>National Gateway Readiness</h3>
      <p style={{ margin: '0 0 16px 0', fontSize: 12, color: '#6c757d' }}>
        Unified readiness checklist for all national gateways. Click a gateway for conformance details.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
        {gateways.map((gw: any) => (
          <div
            key={gw.gatewayId}
            onClick={() => loadConformance(gw.gatewayId)}
            style={{
              border: `2px solid ${statusColor(gw.overallStatus)}`,
              borderRadius: 8, padding: 16, cursor: 'pointer',
              background: selectedGateway === gw.gatewayId ? '#f0f0f0' : '#fff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong style={{ fontSize: 14 }}>{gw.name}</strong>
              <span style={{ fontSize: 12, color: statusColor(gw.overallStatus), fontWeight: 600 }}>
                {statusIcon(gw.overallStatus)} {gw.overallStatus.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#6c757d', marginBottom: 4 }}>
              {gw.country} -- {gw.wireFormat}
            </div>
            <div style={{ fontSize: 11, marginTop: 8 }}>
              {gw.checks?.map((c: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
                  <span style={{ color: statusColor(c.status), minWidth: 14 }}>{statusIcon(c.status)}</span>
                  <span>{c.message}</span>
                </div>
              ))}
            </div>
            {gw.deadlines && gw.deadlines.length > 0 && (
              <div style={{ marginTop: 8, padding: '4px 8px', background: '#fff3cd', borderRadius: 4, fontSize: 11 }}>
                {gw.deadlines.map((d: any, i: number) => (
                  <div key={i}><strong>{d.date}</strong>: {d.description}</div>
                ))}
              </div>
            )}
            {gw.enrollmentUrl && (
              <div style={{ marginTop: 6, fontSize: 11 }}>
                <a href={gw.enrollmentUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#0d6efd' }}>
                  Enrollment Portal
                </a>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedGateway && conformance && (
        <div style={{ marginTop: 20, border: '1px solid #dee2e6', borderRadius: 8, padding: 16 }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: 15 }}>
            Conformance: {conformance.name} (v{conformance.version})
          </h4>

          <div style={{ marginBottom: 16 }}>
            <strong style={{ fontSize: 12 }}>Required Fields</strong>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6, fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #dee2e6' }}>Field</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #dee2e6' }}>Required</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #dee2e6' }}>Format</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #dee2e6' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {conformance.requiredFields?.map((f: any, i: number) => (
                  <tr key={i}>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0', fontFamily: 'monospace', fontSize: 11 }}>{f.field}</td>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>{f.required ? 'Yes' : 'No'}</td>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0', fontFamily: 'monospace', fontSize: 11 }}>{f.format ?? '-'}</td>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>{f.notes ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginBottom: 16 }}>
            <strong style={{ fontSize: 12 }}>Failure Modes</strong>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6, fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #dee2e6' }}>Code</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #dee2e6' }}>Description</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #dee2e6' }}>Retryable</th>
                </tr>
              </thead>
              <tbody>
                {conformance.failureModes?.map((f: any, i: number) => (
                  <tr key={i}>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0', fontFamily: 'monospace', fontSize: 11 }}>{f.code}</td>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>{f.description}</td>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>{f.retryable ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <strong style={{ fontSize: 12 }}>Probe Behaviors</strong>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6, fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #dee2e6' }}>Probe</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #dee2e6' }}>Description</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #dee2e6' }}>Expected</th>
                </tr>
              </thead>
              <tbody>
                {conformance.probeBehaviors?.map((p: any, i: number) => (
                  <tr key={i}>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0', fontFamily: 'monospace', fontSize: 11 }}>{p.probe}</td>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>{p.description}</td>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>{p.expectedResult}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Phase 69: Payer Adapters Tab ──────────────────────────────── */

function AdaptersTab() {
  const [adapters, setAdapters] = useState<any[]>([]);
  const [health, setHealth] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/rcm/adapters'),
      apiFetch('/rcm/adapters/health'),
    ]).then(([a, h]) => {
      setAdapters(a?.adapters ?? []);
      setHealth(h?.health ?? {});
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: '#6c757d', fontSize: 13 }}>Loading adapters...</div>;

  return (
    <div>
      <h3 style={{ fontSize: 15, marginBottom: 12 }}>Payer Adapters (Phase 69)</h3>
      <p style={{ fontSize: 12, color: '#6c757d', marginBottom: 12 }}>
        Higher-level workflow adapters for eligibility, claim status, submission, and denial handling.
        Connectors handle transport; adapters handle business workflow.
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
            <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>Adapter ID</th>
            <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>Display Name</th>
            <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>Integration Modes</th>
            <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>Health</th>
            <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>Details</th>
          </tr>
        </thead>
        <tbody>
          {adapters.map((a: any) => {
            const h = health[a.id];
            return (
              <tr key={a.id}>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0', fontFamily: 'monospace', fontSize: 11 }}>{a.id}</td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0' }}>{a.name}</td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0', fontFamily: 'monospace', fontSize: 11 }}>{a.supportedModes?.join(', ') ?? '-'}</td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0' }}>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                    background: h?.healthy ? '#d1e7dd' : '#f8d7da',
                    color: h?.healthy ? '#0f5132' : '#842029',
                  }}>
                    {h?.healthy ? 'HEALTHY' : 'NOT CONFIGURED'}
                  </span>
                </td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0', fontSize: 11, color: '#6c757d' }}>
                  {h?.details ?? '-'}
                </td>
              </tr>
            );
          })}
          {adapters.length === 0 && (
            <tr><td colSpan={5} style={{ padding: 16, textAlign: 'center', color: '#6c757d' }}>No adapters registered</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Phase 69: Jobs & Polling Tab ──────────────────────────────── */

function JobsTab() {
  const [scheduler, setScheduler] = useState<any>(null);
  const [queueStats, setQueueStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch('/rcm/jobs/scheduler'),
      apiFetch('/rcm/jobs/queue/stats'),
    ]).then(([s, q]) => {
      setScheduler(s?.scheduler ?? null);
      setQueueStats(q?.stats ?? null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  if (loading) return <div style={{ color: '#6c757d', fontSize: 13 }}>Loading jobs...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, margin: 0 }}>Jobs & Polling Scheduler (Phase 69)</h3>
        <button onClick={refresh} style={{ fontSize: 11, padding: '4px 12px', cursor: 'pointer' }}>Refresh</button>
      </div>

      {/* Scheduler Status */}
      <div style={{ marginBottom: 16, padding: 12, background: '#f8f9fa', borderRadius: 6, fontSize: 12 }}>
        <strong>Scheduler:</strong>{' '}
        <span style={{ color: scheduler?.running ? '#198754' : '#dc3545', fontWeight: 600 }}>
          {scheduler?.running ? 'RUNNING' : 'STOPPED'}
        </span>
        {scheduler?.stats && (
          <span style={{ marginLeft: 16, color: '#6c757d' }}>
            Processed: {scheduler.stats.totalProcessed} | Failed: {scheduler.stats.totalFailed} | Rate-Limited: {scheduler.stats.totalRateLimited}
            {scheduler.stats.uptimeMs > 0 && ` | Uptime: ${Math.floor(scheduler.stats.uptimeMs / 1000)}s`}
          </span>
        )}
      </div>

      {/* Job Configs */}
      <h4 style={{ fontSize: 13, marginBottom: 8 }}>Registered Jobs</h4>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 16 }}>
        <thead>
          <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
            <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>Job Type</th>
            <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>Label</th>
            <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>Interval</th>
            <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>Rate Limit/hr</th>
            <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>Remaining</th>
            <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>Enabled</th>
          </tr>
        </thead>
        <tbody>
          {scheduler?.jobConfigs?.map((j: any) => (
            <tr key={j.type}>
              <td style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0', fontFamily: 'monospace', fontSize: 11 }}>{j.type}</td>
              <td style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0' }}>{j.label}</td>
              <td style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0' }}>{(j.intervalMs / 1000).toFixed(0)}s</td>
              <td style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0' }}>{j.rateLimitPerHour}</td>
              <td style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0' }}>{j.rateLimitRemaining}</td>
              <td style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                  background: j.enabled ? '#d1e7dd' : '#e2e3e5',
                  color: j.enabled ? '#0f5132' : '#41464b',
                }}>
                  {j.enabled ? 'YES' : 'DISABLED'}
                </span>
              </td>
            </tr>
          ))}
          {(!scheduler?.jobConfigs || scheduler.jobConfigs.length === 0) && (
            <tr><td colSpan={6} style={{ padding: 16, textAlign: 'center', color: '#6c757d' }}>No jobs registered</td></tr>
          )}
        </tbody>
      </table>

      {/* Queue Stats */}
      {queueStats && (
        <div>
          <h4 style={{ fontSize: 13, marginBottom: 8 }}>Queue Statistics</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
            {Object.entries(queueStats).map(([k, v]) => (
              <div key={k} style={{ padding: 8, background: '#f8f9fa', borderRadius: 4, fontSize: 11 }}>
                <div style={{ color: '#6c757d', marginBottom: 2 }}>{k}</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{String(v)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, padding: 12, background: '#fff3cd', borderRadius: 6, fontSize: 11, color: '#664d03' }}>
        <strong>Note:</strong> Polling jobs are disabled by default. Set <code>RCM_ELIGIBILITY_POLLING=true</code> and{' '}
        <code>RCM_CLAIM_STATUS_POLLING=true</code> in env to enable. Rate limits prevent payer throttling.
      </div>
    </div>
  );
}

/* ─── Phase 82: Ops Dashboard Tab ───────────────────────────────── */

function OpsDashboardTab() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enqueueResult, setEnqueueResult] = useState<any>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    apiFetch('/rcm/ops/dashboard')
      .then((data) => {
        if (data?.ok) {
          setDashboard(data);
        } else {
          setError(data?.error ?? 'Failed to load ops dashboard');
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleEnqueueEligibility = () => {
    apiFetch('/rcm/ops/enqueue-eligibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payerCode: 'SANDBOX',
        subscriberMemberId: 'TEST-001',
        serviceType: '30',
      }),
    }).then((data) => {
      setEnqueueResult(data);
      setTimeout(refresh, 500);
    }).catch((e) => setEnqueueResult({ ok: false, error: String(e) }));
  };

  const handleEnqueueStatusPoll = () => {
    apiFetch('/rcm/ops/enqueue-status-poll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claimId: 'test-claim-001',
        payerCode: 'SANDBOX',
      }),
    }).then((data) => {
      setEnqueueResult(data);
      setTimeout(refresh, 500);
    }).catch((e) => setEnqueueResult({ ok: false, error: String(e) }));
  };

  if (loading) return <div style={{ color: '#6c757d', fontSize: 13 }}>Loading ops dashboard...</div>;
  if (error) return <div style={{ color: '#dc3545', fontSize: 13 }}>Error: {error}</div>;
  if (!dashboard) return <div style={{ color: '#6c757d', fontSize: 13 }}>No dashboard data</div>;

  const { connectivity, jobs, workqueues, systemHealth } = dashboard;

  const stateColor = (state: string) => {
    switch (state) {
      case 'connected': return { bg: '#d1e7dd', fg: '#0f5132' };
      case 'degraded': return { bg: '#fff3cd', fg: '#664d03' };
      case 'disconnected': return { bg: '#f8d7da', fg: '#842029' };
      case 'pending': return { bg: '#e2e3e5', fg: '#41464b' };
      default: return { bg: '#e2e3e5', fg: '#41464b' };
    }
  };

  const healthColor = (h: string) =>
    h === 'operational' || h === 'healthy' ? '#198754' : '#dc3545';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, margin: 0 }}>Ops Dashboard (Phase 82)</h3>
        <button onClick={refresh} style={{ fontSize: 11, padding: '4px 12px', cursor: 'pointer' }}>Refresh</button>
        <span style={{ fontSize: 11, color: '#6c757d' }}>Tenant: {dashboard.tenantId}</span>
      </div>

      {/* System Health Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {systemHealth && Object.entries(systemHealth).map(([key, val]) => (
          <div key={key} style={{ padding: 12, background: '#f8f9fa', borderRadius: 6, borderLeft: `3px solid ${healthColor(val as string)}` }}>
            <div style={{ fontSize: 11, color: '#6c757d', marginBottom: 4 }}>{key.replace(/([A-Z])/g, ' $1').toUpperCase()}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: healthColor(val as string) }}>{String(val).toUpperCase().replace(/-/g, ' ')}</div>
          </div>
        ))}
      </div>

      {/* Connectivity: Connectors */}
      <h4 style={{ fontSize: 13, marginBottom: 8 }}>Connector States ({connectivity?.summary?.totalConnectors ?? 0} total)</h4>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {connectivity?.summary && ['connected', 'degraded', 'disconnected', 'pending'].map(s => {
          const count = s === 'connected' ? connectivity.summary.connected :
                        s === 'degraded' ? connectivity.summary.degraded :
                        s === 'disconnected' ? connectivity.summary.disconnected :
                        connectivity.summary.pending;
          const c = stateColor(s);
          return (
            <span key={s} style={{ padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: c.bg, color: c.fg }}>
              {s.toUpperCase()}: {count}
            </span>
          );
        })}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 20 }}>
        <thead>
          <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
            <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>Connector</th>
            <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>State</th>
            <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>Latency</th>
            <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>Last Probed</th>
            <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>Pending Target</th>
          </tr>
        </thead>
        <tbody>
          {(connectivity?.connectors ?? []).map((c: any) => {
            const sc = stateColor(c.state);
            return (
              <tr key={c.connectorId}>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0', fontFamily: 'monospace', fontSize: 11 }}>{c.connectorId}</td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0' }}>
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.fg }}>
                    {c.state.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0', fontFamily: 'monospace', fontSize: 11 }}>
                  {c.lastProbeLatencyMs != null ? `${c.lastProbeLatencyMs}ms` : '-'}
                </td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0', fontSize: 11 }}>
                  {c.lastProbeAt ? new Date(c.lastProbeAt).toLocaleTimeString() : '-'}
                </td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0', fontSize: 11, color: '#6c757d' }}>
                  {c.pendingTarget ? (
                    <span title={c.pendingTarget.migrationPath}>{c.pendingTarget.configRequired?.join(', ') ?? 'Config required'}</span>
                  ) : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Adapter States */}
      <h4 style={{ fontSize: 13, marginBottom: 8 }}>Adapter States</h4>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 20 }}>
        <thead>
          <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
            <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>Adapter</th>
            <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>State</th>
            <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>Modes</th>
            <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>Pending Target</th>
          </tr>
        </thead>
        <tbody>
          {(connectivity?.adapters ?? []).map((a: any) => {
            const sc = stateColor(a.state);
            return (
              <tr key={a.adapterId}>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0', fontFamily: 'monospace', fontSize: 11 }}>{a.adapterId}</td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0' }}>
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.fg }}>
                    {a.state.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0', fontFamily: 'monospace', fontSize: 11 }}>
                  {a.supportedModes?.join(', ') ?? '-'}
                </td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0', fontSize: 11, color: '#6c757d' }}>
                  {a.pendingTarget ? (
                    <span title={a.pendingTarget.migrationPath}>{a.pendingTarget.configRequired?.join(', ') ?? 'Config required'}</span>
                  ) : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Job Queue Depth */}
      <h4 style={{ fontSize: 13, marginBottom: 8 }}>Job Queue</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, marginBottom: 12 }}>
        {['queued', 'processing', 'completed', 'failed', 'deadLetter'].map(k => (
          <div key={k} style={{ padding: 8, background: '#f8f9fa', borderRadius: 4, fontSize: 11 }}>
            <div style={{ color: '#6c757d', marginBottom: 2 }}>{k}</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{jobs?.[k] ?? 0}</div>
          </div>
        ))}
      </div>

      {/* Scheduler status */}
      <div style={{ marginBottom: 16, padding: 8, background: '#f8f9fa', borderRadius: 4, fontSize: 11 }}>
        <strong>Scheduler:</strong>{' '}
        <span style={{ color: jobs?.scheduler?.running ? '#198754' : '#dc3545', fontWeight: 600 }}>
          {jobs?.scheduler?.running ? 'RUNNING' : 'STOPPED'}
        </span>
        <span style={{ marginLeft: 8, color: '#6c757d' }}>
          {jobs?.scheduler?.registeredJobs ?? 0} registered job type(s)
        </span>
      </div>

      {/* Workqueue summary */}
      <h4 style={{ fontSize: 13, marginBottom: 8 }}>Workqueue Summary</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, marginBottom: 16 }}>
        <div style={{ padding: 8, background: '#f8f9fa', borderRadius: 4, fontSize: 11 }}>
          <div style={{ color: '#6c757d', marginBottom: 2 }}>Total</div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{workqueues?.total ?? 0}</div>
        </div>
        {workqueues?.byType && Object.entries(workqueues.byType).map(([k, v]) => (
          <div key={k} style={{ padding: 8, background: '#f8f9fa', borderRadius: 4, fontSize: 11 }}>
            <div style={{ color: '#6c757d', marginBottom: 2 }}>{k}</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{String(v)}</div>
          </div>
        ))}
      </div>

      {/* Enqueue Actions */}
      <h4 style={{ fontSize: 13, marginBottom: 8 }}>Manual Job Enqueue</h4>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={handleEnqueueEligibility} style={{
          padding: '6px 14px', fontSize: 12, cursor: 'pointer',
          background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4,
        }}>
          Enqueue Eligibility Check
        </button>
        <button onClick={handleEnqueueStatusPoll} style={{
          padding: '6px 14px', fontSize: 12, cursor: 'pointer',
          background: '#6c757d', color: '#fff', border: 'none', borderRadius: 4,
        }}>
          Enqueue Status Poll
        </button>
      </div>
      {enqueueResult && (
        <div style={{
          padding: 8, background: enqueueResult.ok ? '#d1e7dd' : '#f8d7da',
          borderRadius: 4, fontSize: 11, marginBottom: 12,
          color: enqueueResult.ok ? '#0f5132' : '#842029',
        }}>
          {enqueueResult.ok
            ? `Job enqueued: ${enqueueResult.jobId} (${enqueueResult.type})`
            : `Error: ${enqueueResult.error}`}
        </div>
      )}

      <div style={{ marginTop: 16, padding: 12, background: '#e7f1ff', borderRadius: 6, fontSize: 11, color: '#084298' }}>
        <strong>Phase 82 — Honest State:</strong> Connector and adapter states are probed in real-time.
        If a connector shows &ldquo;disconnected&rdquo; or &ldquo;pending&rdquo;, it means the external service is not configured or not reachable.
        No fake eligibility/status results are generated. The pending target shows what configuration is needed.
      </div>
    </div>
  );
}

/* ─── Phase 69: Eligibility Status Tab ──────────────────────────── */

function EligibilityTab() {
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ patientDfn: '', payerId: '', subscriberId: '', provenance: 'SANDBOX', manualEligible: true, manualNotes: '' });
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch('/rcm/eligibility/history?limit=50'),
      apiFetch('/rcm/eligibility/stats'),
    ]).then(([hist, st]) => {
      setResults(hist?.items ?? []);
      setTotal(hist?.total ?? 0);
      setStats(st?.stats ?? null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const body: any = { patientDfn: formData.patientDfn, payerId: formData.payerId, subscriberId: formData.subscriberId || undefined, provenance: formData.provenance };
      if (formData.provenance === 'MANUAL') {
        body.manualResult = { eligible: formData.manualEligible, notes: formData.manualNotes || undefined };
      }
      await apiFetch('/rcm/eligibility/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      setShowForm(false);
      refresh();
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  if (loading) return <div style={{ color: '#6c757d', fontSize: 13 }}>Loading eligibility checks...</div>;

  return (
    <div>
      {/* Stats Bar */}
      {stats && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Total', value: stats.totalChecks, color: '#495057' },
            { label: 'Eligible', value: stats.eligibleCount, color: '#198754' },
            { label: 'Ineligible', value: stats.ineligibleCount, color: '#dc3545' },
            { label: 'Failed', value: stats.failedChecks, color: '#fd7e14' },
            { label: 'Avg ms', value: stats.avgResponseMs != null ? Math.round(stats.avgResponseMs) : '-', color: '#6c757d' },
          ].map(s => (
            <div key={s.label} style={{ padding: '8px 16px', background: '#f8f9fa', borderRadius: 6, textAlign: 'center', minWidth: 80 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#6c757d' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, margin: 0 }}>Eligibility Checks (Phase 100 -- Durable)</h3>
        <span style={{ fontSize: 11, color: '#6c757d' }}>{total} total</span>
        <button onClick={refresh} style={{ fontSize: 11, padding: '4px 12px', cursor: 'pointer' }}>Refresh</button>
        <button onClick={() => setShowForm(!showForm)} style={{ fontSize: 11, padding: '4px 12px', cursor: 'pointer', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4 }}>
          {showForm ? 'Cancel' : '+ New Check'}
        </button>
      </div>

      {/* New Check Form */}
      {showForm && (
        <div style={{ padding: 16, background: '#f8f9fa', borderRadius: 8, marginBottom: 16, border: '1px solid #dee2e6' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <label style={{ fontSize: 12 }}>Patient DFN<br /><input value={formData.patientDfn} onChange={e => setFormData(p => ({ ...p, patientDfn: e.target.value }))} style={{ width: '100%', padding: 6, fontSize: 13 }} placeholder="e.g. 3" /></label>
            <label style={{ fontSize: 12 }}>Payer ID<br /><input value={formData.payerId} onChange={e => setFormData(p => ({ ...p, payerId: e.target.value }))} style={{ width: '100%', padding: 6, fontSize: 13 }} placeholder="e.g. BCBS-001" /></label>
            <label style={{ fontSize: 12 }}>Provenance<br />
              <select value={formData.provenance} onChange={e => setFormData(p => ({ ...p, provenance: e.target.value }))} style={{ width: '100%', padding: 6, fontSize: 13 }}>
                <option value="MANUAL">Manual</option>
                <option value="SANDBOX">Sandbox</option>
                <option value="EDI_270_271">EDI 270/271 (Pending)</option>
                <option value="CLEARINGHOUSE">Clearinghouse (Pending)</option>
              </select>
            </label>
          </div>
          {formData.provenance === 'MANUAL' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 12 }}>
              <label style={{ fontSize: 12 }}>Eligible?<br />
                <select value={String(formData.manualEligible)} onChange={e => setFormData(p => ({ ...p, manualEligible: e.target.value === 'true' }))} style={{ width: '100%', padding: 6, fontSize: 13 }}>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </label>
              <label style={{ fontSize: 12 }}>Notes<br /><input value={formData.manualNotes} onChange={e => setFormData(p => ({ ...p, manualNotes: e.target.value }))} style={{ width: '100%', padding: 6, fontSize: 13 }} placeholder="Optional notes" /></label>
            </div>
          )}
          <button onClick={handleSubmit} disabled={submitting || !formData.patientDfn || !formData.payerId} style={{ padding: '6px 20px', fontSize: 13, background: '#198754', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            {submitting ? 'Checking...' : 'Run Check'}
          </button>
        </div>
      )}

      {results.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#6c757d', fontSize: 13 }}>
          No eligibility checks yet. Use the form above to run a check.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
              <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>Timestamp</th>
              <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>Patient</th>
              <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>Payer</th>
              <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>Provenance</th>
              <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>Eligible</th>
              <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>Status</th>
              <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>ms</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r: any) => (
              <tr key={r.id}>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0', fontSize: 11, fontFamily: 'monospace' }}>
                  {r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}
                </td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0', fontFamily: 'monospace', fontSize: 11 }}>{r.patientDfn}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>{r.payerId}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>
                  <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: r.provenance === 'MANUAL' ? '#cfe2ff' : r.provenance === 'SANDBOX' ? '#d1e7dd' : '#fff3cd', color: r.provenance === 'MANUAL' ? '#084298' : r.provenance === 'SANDBOX' ? '#0f5132' : '#664d03' }}>
                    {r.provenance}
                  </span>
                </td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: r.eligible === true ? '#d1e7dd' : r.eligible === false ? '#f8d7da' : '#e2e3e5', color: r.eligible === true ? '#0f5132' : r.eligible === false ? '#842029' : '#41464b' }}>
                    {r.eligible === null || r.eligible === undefined ? 'UNKNOWN' : r.eligible ? 'YES' : 'NO'}
                  </span>
                </td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>
                  <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: r.status === 'completed' ? '#d1e7dd' : r.status === 'failed' ? '#f8d7da' : r.status === 'integration_pending' ? '#fff3cd' : '#e2e3e5', color: r.status === 'completed' ? '#0f5132' : r.status === 'failed' ? '#842029' : r.status === 'integration_pending' ? '#664d03' : '#41464b' }}>
                    {(r.status ?? '').toUpperCase().replaceAll('_', ' ')}
                  </span>
                </td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0', fontFamily: 'monospace', fontSize: 11 }}>{r.responseMs ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ─── Claim Status Tab (Phase 100) ────────────────────────────────── */

function ClaimStatusTab() {
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ claimRef: '', payerId: '', payerClaimId: '', provenance: 'SANDBOX', manualClaimStatus: 'pending', manualNotes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [timelineRef, setTimelineRef] = useState('');
  const [timeline, setTimeline] = useState<any[] | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch('/rcm/claim-status/history?limit=50'),
      apiFetch('/rcm/claim-status/stats'),
    ]).then(([hist, st]) => {
      setResults(hist?.items ?? []);
      setTotal(hist?.total ?? 0);
      setStats(st?.stats ?? null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const body: any = { claimRef: formData.claimRef, payerId: formData.payerId, payerClaimId: formData.payerClaimId || undefined, provenance: formData.provenance };
      if (formData.provenance === 'MANUAL') {
        body.manualResult = { claimStatus: formData.manualClaimStatus, notes: formData.manualNotes || undefined };
      }
      await apiFetch('/rcm/claim-status/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      setShowForm(false);
      refresh();
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const loadTimeline = async () => {
    if (!timelineRef) return;
    const data = await apiFetch(`/rcm/claim-status/timeline?claimRef=${encodeURIComponent(timelineRef)}`);
    setTimeline(data?.timeline ?? []);
  };

  if (loading) return <div style={{ color: '#6c757d', fontSize: 13 }}>Loading claim status checks...</div>;

  return (
    <div>
      {/* Stats Bar */}
      {stats && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Total', value: stats.totalChecks, color: '#495057' },
            { label: 'Completed', value: stats.completedChecks, color: '#198754' },
            { label: 'Failed', value: stats.failedChecks, color: '#dc3545' },
            { label: 'Avg ms', value: stats.avgResponseMs != null ? Math.round(stats.avgResponseMs) : '-', color: '#6c757d' },
          ].map(s => (
            <div key={s.label} style={{ padding: '8px 16px', background: '#f8f9fa', borderRadius: 6, textAlign: 'center', minWidth: 80 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#6c757d' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, margin: 0 }}>Claim Status Checks (Phase 100 -- Durable)</h3>
        <span style={{ fontSize: 11, color: '#6c757d' }}>{total} total</span>
        <button onClick={refresh} style={{ fontSize: 11, padding: '4px 12px', cursor: 'pointer' }}>Refresh</button>
        <button onClick={() => setShowForm(!showForm)} style={{ fontSize: 11, padding: '4px 12px', cursor: 'pointer', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4 }}>
          {showForm ? 'Cancel' : '+ New Check'}
        </button>
      </div>

      {/* New Check Form */}
      {showForm && (
        <div style={{ padding: 16, background: '#f8f9fa', borderRadius: 8, marginBottom: 16, border: '1px solid #dee2e6' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <label style={{ fontSize: 12 }}>Claim Ref<br /><input value={formData.claimRef} onChange={e => setFormData(p => ({ ...p, claimRef: e.target.value }))} style={{ width: '100%', padding: 6, fontSize: 13 }} placeholder="e.g. CLM-001" /></label>
            <label style={{ fontSize: 12 }}>Payer ID<br /><input value={formData.payerId} onChange={e => setFormData(p => ({ ...p, payerId: e.target.value }))} style={{ width: '100%', padding: 6, fontSize: 13 }} placeholder="e.g. BCBS-001" /></label>
            <label style={{ fontSize: 12 }}>Provenance<br />
              <select value={formData.provenance} onChange={e => setFormData(p => ({ ...p, provenance: e.target.value }))} style={{ width: '100%', padding: 6, fontSize: 13 }}>
                <option value="MANUAL">Manual</option>
                <option value="SANDBOX">Sandbox</option>
                <option value="EDI_276_277">EDI 276/277 (Pending)</option>
                <option value="CLEARINGHOUSE">Clearinghouse (Pending)</option>
              </select>
            </label>
          </div>
          {formData.provenance === 'MANUAL' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 12 }}>
              <label style={{ fontSize: 12 }}>Status<br />
                <select value={formData.manualClaimStatus} onChange={e => setFormData(p => ({ ...p, manualClaimStatus: e.target.value }))} style={{ width: '100%', padding: 6, fontSize: 13 }}>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="denied">Denied</option>
                  <option value="paid">Paid</option>
                  <option value="in_review">In Review</option>
                </select>
              </label>
              <label style={{ fontSize: 12 }}>Notes<br /><input value={formData.manualNotes} onChange={e => setFormData(p => ({ ...p, manualNotes: e.target.value }))} style={{ width: '100%', padding: 6, fontSize: 13 }} placeholder="Optional notes" /></label>
            </div>
          )}
          <button onClick={handleSubmit} disabled={submitting || !formData.claimRef || !formData.payerId} style={{ padding: '6px 20px', fontSize: 13, background: '#198754', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            {submitting ? 'Checking...' : 'Run Check'}
          </button>
        </div>
      )}

      {/* Timeline Lookup */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'end' }}>
        <label style={{ fontSize: 12 }}>Timeline for Claim Ref:<br />
          <input value={timelineRef} onChange={e => setTimelineRef(e.target.value)} style={{ padding: 6, fontSize: 13, width: 200 }} placeholder="e.g. CLM-001" />
        </label>
        <button onClick={loadTimeline} disabled={!timelineRef} style={{ padding: '6px 16px', fontSize: 12, cursor: 'pointer' }}>Load Timeline</button>
      </div>

      {timeline && (
        <div style={{ marginBottom: 16, padding: 12, background: '#f0f0f0', borderRadius: 6 }}>
          <strong style={{ fontSize: 13 }}>Timeline: {timelineRef} ({timeline.length} entries)</strong>
          {timeline.length === 0 ? (
            <div style={{ fontSize: 12, color: '#6c757d', marginTop: 8 }}>No status checks found for this claim.</div>
          ) : (
            <div style={{ marginTop: 8 }}>
              {timeline.map((t: any, i: number) => (
                <div key={t.id} style={{ padding: '4px 0', borderBottom: i < timeline.length - 1 ? '1px solid #dee2e6' : 'none', fontSize: 12 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{new Date(t.createdAt).toLocaleString()}</span>
                  {' -- '}
                  <span style={{ fontWeight: 600 }}>{t.claimStatus ?? 'unknown'}</span>
                  {' via '}
                  <span style={{ color: '#6c757d' }}>{t.provenance}</span>
                  {t.paidAmountCents != null && <span> -- Paid: ${(t.paidAmountCents / 100).toFixed(2)}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {results.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#6c757d', fontSize: 13 }}>
          No claim status checks yet. Use the form above to run a check.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
              <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>Timestamp</th>
              <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>Claim Ref</th>
              <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>Payer</th>
              <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>Provenance</th>
              <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>Claim Status</th>
              <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>Check Status</th>
              <th style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>ms</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r: any) => (
              <tr key={r.id}>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0', fontSize: 11, fontFamily: 'monospace' }}>
                  {r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}
                </td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0', fontFamily: 'monospace', fontSize: 11 }}>{r.claimRef}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>{r.payerId}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>
                  <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: r.provenance === 'MANUAL' ? '#cfe2ff' : r.provenance === 'SANDBOX' ? '#d1e7dd' : '#fff3cd', color: r.provenance === 'MANUAL' ? '#084298' : r.provenance === 'SANDBOX' ? '#0f5132' : '#664d03' }}>
                    {r.provenance}
                  </span>
                </td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0', fontWeight: 600, fontSize: 11 }}>{r.claimStatus ?? '-'}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>
                  <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: r.status === 'completed' ? '#d1e7dd' : r.status === 'failed' ? '#f8d7da' : r.status === 'integration_pending' ? '#fff3cd' : '#e2e3e5', color: r.status === 'completed' ? '#0f5132' : r.status === 'failed' ? '#842029' : r.status === 'integration_pending' ? '#664d03' : '#41464b' }}>
                    {(r.status ?? '').toUpperCase().replaceAll('_', ' ')}
                  </span>
                </td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0', fontFamily: 'monospace', fontSize: 11 }}>{r.responseMs ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ─── Credential Vault Tab (Phase 110) ──────────────────────────── */

function CredentialVaultTab() {
  const [credentials, setCredentials] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [expiring, setExpiring] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedCred, setSelectedCred] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch('/rcm/credential-vault'),
      apiFetch('/rcm/credential-vault/stats'),
      apiFetch('/rcm/credential-vault/expiring?withinDays=90'),
    ]).then(([credData, statsData, expiringData]) => {
      setCredentials(credData.items ?? []);
      setStats(statsData.stats ?? null);
      setExpiring(expiringData.items ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    fd.forEach((v, k) => { if (v) body[k] = v as string; });
    body.createdBy = 'admin';
    await apiFetch('/rcm/credential-vault', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setShowAdd(false);
    refresh();
  };

  const loadDetail = async (id: string) => {
    const data = await apiFetch(`/rcm/credential-vault/${id}`);
    setSelectedCred(data.item);
    setDocuments(data.documents ?? []);
  };

  const statusColor = (s: string) => {
    if (s === 'active') return { bg: '#d1e7dd', fg: '#0f5132' };
    if (s === 'expiring') return { bg: '#fff3cd', fg: '#664d03' };
    if (s === 'expired' || s === 'revoked') return { bg: '#f8d7da', fg: '#842029' };
    return { bg: '#e2e3e5', fg: '#41464b' };
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Credential Vault (DB-backed)</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={refresh} style={{ padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>Refresh</button>
          <button onClick={() => setShowAdd(!showAdd)} style={{ padding: '4px 12px', fontSize: 12, cursor: 'pointer', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4 }}>
            + Add Credential
          </button>
        </div>
      </div>

      {stats && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{ padding: '8px 16px', background: '#e2e3e5', borderRadius: 6, fontSize: 12 }}>
            <strong>Total:</strong> {stats.total}
          </div>
          <div style={{ padding: '8px 16px', background: expiring.length > 0 ? '#fff3cd' : '#d1e7dd', borderRadius: 6, fontSize: 12 }}>
            <strong>Expiring (90d):</strong> {stats.expiringSoon}
          </div>
        </div>
      )}

      {showAdd && (
        <form onSubmit={handleCreate} style={{ marginBottom: 16, padding: 16, border: '1px solid #dee2e6', borderRadius: 6, background: '#f8f9fa' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
            <select name="entityType" required style={{ padding: '4px 8px', fontSize: 12 }}>
              <option value="">Entity Type...</option>
              <option value="provider">Provider</option>
              <option value="facility">Facility</option>
              <option value="group">Group</option>
            </select>
            <input name="entityId" placeholder="Entity ID (NPI, etc.)" required style={{ padding: '4px 8px', fontSize: 12 }} />
            <input name="entityName" placeholder="Entity Name" required style={{ padding: '4px 8px', fontSize: 12 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
            <select name="credentialType" required style={{ padding: '4px 8px', fontSize: 12 }}>
              <option value="">Credential Type...</option>
              <option value="npi">NPI</option>
              <option value="state_license">State License</option>
              <option value="dea">DEA</option>
              <option value="board_cert">Board Certification</option>
              <option value="clia">CLIA</option>
              <option value="facility_license">Facility License</option>
              <option value="malpractice">Malpractice Insurance</option>
              <option value="caqh">CAQH</option>
              <option value="tax_id">Tax ID</option>
            </select>
            <input name="credentialValue" placeholder="Credential Value / Number" required style={{ padding: '4px 8px', fontSize: 12 }} />
            <input name="issuingAuthority" placeholder="Issuing Authority (optional)" style={{ padding: '4px 8px', fontSize: 12 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
            <input name="state" placeholder="State (optional)" style={{ padding: '4px 8px', fontSize: 12 }} />
            <input name="issuedAt" type="date" style={{ padding: '4px 8px', fontSize: 12 }} />
            <input name="expiresAt" type="date" style={{ padding: '4px 8px', fontSize: 12 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" style={{ padding: '6px 16px', fontSize: 12, background: '#198754', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Save</button>
            <button type="button" onClick={() => setShowAdd(false)} style={{ padding: '6px 16px', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
          </div>
        </form>
      )}

      {loading && <div style={{ color: '#6c757d', fontSize: 13 }}>Loading credentials...</div>}

      {selectedCred && (
        <div style={{ marginBottom: 16, padding: 16, border: '1px solid #0d6efd', borderRadius: 6, background: '#f0f7ff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h4 style={{ margin: 0, fontSize: 14 }}>{selectedCred.entityName} - {selectedCred.credentialType.toUpperCase()}</h4>
            <button onClick={() => setSelectedCred(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14 }}>x</button>
          </div>
          <div style={{ fontSize: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            <div><strong>Value:</strong> {selectedCred.credentialValue}</div>
            <div><strong>Status:</strong> {selectedCred.status}</div>
            <div><strong>Entity:</strong> {selectedCred.entityType} / {selectedCred.entityId}</div>
            <div><strong>Authority:</strong> {selectedCred.issuingAuthority || '-'}</div>
            <div><strong>Issued:</strong> {selectedCred.issuedAt?.slice(0, 10) || '-'}</div>
            <div><strong>Expires:</strong> {selectedCred.expiresAt?.slice(0, 10) || '-'}</div>
            <div><strong>Verified:</strong> {selectedCred.verifiedAt ? `${selectedCred.verifiedAt.slice(0, 10)} by ${selectedCred.verifiedBy}` : 'Not verified'}</div>
          </div>
          {documents.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <strong style={{ fontSize: 12 }}>Documents ({documents.length}):</strong>
              <ul style={{ margin: '4px 0', paddingLeft: 16, fontSize: 11 }}>
                {documents.map((d: any) => (
                  <li key={d.id}>{d.fileName} ({d.mimeType}) -- {d.storagePath}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!loading && credentials.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
              <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>Entity</th>
              <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>Type</th>
              <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>Value</th>
              <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>Status</th>
              <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>Expires</th>
              <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>Verified</th>
            </tr>
          </thead>
          <tbody>
            {credentials.map((c: any) => {
              const sc = statusColor(c.status);
              return (
                <tr key={c.id} onClick={() => loadDetail(c.id)} style={{ cursor: 'pointer' }}>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>{c.entityName}</td>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', background: '#e2e3e5', padding: '2px 6px', borderRadius: 4 }}>
                      {c.credentialType.replaceAll('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0', fontFamily: 'monospace' }}>{c.credentialValue}</td>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: sc.bg, color: sc.fg }}>
                      {c.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>{c.expiresAt?.slice(0, 10) || '--'}</td>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>{c.verifiedAt ? 'Yes' : '--'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {!loading && credentials.length === 0 && (
        <div style={{ fontSize: 12, color: '#6c757d', padding: 16, textAlign: 'center' }}>No credentials yet. Click &quot;+ Add Credential&quot; to begin.</div>
      )}

      {expiring.length > 0 && (
        <div style={{ marginTop: 16, padding: 12, background: '#fff3cd', borderRadius: 6, border: '1px solid #ffecb5' }}>
          <strong style={{ fontSize: 12, color: '#664d03' }}>Expiring within 90 days ({expiring.length}):</strong>
          <ul style={{ margin: '4px 0', paddingLeft: 16, fontSize: 11, color: '#664d03' }}>
            {expiring.slice(0, 5).map((c: any) => (
              <li key={c.id}>{c.entityName} -- {c.credentialType} -- expires {c.expiresAt?.slice(0, 10)}</li>
            ))}
            {expiring.length > 5 && <li>...and {expiring.length - 5} more</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ─── Accreditation Tab (Phase 110) ─────────────────────────────── */

function AccreditationTab() {
  const [accreditations, setAccreditations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedAccred, setSelectedAccred] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch('/rcm/accreditation'),
      apiFetch('/rcm/accreditation/stats'),
    ]).then(([accredData, statsData]) => {
      setAccreditations(accredData.items ?? []);
      setStats(statsData.stats ?? null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    fd.forEach((v, k) => { if (v) body[k] = v as string; });
    body.createdBy = 'admin';
    await apiFetch('/rcm/accreditation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setShowAdd(false);
    refresh();
  };

  const loadDetail = async (id: string) => {
    const data = await apiFetch(`/rcm/accreditation/${id}`);
    setSelectedAccred(data.item);
    setTasks(data.tasks ?? []);
  };

  const handleAddTask = async (accredId: string) => {
    const title = prompt('Task title:');
    if (!title) return;
    await apiFetch(`/rcm/accreditation/${accredId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, priority: 'medium' }),
    });
    loadDetail(accredId);
  };

  const handleCompleteTask = async (taskId: string) => {
    await apiFetch(`/rcm/accreditation/tasks/${taskId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completedBy: 'admin' }),
    });
    if (selectedAccred) loadDetail(selectedAccred.id);
  };

  const statusColor = (s: string) => {
    if (s === 'active') return { bg: '#d1e7dd', fg: '#0f5132' };
    if (s === 'pending' || s === 'contracting_needed') return { bg: '#fff3cd', fg: '#664d03' };
    if (s === 'expiring') return { bg: '#fff3cd', fg: '#664d03' };
    if (s === 'denied' || s === 'suspended') return { bg: '#f8d7da', fg: '#842029' };
    return { bg: '#e2e3e5', fg: '#41464b' };
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Accreditation Status Dashboard (DB-backed)</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={refresh} style={{ padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>Refresh</button>
          <button onClick={() => setShowAdd(!showAdd)} style={{ padding: '4px 12px', fontSize: 12, cursor: 'pointer', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4 }}>
            + Add Accreditation
          </button>
        </div>
      </div>

      {stats && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{ padding: '8px 16px', background: '#e2e3e5', borderRadius: 6, fontSize: 12 }}>
            <strong>Total:</strong> {stats.total}
          </div>
          {stats.byStatus && Object.entries(stats.byStatus).map(([s, cnt]) => {
            const sc = statusColor(s);
            return (
              <div key={s} style={{ padding: '8px 16px', background: sc.bg, color: sc.fg, borderRadius: 6, fontSize: 12 }}>
                <strong>{s.replaceAll('_', ' ').toUpperCase()}:</strong> {cnt as number}
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <form onSubmit={handleCreate} style={{ marginBottom: 16, padding: 16, border: '1px solid #dee2e6', borderRadius: 6, background: '#f8f9fa' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
            <input name="payerId" placeholder="Payer ID" required style={{ padding: '4px 8px', fontSize: 12 }} />
            <input name="payerName" placeholder="Payer Name" required style={{ padding: '4px 8px', fontSize: 12 }} />
            <input name="providerEntityId" placeholder="Provider NPI / Facility ID" required style={{ padding: '4px 8px', fontSize: 12 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
            <select name="status" style={{ padding: '4px 8px', fontSize: 12 }}>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="contracting_needed">Contracting Needed</option>
              <option value="expiring">Expiring</option>
              <option value="denied">Denied</option>
              <option value="suspended">Suspended</option>
            </select>
            <input name="effectiveDate" type="date" style={{ padding: '4px 8px', fontSize: 12 }} />
            <input name="expirationDate" type="date" style={{ padding: '4px 8px', fontSize: 12 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" style={{ padding: '6px 16px', fontSize: 12, background: '#198754', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Save</button>
            <button type="button" onClick={() => setShowAdd(false)} style={{ padding: '6px 16px', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
          </div>
        </form>
      )}

      {loading && <div style={{ color: '#6c757d', fontSize: 13 }}>Loading accreditations...</div>}

      {selectedAccred && (
        <div style={{ marginBottom: 16, padding: 16, border: '1px solid #0d6efd', borderRadius: 6, background: '#f0f7ff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h4 style={{ margin: 0, fontSize: 14 }}>{selectedAccred.payerName} -- {selectedAccred.providerEntityId}</h4>
            <button onClick={() => setSelectedAccred(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14 }}>x</button>
          </div>
          <div style={{ fontSize: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 8 }}>
            <div><strong>Payer ID:</strong> {selectedAccred.payerId}</div>
            <div><strong>Status:</strong> {selectedAccred.status}</div>
            <div><strong>Effective:</strong> {selectedAccred.effectiveDate?.slice(0, 10) || '-'}</div>
            <div><strong>Expiration:</strong> {selectedAccred.expirationDate?.slice(0, 10) || '-'}</div>
            <div><strong>Last Verified:</strong> {selectedAccred.lastVerifiedAt ? `${selectedAccred.lastVerifiedAt.slice(0, 10)} by ${selectedAccred.lastVerifiedBy}` : 'Not verified'}</div>
          </div>
          {selectedAccred.notes?.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <strong style={{ fontSize: 12 }}>Notes:</strong>
              <ul style={{ margin: '4px 0', paddingLeft: 16, fontSize: 11 }}>
                {selectedAccred.notes.map((n: any, i: number) => (
                  <li key={i}>{n.date?.slice(0, 10)} ({n.author}): {n.text}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <strong style={{ fontSize: 12 }}>Tasks ({tasks.length}):</strong>
              <button onClick={() => handleAddTask(selectedAccred.id)} style={{ fontSize: 11, padding: '2px 8px', cursor: 'pointer', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4 }}>+ Task</button>
            </div>
            {tasks.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#e2e3e5', textAlign: 'left' }}>
                    <th style={{ padding: '4px 6px' }}>Title</th>
                    <th style={{ padding: '4px 6px' }}>Priority</th>
                    <th style={{ padding: '4px 6px' }}>Status</th>
                    <th style={{ padding: '4px 6px' }}>Due</th>
                    <th style={{ padding: '4px 6px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t: any) => (
                    <tr key={t.id}>
                      <td style={{ padding: '3px 6px', borderBottom: '1px solid #f0f0f0' }}>{t.title}</td>
                      <td style={{ padding: '3px 6px', borderBottom: '1px solid #f0f0f0' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                          background: t.priority === 'urgent' ? '#f8d7da' : t.priority === 'high' ? '#fff3cd' : '#e2e3e5',
                          color: t.priority === 'urgent' ? '#842029' : t.priority === 'high' ? '#664d03' : '#41464b',
                        }}>{t.priority?.toUpperCase()}</span>
                      </td>
                      <td style={{ padding: '3px 6px', borderBottom: '1px solid #f0f0f0' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                          background: t.status === 'completed' ? '#d1e7dd' : t.status === 'blocked' ? '#f8d7da' : '#e2e3e5',
                          color: t.status === 'completed' ? '#0f5132' : t.status === 'blocked' ? '#842029' : '#41464b',
                        }}>{t.status?.toUpperCase()}</span>
                      </td>
                      <td style={{ padding: '3px 6px', borderBottom: '1px solid #f0f0f0' }}>{t.dueDate?.slice(0, 10) || '--'}</td>
                      <td style={{ padding: '3px 6px', borderBottom: '1px solid #f0f0f0' }}>
                        {t.status !== 'completed' && (
                          <button onClick={() => handleCompleteTask(t.id)} style={{ fontSize: 10, padding: '1px 6px', cursor: 'pointer', background: '#198754', color: '#fff', border: 'none', borderRadius: 3 }}>Complete</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ fontSize: 11, color: '#6c757d' }}>No tasks. Click &quot;+ Task&quot; to add.</div>
            )}
          </div>
        </div>
      )}

      {!loading && accreditations.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
              <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>Payer</th>
              <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>Provider Entity</th>
              <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>Status</th>
              <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>Effective</th>
              <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>Expiration</th>
            </tr>
          </thead>
          <tbody>
            {accreditations.map((a: any) => {
              const sc = statusColor(a.status);
              return (
                <tr key={a.id} onClick={() => loadDetail(a.id)} style={{ cursor: 'pointer' }}>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>{a.payerName}</td>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0', fontFamily: 'monospace' }}>{a.providerEntityId}</td>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: sc.bg, color: sc.fg }}>
                      {a.status.toUpperCase().replaceAll('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>{a.effectiveDate?.slice(0, 10) || '--'}</td>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>{a.expirationDate?.slice(0, 10) || '--'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {!loading && accreditations.length === 0 && (
        <div style={{ fontSize: 12, color: '#6c757d', padding: 16, textAlign: 'center' }}>No accreditation records yet. Click &quot;+ Add Accreditation&quot; to track payer enrollment status.</div>
      )}
    </div>
  );
}

/* --- Claim Lifecycle Tab (Phase 111) -------------------------------- */

function ClaimLifecycleTab() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [rules, setRules] = useState<any[]>([]);
  const [scrubMetrics, setScrubMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'drafts' | 'rules' | 'metrics' | 'aging'>('drafts');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ patientId: '', providerId: '', payerId: '', dateOfService: '', claimType: 'professional', payerName: '' });

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      apiFetch('/rcm/claim-lifecycle/drafts'),
      apiFetch('/rcm/claim-lifecycle/metrics'),
      apiFetch('/rcm/claim-lifecycle/rules'),
      apiFetch('/rcm/claim-lifecycle/metrics/scrub'),
    ]).then(([d, m, r, s]) => {
      setDrafts(d.drafts || []);
      setMetrics(m.metrics || null);
      setRules(r.rules || []);
      setScrubMetrics(s.metrics || null);
    }).catch((err) => { setError(err?.message || 'Failed to load claim lifecycle data'); }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async () => {
    if (!form.patientId || !form.providerId || !form.payerId || !form.dateOfService) return;
    try {
      const res = await apiFetch('/rcm/claim-lifecycle/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) { setError(res.error || 'Failed to create draft'); return; }
      setShowCreate(false);
      setForm({ patientId: '', providerId: '', payerId: '', dateOfService: '', claimType: 'professional', payerName: '' });
      refresh();
    } catch (err: any) { setError(err?.message || 'Failed to create draft'); }
  };

  const handleScrub = async (id: string) => {
    try {
      await apiFetch(`/rcm/claim-lifecycle/drafts/${id}/scrub`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      refresh();
    } catch (err: any) { setError(err?.message || 'Failed to scrub draft'); }
  };

  const handleTransition = async (id: string, toStatus: string) => {
    try {
      const res = await apiFetch(`/rcm/claim-lifecycle/drafts/${id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStatus }),
      });
      if (!res.ok) { setError(res.error || `Failed to transition to ${toStatus}`); return; }
      refresh();
    } catch (err: any) { setError(err?.message || 'Failed to transition draft'); }
  };

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      draft: '#6c757d', scrubbed: '#0d6efd', ready: '#198754', submitted: '#0dcaf0',
      accepted: '#20c997', rejected: '#fd7e14', paid: '#198754', denied: '#dc3545',
      appealed: '#6f42c1', closed: '#adb5bd',
    };
    return map[s] || '#6c757d';
  };

  const subTabs: { id: typeof subTab; label: string }[] = [
    { id: 'drafts', label: 'Claim Drafts' },
    { id: 'metrics', label: 'Metrics & KPIs' },
    { id: 'rules', label: 'Scrub Rules' },
    { id: 'aging', label: 'Denial Aging' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {subTabs.map(st => (
          <button key={st.id} onClick={() => setSubTab(st.id)}
            style={{
              padding: '6px 14px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 12,
              background: subTab === st.id ? '#0d6efd' : '#fff', color: subTab === st.id ? '#fff' : '#495057',
              cursor: 'pointer', fontWeight: subTab === st.id ? 600 : 400,
            }}>
            {st.label}
          </button>
        ))}
        {subTab === 'drafts' && (
          <button onClick={() => setShowCreate(!showCreate)}
            style={{ marginLeft: 'auto', padding: '6px 14px', background: '#198754', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>
            + New Draft
          </button>
        )}
      </div>

      {loading && <div style={{ fontSize: 12, color: '#6c757d' }}>Loading...</div>}
      {error && <div style={{ fontSize: 12, color: '#dc3545', background: '#f8d7da', padding: '8px 12px', borderRadius: 4, marginBottom: 8 }}>{error} <button onClick={() => setError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontWeight: 600 }}>x</button></div>}

      {/* ---- Create Form ---- */}
      {showCreate && subTab === 'drafts' && (
        <div style={{ border: '1px solid #dee2e6', borderRadius: 6, padding: 12, marginBottom: 12, background: '#f8f9fa' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>New Claim Draft</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <input placeholder="Patient ID" value={form.patientId} onChange={e => setForm({ ...form, patientId: e.target.value })} style={{ padding: 6, fontSize: 12, border: '1px solid #ced4da', borderRadius: 4 }} />
            <input placeholder="Provider ID" value={form.providerId} onChange={e => setForm({ ...form, providerId: e.target.value })} style={{ padding: 6, fontSize: 12, border: '1px solid #ced4da', borderRadius: 4 }} />
            <input placeholder="Payer ID" value={form.payerId} onChange={e => setForm({ ...form, payerId: e.target.value })} style={{ padding: 6, fontSize: 12, border: '1px solid #ced4da', borderRadius: 4 }} />
            <input placeholder="Date of Service" type="date" value={form.dateOfService} onChange={e => setForm({ ...form, dateOfService: e.target.value })} style={{ padding: 6, fontSize: 12, border: '1px solid #ced4da', borderRadius: 4 }} />
            <input placeholder="Payer Name" value={form.payerName} onChange={e => setForm({ ...form, payerName: e.target.value })} style={{ padding: 6, fontSize: 12, border: '1px solid #ced4da', borderRadius: 4 }} />
            <select value={form.claimType} onChange={e => setForm({ ...form, claimType: e.target.value })} style={{ padding: 6, fontSize: 12, border: '1px solid #ced4da', borderRadius: 4 }}>
              <option value="professional">Professional (CMS-1500)</option>
              <option value="institutional">Institutional (UB-04)</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={handleCreate} style={{ padding: '6px 16px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>Create</button>
            <button onClick={() => setShowCreate(false)} style={{ padding: '6px 16px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ---- Drafts Sub-Tab ---- */}
      {!loading && subTab === 'drafts' && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
              <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>ID</th>
              <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>Patient</th>
              <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>Payer</th>
              <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>DOS</th>
              <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>Status</th>
              <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>Score</th>
              <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>Charge</th>
              <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {drafts.map((d: any) => (
              <tr key={d.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 11 }}>{d.id?.slice(0, 8)}</td>
                <td style={{ padding: '4px 8px' }}>{d.patientName || d.patientId}</td>
                <td style={{ padding: '4px 8px' }}>{d.payerName || d.payerId}</td>
                <td style={{ padding: '4px 8px' }}>{d.dateOfService?.slice(0, 10)}</td>
                <td style={{ padding: '4px 8px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: statusColor(d.status) + '20', color: statusColor(d.status) }}>
                    {d.status}
                  </span>
                </td>
                <td style={{ padding: '4px 8px', fontWeight: 600, color: (d.scrubScore ?? 0) >= 80 ? '#198754' : (d.scrubScore ?? 0) >= 50 ? '#fd7e14' : '#dc3545' }}>
                  {d.scrubScore ?? '--'}
                </td>
                <td style={{ padding: '4px 8px' }}>${((d.totalChargeCents || 0) / 100).toFixed(2)}</td>
                <td style={{ padding: '4px 8px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {d.status === 'draft' && <button onClick={() => handleScrub(d.id)} style={{ padding: '2px 8px', fontSize: 10, background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' }}>Scrub</button>}
                    {d.status === 'scrubbed' && <button onClick={() => handleTransition(d.id, 'ready')} style={{ padding: '2px 8px', fontSize: 10, background: '#198754', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' }}>Ready</button>}
                    {d.status === 'ready' && <button onClick={() => handleTransition(d.id, 'submitted')} style={{ padding: '2px 8px', fontSize: 10, background: '#0dcaf0', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' }}>Submit</button>}
                    {(d.status === 'denied' || d.status === 'rejected') && <button onClick={() => handleTransition(d.id, 'appealed')} style={{ padding: '2px 8px', fontSize: 10, background: '#6f42c1', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' }}>Appeal</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && subTab === 'drafts' && drafts.length === 0 && (
        <div style={{ fontSize: 12, color: '#6c757d', padding: 16, textAlign: 'center' }}>No claim drafts yet. Click &quot;+ New Draft&quot; to create one.</div>
      )}

      {/* ---- Metrics Sub-Tab ---- */}
      {!loading && subTab === 'metrics' && metrics && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{metrics.total}</div>
              <div style={{ fontSize: 11, color: '#6c757d' }}>Total Drafts</div>
            </div>
            <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: metrics.firstPassRate != null && metrics.firstPassRate >= 90 ? '#198754' : '#dc3545' }}>
                {metrics.firstPassRate != null ? `${metrics.firstPassRate}%` : '--'}
              </div>
              <div style={{ fontSize: 11, color: '#6c757d' }}>First-Pass Rate</div>
            </div>
            <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#dc3545' }}>{metrics.deniedCount}</div>
              <div style={{ fontSize: 11, color: '#6c757d' }}>Denied</div>
            </div>
            <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>
                {metrics.netCollectionRate != null ? `${metrics.netCollectionRate}%` : '--'}
              </div>
              <div style={{ fontSize: 11, color: '#6c757d' }}>Net Collection Rate</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                ${((metrics.totalChargeCents || 0) / 100).toFixed(2)}
              </div>
              <div style={{ fontSize: 11, color: '#6c757d' }}>Total Charges</div>
            </div>
            <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#198754' }}>
                ${((metrics.totalPaidCents || 0) / 100).toFixed(2)}
              </div>
              <div style={{ fontSize: 11, color: '#6c757d' }}>Total Paid</div>
            </div>
            <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {metrics.avgScrubScore ?? '--'}
              </div>
              <div style={{ fontSize: 11, color: '#6c757d' }}>Avg Scrub Score</div>
            </div>
          </div>

          {/* Status distribution */}
          {metrics.byStatus && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Status Distribution</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(metrics.byStatus).map(([status, cnt]) => (
                  <div key={status} style={{ padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: statusColor(status) + '20', color: statusColor(status) }}>
                    {status}: {cnt as number}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scrub metrics */}
          {scrubMetrics && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Scrub Metrics</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <div style={{ background: '#fff3cd', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{scrubMetrics.totalScrubbed}</div>
                  <div style={{ fontSize: 10, color: '#6c757d' }}>Total Scrubbed</div>
                </div>
                <div style={{ background: '#d1e7dd', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{scrubMetrics.passRate != null ? `${scrubMetrics.passRate}%` : '--'}</div>
                  <div style={{ fontSize: 10, color: '#6c757d' }}>Pass Rate</div>
                </div>
                <div style={{ background: '#f8d7da', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{scrubMetrics.avgScore ?? '--'}</div>
                  <div style={{ fontSize: 10, color: '#6c757d' }}>Avg Score</div>
                </div>
                <div style={{ background: '#e2e3e5', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: scrubMetrics.contractingNeededCount > 0 ? '#dc3545' : '#198754' }}>{scrubMetrics.contractingNeededCount}</div>
                  <div style={{ fontSize: 10, color: '#6c757d' }}>Contracting Needed</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- Rules Sub-Tab ---- */}
      {!loading && subTab === 'rules' && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Active Scrub Rules ({rules.length})</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>Code</th>
                <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>Category</th>
                <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>Severity</th>
                <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>Field</th>
                <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>Description</th>
                <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>Evidence</th>
                <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>Blocks?</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r: any) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 11 }}>{r.ruleCode}</td>
                  <td style={{ padding: '4px 8px' }}>{r.category}</td>
                  <td style={{ padding: '4px 8px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                      background: r.severity === 'error' ? '#f8d7da' : r.severity === 'warning' ? '#fff3cd' : '#d1e7dd',
                      color: r.severity === 'error' ? '#dc3545' : r.severity === 'warning' ? '#856404' : '#198754'
                    }}>{r.severity}</span>
                  </td>
                  <td style={{ padding: '4px 8px' }}>{r.field}</td>
                  <td style={{ padding: '4px 8px', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</td>
                  <td style={{ padding: '4px 8px', fontSize: 10, color: r.evidenceSource === 'contracting_needed' ? '#dc3545' : '#6c757d' }}>{r.evidenceSource}</td>
                  <td style={{ padding: '4px 8px' }}>{r.blocksSubmission ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rules.length === 0 && <div style={{ fontSize: 12, color: '#6c757d', padding: 16, textAlign: 'center' }}>No scrub rules configured. Rules are evidence-backed -- add via API with evidenceSource.</div>}
        </div>
      )}

      {/* ---- Aging Sub-Tab ---- */}
      {!loading && subTab === 'aging' && (
        <AgingSubTab />
      )}
    </div>
  );
}

function AgingSubTab() {
  const [aging, setAging] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [agingError, setAgingError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    setAgingError(null);
    apiFetch(`/rcm/claim-lifecycle/drafts/aging?olderThanDays=${days}`)
      .then(r => setAging(r.aging || []))
      .catch((err) => { setAgingError(err?.message || 'Failed to load aging data'); })
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Denied/Rejected claims older than:</span>
        <select value={days} onChange={e => setDays(parseInt(e.target.value))} style={{ padding: 4, fontSize: 12, border: '1px solid #ced4da', borderRadius: 4 }}>
          <option value={7}>7 days</option>
          <option value={14}>14 days</option>
          <option value={30}>30 days</option>
          <option value={60}>60 days</option>
          <option value={90}>90 days</option>
        </select>
      </div>
      {loading && <div style={{ fontSize: 12, color: '#6c757d' }}>Loading...</div>}
      {agingError && <div style={{ fontSize: 12, color: '#dc3545', background: '#f8d7da', padding: '8px 12px', borderRadius: 4, marginBottom: 8 }}>{agingError}</div>}
      {!loading && aging.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
              <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>ID</th>
              <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>Patient</th>
              <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>Payer</th>
              <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>Denial Code</th>
              <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>Reason</th>
              <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>Denied Date</th>
              <th style={{ padding: '6px 8px', borderBottom: '2px solid #dee2e6' }}>Charge</th>
            </tr>
          </thead>
          <tbody>
            {aging.map((a: any) => (
              <tr key={a.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 11 }}>{a.id?.slice(0, 8)}</td>
                <td style={{ padding: '4px 8px' }}>{a.patientName || a.patientId}</td>
                <td style={{ padding: '4px 8px' }}>{a.payerName || a.payerId}</td>
                <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>{a.denialCode || '--'}</td>
                <td style={{ padding: '4px 8px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.denialReason || '--'}</td>
                <td style={{ padding: '4px 8px' }}>{a.deniedAt?.slice(0, 10) || '--'}</td>
                <td style={{ padding: '4px 8px' }}>${((a.totalChargeCents || 0) / 100).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && aging.length === 0 && (
        <div style={{ fontSize: 12, color: '#198754', padding: 16, textAlign: 'center' }}>No aging denials found for the selected period.</div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Phase 112: Evidence Registry Tab
   ══════════════════════════════════════════════════════════════════════ */

function EvidenceRegistryTab() {
  const [evidence, setEvidence] = useState<any[]>([]);
  const [coverage, setCoverage] = useState<any>(null);
  const [gaps, setGaps] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'list' | 'coverage' | 'gaps' | 'add'>('list');

  // Add form state
  const [formPayerId, setFormPayerId] = useState('');
  const [formMethod, setFormMethod] = useState('edi');
  const [formSource, setFormSource] = useState('');
  const [formChannel, setFormChannel] = useState('');
  const [formSourceType, setFormSourceType] = useState('url');
  const [formContactInfo, setFormContactInfo] = useState('');
  const [formRequirements, setFormRequirements] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formConfidence, setFormConfidence] = useState('unknown');
  const [formStatus, setFormStatus] = useState('unverified');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [evRes, covRes, gapRes, stRes] = await Promise.all([
        apiFetch('/rcm/evidence'),
        apiFetch('/rcm/evidence/coverage'),
        apiFetch('/rcm/evidence/gaps'),
        apiFetch('/rcm/evidence/stats'),
      ]);
      setEvidence(evRes.evidence ?? []);
      setCoverage(covRes.summary ?? null);
      setGaps(gapRes.gaps ?? []);
      setStats(stRes);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load evidence data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async () => {
    if (!formPayerId || !formSource) {
      setError('payerId and source are required');
      return;
    }
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/rcm/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify({
          payerId: formPayerId, method: formMethod, source: formSource,
          channel: formChannel || undefined, sourceType: formSourceType,
          contactInfo: formContactInfo || undefined,
          submissionRequirements: formRequirements || undefined,
          notes: formNotes || undefined, confidence: formConfidence, status: formStatus,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error ?? `HTTP ${res.status}`);
        return;
      }
      setFormPayerId(''); setFormSource(''); setFormChannel(''); setFormContactInfo('');
      setFormRequirements(''); setFormNotes('');
      setSubTab('list');
      refresh();
    } catch (err: any) {
      setError(err.message ?? 'Failed to create evidence');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await fetch(`${API_BASE}/rcm/evidence/${id}`, { method: 'DELETE', credentials: 'include', headers: { 'x-csrf-token': getCsrfToken() } });
      refresh();
    } catch { /* ignore */ }
  };

  const subTabs: { id: typeof subTab; label: string }[] = [
    { id: 'list', label: 'All Evidence' },
    { id: 'coverage', label: 'Coverage' },
    { id: 'gaps', label: `Gaps${gaps.length ? ` (${gaps.length})` : ''}` },
    { id: 'add', label: '+ Add Evidence' },
  ];

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>Integration Evidence Registry</h3>
        <button onClick={refresh} style={{ fontSize: 11, padding: '2px 10px', cursor: 'pointer' }}>Refresh</button>
      </div>

      {error && (
        <div style={{ background: '#f8d7da', color: '#842029', padding: '6px 12px', borderRadius: 4, fontSize: 12, marginBottom: 8 }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 8, cursor: 'pointer', border: 'none', background: 'none', color: '#842029', fontWeight: 700 }}>x</button>
        </div>
      )}

      {/* Stats banner */}
      {stats && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 11 }}>
          <span>Total: <b>{stats.total ?? 0}</b></span>
          {coverage && <span>Coverage: <b>{coverage.coveragePercent ?? 0}%</b></span>}
          {coverage && <span>Gaps: <b style={{ color: coverage.missingEvidence > 0 ? '#dc3545' : '#198754' }}>{coverage.missingEvidence ?? 0}</b></span>}
          {stats.byStatus && Object.entries(stats.byStatus).map(([k, v]) => (
            <span key={k}>{k}: <b>{String(v)}</b></span>
          ))}
        </div>
      )}

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {subTabs.map(st => (
          <button key={st.id} onClick={() => setSubTab(st.id)}
            style={{ padding: '4px 12px', fontSize: 11, cursor: 'pointer', borderRadius: 4,
              background: subTab === st.id ? '#0d6efd' : '#e9ecef', color: subTab === st.id ? '#fff' : '#212529',
              border: 'none' }}>
            {st.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ fontSize: 12, color: '#6c757d' }}>Loading...</div>}

      {/* List sub-tab */}
      {!loading && subTab === 'list' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Payer ID</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Method</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Source</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Confidence</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Verified</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {evidence.map((ev: any) => (
                <tr key={ev.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>{ev.payerId}</td>
                  <td style={{ padding: '4px 8px' }}>{ev.method}</td>
                  <td style={{ padding: '4px 8px', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ev.sourceType === 'url' ? <a href={ev.source} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11 }}>{ev.source}</a> : ev.source}
                  </td>
                  <td style={{ padding: '4px 8px' }}>
                    <span style={{ padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 600,
                      background: ev.status === 'verified' ? '#d1e7dd' : ev.status === 'stale' ? '#fff3cd' : '#e2e3e5',
                      color: ev.status === 'verified' ? '#0f5132' : ev.status === 'stale' ? '#664d03' : '#41464b' }}>
                      {ev.status}
                    </span>
                  </td>
                  <td style={{ padding: '4px 8px' }}>{ev.confidence}</td>
                  <td style={{ padding: '4px 8px' }}>{ev.lastVerifiedAt?.slice(0, 10) ?? '--'}</td>
                  <td style={{ padding: '4px 8px' }}>
                    <button onClick={() => handleArchive(ev.id)} style={{ fontSize: 10, cursor: 'pointer', color: '#dc3545', border: 'none', background: 'none' }}>Archive</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {evidence.length === 0 && <div style={{ fontSize: 12, color: '#6c757d', padding: 16, textAlign: 'center' }}>No evidence entries yet. Use the "+ Add Evidence" tab to create one.</div>}
        </div>
      )}

      {/* Coverage sub-tab */}
      {!loading && subTab === 'coverage' && coverage && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 12 }}>
            {[{ label: 'Total Payers', value: coverage.totalPayers },
              { label: 'With Evidence', value: coverage.withEvidence },
              { label: 'Verified', value: coverage.withVerified },
              { label: 'Requires Evidence', value: coverage.requiresEvidence },
              { label: 'Missing', value: coverage.missingEvidence, color: coverage.missingEvidence > 0 ? '#dc3545' : '#198754' },
              { label: 'Coverage %', value: `${coverage.coveragePercent}%` },
            ].map(m => (
              <div key={m.label} style={{ background: '#f8f9fa', padding: 8, borderRadius: 4, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#6c757d' }}>{m.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: m.color ?? '#212529' }}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gaps sub-tab */}
      {!loading && subTab === 'gaps' && (
        <div>
          {gaps.length === 0 ? (
            <div style={{ fontSize: 12, color: '#198754', padding: 16, textAlign: 'center' }}>No evidence gaps. All payers with active integration modes have backing evidence.</div>
          ) : (
            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fff3cd', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Payer ID</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Name</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Integration Mode</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Country</th>
                </tr>
              </thead>
              <tbody>
                {gaps.map((g: any) => (
                  <tr key={g.payerId} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>{g.payerId}</td>
                    <td style={{ padding: '4px 8px' }}>{g.payerName}</td>
                    <td style={{ padding: '4px 8px' }}>{g.integrationMode}</td>
                    <td style={{ padding: '4px 8px' }}>{g.country}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add form sub-tab */}
      {!loading && subTab === 'add' && (
        <div style={{ maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 11 }}>Payer ID *
            <input value={formPayerId} onChange={e => setFormPayerId(e.target.value)} placeholder="US-CMS-MEDICARE-A" style={{ width: '100%', padding: 4, fontSize: 12 }} />
          </label>
          <label style={{ fontSize: 11 }}>Method *
            <select value={formMethod} onChange={e => setFormMethod(e.target.value)} style={{ width: '100%', padding: 4, fontSize: 12 }}>
              <option value="edi">EDI</option>
              <option value="api">API</option>
              <option value="portal">Portal</option>
              <option value="fhir">FHIR</option>
              <option value="manual">Manual</option>
            </select>
          </label>
          <label style={{ fontSize: 11 }}>Source URL / Reference *
            <input value={formSource} onChange={e => setFormSource(e.target.value)} placeholder="https://payer.com/edi-guide" style={{ width: '100%', padding: 4, fontSize: 12 }} />
          </label>
          <label style={{ fontSize: 11 }}>Source Type
            <select value={formSourceType} onChange={e => setFormSourceType(e.target.value)} style={{ width: '100%', padding: 4, fontSize: 12 }}>
              <option value="url">URL</option>
              <option value="document">Document</option>
              <option value="screenshot">Screenshot</option>
              <option value="contact">Contact</option>
              <option value="manual">Manual</option>
            </select>
          </label>
          <label style={{ fontSize: 11 }}>Channel
            <input value={formChannel} onChange={e => setFormChannel(e.target.value)} placeholder="sftp, https, soap, rest" style={{ width: '100%', padding: 4, fontSize: 12 }} />
          </label>
          <label style={{ fontSize: 11 }}>Contact Info
            <input value={formContactInfo} onChange={e => setFormContactInfo(e.target.value)} placeholder="EDI Support: 1-800-XXX-XXXX" style={{ width: '100%', padding: 4, fontSize: 12 }} />
          </label>
          <label style={{ fontSize: 11 }}>Submission Requirements
            <textarea value={formRequirements} onChange={e => setFormRequirements(e.target.value)} rows={2} placeholder="Requires clearinghouse enrollment..." style={{ width: '100%', padding: 4, fontSize: 12 }} />
          </label>
          <label style={{ fontSize: 11 }}>Confidence
            <select value={formConfidence} onChange={e => setFormConfidence(e.target.value)} style={{ width: '100%', padding: 4, fontSize: 12 }}>
              <option value="unknown">Unknown</option>
              <option value="inferred">Inferred</option>
              <option value="confirmed">Confirmed</option>
            </select>
          </label>
          <label style={{ fontSize: 11 }}>Status
            <select value={formStatus} onChange={e => setFormStatus(e.target.value)} style={{ width: '100%', padding: 4, fontSize: 12 }}>
              <option value="unverified">Unverified</option>
              <option value="verified">Verified</option>
            </select>
          </label>
          <label style={{ fontSize: 11 }}>Notes
            <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2} placeholder="Research notes..." style={{ width: '100%', padding: 4, fontSize: 12 }} />
          </label>
          <button onClick={handleCreate} style={{ padding: '6px 16px', fontSize: 12, cursor: 'pointer', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4, alignSelf: 'flex-start' }}>
            Create Evidence Entry
          </button>
        </div>
      )}
    </div>
  );
}