'use client';

/**
 * RCM Denial Cases & Appeals — Phase 98
 *
 * Standalone tabbed interface for the Phase 98 denial workflow:
 *   - Work Queue — paginated denial case list with filters
 *   - Create Denial — manual intake form
 *   - Dashboard — status counts
 *
 * Accessible at /cprs/admin/denial-cases. Requires session.
 *
 * This is separate from the Phase 91 denials workbench at /cprs/admin/denials,
 * which handles inline claim-lifecycle denials. Phase 98 manages standalone
 * denial cases with full appeal packet generation, SLA tracking, and
 * resubmission workflow.
 */

import { useState, useEffect, useCallback } from 'react';
import styles from '@/components/cprs/cprs.module.css';
import { csrfHeaders } from '@/lib/csrf';
import { API_BASE } from '@/lib/api-config';

type Tab = 'queue' | 'create' | 'detail' | 'stats';

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...opts,
    headers: { ...csrfHeaders(), ...(opts?.headers || {}) },
  });
  return res.json();
}

async function apiPost(path: string, body: unknown) {
  return apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function apiPatch(path: string, body: unknown) {
  return apiFetch(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/* ── Status styling ──────────────────────────────────────────── */
const STATUS_COLORS: Record<string, string> = {
  NEW: '#0d6efd',
  TRIAGED: '#6f42c1',
  APPEALING: '#fd7e14',
  RESUBMITTED: '#0dcaf0',
  PAID: '#198754',
  PARTIAL: '#20c997',
  WRITEOFF: '#6c757d',
  CLOSED: '#adb5bd',
};

export default function DenialCasesPage() {
  const [tab, setTab] = useState<Tab>('queue');
  const [denials, setDenials] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [stats, setStats] = useState<Record<string, number>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Create form state
  const [createForm, setCreateForm] = useState({
    claimRef: '',
    payerId: '',
    billedAmount: '',
    denialSource: 'MANUAL',
    denialNarrative: '',
    carcCode: '',
    carcDesc: '',
  });

  /* ── Data loading ──────────────────────────────────────── */
  const loadDenials = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const data = await apiFetch(`/rcm/denials?${params}`);
      if (data.ok) {
        setDenials(data.items ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [page, statusFilter]);

  const loadStats = useCallback(async () => {
    try {
      const data = await apiFetch('/rcm/denials/stats');
      if (data.ok) setStats(data.stats ?? {});
    } catch {
      /* ignore */
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    try {
      const data = await apiFetch(`/rcm/denials/${id}`);
      if (data.ok) {
        setDetail(data);
        setSelectedId(id);
        setTab('detail');
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadDenials();
  }, [loadDenials]);
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  /* ── Create denial handler ─────────────────────────────── */
  const handleCreate = async () => {
    if (!createForm.claimRef || !createForm.payerId || !createForm.billedAmount) {
      setMessage('claimRef, payerId, and billedAmount are required');
      return;
    }
    const body: Record<string, unknown> = {
      claimRef: createForm.claimRef,
      payerId: createForm.payerId,
      billedAmount: parseFloat(createForm.billedAmount),
      denialSource: createForm.denialSource,
      denialNarrative: createForm.denialNarrative || undefined,
      denialCodes: [] as Array<Record<string, string>>,
    };
    if (createForm.carcCode) {
      (body.denialCodes as Array<Record<string, string>>).push({
        type: 'CARC',
        code: createForm.carcCode,
        description: createForm.carcDesc || '',
      });
    }
    const data = await apiPost('/rcm/denials', body);
    if (data.ok) {
      setMessage(`Created denial ${(data.denial?.id as string)?.slice(0, 8) ?? ''}`);
      setCreateForm({
        claimRef: '',
        payerId: '',
        billedAmount: '',
        denialSource: 'MANUAL',
        denialNarrative: '',
        carcCode: '',
        carcDesc: '',
      });
      loadDenials();
      loadStats();
    } else {
      setMessage(`Error: ${JSON.stringify(data.error)}`);
    }
  };

  /* ── Update status handler ─────────────────────────────── */
  const handleTransition = async (id: string, newStatus: string, reason: string) => {
    const data = await apiPatch(`/rcm/denials/${id}`, { denialStatus: newStatus, reason });
    if (data.ok) {
      setMessage(`Updated to ${newStatus}`);
      loadDetail(id);
      loadDenials();
      loadStats();
    } else {
      setMessage(`Error: ${JSON.stringify(data.error)}`);
    }
  };

  /* ── Tab buttons ───────────────────────────────────────── */
  const tabs: { id: Tab; label: string }[] = [
    { id: 'queue', label: 'Work Queue' },
    { id: 'create', label: 'Create Denial' },
    { id: 'stats', label: 'Dashboard' },
  ];

  return (
    <div className={styles.cprsPage}>
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid #dee2e6',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18 }}>Denial Cases &amp; Appeals</h2>
        <span style={{ fontSize: 11, color: '#6c757d' }}>
          Phase 98 — VistA-first operational overlay
        </span>
      </div>

      {message && (
        <div
          style={{
            padding: '8px 24px',
            background: '#d1ecf1',
            borderBottom: '1px solid #bee5eb',
            fontSize: 12,
          }}
        >
          {message}
          <button
            onClick={() => setMessage('')}
            style={{ marginLeft: 8, border: 'none', background: 'none', cursor: 'pointer' }}
          >
            x
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #dee2e6', background: '#f8f9fa' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid #0d6efd' : '2px solid transparent',
              background: 'none',
              fontWeight: tab === t.id ? 600 : 400,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            {t.label}
          </button>
        ))}
        {selectedId && (
          <button
            onClick={() => setTab('detail')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: tab === 'detail' ? '2px solid #0d6efd' : '2px solid transparent',
              background: 'none',
              fontWeight: tab === 'detail' ? 600 : 400,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Detail
          </button>
        )}
      </div>

      <div style={{ padding: 24 }}>
        {/* ── Work Queue Tab ──────────────────────────────── */}
        {tab === 'queue' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                style={{ fontSize: 12, padding: '4px 8px' }}
              >
                <option value="">All</option>
                {[
                  'NEW',
                  'TRIAGED',
                  'APPEALING',
                  'RESUBMITTED',
                  'PAID',
                  'PARTIAL',
                  'WRITEOFF',
                  'CLOSED',
                ].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: 11, color: '#6c757d', marginLeft: 'auto' }}>
                {total} total | Page {page}/{totalPages}
              </span>
            </div>

            {loading ? (
              <p style={{ fontSize: 12 }}>Loading...</p>
            ) : (
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>
                    <th style={{ padding: '6px 8px' }}>Claim Ref</th>
                    <th style={{ padding: '6px 8px' }}>Payer</th>
                    <th style={{ padding: '6px 8px' }}>Status</th>
                    <th style={{ padding: '6px 8px' }}>Billed</th>
                    <th style={{ padding: '6px 8px' }}>Source</th>
                    <th style={{ padding: '6px 8px' }}>Created</th>
                    <th style={{ padding: '6px 8px' }}>Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {denials.map((d: Record<string, any>) => (
                    <tr
                      key={d.id}
                      onClick={() => loadDetail(d.id)}
                      style={{ borderBottom: '1px solid #dee2e6', cursor: 'pointer' }}
                    >
                      <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{d.claimRef}</td>
                      <td style={{ padding: '6px 8px' }}>{d.payerId}</td>
                      <td style={{ padding: '6px 8px' }}>
                        <span
                          style={{
                            background: STATUS_COLORS[d.denialStatus] ?? '#6c757d',
                            color: '#fff',
                            padding: '2px 6px',
                            borderRadius: 3,
                            fontSize: 10,
                            fontWeight: 600,
                          }}
                        >
                          {d.denialStatus}
                        </span>
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        ${((d.financials?.billedAmountCents ?? 0) / 100).toFixed(2)}
                      </td>
                      <td style={{ padding: '6px 8px' }}>{d.denialSource}</td>
                      <td style={{ padding: '6px 8px' }}>
                        {(d.createdAt as string)?.slice(0, 10)}
                      </td>
                      <td
                        style={{
                          padding: '6px 8px',
                          color: d.deadlineDate ? '#dc3545' : '#adb5bd',
                        }}
                      >
                        {(d.deadlineDate as string)?.slice(0, 10) ?? '--'}
                      </td>
                    </tr>
                  ))}
                  {denials.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        style={{ padding: 24, textAlign: 'center', color: '#6c757d' }}
                      >
                        No denial cases found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {/* Pagination */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                style={{ fontSize: 12, padding: '4px 12px' }}
              >
                Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                style={{ fontSize: 12, padding: '4px 12px' }}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* ── Create Denial Tab ──────────────────────────── */}
        {tab === 'create' && (
          <div style={{ maxWidth: 500 }}>
            <h3 style={{ fontSize: 14, marginBottom: 16 }}>Create Denial Case</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ fontSize: 12 }}>
                Claim Reference *
                <input
                  value={createForm.claimRef}
                  onChange={(e) => setCreateForm((f) => ({ ...f, claimRef: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    fontSize: 12,
                    border: '1px solid #ced4da',
                    borderRadius: 4,
                  }}
                />
              </label>
              <label style={{ fontSize: 12 }}>
                Payer ID *
                <input
                  value={createForm.payerId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, payerId: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    fontSize: 12,
                    border: '1px solid #ced4da',
                    borderRadius: 4,
                  }}
                />
              </label>
              <label style={{ fontSize: 12 }}>
                Billed Amount ($) *
                <input
                  type="number"
                  step="0.01"
                  value={createForm.billedAmount}
                  onChange={(e) => setCreateForm((f) => ({ ...f, billedAmount: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    fontSize: 12,
                    border: '1px solid #ced4da',
                    borderRadius: 4,
                  }}
                />
              </label>
              <label style={{ fontSize: 12 }}>
                Source
                <select
                  value={createForm.denialSource}
                  onChange={(e) => setCreateForm((f) => ({ ...f, denialSource: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    fontSize: 12,
                    border: '1px solid #ced4da',
                    borderRadius: 4,
                  }}
                >
                  <option value="MANUAL">MANUAL</option>
                  <option value="EDI_835">EDI_835</option>
                  <option value="PORTAL_STATUS">PORTAL_STATUS</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </label>
              <label style={{ fontSize: 12 }}>
                CARC Code (optional)
                <input
                  value={createForm.carcCode}
                  onChange={(e) => setCreateForm((f) => ({ ...f, carcCode: e.target.value }))}
                  placeholder="e.g., 16"
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    fontSize: 12,
                    border: '1px solid #ced4da',
                    borderRadius: 4,
                  }}
                />
              </label>
              <label style={{ fontSize: 12 }}>
                CARC Description (optional)
                <input
                  value={createForm.carcDesc}
                  onChange={(e) => setCreateForm((f) => ({ ...f, carcDesc: e.target.value }))}
                  placeholder="e.g., Claim lacks information"
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    fontSize: 12,
                    border: '1px solid #ced4da',
                    borderRadius: 4,
                  }}
                />
              </label>
              <label style={{ fontSize: 12 }}>
                Denial Narrative
                <textarea
                  value={createForm.denialNarrative}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, denialNarrative: e.target.value }))
                  }
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    fontSize: 12,
                    border: '1px solid #ced4da',
                    borderRadius: 4,
                  }}
                />
              </label>
              <button
                onClick={handleCreate}
                style={{
                  padding: '8px 16px',
                  background: '#0d6efd',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Create Denial
              </button>
            </div>
          </div>
        )}

        {/* ── Detail Tab ─────────────────────────────────── */}
        {tab === 'detail' && detail && (
          <div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
              <h3 style={{ fontSize: 14, margin: 0 }}>Denial: {detail.denial?.claimRef}</h3>
              <span
                style={{
                  background: STATUS_COLORS[detail.denial?.denialStatus] ?? '#6c757d',
                  color: '#fff',
                  padding: '2px 8px',
                  borderRadius: 3,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {detail.denial?.denialStatus}
              </span>
              <span style={{ fontSize: 11, color: '#6c757d', fontFamily: 'monospace' }}>
                {(detail.denial?.id as string)?.slice(0, 8)}
              </span>
            </div>

            {/* Summary table */}
            <table style={{ fontSize: 12, marginBottom: 16, borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '4px 12px 4px 0', fontWeight: 600 }}>Payer</td>
                  <td>{detail.denial?.payerId}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 12px 4px 0', fontWeight: 600 }}>Source</td>
                  <td>{detail.denial?.denialSource}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 12px 4px 0', fontWeight: 600 }}>Billed</td>
                  <td>${((detail.denial?.financials?.billedAmountCents ?? 0) / 100).toFixed(2)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 12px 4px 0', fontWeight: 600 }}>Received</td>
                  <td>{(detail.denial?.receivedDate as string)?.slice(0, 10)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 12px 4px 0', fontWeight: 600 }}>Deadline</td>
                  <td>{(detail.denial?.deadlineDate as string)?.slice(0, 10) ?? '--'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 12px 4px 0', fontWeight: 600 }}>Assigned</td>
                  <td>{detail.denial?.assignedTo ?? 'Unassigned'}</td>
                </tr>
                {detail.denial?.denialNarrative && (
                  <tr>
                    <td style={{ padding: '4px 12px 4px 0', fontWeight: 600 }}>Narrative</td>
                    <td>{detail.denial.denialNarrative}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Denial Codes */}
            {detail.denial?.denialCodes?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Denial Codes</h4>
                {(detail.denial.denialCodes as Array<Record<string, string>>).map((c, i) => (
                  <span
                    key={i}
                    style={{
                      display: 'inline-block',
                      background: '#f8f9fa',
                      border: '1px solid #dee2e6',
                      padding: '2px 8px',
                      borderRadius: 3,
                      fontSize: 11,
                      marginRight: 4,
                      marginBottom: 4,
                    }}
                  >
                    {c.type}: {c.code} {c.description ? `-- ${c.description}` : ''}
                  </span>
                ))}
              </div>
            )}

            {/* Transition buttons */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {['TRIAGED', 'APPEALING', 'RESUBMITTED', 'PAID', 'PARTIAL', 'WRITEOFF', 'CLOSED']
                .filter((s) => {
                  const transitions: Record<string, string[]> = {
                    NEW: ['TRIAGED', 'APPEALING', 'WRITEOFF', 'CLOSED'],
                    TRIAGED: ['APPEALING', 'RESUBMITTED', 'WRITEOFF', 'CLOSED'],
                    APPEALING: ['RESUBMITTED', 'PAID', 'PARTIAL', 'WRITEOFF', 'CLOSED'],
                    RESUBMITTED: ['PAID', 'PARTIAL', 'APPEALING', 'WRITEOFF', 'CLOSED'],
                    PAID: ['CLOSED'],
                    PARTIAL: ['APPEALING', 'WRITEOFF', 'CLOSED'],
                    WRITEOFF: ['CLOSED'],
                    CLOSED: [],
                  };
                  return (transitions[detail.denial?.denialStatus] ?? []).includes(s);
                })
                .map((s) => (
                  <button
                    key={s}
                    onClick={() => handleTransition(detail.denial.id, s, `Transitioned to ${s}`)}
                    style={{
                      padding: '4px 12px',
                      fontSize: 11,
                      border: '1px solid #ced4da',
                      borderRadius: 3,
                      background: STATUS_COLORS[s] ?? '#6c757d',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    {s}
                  </button>
                ))}
            </div>

            {/* Actions timeline */}
            <h4 style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Actions Timeline</h4>
            <div style={{ borderLeft: '2px solid #dee2e6', paddingLeft: 16, marginBottom: 16 }}>
              {(detail.actions ?? []).map((a: Record<string, any>) => (
                <div key={a.id} style={{ marginBottom: 8, fontSize: 11 }}>
                  <span style={{ fontWeight: 600 }}>{a.actionType}</span>
                  <span style={{ color: '#6c757d', marginLeft: 8 }}>
                    {(a.timestamp as string)?.slice(0, 19)}
                  </span>
                  <span style={{ color: '#6c757d', marginLeft: 8 }}>by {a.actor}</span>
                  {a.previousStatus !== a.newStatus && a.newStatus && (
                    <span style={{ marginLeft: 8, fontSize: 10, color: '#0d6efd' }}>
                      {a.previousStatus} -&gt; {a.newStatus}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Attachments */}
            <h4 style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
              Attachments ({detail.attachments?.length ?? 0})
            </h4>
            {(detail.attachments ?? []).length === 0 ? (
              <p style={{ fontSize: 11, color: '#6c757d' }}>No attachments</p>
            ) : (
              <ul style={{ fontSize: 11, paddingLeft: 16 }}>
                {(detail.attachments ?? []).map((a: Record<string, string>) => (
                  <li key={a.id}>
                    {a.label} ({a.refType}) -- {a.addedAt?.slice(0, 10)}
                  </li>
                ))}
              </ul>
            )}

            {/* Resubmissions */}
            <h4 style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, marginTop: 16 }}>
              Resubmissions ({detail.resubmissions?.length ?? 0})
            </h4>
            {(detail.resubmissions ?? []).length === 0 ? (
              <p style={{ fontSize: 11, color: '#6c757d' }}>No resubmissions</p>
            ) : (
              <ul style={{ fontSize: 11, paddingLeft: 16 }}>
                {(detail.resubmissions ?? []).map((r: Record<string, string>) => (
                  <li key={r.id}>
                    {r.method} -- {r.createdAt?.slice(0, 10)}{' '}
                    {r.referenceNumber ? `(${r.referenceNumber})` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── Stats Tab ──────────────────────────────────── */}
        {tab === 'stats' && (
          <div>
            <h3 style={{ fontSize: 14, marginBottom: 16 }}>Denial Status Dashboard</h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: 12,
              }}
            >
              {[
                'NEW',
                'TRIAGED',
                'APPEALING',
                'RESUBMITTED',
                'PAID',
                'PARTIAL',
                'WRITEOFF',
                'CLOSED',
              ].map((s) => (
                <div
                  key={s}
                  style={{
                    border: '1px solid #dee2e6',
                    borderRadius: 6,
                    padding: 12,
                    textAlign: 'center',
                    borderTop: `3px solid ${STATUS_COLORS[s] ?? '#6c757d'}`,
                  }}
                >
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{stats[s] ?? 0}</div>
                  <div style={{ fontSize: 11, color: '#6c757d', fontWeight: 600 }}>{s}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24, fontSize: 12, color: '#6c757d' }}>
              Total: {Object.values(stats).reduce((a: number, b: number) => a + b, 0)} denial cases
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
