'use client';

/**
 * NursingPanel -- Phase 68 + Phase 84 + Phase 138 (hardened)
 *
 * 6 sub-tabs: Tasks, Vitals, Notes, Flowsheet, MAR, Handoff
 * Phase 138 additions:
 *   - CSRF headers on all mutation fetches
 *   - Flowsheet tab (vitals + I/O + assessments from /vista/nursing/flowsheet)
 *   - Handoff tab (SBAR reports from /handoff/reports)
 */

import { useState, useEffect, useCallback } from 'react';
import { csrfHeaders } from '@/lib/csrf';
import { API_BASE } from '@/lib/api-config';

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

interface VitalItem {
  date: string;
  type: string;
  value: string;
  units: string;
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
interface NursingTaskItem {
  id: string;
  type: string;
  medication: string;
  sig: string;
  status: string;
  priority: string;
}
interface NursingResponse<T> {
  ok: boolean;
  source: string;
  items: T[];
  rpcUsed: string[];
  pendingTargets: PendingTarget[];
  status?: string;
  note?: string;
  _note?: string;
  error?: string;
}
interface FlowsheetEntry {
  type: string;
  value: string;
  date: string;
  units?: string;
  critical?: boolean;
}
interface HandoffReport {
  id: string;
  ward: string;
  shiftLabel: string;
  status: string;
  createdAt: string;
  patients?: unknown[];
}
interface EmarScheduleItem {
  orderIEN: string;
  rxId: string;
  drugName: string;
  type: string;
  status: string;
  sig: string;
  route: string;
  schedule: string;
  isPRN: boolean;
  frequency: string;
  nextDue: string | null;
}
interface EmarHistoryItem {
  id: string;
  medication: string;
  sig: string;
  status: string;
  lastAction: string;
  timestamp: string | null;
}
interface EmarScheduleResponse {
  ok: boolean;
  source: string;
  schedule: EmarScheduleItem[];
  count: number;
  rpcUsed: string[];
  pendingTargets: PendingTarget[];
  _heuristicWarning?: string;
  error?: string;
}
interface EmarHistoryResponse {
  ok: boolean;
  source: string;
  history: EmarHistoryItem[];
  count: number;
  rpcUsed: string[];
  pendingTargets: PendingTarget[];
  _note?: string;
  error?: string;
}
interface EmarAdminResponse {
  ok: boolean;
  source?: string;
  action?: string;
  orderIEN?: string;
  noteIen?: string;
  _note?: string;
  status?: string;
  message?: string;
  error?: string;
}
interface EmarBarcodeResponse {
  ok: boolean;
  source?: string;
  barcode?: string;
  matched?: boolean;
  medication?: { name: string; sig?: string; orderIEN?: string } | null;
  validateResult?: string[];
  validationWarning?: string | null;
  activeMedCount?: number;
  _note?: string;
  status?: string;
  message?: string;
  error?: string;
}

/* ------------------------------------------------------------------ */
/* Fetch helper                                                         */
/* ------------------------------------------------------------------ */

async function apiFetch<T>(path: string): Promise<NursingResponse<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { ...csrfHeaders() },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function apiFetchRaw<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...init,
    headers: { ...csrfHeaders(), ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ------------------------------------------------------------------ */
/* Shared Components                                                    */
/* ------------------------------------------------------------------ */

function LoadingSpinner() {
  return (
    <div style={{ padding: 24, color: 'var(--cprs-text-muted, #888)', fontSize: 13 }}>
      Loading...
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: '8px 12px',
        margin: '8px 0',
        borderRadius: 4,
        background: '#f8d7da',
        border: '1px solid #f5c6cb',
        fontSize: 12,
        color: '#721c24',
      }}
    >
      {message}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-tab: Task List                                                    */
/* ------------------------------------------------------------------ */

function TaskListTab({ dfn }: { dfn: string }) {
  const [data, setData] = useState<NursingResponse<NursingTaskItem> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<NursingTaskItem>(`/vista/nursing/tasks?dfn=${dfn}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [dfn]);

  if (error) return <ErrorBanner message={error} />;
  if (!data) return <LoadingSpinner />;

  const hasItems = data.items.length > 0;
  const note = data._note || data.note;

  return (
    <div>
      {hasItems && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--cprs-border, #ccc)', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px' }}>Medication</th>
                <th style={{ padding: '8px 10px' }}>Sig</th>
                <th style={{ padding: '8px 10px' }}>Status</th>
                <th style={{ padding: '8px 10px' }}>Priority</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((task) => (
                <tr key={task.id} style={{ borderBottom: '1px solid var(--cprs-border-soft, #eee)' }}>
                  <td style={{ padding: '8px 10px' }}>{task.medication || 'Unnamed medication task'}</td>
                  <td style={{ padding: '8px 10px' }}>{task.sig || '-'}</td>
                  <td style={{ padding: '8px 10px', textTransform: 'capitalize' }}>{task.status || '-'}</td>
                  <td style={{ padding: '8px 10px', textTransform: 'capitalize' }}>{task.priority || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!hasItems && (
        <p style={{ fontSize: 13, color: 'var(--cprs-text-muted, #888)', padding: 8 }}>
          {note || 'No active nursing tasks for this patient.'}
        </p>
      )}
      <div style={{ fontSize: 12, color: 'var(--cprs-text-muted, #888)', padding: '0 8px 8px' }}>
        RPC: {data.rpcUsed.join(', ') || 'none'} | Source: {data.source || 'unknown'}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-tab: Vitals                                                       */
/* ------------------------------------------------------------------ */

function VitalsTab({ dfn }: { dfn: string }) {
  const [data, setData] = useState<NursingResponse<VitalItem> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<VitalItem>(`/vista/nursing/vitals?dfn=${dfn}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [dfn]);

  if (error) return <ErrorBanner message={error} />;
  if (!data) return <LoadingSpinner />;
  if (data.status === 'request-failed') {
    return (
      <div>
        <ErrorBanner message={data.error || data.note || 'Live nursing vitals request failed.'} />
        {data.rpcUsed?.length > 0 && (
          <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>
            RPC attempted: {data.rpcUsed.join(', ')}
          </div>
        )}
      </div>
    );
  }
  return (
    <div>
      {data.items.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--cprs-text-muted, #888)', padding: 8 }}>
          No vitals on file for this patient.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--cprs-border, #ccc)', textAlign: 'left' }}>
              <th style={{ padding: '4px 8px' }}>Date</th>
              <th style={{ padding: '4px 8px' }}>Type</th>
              <th style={{ padding: '4px 8px' }}>Value</th>
              <th style={{ padding: '4px 8px' }}>Units</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((v, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--cprs-border, #eee)' }}>
                <td style={{ padding: '4px 8px' }}>{v.date}</td>
                <td style={{ padding: '4px 8px' }}>{v.type}</td>
                <td style={{ padding: '4px 8px' }}>{v.value}</td>
                <td style={{ padding: '4px 8px' }}>{v.units}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {data.rpcUsed?.length > 0 && (
        <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>
          RPC: {data.rpcUsed.join(', ')} | Source: {data.source}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-tab: Notes                                                        */
/* ------------------------------------------------------------------ */

function NotesTab({ dfn }: { dfn: string }) {
  const [data, setData] = useState<NursingResponse<NoteItem> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<NoteItem>(`/vista/nursing/notes?dfn=${dfn}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [dfn]);

  if (error) return <ErrorBanner message={error} />;
  if (!data) return <LoadingSpinner />;
  return (
    <div>
      {data.note && (
        <div
          style={{
            fontSize: 11,
            color: '#666',
            padding: '4px 8px',
            background: '#f0f8ff',
            borderRadius: 4,
            marginBottom: 8,
          }}
        >
          {data.note}
        </div>
      )}
      {data.items.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--cprs-text-muted, #888)', padding: 8 }}>
          No nursing notes on file.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--cprs-border, #ccc)', textAlign: 'left' }}>
              <th style={{ padding: '4px 8px' }}>Date</th>
              <th style={{ padding: '4px 8px' }}>Title</th>
              <th style={{ padding: '4px 8px' }}>Author</th>
              <th style={{ padding: '4px 8px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((n, i) => (
              <tr key={n.ien || i} style={{ borderBottom: '1px solid var(--cprs-border, #eee)' }}>
                <td style={{ padding: '4px 8px' }}>{n.date}</td>
                <td style={{ padding: '4px 8px' }}>{n.title}</td>
                <td style={{ padding: '4px 8px' }}>{n.author}</td>
                <td style={{ padding: '4px 8px' }}>{n.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {data.rpcUsed?.length > 0 && (
        <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>
          RPC: {data.rpcUsed.join(', ')} | Source: {data.source}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-tab: MAR                                                          */
/* ------------------------------------------------------------------ */

function MARTab({ dfn }: { dfn: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [schedule, setSchedule] = useState<EmarScheduleItem[]>([]);
  const [history, setHistory] = useState<EmarHistoryItem[]>([]);
  const [, setPendingTargets] = useState<PendingTarget[]>([]);
  const [scheduleNote, setScheduleNote] = useState('');
  const [historyNote, setHistoryNote] = useState('');
  const [selectedMed, setSelectedMed] = useState<EmarScheduleItem | null>(null);
  const [adminAction, setAdminAction] = useState<'given' | 'held' | 'refused' | 'unavailable'>(
    'given'
  );
  const [adminReason, setAdminReason] = useState('');
  const [adminResult, setAdminResult] = useState<EmarAdminResponse | null>(null);
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [barcodeResult, setBarcodeResult] = useState<EmarBarcodeResponse | null>(null);
  const [barcodeSubmitting, setBarcodeSubmitting] = useState(false);

  const loadMarData = useCallback(() => {
    setLoading(true);
    setError('');
    setAdminResult(null);
    setBarcodeResult(null);

    Promise.all([
      apiFetchRaw<EmarScheduleResponse>(`/emar/schedule?dfn=${dfn}`),
      apiFetchRaw<EmarHistoryResponse>(`/emar/history?dfn=${dfn}`),
    ])
      .then(([scheduleData, historyData]) => {
        if (!scheduleData.ok) {
          throw new Error(scheduleData.error || 'Failed to load MAR schedule');
        }
        if (!historyData.ok) {
          throw new Error(historyData.error || 'Failed to load MAR history');
        }

        setSchedule(scheduleData.schedule || []);
        setHistory(historyData.history || []);
        setPendingTargets(scheduleData.pendingTargets || []);
        setScheduleNote(scheduleData._heuristicWarning || '');
        setHistoryNote(historyData._note || '');
        setSelectedMed((current) => {
          if (current) {
            const nextSelected = (scheduleData.schedule || []).find(
              (item) => item.orderIEN === current.orderIEN
            );
            if (nextSelected) return nextSelected;
          }
          return (scheduleData.schedule || [])[0] || null;
        });
      })
      .catch((e) => setError(e.message || 'Failed to load MAR data'))
      .finally(() => setLoading(false));
  }, [dfn]);

  useEffect(() => {
    setAdminAction('given');
    setAdminReason('');
    setBarcode('');
    loadMarData();
  }, [loadMarData]);

  const handleAdminister = useCallback(async () => {
    if (!selectedMed) return;
    setAdminSubmitting(true);
    setAdminResult(null);
    try {
      const result = await apiFetchRaw<EmarAdminResponse>('/emar/administer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dfn,
          orderIEN: selectedMed.orderIEN,
          action: adminAction,
          reason: adminReason,
        }),
      });
      setAdminResult(result);
    } catch (e: any) {
      setAdminResult({ ok: false, error: e.message || 'Failed to record administration' });
    } finally {
      setAdminSubmitting(false);
    }
  }, [adminAction, adminReason, dfn, selectedMed]);

  const handleBarcodeScan = useCallback(async () => {
    if (!barcode.trim()) return;
    setBarcodeSubmitting(true);
    setBarcodeResult(null);
    try {
      const result = await apiFetchRaw<EmarBarcodeResponse>('/emar/barcode-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dfn, barcode: barcode.trim() }),
      });
      setBarcodeResult(result);
    } catch (e: any) {
      setBarcodeResult({ ok: false, error: e.message || 'Barcode scan failed' });
    } finally {
      setBarcodeSubmitting(false);
    }
  }, [barcode, dfn]);

  if (error) return <ErrorBanner message={error} />;
  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          marginBottom: 12,
          padding: '8px 10px',
          background: '#f7fafc',
          border: '1px solid var(--cprs-border, #ddd)',
          borderRadius: 6,
          fontSize: 12,
        }}
      >
        <div style={{ color: 'var(--cprs-text-muted, #666)' }}>
          This chart tab now uses the live eMAR fallback routes. Medication reads are VistA-backed;
          full BCMA timestamps and certified med-log writes still require PSB MED LOG.
        </div>
        <a
          href={`/cprs/emar?dfn=${dfn}`}
          style={{
            whiteSpace: 'nowrap',
            color: 'var(--cprs-accent, #2563eb)',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Open Full eMAR Workspace
        </a>
      </div>

      {scheduleNote && (
        <div
          style={{
            padding: '8px 10px',
            marginBottom: 10,
            borderRadius: 4,
            background: '#ebf8ff',
            border: '1px solid #90cdf4',
            fontSize: 12,
            color: '#2a4365',
          }}
        >
          {scheduleNote}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            Active Medication Schedule ({schedule.length})
          </div>
          <div
            style={{
              maxHeight: 360,
              overflowY: 'auto',
              border: '1px solid var(--cprs-border, #ddd)',
              borderRadius: 6,
            }}
          >
            {schedule.length === 0 ? (
              <div style={{ padding: 16, color: 'var(--cprs-text-muted, #888)', fontSize: 12 }}>
                No active medications found for this patient.
              </div>
            ) : (
              schedule.map((med, index) => (
                <button
                  key={`${med.orderIEN}-${index}`}
                  type="button"
                  onClick={() => {
                    setSelectedMed(med);
                    setAdminResult(null);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    border: 'none',
                    borderBottom:
                      index === schedule.length - 1 ? 'none' : '1px solid var(--cprs-border, #eee)',
                    background:
                      selectedMed?.orderIEN === med.orderIEN ? '#ebf8ff' : 'var(--cprs-bg, #fff)',
                    padding: '10px 12px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{med.drugName}</div>
                  <div style={{ fontSize: 11, color: 'var(--cprs-text-muted, #666)', marginTop: 2 }}>
                    {med.route || 'Route n/a'} | {med.schedule || 'Unscheduled'} |{' '}
                    {med.isPRN ? 'PRN' : med.frequency || 'Scheduled'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--cprs-text-muted, #666)', marginTop: 2 }}>
                    Order {med.orderIEN} | Status {med.status}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Medication Actions</div>
          <div
            style={{
              border: '1px solid var(--cprs-border, #ddd)',
              borderRadius: 6,
              padding: 12,
              background: '#f7fafc',
            }}
          >
            {selectedMed ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedMed.drugName}</div>
                <div style={{ fontSize: 11, color: 'var(--cprs-text-muted, #666)', marginTop: 3 }}>
                  {selectedMed.sig || 'No sig available'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--cprs-text-muted, #666)', marginTop: 3 }}>
                  Route {selectedMed.route || 'n/a'} | Next due {selectedMed.nextDue || 'not available'}
                </div>

                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginTop: 12 }}>
                  Administration action
                </label>
                <select
                  value={adminAction}
                  onChange={(e) => setAdminAction(e.target.value as typeof adminAction)}
                  style={{
                    width: '100%',
                    marginTop: 4,
                    padding: '6px 8px',
                    borderRadius: 4,
                    border: '1px solid var(--cprs-border, #ccc)',
                    fontSize: 12,
                  }}
                >
                  <option value="given">Given</option>
                  <option value="held">Held</option>
                  <option value="refused">Refused</option>
                  <option value="unavailable">Unavailable</option>
                </select>

                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginTop: 10 }}>
                  Note or reason
                </label>
                <textarea
                  value={adminReason}
                  onChange={(e) => setAdminReason(e.target.value)}
                  rows={3}
                  placeholder="Add a nursing note for held, refused, or unavailable actions"
                  style={{
                    width: '100%',
                    marginTop: 4,
                    padding: '6px 8px',
                    borderRadius: 4,
                    border: '1px solid var(--cprs-border, #ccc)',
                    fontSize: 12,
                    resize: 'vertical',
                  }}
                />

                <button
                  type="button"
                  onClick={handleAdminister}
                  disabled={adminSubmitting}
                  style={{
                    marginTop: 10,
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: 4,
                    background: 'var(--cprs-accent, #2563eb)',
                    color: '#fff',
                    cursor: adminSubmitting ? 'default' : 'pointer',
                    opacity: adminSubmitting ? 0.7 : 1,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {adminSubmitting ? 'Recording...' : 'Record Administration'}
                </button>

                {adminResult && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: '10px 12px',
                      borderRadius: 4,
                      background:
                        adminResult.ok && adminResult.source === 'vista' ? '#f0fff4' : '#fff5f5',
                      border:
                        adminResult.ok && adminResult.source === 'vista'
                          ? '1px solid #9ae6b4'
                          : '1px solid #fc8181',
                      fontSize: 12,
                    }}
                  >
                    {adminResult.ok ? (
                      <>
                        <div style={{ fontWeight: 600, color: '#22543d' }}>
                          Administration documented via TIU nursing note
                        </div>
                        <div style={{ color: '#2f855a', marginTop: 4 }}>
                          Action {adminResult.action || adminAction}
                          {adminResult.noteIen ? ` | Note IEN ${adminResult.noteIen}` : ''}
                        </div>
                        {adminResult._note && (
                          <div style={{ color: '#2f855a', marginTop: 4 }}>{adminResult._note}</div>
                        )}
                      </>
                    ) : (
                      <>
                        <div style={{ fontWeight: 600, color: '#c53030' }}>Administration failed</div>
                        <div style={{ color: '#742a2a', marginTop: 4 }}>
                          {adminResult.error || 'Unknown error'}
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 12,
                    borderTop: '1px solid var(--cprs-border, #ddd)',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Barcode verification</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <input
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="Scan or enter barcode"
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: 4,
                        border: '1px solid var(--cprs-border, #ccc)',
                        fontSize: 12,
                        fontFamily: 'monospace',
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleBarcodeScan}
                      disabled={!barcode.trim() || barcodeSubmitting}
                      style={{
                        padding: '7px 12px',
                        border: 'none',
                        borderRadius: 4,
                        background: 'var(--cprs-selected, #e8f0fe)',
                        color: 'var(--cprs-accent, #2563eb)',
                        cursor: !barcode.trim() || barcodeSubmitting ? 'default' : 'pointer',
                        opacity: !barcode.trim() || barcodeSubmitting ? 0.7 : 1,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {barcodeSubmitting ? 'Checking...' : 'Verify'}
                    </button>
                  </div>

                  {barcodeResult && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: '10px 12px',
                        borderRadius: 4,
                        background:
                          barcodeResult.ok && barcodeResult.source === 'vista'
                            ? '#f0fff4'
                            : '#fff5f5',
                        border:
                          barcodeResult.ok && barcodeResult.source === 'vista'
                            ? '1px solid #9ae6b4'
                            : '1px solid #fc8181',
                        fontSize: 12,
                      }}
                    >
                      {barcodeResult.ok ? (
                        <>
                          <div style={{ fontWeight: 600, color: '#22543d' }}>
                            {barcodeResult.matched
                              ? `Matched ${barcodeResult.medication?.name || 'active medication'}`
                              : 'No active medication matched this barcode'}
                          </div>
                          {barcodeResult.medication?.orderIEN && (
                            <div style={{ color: '#2f855a', marginTop: 4 }}>
                              Order IEN {barcodeResult.medication.orderIEN}
                            </div>
                          )}
                          {barcodeResult.validateResult && barcodeResult.validateResult.length > 0 && (
                            <div style={{ color: '#2f855a', marginTop: 4 }}>
                              Validation {barcodeResult.validateResult.join(' | ')}
                            </div>
                          )}
                          {barcodeResult.validationWarning && (
                            <div style={{ color: '#975a16', marginTop: 4 }}>
                              {barcodeResult.validationWarning}
                            </div>
                          )}
                          {barcodeResult._note && (
                            <div style={{ color: '#2f855a', marginTop: 4 }}>
                              {barcodeResult._note}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div style={{ fontWeight: 600, color: '#c53030' }}>
                            Barcode verification failed
                          </div>
                          <div style={{ color: '#742a2a', marginTop: 4 }}>
                            {barcodeResult.error || 'Unknown error'}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--cprs-text-muted, #888)', fontSize: 12 }}>
                Select a medication to document administration or run barcode verification.
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
          Administration Posture ({history.length})
        </div>
        {historyNote && (
          <div
            style={{
              padding: '8px 10px',
              marginBottom: 10,
              borderRadius: 4,
              background: '#f7fafc',
              border: '1px solid var(--cprs-border, #ddd)',
              fontSize: 12,
              color: 'var(--cprs-text-muted, #666)',
            }}
          >
            {historyNote}
          </div>
        )}
        {history.length === 0 ? (
          <div style={{ color: 'var(--cprs-text-muted, #888)', fontSize: 12, padding: '8px 0' }}>
            No medication posture rows returned.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--cprs-border, #ccc)', textAlign: 'left' }}>
                <th style={{ padding: '4px 8px' }}>Medication</th>
                <th style={{ padding: '4px 8px' }}>Sig</th>
                <th style={{ padding: '4px 8px' }}>Status</th>
                <th style={{ padding: '4px 8px' }}>Last Action</th>
                <th style={{ padding: '4px 8px' }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--cprs-border, #eee)' }}>
                  <td style={{ padding: '4px 8px' }}>{item.medication}</td>
                  <td style={{ padding: '4px 8px' }}>{item.sig || '--'}</td>
                  <td style={{ padding: '4px 8px' }}>{item.status}</td>
                  <td style={{ padding: '4px 8px' }}>{item.lastAction}</td>
                  <td style={{ padding: '4px 8px' }}>{item.timestamp || 'Not available in sandbox'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-tab: Flowsheet (Phase 138)                                        */
/* ------------------------------------------------------------------ */

function FlowsheetTab({ dfn }: { dfn: string }) {
  const [data, setData] = useState<NursingResponse<FlowsheetEntry> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<FlowsheetEntry>(`/vista/nursing/flowsheet?dfn=${dfn}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [dfn]);

  if (error) return <ErrorBanner message={error} />;
  if (!data) return <LoadingSpinner />;
  return (
    <div>
      {data.items.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--cprs-text-muted, #888)', padding: 8 }}>
          No flowsheet data available.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--cprs-border, #ccc)', textAlign: 'left' }}>
              <th style={{ padding: '4px 8px' }}>Date</th>
              <th style={{ padding: '4px 8px' }}>Type</th>
              <th style={{ padding: '4px 8px' }}>Value</th>
              <th style={{ padding: '4px 8px' }}>Flag</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((f, i) => (
              <tr
                key={i}
                style={{
                  borderBottom: '1px solid var(--cprs-border, #eee)',
                  background: f.critical ? 'rgba(220,38,38,0.08)' : undefined,
                }}
              >
                <td style={{ padding: '4px 8px' }}>{f.date}</td>
                <td style={{ padding: '4px 8px' }}>{f.type}</td>
                <td style={{ padding: '4px 8px' }}>
                  {f.value}
                  {f.units ? ` ${f.units}` : ''}
                </td>
                <td style={{ padding: '4px 8px' }}>{f.critical ? '⚠' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {data.rpcUsed?.length > 0 && (
        <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>
          RPC: {data.rpcUsed.join(', ')} | Source: {data.source}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-tab: Handoff SBAR (Phase 138)                                     */
/* ------------------------------------------------------------------ */

function HandoffTab({ dfn }: { dfn: string }) {
  const [reports, setReports] = useState<HandoffReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetchRaw<{ ok: boolean; reports: HandoffReport[] }>(`/handoff/reports?status=submitted`)
      .then((d) => {
        setReports(d.reports || []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [dfn]);

  if (error) return <ErrorBanner message={error} />;
  if (loading) return <LoadingSpinner />;

  return (
    <div>
      {reports.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--cprs-text-muted, #888)', padding: 8 }}>
          No submitted handoff reports. Handoff reports use SBAR format (Situation, Background,
          Assessment, Recommendation) and are created during shift changes.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--cprs-border, #ccc)', textAlign: 'left' }}>
              <th style={{ padding: '4px 8px' }}>Ward</th>
              <th style={{ padding: '4px 8px' }}>Shift</th>
              <th style={{ padding: '4px 8px' }}>Status</th>
              <th style={{ padding: '4px 8px' }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--cprs-border, #eee)' }}>
                <td style={{ padding: '4px 8px' }}>{r.ward}</td>
                <td style={{ padding: '4px 8px' }}>{r.shiftLabel}</td>
                <td style={{ padding: '4px 8px' }}>{r.status}</td>
                <td style={{ padding: '4px 8px' }}>{new Date(r.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-tab: Intake / Output                                              */
/* ------------------------------------------------------------------ */

interface IOEntry {
  id: string;
  type: string;
  route: string;
  amount: string;
  units: string;
  date: string;
}

function IOTab({ dfn }: { dfn: string }) {
  const [data, setData] = useState<NursingResponse<IOEntry> | null>(null);
  const [error, setError] = useState('');
  const [ioType, setIoType] = useState<'intake' | 'output'>('intake');
  const [ioRoute, setIoRoute] = useState('');
  const [ioAmount, setIoAmount] = useState('');
  const [ioUnits, setIoUnits] = useState('mL');
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);

  const loadIO = useCallback(() => {
    apiFetch<IOEntry>(`/vista/nursing/io?dfn=${dfn}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [dfn]);

  useEffect(() => { loadIO(); }, [loadIO]);

  const handleAddIO = async () => {
    if (!ioRoute.trim() || !ioAmount.trim()) return;
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const result = await apiFetchRaw<{ ok: boolean; message?: string; error?: string }>(
        '/vista/nursing/io/add',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dfn, type: ioType, route: ioRoute.trim(), amount: ioAmount.trim(), units: ioUnits }),
        }
      );
      if (result.ok) {
        setSubmitMsg(result.message || 'I/O entry recorded.');
        setIoRoute('');
        setIoAmount('');
        loadIO();
      } else {
        setSubmitMsg(result.error || 'Failed to record I/O entry.');
      }
    } catch (e: any) {
      setSubmitMsg(e.message || 'Failed to record I/O entry.');
    } finally {
      setSubmitting(false);
    }
  };

  if (error) return <ErrorBanner message={error} />;
  if (!data) return <LoadingSpinner />;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            I/O Records ({data.items.length})
          </div>
          {data.items.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--cprs-text-muted, #888)', padding: 8 }}>
              No intake/output records available.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--cprs-border, #ccc)', textAlign: 'left' }}>
                  <th style={{ padding: '4px 8px' }}>Date</th>
                  <th style={{ padding: '4px 8px' }}>Type</th>
                  <th style={{ padding: '4px 8px' }}>Route</th>
                  <th style={{ padding: '4px 8px' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((entry, i) => (
                  <tr key={entry.id || i} style={{ borderBottom: '1px solid var(--cprs-border-soft, #eee)' }}>
                    <td style={{ padding: '4px 8px' }}>{entry.date}</td>
                    <td style={{ padding: '4px 8px', textTransform: 'capitalize' }}>{entry.type}</td>
                    <td style={{ padding: '4px 8px' }}>{entry.route}</td>
                    <td style={{ padding: '4px 8px' }}>{entry.amount} {entry.units}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {data.rpcUsed?.length > 0 && (
            <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>
              RPC: {data.rpcUsed.join(', ')} | Source: {data.source}
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Add I/O Entry</div>
          <div style={{ border: '1px solid var(--cprs-border, #ddd)', borderRadius: 6, padding: 12, background: '#f7fafc' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600 }}>Type</label>
            <select
              value={ioType}
              onChange={(e) => setIoType(e.target.value as 'intake' | 'output')}
              style={{ width: '100%', marginTop: 4, padding: '6px 8px', borderRadius: 4, border: '1px solid var(--cprs-border, #ccc)', fontSize: 12 }}
            >
              <option value="intake">Intake</option>
              <option value="output">Output</option>
            </select>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginTop: 10 }}>Route</label>
            <input
              value={ioRoute}
              onChange={(e) => setIoRoute(e.target.value)}
              placeholder={ioType === 'intake' ? 'e.g. Oral, IV, NG Tube' : 'e.g. Urine, Emesis, Drain'}
              style={{ width: '100%', marginTop: 4, padding: '6px 8px', borderRadius: 4, border: '1px solid var(--cprs-border, #ccc)', fontSize: 12 }}
            />

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginTop: 10 }}>Amount</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <input
                value={ioAmount}
                onChange={(e) => setIoAmount(e.target.value)}
                placeholder="e.g. 250"
                style={{ flex: 1, padding: '6px 8px', borderRadius: 4, border: '1px solid var(--cprs-border, #ccc)', fontSize: 12 }}
              />
              <select
                value={ioUnits}
                onChange={(e) => setIoUnits(e.target.value)}
                style={{ width: 80, padding: '6px 8px', borderRadius: 4, border: '1px solid var(--cprs-border, #ccc)', fontSize: 12 }}
              >
                <option value="mL">mL</option>
                <option value="cc">cc</option>
                <option value="oz">oz</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleAddIO}
              disabled={submitting || !ioRoute.trim() || !ioAmount.trim()}
              style={{
                marginTop: 12,
                padding: '8px 12px',
                border: 'none',
                borderRadius: 4,
                background: 'var(--cprs-accent, #2563eb)',
                color: '#fff',
                cursor: submitting ? 'default' : 'pointer',
                opacity: submitting || !ioRoute.trim() || !ioAmount.trim() ? 0.7 : 1,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {submitting ? 'Recording...' : 'Record I/O Entry'}
            </button>

            {submitMsg && (
              <div style={{ marginTop: 8, fontSize: 12, color: submitMsg.includes('Failed') ? '#c53030' : '#22543d' }}>
                {submitMsg}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-tab: Assessments                                                  */
/* ------------------------------------------------------------------ */

interface AssessmentEntry {
  id: string;
  type: string;
  date: string;
  score: string;
  notes: string;
  assessor: string;
}

function AssessmentsTab({ dfn }: { dfn: string }) {
  const [data, setData] = useState<NursingResponse<AssessmentEntry> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<AssessmentEntry>(`/vista/nursing/assessments?dfn=${dfn}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [dfn]);

  if (error) return <ErrorBanner message={error} />;
  if (!data) return <LoadingSpinner />;

  return (
    <div>
      {data.items.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--cprs-text-muted, #888)', padding: 8 }}>
          No nursing assessments available.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--cprs-border, #ccc)', textAlign: 'left' }}>
              <th style={{ padding: '4px 8px' }}>Date</th>
              <th style={{ padding: '4px 8px' }}>Type</th>
              <th style={{ padding: '4px 8px' }}>Score</th>
              <th style={{ padding: '4px 8px' }}>Assessor</th>
              <th style={{ padding: '4px 8px' }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((a, i) => (
              <tr key={a.id || i} style={{ borderBottom: '1px solid var(--cprs-border-soft, #eee)' }}>
                <td style={{ padding: '4px 8px' }}>{a.date}</td>
                <td style={{ padding: '4px 8px' }}>{a.type}</td>
                <td style={{ padding: '4px 8px' }}>{a.score || '--'}</td>
                <td style={{ padding: '4px 8px' }}>{a.assessor || '--'}</td>
                <td style={{ padding: '4px 8px' }}>{a.notes || '--'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {data.rpcUsed?.length > 0 && (
        <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>
          RPC: {data.rpcUsed.join(', ')} | Source: {data.source}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Panel                                                            */
/* ------------------------------------------------------------------ */

type NursingSubTab = 'tasks' | 'vitals' | 'notes' | 'io' | 'assessments' | 'flowsheet' | 'mar' | 'handoff';

export default function NursingPanel({ dfn }: { dfn: string }) {
  const [activeTab, setActiveTab] = useState<NursingSubTab>('tasks');

  const tabs: Array<{ key: NursingSubTab; label: string }> = [
    { key: 'tasks', label: 'Task List' },
    { key: 'vitals', label: 'Vitals' },
    { key: 'notes', label: 'Notes' },
    { key: 'io', label: 'I/O' },
    { key: 'assessments', label: 'Assessments' },
    { key: 'flowsheet', label: 'Flowsheet' },
    { key: 'mar', label: 'MAR' },
    { key: 'handoff', label: 'Handoff' },
  ];

  return (
    <div style={{ padding: 8 }}>
      <div
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: '1px solid var(--cprs-border, #ccc)',
          marginBottom: 8,
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '6px 16px',
              fontSize: 12,
              fontWeight: activeTab === t.key ? 600 : 400,
              background: activeTab === t.key ? 'var(--cprs-selected, #e8f0fe)' : 'transparent',
              border: 'none',
              borderBottom:
                activeTab === t.key
                  ? '2px solid var(--cprs-accent, #2563eb)'
                  : '2px solid transparent',
              cursor: 'pointer',
              color:
                activeTab === t.key ? 'var(--cprs-text, #333)' : 'var(--cprs-text-muted, #888)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'tasks' && <TaskListTab dfn={dfn} />}
      {activeTab === 'vitals' && <VitalsTab dfn={dfn} />}
      {activeTab === 'notes' && <NotesTab dfn={dfn} />}
      {activeTab === 'io' && <IOTab dfn={dfn} />}
      {activeTab === 'assessments' && <AssessmentsTab dfn={dfn} />}
      {activeTab === 'flowsheet' && <FlowsheetTab dfn={dfn} />}
      {activeTab === 'mar' && <MARTab dfn={dfn} />}
      {activeTab === 'handoff' && <HandoffTab dfn={dfn} />}
    </div>
  );
}
