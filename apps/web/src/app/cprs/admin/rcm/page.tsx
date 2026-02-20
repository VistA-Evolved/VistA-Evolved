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

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type Tab = 'payers' | 'claims' | 'connectors' | 'audit' | 'vista-billing' | 'draft-from-vista';

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include', ...opts });
  return res.json();
}

export default function RcmPage() {
  const [tab, setTab] = useState<Tab>('claims');
  const [health, setHealth] = useState<any>(null);
  const [safetyStatus, setSafetyStatus] = useState<any>(null);

  useEffect(() => {
    apiFetch('/rcm/health').then(setHealth).catch(() => {});
    apiFetch('/rcm/submission-safety').then(setSafetyStatus).catch(() => {});
  }, []);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'claims', label: 'Claim Workqueue' },
    { id: 'draft-from-vista', label: 'Draft from VistA' },
    { id: 'payers', label: 'Payer Registry' },
    { id: 'connectors', label: 'Connectors & EDI' },
    { id: 'vista-billing', label: 'VistA Billing' },
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
        {tab === 'draft-from-vista' && <DraftFromVistaTab />}
        {tab === 'payers' && <PayersTab />}
        {tab === 'connectors' && <ConnectorsTab />}
        {tab === 'vista-billing' && <VistaBillingTab />}
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
    const issues: Array<{ field: string; source: string; status: 'ok' | 'missing' | 'pending' }> = [
      { field: 'Encounters (PCE)', source: 'ORWPCE VISIT', status: encounters?.ok && encounters.count > 0 ? 'ok' : 'missing' },
      { field: 'Insurance Coverage', source: 'IBCN INSURANCE QUERY', status: coverage?.ok && coverage.count > 0 ? 'ok' : 'missing' },
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