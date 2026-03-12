'use client';

/**
 * Payer Registry -- Admin UI
 *
 * Phase 95B: Platform Persistence Unification
 *
 * Admin surface for the payer registry.
 * Tabs: Payers | Capabilities | Evidence | Audit
 */

import React, { useEffect, useState, useCallback } from 'react';
import { csrfHeaders } from '@/lib/csrf';
import { API_BASE as API } from '@/lib/api-config';

/* -- Types ---------------------------------------------------- */

interface Payer {
  id: string;
  canonicalName: string;
  aliases: string;
  countryCode: string;
  category: string | null;
  integrationMode: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Capability {
  id: string;
  payerId: string;
  capabilityKey: string;
  value: string;
  confidence: string;
  reason: string | null;
  updatedAt: string;
}

interface EvidenceSnapshot {
  id: string;
  sourceType: string;
  asOfDate: string;
  sha256: string;
  status: string;
  payerCount: number | null;
  ingestedAt: string;
}

interface AuditEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorType: string;
  actorId: string | null;
  reason: string | null;
  createdAt: string;
}

/* -- Helpers -------------------------------------------------- */

async function api(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    ...opts,
    headers: { 'Content-Type': 'application/json', ...csrfHeaders(), ...(opts?.headers || {}) },
  });
  return res.json();
}

type Tab = 'payers' | 'capabilities' | 'evidence' | 'audit';

/* -- Component ------------------------------------------------ */

