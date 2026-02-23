'use client';

/**
 * Payer Registry — Phase 95: Payer Registry Persistence + Audit
 *
 * Admin page for managing the persistent payer registry. Provides:
 *   - Registry tab: list of all persisted payers with import action
 *   - Evidence tab: evidence coverage scores and validation
 *   - Audit tab: hash-chained audit trail with chain verification
 *   - Stats tab: registry statistics and health
 */

import React, { useState, useEffect, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/* ── Types ──────────────────────────────────────────────────── */

interface PersistedPayer {
  payerId: string;
  legalName: string;
  brandNames: string[];
  type: string;
  country: string;
  capabilities: Record<string, string>;
  integrationMode: string;
  evidence: Array<{ kind: string; url: string; title: string; retrievedAt: string; notes?: string }>;
  status: string;
  contractingTasks?: string[];
  importedAt: string;
  updatedAt: string;
  importHash: string;
  provenance: {
    sourceType: string;
    sourceUrl?: string;
    retrievedAt: string;
    importedBy: string;
    fileHash?: string;
  };
}

interface AuditEvent {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  tenantId: string;
  payerId?: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  evidenceLink?: string;
  hash: string;
  prevHash: string;
}

interface EvidenceScore {
  totalPayers: number;
  averageCoverage: number;
  fullyEvidenced: number;
  zeroEvidence: number;
  perPayer: Array<{ payerId: string; score: number; total: number }>;
}

interface RegistryStats {
  total: number;
  byStatus: Record<string, number>;
  byIntegrationMode: Record<string, number>;
  withPortal: number;
  contractingNeeded: number;
  hasPhilHealth: boolean;
}

/* ── Color Maps ─────────────────────────────────────────────── */

const STATUS_COLORS: Record<string, string> = {
  in_progress: '#2563eb',
  contracting_needed: '#d97706',
  active: '#16a34a',
  suspended: '#dc2626',
};

const CAP_COLORS: Record<string, string> = {
  available: '#16a34a',
  portal: '#2563eb',
  manual: '#d97706',
  unknown_publicly: '#9ca3af',
  unavailable: '#dc2626',
};

type Tab = 'registry' | 'evidence' | 'audit' | 'stats';

/* ── Page ───────────────────────────────────────────────────── */

export default function PayerRegistryPage() {
  const [tab, setTab] = useState<Tab>('registry');
  const [payers, setPayers] = useState<PersistedPayer[]>([]);
  const [payerCount, setPayerCount] = useState(0);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [stats, setStats] = useState<RegistryStats | null>(null);
  const [evidenceScore, setEvidenceScore] = useState<EvidenceScore | null>(null);
  const [chainOk, setChainOk] = useState<boolean | null>(null);
  const [chainMsg, setChainMsg] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [selectedPayer, setSelectedPayer] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  /* ── Fetchers ───────────────────────────────────────────── */

  const fetchPayers = useCallback(async () => {
    setLoading(true);
    try {
      const url = search
        ? `${API}/admin/payers?search=${encodeURIComponent(search)}`
        : `${API}/admin/payers`;
      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setPayers(data.payers ?? []);
        setPayerCount(data.total ?? data.count ?? 0);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [search]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/payers/stats`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setStats(data.stats ?? null);
        setEvidenceScore(data.evidenceScore ?? null);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchAudit = useCallback(async () => {
    try {
      const url = selectedPayer
        ? `${API}/admin/payers/${selectedPayer}/audit?limit=50`
        : `${API}/admin/payers/audit/verify`;
      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();
      if (selectedPayer) {
        setAuditEvents(data.events ?? []);
        setAuditTotal(data.total ?? 0);
        setChainOk(null);
        setChainMsg('');
      } else {
        setChainOk(data.ok ?? null);
        setChainMsg(data.message ?? '');
        setAuditEvents([]);
        setAuditTotal(0);
      }
    } catch { /* ignore */ }
  }, [selectedPayer]);

  const handleImport = async () => {
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch(`${API}/admin/payers/import`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor: 'admin-ui',
          sourceType: 'insurance_commission_snapshot',
          reason: 'Import from PH HMO registry snapshot',
        }),
      });
      const data = await res.json();
      setImportResult(
        data.ok
          ? `Imported ${data.imported}, skipped ${data.skipped}`
          : `Failed: ${(data.errors ?? []).join('; ')}`
      );
      fetchPayers();
      fetchStats();
    } catch (err) {
      setImportResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
    setImporting(false);
  };

  useEffect(() => { fetchPayers(); }, [fetchPayers]);
  useEffect(() => {
    if (tab === 'stats' || tab === 'evidence') fetchStats();
  }, [tab, fetchStats]);
  useEffect(() => {
    if (tab === 'audit') fetchAudit();
  }, [tab, fetchAudit]);

  /* ── Styles ─────────────────────────────────────────────── */

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  };

  const badge = (color: string, text: string): React.ReactNode => (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600,
      color: '#fff',
      background: color,
    }}>
      {text}
    </span>
  );

  /* ── Tabs ───────────────────────────────────────────────── */

  return (
    <div style={{ padding: 24, maxWidth: 1200, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Payer Registry</h1>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
        Phase 95 -- Persistent, audited, evidence-backed payer registry
      </p>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e5e7eb', marginBottom: 20 }}>
        {(['registry', 'evidence', 'audit', 'stats'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: tab === t ? 600 : 400,
              color: tab === t ? '#2563eb' : '#6b7280',
              background: 'none',
              border: 'none',
              borderBottom: tab === t ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Registry Tab ──────────────────────────────────── */}
      {tab === 'registry' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search payers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                padding: '6px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 13,
                width: 260,
              }}
            />
            <button
              onClick={handleImport}
              disabled={importing}
              style={{
                padding: '6px 16px',
                fontSize: 13,
                fontWeight: 600,
                background: importing ? '#9ca3af' : '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: importing ? 'not-allowed' : 'pointer',
              }}
            >
              {importing ? 'Importing...' : 'Import from Snapshot'}
            </button>
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              {payerCount} payers loaded
            </span>
          </div>

          {importResult && (
            <div style={{
              padding: '8px 12px',
              marginBottom: 12,
              borderRadius: 6,
              fontSize: 13,
              background: importResult.startsWith('Imported') ? '#dcfce7' : '#fee2e2',
              color: importResult.startsWith('Imported') ? '#166534' : '#991b1b',
            }}>
              {importResult}
            </div>
          )}

          {loading && <p style={{ fontSize: 13, color: '#6b7280' }}>Loading...</p>}

          {payers.length === 0 && !loading && (
            <div style={{ ...cardStyle, textAlign: 'center', color: '#6b7280' }}>
              <p style={{ fontSize: 14, marginBottom: 8 }}>No payers in persistent store</p>
              <p style={{ fontSize: 12 }}>Click &quot;Import from Snapshot&quot; to load the 27 HMOs + PhilHealth</p>
            </div>
          )}

          {payers.map(p => (
            <div
              key={p.payerId}
              style={{ ...cardStyle, cursor: 'pointer' }}
              onClick={() => setSelectedPayer(selectedPayer === p.payerId ? null : p.payerId)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{p.legalName}</span>
                  <span style={{ marginLeft: 8, fontSize: 11, color: '#6b7280' }}>{p.payerId}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {badge(STATUS_COLORS[p.status] ?? '#9ca3af', p.status)}
                  {badge('#6366f1', p.integrationMode)}
                </div>
              </div>

              {selectedPayer === p.payerId && (
                <div style={{ marginTop: 12, fontSize: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                    {Object.entries(p.capabilities).map(([cap, status]) => (
                      <div key={cap} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: CAP_COLORS[status as string] ?? '#9ca3af',
                          display: 'inline-block',
                        }} />
                        <span>{cap}: {status as string}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <strong>Provenance</strong>
                      <div style={{ color: '#6b7280', marginTop: 4 }}>
                        Source: {p.provenance?.sourceType ?? 'unknown'}<br />
                        Imported: {p.importedAt ? new Date(p.importedAt).toLocaleDateString() : 'n/a'}<br />
                        By: {p.provenance?.importedBy ?? 'n/a'}<br />
                        Hash: <code style={{ fontSize: 10 }}>{p.importHash?.slice(0, 16)}...</code>
                      </div>
                    </div>
                    <div>
                      <strong>Evidence ({p.evidence?.length ?? 0} items)</strong>
                      {(p.evidence ?? []).slice(0, 3).map((e, i) => (
                        <div key={i} style={{ color: '#6b7280', marginTop: 2 }}>
                          [{e.kind}] <a href={e.url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>{e.title}</a>
                        </div>
                      ))}
                      {(p.evidence?.length ?? 0) > 3 && (
                        <div style={{ color: '#9ca3af', marginTop: 2 }}>+{p.evidence.length - 3} more</div>
                      )}
                    </div>
                  </div>

                  {(p.contractingTasks ?? []).length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <strong>Contracting Tasks</strong>
                      <ul style={{ margin: '4px 0 0 16px', color: '#6b7280' }}>
                        {(p.contractingTasks ?? []).map((t, i) => <li key={i}>{t}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Evidence Tab ──────────────────────────────────── */}
      {tab === 'evidence' && (
        <div>
          {evidenceScore ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                <div style={cardStyle}>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>Average Coverage</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: evidenceScore.averageCoverage >= 50 ? '#16a34a' : '#d97706' }}>
                    {evidenceScore.averageCoverage}%
                  </div>
                </div>
                <div style={cardStyle}>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>Total Payers</div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{evidenceScore.totalPayers}</div>
                </div>
                <div style={cardStyle}>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>Fully Evidenced</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#16a34a' }}>{evidenceScore.fullyEvidenced}</div>
                </div>
                <div style={cardStyle}>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>Zero Evidence</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#dc2626' }}>{evidenceScore.zeroEvidence}</div>
                </div>
              </div>

              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Per-Payer Evidence Scores</h3>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px' }}>Payer ID</th>
                    <th style={{ padding: '8px 12px' }}>Evidence Items</th>
                    <th style={{ padding: '8px 12px' }}>Coverage Score</th>
                    <th style={{ padding: '8px 12px' }}>Bar</th>
                  </tr>
                </thead>
                <tbody>
                  {(evidenceScore.perPayer ?? []).map(p => (
                    <tr key={p.payerId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '6px 12px', fontFamily: 'monospace' }}>{p.payerId}</td>
                      <td style={{ padding: '6px 12px' }}>{p.total}</td>
                      <td style={{ padding: '6px 12px', fontWeight: 600, color: p.score >= 50 ? '#16a34a' : '#d97706' }}>
                        {p.score}%
                      </td>
                      <td style={{ padding: '6px 12px' }}>
                        <div style={{ width: 120, height: 8, background: '#f3f4f6', borderRadius: 4 }}>
                          <div style={{
                            width: `${p.score}%`,
                            height: 8,
                            background: p.score >= 50 ? '#16a34a' : '#d97706',
                            borderRadius: 4,
                          }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p style={{ fontSize: 13, color: '#6b7280' }}>Loading evidence scores...</p>
          )}
        </div>
      )}

      {/* ── Audit Tab ─────────────────────────────────────── */}
      {tab === 'audit' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
            <button
              onClick={fetchAudit}
              style={{
                padding: '6px 16px',
                fontSize: 13,
                fontWeight: 600,
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              Verify Chain
            </button>
            {chainOk !== null && (
              <span style={{
                padding: '4px 12px',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 600,
                background: chainOk ? '#dcfce7' : '#fee2e2',
                color: chainOk ? '#166534' : '#991b1b',
              }}>
                {chainOk ? 'CHAIN VALID' : 'CHAIN BROKEN'}: {chainMsg}
              </span>
            )}
          </div>

          {selectedPayer ? (
            <>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
                Audit trail for <strong>{selectedPayer}</strong> ({auditTotal} events)
                <button
                  onClick={() => { setSelectedPayer(null); fetchAudit(); }}
                  style={{ marginLeft: 8, fontSize: 11, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Show all
                </button>
              </p>
              {auditEvents.map(e => (
                <div key={e.id} style={{ ...cardStyle, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{e.action}</strong>
                    <span style={{ color: '#6b7280' }}>{new Date(e.timestamp).toLocaleString()}</span>
                  </div>
                  <div style={{ color: '#6b7280', marginTop: 4 }}>
                    Actor: {e.actor} | Tenant: {e.tenantId}
                    {e.reason && <> | Reason: {e.reason}</>}
                  </div>
                  <div style={{ marginTop: 4, fontFamily: 'monospace', fontSize: 10, color: '#9ca3af' }}>
                    Hash: {e.hash.slice(0, 24)}... | Prev: {e.prevHash.slice(0, 16)}...
                  </div>
                </div>
              ))}
            </>
          ) : (
            <p style={{ fontSize: 13, color: '#6b7280' }}>
              Select a payer from the Registry tab to view its audit trail, or click Verify Chain above.
            </p>
          )}
        </div>
      )}

      {/* ── Stats Tab ─────────────────────────────────────── */}
      {tab === 'stats' && (
        <div>
          {stats ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                <div style={cardStyle}>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>Total Payers</div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.total}</div>
                </div>
                <div style={cardStyle}>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>With Portal</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#2563eb' }}>{stats.withPortal}</div>
                </div>
                <div style={cardStyle}>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>Contracting Needed</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#d97706' }}>{stats.contractingNeeded}</div>
                </div>
                <div style={cardStyle}>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>PhilHealth</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: stats.hasPhilHealth ? '#16a34a' : '#dc2626' }}>
                    {stats.hasPhilHealth ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={cardStyle}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>By Status</h3>
                  {Object.entries(stats.byStatus).map(([status, count]) => (
                    <div key={status} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                      <span>{badge(STATUS_COLORS[status] ?? '#9ca3af', status)}</span>
                      <span style={{ fontWeight: 600 }}>{count}</span>
                    </div>
                  ))}
                </div>
                <div style={cardStyle}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>By Integration Mode</h3>
                  {Object.entries(stats.byIntegrationMode).map(([mode, count]) => (
                    <div key={mode} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                      <span>{badge('#6366f1', mode)}</span>
                      <span style={{ fontWeight: 600 }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p style={{ fontSize: 13, color: '#6b7280' }}>Loading stats...</p>
          )}
        </div>
      )}
    </div>
  );
}
