'use client';

/**
 * PhilHealth eClaims 3.0 -- Operational Submission Page
 *
 * Phase 96: Encounter selection -> build packet -> export bundle -> submission tracking.
 *
 * Tabs:
 *   1. Build & Export -- Select claim draft, build packet, generate exports
 *   2. Submissions -- Track honest status: Draft->Exported->Submitted(manual)->Accepted/Denied
 *   3. Denials -- View and record denial reasons
 *   4. Spec Gates -- eClaims 3.0 spec acquisition progress
 */

import React, { useState, useEffect, useCallback } from 'react';
import { csrfHeaders } from '@/lib/csrf';
import { API_BASE as API } from '@/lib/api-config';

/* -- Types ---------------------------------------------------- */

interface ClaimDraft {
  id: string;
  patientLastName: string;
  patientFirstName: string;
  admissionDate: string;
  patientType: 'O' | 'I';
  status: string;
  philhealthPin: string;
}

interface ClaimPacket {
  packetId: string;
  eclaimsVersion: string;
  sourceClaimDraftId: string;
  patient: { lastName: string; firstName: string; philhealthPin: string };
  facility: { facilityCode: string; facilityName: string };
  patientType: string;
  admissionDate: string;
  totals: {
    totalCharges: number;
    totalPhicCoverage: number;
    totalPatientShare: number;
    totalProfessionalFees: number;
  };
  contentHash: string;
}

interface Submission {
  id: string;
  packetId: string;
  sourceClaimDraftId: string;
  status: string;
  transmittalControlNumber?: string;
  exportBundleIds: string[];
  denialReasons: Array<{ text: string; code?: string; category?: string; recordedAt: string }>;
  staffNotes: string[];
  timeline: Array<{
    timestamp: string;
    fromStatus: string;
    toStatus: string;
    actor: string;
    detail?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface SpecGate {
  id: string;
  label: string;
  description: string;
  status: string;
}

interface ExportSummary {
  bundleId: string;
  packetId: string;
  generatedAt: string;
  xmlSpecAvailable: boolean;
  summary: {
    patientName: string;
    patientType: string;
    admissionDate: string;
    totalCharges: number;
    diagnosisCount: number;
    procedureCount: number;
    formatCount: number;
  };
  artifacts: Array<{ format: string; filename: string; contentType: string; sizeBytes: number }>;
}

type Tab = 'build' | 'submissions' | 'denials' | 'spec';

/* -- Status Badge Colors -------------------------------------- */

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#f3f4f6', text: '#374151' },
  reviewed: { bg: '#dbeafe', text: '#1e40af' },
  exported: { bg: '#fef3c7', text: '#92400e' },
  submitted_manual: { bg: '#e0e7ff', text: '#3730a3' },
  accepted: { bg: '#dcfce7', text: '#166534' },
  denied: { bg: '#fee2e2', text: '#991b1b' },
  appealed: { bg: '#fce7f3', text: '#9d174d' },
};

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? { bg: '#f3f4f6', text: '#374151' };
  return (
    <span
      style={{
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 600,
        background: colors.bg,
        color: colors.text,
      }}
    >
      {status.replace(/_/g, ' ').toUpperCase()}
    </span>
  );
}

/* -- Main Component ------------------------------------------- */

