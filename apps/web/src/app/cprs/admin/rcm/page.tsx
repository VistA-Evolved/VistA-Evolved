'use client';

/**
 * RCM (Revenue Cycle Management) — Phase 38 Full Implementation
 *
 * Tabbed interface for the RCM Gateway:
 *   - Payer Registry — browse/search payers, view integration mode
 *   - Claim Workqueue — list claims by status, create/validate/submit
 *   - Connectors — view connector health and EDI pipeline
 *   - Audit — hash-chained claim lifecycle audit trail
 *
 * Accessible at /cprs/admin/rcm. Requires session.
 */

import { useState, useEffect, useCallback } from 'react';
import styles from '@/components/cprs/cprs.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type Tab = 'payers' | 'claims' | 'connectors' | 'audit';

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include', ...opts });
  return res.json();
}

export default function RcmPage() {
  const [tab, setTab] = useState<Tab>('claims');
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    apiFetch('/rcm/health').then(setHealth).catch(() => {});
  }, []);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'claims', label: 'Claim Workqueue' },
    { id: 'payers', label: 'Payer Registry' },
    { id: 'connectors', label: 'Connectors & EDI' },
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
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6c757d' }}>Phase 38</span>
      </div>

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
        {tab === 'payers' && <PayersTab />}
        {tab === 'connectors' && <ConnectorsTab />}
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
    draft: '#6c757d', validated: '#0d6efd', submitted: '#ffc107',
    accepted: '#198754', rejected: '#dc3545', paid: '#198754',
    denied: '#dc3545', appealed: '#fd7e14', closed: '#495057',
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
                </td>
                <td style={{ padding: '6px 10px' }}>{c.validationResult?.readinessScore ?? '-'}</td>
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/rcm/connectors'),
      apiFetch('/rcm/connectors/health'),
      apiFetch('/rcm/edi/pipeline/stats'),
    ]).then(([cData, hData, pData]) => {
      setConnectors(cData.connectors ?? []);
      setHealth(hData.health ?? {});
      setPipelineStats(pData.stats ?? null);
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
