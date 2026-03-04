'use client';

/**
 * Phase 84 — Nursing Documentation + Flowsheets
 *
 * Standalone nursing page with patient context banner and 3 tabs:
 *  1) Nursing Notes (shift/progress notes, create new, view existing)
 *  2) Flowsheets (vitals trend + I&O + assessments shells)
 *  3) Tasks (due vitals, safety checks, med pass reminders)
 *
 * VistA-sourced: ORQQVI VITALS, TIU DOCUMENTS BY CONTEXT, TIU CREATE RECORD,
 *   TIU GET RECORD TEXT. I&O + assessments integration-pending with named targets.
 */

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { csrfHeaders } from '@/lib/csrf';
import { API_BASE } from '@/lib/api-config';

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

type Tab = 'notes' | 'flowsheets' | 'tasks';

interface PatientContext {
  dfn: string;
  name: string;
  location: string;
  roomBed: string;
  attending: string;
}

interface VitalItem {
  date: string;
  type: string;
  value: string;
  units: string;
  critical?: boolean;
}

interface NoteItem {
  ien: string;
  title: string;
  date: string;
  author: string;
  status: string;
}

interface PendingTarget {
  rpc: string;
  package: string;
  reason: string;
}

interface VistaGrounding {
  vistaFiles: string[];
  targetRoutines: string[];
  migrationPath: string;
  sandboxNote: string;
}

interface Thresholds {
  [type: string]: { low?: number; high?: number; unit: string };
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'notes', label: 'Nursing Notes' },
  { id: 'flowsheets', label: 'Flowsheets' },
  { id: 'tasks', label: 'Tasks & Reminders' },
];

/* ------------------------------------------------------------------ */
/* Styles                                                               */
/* ------------------------------------------------------------------ */

