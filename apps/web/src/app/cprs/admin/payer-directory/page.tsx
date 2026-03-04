'use client';

/**
 * Payer Directory Admin — Phase 88: PH Payer Registry Ingestion
 *
 * 3-tab interface:
 *   1. Payers — filterable payer list with tier/status management
 *   2. Sources — ingestion source snapshots + diff view
 *   3. Merge — duplicate payer merge tool
 *
 * Accessible at /cprs/admin/payer-directory. Requires session + RCM module enabled.
 */

import { useState, useEffect, useCallback } from 'react';
import { csrfHeaders } from '@/lib/csrf';
import styles from '@/components/cprs/cprs.module.css';
import { API_BASE } from '@/lib/api-config';

type Tab = 'payers' | 'sources' | 'merge';

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...opts,
    headers: { ...csrfHeaders(), ...(opts?.headers || {}) },
  });
  return res.json();
}

export default function PayerDirectoryPage() {
  const [tab, setTab] = useState<Tab>('payers');
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    apiFetch('/rcm/payerops/registry/health')
      .then(setHealth)
      .catch(() => {});
  }, []);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'payers', label: 'Payer Registry' },
    { id: 'sources', label: 'Ingestion Sources' },
    { id: 'merge', label: 'Merge Tool' },
  ];

  return (
    <div className={styles.panelRoot ?? ''} style={{ padding: 16 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Payer Directory</h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6c757d' }}>
            Phase 88 -- Regulator-grounded payer universe (Insurance Commission).
            {health?.registry
              ? ` ${health.registry.totalPayers} payers from ${health.registry.totalSources} source(s).`
              : ''}
          </p>
        </div>
        <IngestButton onDone={() => apiFetch('/rcm/payerops/registry/health').then(setHealth)} />
      </div>

      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #dee2e6', marginBottom: 16 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '6px 16px',
              fontSize: 13,
              fontWeight: tab === t.id ? 700 : 400,
              background: tab === t.id ? '#fff' : 'transparent',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid #0d6efd' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: -2,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'payers' && <PayersTab />}
      {tab === 'sources' && <SourcesTab />}
      {tab === 'merge' && <MergeTab />}
    </div>
  );
}

/* ── Ingest Button ──────────────────────────────────────────── */

function IngestButton({ onDone }: { onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const data = await apiFetch('/rcm/payerops/registry/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'all' }),
      });
      setResult(data);
      onDone();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={run}
        disabled={loading}
        style={{
          padding: '6px 16px',
          fontSize: 12,
          cursor: 'pointer',
          background: '#0d6efd',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
        }}
      >
        {loading ? 'Ingesting...' : 'Run Ingestion'}
      </button>
      {result && (
        <span style={{ fontSize: 11, color: result.ok ? '#198754' : '#dc3545' }}>
          {result.ok
            ? `Done: ${result.totalPayers} payers (${result.totalNew} new)`
            : 'Ingestion failed'}
        </span>
      )}
    </div>
  );
}

/* ── Payers Tab ─────────────────────────────────────────────── */

