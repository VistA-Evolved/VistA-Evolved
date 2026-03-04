'use client';

/**
 * Capability Matrix Admin — Phase 88: Evidence-backed integration matrix
 *
 * Grid: payer rows x capability columns (Eligibility, LOA, Claims Submit, Claim Status, Remittance)
 * Cell shows mode + maturity badge + evidence link count.
 * Clicking cell opens an editor drawer for mode/maturity/evidence/notes.
 *
 * Accessible at /cprs/admin/capability-matrix. Requires session + RCM module enabled.
 */

import { useState, useEffect } from 'react';
import styles from '@/components/cprs/cprs.module.css';
import { csrfHeaders } from '@/lib/csrf';
import { API_BASE } from '@/lib/api-config';

const CAPABILITY_LABELS: Record<string, string> = {
  eligibility: 'Eligibility',
  loa: 'LOA',
  claims_submit: 'Claims Submit',
  claim_status: 'Claim Status',
  remittance: 'Remittance',
};

const CAPABILITY_TYPES = ['eligibility', 'loa', 'claims_submit', 'claim_status', 'remittance'];
const MODES = ['manual', 'portal', 'api', 'rpa_planned'];
const MATURITIES = ['none', 'planned', 'in_progress', 'active'];

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...opts,
    headers: { ...csrfHeaders(), ...(opts?.headers || {}) },
  });
  return res.json();
}

interface CellData {
  mode: string;
  maturity: string;
  evidenceCount: number;
  hasOperationalNotes: boolean;
}

interface MatrixRow {
  payerId: string;
  payerName: string;
  capabilities: Record<string, CellData | null>;
}

interface SelectedCell {
  payerId: string;
  payerName: string;
  capability: string;
}