const S = {
  page: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '16px',
    fontFamily: "'Segoe UI', Tahoma, sans-serif",
  } as React.CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  } as React.CSSProperties,
  title: { margin: 0, fontSize: '18px', fontWeight: 700, color: '#1a365d' } as React.CSSProperties,
  sourceTag: {
    fontSize: '10px',
    padding: '2px 6px',
    background: '#c6f6d5',
    color: '#276749',
    borderRadius: '4px',
    fontWeight: 600,
  } as React.CSSProperties,
  tabBar: {
    display: 'flex',
    gap: 0,
    borderBottom: '2px solid #e2e8f0',
    marginBottom: '16px',
  } as React.CSSProperties,
  tab: (active: boolean): React.CSSProperties => ({
    padding: '8px 20px',
    fontSize: '13px',
    fontWeight: active ? 700 : 500,
    background: active ? '#ebf8ff' : 'transparent',
    border: 'none',
    cursor: 'pointer',
    borderBottom: active ? '3px solid #2b6cb0' : '3px solid transparent',
    color: active ? '#2b6cb0' : '#4a5568',
    transition: 'all .15s',
  }),
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '16px',
    marginBottom: '12px',
  } as React.CSSProperties,
  label: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#4a5568',
    marginBottom: '4px',
  } as React.CSSProperties,
  error: {
    padding: '10px 14px',
    background: '#fed7d7',
    border: '1px solid #fc8181',
    borderRadius: '6px',
    color: '#c53030',
    fontSize: '13px',
    marginBottom: '12px',
  } as React.CSSProperties,
  loading: { padding: '24px', textAlign: 'center' as const, color: '#a0aec0', fontSize: '13px' },
  pendingBanner: {
    background: '#fffbeb',
    border: '1px solid #f6e05e',
    borderRadius: '6px',
    padding: '12px 16px',
    marginBottom: '12px',
  } as React.CSSProperties,
  pendingTitle: {
    fontWeight: 700,
    fontSize: '13px',
    color: '#975a16',
    marginBottom: '4px',
  } as React.CSSProperties,
  pendingText: { fontSize: '12px', color: '#744210', lineHeight: 1.5 } as React.CSSProperties,
  codeBlock: {
    background: '#f7fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    padding: '8px 12px',
    fontSize: '11px',
    fontFamily: 'Consolas, monospace',
    marginTop: '8px',
    lineHeight: 1.6,
    color: '#2d3748',
  } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '12px' },
  th: {
    padding: '6px 10px',
    textAlign: 'left' as const,
    borderBottom: '2px solid #e2e8f0',
    fontWeight: 600,
    color: '#4a5568',
    background: '#f7fafc',
    fontSize: '11px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  td: { padding: '6px 10px', borderBottom: '1px solid #edf2f7', color: '#2d3748' },
  badge: (color: string): React.CSSProperties => ({
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 600,
    background:
      color === 'red'
        ? '#fed7d7'
        : color === 'green'
          ? '#c6f6d5'
          : color === 'yellow'
            ? '#fefcbf'
            : '#bee3f8',
    color:
      color === 'red'
        ? '#c53030'
        : color === 'green'
          ? '#276749'
          : color === 'yellow'
            ? '#975a16'
            : '#2b6cb0',
  }),
  actionBtn: (disabled: boolean): React.CSSProperties => ({
    padding: '6px 16px',
    fontSize: '12px',
    fontWeight: 600,
    borderRadius: '4px',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    color: '#fff',
    background: disabled ? '#cbd5e0' : '#2b6cb0',
    opacity: disabled ? 0.6 : 1,
  }),
  criticalRow: { background: '#fff5f5', borderLeft: '3px solid #e53e3e' } as React.CSSProperties,
  banner: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '10px 16px',
    background: '#ebf8ff',
    border: '1px solid #90cdf4',
    borderRadius: '6px',
    marginBottom: '16px',
  } as React.CSSProperties,
  bannerName: { fontWeight: 700, fontSize: '15px', color: '#1a365d' } as React.CSSProperties,
  bannerDetail: { fontSize: '12px', color: '#4a5568' } as React.CSSProperties,
  modal: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modalContent: {
    background: '#fff',
    borderRadius: '8px',
    padding: '24px',
    minWidth: '500px',
    maxWidth: '700px',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
  } as React.CSSProperties,
  textarea: {
    width: '100%',
    minHeight: '200px',
    padding: '10px',
    fontSize: '13px',
    fontFamily: "'Segoe UI', Tahoma, sans-serif",
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    resize: 'vertical' as const,
  } as React.CSSProperties,
  selectInput: {
    padding: '6px 10px',
    fontSize: '13px',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    background: '#fff',
    minWidth: '180px',
  } as React.CSSProperties,
  pendingTag: {
    display: 'inline-block',
    padding: '1px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 600,
    background: '#fefcbf',
    color: '#975a16',
  } as React.CSSProperties,
  dueIndicator: (overdue: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
    background: overdue ? '#fed7d7' : '#c6f6d5',
    color: overdue ? '#c53030' : '#276749',
  }),
  trendGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '12px',
  } as React.CSSProperties,
  trendCard: {
    background: '#f7fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '12px',
  } as React.CSSProperties,
  trendTitle: {
    fontWeight: 700,
    fontSize: '13px',
    color: '#2d3748',
    marginBottom: '6px',
  } as React.CSSProperties,
  trendValue: { fontSize: '20px', fontWeight: 700, color: '#2b6cb0' } as React.CSSProperties,
};

/* ------------------------------------------------------------------ */
/* Patient Context Banner                                               */
/* ------------------------------------------------------------------ */