function PayersTab() {
  const [payers, setPayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: '', status: '', tier: '', search: '' });
  const [editing, setEditing] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (filters.type) qs.set('type', filters.type);
    if (filters.status) qs.set('status', filters.status);
    if (filters.tier) qs.set('tier', filters.tier);
    if (filters.search) qs.set('search', filters.search);
    apiFetch(`/rcm/payerops/payers?${qs}`)
      .then((d) => setPayers(d?.payers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const updatePayer = async (id: string, patch: any) => {
    await apiFetch(`/rcm/payerops/payers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    setEditing(null);
    load();
  };

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <select
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
          style={{ fontSize: 12, padding: 4 }}
        >
          <option value="">All Types</option>
          <option value="hmo">HMO</option>
          <option value="hmo_broker">HMO Broker</option>
          <option value="government">Government</option>
          <option value="insurer">Insurer</option>
          <option value="other">Other</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          style={{ fontSize: 12, padding: 4 }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
          <option value="pending_ca">Pending CA</option>
        </select>
        <select
          value={filters.tier}
          onChange={(e) => setFilters((f) => ({ ...f, tier: e.target.value }))}
          style={{ fontSize: 12, padding: 4 }}
        >
          <option value="">All Tiers</option>
          <option value="top5">Top 5</option>
          <option value="top10">Top 10</option>
          <option value="long_tail">Long Tail</option>
          <option value="untiered">Untiered</option>
        </select>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          placeholder="Search payer name..."
          style={{ fontSize: 12, padding: 4, width: 200 }}
        />
        <span style={{ fontSize: 12, color: '#6c757d', alignSelf: 'center' }}>
          {payers.length} payer(s)
        </span>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: '#6c757d' }}>Loading...</p>
      ) : payers.length === 0 ? (
        <p style={{ fontSize: 13, color: '#6c757d' }}>
          No payers found. Run ingestion to populate from Insurance Commission data.
        </p>
      ) : (
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>
              <th style={{ padding: '6px 8px' }}>Name</th>
              <th style={{ padding: '6px 8px' }}>Type</th>
              <th style={{ padding: '6px 8px' }}>Status</th>
              <th style={{ padding: '6px 8px' }}>Tier</th>
              <th style={{ padding: '6px 8px' }}>CA/License</th>
              <th style={{ padding: '6px 8px' }}>Aliases</th>
              <th style={{ padding: '6px 8px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payers.map((p: any) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: '6px 8px', fontWeight: 500 }}>{p.canonicalName}</td>
                <td style={{ padding: '6px 8px' }}>
                  <TypeBadge type={p.type} />
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <StatusBadge status={p.status} />
                </td>
                <td style={{ padding: '6px 8px' }}>
                  {editing === p.id ? (
                    <select
                      defaultValue={p.priorityTier}
                      onChange={(e) => updatePayer(p.id, { priorityTier: e.target.value })}
                      style={{ fontSize: 11, padding: 2 }}
                    >
                      <option value="top5">Top 5</option>
                      <option value="top10">Top 10</option>
                      <option value="long_tail">Long Tail</option>
                      <option value="untiered">Untiered</option>
                    </select>
                  ) : (
                    <TierBadge tier={p.priorityTier} />
                  )}
                </td>
                <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: 11 }}>
                  {p.regulatorRef || '--'}
                </td>
                <td style={{ padding: '6px 8px', fontSize: 11, color: '#6c757d' }}>
                  {p.aliases?.length > 0 ? p.aliases.join(', ') : '--'}
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <button
                    onClick={() => setEditing(editing === p.id ? null : p.id)}
                    style={{ fontSize: 11, padding: '2px 8px', cursor: 'pointer' }}
                  >
                    {editing === p.id ? 'Cancel' : 'Edit'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ── Sources Tab ────────────────────────────────────────────── */

function SourcesTab() {
  const [sources, setSources] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/rcm/payerops/registry/sources'),
      apiFetch('/rcm/payerops/registry/snapshots'),
    ])
      .then(([src, snap]) => {
        setSources(src?.sources || []);
        setSnapshots(snap?.snapshots || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Ingestion Sources</h3>

      {loading ? (
        <p style={{ fontSize: 13, color: '#6c757d' }}>Loading...</p>
      ) : sources.length === 0 ? (
        <p style={{ fontSize: 13, color: '#6c757d' }}>
          No sources ingested yet. Click "Run Ingestion" to fetch Insurance Commission data.
        </p>
      ) : (
        <>
          <table
            style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', marginBottom: 24 }}
          >
            <thead>
              <tr style={{ borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>
                <th style={{ padding: '6px 8px' }}>Source</th>
                <th style={{ padding: '6px 8px' }}>Type</th>
                <th style={{ padding: '6px 8px' }}>As Of</th>
                <th style={{ padding: '6px 8px' }}>Version</th>
                <th style={{ padding: '6px 8px' }}>Records</th>
                <th style={{ padding: '6px 8px' }}>Hash</th>
                <th style={{ padding: '6px 8px' }}>Fetched</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s: any) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '6px 8px' }}>{s.name}</td>
                  <td style={{ padding: '6px 8px' }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: '2px 6px',
                        background: '#e9ecef',
                        borderRadius: 3,
                      }}
                    >
                      {s.sourceType}
                    </span>
                  </td>
                  <td style={{ padding: '6px 8px' }}>{s.asOfDate}</td>
                  <td style={{ padding: '6px 8px' }}>v{s.version}</td>
                  <td style={{ padding: '6px 8px' }}>{s.recordCount}</td>
                  <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: 10 }}>
                    {s.contentHash?.slice(0, 12)}...
                  </td>
                  <td style={{ padding: '6px 8px', fontSize: 11 }}>{s.fetchedAt?.split('T')[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Snapshot Diffs</h3>
          {snapshots.length === 0 ? (
            <p style={{ fontSize: 13, color: '#6c757d' }}>No snapshot history yet.</p>
          ) : (
            snapshots.map((snap: any, i: number) => (
              <div
                key={i}
                style={{
                  border: '1px solid #dee2e6',
                  borderRadius: 4,
                  padding: 12,
                  marginBottom: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong style={{ fontSize: 13 }}>
                    {snap.sourceType} v{snap.version} -- as of {snap.asOfDate}
                  </strong>
                  <span style={{ fontSize: 11, color: '#6c757d' }}>
                    {snap.payerCount} payer(s) | fetched {snap.fetchedAt?.split('T')[0]}
                  </span>
                </div>
                {snap.diff?.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
                    {snap.diff.map((d: any, j: number) => (
                      <li
                        key={j}
                        style={{
                          color:
                            d.change === 'added'
                              ? '#198754'
                              : d.change === 'removed'
                                ? '#dc3545'
                                : '#664d03',
                        }}
                      >
                        <strong>{d.change}:</strong> {d.payerName}
                        {d.oldName ? ` (was: ${d.oldName})` : ''}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ margin: 0, fontSize: 12, color: '#6c757d' }}>
                    No changes from previous snapshot.
                  </p>
                )}
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}

/* ── Merge Tab ──────────────────────────────────────────────── */

function MergeTab() {
  const [payers, setPayers] = useState<any[]>([]);
  const [targetId, setTargetId] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    apiFetch('/rcm/payerops/payers')
      .then((d) => setPayers(d?.payers || []))
      .catch(() => {});
  }, []);

  const merge = async () => {
    if (!targetId || !sourceId) return;
    const data = await apiFetch('/rcm/payerops/payers/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId, sourceId }),
    });
    setResult(data);
    // Reload
    apiFetch('/rcm/payerops/payers')
      .then((d) => setPayers(d?.payers || []))
      .catch(() => {});
  };

  return (
    <div>
      <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>Merge Duplicate Payers</h3>
      <p style={{ fontSize: 12, color: '#6c757d', marginBottom: 12 }}>
        Select the payer to keep (target) and the duplicate to remove (source). The source name
        becomes an alias on the target.
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 12 }}>
          Keep (target):
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            style={{ marginLeft: 4, fontSize: 12, padding: 4, minWidth: 250 }}
          >
            <option value="">Select payer...</option>
            {payers.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.canonicalName}
              </option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: 12 }}>
          Remove (source):
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            style={{ marginLeft: 4, fontSize: 12, padding: 4, minWidth: 250 }}
          >
            <option value="">Select duplicate...</option>
            {payers
              .filter((p: any) => p.id !== targetId)
              .map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.canonicalName}
                </option>
              ))}
          </select>
        </label>
        <button
          onClick={merge}
          disabled={!targetId || !sourceId}
          style={{ padding: '4px 16px', fontSize: 12, cursor: 'pointer', alignSelf: 'flex-end' }}
        >
          Merge
        </button>
      </div>

      {result && (
        <div
          style={{
            padding: 8,
            borderRadius: 4,
            fontSize: 12,
            background: result.ok ? '#d4edda' : '#f8d7da',
            color: result.ok ? '#155724' : '#721c24',
          }}
        >
          {result.ok
            ? `Merged successfully. Target now has aliases: ${result.merged?.aliases?.join(', ')}`
            : `Error: ${result.error}`}
        </div>
      )}
    </div>
  );
}

/* ── Shared Components ──────────────────────────────────────── */

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    hmo: { bg: '#cce5ff', fg: '#004085' },
    hmo_broker: { bg: '#d1ecf1', fg: '#0c5460' },
    government: { bg: '#d4edda', fg: '#155724' },
    insurer: { bg: '#fff3cd', fg: '#664d03' },
    other: { bg: '#e9ecef', fg: '#495057' },
  };
  const c = colors[type] || colors.other;
  return (
    <span
      style={{
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 3,
        fontWeight: 600,
        background: c.bg,
        color: c.fg,
      }}
    >
      {type?.replace(/_/g, ' ')}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    active: { bg: '#d4edda', fg: '#155724' },
    inactive: { bg: '#e9ecef', fg: '#6c757d' },
    suspended: { bg: '#f8d7da', fg: '#721c24' },
    pending_ca: { bg: '#fff3cd', fg: '#664d03' },
  };
  const c = colors[status] || { bg: '#e9ecef', fg: '#495057' };
  return (
    <span
      style={{
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 3,
        fontWeight: 600,
        background: c.bg,
        color: c.fg,
      }}
    >
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    top5: { bg: '#d4edda', fg: '#155724' },
    top10: { bg: '#cce5ff', fg: '#004085' },
    long_tail: { bg: '#fff3cd', fg: '#664d03' },
    untiered: { bg: '#e9ecef', fg: '#6c757d' },
  };
  const c = colors[tier] || colors.untiered;
  return (
    <span
      style={{
        fontSize: 11,
        padding: '2px 6px',
        borderRadius: 3,
        background: c.bg,
        color: c.fg,
      }}
    >
      {tier?.replace(/_/g, ' ')}
    </span>
  );
}