export default function PhilHealthEClaims3Page() {
  const [tab, setTab] = useState<Tab>('build');

  // Build & Export state
  const [drafts, setDrafts] = useState<ClaimDraft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [builtPacket, setBuiltPacket] = useState<ClaimPacket | null>(null);
  const [exportResult, setExportResult] = useState<ExportSummary | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Submissions state
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  // Denial capture state
  const [denialText, setDenialText] = useState('');
  const [denialCode, setDenialCode] = useState('');
  const [denialCategory, setDenialCategory] = useState('other');

  // Spec gates state
  const [specGates, setSpecGates] = useState<SpecGate[]>([]);
  const [specProgress, setSpecProgress] = useState({ completed: 0, total: 0 });

  // Adapter status
  const [adapterStatus, setAdapterStatus] = useState<Record<string, unknown> | null>(null);

  /* -- Fetchers --------------------------------------------- */

  const fetchDrafts = useCallback(async () => {
    try {
      const res = await fetch(`${API}/rcm/philhealth/claims`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setDrafts(data.drafts ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await fetch(`${API}/rcm/eclaims3/submissions`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setSubmissions(data.submissions ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  const fetchSpecGates = useCallback(async () => {
    try {
      const res = await fetch(`${API}/rcm/eclaims3/spec-gates`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setSpecGates(data.gates ?? []);
        setSpecProgress(data.progress ?? { completed: 0, total: 0 });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const fetchAdapterStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API}/rcm/eclaims3/status`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setAdapterStatus(data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchAdapterStatus();
  }, [fetchAdapterStatus]);

  useEffect(() => {
    if (tab === 'build') fetchDrafts();
    if (tab === 'submissions' || tab === 'denials') fetchSubmissions();
    if (tab === 'spec') fetchSpecGates();
  }, [tab, fetchDrafts, fetchSubmissions, fetchSpecGates]);

  /* -- Actions ---------------------------------------------- */

  const handleBuild = async () => {
    if (!selectedDraftId) return;
    setBuilding(true);
    setBuildError(null);
    setBuiltPacket(null);
    setExportResult(null);
    try {
      const res = await fetch(`${API}/rcm/eclaims3/packets`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ draftId: selectedDraftId, actor: 'admin-ui' }),
      });
      const data = await res.json();
      if (data.ok) {
        setBuiltPacket(data.packet);
      } else {
        setBuildError(data.errors?.join('; ') || data.error || 'Build failed.');
      }
    } catch (err) {
      setBuildError(err instanceof Error ? err.message : String(err));
    }
    setBuilding(false);
  };

  const handleExport = async () => {
    if (!builtPacket) return;
    setExporting(true);
    try {
      const res = await fetch(`${API}/rcm/eclaims3/packets/${builtPacket.packetId}/export`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ actor: 'admin-ui' }),
      });
      const data = await res.json();
      if (data.ok) {
        setExportResult(data.bundle);
      }
    } catch {
      /* ignore */
    }
    setExporting(false);
  };

  const handleTransition = async (subId: string, toStatus: string) => {
    const needsConfirmation = ['submitted_manual', 'accepted', 'denied'].includes(toStatus);
    try {
      const res = await fetch(`${API}/rcm/eclaims3/submissions/${subId}/status`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({
          status: toStatus,
          actor: 'admin-ui',
          staffConfirmation: needsConfirmation,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        fetchSubmissions();
        if (selectedSubmission?.id === subId) {
          setSelectedSubmission(data.submission);
        }
      }
    } catch {
      /* ignore */
    }
  };

  const handleRecordDenial = async (subId: string) => {
    if (!denialText.trim()) return;
    try {
      await fetch(`${API}/rcm/eclaims3/submissions/${subId}/denial`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({
          text: denialText,
          code: denialCode || undefined,
          category: denialCategory,
          actor: 'admin-ui',
        }),
      });
      setDenialText('');
      setDenialCode('');
      fetchSubmissions();
    } catch {
      /* ignore */
    }
  };

  /* -- Styles ----------------------------------------------- */

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  };

  const btnStyle = (active?: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: 6,
    border: active ? '2px solid #2563eb' : '1px solid #d1d5db',
    background: active ? '#eff6ff' : '#fff',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    fontSize: 13,
  });

  const actionBtn: React.CSSProperties = {
    padding: '6px 14px',
    borderRadius: 6,
    border: '1px solid #2563eb',
    background: '#2563eb',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  };

  const disabledBtn: React.CSSProperties = { ...actionBtn, opacity: 0.5, cursor: 'not-allowed' };

  /* -- Render ----------------------------------------------- */

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
        PhilHealth eClaims 3.0 Adapter
      </h1>
      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>
        Deadline: April 1, 2026 &middot; Status: Manual submission workflow active &middot; XML
        spec:{' '}
        {adapterStatus ? (adapterStatus.specAvailable ? 'Available' : 'Pending') : 'Loading...'}
      </p>

      {/* Warning banner */}
      <div
        style={{
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 16,
          fontSize: 13,
          color: '#92400e',
        }}
      >
        <strong>Manual Submission Mode:</strong> Automated submission is not available until the
        official eClaims 3.0 schema is acquired and certification completed. Export bundles and
        upload to the PhilHealth portal manually.
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['build', 'submissions', 'denials', 'spec'] as Tab[]).map((t) => (
          <button key={t} style={btnStyle(tab === t)} onClick={() => setTab(t)}>
            {t === 'build'
              ? 'Build & Export'
              : t === 'submissions'
                ? 'Submissions'
                : t === 'denials'
                  ? 'Denials'
                  : 'Spec Gates'}
          </button>
        ))}
      </div>

      {/* -- Build & Export Tab -------------------------------- */}
      {tab === 'build' && (
        <div>
          <div style={cardStyle}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
              1. Select Claim Draft
            </h3>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
              Select an existing PhilHealth claim draft to build an eClaims 3.0 packet.
            </p>
            {drafts.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9ca3af' }}>
                No claim drafts available. Create one in PH Claims first.
              </p>
            ) : (
              <div style={{ maxHeight: 250, overflowY: 'auto' }}>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                      <th style={{ padding: '4px 8px' }}></th>
                      <th style={{ padding: '4px 8px' }}>Patient</th>
                      <th style={{ padding: '4px 8px' }}>PIN</th>
                      <th style={{ padding: '4px 8px' }}>Type</th>
                      <th style={{ padding: '4px 8px' }}>Date</th>
                      <th style={{ padding: '4px 8px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drafts.map((d) => (
                      <tr
                        key={d.id}
                        style={{
                          borderBottom: '1px solid #f3f4f6',
                          background: selectedDraftId === d.id ? '#eff6ff' : undefined,
                          cursor: 'pointer',
                        }}
                        onClick={() => setSelectedDraftId(d.id)}
                      >
                        <td style={{ padding: '4px 8px' }}>
                          <input type="radio" checked={selectedDraftId === d.id} readOnly />
                        </td>
                        <td style={{ padding: '4px 8px' }}>
                          {d.patientLastName}, {d.patientFirstName}
                        </td>
                        <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>
                          {d.philhealthPin}
                        </td>
                        <td style={{ padding: '4px 8px' }}>
                          {d.patientType === 'I' ? 'Inpatient' : 'Outpatient'}
                        </td>
                        <td style={{ padding: '4px 8px' }}>{d.admissionDate}</td>
                        <td style={{ padding: '4px 8px' }}>
                          <StatusBadge status={d.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <button
                style={selectedDraftId ? actionBtn : disabledBtn}
                disabled={!selectedDraftId || building}
                onClick={handleBuild}
              >
                {building ? 'Building...' : 'Build eClaims 3.0 Packet'}
              </button>
            </div>
            {buildError && (
              <div
                style={{
                  marginTop: 8,
                  padding: '6px 10px',
                  background: '#fee2e2',
                  borderRadius: 4,
                  color: '#991b1b',
                  fontSize: 13,
                }}
              >
                {buildError}
              </div>
            )}
          </div>

          {/* Built Packet Summary */}
          {builtPacket && (
            <div style={cardStyle}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>2. Packet Built</h3>
              <div style={{ fontSize: 13 }}>
                <div>
                  <strong>Packet ID:</strong>{' '}
                  <code style={{ fontSize: 12 }}>{builtPacket.packetId}</code>
                </div>
                <div>
                  <strong>Patient:</strong> {builtPacket.patient.lastName},{' '}
                  {builtPacket.patient.firstName}
                </div>
                <div>
                  <strong>Facility:</strong> {builtPacket.facility.facilityName} (
                  {builtPacket.facility.facilityCode})
                </div>
                <div>
                  <strong>Type:</strong>{' '}
                  {builtPacket.patientType === 'I' ? 'Inpatient' : 'Outpatient'}
                </div>
                <div>
                  <strong>Date:</strong> {builtPacket.admissionDate}
                </div>
                <div>
                  <strong>Total Charges:</strong> PHP {builtPacket.totals.totalCharges.toFixed(2)}
                </div>
                <div>
                  <strong>Content Hash:</strong>{' '}
                  <code style={{ fontSize: 11 }}>{builtPacket.contentHash.slice(0, 24)}...</code>
                </div>
              </div>

              <h3 style={{ fontSize: 15, fontWeight: 600, marginTop: 16, marginBottom: 8 }}>
                3. Export Bundle
              </h3>
              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                Generate JSON (canonical), PDF text (manual submission), and XML (placeholder).
              </p>
              <button
                style={exporting ? disabledBtn : actionBtn}
                disabled={exporting}
                onClick={handleExport}
              >
                {exporting ? 'Exporting...' : 'Generate Export Bundle'}
              </button>

              {exportResult && (
                <div
                  style={{
                    marginTop: 12,
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: 6,
                    padding: 12,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>
                    Export Generated
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    <div>
                      Bundle ID: <code>{exportResult.bundleId}</code>
                    </div>
                    <div>
                      XML Spec:{' '}
                      {exportResult.xmlSpecAvailable
                        ? 'Schema-based'
                        : 'Placeholder (spec pending)'}
                    </div>
                  </div>
                  <table
                    style={{
                      width: '100%',
                      fontSize: 12,
                      marginTop: 8,
                      borderCollapse: 'collapse',
                    }}
                  >
                    <thead>
                      <tr style={{ borderBottom: '1px solid #bbf7d0', textAlign: 'left' }}>
                        <th style={{ padding: '2px 6px' }}>Format</th>
                        <th style={{ padding: '2px 6px' }}>Filename</th>
                        <th style={{ padding: '2px 6px' }}>Size</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exportResult.artifacts.map((a, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f0fdf4' }}>
                          <td style={{ padding: '2px 6px' }}>
                            {a.format.replace(/_/g, ' ').toUpperCase()}
                          </td>
                          <td style={{ padding: '2px 6px', fontFamily: 'monospace', fontSize: 11 }}>
                            {a.filename}
                          </td>
                          <td style={{ padding: '2px 6px' }}>
                            {(a.sizeBytes / 1024).toFixed(1)} KB
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* -- Submissions Tab ----------------------------------- */}
      {tab === 'submissions' && (
        <div>
          <div style={cardStyle}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
              Submission Status Board
            </h3>
            {submissions.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9ca3af' }}>
                No submissions yet. Build and export a packet first.
              </p>
            ) : (
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                    <th style={{ padding: '4px 8px' }}>ID</th>
                    <th style={{ padding: '4px 8px' }}>Status</th>
                    <th style={{ padding: '4px 8px' }}>TCN</th>
                    <th style={{ padding: '4px 8px' }}>Exports</th>
                    <th style={{ padding: '4px 8px' }}>Updated</th>
                    <th style={{ padding: '4px 8px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 11 }}>
                        {s.id.slice(0, 16)}
                      </td>
                      <td style={{ padding: '4px 8px' }}>
                        <StatusBadge status={s.status} />
                      </td>
                      <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 11 }}>
                        {s.transmittalControlNumber ?? '--'}
                      </td>
                      <td style={{ padding: '4px 8px' }}>{s.exportBundleIds.length}</td>
                      <td style={{ padding: '4px 8px', fontSize: 11 }}>
                        {s.updatedAt.slice(0, 19).replace('T', ' ')}
                      </td>
                      <td style={{ padding: '4px 8px' }}>
                        <button
                          style={{ ...btnStyle(), fontSize: 11, padding: '2px 8px' }}
                          onClick={() => setSelectedSubmission(s)}
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Selected submission detail */}
          {selectedSubmission && (
            <div style={cardStyle}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
                Submission Detail:{' '}
                <code style={{ fontSize: 12 }}>{selectedSubmission.id.slice(0, 20)}</code>
              </h3>
              <div style={{ fontSize: 13, marginBottom: 12 }}>
                <div>
                  <strong>Status:</strong> <StatusBadge status={selectedSubmission.status} />
                </div>
                <div>
                  <strong>Packet ID:</strong>{' '}
                  <code style={{ fontSize: 11 }}>{selectedSubmission.packetId}</code>
                </div>
                <div>
                  <strong>TCN:</strong>{' '}
                  {selectedSubmission.transmittalControlNumber ?? 'Not assigned'}
                </div>
              </div>

              {/* Status transition buttons */}
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 600, marginRight: 8 }}>
                  Transition to:
                </span>
                {selectedSubmission.status === 'draft' && (
                  <button
                    style={{ ...btnStyle(), fontSize: 11, marginRight: 4 }}
                    onClick={() => handleTransition(selectedSubmission.id, 'reviewed')}
                  >
                    Reviewed
                  </button>
                )}
                {selectedSubmission.status === 'reviewed' && (
                  <button
                    style={{ ...btnStyle(), fontSize: 11, marginRight: 4 }}
                    onClick={() => handleTransition(selectedSubmission.id, 'exported')}
                  >
                    Exported
                  </button>
                )}
                {selectedSubmission.status === 'exported' && (
                  <button
                    style={{ ...btnStyle(), fontSize: 11, marginRight: 4 }}
                    onClick={() => handleTransition(selectedSubmission.id, 'submitted_manual')}
                  >
                    Submitted (Manual)
                  </button>
                )}
                {selectedSubmission.status === 'submitted_manual' && (
                  <>
                    <button
                      style={{
                        ...btnStyle(),
                        fontSize: 11,
                        marginRight: 4,
                        borderColor: '#16a34a',
                        color: '#16a34a',
                      }}
                      onClick={() => handleTransition(selectedSubmission.id, 'accepted')}
                    >
                      Accepted
                    </button>
                    <button
                      style={{
                        ...btnStyle(),
                        fontSize: 11,
                        marginRight: 4,
                        borderColor: '#dc2626',
                        color: '#dc2626',
                      }}
                      onClick={() => handleTransition(selectedSubmission.id, 'denied')}
                    >
                      Denied
                    </button>
                  </>
                )}
                {selectedSubmission.status === 'denied' && (
                  <button
                    style={{ ...btnStyle(), fontSize: 11, marginRight: 4 }}
                    onClick={() => handleTransition(selectedSubmission.id, 'appealed')}
                  >
                    Appealed
                  </button>
                )}
              </div>

              {/* Timeline */}
              {selectedSubmission.timeline.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ fontSize: 13 }}>Timeline:</strong>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    {selectedSubmission.timeline.map((t, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '2px 0',
                          borderLeft: '2px solid #e5e7eb',
                          paddingLeft: 8,
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ color: '#6b7280' }}>
                          {t.timestamp.slice(0, 19).replace('T', ' ')}
                        </span>{' '}
                        <StatusBadge status={t.fromStatus} />{' -> '}<StatusBadge status={t.toStatus} />
                        {t.detail && <span style={{ color: '#6b7280' }}> -- {t.detail}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Staff notes */}
              {selectedSubmission.staffNotes.length > 0 && (
                <div>
                  <strong style={{ fontSize: 13 }}>Staff Notes:</strong>
                  <ul style={{ fontSize: 12, margin: '4px 0', paddingLeft: 16 }}>
                    {selectedSubmission.staffNotes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* -- Denials Tab --------------------------------------- */}
      {tab === 'denials' && (
        <div>
          <div style={cardStyle}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Record Denial Reason</h3>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
              When PhilHealth denies a claim, select the submission and enter the denial details
              below.
            </p>

            {/* Denied submissions */}
            {(() => {
              const denied = submissions.filter((s) => s.status === 'denied');
              if (denied.length === 0) {
                return (
                  <p style={{ fontSize: 13, color: '#9ca3af' }}>
                    No denied submissions to process.
                  </p>
                );
              }
              return denied.map((s) => (
                <div
                  key={s.id}
                  style={{
                    border: '1px solid #fca5a5',
                    borderRadius: 6,
                    padding: 12,
                    marginBottom: 8,
                  }}
                >
                  <div style={{ fontSize: 13 }}>
                    <strong>Submission:</strong>{' '}
                    <code style={{ fontSize: 11 }}>{s.id.slice(0, 20)}</code> --{' '}
                    <StatusBadge status={s.status} />
                  </div>
                  {s.denialReasons.length > 0 && (
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      <strong>Existing Reasons:</strong>
                      <ul style={{ margin: '2px 0', paddingLeft: 16 }}>
                        {s.denialReasons.map((r, i) => (
                          <li key={i}>
                            {r.text} {r.code ? `(${r.code})` : ''} [{r.category ?? 'other'}]
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div
                    style={{
                      marginTop: 8,
                      display: 'flex',
                      gap: 8,
                      alignItems: 'flex-end',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <label style={{ fontSize: 11, display: 'block' }}>Denial Reason *</label>
                      <input
                        style={{
                          border: '1px solid #d1d5db',
                          borderRadius: 4,
                          padding: '4px 8px',
                          fontSize: 12,
                          width: 260,
                        }}
                        value={denialText}
                        onChange={(e) => setDenialText(e.target.value)}
                        placeholder="Enter denial reason..."
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, display: 'block' }}>Code</label>
                      <input
                        style={{
                          border: '1px solid #d1d5db',
                          borderRadius: 4,
                          padding: '4px 8px',
                          fontSize: 12,
                          width: 100,
                        }}
                        value={denialCode}
                        onChange={(e) => setDenialCode(e.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, display: 'block' }}>Category</label>
                      <select
                        style={{
                          border: '1px solid #d1d5db',
                          borderRadius: 4,
                          padding: '4px 8px',
                          fontSize: 12,
                        }}
                        value={denialCategory}
                        onChange={(e) => setDenialCategory(e.target.value)}
                      >
                        <option value="documentation">Documentation</option>
                        <option value="eligibility">Eligibility</option>
                        <option value="coding">Coding</option>
                        <option value="timely_filing">Timely Filing</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <button
                      style={denialText.trim() ? actionBtn : disabledBtn}
                      disabled={!denialText.trim()}
                      onClick={() => handleRecordDenial(s.id)}
                    >
                      Record
                    </button>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* -- Spec Gates Tab ------------------------------------ */}
      {tab === 'spec' && (
        <div>
          <div style={cardStyle}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
              eClaims 3.0 Spec Acquisition Progress
            </h3>
            <div style={{ fontSize: 13, marginBottom: 12 }}>
              <strong>{specProgress.completed}</strong> of <strong>{specProgress.total}</strong>{' '}
              gates completed
            </div>
            <div
              style={{
                background: '#f3f4f6',
                borderRadius: 4,
                height: 8,
                marginBottom: 16,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  background: specProgress.completed === specProgress.total ? '#16a34a' : '#2563eb',
                  height: '100%',
                  width:
                    specProgress.total > 0
                      ? `${(specProgress.completed / specProgress.total) * 100}%`
                      : '0%',
                  borderRadius: 4,
                  transition: 'width 0.3s',
                }}
              />
            </div>
            {specGates.map((g) => {
              const statusColor: Record<string, string> = {
                not_started: '#9ca3af',
                in_progress: '#2563eb',
                blocked: '#dc2626',
                completed: '#16a34a',
              };
              return (
                <div
                  key={g.id}
                  style={{
                    borderLeft: `3px solid ${statusColor[g.status] ?? '#9ca3af'}`,
                    padding: '8px 12px',
                    marginBottom: 8,
                    background: g.status === 'completed' ? '#f0fdf4' : '#fff',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {g.label}
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 11,
                        color: statusColor[g.status] ?? '#9ca3af',
                        fontWeight: 400,
                      }}
                    >
                      {g.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    {g.description}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reference links */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Reference</h3>
            <ul style={{ fontSize: 13, paddingLeft: 16, margin: 0 }}>
              <li>
                PhilHealth eClaims Portal:{' '}
                <a href="https://eclaims.philhealth.gov.ph" target="_blank" rel="noreferrer">
                  eclaims.philhealth.gov.ph
                </a>
              </li>
              <li>
                Spec Status Doc: <code>docs/runbooks/philhealth-eclaims3-spec-status.md</code>
              </li>
              <li>Phase 90: PhilHealth eClaims Posture (claim drafts, facility setup)</li>
              <li>Phase 40: CF1-CF4 Serializer</li>
              <li>Phase 38: PhilHealth Connector</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