function PatientBanner({ patient, dfn }: { patient: PatientContext | null; dfn: string }) {
  if (!patient) return null;
  return (
    <div style={S.banner}>
      <div>
        <div style={S.bannerName}>{patient.name || `Patient ${dfn}`}</div>
        <div style={S.bannerDetail}>DFN: {dfn}</div>
      </div>
      {patient.location && (
        <div>
          <div style={S.label}>Location</div>
          <div style={{ fontSize: '13px', color: '#2d3748' }}>{patient.location}</div>
        </div>
      )}
      {patient.roomBed && (
        <div>
          <div style={S.label}>Room/Bed</div>
          <div style={{ fontSize: '13px', color: '#2d3748' }}>{patient.roomBed}</div>
        </div>
      )}
      {patient.attending && (
        <div>
          <div style={S.label}>Attending</div>
          <div style={{ fontSize: '13px', color: '#2d3748' }}>{patient.attending}</div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Integration Pending Banner                                           */
/* ------------------------------------------------------------------ */

function IntegrationPendingSection({
  title,
  targets,
  grounding,
}: {
  title: string;
  targets: PendingTarget[];
  grounding?: VistaGrounding | null;
}) {
  return (
    <div style={S.pendingBanner}>
      <div style={S.pendingTitle}>{title} — Integration Pending</div>
      <div style={S.pendingText}>
        {targets.map((t, i) => (
          <div key={i}>
            <code>{t.rpc}</code> ({t.package}) — {t.reason}
          </div>
        ))}
      </div>
      {grounding && (
        <div style={S.codeBlock}>
          <div>
            <strong>VistA Files:</strong> {grounding.vistaFiles.join(', ')}
          </div>
          <div>
            <strong>M Routines:</strong> {grounding.targetRoutines.join(', ')}
          </div>
          <div>
            <strong>Migration Path:</strong> {grounding.migrationPath}
          </div>
          <div>
            <strong>Sandbox Note:</strong> {grounding.sandboxNote}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 1: Nursing Notes                                                 */
/* ------------------------------------------------------------------ */

function NotesTab({ dfn }: { dfn: string }) {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState<any>(null);
  const [noteText, setNoteText] = useState('');
  const [noteTitle, setNoteTitle] = useState('NURSING NOTE');
  const [noteShift, setNoteShift] = useState('Day');
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  const [selectedNoteText, setSelectedNoteText] = useState<string>('');
  const [loadingText, setLoadingText] = useState(false);
  const [rpcUsed, setRpcUsed] = useState<string[]>([]);
  const [pendingTargets, setPendingTargets] = useState<PendingTarget[]>([]);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`/vista/nursing/notes?dfn=${dfn}`);
      setNotes(data.items || []);
      setRpcUsed(data.rpcUsed || []);
      setPendingTargets(data.pendingTargets || []);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }, [dfn]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleCreate = async () => {
    if (!noteText.trim()) return;
    setCreating(true);
    setCreateResult(null);
    try {
      const data = await apiFetch('/vista/nursing/notes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dfn, title: noteTitle, text: noteText, shift: noteShift }),
      });
      setCreateResult(data);
      if (data.ok) {
        setNoteText('');
        await loadNotes(); // Refresh list
        // Auto-close modal after 1.5s on success
        setTimeout(() => {
          setShowCreate(false);
          setCreateResult(null);
        }, 1500);
      }
    } catch (err: any) {
      setCreateResult({ ok: false, error: err.message });
    }
    setCreating(false);
  };

  const viewNoteText = async (note: NoteItem) => {
    setSelectedNote(note);
    setLoadingText(true);
    try {
      const data = await apiFetch(`/vista/nursing/note-text?ien=${note.ien}`);
      setSelectedNoteText(data.text || '(No text available)');
    } catch {
      setSelectedNoteText('(Unable to retrieve note text)');
    }
    setLoadingText(false);
  };

  return (
    <div>
      {/* Controls row */}
      <div
        style={{
          ...S.card,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <span style={{ fontWeight: 600, fontSize: '14px', color: '#2d3748' }}>Nursing Notes</span>
          {notes.length > 0 && (
            <span style={{ ...S.badge('blue'), marginLeft: '8px' }}>{notes.length}</span>
          )}
        </div>
        <button style={S.actionBtn(false)} onClick={() => setShowCreate(true)}>
          + New Nursing Note
        </button>
      </div>

      {pendingTargets.length > 0 && (
        <IntegrationPendingSection title="Notes" targets={pendingTargets} />
      )}

      {error && <div style={S.error}>{error}</div>}
      {loading && <div style={S.loading}>Loading nursing notes...</div>}

      {/* Notes table */}
      {!loading && notes.length > 0 && (
        <div style={S.card}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Date</th>
                <th style={S.th}>Title</th>
                <th style={S.th}>Author</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {notes.map((n) => (
                <tr key={n.ien}>
                  <td style={S.td}>{n.date}</td>
                  <td style={S.td}>{n.title}</td>
                  <td style={S.td}>{n.author}</td>
                  <td style={S.td}>
                    <span style={S.badge(n.status === 'SIGNED' ? 'green' : 'yellow')}>
                      {n.status || 'unsigned'}
                    </span>
                  </td>
                  <td style={S.td}>
                    <button
                      style={{ ...S.actionBtn(false), padding: '3px 10px', fontSize: '11px' }}
                      onClick={() => viewNoteText(n)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rpcUsed.length > 0 && (
            <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '8px' }}>
              RPC: {rpcUsed.join(', ')}
            </div>
          )}
        </div>
      )}

      {!loading && notes.length === 0 && !error && (
        <div style={{ ...S.card, textAlign: 'center', color: '#a0aec0' }}>
          No nursing notes found for this patient.
        </div>
      )}

      {/* Create Note Modal */}
      {showCreate && (
        <div style={S.modal} onClick={() => !creating && setShowCreate(false)}>
          <div style={S.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#1a365d' }}>
              New Nursing Note
            </h3>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div>
                <div style={S.label}>Note Type</div>
                <select
                  style={S.selectInput}
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                >
                  <option value="NURSING NOTE">Nursing Note</option>
                  <option value="SHIFT ASSESSMENT">Shift Assessment</option>
                  <option value="PROGRESS NOTE - NURSING">Progress Note (Nursing)</option>
                  <option value="PATIENT EDUCATION">Patient Education</option>
                  <option value="DISCHARGE PLANNING NOTE">Discharge Planning</option>
                </select>
              </div>
              <div>
                <div style={S.label}>Shift</div>
                <select
                  style={S.selectInput}
                  value={noteShift}
                  onChange={(e) => setNoteShift(e.target.value)}
                >
                  <option value="Day">Day (0700-1900)</option>
                  <option value="Night">Night (1900-0700)</option>
                  <option value="Evening">Evening</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div style={S.label}>Note Text</div>
              <textarea
                style={S.textarea}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Enter nursing note text...&#10;&#10;S: Patient reports...&#10;O: Vital signs...&#10;A: Assessment...&#10;P: Plan of care..."
              />
            </div>

            {createResult && (
              <div
                style={
                  createResult.ok
                    ? {
                        padding: '8px 12px',
                        background: '#c6f6d5',
                        borderRadius: '4px',
                        marginBottom: '12px',
                        fontSize: '12px',
                        color: '#276749',
                      }
                    : {
                        padding: '8px 12px',
                        background: '#fed7d7',
                        borderRadius: '4px',
                        marginBottom: '12px',
                        fontSize: '12px',
                        color: '#c53030',
                      }
                }
              >
                {createResult.ok
                  ? `Note ${createResult.source === 'local-draft' ? 'saved as local draft' : 'created in VistA'} (${createResult.status})`
                  : `Error: ${createResult.error || createResult._error}`}
                {createResult.source === 'local-draft' && (
                  <div style={{ fontSize: '11px', marginTop: '4px', color: '#975a16' }}>
                    Draft ID: {createResult.draftId} — Will persist to VistA when TIU Nursing Note
                    class is configured.
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                style={{ ...S.actionBtn(false), background: '#718096' }}
                onClick={() => {
                  setShowCreate(false);
                  setCreateResult(null);
                }}
                disabled={creating}
              >
                Cancel
              </button>
              <button
                style={S.actionBtn(!noteText.trim() || creating)}
                onClick={handleCreate}
                disabled={!noteText.trim() || creating}
              >
                {creating ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Note Text Modal */}
      {selectedNote && (
        <div style={S.modal} onClick={() => setSelectedNote(null)}>
          <div style={S.modalContent} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '16px', color: '#1a365d' }}>
                {selectedNote.title}
              </h3>
              <button
                onClick={() => setSelectedNote(null)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: '#a0aec0',
                }}
              >
                &times;
              </button>
            </div>
            <div style={{ fontSize: '12px', color: '#718096', marginBottom: '12px' }}>
              {selectedNote.date} — {selectedNote.author} — {selectedNote.status}
            </div>
            {loadingText ? (
              <div style={S.loading}>Loading note text...</div>
            ) : (
              <pre
                style={{
                  ...S.codeBlock,
                  whiteSpace: 'pre-wrap',
                  fontSize: '13px',
                  minHeight: '100px',
                }}
              >
                {selectedNoteText}
              </pre>
            )}
            <div style={{ marginTop: '12px', textAlign: 'right' }}>
              <button
                style={{ ...S.actionBtn(false), background: '#718096' }}
                onClick={() => setSelectedNote(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 2: Flowsheets (Vitals + I&O + Assessments)                      */
/* ------------------------------------------------------------------ */

function FlowsheetsTab({ dfn }: { dfn: string }) {
  const [subTab, setSubTab] = useState<'vitals' | 'io' | 'assessments'>('vitals');

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        {(['vitals', 'io', 'assessments'] as const).map((st) => (
          <button
            key={st}
            style={{
              padding: '4px 14px',
              fontSize: '12px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              background: subTab === st ? '#2b6cb0' : '#fff',
              color: subTab === st ? '#fff' : '#4a5568',
              cursor: 'pointer',
              fontWeight: subTab === st ? 600 : 400,
            }}
            onClick={() => setSubTab(st)}
          >
            {st === 'vitals' ? 'Vitals Trends' : st === 'io' ? 'I&O' : 'Assessments'}
          </button>
        ))}
      </div>

      {subTab === 'vitals' && <VitalsTrendSection dfn={dfn} />}
      {subTab === 'io' && <IOSection dfn={dfn} />}
      {subTab === 'assessments' && <AssessmentsSection dfn={dfn} />}
    </div>
  );
}

/* -- Vitals Trend Section -- */

function VitalsTrendSection({ dfn }: { dfn: string }) {
  const [data, setData] = useState<any>(null);
  const [thresholds, setThresholds] = useState<Thresholds>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.allSettled([
      apiFetch(`/vista/nursing/flowsheet?dfn=${dfn}`),
      apiFetch('/vista/nursing/critical-thresholds'),
    ])
      .then(([flowResult, threshResult]) => {
        if (flowResult.status === 'fulfilled') {
          const flowData = flowResult.value;
          if (flowData.ok === false) {
            setError(flowData._error || 'VistA communication failed');
          }
          setData(flowData);
        } else {
          setError(flowResult.reason?.message || 'Failed to load flowsheet');
        }
        if (threshResult.status === 'fulfilled') {
          setThresholds(threshResult.value.thresholds || {});
        }
      })
      .finally(() => setLoading(false));
  }, [dfn]);

  if (loading) return <div style={S.loading}>Loading vitals flowsheet...</div>;
  if (error) return <div style={S.error}>{error}</div>;
  if (!data) return null;

  const trends = data.trends || {};
  const items: VitalItem[] = data.items || [];

  return (
    <div>
      {/* Due/Overdue indicator */}
      <div style={{ ...S.card, display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={S.dueIndicator(data.overdue)}>
          {data.overdue ? '⚠ OVERDUE' : '✓ On Schedule'}
        </div>
        <div style={{ fontSize: '12px', color: '#4a5568' }}>
          Next vitals due:{' '}
          {data.nextVitalsDue !== 'Unknown'
            ? new Date(data.nextVitalsDue).toLocaleString()
            : 'Unknown (no vitals recorded)'}
        </div>
        {data.criticalCount > 0 && (
          <span style={S.badge('red')}>{data.criticalCount} critical value(s)</span>
        )}
      </div>

      {/* Vital type trend cards */}
      <div style={S.trendGrid}>
        {Object.entries(trends).map(([type, values]) => {
          const vals = values as Array<{ date: string; value: string; units: string }>;
          const latest = vals[0];
          const thresh = thresholds[type];
          const num = latest ? parseFloat(latest.value.split('/')[0]) : NaN;
          let isCritical = false;
          if (thresh && !isNaN(num)) {
            if (thresh.high !== undefined && num >= thresh.high) isCritical = true;
            if (thresh.low !== undefined && num <= thresh.low) isCritical = true;
          }

          return (
            <div
              key={type}
              style={{
                ...S.trendCard,
                ...(isCritical
                  ? { borderColor: '#e53e3e', borderWidth: '2px', background: '#fff5f5' }
                  : {}),
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={S.trendTitle}>{type}</div>
                {isCritical && <span style={S.badge('red')}>CRITICAL</span>}
              </div>
              <div style={S.trendValue}>
                {latest?.value || '—'}
                <span
                  style={{ fontSize: '12px', color: '#718096', fontWeight: 400, marginLeft: '4px' }}
                >
                  {latest?.units || thresh?.unit || ''}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '4px' }}>
                {latest?.date || 'No data'} — {vals.length} reading{vals.length !== 1 ? 's' : ''}
              </div>
              {thresh && (
                <div style={{ fontSize: '10px', color: '#718096', marginTop: '2px' }}>
                  Range: {thresh.low !== undefined ? `${thresh.low}` : '—'} –{' '}
                  {thresh.high !== undefined ? `${thresh.high}` : '—'} {thresh.unit}
                </div>
              )}
            </div>
          );
        })}
        {Object.keys(trends).length === 0 && (
          <div
            style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#a0aec0', padding: '24px' }}
          >
            No vitals data available for flowsheet.
          </div>
        )}
      </div>

      {/* Detailed vitals table with critical highlighting */}
      {items.length > 0 && (
        <div style={{ ...S.card, marginTop: '12px' }}>
          <div style={{ fontWeight: 600, fontSize: '13px', color: '#2d3748', marginBottom: '8px' }}>
            All Vitals
          </div>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Date/Time</th>
                <th style={S.th}>Type</th>
                <th style={S.th}>Value</th>
                <th style={S.th}>Units</th>
                <th style={S.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((v, i) => (
                <tr key={i} style={v.critical ? S.criticalRow : {}}>
                  <td style={S.td}>{v.date}</td>
                  <td style={S.td}>{v.type}</td>
                  <td
                    style={{
                      ...S.td,
                      fontWeight: v.critical ? 700 : 400,
                      color: v.critical ? '#c53030' : '#2d3748',
                    }}
                  >
                    {v.value}
                  </td>
                  <td style={S.td}>{v.units}</td>
                  <td style={S.td}>
                    {v.critical ? (
                      <span style={S.badge('red')}>CRITICAL</span>
                    ) : (
                      <span style={S.badge('green')}>Normal</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.rpcUsed?.length > 0 && (
        <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '8px' }}>
          RPC: {data.rpcUsed.join(', ')} | Source: {data.source}
        </div>
      )}
    </div>
  );
}

/* -- I&O Section -- */

function IOSection({ dfn }: { dfn: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    apiFetch(`/vista/nursing/io?dfn=${dfn}`)
      .then(setData)
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, [dfn]);

  if (loading) return <div style={S.loading}>Loading I&O data...</div>;
  if (error) return <div style={S.error}>{error}</div>;
  if (!data) return null;

  return (
    <div>
      <IntegrationPendingSection
        title="Intake & Output"
        targets={data.pendingTargets || []}
        grounding={data.vistaGrounding}
      />

      {/* I&O shell — shows structure even while pending */}
      <div style={S.card}>
        <div style={{ fontWeight: 600, fontSize: '13px', color: '#2d3748', marginBottom: '12px' }}>
          I&O Summary (Current Shift)
        </div>
        <div style={{ display: 'flex', gap: '24px', marginBottom: '12px' }}>
          <div style={S.trendCard}>
            <div style={S.label}>Intake</div>
            <div style={{ ...S.trendValue, color: '#2b6cb0' }}>
              {data.totals ? `${data.totals.intake} mL` : '-- mL'}
            </div>
          </div>
          <div style={S.trendCard}>
            <div style={S.label}>Output</div>
            <div style={{ ...S.trendValue, color: '#d69e2e' }}>
              {data.totals ? `${data.totals.output} mL` : '-- mL'}
            </div>
          </div>
          <div style={S.trendCard}>
            <div style={S.label}>Net Balance</div>
            <div
              style={{
                ...S.trendValue,
                color: data.totals && data.totals.net >= 0 ? '#276749' : '#c53030',
              }}
            >
              {data.totals ? `${data.totals.net >= 0 ? '+' : ''}${data.totals.net} mL` : '-- mL'}
            </div>
          </div>
        </div>
        <div style={{ fontSize: '11px', color: '#a0aec0' }}>
          Data will populate when GMR I&O RPCs are wired. Target file: GMR(126).
        </div>
      </div>
    </div>
  );
}

/* -- Assessments Section -- */

function AssessmentsSection({ dfn }: { dfn: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    apiFetch(`/vista/nursing/assessments?dfn=${dfn}`)
      .then(setData)
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, [dfn]);

  if (loading) return <div style={S.loading}>Loading assessments...</div>;
  if (error) return <div style={S.error}>{error}</div>;
  if (!data) return null;

  const types: string[] = data.assessmentTypes || [];

  return (
    <div>
      <IntegrationPendingSection
        title="Nursing Assessments"
        targets={data.pendingTargets || []}
        grounding={data.vistaGrounding}
      />

      <div style={S.card}>
        <div style={{ fontWeight: 600, fontSize: '13px', color: '#2d3748', marginBottom: '12px' }}>
          Assessment Types
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {types.map((t) => (
            <div
              key={t}
              style={{
                padding: '8px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                background: '#f7fafc',
                fontSize: '12px',
                color: '#4a5568',
              }}
            >
              {t}
              <span style={{ ...S.pendingTag, marginLeft: '8px' }}>pending</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '12px' }}>
          Assessments target GN(228) ASSESSMENT file or TIU-based nursing templates. Will be
          functional when ZVENAS custom RPCs are built (Phase 84B).
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 3: Tasks & Reminders                                             */
/* ------------------------------------------------------------------ */

function TasksTab({ dfn }: { dfn: string }) {
  const [flowData, setFlowData] = useState<any>(null);
  const [taskData, setTaskData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.allSettled([
      apiFetch(`/vista/nursing/flowsheet?dfn=${dfn}`),
      apiFetch(`/vista/nursing/tasks?dfn=${dfn}`),
    ])
      .then(([flowResult, taskResult]) => {
        if (flowResult.status === 'fulfilled') setFlowData(flowResult.value);
        if (taskResult.status === 'fulfilled') setTaskData(taskResult.value);
        // Only show error if both failed
        if (flowResult.status === 'rejected' && taskResult.status === 'rejected') {
          setError(flowResult.reason?.message || 'Failed to load task data');
        }
      })
      .finally(() => setLoading(false));
  }, [dfn]);

  if (loading) return <div style={S.loading}>Loading tasks...</div>;
  if (error) return <div style={S.error}>{error}</div>;

  const overdue = flowData?.overdue || false;
  const criticalCount = flowData?.criticalCount || 0;
  const nextDue = flowData?.nextVitalsDue;

  // Build task items from available data
  const tasks: Array<{ id: string; label: string; priority: string; due: string; status: string }> =
    [];

  // Vitals task
  tasks.push({
    id: 'vitals-check',
    label: 'Vitals Check',
    priority: overdue ? 'high' : criticalCount > 0 ? 'high' : 'routine',
    due: nextDue && nextDue !== 'Unknown' ? new Date(nextDue).toLocaleString() : 'Not scheduled',
    status: overdue ? 'OVERDUE' : 'Scheduled',
  });

  // Safety checks (static reminders based on best practice)
  tasks.push({
    id: 'fall-risk',
    label: 'Fall Risk Assessment',
    priority: 'routine',
    due: 'Every shift',
    status: 'Due',
  });
  tasks.push({
    id: 'skin-check',
    label: 'Skin Integrity Check',
    priority: 'routine',
    due: 'Every shift',
    status: 'Due',
  });
  tasks.push({
    id: 'pain-assessment',
    label: 'Pain Assessment',
    priority: 'routine',
    due: 'Every 4 hours',
    status: 'Due',
  });
  tasks.push({
    id: 'io-recording',
    label: 'I&O Recording',
    priority: 'routine',
    due: 'End of shift',
    status: 'Due',
  });

  return (
    <div>
      {/* Safety summary */}
      <div style={{ ...S.card, display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={S.dueIndicator(overdue)}>
          {overdue ? '⚠ VITALS OVERDUE' : '✓ Vitals Current'}
        </div>
        {criticalCount > 0 && (
          <span style={S.badge('red')}>{criticalCount} critical value(s) — notify provider</span>
        )}
      </div>

      {/* Task list */}
      <div style={S.card}>
        <div style={{ fontWeight: 600, fontSize: '14px', color: '#2d3748', marginBottom: '12px' }}>
          Nursing Tasks
        </div>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Task</th>
              <th style={S.th}>Priority</th>
              <th style={S.th}>Due</th>
              <th style={S.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} style={t.status === 'OVERDUE' ? S.criticalRow : {}}>
                <td style={S.td}>{t.label}</td>
                <td style={S.td}>
                  <span style={S.badge(t.priority === 'high' ? 'red' : 'blue')}>{t.priority}</span>
                </td>
                <td style={S.td}>{t.due}</td>
                <td style={S.td}>
                  <span
                    style={S.badge(
                      t.status === 'OVERDUE' ? 'red' : t.status === 'Scheduled' ? 'green' : 'yellow'
                    )}
                  >
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Integration pending for full task engine */}
      {taskData?.pendingTargets?.length > 0 && (
        <IntegrationPendingSection title="Full Task Engine" targets={taskData.pendingTargets} />
      )}

      <div style={{ ...S.card, fontSize: '12px', color: '#718096' }}>
        <strong>Nurse Safety Features (Phase 84)</strong>
        <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
          <li>
            Critical vitals flagged with configurable thresholds (BP ≥180, HR &lt;50/&gt;130, Temp
            &lt;95/&gt;103°F, SpO2 ≤90%)
          </li>
          <li>Due/overdue indicators based on 4-hour inpatient vitals schedule</li>
          <li>Shift-based safety checks: fall risk, skin integrity, pain, I&O</li>
          <li>Full BCMA-derived task list pending PSB package integration</li>
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Page                                                            */
/* ------------------------------------------------------------------ */

function NursingDocumentationPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>('notes');
  const [dfn, setDfn] = useState(searchParams?.get('dfn') || '');
  const [dfnInput, setDfnInput] = useState(searchParams?.get('dfn') || '');
  const [patient, setPatient] = useState<PatientContext | null>(null);
  const [loadingCtx, setLoadingCtx] = useState(false);

  const loadPatientContext = useCallback(async (patientDfn: string) => {
    if (!patientDfn) return;
    setLoadingCtx(true);
    try {
      const data = await apiFetch(`/vista/nursing/patient-context?dfn=${patientDfn}`);
      setPatient(data.patient || null);
    } catch {
      setPatient({
        dfn: patientDfn,
        name: `Patient ${patientDfn}`,
        location: '',
        roomBed: '',
        attending: '',
      });
    }
    setLoadingCtx(false);
  }, []);

  useEffect(() => {
    if (dfn) loadPatientContext(dfn);
  }, [dfn, loadPatientContext]);

  const handleSelectPatient = () => {
    if (dfnInput.trim()) {
      setDfn(dfnInput.trim());
    }
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h2 style={S.title}>Nursing Documentation</h2>
        <span style={S.sourceTag}>VistA-sourced</span>
        <button
          style={{
            marginLeft: 'auto',
            ...S.actionBtn(false),
            background: '#718096',
            fontSize: '11px',
            padding: '4px 12px',
          }}
          onClick={() => router.push('/cprs/inpatient')}
        >
          ← Back to Inpatient
        </button>
      </div>

      {/* Patient selector */}
      {!dfn && (
        <div style={S.card}>
          <div style={S.label}>Select Patient (DFN)</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              style={S.selectInput}
              value={dfnInput}
              onChange={(e) => setDfnInput(e.target.value)}
              placeholder="Enter patient DFN (e.g., 3)"
              onKeyDown={(e) => e.key === 'Enter' && handleSelectPatient()}
            />
            <button
              style={S.actionBtn(!dfnInput.trim())}
              onClick={handleSelectPatient}
              disabled={!dfnInput.trim()}
            >
              Load Patient
            </button>
          </div>
        </div>
      )}

      {/* Patient context banner */}
      {dfn && !loadingCtx && (
        <>
          <PatientBanner patient={patient} dfn={dfn} />
          <div style={{ marginBottom: '8px' }}>
            <button
              style={{
                fontSize: '11px',
                color: '#2b6cb0',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
              onClick={() => {
                setDfn('');
                setPatient(null);
                setDfnInput('');
              }}
            >
              Change Patient
            </button>
          </div>
        </>
      )}
      {loadingCtx && <div style={S.loading}>Loading patient context...</div>}

      {/* Tabs + content */}
      {dfn && (
        <>
          <div style={S.tabBar}>
            {TABS.map((t) => (
              <button key={t.id} style={S.tab(tab === t.id)} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'notes' && <NotesTab dfn={dfn} />}
          {tab === 'flowsheets' && <FlowsheetsTab dfn={dfn} />}
          {tab === 'tasks' && <TasksTab dfn={dfn} />}
        </>
      )}
    </div>
  );
}

export default function NursingDocumentationPage() {
  return (
    <Suspense
      fallback={<div style={{ padding: '32px', color: '#718096' }}>Loading nursing module...</div>}
    >
      <NursingDocumentationPageInner />
    </Suspense>
  );
}
