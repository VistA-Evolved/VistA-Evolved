'use client';

/**
 * Claims Queue -- Phase 91
 *
 * Admin page for the unified claims lifecycle workbench:
 *  - List/filter claim cases by status, payer, priority
 *  - View scrub results and lifecycle badges
 *  - Trigger scrub, transition state, view detail
 *  - Create new claim case
 *
 * Uses /rcm/claims/lifecycle/* endpoints.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { csrfHeaders } from '@/lib/csrf';
import { API_BASE as API } from '@/lib/api-config';

/* -- Types ------------------------------------------------------ */

type LifecycleStatus =
  | 'draft'
  | 'ready_for_scrub'
  | 'scrub_passed'
  | 'scrub_failed'
  | 'ready_for_submission'
  | 'submitted_electronic'
  | 'submitted_portal'
  | 'submitted_manual'
  | 'exported'
  | 'payer_acknowledged'
  | 'paid_full'
  | 'paid_partial'
  | 'denied'
  | 'returned_to_provider'
  | 'appeal_in_progress'
  | 'closed'
  | 'cancelled';

interface ClaimCase {
  id: string;
  lifecycleStatus: LifecycleStatus;
  patientDfn: string;
  patientName?: string;
  payerId: string;
  payerName?: string;
  claimType: string;
  dateOfService: string;
  totalCharge: number;
  priority: string;
  lastScrubResult?: {
    outcome: string;
    findings: Array<{ ruleId: string; severity: string; message: string; field?: string }>;
    rulesEvaluated: number;
  };
  denials: Array<{
    id: string;
    reasonCode: string;
    reasonDescription: string;
    resolvedAt?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  totalDenials: number;
  unresolvedDenials: number;
  avgScrubScore: number;
}

/* -- Status Colors ---------------------------------------------- */

const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280',
  ready_for_scrub: '#8b5cf6',
  scrub_passed: '#10b981',
  scrub_failed: '#ef4444',
  ready_for_submission: '#2563eb',
  submitted_electronic: '#0891b2',
  submitted_portal: '#0891b2',
  submitted_manual: '#0891b2',
  exported: '#f59e0b',
  payer_acknowledged: '#6366f1',
  paid_full: '#059669',
  paid_partial: '#d97706',
  denied: '#dc2626',
  returned_to_provider: '#f97316',
  appeal_in_progress: '#7c3aed',
  closed: '#374151',
  cancelled: '#9ca3af',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#6b7280',
};

/* -- Component -------------------------------------------------- */

