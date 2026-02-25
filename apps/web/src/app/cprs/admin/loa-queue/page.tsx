'use client';

/**
 * LOA Work Queue — Phase 89: LOA Engine v1
 *
 * Staff work queue for managing LOA cases with SLA tracking.
 * Filters: status, payer, SLA risk, priority, assignee.
 * Actions: view, generate pack, assign, transition status.
 */

import { useState, useEffect, useCallback } from 'react';
import styles from '@/components/cprs/cprs.module.css';
import { csrfHeaders } from '@/lib/csrf';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type SLARisk = 'on_track' | 'at_risk' | 'overdue' | 'critical';
type Priority = 'routine' | 'urgent' | 'stat';

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...opts,
    headers: { ...csrfHeaders(), ...(opts?.headers || {}) },
  });
  return res.json();
}

export default function LOAQueuePage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [slaBreakdown, setSlaBreakdown] = useState<Record<SLARisk, number>>({
    on_track: 0, at_risk: 0, overdue: 0, critical: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [selectedPack, setSelectedPack] = useState<any>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPayer, setFilterPayer] = useState('');
  const [filterRisk, setFilterRisk] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);
    if (filterPayer) params.set('payerId', filterPayer);
    if (filterRisk) params.set('slaRiskLevel', filterRisk);
    if (filterPriority) params.set('priority', filterPriority);
    if (filterAssignee) params.set('assignedTo', filterAssignee);
    params.set('sortBy', 'slaDeadline');
    params.set('sortDir', 'asc');

    apiFetch(`/rcm/payerops/loa-queue?${params.toString()}`)
      .then(d => {
        setItems(d?.items || []);
        setTotal(d?.total ?? 0);
        setSlaBreakdown(d?.slaBreakdown || { on_track: 0, at_risk: 0, overdue: 0, critical: 0 });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filterStatus, filterPayer, filterRisk, filterPriority, filterAssignee]);

  useEffect(() => { load(); }, [load]);

  const generatePack = async (id: string) => {
    const data = await apiFetch(`/rcm/payerops/loa/${id}/pack`, { method: 'POST' });
    if (data?.ok) setSelectedPack(data.pack);
  };

  const viewDetail = async (id: string) => {
    const data = await apiFetch(`/rcm/payerops/loa/${id}`);
    if (data?.ok) setSelectedCase(data.loaCase);
  };

  const assignLOA = async (id: string, assignedTo: string) => {
    await apiFetch(`/rcm/payerops/loa/${id}/assign`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedTo }),
    });
    load();
    if (selectedCase?.id === id) {
      const data = await apiFetch(`/rcm/payerops/loa/${id}`);
      if (data?.ok) setSelectedCase(data.loaCase);
    }
  };

  const transitionStatus = async (id: string, status: string, reason?: string) => {
    await apiFetch(`/rcm/payerops/loa/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reason }),
    });
    load();
    if (selectedCase?.id === id) {
      const data = await apiFetch(`/rcm/payerops/loa/${id}`);
      if (data?.ok) setSelectedCase(data.loaCase);
    }
  };

  return (
    <div className={styles.cprsPage}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #dee2e6', display: 'flex', alignItems: 'center', gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>LOA Work Queue</h2>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6c757d' }}>Phase 89 -- LOA Engine v1</span>
      </div>

      {/* SLA Summary Bar */}
      <div style={{
        display: 'flex', gap: 16, padding: '10px 24px', borderBottom: '1px solid #dee2e6',
        background: '#f8f9fa', fontSize: 12,
      }}>
        <span>Total Active: <strong>{total}</strong></span>
        <SLABadge risk="on_track" count={slaBreakdown.on_track} onClick={() => setFilterRisk(filterRisk === 'on_track' ? '' : 'on_track')} active={filterRisk === 'on_track'} />
        <SLABadge risk="at_risk" count={slaBreakdown.at_risk} onClick={() => setFilterRisk(filterRisk === 'at_risk' ? '' : 'at_risk')} active={filterRisk === 'at_risk'} />
        <SLABadge risk="critical" count={slaBreakdown.critical} onClick={() => setFilterRisk(filterRisk === 'critical' ? '' : 'critical')} active={filterRisk === 'critical'} />
        <SLABadge risk="overdue" count={slaBreakdown.overdue} onClick={() => setFilterRisk(filterRisk === 'overdue' ? '' : 'overdue')} active={filterRisk === 'overdue'} />
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 8, padding: '8px 24px', borderBottom: '1px solid #dee2e6',
        flexWrap: 'wrap', fontSize: 12,
      }}>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={filterStyle}>
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="pending_submission">Pending Submission</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={filterStyle}>
          <option value="">All Priorities</option>
          <option value="stat">STAT</option>
          <option value="urgent">Urgent</option>
          <option value="routine">Routine</option>
        </select>
        <input
          value={filterPayer}
          onChange={e => setFilterPayer(e.target.value)}
          placeholder="Payer ID"
          style={{ ...filterStyle, width: 120 }}
        />
        <input
          value={filterAssignee}
          onChange={e => setFilterAssignee(e.target.value)}
          placeholder="Assigned To"
          style={{ ...filterStyle, width: 120 }}
        />
        {(filterStatus || filterPayer || filterRisk || filterPriority || filterAssignee) && (
          <button
            onClick={() => { setFilterStatus(''); setFilterPayer(''); setFilterRisk(''); setFilterPriority(''); setFilterAssignee(''); }}
            style={{ padding: '2px 8px', fontSize: 11, cursor: 'pointer', background: '#dc3545', color: '#fff', border: 'none', borderRadius: 3 }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Queue Table */}
      <div style={{ padding: 16, overflow: 'auto', flex: 1 }}>
        {loading ? (
          <p style={{ fontSize: 13, color: '#6c757d' }}>Loading queue...</p>
        ) : items.length === 0 ? (
          <p style={{ fontSize: 13, color: '#6c757d' }}>
            No active LOA cases match the current filters.
          </p>
        ) : (
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>
                <th style={thStyle}>SLA</th>
                <th style={thStyle}>Priority</th>
                <th style={thStyle}>Patient</th>
                <th style={thStyle}>Payer</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Assigned</th>
                <th style={thStyle}>Deadline</th>
                <th style={thStyle}>Age</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c: any) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={tdStyle}><SLAIndicator risk={c.slaRiskLevel} /></td>
                  <td style={tdStyle}><PriorityBadge priority={c.priority} /></td>
                  <td style={tdStyle}>{c.patientDfn}</td>
                  <td style={tdStyle}>{c.payerName}</td>
                  <td style={tdStyle}>{c.requestType?.replace(/_/g, ' ')}</td>
                  <td style={tdStyle}><StatusBadge status={c.status} /></td>
                  <td style={tdStyle}>{c.assignedTo || '--'}</td>
                  <td style={{ ...tdStyle, fontSize: 11 }}>
                    {c.slaDeadline ? formatDeadline(c.slaDeadline) : '--'}
                  </td>
                  <td style={{ ...tdStyle, fontSize: 11 }}>{formatAge(c.createdAt)}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => viewDetail(c.id)} style={btnStyle} title="View Details">
                        View
                      </button>
                      <button onClick={() => generatePack(c.id)} style={btnStyle} title="Generate Pack">
                        Pack
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {selectedCase && (
        <LOADetailModal
          loaCase={selectedCase}
          onClose={() => setSelectedCase(null)}
          onTransition={transitionStatus}
          onGeneratePack={(id) => { generatePack(id); }}
          onAssign={assignLOA}
        />
      )}

      {/* Pack Modal */}
      {selectedPack && (
        <PackModal pack={selectedPack} onClose={() => setSelectedPack(null)} />
      )}
    </div>
  );
}

/* ── LOA Detail Modal ───────────────────────────────────────── */

function LOADetailModal({ loaCase, onClose, onTransition, onGeneratePack, onAssign }: {
  loaCase: any;
  onClose: () => void;
  onTransition: (id: string, status: string, reason?: string) => void;
  onGeneratePack: (id: string) => void;
  onAssign: (id: string, assignedTo: string) => void;
}) {
  const [assignInput, setAssignInput] = useState('');
  const getNextStatuses = (status: string): string[] => {
    const transitions: Record<string, string[]> = {
      draft: ['pending_submission', 'cancelled'],
      pending_submission: ['submitted', 'cancelled'],
      submitted: ['under_review', 'approved', 'partially_approved', 'denied', 'cancelled'],
      under_review: ['approved', 'partially_approved', 'denied'],
    };
    return transitions[status] || [];
  };

  return (
    <div style={overlayStyle}>
      <div style={{ ...modalStyle, maxWidth: 700 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>LOA Case: {loaCase.id.slice(0, 20)}...</h3>
          <button onClick={onClose} style={{ cursor: 'pointer', border: 'none', background: 'none', fontSize: 18 }}>X</button>
        </div>

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, marginBottom: 16 }}>
          <div><strong>Patient DFN:</strong> {loaCase.patientDfn}</div>
          <div><strong>Payer:</strong> {loaCase.payerName}</div>
          <div><strong>Status:</strong> <StatusBadge status={loaCase.status} /></div>
          <div><strong>Priority:</strong> <PriorityBadge priority={loaCase.priority} /></div>
          <div><strong>SLA Risk:</strong> <SLAIndicator risk={loaCase.slaRiskLevel} /></div>
          <div><strong>Deadline:</strong> {loaCase.slaDeadline ? new Date(loaCase.slaDeadline).toLocaleString() : 'Not set'}</div>
          <div><strong>Assigned:</strong> {loaCase.assignedTo || 'Unassigned'}</div>
          <div><strong>Mode:</strong> {loaCase.submissionMode}</div>
          <div><strong>Member ID:</strong> {loaCase.memberId || 'N/A'}</div>
          <div><strong>Plan:</strong> {loaCase.planName || 'N/A'}</div>
          <div><strong>Type:</strong> {loaCase.requestType?.replace(/_/g, ' ')}</div>
          <div><strong>Enrollment:</strong> {loaCase.enrollmentId || 'None'}</div>
        </div>

        {loaCase.urgencyNotes && (
          <div style={{ padding: 8, background: '#fff3cd', borderRadius: 4, marginBottom: 12, fontSize: 12 }}>
            <strong>Urgency:</strong> {loaCase.urgencyNotes}
          </div>
        )}

        {/* Services */}
        {loaCase.requestedServices?.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <h4 style={{ fontSize: 13, margin: '0 0 4px' }}>Requested Services</h4>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
              {loaCase.requestedServices.map((s: any, i: number) => (
                <li key={i}>{s.code}: {s.description}{s.estimatedCost ? ` (Est: ${s.estimatedCost.toLocaleString()})` : ''}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Timeline */}
        <div style={{ marginBottom: 12 }}>
          <h4 style={{ fontSize: 13, margin: '0 0 4px' }}>Timeline ({loaCase.timeline?.length || 0} events)</h4>
          <div style={{ maxHeight: 150, overflow: 'auto', background: '#f8f9fa', borderRadius: 4, padding: 8 }}>
            {(loaCase.timeline || []).slice().reverse().map((t: any, i: number) => (
              <div key={i} style={{ fontSize: 11, marginBottom: 4, borderBottom: '1px solid #dee2e6', paddingBottom: 4 }}>
                <span style={{ color: '#6c757d' }}>{new Date(t.timestamp).toLocaleString()}</span>
                {' '}
                {t.fromStatus && <><StatusBadge status={t.fromStatus} /> {'->'} </>}
                <StatusBadge status={t.toStatus} />
                {t.reason && <span style={{ marginLeft: 8, color: '#495057' }}>{t.reason}</span>}
                <span style={{ marginLeft: 8, color: '#6c757d' }}>by {t.actor}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pack History */}
        {loaCase.packHistory?.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <h4 style={{ fontSize: 13, margin: '0 0 4px' }}>Pack History ({loaCase.packHistory.length})</h4>
            <div style={{ fontSize: 11, color: '#6c757d' }}>
              {loaCase.packHistory.map((p: any, i: number) => (
                <div key={i}>Pack {p.id} -- generated {new Date(p.generatedAt).toLocaleString()} by {p.generatedBy}</div>
              ))}
            </div>
          </div>
        )}

        {/* Assign */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', fontSize: 12 }}>
          <strong>Assign to:</strong>
          <input
            value={assignInput}
            onChange={e => setAssignInput(e.target.value)}
            placeholder={loaCase.assignedTo || 'Staff name'}
            style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #dee2e6', borderRadius: 3, width: 160 }}
          />
          <button
            onClick={() => { if (assignInput.trim()) { onAssign(loaCase.id, assignInput.trim()); setAssignInput(''); } }}
            disabled={!assignInput.trim()}
            style={{ ...btnStyle, padding: '4px 12px', opacity: assignInput.trim() ? 1 : 0.5 }}
          >
            Assign
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <button onClick={() => onGeneratePack(loaCase.id)} style={{ ...btnStyle, padding: '6px 16px' }}>
            Generate Pack
          </button>
          {getNextStatuses(loaCase.status).map(s => (
            <button
              key={s}
              onClick={() => onTransition(loaCase.id, s)}
              style={{
                ...btnStyle,
                padding: '6px 12px',
                background: s === 'approved' ? '#d4edda' : s === 'denied' ? '#f8d7da' : s === 'cancelled' ? '#e9ecef' : '#cce5ff',
              }}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Pack Modal ─────────────────────────────────────────────── */

function PackModal({ pack, onClose }: { pack: any; onClose: () => void }) {
  return (
    <div style={overlayStyle}>
      <div style={{ ...modalStyle, maxWidth: 600, maxHeight: '80vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>{pack.title || 'Submission Pack'}</h3>
          <button onClick={onClose} style={{ cursor: 'pointer', border: 'none', background: 'none', fontSize: 18 }}>X</button>
        </div>

        {pack.slaInfo && (
          <div style={{ fontSize: 12, marginBottom: 12, padding: 8, background: '#f8f9fa', borderRadius: 4 }}>
            <strong>Priority:</strong> {pack.slaInfo.priority?.toUpperCase()} |{' '}
            <strong>Deadline:</strong> {pack.slaInfo.deadline ? new Date(pack.slaInfo.deadline).toLocaleString() : 'N/A'} |{' '}
            <strong>Risk:</strong> <SLAIndicator risk={pack.slaInfo.riskLevel} />
          </div>
        )}

        {pack.sections?.map((s: any, i: number) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <h4 style={{ margin: '0 0 4px', fontSize: 13, color: '#495057' }}>{s.heading}</h4>
            <pre style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap', background: '#f8f9fa', padding: 8, borderRadius: 4 }}>{s.content}</pre>
          </div>
        ))}

        {pack.payerInstructions && (
          <div style={{ marginBottom: 12 }}>
            <h4 style={{ margin: '0 0 4px', fontSize: 13, color: '#495057' }}>Payer Instructions</h4>
            <pre style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap', background: '#fff3cd', padding: 8, borderRadius: 4 }}>
              {pack.payerInstructions}
            </pre>
          </div>
        )}

        <h4 style={{ fontSize: 13, color: '#495057', marginBottom: 4 }}>Checklist</h4>
        <ul style={{ fontSize: 12, paddingLeft: 20 }}>
          {pack.checklist?.map((item: string, i: number) => (
            <li key={i} style={{ marginBottom: 2 }}>{item}</li>
          ))}
        </ul>

        <h4 style={{ fontSize: 13, color: '#495057', marginBottom: 4 }}>Email Template</h4>
        <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap', background: '#f8f9fa', padding: 8, borderRadius: 4 }}>
          Subject: {pack.emailTemplate?.subject}{'\n\n'}{pack.emailTemplate?.body}
        </pre>

        {pack.includedCredentials?.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 11, color: '#6c757d' }}>
            Included credentials: {pack.includedCredentials.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Shared Components ──────────────────────────────────────── */

function SLABadge({ risk, count, onClick, active }: { risk: SLARisk; count: number; onClick: () => void; active: boolean }) {
  const colors: Record<SLARisk, { bg: string; fg: string }> = {
    on_track: { bg: '#d4edda', fg: '#155724' },
    at_risk: { bg: '#fff3cd', fg: '#664d03' },
    critical: { bg: '#f8d7da', fg: '#721c24' },
    overdue: { bg: '#dc3545', fg: '#fff' },
  };
  const c = colors[risk];
  return (
    <button
      onClick={onClick}
      style={{
        padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
        background: c.bg, color: c.fg, border: active ? '2px solid #0d6efd' : '1px solid transparent',
        cursor: 'pointer',
      }}
    >
      {risk.replace(/_/g, ' ')}: {count}
    </button>
  );
}

function SLAIndicator({ risk }: { risk: string }) {
  const colors: Record<string, string> = {
    on_track: '#198754',
    at_risk: '#ffc107',
    critical: '#dc3545',
    overdue: '#dc3545',
  };
  const labels: Record<string, string> = {
    on_track: 'On Track',
    at_risk: 'At Risk',
    critical: 'CRITICAL',
    overdue: 'OVERDUE',
  };
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, color: colors[risk] || '#6c757d',
    }}>
      {risk === 'overdue' ? '\u26A0' : risk === 'critical' ? '\u26A0' : '\u2022'}{' '}
      {labels[risk] || risk}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    stat: { bg: '#dc3545', fg: '#fff' },
    urgent: { bg: '#fd7e14', fg: '#fff' },
    routine: { bg: '#e9ecef', fg: '#495057' },
  };
  const c = colors[priority] || { bg: '#e9ecef', fg: '#495057' };
  return (
    <span style={{
      fontSize: 10, padding: '2px 6px', borderRadius: 3, fontWeight: 600,
      background: c.bg, color: c.fg, textTransform: 'uppercase',
    }}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    draft: { bg: '#e9ecef', fg: '#495057' },
    pending_submission: { bg: '#fff3cd', fg: '#664d03' },
    submitted: { bg: '#cce5ff', fg: '#004085' },
    under_review: { bg: '#d1ecf1', fg: '#0c5460' },
    approved: { bg: '#d4edda', fg: '#155724' },
    partially_approved: { bg: '#fff3cd', fg: '#664d03' },
    denied: { bg: '#f8d7da', fg: '#721c24' },
    cancelled: { bg: '#f8d7da', fg: '#721c24' },
    expired: { bg: '#e9ecef', fg: '#6c757d' },
  };
  const c = colors[status] || { bg: '#e9ecef', fg: '#495057' };
  return (
    <span style={{
      fontSize: 11, padding: '2px 8px', borderRadius: 3, fontWeight: 600,
      background: c.bg, color: c.fg,
    }}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

function formatDeadline(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const hoursLeft = (d.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursLeft < 0) return `${Math.abs(Math.round(hoursLeft))}h overdue`;
  if (hoursLeft < 24) return `${Math.round(hoursLeft)}h left`;
  return `${Math.round(hoursLeft / 24)}d left`;
}

function formatAge(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const hours = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

/* ── Styles ─────────────────────────────────────────────────── */

const filterStyle: React.CSSProperties = {
  padding: '4px 8px', fontSize: 12, border: '1px solid #dee2e6', borderRadius: 3,
};

const thStyle: React.CSSProperties = { padding: '6px 8px' };
const tdStyle: React.CSSProperties = { padding: '6px 8px' };
const btnStyle: React.CSSProperties = {
  fontSize: 11, padding: '2px 8px', cursor: 'pointer', border: '1px solid #dee2e6',
  borderRadius: 3, background: '#fff',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 8, padding: 24, width: '90%',
};