export default function CapabilityMatrixPage() {
  const [matrix, setMatrix] = useState<MatrixRow[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SelectedCell | null>(null);

  const load = () => {
    setLoading(true);
    apiFetch('/rcm/payerops/capability-matrix')
      .then((d) => {
        setMatrix(d?.matrix || []);
        setStats(d?.stats);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className={styles.panelRoot ?? ''} style={{ padding: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Capability Matrix</h2>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6c757d' }}>
          Phase 88 -- Evidence-backed integration matrix. No &#34;active&#34; without evidence.
          {stats ? ` ${stats.totalCells} cells, ${stats.activeWithEvidence} active+proven.` : ''}
        </p>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: '#6c757d' }}>Loading matrix...</p>
      ) : matrix.length === 0 ? (
        <div
          style={{
            padding: 16,
            background: '#f8f9fa',
            borderRadius: 4,
            fontSize: 13,
            color: '#6c757d',
          }}
        >
          No capability data yet. Run ingestion from Payer Directory first, then configure
          capabilities here.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                <th
                  style={{
                    padding: '8px',
                    textAlign: 'left',
                    minWidth: 200,
                    position: 'sticky',
                    left: 0,
                    background: '#fff',
                  }}
                >
                  Payer
                </th>
                {CAPABILITY_TYPES.map((ct) => (
                  <th key={ct} style={{ padding: '8px', textAlign: 'center', minWidth: 120 }}>
                    {CAPABILITY_LABELS[ct]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={row.payerId} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td
                    style={{
                      padding: '8px',
                      fontWeight: 500,
                      position: 'sticky',
                      left: 0,
                      background: '#fff',
                      borderRight: '1px solid #dee2e6',
                    }}
                  >
                    {row.payerName}
                  </td>
                  {CAPABILITY_TYPES.map((ct) => {
                    const cell = row.capabilities[ct];
                    return (
                      <td
                        key={ct}
                        onClick={() =>
                          setSelected({
                            payerId: row.payerId,
                            payerName: row.payerName,
                            capability: ct,
                          })
                        }
                        style={{
                          padding: '6px 8px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          background: cellBackground(cell),
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.outline = '2px solid #0d6efd')}
                        onMouseLeave={(e) => (e.currentTarget.style.outline = 'none')}
                      >
                        {cell ? (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600 }}>{cell.mode}</div>
                            <MaturityBadge maturity={cell.maturity} />
                            {cell.evidenceCount > 0 && (
                              <div style={{ fontSize: 10, color: '#495057', marginTop: 2 }}>
                                {cell.evidenceCount} evidence
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: '#adb5bd' }}>--</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div style={{ marginTop: 16, padding: 12, background: '#f8f9fa', borderRadius: 4 }}>
        <strong style={{ fontSize: 12 }}>Legend:</strong>
        <div style={{ display: 'flex', gap: 16, marginTop: 4, fontSize: 11, flexWrap: 'wrap' }}>
          <span>
            <MaturityBadge maturity="none" /> Not configured
          </span>
          <span>
            <MaturityBadge maturity="planned" /> Planned
          </span>
          <span>
            <MaturityBadge maturity="in_progress" /> In Progress
          </span>
          <span>
            <MaturityBadge maturity="active" /> Active (requires evidence)
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 4, fontSize: 11 }}>
          <span>
            Modes: <strong>manual</strong> | <strong>portal</strong> | <strong>api</strong> |{' '}
            <strong>rpa_planned</strong>
          </span>
        </div>
      </div>

      {/* Cell Editor Drawer */}
      {selected && (
        <CellEditor
          cell={selected}
          onClose={() => {
            setSelected(null);
            load();
          }}
        />
      )}
    </div>
  );
}

/* ── Cell Editor Drawer ──────────────────────────────────────── */

function CellEditor({ cell, onClose }: { cell: SelectedCell; onClose: () => void }) {
  const [detail, setDetail] = useState<any>(null);
  const [mode, setMode] = useState('manual');
  const [maturity, setMaturity] = useState('none');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [evidenceType, setEvidenceType] = useState<'url' | 'internal_note' | 'runbook_ref'>('url');
  const [evidenceValue, setEvidenceValue] = useState('');

  useEffect(() => {
    apiFetch(`/rcm/payerops/capability-matrix/${cell.payerId}`)
      .then((d) => {
        const cap = d?.capabilities?.find((c: any) => c.capability === cell.capability);
        if (cap) {
          setDetail(cap);
          setMode(cap.mode);
          setMaturity(cap.maturity);
          setNotes(cap.operationalNotes || '');
        }
      })
      .catch(() => {});
  }, [cell.payerId, cell.capability]);

  const save = async () => {
    setError('');
    const res = await apiFetch(`/rcm/payerops/capability-matrix/${cell.payerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        capability: cell.capability,
        mode,
        maturity,
        operationalNotes: notes,
        payerName: cell.payerName,
      }),
    });
    if (!res.ok) {
      setError(res.error || 'Failed to save');
    } else {
      setDetail(res.capability);
    }
  };

  const addEv = async () => {
    if (!evidenceValue.trim()) return;
    setError('');
    const res = await apiFetch(`/rcm/payerops/capability-matrix/${cell.payerId}/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        capability: cell.capability,
        type: evidenceType,
        value: evidenceValue.trim(),
      }),
    });
    if (res.ok) {
      setDetail(res.capability);
      setEvidenceValue('');
    } else {
      setError(res.error || 'Failed to add evidence');
    }
  };

  const removeEv = async (evidenceId: string) => {
    const cap = encodeURIComponent(cell.capability);
    const res = await apiFetch(
      `/rcm/payerops/capability-matrix/${cell.payerId}/evidence/${evidenceId}?capability=${cap}`,
      { method: 'DELETE' }
    );
    if (res.ok) setDetail(res.capability);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 420,
        background: '#fff',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
        zIndex: 1000,
        overflow: 'auto',
        padding: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 15 }}>
          {cell.payerName} -- {CAPABILITY_LABELS[cell.capability]}
        </h3>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}
        >
          X
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: 8,
            background: '#f8d7da',
            borderRadius: 4,
            marginBottom: 12,
            fontSize: 12,
            color: '#721c24',
          }}
        >
          {error}
        </div>
      )}

      {/* Mode + Maturity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <label style={{ fontSize: 12 }}>
          Mode
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            style={{ width: '100%', padding: 4, fontSize: 12, marginTop: 4 }}
          >
            {MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: 12 }}>
          Maturity
          <select
            value={maturity}
            onChange={(e) => setMaturity(e.target.value)}
            style={{ width: '100%', padding: 4, fontSize: 12, marginTop: 4 }}
          >
            {MATURITIES.map((m) => (
              <option key={m} value={m}>
                {m.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Operational Notes */}
      <label style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>
        Operational Notes (timeouts, business hours, known denial triggers)
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          style={{ width: '100%', padding: 6, fontSize: 12, marginTop: 4, fontFamily: 'inherit' }}
          placeholder="e.g., Portal available Mon-Fri 8am-5pm PHT. Claim review takes 5-7 business days."
        />
      </label>

      <button
        onClick={save}
        style={{
          padding: '6px 20px',
          fontSize: 12,
          cursor: 'pointer',
          background: '#0d6efd',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          marginBottom: 20,
        }}
      >
        Save Mode/Maturity
      </button>

      {/* Evidence Section */}
      <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>
        Evidence ({detail?.evidence?.length ?? 0})
        {maturity === 'active' && (detail?.evidence?.length ?? 0) === 0 && (
          <span style={{ color: '#dc3545', fontWeight: 400, marginLeft: 8 }}>
            Required for "active" maturity
          </span>
        )}
      </h4>

      {detail?.evidence?.length > 0 && (
        <ul style={{ margin: '0 0 12px', paddingLeft: 16, fontSize: 12 }}>
          {detail.evidence.map((ev: any) => (
            <li key={ev.id} style={{ marginBottom: 6 }}>
              <span
                style={{
                  fontSize: 10,
                  padding: '1px 4px',
                  background: '#e9ecef',
                  borderRadius: 2,
                  marginRight: 4,
                }}
              >
                {ev.type}
              </span>
              {ev.type === 'url' ? (
                <a
                  href={ev.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0d6efd', textDecoration: 'none' }}
                >
                  {ev.value.length > 60 ? ev.value.slice(0, 60) + '...' : ev.value}
                </a>
              ) : (
                <span>{ev.value}</span>
              )}
              <button
                onClick={() => removeEv(ev.id)}
                style={{
                  marginLeft: 8,
                  fontSize: 10,
                  cursor: 'pointer',
                  color: '#dc3545',
                  background: 'none',
                  border: 'none',
                }}
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <select
          value={evidenceType}
          onChange={(e) => setEvidenceType(e.target.value as any)}
          style={{ fontSize: 11, padding: 4 }}
        >
          <option value="url">URL</option>
          <option value="internal_note">Internal Note</option>
          <option value="runbook_ref">Runbook Ref</option>
        </select>
        <input
          value={evidenceValue}
          onChange={(e) => setEvidenceValue(e.target.value)}
          placeholder={evidenceType === 'url' ? 'https://...' : 'Note or reference path'}
          style={{ flex: 1, fontSize: 12, padding: 4 }}
        />
        <button onClick={addEv} style={{ fontSize: 11, padding: '4px 12px', cursor: 'pointer' }}>
          Add
        </button>
      </div>

      <div style={{ marginTop: 16, padding: 12, background: '#f8f9fa', borderRadius: 4 }}>
        <p style={{ margin: 0, fontSize: 11, color: '#6c757d' }}>
          <strong>Evidence enforcement rule:</strong> Setting maturity to "active" requires at least
          one evidence link. Removing the last evidence auto-demotes maturity to "in_progress".
        </p>
      </div>
    </div>
  );
}

/* ── Shared Components ──────────────────────────────────────── */

function MaturityBadge({ maturity }: { maturity: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    none: { bg: '#e9ecef', fg: '#6c757d' },
    planned: { bg: '#fff3cd', fg: '#664d03' },
    in_progress: { bg: '#cce5ff', fg: '#004085' },
    active: { bg: '#d4edda', fg: '#155724' },
  };
  const c = colors[maturity] || colors.none;
  return (
    <span
      style={{
        fontSize: 10,
        padding: '1px 6px',
        borderRadius: 3,
        fontWeight: 600,
        background: c.bg,
        color: c.fg,
      }}
    >
      {maturity?.replace(/_/g, ' ')}
    </span>
  );
}

function cellBackground(cell: CellData | null): string {
  if (!cell) return '#f8f9fa';
  switch (cell.maturity) {
    case 'active':
      return cell.evidenceCount > 0 ? '#d4edda' : '#fff3cd';
    case 'in_progress':
      return '#e7f5ff';
    case 'planned':
      return '#fffcf0';
    default:
      return '#f8f9fa';
  }
}