export default function ClaimsQueuePage() {
  const [claims, setClaims] = useState<ClaimCase[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const limit = 25;

  // Detail view
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ClaimCase | null>(null);
  const [scrubbing, setScrubbing] = useState(false);

  // Create form
  const [showCreate, setShowCreate] = useState(false);

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      params.set('limit', String(limit));
      params.set('offset', String(page * limit));

      const res = await fetch(`${API}/rcm/claims/lifecycle?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setClaims(data.items || []);
        setTotal(data.total || 0);
      } else {
        setError(data.error || 'Failed to load claims');
      }
    } catch (e: any) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, page]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/rcm/claims/lifecycle/stats`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setStats(data.stats);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const fetchDetail = async (id: string) => {
    setSelectedId(id);
    try {
      const res = await fetch(`${API}/rcm/claims/lifecycle/${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setDetail(data.claimCase);
    } catch {
      /* ignore */
    }
  };

  const runScrub = async (id: string) => {
    setScrubbing(true);
    try {
      const res = await fetch(`${API}/rcm/claims/lifecycle/${id}/scrub`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.ok && data.claimCase) {
        setDetail(data.claimCase);
        fetchClaims();
        fetchStats();
      }
    } catch {
      /* ignore */
    } finally {
      setScrubbing(false);
    }
  };

  const transitionClaim = async (id: string, toStatus: string) => {
    try {
      const res = await fetch(`${API}/rcm/claims/lifecycle/${id}/transition`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ toStatus }),
      });
      const data = await res.json();
      if (data.ok && data.claimCase) {
        setDetail(data.claimCase);
        fetchClaims();
        fetchStats();
      } else {
        alert(data.error || 'Transition failed');
      }
    } catch (e: any) {
      alert(e.message || 'Network error');
    }
  };

  const createClaim = async (formData: Record<string, any>) => {
    try {
      const res = await fetch(`${API}/rcm/claims/lifecycle`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.ok) {
        setShowCreate(false);
        fetchClaims();
        fetchStats();
      } else {
        alert(data.error || 'Create failed');
      }
    } catch (e: any) {
      alert(e.message || 'Network error');
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
      cents / 100
    );
  };

  /* -- Render ------------------------------------------------ */

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Claims Queue</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            padding: '6px 16px',
            fontSize: 13,
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          + New Claim
        </button>
      </div>

      {/* Stats Banner */}
      {stats && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <StatCard label="Total Claims" value={stats.total} />
          <StatCard
            label="Unresolved Denials"
            value={stats.unresolvedDenials}
            color={stats.unresolvedDenials > 0 ? '#dc2626' : undefined}
          />
          <StatCard
            label="Scrub Pass Rate"
            value={`${stats.avgScrubScore}%`}
            color={stats.avgScrubScore >= 80 ? '#059669' : '#f59e0b'}
          />
          <StatCard label="Total Denials" value={stats.totalDenials} />
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4 }}
        >
          <option value="">All Statuses</option>
          {Object.keys(STATUS_COLORS).map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value);
            setPage(0);
          }}
          style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4 }}
        >
          <option value="">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button
          onClick={() => {
            fetchClaims();
            fetchStats();
          }}
          style={{
            padding: '4px 12px',
            fontSize: 12,
            border: '1px solid #d1d5db',
            borderRadius: 4,
            cursor: 'pointer',
            background: '#f9fafb',
          }}
        >
          Refresh
        </button>
      </div>

      {error && <div style={{ color: '#dc2626', marginBottom: 8, fontSize: 13 }}>{error}</div>}

      {/* Create Form */}
      {showCreate && <CreateForm onSubmit={createClaim} onCancel={() => setShowCreate(false)} />}

      {/* Claims Table */}
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
              Loading...
            </div>
          ) : error ? null : claims.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
              No claims found. Create one to get started.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px' }}>Patient</th>
                  <th style={{ padding: '6px 8px' }}>Payer</th>
                  <th style={{ padding: '6px 8px' }}>Status</th>
                  <th style={{ padding: '6px 8px' }}>Scrub</th>
                  <th style={{ padding: '6px 8px' }}>Priority</th>
                  <th style={{ padding: '6px 8px' }}>Amount</th>
                  <th style={{ padding: '6px 8px' }}>Updated</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => fetchDetail(c.id)}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer',
                      background: selectedId === c.id ? '#eff6ff' : undefined,
                    }}
                  >
                    <td style={{ padding: '6px 8px' }}>
                      <div style={{ fontWeight: 500 }}>
                        {c.patientName || `DFN: ${c.patientDfn}`}
                      </div>
                      <div style={{ color: '#6b7280', fontSize: 11 }}>{c.claimType}</div>
                    </td>
                    <td style={{ padding: '6px 8px' }}>{c.payerName || c.payerId}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <StatusBadge status={c.lifecycleStatus} />
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      {c.lastScrubResult ? (
                        <ScrubBadge
                          outcome={c.lastScrubResult.outcome}
                          findings={c.lastScrubResult.findings.length}
                        />
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: 11 }}>Not run</span>
                      )}
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <span
                        style={{
                          color: PRIORITY_COLORS[c.priority] || '#6b7280',
                          fontWeight: 500,
                          fontSize: 11,
                          textTransform: 'uppercase',
                        }}
                      >
                        {c.priority}
                      </span>
                    </td>
                    <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>
                      {formatCurrency(c.totalCharge)}
                    </td>
                    <td style={{ padding: '6px 8px', color: '#6b7280', fontSize: 11 }}>
                      {new Date(c.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {total > limit && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'center' }}>
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                style={{
                  padding: '4px 12px',
                  fontSize: 12,
                  border: '1px solid #d1d5db',
                  borderRadius: 4,
                  cursor: page === 0 ? 'default' : 'pointer',
                }}
              >
                Prev
              </button>
              <span style={{ fontSize: 12, lineHeight: '28px', color: '#6b7280' }}>
                Page {page + 1} of {Math.ceil(total / limit)}
              </span>
              <button
                disabled={(page + 1) * limit >= total}
                onClick={() => setPage((p) => p + 1)}
                style={{
                  padding: '4px 12px',
                  fontSize: 12,
                  border: '1px solid #d1d5db',
                  borderRadius: 4,
                  cursor: (page + 1) * limit >= total ? 'default' : 'pointer',
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {detail && (
          <div
            style={{ width: 380, minWidth: 380, borderLeft: '1px solid #e5e7eb', paddingLeft: 16 }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Claim Detail</h2>
              <button
                onClick={() => {
                  setDetail(null);
                  setSelectedId(null);
                }}
                style={{
                  fontSize: 11,
                  color: '#6b7280',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>

            <div style={{ fontSize: 12, lineHeight: 1.6 }}>
              <div>
                <strong>ID:</strong>{' '}
                <span style={{ fontFamily: 'monospace', fontSize: 10 }}>
                  {detail.id.slice(0, 8)}...
                </span>
              </div>
              <div>
                <strong>Status:</strong> <StatusBadge status={detail.lifecycleStatus} />
              </div>
              <div>
                <strong>Patient:</strong> {detail.patientName || `DFN: ${detail.patientDfn}`}
              </div>
              <div>
                <strong>Payer:</strong> {detail.payerName || detail.payerId}
              </div>
              <div>
                <strong>Type:</strong> {detail.claimType}
              </div>
              <div>
                <strong>DOS:</strong> {detail.dateOfService}
              </div>
              <div>
                <strong>Total:</strong> {formatCurrency(detail.totalCharge)}
              </div>
              <div>
                <strong>Priority:</strong> {detail.priority}
              </div>
            </div>

            {/* Scrub Result */}
            {detail.lastScrubResult && (
              <div
                style={{
                  marginTop: 12,
                  padding: 8,
                  background: '#f9fafb',
                  borderRadius: 4,
                  fontSize: 11,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  Last Scrub:{' '}
                  <ScrubBadge
                    outcome={detail.lastScrubResult.outcome}
                    findings={detail.lastScrubResult.findings.length}
                  />
                </div>
                {detail.lastScrubResult.findings.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '2px 0',
                      color:
                        f.severity === 'error'
                          ? '#dc2626'
                          : f.severity === 'warning'
                            ? '#d97706'
                            : '#6b7280',
                    }}
                  >
                    [{f.severity}] {f.message}{' '}
                    {f.field && <span style={{ color: '#9ca3af' }}>({f.field})</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Denials */}
            {detail.denials.length > 0 && (
              <div
                style={{
                  marginTop: 12,
                  padding: 8,
                  background: '#fef2f2',
                  borderRadius: 4,
                  fontSize: 11,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4, color: '#dc2626' }}>
                  Denials ({detail.denials.length})
                </div>
                {detail.denials.map((d, i) => (
                  <div key={i} style={{ padding: '2px 0' }}>
                    <strong>{d.reasonCode}</strong>: {d.reasonDescription}
                    {d.resolvedAt && <span style={{ color: '#059669' }}> (resolved)</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {['draft', 'ready_for_scrub', 'scrub_failed', 'scrub_passed'].includes(
                detail.lifecycleStatus
              ) && (
                <ActionBtn
                  label={scrubbing ? 'Scrubbing...' : 'Run Scrub'}
                  onClick={() => runScrub(detail.id)}
                  disabled={scrubbing}
                  color="#8b5cf6"
                />
              )}
              {detail.lifecycleStatus === 'draft' && (
                <ActionBtn
                  label="Ready for Scrub"
                  onClick={() => transitionClaim(detail.id, 'ready_for_scrub')}
                  color="#2563eb"
                />
              )}
              {detail.lifecycleStatus === 'scrub_passed' && (
                <ActionBtn
                  label="Ready to Submit"
                  onClick={() => transitionClaim(detail.id, 'ready_for_submission')}
                  color="#059669"
                />
              )}
              {detail.lifecycleStatus === 'scrub_failed' && (
                <ActionBtn
                  label="Back to Draft"
                  onClick={() => transitionClaim(detail.id, 'draft')}
                  color="#6b7280"
                />
              )}
              {detail.lifecycleStatus === 'ready_for_submission' && (
                <>
                  <ActionBtn
                    label="Export"
                    onClick={() => transitionClaim(detail.id, 'exported')}
                    color="#f59e0b"
                  />
                  <ActionBtn
                    label="Submit Electronic"
                    onClick={() => transitionClaim(detail.id, 'submitted_electronic')}
                    color="#0891b2"
                  />
                </>
              )}
              {!['closed', 'cancelled'].includes(detail.lifecycleStatus) && (
                <ActionBtn
                  label="Cancel"
                  onClick={() => transitionClaim(detail.id, 'cancelled')}
                  color="#ef4444"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* -- Sub-Components ------------------------------------------ */

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div
      style={{
        padding: '8px 16px',
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: 6,
        minWidth: 120,
      }}
    >
      <div style={{ fontSize: 11, color: '#6b7280' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || '#1f2937' }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 6px',
        fontSize: 10,
        fontWeight: 600,
        borderRadius: 3,
        color: '#fff',
        background: STATUS_COLORS[status] || '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
      }}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function ScrubBadge({ outcome, findings }: { outcome: string; findings: number }) {
  const colors: Record<string, string> = { pass: '#059669', warn: '#d97706', fail: '#dc2626' };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 6px',
        fontSize: 10,
        fontWeight: 600,
        borderRadius: 3,
        color: '#fff',
        background: colors[outcome] || '#6b7280',
      }}
    >
      {outcome.toUpperCase()} ({findings})
    </span>
  );
}

function ActionBtn({
  label,
  onClick,
  disabled,
  color,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '3px 10px',
        fontSize: 11,
        fontWeight: 500,
        border: `1px solid ${color}`,
        borderRadius: 3,
        color,
        background: '#fff',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );
}

function CreateForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (d: Record<string, any>) => void;
  onCancel: () => void;
}) {
  const [patientDfn, setPatientDfn] = useState('');
  const [payerId, setPayerId] = useState('');
  const [payerName, setPayerName] = useState('');
  const [dateOfService, setDateOfService] = useState('');
  const [claimType, setClaimType] = useState('professional');
  const [priority, setPriority] = useState('medium');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      patientDfn,
      payerId,
      payerName,
      dateOfService,
      claimType,
      priority,
      isDemo: true,
      isMock: true,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        marginBottom: 16,
        padding: 12,
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: 6,
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8 }}>New Claim Case</div>
      <div
        style={{
          marginBottom: 10,
          padding: '8px 10px',
          background: '#fff7ed',
          border: '1px solid #fdba74',
          borderRadius: 6,
          color: '#9a3412',
        }}
      >
        Claims created from this form are demo/mock claim cases for queue testing. They are not live
        payer submissions.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <label>
          Patient DFN
          <br />
          <input
            value={patientDfn}
            onChange={(e) => setPatientDfn(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '4px 6px',
              border: '1px solid #d1d5db',
              borderRadius: 3,
              fontSize: 12,
            }}
          />
        </label>
        <label>
          Payer ID
          <br />
          <input
            value={payerId}
            onChange={(e) => setPayerId(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '4px 6px',
              border: '1px solid #d1d5db',
              borderRadius: 3,
              fontSize: 12,
            }}
          />
        </label>
        <label>
          Payer Name
          <br />
          <input
            value={payerName}
            onChange={(e) => setPayerName(e.target.value)}
            style={{
              width: '100%',
              padding: '4px 6px',
              border: '1px solid #d1d5db',
              borderRadius: 3,
              fontSize: 12,
            }}
          />
        </label>
        <label>
          Date of Service
          <br />
          <input
            type="date"
            value={dateOfService}
            onChange={(e) => setDateOfService(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '4px 6px',
              border: '1px solid #d1d5db',
              borderRadius: 3,
              fontSize: 12,
            }}
          />
        </label>
        <label>
          Claim Type
          <br />
          <select
            value={claimType}
            onChange={(e) => setClaimType(e.target.value)}
            style={{
              width: '100%',
              padding: '4px 6px',
              border: '1px solid #d1d5db',
              borderRadius: 3,
              fontSize: 12,
            }}
          >
            <option value="professional">Professional</option>
            <option value="institutional">Institutional</option>
            <option value="dental">Dental</option>
            <option value="pharmacy">Pharmacy</option>
          </select>
        </label>
        <label>
          Priority
          <br />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            style={{
              width: '100%',
              padding: '4px 6px',
              border: '1px solid #d1d5db',
              borderRadius: 3,
              fontSize: 12,
            }}
          >
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
      </div>
      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <button
          type="submit"
          style={{
            padding: '4px 16px',
            fontSize: 12,
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 3,
            cursor: 'pointer',
          }}
        >
          Create
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '4px 16px',
            fontSize: 12,
            border: '1px solid #d1d5db',
            borderRadius: 3,
            cursor: 'pointer',
            background: '#fff',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
