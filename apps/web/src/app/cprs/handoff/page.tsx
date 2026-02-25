'use client';

/**
 * Phase 86 — Shift Handoff + Signout
 *
 * Standalone handoff page with 4 tabs:
 *  1) Active Handoffs — List submitted/accepted handoff reports for the ward
 *  2) Create Handoff — SBAR-style form per patient, risk flags, todos
 *  3) Accept Handoff — View submitted reports + accept as incoming shift
 *  4) Archive — View past handoff reports
 *
 * VistA-sourced: ORQPT WARD PATIENTS, ORWPS ACTIVE, ORQQAL LIST (for patient assembly).
 * VistA migration target: CRHD (Shift Handoff Tool) — 58 RPCs (not in WorldVistA sandbox).
 * Storage: In-memory on API (resets on restart). See grounding doc for migration plan.
 */

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { csrfHeaders } from '@/lib/csrf';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...opts,
    headers: { ...csrfHeaders(), ...(opts?.headers || {}) },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

type Tab = 'active' | 'create' | 'accept' | 'archive';

interface HandoffSummary {
  id: string;
  ward: string;
  shiftLabel: string;
  shiftStart: string;
  shiftEnd: string;
  createdBy: { duz: string; name: string };
  acceptedBy: { duz: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  acceptedAt: string | null;
  status: string;
  patientCount: number;
}

interface SbarNote {
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
}

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

interface RiskFlag {
  type: string;
  label: string;
  active: boolean;
  note?: string;
}

interface PatientHandoff {
  dfn: string;
  patientName: string;
  roomBed: string;
  sbar: SbarNote;
  todos: TodoItem[];
  riskFlags: RiskFlag[];
  nursingNotes: string;
}

interface HandoffReport {
  id: string;
  ward: string;
  shiftLabel: string;
  shiftStart: string;
  shiftEnd: string;
  createdBy: { duz: string; name: string };
  acceptedBy: { duz: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  acceptedAt: string | null;
  status: string;
  patients: PatientHandoff[];
  shiftNotes: string;
}

interface WardPatient {
  dfn: string;
  name: string;
  roomBed: string;
  activeMedCount: number;
  allergyCount: number;
}

/* ------------------------------------------------------------------ */
/* Styles                                                               */
/* ------------------------------------------------------------------ */

const colors = {
  bg: '#f5f5f5', surface: '#ffffff', border: '#ddd',
  headerBg: '#1a365d', headerText: '#ffffff',
  primary: '#2b6cb0', accent: '#3182ce',
  success: '#38a169', warning: '#d69e2e', danger: '#e53e3e',
  text: '#1a202c', textMuted: '#718096',
  pendingBg: '#fffbeb', pendingBorder: '#f6e05e',
  draftBg: '#ebf8ff', draftBorder: '#90cdf4',
  acceptedBg: '#f0fff4', acceptedBorder: '#9ae6b4',
};

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 };
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 8px', borderRadius: 4,
  border: `1px solid ${colors.border}`, fontSize: 13, boxSizing: 'border-box',
};
const textareaStyle: React.CSSProperties = { ...inputStyle, resize: 'vertical' };
const btnStyle: React.CSSProperties = {
  background: colors.primary, color: '#fff', border: 'none', borderRadius: 4,
  padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
};

/* ------------------------------------------------------------------ */
/* Sub-components                                                       */
/* ------------------------------------------------------------------ */

function StorageBanner() {
  return (
    <div style={{
      background: colors.pendingBg, border: `1px solid ${colors.pendingBorder}`,
      borderRadius: 6, padding: '10px 14px', margin: '0 0 16px 0', fontSize: 13,
    }}>
      <strong style={{ color: '#975a16' }}>Local Storage Mode:</strong>{' '}
      <span style={{ color: '#744210' }}>
        Handoff reports are stored in API process memory and reset on restart.
        VistA migration target: CRHD (Shift Handoff Tool) — 58 RPCs.
        See grounding documentation for migration path.
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    draft: { bg: '#e2e8f0', color: '#4a5568' },
    submitted: { bg: '#fefcbf', color: '#975a16' },
    accepted: { bg: '#c6f6d5', color: '#22543d' },
    archived: { bg: '#e2e8f0', color: '#718096' },
  };
  const c = cfg[status] || cfg.draft;
  return (
    <span style={{
      background: c.bg, color: c.color, borderRadius: 12,
      padding: '2px 10px', fontSize: 11, fontWeight: 600,
    }}>
      {status}
    </span>
  );
}