export default function PayerDbPage() {
  const [tab, setTab] = useState<Tab>('payers');
  const [payers, setPayers] = useState<Payer[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedPayer, setSelectedPayer] = useState<Payer | null>(null);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [evidence, setEvidence] = useState<EvidenceSnapshot[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* -- Payer list ------------------------------------------- */

  const loadPayers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const data = await api(`/admin/payer-db/payers${params}`);
      if (data.ok) {
        setPayers(data.payers);
        setTotal(data.total);
      } else setError(data.error ?? 'Failed to load payers');
    } catch (e) {
      setError(String(e));
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    loadPayers();
  }, [loadPayers]);

  /* -- Capabilities ----------------------------------------- */

  const loadCapabilities = useCallback(async (payerId: string) => {
    const data = await api(`/admin/payer-db/payers/${payerId}/capabilities`);
    if (data.ok) setCapabilities(data.capabilities);
  }, []);

  /* -- Evidence --------------------------------------------- */

  const loadEvidence = useCallback(async () => {
    const data = await api('/admin/payer-db/evidence');
    if (data.ok) setEvidence(data.snapshots);
  }, []);

  /* -- Audit ------------------------------------------------ */

  const loadAudit = useCallback(async () => {
    const data = await api('/admin/payer-db/audit?limit=100');
    if (data.ok) setAudit(data.events);
    const statsData = await api('/admin/payer-db/audit/stats');
    if (statsData.ok) setStats(statsData.stats);
  }, []);

  /* -- Tab switch ------------------------------------------- */

  useEffect(() => {
    if (tab === 'evidence') loadEvidence();
    if (tab === 'audit') loadAudit();
  }, [tab, loadEvidence, loadAudit]);

  /* -- Capability edit form --------------------------------- */

  const [capForm, setCapForm] = useState({
    capabilityKey: '',
    value: '',
    confidence: 'unknown',
    reason: '',
  });

  async function submitCapability() {
    if (!selectedPayer) return;
    if (!capForm.reason.trim()) {
      alert('Reason is required for capability changes');
      return;
    }
    const data = await api(`/admin/payer-db/payers/${selectedPayer.id}/capabilities`, {
      method: 'PUT',
      body: JSON.stringify(capForm),
    });
    if (data.ok) {
      loadCapabilities(selectedPayer.id);
      setCapForm({ capabilityKey: '', value: '', confidence: 'unknown', reason: '' });
    } else {
      alert(data.error ?? 'Failed to update capability');
    }
  }

  /* -- Evidence ingest -------------------------------------- */

  const [ingestPath, setIngestPath] = useState('data/payers/ph_hmos.json');

  async function ingestJsonSnapshot() {
    const data = await api('/admin/payer-db/evidence/ingest-json', {
      method: 'POST',
      body: JSON.stringify({
        filePath: ingestPath,
        asOfDate: new Date().toISOString().split('T')[0],
      }),
    });
    if (data.ok) {
      alert(`Ingested: ${data.payerCount} payers, SHA256: ${data.sha256?.slice(0, 16)}...`);
      loadEvidence();
    } else {
      alert(data.error ?? 'Ingest failed');
    }
  }

  async function promoteEvidence(id: string) {
    if (!confirm('Promote this snapshot? Changes will be applied to the payer table.')) return;
    const data = await api(`/admin/payer-db/evidence/${id}/promote`, {
      method: 'POST',
      body: '{}',
    });
    if (data.ok) {
      alert(
        `Promoted: ${data.inserted} inserted, ${data.updated} updated, ${data.skipped} skipped`
      );
      loadEvidence();
      loadPayers();
    } else {
      alert(data.error ?? 'Promote failed');
    }
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
    background: active ? '#2563eb' : '#f3f4f6',
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
  const inputStyle: React.CSSProperties = {
    padding: '6px 10px',
    border: '1px solid #d1d5db',
    borderRadius: 4,
    fontSize: 12,
    width: '100%',
  };
  const btnStyle: React.CSSProperties = {
    padding: '6px 14px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    fontSize: 12,
    cursor: 'pointer',
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={headerStyle}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Payer Registry</h2>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#6b7280' }}>
          Phase 95B -- Platform Persistence. {total} payers in registry.
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ padding: '8px 24px 0', display: 'flex', gap: 2 }}>
        {(['payers', 'capabilities', 'evidence', 'audit'] as Tab[]).map((t) => (
          <button key={t} style={tabStyle(tab === t)} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
        {error && <div style={{ color: '#dc2626', marginBottom: 8, fontSize: 12 }}>{error}</div>}

        {/* === PAYERS TAB === */}
        {tab === 'payers' && (
          <>
            <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
              <input
                style={{ ...inputStyle, maxWidth: 300 }}
                placeholder="Search payers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button style={btnStyle} onClick={loadPayers}>
                Search
              </button>
            </div>
            {loading ? (
              <p style={{ fontSize: 12 }}>Loading...</p>
            ) : (
              <table style={tableStyle}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={cellStyle}>ID</th>
                    <th style={cellStyle}>Name</th>
                    <th style={cellStyle}>Country</th>
                    <th style={cellStyle}>Category</th>
                    <th style={cellStyle}>Integration</th>
                    <th style={cellStyle}>Active</th>
                  </tr>
                </thead>
                <tbody>
                  {payers.map((p) => (
                    <tr
                      key={p.id}
                      style={{
                        cursor: 'pointer',
                        background: selectedPayer?.id === p.id ? '#eff6ff' : undefined,
                      }}
                      onClick={() => {
                        setSelectedPayer(p);
                        setTab('capabilities');
                        loadCapabilities(p.id);
                      }}
                    >
                      <td style={{ ...cellStyle, fontFamily: 'monospace', fontSize: 11 }}>
                        {p.id}
                      </td>
                      <td style={cellStyle}>{p.canonicalName}</td>
                      <td style={cellStyle}>{p.countryCode}</td>
                      <td style={cellStyle}>{p.category ?? '--'}</td>
                      <td style={cellStyle}>{p.integrationMode ?? '--'}</td>
                      <td style={cellStyle}>{p.active ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* === CAPABILITIES TAB === */}
        {tab === 'capabilities' && (
          <>
            {selectedPayer ? (
              <>
                <h3 style={{ fontSize: 14, marginBottom: 8 }}>
                  Capabilities: {selectedPayer.canonicalName}
                </h3>
                <table style={tableStyle}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={cellStyle}>Key</th>
                      <th style={cellStyle}>Value</th>
                      <th style={cellStyle}>Confidence</th>
                      <th style={cellStyle}>Reason</th>
                      <th style={cellStyle}>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {capabilities.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ ...cellStyle, color: '#9ca3af' }}>
                          No capabilities set
                        </td>
                      </tr>
                    )}
                    {capabilities.map((c) => (
                      <tr key={c.id}>
                        <td style={{ ...cellStyle, fontFamily: 'monospace' }}>{c.capabilityKey}</td>
                        <td style={cellStyle}>{c.value}</td>
                        <td style={cellStyle}>{c.confidence}</td>
                        <td style={{ ...cellStyle, maxWidth: 200, overflow: 'hidden' }}>
                          {c.reason ?? '--'}
                        </td>
                        <td style={cellStyle}>{c.updatedAt?.slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: 16, padding: 12, background: '#f9fafb', borderRadius: 6 }}>
                  <h4 style={{ fontSize: 12, marginBottom: 8 }}>Set / Update Capability</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <input
                      style={inputStyle}
                      placeholder="capabilityKey"
                      value={capForm.capabilityKey}
                      onChange={(e) => setCapForm((f) => ({ ...f, capabilityKey: e.target.value }))}
                    />
                    <select
                      style={inputStyle}
                      value={capForm.value}
                      onChange={(e) => setCapForm((f) => ({ ...f, value: e.target.value }))}
                    >
                      <option value="">-- value --</option>
                      <option value="available">available</option>
                      <option value="portal">portal</option>
                      <option value="manual">manual</option>
                      <option value="unknown_publicly">unknown_publicly</option>
                      <option value="unavailable">unavailable</option>
                    </select>
                    <select
                      style={inputStyle}
                      value={capForm.confidence}
                      onChange={(e) => setCapForm((f) => ({ ...f, confidence: e.target.value }))}
                    >
                      <option value="confirmed">confirmed</option>
                      <option value="inferred">inferred</option>
                      <option value="unknown">unknown</option>
                    </select>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <input
                      style={inputStyle}
                      placeholder="Reason (REQUIRED)"
                      value={capForm.reason}
                      onChange={(e) => setCapForm((f) => ({ ...f, reason: e.target.value }))}
                    />
                  </div>
                  <button style={{ ...btnStyle, marginTop: 8 }} onClick={submitCapability}>
                    Save Capability
                  </button>
                </div>
              </>
            ) : (
              <p style={{ color: '#9ca3af', fontSize: 12 }}>
                Select a payer from the Payers tab to view capabilities.
              </p>
            )}
          </>
        )}

        {/* === EVIDENCE TAB === */}
        {tab === 'evidence' && (
          <>
            <div style={{ marginBottom: 16, padding: 12, background: '#f9fafb', borderRadius: 6 }}>
              <h4 style={{ fontSize: 12, marginBottom: 8 }}>Ingest JSON Snapshot</h4>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  style={{ ...inputStyle, maxWidth: 400 }}
                  placeholder="File path (relative to repo root)"
                  value={ingestPath}
                  onChange={(e) => setIngestPath(e.target.value)}
                />
                <button style={btnStyle} onClick={ingestJsonSnapshot}>
                  Ingest
                </button>
              </div>
            </div>
            <table style={tableStyle}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={cellStyle}>ID</th>
                  <th style={cellStyle}>Type</th>
                  <th style={cellStyle}>As Of</th>
                  <th style={cellStyle}>Payers</th>
                  <th style={cellStyle}>Status</th>
                  <th style={cellStyle}>SHA256</th>
                  <th style={cellStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {evidence.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ ...cellStyle, color: '#9ca3af' }}>
                      No evidence snapshots
                    </td>
                  </tr>
                )}
                {evidence.map((e) => (
                  <tr key={e.id}>
                    <td style={{ ...cellStyle, fontFamily: 'monospace', fontSize: 10 }}>
                      {e.id.slice(0, 8)}...
                    </td>
                    <td style={cellStyle}>{e.sourceType}</td>
                    <td style={cellStyle}>{e.asOfDate}</td>
                    <td style={cellStyle}>{e.payerCount ?? '--'}</td>
                    <td style={cellStyle}>
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: 3,
                          fontSize: 10,
                          fontWeight: 600,
                          background:
                            e.status === 'promoted'
                              ? '#dcfce7'
                              : e.status === 'pending'
                                ? '#fef3c7'
                                : '#f3f4f6',
                          color:
                            e.status === 'promoted'
                              ? '#166534'
                              : e.status === 'pending'
                                ? '#92400e'
                                : '#374151',
                        }}
                      >
                        {e.status}
                      </span>
                    </td>
                    <td style={{ ...cellStyle, fontFamily: 'monospace', fontSize: 10 }}>
                      {e.sha256.slice(0, 16)}...
                    </td>
                    <td style={cellStyle}>
                      {e.status === 'pending' && (
                        <button
                          style={{ ...btnStyle, padding: '4px 10px', fontSize: 11 }}
                          onClick={() => promoteEvidence(e.id)}
                        >
                          Promote
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* === AUDIT TAB === */}
        {tab === 'audit' && (
          <>
            {stats && (
              <div
                style={{
                  marginBottom: 12,
                  padding: 8,
                  background: '#f9fafb',
                  borderRadius: 4,
                  fontSize: 11,
                }}
              >
                Total events: <strong>{stats.total}</strong>
                {' | '}
                By action:{' '}
                {Object.entries(stats.byAction ?? {})
                  .map(([k, v]) => `${k}:${v}`)
                  .join(', ')}
              </div>
            )}
            <table style={tableStyle}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={cellStyle}>Time</th>
                  <th style={cellStyle}>Action</th>
                  <th style={cellStyle}>Entity</th>
                  <th style={cellStyle}>Actor</th>
                  <th style={cellStyle}>Reason</th>
                </tr>
              </thead>
              <tbody>
                {audit.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ ...cellStyle, color: '#9ca3af' }}>
                      No audit events
                    </td>
                  </tr>
                )}
                {audit.map((a) => (
                  <tr key={a.id}>
                    <td style={{ ...cellStyle, fontSize: 10, whiteSpace: 'nowrap' }}>
                      {a.createdAt?.slice(0, 19)}
                    </td>
                    <td style={cellStyle}>{a.action}</td>
                    <td style={{ ...cellStyle, fontSize: 10 }}>
                      {a.entityType}/{a.entityId.slice(0, 8)}
                    </td>
                    <td style={cellStyle}>{a.actorId ?? a.actorType}</td>
                    <td style={{ ...cellStyle, maxWidth: 200, overflow: 'hidden' }}>
                      {a.reason ?? '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
