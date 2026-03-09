'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useDataCache, type DomainFetchMeta } from '@/stores/data-cache';
import { useCPRSUI, DEFAULT_PANEL_ORDER, DEFAULT_PANEL_HEIGHTS } from '@/stores/cprs-ui-state';
import { usePatient } from '@/stores/patient-context';
import { useSession } from '@/stores/session-context';
import { API_BASE } from '@/lib/api-config';
import { correlatedGet } from '@/lib/fetch-with-correlation';
import IntegrationPendingModal, { type PendingActionInfo } from '../IntegrationPendingModal';
import { getActionsByLocation } from '@/actions/actionRegistry';
import styles from '../cprs.module.css';

interface Props {
  dfn: string;
}

function buildStableRowKey(index: number, values: Array<unknown>): string {
  const parts = values
    .map((value) => String(value ?? '').trim())
    .filter(Boolean);
  return parts.length > 0 ? `${parts.join('|')}|${index}` : `row-${index}`;
}

function formatCoverAppointmentDate(value: string | undefined | null): string {
  if (!value) return '\u2014';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/* ------------------------------------------------------------------ */
/* Section — single cover-sheet panel with resize + drag              */
/* ------------------------------------------------------------------ */

function Section({
  title,
  panelKey,
  contractId,
  loading,
  error,
  pending,
  onPendingClick,
  children,
  onResize,
  height,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  dragOverKey,
}: {
  title: string;
  panelKey: string;
  contractId?: string;
  loading: boolean;
  error?: string | null;
  pending?: boolean;
  onPendingClick?: () => void;
  children: React.ReactNode;
  onResize?: (delta: number) => void;
  height?: number;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  dragOverKey?: string | null;
}) {
  const handleRef = useRef<HTMLDivElement>(null);

  // Mouse resize
  useEffect(() => {
    const handle = handleRef.current;
    if (!handle || !onResize) return;
    const resizeFn = onResize;
    let startY = 0;
    function onDown(e: MouseEvent) {
      startY = e.clientY;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }
    function onMove(e: MouseEvent) {
      resizeFn(e.clientY - startY);
      startY = e.clientY;
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    handle.addEventListener('mousedown', onDown);
    return () => handle.removeEventListener('mousedown', onDown);
  }, [onResize]);

  // Keyboard resize: arrow keys on focused handle
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!onResize) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        onResize(10);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        onResize(-10);
      }
    },
    [onResize]
  );

  const isDragOver = dragOverKey === panelKey;

  return (
    <div
      className={styles.coverSection}
      style={{
        minHeight: height ?? undefined,
        ...(draggable ? { cursor: 'grab' } : {}),
        ...(isDragOver
          ? { outline: '2px dashed var(--cprs-accent, #0066b2)', outlineOffset: -2 }
          : {}),
      }}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      data-panel-key={panelKey}
    >
      <h3>
        {draggable && (
          <span style={{ cursor: 'grab', marginRight: 6, opacity: 0.5 }} aria-hidden>
            &#x2630;
          </span>
        )}
        {title}
        {pending && (
          <span
            className={styles.pendingBadge}
            onClick={onPendingClick}
            title="Integration pending -- click for details"
            style={{
              cursor: 'pointer',
              marginLeft: 8,
              fontSize: 11,
              background: '#4a3d2d',
              color: '#d9c9a3',
              padding: '1px 6px',
              borderRadius: 3,
            }}
          >
            PENDING
          </span>
        )}
      </h3>
      {loading && <p className={styles.loadingText}>Loading...</p>}
      {error && <p className={styles.errorText}>{error}</p>}
      {!loading && !error && children}
      {contractId && !loading && !error && (
        <div style={{ position: 'absolute', top: 4, right: 8, fontSize: 9, color: '#767676' }}>
          {contractId}
        </div>
      )}
      <div
        ref={handleRef}
        className={styles.resizeHandle}
        tabIndex={0}
        role="separator"
        aria-orientation="horizontal"
        aria-label={`Resize ${title} panel`}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

async function fetchJson<T>(url: string): Promise<T> {
  return correlatedGet<T>(url);
}

function isImmunizationErrorResult(entry: any): boolean {
  const label = String(entry?.name || entry?.ien || '').toUpperCase();
  return (
    label.includes('%YDB-E-') ||
    label.includes('LVUNDEF') ||
    label.includes('TMP("DIERR"') ||
    label.includes('TMP(\"DIERR\"')
  );
}

const CACHE_RETRY_LIMIT = 2;
const CUSTOM_RETRY_LIMIT = 2;

/* ------------------------------------------------------------------ */
/* Panel content renderers                                            */
/* ------------------------------------------------------------------ */

interface PanelData {
  problems: any[];
  problemsMeta: DomainFetchMeta;
  allergies: any[];
  allergiesMeta: DomainFetchMeta;
  meds: any[];
  medsMeta: DomainFetchMeta;
  vitals: any[];
  vitalsMeta: DomainFetchMeta;
  notes: any[];
  notesMeta: DomainFetchMeta;
  labs: any[];
  labsMeta: DomainFetchMeta;
  ordersSummary: { unsigned: number; recent: any[] } | null;
  ordersPending: boolean;
  appointments: any[];
  appointmentsPending: boolean;
  immunizations: any[];
  immuPending: boolean;
  reminders: any[];
  remindersPending: boolean;
}

interface PanelLoading {
  problems: boolean;
  allergies: boolean;
  meds: boolean;
  vitals: boolean;
  notes: boolean;
  labs: boolean;
  orders: boolean;
  appointments: boolean;
  immunizations: boolean;
  reminders: boolean;
}

interface PanelDef {
  title: string;
  contractId: string;
  pending?: boolean;
  pendingActionId?: string;
  render: (data: PanelData) => React.ReactNode;
}

interface CoverOrdersSummaryResponse {
  ok?: boolean;
  status?: string;
  unsigned?: number;
  recent?: any[];
  pendingTargets?: string[];
}

interface CoverImmunizationsResponse {
  ok?: boolean;
  _integration?: string;
  results?: any[];
  pendingTargets?: string[];
}

interface CoverAppointmentsResponse {
  ok?: boolean;
  status?: string;
  results?: any[];
  pendingTargets?: string[];
}

interface CoverRemindersResponse {
  ok?: boolean;
  status?: string;
  results?: any[];
  pendingTargets?: string[];
}

function buildPanelDefs(data: PanelData): Record<string, PanelDef> {
  return {
    problems: {
      title: 'Active Problems',
      contractId: 'CT_PROBLEMS',
      pending: data.problemsMeta.pending && data.problems.length === 0,
      pendingActionId: 'cover.load-problems',
      render: (d) =>
        d.problemsMeta.pending ? (
          <p className={styles.pendingText}>
            Problem list unavailable.
            <br />
            <span style={{ fontSize: 11, color: '#888' }}>Target: ORQQPL PROBLEM LIST</span>
          </p>
        ) : d.problems.length === 0 ? (
          <p className={styles.emptyText}>No active problems</p>
        ) : (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Problem</th>
                <th>Status</th>
                <th>Onset</th>
              </tr>
            </thead>
            <tbody>
              {d.problems.map((p, i) => (
                <tr key={buildStableRowKey(i, [p.id, p.text, p.status, p.onset])}>
                  <td>{p.text}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[p.status] || ''}`}>{p.status}</span>
                  </td>
                  <td>{p.onset || '\u2014'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ),
    },
    allergies: {
      title: 'Allergies / Adverse Reactions',
      contractId: 'ORQQAL LIST',
      pending: data.allergiesMeta.pending && data.allergies.length === 0,
      pendingActionId: 'cover.load-allergies',
      render: (d) =>
        d.allergiesMeta.pending ? (
          <p className={styles.pendingText}>
            Allergy data unavailable.
            <br />
            <span style={{ fontSize: 11, color: '#888' }}>Target: ORQQAL LIST</span>
          </p>
        ) : d.allergies.length === 0 ? (
          <p className={styles.emptyText}>No known allergies</p>
        ) : (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Allergen</th>
                <th>Severity</th>
                <th>Reactions</th>
              </tr>
            </thead>
            <tbody>
              {d.allergies.map((a, i) => (
                <tr key={buildStableRowKey(i, [a.id, a.allergen, a.severity, a.reactions])}>
                  <td>{a.allergen}</td>
                  <td>{a.severity}</td>
                  <td>{a.reactions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ),
    },
    meds: {
      title: 'Active Medications',
      contractId: 'ORWPS ACTIVE',
      pending: data.medsMeta.pending && data.meds.length === 0,
      pendingActionId: 'cover.load-meds',
      render: (d) =>
        d.medsMeta.pending ? (
          <p className={styles.pendingText}>
            Medication list unavailable.
            <br />
            <span style={{ fontSize: 11, color: '#888' }}>Target: ORWPS ACTIVE</span>
          </p>
        ) : d.meds.length === 0 ? (
          <p className={styles.emptyText}>No active medications</p>
        ) : (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Medication</th>
                <th>Sig</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {d.meds.map((m, i) => (
                <tr key={buildStableRowKey(i, [m.id, m.name, m.sig, m.status])}>
                  <td>{m.name}</td>
                  <td>{m.sig}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[m.status] || ''}`}>{m.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ),
    },
    vitals: {
      title: 'Vitals',
      contractId: 'ORQQVI VITALS',
      pending: data.vitalsMeta.pending && data.vitals.length === 0,
      pendingActionId: 'cover.load-vitals',
      render: (d) =>
        d.vitalsMeta.pending ? (
          <p className={styles.pendingText}>
            Vital signs unavailable.
            <br />
            <span style={{ fontSize: 11, color: '#888' }}>Target: ORQQVI VITALS</span>
          </p>
        ) : d.vitals.length === 0 ? (
          <p className={styles.emptyText}>No vitals recorded</p>
        ) : (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Value</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {d.vitals.map((v, i) => (
                <tr key={buildStableRowKey(i, [v.type, v.value, v.takenAt])}>
                  <td>{v.type}</td>
                  <td>{v.value}</td>
                  <td>{v.takenAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ),
    },
    notes: {
      title: 'Recent Notes',
      contractId: 'TIU DOCUMENTS BY CONTEXT',
      pending: data.notesMeta.pending && data.notes.length === 0,
      pendingActionId: 'cover.load-notes',
      render: (d) =>
        d.notesMeta.pending ? (
          <p className={styles.pendingText}>
            Recent notes unavailable.
            <br />
            <span style={{ fontSize: 11, color: '#888' }}>Target: TIU DOCUMENTS BY CONTEXT</span>
          </p>
        ) : d.notes.length === 0 ? (
          <p className={styles.emptyText}>No notes on record</p>
        ) : (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Date</th>
                <th>Author</th>
              </tr>
            </thead>
            <tbody>
              {d.notes.slice(0, 10).map((n, i) => (
                <tr key={buildStableRowKey(i, [n.id, n.title, n.date, n.author])}>
                  <td>{n.title}</td>
                  <td>{n.date}</td>
                  <td>{n.author}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ),
    },
    labs: {
      title: 'Recent Labs',
      contractId: 'ORWLRR INTERIM',
      pending: data.labsMeta.pending && data.labs.length === 0,
      pendingActionId: 'cover.load-labs',
      render: (d) =>
        d.labsMeta.pending ? (
          <p className={styles.pendingText}>
            Recent labs unavailable.
            <br />
            <span style={{ fontSize: 11, color: '#888' }}>Target: ORWLRR INTERIM</span>
          </p>
        ) : d.labs.length === 0 ? (
          <p className={styles.emptyText}>No recent lab results</p>
        ) : (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Test</th>
                <th>Result</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {d.labs.slice(0, 10).map((l, i) => (
                <tr key={buildStableRowKey(i, [l.id, l.name, l.date, l.value])}>
                  <td>{l.name || '\u2014'}</td>
                  <td>{l.value || '\u2014'}</td>
                  <td>{l.date || '\u2014'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ),
    },
    orders: {
      title: 'Orders Summary',
      contractId: 'ORWORB UNSIG ORDERS',
      pending: data.ordersPending && (!data.ordersSummary || data.ordersSummary.recent.length === 0),
      pendingActionId: 'cover.load-orders',
      render: (d) =>
        d.ordersPending && (!d.ordersSummary || d.ordersSummary.recent.length === 0) ? (
          <p className={styles.pendingText}>
            Orders summary unavailable.
            <br />
            <span style={{ fontSize: 11, color: '#888' }}>Target: ORWORB UNSIG ORDERS</span>
          </p>
        ) : !d.ordersSummary || d.ordersSummary.recent.length === 0 ? (
          <p className={styles.emptyText}>No unsigned orders</p>
        ) : (
          <>
            <p style={{ fontSize: 12, color: '#d9c9a3', margin: '0 0 4px' }}>
              {d.ordersSummary.unsigned} unsigned order(s)
            </p>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {d.ordersSummary.recent.slice(0, 8).map((o, i) => (
                  <tr key={buildStableRowKey(i, [o.id, o.orderId, o.name, o.status, o.date])}>
                    <td>{o.name}</td>
                    <td>{o.status}</td>
                    <td>{o.date || '\u2014'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ),
    },
    appointments: {
      title: 'Appointments',
      contractId: 'ORWPT APPTLST',
      pending: data.appointmentsPending && data.appointments.length === 0,
      pendingActionId: 'cover.load-appointments',
      render: (d) =>
        d.appointmentsPending && d.appointments.length === 0 ? (
          <p className={styles.pendingText}>
            Appointment data unavailable.
            <br />
            <span style={{ fontSize: 11, color: '#888' }}>Target: ORWPT APPTLST</span>
          </p>
        ) : d.appointments.length === 0 ? (
          <p className={styles.emptyText}>No upcoming appointments</p>
        ) : (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Clinic</th>
                <th>Status</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {d.appointments.slice(0, 8).map((appt, i) => {
                const status = String(appt.status || '\u2014').replace(/^request:/, 'request ');
                const source = appt.source === 'vista' ? 'EHR' : appt.source === 'request' ? 'Request' : '\u2014';
                return (
                  <tr key={buildStableRowKey(i, [appt.id, appt.dateTime, appt.clinic, status, source])}>
                    <td>{formatCoverAppointmentDate(appt.dateTime)}</td>
                    <td>{appt.clinic || '\u2014'}</td>
                    <td>{status}</td>
                    <td>{source}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ),
    },
    immunizations: {
      title: 'Immunizations',
      contractId: 'ORQQPX IMMUN LIST',
      pending: data.immuPending && data.immunizations.length === 0,
      pendingActionId: 'cover.load-immunizations',
      render: (d) =>
        d.immuPending && d.immunizations.length === 0 ? (
          <p className={styles.pendingText}>
            Immunization data integration pending.
            <br />
            <span style={{ fontSize: 11, color: '#888' }}>Target: ORQQPX IMMUN LIST</span>
          </p>
        ) : d.immunizations.length === 0 ? (
          <p className={styles.emptyText}>No immunizations on record</p>
        ) : (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Immunization</th>
                <th>Date</th>
                <th>Reaction</th>
              </tr>
            </thead>
            <tbody>
              {d.immunizations.slice(0, 8).map((im: any, i: number) => (
                <tr key={buildStableRowKey(i, [im.ien, im.name, im.dateTime, im.reaction])}>
                  <td>{im.name || im.ien}</td>
                  <td>{im.dateTime || '\u2014'}</td>
                  <td>{im.reaction || 'None'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ),
    },
    reminders: {
      title: 'Clinical Reminders',
      contractId: 'ORQQPX REMINDERS LIST',
      pending: data.remindersPending && data.reminders.length === 0,
      pendingActionId: 'cover.load-reminders',
      render: (d) =>
        d.remindersPending && d.reminders.length === 0 ? (
          <p className={styles.pendingText}>
            Clinical reminders unavailable.
            <br />
            <span style={{ fontSize: 11, color: '#888' }}>Target: ORQQPX REMINDERS LIST</span>
          </p>
        ) : d.reminders.length === 0 ? (
          <p className={styles.emptyText}>No clinical reminders due</p>
        ) : (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Reminder</th>
                <th>Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {d.reminders.slice(0, 8).map((r: any, i: number) => (
                <tr key={buildStableRowKey(i, [r.ien, r.name, r.due, r.status, r.priority])}>
                  <td>{r.name || r.ien}</td>
                  <td>{r.due || '\u2014'}</td>
                  <td>{r.status || '\u2014'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ),
    },
  };
}

/* ------------------------------------------------------------------ */
/* CoverSheetPanel                                                    */
/* ------------------------------------------------------------------ */

export default function CoverSheetPanel({ dfn }: Props) {
  const { fetchDomain, getDomain, getDomainMeta, isLoading } = useDataCache();
  const { dfn: patientDfn, demographics } = usePatient();
  const { ready: sessionReady, authenticated } = useSession();
  const { preferences, saveCoverSheetLayout, resetCoverSheetLayout } = useCPRSUI();

  const layout = preferences.coverSheetLayout;
  const panelOrder = layout.panelOrder?.length ? layout.panelOrder : DEFAULT_PANEL_ORDER;
  const panelHeights = layout.panelHeights ?? DEFAULT_PANEL_HEIGHTS;
  const panelVisibility = layout.panelVisibility;
  const isDragEnabled = preferences.enableDragReorder && preferences.layoutMode === 'modern';

  // Customize mode toggle
  const [customizeMode, setCustomizeMode] = useState(false);

  // Pending modal state
  const [pendingModal, setPendingModal] = useState<PendingActionInfo | null>(null);

  // Extra data states
  const [ordersSummary, setOrdersSummary] = useState<{ unsigned: number; recent: any[] } | null>(
    null
  );
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersPending, setOrdersPending] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsPending, setAppointmentsPending] = useState(false);
  const [immunizations, setImmunizations] = useState<any[]>([]);
  const [immuLoading, setImmuLoading] = useState(false);
  const [immuPending, setImmuPending] = useState(false);
  const [reminders, setReminders] = useState<any[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [remindersPending, setRemindersPending] = useState(false);
  const cacheRetryCountsRef = useRef<Record<string, number>>({});
  const customRetryCountsRef = useRef<Record<string, number>>({});

  // Local heights for immediate UI update (synced to store on change)
  const [heights, setHeights] = useState<Record<string, number>>(panelHeights);
  const isInitialSyncRef = useRef(true);
  const prevHeightsJsonRef = useRef<string>(JSON.stringify(panelHeights));

  // Drag state
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  // Sync heights from preferences when they change externally (e.g., server load)
  useEffect(() => {
    const incoming = preferences.coverSheetLayout.panelHeights ?? DEFAULT_PANEL_HEIGHTS;
    setHeights(incoming);
    // Mark this as an external sync so the persist effect skips echo-back
    isInitialSyncRef.current = true;
    prevHeightsJsonRef.current = JSON.stringify(incoming);
  }, [preferences.coverSheetLayout.panelHeights]);

  const loadOrdersSummary = useCallback(() => {
    setOrdersLoading(true);
    setOrdersPending(false);
    return fetchJson<CoverOrdersSummaryResponse>(`${API_BASE}/vista/cprs/orders-summary?dfn=${dfn}`)
      .then((d) => {
        if (d.ok) {
          setOrdersSummary({ unsigned: d.unsigned ?? 0, recent: d.recent ?? [] });
        } else {
          setOrdersSummary(null);
        }
        const hasPendingTargets = Array.isArray(d.pendingTargets) && d.pendingTargets.length > 0;
        setOrdersPending(d.ok !== true || hasPendingTargets || d.status === 'integration-pending');
      })
      .catch(() => {
        setOrdersSummary(null);
        setOrdersPending(true);
      })
      .finally(() => setOrdersLoading(false));
  }, [dfn]);

  const loadImmunizations = useCallback(() => {
    setImmuLoading(true);
    setImmuPending(false);
    return fetchJson<CoverImmunizationsResponse>(`${API_BASE}/vista/immunizations?dfn=${dfn}`)
      .then((d) => {
        const safeResults = Array.isArray(d.results)
          ? d.results.filter((entry: any) => !isImmunizationErrorResult(entry))
          : [];

        if (d.ok && safeResults.length > 0) {
          setImmunizations(safeResults);
        } else {
          setImmunizations([]);
        }
        const hadErrorArtifacts = Array.isArray(d.results) && d.results.some((entry: any) => isImmunizationErrorResult(entry));
        const hasPendingTargets = Array.isArray(d.pendingTargets) && d.pendingTargets.length > 0;
        setImmuPending(hadErrorArtifacts || d._integration === 'pending' || hasPendingTargets || d.ok !== true);
      })
      .catch(() => {
        setImmunizations([]);
        setImmuPending(true);
      })
      .finally(() => setImmuLoading(false));
  }, [dfn]);

  const loadAppointments = useCallback(() => {
    setAppointmentsLoading(true);
    setAppointmentsPending(false);
    return fetchJson<CoverAppointmentsResponse>(`${API_BASE}/vista/cprs/appointments?dfn=${dfn}`)
      .then((d) => {
        if (d.ok && Array.isArray(d.results)) {
          setAppointments(d.results);
        } else {
          setAppointments([]);
        }
        const hasPendingTargets = Array.isArray(d.pendingTargets) && d.pendingTargets.length > 0;
        setAppointmentsPending(d.status !== 'ok' || hasPendingTargets);
      })
      .catch(() => {
        setAppointments([]);
        setAppointmentsPending(true);
      })
      .finally(() => setAppointmentsLoading(false));
  }, [dfn]);

  const loadReminders = useCallback(() => {
    setRemindersLoading(true);
    setRemindersPending(false);
    return fetchJson<CoverRemindersResponse>(`${API_BASE}/vista/cprs/reminders?dfn=${dfn}`)
      .then((d) => {
        if (d.ok && Array.isArray(d.results)) {
          setReminders(d.results);
        } else {
          setReminders([]);
        }
        const hasPendingTargets = Array.isArray(d.pendingTargets) && d.pendingTargets.length > 0;
        setRemindersPending(d.ok !== true || hasPendingTargets);
      })
      .catch(() => {
        setReminders([]);
        setRemindersPending(true);
      })
      .finally(() => setRemindersLoading(false));
  }, [dfn]);

  // Data fetching
  useEffect(() => {
    if (!sessionReady || !authenticated || patientDfn !== dfn || !demographics) return;

    cacheRetryCountsRef.current = {};
    customRetryCountsRef.current = {};
    setOrdersSummary(null);
    setOrdersPending(false);
    setAppointments([]);
    setAppointmentsPending(false);
    setImmunizations([]);
    setImmuPending(false);
    setReminders([]);
    setRemindersPending(false);

    let cancelled = false;

    void (async () => {
      const coverDomains: Array<
        'problems' | 'allergies' | 'medications' | 'vitals' | 'notes' | 'labs'
      > = ['problems', 'allergies', 'medications', 'vitals', 'notes', 'labs'];

      for (const domain of coverDomains) {
        if (cancelled) return;
        await fetchDomain(dfn, domain);
      }

      void loadOrdersSummary();
      void loadImmunizations();
      void loadAppointments();
      void loadReminders();
    })();

    return () => {
      cancelled = true;
    };
  }, [authenticated, demographics, dfn, fetchDomain, loadAppointments, loadImmunizations, loadOrdersSummary, loadReminders, patientDfn, sessionReady]);

  const problems = getDomain(dfn, 'problems');
  const problemsMeta = getDomainMeta(dfn, 'problems');
  const allergiesData = getDomain(dfn, 'allergies');
  const allergiesMeta = getDomainMeta(dfn, 'allergies');
  const meds = getDomain(dfn, 'medications');
  const medsMeta = getDomainMeta(dfn, 'medications');
  const vitals = getDomain(dfn, 'vitals');
  const vitalsMeta = getDomainMeta(dfn, 'vitals');
  const notes = getDomain(dfn, 'notes');
  const notesMeta = getDomainMeta(dfn, 'notes');
  const labs = getDomain(dfn, 'labs');
  const labsMeta = getDomainMeta(dfn, 'labs');

  const loadingMap: PanelLoading = {
    problems: isLoading(dfn, 'problems'),
    allergies: isLoading(dfn, 'allergies'),
    meds: isLoading(dfn, 'medications'),
    vitals: isLoading(dfn, 'vitals'),
    notes: isLoading(dfn, 'notes'),
    labs: isLoading(dfn, 'labs'),
    orders: ordersLoading,
    appointments: appointmentsLoading,
    immunizations: immuLoading,
    reminders: remindersLoading,
  };

  useEffect(() => {
    if (!sessionReady || !authenticated || patientDfn !== dfn || !demographics) return;

    const retryCandidates: Array<keyof Pick<PanelData, 'problems' | 'allergies' | 'meds' | 'vitals' | 'notes' | 'labs'>> = [];
    if (problems.length === 0 && problemsMeta.pending && !loadingMap.problems) retryCandidates.push('problems');
    if (allergiesData.length === 0 && allergiesMeta.pending && !loadingMap.allergies) retryCandidates.push('allergies');
    if (meds.length === 0 && medsMeta.pending && !loadingMap.meds) retryCandidates.push('meds');
    if (vitals.length === 0 && vitalsMeta.pending && !loadingMap.vitals) retryCandidates.push('vitals');
    if (notes.length === 0 && notesMeta.pending && !loadingMap.notes) retryCandidates.push('notes');
    if (labs.length === 0 && labsMeta.pending && !loadingMap.labs) retryCandidates.push('labs');
    if (retryCandidates.length === 0) return;

    let cancelled = false;

    void (async () => {
      const domainMap = {
        problems: 'problems',
        allergies: 'allergies',
        meds: 'medications',
        vitals: 'vitals',
        notes: 'notes',
        labs: 'labs',
      } as const;

      for (const panelKey of retryCandidates) {
        const domain = domainMap[panelKey];
        const retryKey = `${dfn}:${domain}`;
        const attempts = cacheRetryCountsRef.current[retryKey] ?? 0;
        if (attempts >= CACHE_RETRY_LIMIT) continue;
        cacheRetryCountsRef.current[retryKey] = attempts + 1;
        await new Promise((resolve) => setTimeout(resolve, 600 * (attempts + 1)));
        if (cancelled) return;
        await fetchDomain(dfn, domain);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    allergiesData.length,
    allergiesMeta.pending,
    authenticated,
    demographics,
    dfn,
    fetchDomain,
    labs.length,
    labsMeta.pending,
    loadingMap.allergies,
    loadingMap.labs,
    loadingMap.meds,
    loadingMap.notes,
    loadingMap.problems,
    loadingMap.vitals,
    meds.length,
    medsMeta.pending,
    notes.length,
    notesMeta.pending,
    patientDfn,
    problems.length,
    problemsMeta.pending,
    sessionReady,
    vitals.length,
    vitalsMeta.pending,
  ]);

  useEffect(() => {
    if (!sessionReady || !authenticated || patientDfn !== dfn || !demographics) return;

    const retryCustom = async (
      key: string,
      shouldRetry: boolean,
      loader: () => Promise<unknown>
    ) => {
      if (!shouldRetry) return;
      const attempts = customRetryCountsRef.current[key] ?? 0;
      if (attempts >= CUSTOM_RETRY_LIMIT) return;
      customRetryCountsRef.current[key] = attempts + 1;
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempts + 1)));
      await loader();
    };

    void (async () => {
      await retryCustom(`orders:${dfn}`, ordersPending && (!ordersSummary || ordersSummary.recent.length === 0) && !ordersLoading, loadOrdersSummary);
      await retryCustom(`appointments:${dfn}`, appointmentsPending && appointments.length === 0 && !appointmentsLoading, loadAppointments);
      await retryCustom(`immunizations:${dfn}`, immuPending && immunizations.length === 0 && !immuLoading, loadImmunizations);
      await retryCustom(`reminders:${dfn}`, remindersPending && reminders.length === 0 && !remindersLoading, loadReminders);
    })();
  }, [
    appointments.length,
    appointmentsLoading,
    appointmentsPending,
    authenticated,
    demographics,
    dfn,
    immuLoading,
    immuPending,
    immunizations.length,
    loadAppointments,
    loadImmunizations,
    loadOrdersSummary,
    loadReminders,
    ordersLoading,
    ordersPending,
    ordersSummary,
    patientDfn,
    reminders.length,
    remindersLoading,
    remindersPending,
    sessionReady,
  ]);

  const panelData: PanelData = {
    problems,
    problemsMeta,
    allergies: allergiesData,
    allergiesMeta,
    meds,
    medsMeta,
    vitals,
    vitalsMeta,
    notes,
    notesMeta,
    labs,
    labsMeta,
    ordersSummary,
    ordersPending,
    appointments,
    appointmentsPending,
    immunizations,
    immuPending,
    reminders,
    remindersPending,
  };

  const panelDefs = buildPanelDefs(panelData);

  // Persist heights on change (debounced)
  const heightsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // Skip echo-back after external sync (server load / reset)
    if (isInitialSyncRef.current) {
      isInitialSyncRef.current = false;
      return;
    }
    // Skip if heights haven't actually changed (prevents infinite loops)
    const json = JSON.stringify(heights);
    if (json === prevHeightsJsonRef.current) return;
    prevHeightsJsonRef.current = json;

    if (heightsTimerRef.current) clearTimeout(heightsTimerRef.current);
    heightsTimerRef.current = setTimeout(() => {
      saveCoverSheetLayout({ panelHeights: heights });
    }, 300);
    return () => {
      if (heightsTimerRef.current) clearTimeout(heightsTimerRef.current);
    };
  }, [heights, saveCoverSheetLayout]);

  const handleResize = useCallback(
    (panel: string) => (delta: number) => {
      setHeights((prev) => ({
        ...prev,
        [panel]: Math.min(800, Math.max(80, (prev[panel] || 200) + delta)),
      }));
    },
    []
  );

  // Drag-and-drop handlers
  const handleDragStart = useCallback(
    (key: string) => (e: React.DragEvent) => {
      setDragKey(key);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', key);
    },
    []
  );

  const handleDragOver = useCallback(
    (key: string) => (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverKey(key);
    },
    []
  );

  const handleDrop = useCallback(
    (targetKey: string) => (e: React.DragEvent) => {
      e.preventDefault();
      setDragOverKey(null);
      if (!dragKey || dragKey === targetKey) return;
      const order = [...panelOrder];
      const fromIdx = order.indexOf(dragKey);
      const toIdx = order.indexOf(targetKey);
      if (fromIdx === -1 || toIdx === -1) return;
      order.splice(fromIdx, 1);
      order.splice(toIdx, 0, dragKey);
      saveCoverSheetLayout({ panelOrder: order });
      setDragKey(null);
    },
    [dragKey, panelOrder, saveCoverSheetLayout]
  );

  // Toggle panel visibility
  const toggleVisibility = useCallback(
    (key: string) => {
      const vis = { ...(panelVisibility ?? {}) };
      vis[key] = !(vis[key] ?? true);
      saveCoverSheetLayout({ panelVisibility: vis });
    },
    [panelVisibility, saveCoverSheetLayout]
  );

  // Build pending action info from action registry
  const showPending = (actionId: string) => {
    const coverActions = getActionsByLocation('CoverSheet');
    const action = coverActions.find((a) => a.actionId === actionId);
    if (action) {
      setPendingModal({
        actionId: action.actionId,
        label: action.label,
        rpcs: action.rpcs,
        pendingNote: action.pendingNote,
        pendingTargets: action.rpcs.length > 0 ? action.rpcs : undefined,
      });
    }
  };

  // Visible panels in order
  const visiblePanels = panelOrder.filter((key) => {
    if (!panelDefs[key]) return false;
    if (!customizeMode && panelVisibility && panelVisibility[key] === false) return false;
    return true;
  });

  return (
    <>
      {/* Toolbar: Customize + Reset */}
      <div className={styles.coverToolbar}>
        <button
          onClick={() => setCustomizeMode((v) => !v)}
          style={{
            border: '1px solid var(--cprs-border, #3a3a3a)',
            background: customizeMode ? 'var(--cprs-accent, #0066b2)' : 'transparent',
            color: customizeMode ? '#fff' : 'var(--cprs-text, #ccc)',
            padding: '2px 10px',
            borderRadius: 3,
            cursor: 'pointer',
            fontSize: 12,
          }}
          aria-pressed={customizeMode}
          title="Toggle layout customization mode"
        >
          {customizeMode ? 'Done Customizing' : 'Customize Layout'}
        </button>
        <button
          onClick={() => {
            resetCoverSheetLayout();
            setHeights({ ...DEFAULT_PANEL_HEIGHTS });
          }}
          style={{
            border: '1px solid var(--cprs-border, #3a3a3a)',
            background: 'transparent',
            color: 'var(--cprs-text, #ccc)',
            padding: '2px 10px',
            borderRadius: 3,
            cursor: 'pointer',
            fontSize: 12,
          }}
          title="Reset cover sheet layout to CPRS defaults"
        >
          Reset Layout
        </button>
        {customizeMode && (
          <span style={{ marginLeft: 'auto', color: '#888', fontSize: 11 }}>
            Drag panels to reorder
            {preferences.layoutMode === 'modern' ? '' : ' (enable Modern mode for drag)'} | Click
            eye icon to hide/show
          </span>
        )}
      </div>

      {/* Visibility toggles in customize mode */}
      {customizeMode && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            padding: '4px 8px',
            borderBottom: '1px solid var(--cprs-border, #3a3a3a)',
            fontSize: 11,
          }}
        >
          {panelOrder.map((key) => {
            const def = panelDefs[key];
            if (!def) return null;
            const visible = panelVisibility ? panelVisibility[key] !== false : true;
            return (
              <button
                key={key}
                onClick={() => toggleVisibility(key)}
                style={{
                  border: '1px solid var(--cprs-border, #3a3a3a)',
                  borderRadius: 3,
                  padding: '1px 8px',
                  background: visible ? 'var(--cprs-selected, #222)' : 'transparent',
                  color: visible ? 'var(--cprs-text, #ccc)' : '#666',
                  cursor: 'pointer',
                  fontSize: 11,
                }}
                aria-label={`${visible ? 'Hide' : 'Show'} ${def.title}`}
              >
                {visible ? '\u2713' : '\u2717'} {def.title}
              </button>
            );
          })}
        </div>
      )}

      {/* Panel grid */}
      <div className={styles.coverGrid}>
        {visiblePanels.map((key) => {
          const def = panelDefs[key];
          if (!def) return null;
          const isPending = Boolean(def.pending);
          return (
            <Section
              key={key}
              panelKey={key}
              title={def.title}
              contractId={def.contractId}
              loading={loadingMap[key as keyof PanelLoading] ?? false}
              pending={isPending}
              onPendingClick={
                def.pendingActionId ? () => showPending(def.pendingActionId!) : undefined
              }
              onResize={handleResize(key)}
              height={heights[key]}
              draggable={isDragEnabled || customizeMode}
              onDragStart={handleDragStart(key)}
              onDragOver={handleDragOver(key)}
              onDrop={handleDrop(key)}
              dragOverKey={dragOverKey}
            >
              {def.render(panelData)}
            </Section>
          );
        })}
      </div>

      {/* Integration Pending Modal */}
      {pendingModal && (
        <IntegrationPendingModal action={pendingModal} onClose={() => setPendingModal(null)} />
      )}
    </>
  );
}