function RiskFlagBadge({ flag }: { flag: RiskFlag }) {
  if (!flag.active) return null;
  const colorMap: Record<string, string> = {
    falls: '#e53e3e', isolation: '#d69e2e', 'critical-labs': '#e53e3e',
    'code-status': '#805ad5', restraints: '#dd6b20', 'suicide-precautions': '#e53e3e',
    other: '#718096',
  };
  return (
    <span style={{
      background: colorMap[flag.type] || '#718096', color: '#fff', borderRadius: 4,
      padding: '2px 6px', fontSize: 11, fontWeight: 600, marginRight: 4,
    }}>
      {flag.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Active Handoffs Tab                                                  */
/* ------------------------------------------------------------------ */

function ActiveTab({ ward }: { ward: string }) {
  const [reports, setReports] = useState<HandoffSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState<{ ok: boolean; msg: string } | null>(null);

  const loadReports = useCallback(() => {
    if (!ward) return;
    setLoading(true); setError('');
    apiFetch(`/handoff/reports?ward=${encodeURIComponent(ward)}`)
      .then(data => {
        if (data.ok) setReports((data.reports || []).filter((r: HandoffSummary) => r.status !== 'archived'));
        else setError(data.error || 'Failed to load reports');
      })
      .catch(() => setError('Failed to load handoff reports'))
      .finally(() => setLoading(false));
  }, [ward]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handleAction = useCallback(async (id: string, action: 'submit' | 'archive') => {
    setActionMsg(null);
    try {
      const result = await apiFetch(`/handoff/reports/${id}/${action}`, { method: 'POST' });
      if (result.ok) {
        setActionMsg({ ok: true, msg: `Report ${action === 'submit' ? 'submitted' : 'archived'} successfully` });
        loadReports();
      } else {
        setActionMsg({ ok: false, msg: result.error || `Failed to ${action}` });
      }
    } catch {
      setActionMsg({ ok: false, msg: `Failed to ${action} report` });
    }
  }, [loadReports]);

  if (loading) return <div style={{ padding: 20, color: colors.textMuted }}>Loading handoff reports...</div>;
  if (error) return <div style={{ padding: 20, color: colors.danger }}>{error}</div>;

  return (
    <div>
      <StorageBanner />
      <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 12px 0' }}>
        Active Handoff Reports — {ward} ({reports.length})
      </h3>
      {actionMsg && (
        <div style={{
          padding: '8px 12px', borderRadius: 4, marginBottom: 12, fontSize: 13,
          background: actionMsg.ok ? colors.acceptedBg : '#fed7d7',
          border: `1px solid ${actionMsg.ok ? colors.acceptedBorder : '#fc8181'}`,
          color: actionMsg.ok ? '#22543d' : '#c53030',
        }}>
          {actionMsg.msg}
        </div>
      )}
      {reports.length === 0 ? (
        <div style={{ padding: 20, color: colors.textMuted, fontSize: 13 }}>
          No active handoff reports for this ward. Create one in the &quot;Create Handoff&quot; tab.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reports.map(r => (
            <div key={r.id} style={{
              background: colors.surface, border: `1px solid ${colors.border}`,
              borderRadius: 6, padding: 14,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{r.shiftLabel}</div>
                <StatusBadge status={r.status} />
              </div>
              <div style={{ fontSize: 12, color: colors.textMuted }}>
                Created by: {r.createdBy.name} | Patients: {r.patientCount} | {new Date(r.createdAt).toLocaleString()}
              </div>
              {r.acceptedBy && (
                <div style={{ fontSize: 12, color: colors.success, marginTop: 2 }}>
                  Accepted by: {r.acceptedBy.name} at {r.acceptedAt ? new Date(r.acceptedAt).toLocaleString() : '—'}
                </div>
              )}
              <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, fontFamily: 'monospace' }}>
                ID: {r.id}
              </div>
              {/* Action buttons */}
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                {r.status === 'draft' && (
                  <button onClick={() => handleAction(r.id, 'submit')}
                    style={{ ...btnStyle, padding: '4px 12px', fontSize: 12, background: colors.warning }}>
                    Submit for Handoff
                  </button>
                )}
                {r.status === 'accepted' && (
                  <button onClick={() => handleAction(r.id, 'archive')}
                    style={{ ...btnStyle, padding: '4px 12px', fontSize: 12, background: '#718096' }}>
                    Archive
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Create Handoff Tab                                                   */
/* ------------------------------------------------------------------ */

function emptySbar(): SbarNote {
  return { situation: '', background: '', assessment: '', recommendation: '' };
}

const DEFAULT_RISK_FLAGS: RiskFlag[] = [
  { type: 'falls', label: 'Fall Risk', active: false },
  { type: 'isolation', label: 'Isolation', active: false },
  { type: 'critical-labs', label: 'Critical Labs', active: false },
  { type: 'code-status', label: 'Code Status', active: false },
  { type: 'restraints', label: 'Restraints', active: false },
  { type: 'suicide-precautions', label: 'Suicide Precautions', active: false },
];

function CreateTab({ ward }: { ward: string }) {
  const [wardPatients, setWardPatients] = useState<WardPatient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [patientError, setPatientError] = useState('');

  // Shift info
  const [shiftLabel, setShiftLabel] = useState('Day 0700-1900');
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');
  const [shiftNotes, setShiftNotes] = useState('');

  // Per-patient handoff entries
  const [patientEntries, setPatientEntries] = useState<PatientHandoff[]>([]);
  const [selectedPatientIdx, setSelectedPatientIdx] = useState<number | null>(null);

  // Submit result
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; error?: string; id?: string } | null>(null);

  // Set default shift times
  useEffect(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    setShiftStart(`${today}T07:00:00`);
    setShiftEnd(`${today}T19:00:00`);
  }, []);

  // Load ward patients
  const loadPatients = useCallback(async () => {
    if (!ward) return;
    setLoadingPatients(true); setPatientError('');
    try {
      const data = await apiFetch(`/handoff/ward-patients?ward=${encodeURIComponent(ward)}`);
      if (data.ok) {
        const pts = data.patients || [];
        setWardPatients(pts);
        setPatientEntries(pts.map((p: WardPatient) => ({
          dfn: p.dfn,
          patientName: p.name,
          roomBed: p.roomBed || '',
          sbar: emptySbar(),
          todos: [],
          riskFlags: DEFAULT_RISK_FLAGS.map(f => ({ ...f })),
          nursingNotes: '',
        })));
      } else {
        setPatientError(data.error || 'Failed to load patients');
      }
    } catch {
      setPatientError('Failed to load ward patients');
    } finally {
      setLoadingPatients(false);
    }
  }, [ward]);

  const updatePatientEntry = useCallback((idx: number, updates: Partial<PatientHandoff>) => {
    setPatientEntries(prev => prev.map((p, i) => i === idx ? { ...p, ...updates } : p));
  }, []);

  const addTodo = useCallback((patientIdx: number) => {
    setPatientEntries(prev => prev.map((p, i) => {
      if (i !== patientIdx) return p;
      return { ...p, todos: [...p.todos, { id: `new-${Date.now()}`, text: '', completed: false, priority: 'normal' as const }] };
    }));
  }, []);

  const updateTodo = useCallback((patientIdx: number, todoIdx: number, updates: Partial<TodoItem>) => {
    setPatientEntries(prev => prev.map((p, i) => {
      if (i !== patientIdx) return p;
      return { ...p, todos: p.todos.map((t, j) => j === todoIdx ? { ...t, ...updates } : t) };
    }));
  }, []);

  const removeTodo = useCallback((patientIdx: number, todoIdx: number) => {
    setPatientEntries(prev => prev.map((p, i) => {
      if (i !== patientIdx) return p;
      return { ...p, todos: p.todos.filter((_, j) => j !== todoIdx) };
    }));
  }, []);

  const toggleRiskFlag = useCallback((patientIdx: number, flagType: string) => {
    setPatientEntries(prev => prev.map((p, i) => {
      if (i !== patientIdx) return p;
      return { ...p, riskFlags: p.riskFlags.map(f => f.type === flagType ? { ...f, active: !f.active } : f) };
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true); setSubmitResult(null);
    try {
      const result = await apiFetch('/handoff/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ward,
          shiftLabel,
          shiftStart,
          shiftEnd,
          shiftNotes,
          patients: patientEntries,
        }),
      });
      if (result.ok) {
        setSubmitResult({ ok: true, id: result.report?.id });
      } else {
        setSubmitResult({ ok: false, error: result.error || 'Failed to create handoff report' });
      }
    } catch {
      setSubmitResult({ ok: false, error: 'Failed to create handoff report' });
    } finally {
      setSubmitting(false);
    }
  }, [ward, shiftLabel, shiftStart, shiftEnd, shiftNotes, patientEntries]);

  const selected = selectedPatientIdx !== null ? patientEntries[selectedPatientIdx] : null;

  return (
    <div>
      <StorageBanner />

      {/* Shift info */}
      <div style={{
        background: colors.surface, border: `1px solid ${colors.border}`,
        borderRadius: 6, padding: 16, marginBottom: 16,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 12px 0' }}>Shift Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <label htmlFor="shift-label" style={labelStyle}>Shift Label:</label>
            <select id="shift-label" value={shiftLabel} onChange={e => setShiftLabel(e.target.value)} style={inputStyle}>
              <option value="Day 0700-1900">Day 0700-1900</option>
              <option value="Night 1900-0700">Night 1900-0700</option>
              <option value="Evening 1500-2300">Evening 1500-2300</option>
            </select>
          </div>
          <div>
            <label htmlFor="shift-start" style={labelStyle}>Shift Start:</label>
            <input id="shift-start" type="datetime-local" value={shiftStart.replace(':00Z', '').replace('Z', '')}
              onChange={e => setShiftStart(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label htmlFor="shift-end" style={labelStyle}>Shift End:</label>
            <input id="shift-end" type="datetime-local" value={shiftEnd.replace(':00Z', '').replace('Z', '')}
              onChange={e => setShiftEnd(e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label htmlFor="shift-notes" style={labelStyle}>Global Shift Notes:</label>
          <textarea id="shift-notes" value={shiftNotes} onChange={e => setShiftNotes(e.target.value)}
            rows={2} placeholder="Shift-wide notes (staffing, equipment issues, etc.)" style={textareaStyle} />
        </div>
      </div>

      {/* Load patients */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={loadPatients} disabled={loadingPatients}
          style={{ ...btnStyle, opacity: loadingPatients ? 0.6 : 1 }}>
          {loadingPatients ? 'Loading...' : 'Load Ward Patients'}
        </button>
        {patientError && <span style={{ color: colors.danger, fontSize: 13 }}>{patientError}</span>}
        <span style={{ fontSize: 12, color: colors.textMuted }}>
          Ward: {ward} | {wardPatients.length} patients loaded
        </span>
      </div>

      {patientEntries.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
          {/* Patient list */}
          <div style={{
            border: `1px solid ${colors.border}`, borderRadius: 6,
            maxHeight: 600, overflowY: 'auto',
          }}>
            <div style={{
              padding: '8px 12px', fontWeight: 600, fontSize: 13,
              background: '#edf2f7', borderBottom: `1px solid ${colors.border}`,
            }}>
              Patients ({patientEntries.length})
            </div>
            <div role="listbox" aria-label="Ward patients for handoff">
              {patientEntries.map((p, i) => {
                const activeFlags = p.riskFlags.filter(f => f.active).length;
                const hasSbar = !!(p.sbar.situation || p.sbar.background || p.sbar.assessment || p.sbar.recommendation);
                return (
                  <div key={p.dfn}
                    role="option"
                    tabIndex={0}
                    aria-selected={selectedPatientIdx === i}
                    onClick={() => setSelectedPatientIdx(i)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedPatientIdx(i); } }}
                    style={{
                      padding: '8px 12px', cursor: 'pointer',
                      borderBottom: `1px solid ${colors.border}`,
                      background: selectedPatientIdx === i ? '#ebf8ff' : colors.surface,
                    }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{p.patientName || `DFN ${p.dfn}`}</div>
                    <div style={{ fontSize: 11, color: colors.textMuted }}>
                      {p.roomBed || 'No room/bed'} | Todos: {p.todos.length} | Flags: {activeFlags}
                      {hasSbar && <span style={{ color: colors.success }}> ✓ SBAR</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SBAR form for selected patient */}
          <div>
            {!selected ? (
              <div style={{ padding: 20, color: colors.textMuted, fontSize: 13, background: '#f7fafc', borderRadius: 6 }}>
                Select a patient from the list to fill out their SBAR handoff form.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{
                  background: colors.draftBg, border: `1px solid ${colors.draftBorder}`,
                  borderRadius: 6, padding: 12,
                }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
                    SBAR — {selected.patientName || `DFN ${selected.dfn}`}
                  </h4>
                  <div style={{ fontSize: 12, color: colors.textMuted }}>
                    Standardized handoff communication framework
                  </div>
                </div>

                {/* SBAR fields */}
                {(['situation', 'background', 'assessment', 'recommendation'] as const).map(field => {
                  const fieldLabels: Record<string, string> = {
                    situation: 'Situation — What is going on with the patient?',
                    background: 'Background — Relevant history and context',
                    assessment: 'Assessment — Current clinical assessment',
                    recommendation: 'Recommendation — What needs to be done next shift?',
                  };
                  return (
                    <div key={field}>
                      <label htmlFor={`sbar-${field}`} style={labelStyle}>{fieldLabels[field]}</label>
                      <textarea
                        id={`sbar-${field}`}
                        value={selected.sbar[field]}
                        onChange={e => {
                          const newSbar = { ...selected.sbar, [field]: e.target.value };
                          updatePatientEntry(selectedPatientIdx!, { sbar: newSbar });
                        }}
                        rows={3} style={textareaStyle}
                        placeholder={`Enter ${field}...`}
                      />
                    </div>
                  );
                })}

                {/* Risk flags */}
                <div>
                  <div style={labelStyle}>Risk Flags:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selected.riskFlags.map(flag => (
                      <button key={flag.type}
                        onClick={() => toggleRiskFlag(selectedPatientIdx!, flag.type)}
                        style={{
                          padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 500,
                          cursor: 'pointer', border: '1px solid',
                          background: flag.active ? '#fed7d7' : '#edf2f7',
                          color: flag.active ? '#c53030' : '#4a5568',
                          borderColor: flag.active ? '#fc8181' : '#cbd5e0',
                        }}>
                        {flag.active ? '●' : '○'} {flag.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nursing notes */}
                <div>
                  <label htmlFor="nursing-notes" style={labelStyle}>Nursing Notes:</label>
                  <textarea id="nursing-notes" value={selected.nursingNotes}
                    onChange={e => updatePatientEntry(selectedPatientIdx!, { nursingNotes: e.target.value })}
                    rows={2} style={textareaStyle} placeholder="Free-text nursing notes for handoff..." />
                </div>

                {/* Todos */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={labelStyle}>To-Do Items:</span>
                    <button onClick={() => addTodo(selectedPatientIdx!)}
                      style={{ ...btnStyle, padding: '4px 10px', fontSize: 12 }}>
                      + Add Todo
                    </button>
                  </div>
                  {selected.todos.length === 0 ? (
                    <div style={{ fontSize: 12, color: colors.textMuted, padding: '8px 0' }}>No to-do items yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {selected.todos.map((todo, ti) => (
                        <div key={todo.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input type="checkbox" checked={todo.completed}
                            onChange={e => updateTodo(selectedPatientIdx!, ti, { completed: e.target.checked })}
                            aria-label={`Mark todo ${ti + 1} complete`}
                          />
                          <input type="text" value={todo.text}
                            onChange={e => updateTodo(selectedPatientIdx!, ti, { text: e.target.value })}
                            placeholder="Describe task..."
                            style={{ ...inputStyle, flex: 1 }}
                            aria-label={`Todo ${ti + 1} text`}
                          />
                          <select value={todo.priority}
                            onChange={e => updateTodo(selectedPatientIdx!, ti, { priority: e.target.value as TodoItem['priority'] })}
                            style={{ padding: '4px 6px', borderRadius: 4, border: `1px solid ${colors.border}`, fontSize: 12 }}
                            aria-label={`Todo ${ti + 1} priority`}>
                            <option value="low">Low</option>
                            <option value="normal">Normal</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                          <button onClick={() => removeTodo(selectedPatientIdx!, ti)}
                            style={{ background: 'transparent', border: 'none', color: colors.danger, cursor: 'pointer', fontSize: 14 }}
                            aria-label={`Remove todo ${ti + 1}`}>
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit */}
      {patientEntries.length > 0 && (
        <div style={{ marginTop: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={handleSubmit} disabled={submitting}
            style={{ ...btnStyle, background: colors.success, padding: '10px 24px', fontSize: 14, opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Creating...' : 'Create Handoff Report'}
          </button>
          {submitResult && (
            <span style={{ fontSize: 13, color: submitResult.ok ? colors.success : colors.danger }}>
              {submitResult.ok ? `Created: ${submitResult.id}` : submitResult.error}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Accept Handoff Tab                                                   */
/* ------------------------------------------------------------------ */

function AcceptTab({ ward }: { ward: string }) {
  const [reports, setReports] = useState<HandoffSummary[]>([]);
  const [selectedReport, setSelectedReport] = useState<HandoffReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionResult, setActionResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (!ward) return;
    setLoading(true); setError('');
    setSelectedReport(null); setActionResult(null);
    apiFetch(`/handoff/reports?ward=${encodeURIComponent(ward)}&status=submitted`)
      .then(data => {
        if (data.ok) setReports(data.reports || []);
        else setError(data.error || 'Failed to load');
      })
      .catch(() => setError('Failed to load submitted handoffs'))
      .finally(() => setLoading(false));
  }, [ward]);

  const loadDetail = useCallback(async (id: string) => {
    setActionResult(null);
    try {
      const data = await apiFetch(`/handoff/reports/${id}`);
      if (data.ok) setSelectedReport(data.report);
      else setError(data.error || 'Failed to load detail');
    } catch {
      setError('Failed to load handoff detail');
    }
  }, []);

  const handleAccept = useCallback(async (id: string) => {
    try {
      const result = await apiFetch(`/handoff/reports/${id}/accept`, { method: 'POST' });
      if (result.ok) {
        setActionResult({ ok: true, msg: 'Handoff accepted successfully' });
        setSelectedReport(result.report);
        // Refresh list
        setReports(prev => prev.filter(r => r.id !== id));
      } else {
        setActionResult({ ok: false, msg: result.error || 'Failed to accept' });
      }
    } catch {
      setActionResult({ ok: false, msg: 'Failed to accept handoff' });
    }
  }, []);

  if (loading) return <div style={{ padding: 20, color: colors.textMuted }}>Loading submitted handoffs...</div>;
  if (error) return <div style={{ padding: 20, color: colors.danger }}>{error}</div>;

  return (
    <div>
      <StorageBanner />
      <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 12px 0' }}>
        Submitted Handoffs Awaiting Acceptance — {ward}
      </h3>

      {reports.length === 0 && !selectedReport ? (
        <div style={{ padding: 20, color: colors.textMuted, fontSize: 13 }}>
          No submitted handoff reports awaiting acceptance for this ward.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 }}>
          {/* Report list */}
          <div style={{ border: `1px solid ${colors.border}`, borderRadius: 6 }}>
            {reports.map(r => (
              <div key={r.id}
                onClick={() => loadDetail(r.id)}
                role="button" tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); loadDetail(r.id); } }}
                style={{
                  padding: '10px 12px', cursor: 'pointer',
                  borderBottom: `1px solid ${colors.border}`,
                  background: selectedReport?.id === r.id ? '#ebf8ff' : colors.surface,
                }}>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{r.shiftLabel}</div>
                <div style={{ fontSize: 12, color: colors.textMuted }}>
                  From: {r.createdBy.name} | {r.patientCount} patients
                </div>
                <div style={{ fontSize: 11, color: colors.textMuted }}>
                  {new Date(r.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* Detail view + accept */}
          <div>
            {!selectedReport ? (
              <div style={{ padding: 20, color: colors.textMuted, fontSize: 13 }}>
                Select a submitted handoff to review and accept.
              </div>
            ) : (
              <div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 12,
                }}>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{selectedReport.shiftLabel}</h4>
                    <div style={{ fontSize: 12, color: colors.textMuted }}>
                      From: {selectedReport.createdBy.name} | {selectedReport.patients.length} patients
                    </div>
                  </div>
                  {selectedReport.status === 'submitted' && (
                    <button onClick={() => handleAccept(selectedReport.id)}
                      style={{ ...btnStyle, background: colors.success }}>
                      Accept Handoff
                    </button>
                  )}
                  {selectedReport.status === 'accepted' && (
                    <StatusBadge status="accepted" />
                  )}
                </div>

                {actionResult && (
                  <div style={{
                    padding: '8px 12px', borderRadius: 4, marginBottom: 12, fontSize: 13,
                    background: actionResult.ok ? colors.acceptedBg : '#fed7d7',
                    border: `1px solid ${actionResult.ok ? colors.acceptedBorder : '#fc8181'}`,
                    color: actionResult.ok ? '#22543d' : '#c53030',
                  }}>
                    {actionResult.msg}
                  </div>
                )}

                {selectedReport.shiftNotes && (
                  <div style={{
                    background: '#f7fafc', border: `1px solid ${colors.border}`,
                    borderRadius: 6, padding: 12, marginBottom: 12, fontSize: 13,
                  }}>
                    <strong>Shift Notes:</strong> {selectedReport.shiftNotes}
                  </div>
                )}

                {/* Patient details */}
                {selectedReport.patients.map((p, i) => (
                  <div key={p.dfn || i} style={{
                    background: colors.surface, border: `1px solid ${colors.border}`,
                    borderRadius: 6, padding: 14, marginBottom: 10,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{p.patientName || `DFN ${p.dfn}`}</div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {p.riskFlags.filter(f => f.active).map(f => (
                          <RiskFlagBadge key={f.type} flag={f} />
                        ))}
                      </div>
                    </div>

                    {/* SBAR sections */}
                    {(['situation', 'background', 'assessment', 'recommendation'] as const).map(field => {
                      const val = p.sbar[field];
                      if (!val) return null;
                      return (
                        <div key={field} style={{ marginBottom: 6 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: colors.primary, textTransform: 'uppercase' }}>
                            {field.charAt(0)}: {field}
                          </div>
                          <div style={{ fontSize: 13, color: colors.text, padding: '2px 0 2px 8px', borderLeft: `2px solid ${colors.draftBorder}` }}>
                            {val}
                          </div>
                        </div>
                      );
                    })}

                    {/* Todos */}
                    {p.todos.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>To-Do Items:</div>
                        {p.todos.map((t, ti) => (
                          <div key={t.id || ti} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, marginBottom: 2 }}>
                            <span>{t.completed ? '☑' : '☐'}</span>
                            <span style={{ textDecoration: t.completed ? 'line-through' : 'none' }}>{t.text}</span>
                            <span style={{
                              fontSize: 10, padding: '1px 4px', borderRadius: 3,
                              background: t.priority === 'urgent' ? '#fed7d7' : t.priority === 'high' ? '#fefcbf' : '#edf2f7',
                              color: t.priority === 'urgent' ? '#c53030' : t.priority === 'high' ? '#975a16' : '#4a5568',
                            }}>
                              {t.priority}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {p.nursingNotes && (
                      <div style={{ marginTop: 6, fontSize: 12, color: '#4a5568', fontStyle: 'italic' }}>
                        Notes: {p.nursingNotes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Archive Tab                                                          */
/* ------------------------------------------------------------------ */

function ArchiveTab({ ward }: { ward: string }) {
  const [reports, setReports] = useState<HandoffSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ward) return;
    setLoading(true); setError('');
    apiFetch(`/handoff/reports?ward=${encodeURIComponent(ward)}&status=archived`)
      .then(data => {
        if (data.ok) setReports(data.reports || []);
        else setError(data.error || 'Failed to load');
      })
      .catch(() => setError('Failed to load archived handoffs'))
      .finally(() => setLoading(false));
  }, [ward]);

  if (loading) return <div style={{ padding: 20, color: colors.textMuted }}>Loading archive...</div>;
  if (error) return <div style={{ padding: 20, color: colors.danger }}>{error}</div>;

  return (
    <div>
      <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 12px 0' }}>
        Archived Handoffs — {ward} ({reports.length})
      </h3>
      {reports.length === 0 ? (
        <div style={{ padding: 20, color: colors.textMuted, fontSize: 13 }}>
          No archived handoff reports for this ward.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {reports.map(r => (
            <div key={r.id} style={{
              background: colors.surface, border: `1px solid ${colors.border}`,
              borderRadius: 6, padding: 12, opacity: 0.8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 500, fontSize: 13 }}>{r.shiftLabel}</span>
                  <span style={{ fontSize: 12, color: colors.textMuted, marginLeft: 8 }}>
                    {r.createdBy.name} → {r.acceptedBy?.name || '(not accepted)'}
                  </span>
                </div>
                <StatusBadge status="archived" />
              </div>
              <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                {new Date(r.createdAt).toLocaleString()} | {r.patientCount} patients | ID: {r.id}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Page Content                                                    */
/* ------------------------------------------------------------------ */

function HandoffPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const wardParam = searchParams.get('ward') || '';

  const [tab, setTab] = useState<Tab>('active');
  const [ward, setWard] = useState(wardParam);
  const [wardInput, setWardInput] = useState(wardParam);

  const handleWardChange = useCallback(() => {
    const val = wardInput.trim().toUpperCase();
    if (val) {
      setWard(val);
      router.replace(`/cprs/handoff?ward=${encodeURIComponent(val)}`);
    }
  }, [wardInput, router]);

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'active', label: 'Active Handoffs' },
    { key: 'create', label: 'Create Handoff' },
    { key: 'accept', label: 'Accept Handoff' },
    { key: 'archive', label: 'Archive' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: colors.bg }}>
      {/* Header */}
      <div style={{
        background: colors.headerBg, color: colors.headerText,
        padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => router.push('/cprs/inpatient')}
            style={{
              background: 'rgba(255,255,255,0.15)', color: colors.headerText,
              border: 'none', borderRadius: 4, padding: '6px 12px', cursor: 'pointer', fontSize: 13,
            }}>
            Back to Inpatient
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
            Shift Handoff — Signout
          </h1>
        </div>
        <div style={{ fontSize: 13, opacity: 0.9, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>Phase 86 — VistA-first + CRHD posture</span>
          <button onClick={() => window.print()}
            style={{
              background: 'rgba(255,255,255,0.15)', color: colors.headerText,
              border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12,
            }}>
            Print / Export
          </button>
        </div>
      </div>

      {/* Ward selector */}
      <div style={{
        background: '#2d3748', color: '#e2e8f0', padding: '8px 20px',
        display: 'flex', alignItems: 'center', gap: 12, fontSize: 13,
      }}>
        <label htmlFor="ward-select" style={{ fontWeight: 600 }}>Ward/Service:</label>
        <input
          id="ward-select"
          type="text"
          value={wardInput}
          onChange={e => setWardInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleWardChange(); }}
          placeholder="Enter ward (e.g., 3EAST, SURG)"
          style={{
            width: 160, padding: '4px 8px', borderRadius: 3,
            border: '1px solid #4a5568', background: '#1a202c', color: '#e2e8f0',
            fontFamily: 'monospace', fontSize: 13,
          }}
        />
        <button onClick={handleWardChange}
          style={{
            background: '#4a5568', color: '#e2e8f0', border: 'none',
            borderRadius: 3, padding: '4px 12px', cursor: 'pointer', fontSize: 12,
          }}>
          Go
        </button>
        {ward && <span style={{ opacity: 0.8 }}>Current: <strong>{ward}</strong></span>}
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', borderBottom: `2px solid ${colors.border}`,
        background: colors.surface, padding: '0 20px',
      }} role="tablist" aria-label="Handoff tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 16px', fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? colors.primary : colors.textMuted,
              background: 'transparent', border: 'none', cursor: 'pointer',
              borderBottom: tab === t.key ? `2px solid ${colors.primary}` : '2px solid transparent',
              marginBottom: -2,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: 20, maxWidth: 1200 }} role="tabpanel" aria-label={`${tab} panel`}>
        {!ward ? (
          <div style={{ padding: 30, textAlign: 'center', color: colors.textMuted, fontSize: 14 }}>
            Enter a ward or service name above to begin.
          </div>
        ) : (
          <>
            {tab === 'active' && <ActiveTab ward={ward} />}
            {tab === 'create' && <CreateTab ward={ward} />}
            {tab === 'accept' && <AcceptTab ward={ward} />}
            {tab === 'archive' && <ArchiveTab ward={ward} />}
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Default export with Suspense boundary                                */
/* ------------------------------------------------------------------ */

export default function HandoffPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading Shift Handoff...</div>}>
      <HandoffPageContent />
    </Suspense>
  );
}
