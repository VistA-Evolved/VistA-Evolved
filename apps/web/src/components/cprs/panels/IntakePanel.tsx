'use client';

import { useEffect, useState, useCallback } from 'react';
import { csrfHeaders } from '@/lib/csrf';
import styles from '../cprs.module.css';
import { API_BASE } from '@/lib/api-config';

/* ------------------------------------------------------------------ */
/* Types (mirror API shapes — no shared package in monorepo)            */
/* ------------------------------------------------------------------ */

interface IntakeSession {
  id: string;
  patientDfn: string | null;
  status: string;
  language: string;
  subjectType: string;
  context: {
    department?: string;
    specialty?: string;
    chiefComplaint?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ROSFinding {
  system: string;
  findings: string;
  status: 'positive' | 'negative' | 'not_asked';
}

interface RedFlagResult {
  flag: string;
  severity: 'info' | 'warning' | 'critical';
  triggerQuestionId: string;
  triggerAnswerId: string;
}

interface DraftSummary {
  sessionId: string;
  version: number;
  generatedAt: string;
  sections: {
    hpiNarrative: string;
    reviewOfSystems: ROSFinding[];
    redFlags: RedFlagResult[];
    medicationsDelta: {
      newMedications: string[];
      discontinuedMedications: string[];
      changedMedications: string[];
    };
    allergiesDelta: {
      newAllergies: string[];
      resolvedAllergies: string[];
    };
    contradictions: { questionIdA: string; questionIdB: string; description: string }[];
  };
  draftNoteText: string;
}

interface QRItem {
  linkId: string;
  text?: string;
  answer?: Record<string, unknown>[];
}

interface ReviewData {
  session: IntakeSession;
  summary: DraftSummary;
  questionnaireResponse: { item: QRItem[] };
  events: { id: string; type: string; timestamp: string; actor: string }[];
}

/* ------------------------------------------------------------------ */
/* Constants                                                            */
/* ------------------------------------------------------------------ */

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  clinician_reviewed: 'Reviewed',
  filed: 'Filed',
  filed_pending_integration: 'Filed (Pending)',
  expired: 'Expired',
  abandoned: 'Abandoned',
};

const STATUS_COLORS: Record<string, string> = {
  submitted: 'var(--cprs-warning, #c58a07)',
  clinician_reviewed: 'var(--cprs-info, #0078d4)',
  filed: 'var(--cprs-success, #107c10)',
  filed_pending_integration: 'var(--cprs-success, #107c10)',
  in_progress: 'var(--cprs-text, #666)',
  expired: 'var(--cprs-danger, #d13438)',
  abandoned: 'var(--cprs-danger, #d13438)',
};

const SEVERITY_STYLES: Record<string, { bg: string; fg: string; icon: string }> = {
  critical: { bg: '#fde7e9', fg: '#d13438', icon: '🔴' },
  warning: { bg: '#fff4ce', fg: '#c58a07', icon: '🟡' },
  info: { bg: '#e8f4fd', fg: '#0078d4', icon: 'ℹ️' },
};

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

interface Props {
  dfn: string;
}

type Tab = 'list' | 'review';

export default function IntakePanel({ dfn }: Props) {
  const [tab, setTab] = useState<Tab>('list');
  const [sessions, setSessions] = useState<IntakeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewData | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  /* ---- Fetch sessions for this patient ---- */
  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/intake/by-patient/${dfn}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        setSessions(data.sessions ?? []);
      } else {
        setError(data.error ?? 'Failed to load intakes');
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [dfn]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  /* ---- Open review ---- */
  const openReview = useCallback(async (sessionId: string) => {
    setSelectedId(sessionId);
    setReviewLoading(true);
    setActionMsg(null);
    setTab('review');
    try {
      const res = await fetch(`${API_BASE}/intake/sessions/${sessionId}/review`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        setReview(data as ReviewData);
      } else {
        setActionMsg(`Error: ${data.error}`);
      }
    } catch (e: unknown) {
      setActionMsg(`Error: ${(e as Error).message}`);
    } finally {
      setReviewLoading(false);
    }
  }, []);

  /* ---- Mark reviewed ---- */
  const handleMarkReviewed = useCallback(async () => {
    if (!selectedId) return;
    setActionBusy(true);
    setActionMsg(null);
    try {
      const res = await fetch(`${API_BASE}/intake/sessions/${selectedId}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({ reviewed: true }),
      });
      const data = await res.json();
      if (data.ok) {
        setActionMsg('Intake marked as reviewed');
        openReview(selectedId); // refresh
        fetchSessions();
      } else {
        setActionMsg(`Error: ${data.error}`);
      }
    } catch (e: unknown) {
      setActionMsg(`Error: ${(e as Error).message}`);
    } finally {
      setActionBusy(false);
    }
  }, [selectedId, openReview, fetchSessions]);

  /* ---- File to VistA ---- */
  const handleFile = useCallback(async () => {
    if (!selectedId) return;
    setActionBusy(true);
    setActionMsg(null);
    try {
      const res = await fetch(`${API_BASE}/intake/sessions/${selectedId}/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.ok) {
        setActionMsg('Filing initiated');
        fetchSessions();
        openReview(selectedId);
      } else {
        setActionMsg(`Error: ${data.error}`);
      }
    } catch (e: unknown) {
      setActionMsg(`Error: ${(e as Error).message}`);
    } finally {
      setActionBusy(false);
    }
  }, [selectedId, openReview, fetchSessions]);

  /* ---- Export note ---- */
  const handleExport = useCallback(async () => {
    if (!selectedId) return;
    setActionBusy(true);
    setActionMsg(null);
    try {
      const res = await fetch(`${API_BASE}/intake/sessions/${selectedId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.ok) {
        // Copy to clipboard
        try {
          await navigator.clipboard.writeText(data.noteText);
          setActionMsg('Draft note copied to clipboard');
        } catch {
          setActionMsg('Draft note exported (clipboard unavailable)');
        }
      } else {
        setActionMsg(`Error: ${data.error}`);
      }
    } catch (e: unknown) {
      setActionMsg(`Error: ${(e as Error).message}`);
    } finally {
      setActionBusy(false);
    }
  }, [selectedId]);

  /* ================================================================ */
  /* RENDER                                                            */
  /* ================================================================ */

  return (
    <div>
      <div className={styles.panelTitle}>Patient Intake</div>

      <div className={styles.panelToolbar}>
        <button
          className={tab === 'list' ? styles.btnPrimary : styles.btn}
          onClick={() => setTab('list')}
        >
          Intakes ({sessions.length})
        </button>
        {selectedId && (
          <button
            className={tab === 'review' ? styles.btnPrimary : styles.btn}
            onClick={() => setTab('review')}
          >
            Review
          </button>
        )}
        <button className={styles.btn} onClick={fetchSessions} style={{ marginLeft: 'auto' }}>
          Refresh
        </button>
      </div>

      {actionMsg && (
        <p
          style={{
            color: actionMsg.startsWith('Error') ? 'var(--cprs-danger)' : 'var(--cprs-success)',
            fontSize: 12,
            margin: '4px 0',
          }}
        >
          {actionMsg}
        </p>
      )}

      {error && (
        <p style={{ color: 'var(--cprs-danger)', fontSize: 12, margin: '4px 0' }}>{error}</p>
      )}

      {/* ============ LIST TAB ============ */}
      {tab === 'list' && (
        <div>
          {loading && <p className={styles.loadingText}>Loading intakes...</p>}
          {!loading && sessions.length === 0 && (
            <p className={styles.emptyText}>No intake sessions for this patient</p>
          )}
          {!loading && sessions.length > 0 && (
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Chief Complaint</th>
                  <th>Created</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((s) => (
                    <tr
                      key={s.id}
                      style={
                        selectedId === s.id ? { background: 'var(--cprs-selected)' } : undefined
                      }
                    >
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 6px',
                            borderRadius: 3,
                            fontSize: 11,
                            fontWeight: 600,
                            color: STATUS_COLORS[s.status] ?? '#666',
                            border: `1px solid ${STATUS_COLORS[s.status] ?? '#ccc'}`,
                          }}
                        >
                          {STATUS_LABELS[s.status] ?? s.status}
                        </span>
                      </td>
                      <td>{s.context.chiefComplaint || '(not specified)'}</td>
                      <td>{new Date(s.createdAt).toLocaleString()}</td>
                      <td>{new Date(s.updatedAt).toLocaleString()}</td>
                      <td>
                        {(s.status === 'submitted' ||
                          s.status === 'clinician_reviewed' ||
                          s.status === 'filed' ||
                          s.status === 'filed_pending_integration') && (
                          <button
                            className={styles.btn}
                            onClick={() => openReview(s.id)}
                            style={{ fontSize: 11, padding: '2px 8px' }}
                          >
                            {s.status === 'submitted' ? 'Review' : 'View'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ============ REVIEW TAB ============ */}
      {tab === 'review' && (
        <div>
          {reviewLoading && <p className={styles.loadingText}>Loading review...</p>}
          {!reviewLoading && !review && (
            <p className={styles.emptyText}>Select an intake to review</p>
          )}
          {!reviewLoading && review && (
            <div>
              {/* Red Flags Banner */}
              {review.summary.sections.redFlags.length > 0 && (
                <div
                  style={{
                    border: '2px solid #d13438',
                    borderRadius: 6,
                    padding: '8px 12px',
                    marginBottom: 12,
                    background: '#fde7e9',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#d13438', marginBottom: 4 }}>
                    RED FLAGS ({review.summary.sections.redFlags.length})
                  </div>
                  {review.summary.sections.redFlags.map((rf, i) => {
                    const sev = SEVERITY_STYLES[rf.severity] ?? SEVERITY_STYLES.info;
                    return (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '3px 0',
                          fontSize: 12,
                          color: sev.fg,
                        }}
                      >
                        <span>{sev.icon}</span>
                        <strong>{rf.severity.toUpperCase()}:</strong>
                        <span>{rf.flag}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Session Info */}
              <div
                style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 12, color: '#666' }}
              >
                <span>Session: {review.session.id.slice(0, 8)}...</span>
                <span>
                  Status:{' '}
                  <strong>{STATUS_LABELS[review.session.status] ?? review.session.status}</strong>
                </span>
                <span>Language: {review.session.language}</span>
                {review.session.context.chiefComplaint && (
                  <span>
                    CC: <strong>{review.session.context.chiefComplaint}</strong>
                  </span>
                )}
              </div>

              {/* Contradictions */}
              {review.summary.sections.contradictions.length > 0 && (
                <div
                  style={{
                    border: '1px solid #c58a07',
                    borderRadius: 4,
                    padding: '6px 10px',
                    marginBottom: 12,
                    background: '#fff4ce',
                    fontSize: 12,
                  }}
                >
                  <strong>Contradictions detected:</strong>
                  {review.summary.sections.contradictions.map((c, i) => (
                    <div key={i} style={{ marginTop: 2 }}>
                      - {c.description}
                    </div>
                  ))}
                </div>
              )}

              {/* Split pane: HPI + ROS on left, Answers on right */}
              <div className={styles.splitPane}>
                <div className={styles.splitLeft}>
                  <div className={styles.panelTitle} style={{ fontSize: 13 }}>
                    HPI Narrative
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      padding: '6px 8px',
                      background: 'var(--cprs-bg, #f5f5f5)',
                      borderRadius: 4,
                      marginBottom: 10,
                      maxHeight: 200,
                      overflowY: 'auto',
                    }}
                  >
                    {review.summary.sections.hpiNarrative || '(No HPI narrative generated)'}
                  </div>

                  {/* ROS table */}
                  <div className={styles.panelTitle} style={{ fontSize: 13 }}>
                    Review of Systems
                  </div>
                  {review.summary.sections.reviewOfSystems.length > 0 ? (
                    <table className={styles.dataTable} style={{ fontSize: 11 }}>
                      <thead>
                        <tr>
                          <th>System</th>
                          <th>Status</th>
                          <th>Findings</th>
                        </tr>
                      </thead>
                      <tbody>
                        {review.summary.sections.reviewOfSystems.map((ros) => (
                          <tr
                            key={ros.system}
                            style={
                              ros.status === 'positive' ? { background: '#fff4ce' } : undefined
                            }
                          >
                            <td style={{ fontWeight: 600 }}>{ros.system}</td>
                            <td>
                              <span
                                style={{
                                  color:
                                    ros.status === 'positive'
                                      ? '#c58a07'
                                      : ros.status === 'negative'
                                        ? '#107c10'
                                        : '#999',
                                }}
                              >
                                {ros.status === 'positive'
                                  ? '+'
                                  : ros.status === 'negative'
                                    ? '-'
                                    : '?'}
                              </span>
                            </td>
                            <td>{ros.findings}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className={styles.emptyText}>No ROS data</p>
                  )}

                  {/* Medication Delta */}
                  {(review.summary.sections.medicationsDelta.newMedications.length > 0 ||
                    review.summary.sections.medicationsDelta.discontinuedMedications.length > 0 ||
                    review.summary.sections.medicationsDelta.changedMedications.length > 0) && (
                    <div style={{ marginTop: 10 }}>
                      <div className={styles.panelTitle} style={{ fontSize: 13 }}>
                        Medication Changes
                      </div>
                      <div style={{ fontSize: 11 }}>
                        {review.summary.sections.medicationsDelta.newMedications.map((m) => (
                          <div key={m} style={{ color: '#107c10' }}>
                            + {m}
                          </div>
                        ))}
                        {review.summary.sections.medicationsDelta.discontinuedMedications.map(
                          (m) => (
                            <div key={m} style={{ color: '#d13438' }}>
                              - {m}
                            </div>
                          )
                        )}
                        {review.summary.sections.medicationsDelta.changedMedications.map((m) => (
                          <div key={m} style={{ color: '#c58a07' }}>
                            ~ {m}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Allergy Delta */}
                  {(review.summary.sections.allergiesDelta.newAllergies.length > 0 ||
                    review.summary.sections.allergiesDelta.resolvedAllergies.length > 0) && (
                    <div style={{ marginTop: 10 }}>
                      <div className={styles.panelTitle} style={{ fontSize: 13 }}>
                        Allergy Changes
                      </div>
                      <div style={{ fontSize: 11 }}>
                        {review.summary.sections.allergiesDelta.newAllergies.map((a) => (
                          <div key={a} style={{ color: '#d13438' }}>
                            + NEW: {a}
                          </div>
                        ))}
                        {review.summary.sections.allergiesDelta.resolvedAllergies.map((a) => (
                          <div key={a} style={{ color: '#107c10' }}>
                            Resolved: {a}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.splitRight}>
                  <div className={styles.panelTitle} style={{ fontSize: 13 }}>
                    Patient Answers
                  </div>
                  {review.questionnaireResponse.item.length === 0 && (
                    <p className={styles.emptyText}>No answers recorded</p>
                  )}
                  <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {review.questionnaireResponse.item.map((qi) => (
                      <div
                        key={qi.linkId}
                        style={{
                          padding: '4px 8px',
                          borderBottom: '1px solid var(--cprs-border, #e5e5e5)',
                          fontSize: 12,
                        }}
                      >
                        <div style={{ fontWeight: 600, color: '#333' }}>{qi.text ?? qi.linkId}</div>
                        <div style={{ color: '#555', marginTop: 2 }}>
                          {qi.answer && qi.answer.length > 0 ? (
                            qi.answer.map((a, i) => {
                              const val =
                                (a as any).valueString ??
                                (a as any).valueBoolean?.toString() ??
                                (a as any).valueInteger?.toString() ??
                                (a as any).valueCoding?.display ??
                                JSON.stringify(a);
                              return (
                                <span key={i}>
                                  {i > 0 ? ', ' : ''}
                                  {val}
                                </span>
                              );
                            })
                          ) : (
                            <em style={{ color: '#999' }}>Not answered</em>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Draft Note Preview */}
              {review.summary.draftNoteText && (
                <div style={{ marginTop: 12 }}>
                  <div className={styles.panelTitle} style={{ fontSize: 13 }}>
                    Draft Note
                  </div>
                  <pre
                    style={{
                      fontSize: 11,
                      lineHeight: 1.4,
                      whiteSpace: 'pre-wrap',
                      padding: '8px 10px',
                      background: 'var(--cprs-bg, #f5f5f5)',
                      borderRadius: 4,
                      border: '1px solid var(--cprs-border, #e5e5e5)',
                      maxHeight: 250,
                      overflowY: 'auto',
                      fontFamily: 'Consolas, monospace',
                    }}
                  >
                    {review.summary.draftNoteText}
                  </pre>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                {review.session.status === 'submitted' && (
                  <button
                    className={styles.btnPrimary}
                    onClick={handleMarkReviewed}
                    disabled={actionBusy}
                  >
                    {actionBusy ? 'Saving...' : 'Mark as Reviewed'}
                  </button>
                )}
                {review.session.status === 'clinician_reviewed' && (
                  <button className={styles.btnPrimary} onClick={handleFile} disabled={actionBusy}>
                    {actionBusy ? 'Filing...' : 'File to VistA'}
                  </button>
                )}
                <button className={styles.btn} onClick={handleExport} disabled={actionBusy}>
                  Export Draft Note
                </button>
                <button
                  className={styles.btn}
                  onClick={() => {
                    setTab('list');
                    setReview(null);
                    setSelectedId(null);
                  }}
                >
                  Back to List
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
