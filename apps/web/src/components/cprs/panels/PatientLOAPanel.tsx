'use client';

/**
 * PatientLOAPanel — Phase 89: LOA Engine v1
 *
 * Reusable component that shows LOA cases for a specific patient DFN.
 * Can be embedded in any clinical chart context (CPRS sidebar, patient
 * record, clinical dashboard).
 *
 * Props:
 *   - patientDfn: string — VistA patient DFN to filter LOA cases
 *   - compact?: boolean — compact mode for sidebar embedding
 */

import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/api-config';

async function apiFetch(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  return res.json();
}

interface PatientLOAPanelProps {
  patientDfn: string;
  compact?: boolean;
}

export default function PatientLOAPanel({ patientDfn, compact }: PatientLOAPanelProps) {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!patientDfn) return;
    setLoading(true);
    apiFetch(`/rcm/payerops/loa?patientDfn=${encodeURIComponent(patientDfn)}`)
      .then((d) => setCases(d?.loaCases || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientDfn]);

  useEffect(() => {
    load();
  }, [load]);

  if (!patientDfn) {
    return <div style={{ fontSize: 12, color: '#6c757d', padding: 8 }}>No patient selected</div>;
  }

  const activeCases = cases.filter(
    (c) => !['approved', 'denied', 'expired', 'cancelled', 'partially_approved'].includes(c.status)
  );
  const resolvedCases = cases.filter((c) =>
    ['approved', 'denied', 'expired', 'cancelled', 'partially_approved'].includes(c.status)
  );

  return (
    <div style={{ fontSize: 12 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: compact ? '4px 8px' : '8px 12px',
          borderBottom: '1px solid #dee2e6',
          background: '#f8f9fa',
        }}
      >
        <strong style={{ fontSize: compact ? 12 : 13 }}>LOA Cases</strong>
        <span style={{ fontSize: 11, color: '#6c757d' }}>
          {activeCases.length} active / {cases.length} total
        </span>
      </div>

      {loading ? (
        <div style={{ padding: 8, color: '#6c757d' }}>Loading...</div>
      ) : cases.length === 0 ? (
        <div style={{ padding: 8, color: '#6c757d' }}>No LOA cases for this patient.</div>
      ) : (
        <>
          {/* Active Cases */}
          {activeCases.length > 0 && (
            <div>
              {!compact && (
                <div
                  style={{
                    padding: '4px 12px',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#495057',
                    background: '#e9ecef',
                  }}
                >
                  Active
                </div>
              )}
              {activeCases.map((c) => (
                <LOACaseRow
                  key={c.id}
                  loaCase={c}
                  compact={compact}
                  expanded={expanded === c.id}
                  onToggle={() => setExpanded(expanded === c.id ? null : c.id)}
                />
              ))}
            </div>
          )}

          {/* Resolved Cases */}
          {resolvedCases.length > 0 && !compact && (
            <div>
              <div
                style={{
                  padding: '4px 12px',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#6c757d',
                  background: '#e9ecef',
                }}
              >
                Resolved
              </div>
              {resolvedCases.slice(0, 5).map((c) => (
                <LOACaseRow
                  key={c.id}
                  loaCase={c}
                  compact={compact}
                  expanded={expanded === c.id}
                  onToggle={() => setExpanded(expanded === c.id ? null : c.id)}
                />
              ))}
              {resolvedCases.length > 5 && (
                <div style={{ padding: '4px 12px', fontSize: 11, color: '#6c757d' }}>
                  + {resolvedCases.length - 5} more resolved cases
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── LOA Case Row ───────────────────────────────────────────── */

function LOACaseRow({
  loaCase,
  compact,
  expanded,
  onToggle,
}: {
  loaCase: any;
  compact?: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const riskColor: Record<string, string> = {
    on_track: '#198754',
    at_risk: '#ffc107',
    critical: '#dc3545',
    overdue: '#dc3545',
  };

  const statusColors: Record<string, { bg: string; fg: string }> = {
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

  const sc = statusColors[loaCase.status] || { bg: '#e9ecef', fg: '#495057' };

  return (
    <div style={{ borderBottom: '1px solid #f0f0f0' }}>
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: compact ? '4px 8px' : '6px 12px',
          cursor: 'pointer',
        }}
      >
        {/* SLA dot */}
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            flexShrink: 0,
            background: riskColor[loaCase.slaRiskLevel] || '#6c757d',
          }}
        />

        {/* Payer + Type */}
        <span
          style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {loaCase.payerName} -- {loaCase.requestType?.replace(/_/g, ' ')}
        </span>

        {/* Status badge */}
        <span
          style={{
            fontSize: 10,
            padding: '1px 6px',
            borderRadius: 3,
            fontWeight: 600,
            background: sc.bg,
            color: sc.fg,
            flexShrink: 0,
          }}
        >
          {loaCase.status?.replace(/_/g, ' ')}
        </span>

        {/* Priority */}
        {loaCase.priority !== 'routine' && (
          <span
            style={{
              fontSize: 10,
              padding: '1px 4px',
              borderRadius: 2,
              fontWeight: 600,
              background: loaCase.priority === 'stat' ? '#dc3545' : '#fd7e14',
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {loaCase.priority?.toUpperCase()}
          </span>
        )}
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div style={{ padding: '4px 12px 8px 28px', fontSize: 11, color: '#495057' }}>
          <div>
            ID: <span style={{ fontFamily: 'monospace' }}>{loaCase.id}</span>
          </div>
          <div>
            Member: {loaCase.memberId || 'N/A'} | Plan: {loaCase.planName || 'N/A'}
          </div>
          {loaCase.slaDeadline && (
            <div>Deadline: {new Date(loaCase.slaDeadline).toLocaleString()}</div>
          )}
          {loaCase.assignedTo && <div>Assigned: {loaCase.assignedTo}</div>}
          {loaCase.urgencyNotes && (
            <div style={{ color: '#856404' }}>Urgency: {loaCase.urgencyNotes}</div>
          )}
          {loaCase.payerRefNumber && <div>Payer Ref: {loaCase.payerRefNumber}</div>}
          {loaCase.approvedAmount !== undefined && loaCase.approvedAmount !== null && (
            <div>Approved: {loaCase.approvedAmount.toLocaleString()}</div>
          )}
          {loaCase.denialReason && (
            <div style={{ color: '#721c24' }}>Denial: {loaCase.denialReason}</div>
          )}
          <div style={{ marginTop: 4, color: '#6c757d' }}>
            Created: {new Date(loaCase.createdAt).toLocaleString()} by {loaCase.createdBy}
          </div>
          {loaCase.packHistory?.length > 0 && (
            <div style={{ color: '#6c757d' }}>Packs generated: {loaCase.packHistory.length}</div>
          )}
        </div>
      )}
    </div>
  );
}
