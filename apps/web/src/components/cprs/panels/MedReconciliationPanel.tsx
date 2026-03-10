'use client';

import { useEffect, useState, useCallback } from 'react';
import { API_BASE } from '@/lib/api-config';
import { csrfHeaders } from '@/lib/csrf';
import styles from '../cprs.module.css';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface MedRecMedication {
  id: string;
  name: string;
  sig?: string;
  status?: string;
  source: 'active_order' | 'outpatient_rx' | 'reconciled';
  orderIen?: string;
  rxNumber?: string;
  reconcileAction?: 'continue' | 'discontinue' | 'modify' | 'hold';
  reconciledAt?: string;
  reconciledBy?: string;
}

interface ReconcileDecision {
  medicationId: string;
  action: 'continue' | 'discontinue' | 'modify' | 'hold';
  notes?: string;
}

interface ReconciliationHistoryEntry {
  id: string;
  medicationName: string;
  action: string;
  performedBy: string;
  performedAt: string;
  notes?: string;
}

interface OutsideMedForm {
  name: string;
  sig: string;
  prescriber: string;
  pharmacy: string;
}

interface Props {
  dfn: string;
}

type Tab = 'medications' | 'outside' | 'history';

const INITIAL_OUTSIDE_MED: OutsideMedForm = {
  name: '',
  sig: '',
  prescriber: '',
  pharmacy: '',
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function sourceLabel(source: MedRecMedication['source']): string {
  switch (source) {
    case 'active_order':
      return 'Active Order (File 100)';
    case 'outpatient_rx':
      return 'Outpatient Rx (File 52)';
    case 'reconciled':
      return 'Reconciled';
    default:
      return source;
  }
}

function actionColor(action: string): string {
  switch (action) {
    case 'continue':
      return '#059669';
    case 'discontinue':
      return '#dc2626';
    case 'modify':
      return '#d97706';
    case 'hold':
      return '#6366f1';
    default:
      return '#64748b';
  }
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function MedReconciliationPanel({ dfn }: Props) {
  const [tab, setTab] = useState<Tab>('medications');
  const [medications, setMedications] = useState<MedRecMedication[]>([]);
  const [history, setHistory] = useState<ReconciliationHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<MedRecMedication | null>(null);
  const [reconcileNotes, setReconcileNotes] = useState('');
  const [actionInFlight, setActionInFlight] = useState('');
  const [outsideMed, setOutsideMed] = useState<OutsideMedForm>({ ...INITIAL_OUTSIDE_MED });
  const [outsideSubmitting, setOutsideSubmitting] = useState(false);
  const [outsideSuccess, setOutsideSuccess] = useState('');
  const [outsideError, setOutsideError] = useState('');
  const [notification, setNotification] = useState('');

  /* ---------- Fetch medication list ------------------------------ */

  const fetchMedList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/vista/medrec/medlist?dfn=${dfn}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const meds: MedRecMedication[] = json.data ?? json.medications ?? [];
      setMedications(meds);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load medications');
    } finally {
      setLoading(false);
    }
  }, [dfn]);

  /* ---------- Fetch reconciliation history ----------------------- */

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/vista/medrec/history?dfn=${dfn}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setHistory(json.data ?? json.history ?? []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [dfn]);

  useEffect(() => {
    void fetchMedList();
  }, [fetchMedList]);

  useEffect(() => {
    if (tab === 'history') void fetchHistory();
  }, [tab, fetchHistory]);

  useEffect(() => {
    setSelected(null);
    setTab('medications');
  }, [dfn]);

  /* ---------- Reconcile action ----------------------------------- */

  const handleReconcile = useCallback(
    async (medId: string, action: ReconcileDecision['action']) => {
      setActionInFlight(`${medId}:${action}`);
      setNotification('');
      try {
        const res = await fetch(`${API_BASE}/vista/medrec/reconcile`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
          body: JSON.stringify({
            dfn,
            medicationId: medId,
            action,
            notes: reconcileNotes || undefined,
          } satisfies ReconcileDecision & { dfn: string }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        setNotification(`Medication ${action === 'continue' ? 'continued' : action === 'discontinue' ? 'discontinued' : action === 'modify' ? 'marked for modification' : 'placed on hold'}`);
        setReconcileNotes('');
        void fetchMedList();
      } catch (err: unknown) {
        setNotification(err instanceof Error ? err.message : 'Reconcile failed');
      } finally {
        setActionInFlight('');
      }
    },
    [dfn, reconcileNotes, fetchMedList],
  );

  /* ---------- Add outside medication ----------------------------- */

  const handleAddOutsideMed = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!outsideMed.name.trim()) {
        setOutsideError('Medication name is required');
        return;
      }
      setOutsideSubmitting(true);
      setOutsideError('');
      setOutsideSuccess('');
      try {
        const res = await fetch(`${API_BASE}/vista/medrec/outside-med`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
          body: JSON.stringify({ dfn, ...outsideMed }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        setOutsideSuccess(`${outsideMed.name} added to medication list`);
        setOutsideMed({ ...INITIAL_OUTSIDE_MED });
        void fetchMedList();
      } catch (err: unknown) {
        setOutsideError(err instanceof Error ? err.message : 'Failed to add medication');
      } finally {
        setOutsideSubmitting(false);
      }
    },
    [dfn, outsideMed, fetchMedList],
  );

  /* ---------- Categorized medication lists ----------------------- */

  const activeOrders = medications.filter((m) => m.source === 'active_order');
  const outpatientRx = medications.filter((m) => m.source === 'outpatient_rx');
  const reconciled = medications.filter((m) => m.source === 'reconciled');

  /* ---------- Render --------------------------------------------- */

  return (
    <div>
      <div className={styles.panelTitle}>Medication Reconciliation</div>

      {/* Tab strip */}
      <div className={styles.panelToolbar} style={{ gap: 0, marginBottom: 8 }}>
        {(['medications', 'outside', 'history'] as Tab[]).map((t) => (
          <button
            key={t}
            className={styles.btn}
            style={{
              background: tab === t ? 'var(--cprs-primary)' : undefined,
              color: tab === t ? '#fff' : undefined,
              borderRadius: 0,
              borderRight: '1px solid var(--cprs-border)',
            }}
            onClick={() => setTab(t)}
          >
            {t === 'medications' ? 'Medications' : t === 'outside' ? 'Add Outside Med' : 'History'}
          </button>
        ))}
        <button className={styles.btn} onClick={fetchMedList} style={{ marginLeft: 'auto' }}>
          Refresh
        </button>
      </div>

      {notification && (
        <div
          style={{
            padding: '6px 12px',
            marginBottom: 8,
            borderRadius: 4,
            background: notification.includes('fail') || notification.includes('HTTP') ? '#fef2f2' : '#ecfdf5',
            color: notification.includes('fail') || notification.includes('HTTP') ? '#991b1b' : '#065f46',
            fontSize: 12,
          }}
        >
          {notification}
        </div>
      )}

      {/* === Medications Tab === */}
      {tab === 'medications' && (
        <div className={styles.splitPane}>
          <div className={styles.splitLeft}>
            {loading && <p className={styles.loadingText}>Loading medication list...</p>}
            {error && (
              <div style={{ padding: 12, background: '#fef2f2', borderRadius: 6, color: '#991b1b', fontSize: 13, marginBottom: 8 }}>
                {error}
                <button className={styles.btn} style={{ marginLeft: 8 }} onClick={fetchMedList}>
                  Retry
                </button>
              </div>
            )}
            {!loading && !error && medications.length === 0 && (
              <p className={styles.emptyText}>No medications found for this patient</p>
            )}

            {!loading && activeOrders.length > 0 && (
              <MedCategory
                title="Active Orders (File 100)"
                meds={activeOrders}
                selected={selected}
                onSelect={setSelected}
                badgeClass={styles.active}
              />
            )}
            {!loading && outpatientRx.length > 0 && (
              <MedCategory
                title="Outpatient Rx (File 52)"
                meds={outpatientRx}
                selected={selected}
                onSelect={setSelected}
                badgeClass=""
              />
            )}
            {!loading && reconciled.length > 0 && (
              <MedCategory
                title="Already Reconciled"
                meds={reconciled}
                selected={selected}
                onSelect={setSelected}
                badgeClass={styles.completed}
              />
            )}
          </div>

          {/* Detail + Action pane */}
          <div className={styles.splitRight}>
            {selected ? (
              <div>
                <div className={styles.panelTitle}>Reconciliation Actions</div>
                <div className={styles.formGroup}>
                  <label>Medication</label>
                  <div style={{ fontWeight: 600 }}>{selected.name}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>Sig</label>
                  <div>{selected.sig || '--'}</div>
                </div>
                <div className={styles.formGroup}>
                  <label>Source</label>
                  <div>{sourceLabel(selected.source)}</div>
                </div>
                {selected.reconcileAction && (
                  <div className={styles.formGroup}>
                    <label>Current Decision</label>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#fff',
                        background: actionColor(selected.reconcileAction),
                      }}
                    >
                      {selected.reconcileAction.toUpperCase()}
                    </span>
                  </div>
                )}

                <div className={styles.formGroup} style={{ marginTop: 12 }}>
                  <label>Notes (optional)</label>
                  <textarea
                    className={styles.formInput}
                    rows={2}
                    value={reconcileNotes}
                    onChange={(e) => setReconcileNotes(e.target.value)}
                    placeholder="Clinical rationale..."
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {(['continue', 'discontinue', 'modify', 'hold'] as const).map((action) => {
                    const inFlight = actionInFlight === `${selected.id}:${action}`;
                    return (
                      <button
                        key={action}
                        className={styles.btn}
                        disabled={!!actionInFlight}
                        style={{
                          background: actionColor(action),
                          color: '#fff',
                          opacity: actionInFlight && !inFlight ? 0.5 : 1,
                          minWidth: 90,
                        }}
                        onClick={() => handleReconcile(selected.id, action)}
                      >
                        {inFlight ? '...' : action.charAt(0).toUpperCase() + action.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className={styles.emptyText}>Select a medication to reconcile</p>
            )}
          </div>
        </div>
      )}

      {/* === Outside Medication Tab === */}
      {tab === 'outside' && (
        <div style={{ maxWidth: 540, padding: '8px 0' }}>
          <div style={{ fontSize: 13, color: 'var(--cprs-text-muted)', marginBottom: 12 }}>
            Add medications the patient reports taking that are not in the current order list.
          </div>
          <form onSubmit={handleAddOutsideMed}>
            <div className={styles.formGroup}>
              <label>Medication Name *</label>
              <input
                className={styles.formInput}
                value={outsideMed.name}
                onChange={(e) => setOutsideMed((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Lisinopril 10mg"
                style={{ width: '100%' }}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Sig / Directions</label>
              <input
                className={styles.formInput}
                value={outsideMed.sig}
                onChange={(e) => setOutsideMed((prev) => ({ ...prev, sig: e.target.value }))}
                placeholder="e.g. Take 1 tablet by mouth daily"
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className={styles.formGroup}>
                <label>Prescriber</label>
                <input
                  className={styles.formInput}
                  value={outsideMed.prescriber}
                  onChange={(e) => setOutsideMed((prev) => ({ ...prev, prescriber: e.target.value }))}
                  placeholder="Dr. Smith"
                  style={{ width: '100%' }}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Pharmacy</label>
                <input
                  className={styles.formInput}
                  value={outsideMed.pharmacy}
                  onChange={(e) => setOutsideMed((prev) => ({ ...prev, pharmacy: e.target.value }))}
                  placeholder="CVS, Walgreens, etc."
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {outsideError && (
              <div style={{ padding: '6px 10px', background: '#fef2f2', color: '#991b1b', borderRadius: 4, fontSize: 12, marginBottom: 8 }}>
                {outsideError}
              </div>
            )}
            {outsideSuccess && (
              <div style={{ padding: '6px 10px', background: '#ecfdf5', color: '#065f46', borderRadius: 4, fontSize: 12, marginBottom: 8 }}>
                {outsideSuccess}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                type="submit"
                className={styles.btn}
                disabled={outsideSubmitting}
                style={{ background: 'var(--cprs-primary)', color: '#fff' }}
              >
                {outsideSubmitting ? 'Adding...' : 'Add Outside Medication'}
              </button>
              <button
                type="button"
                className={styles.btn}
                onClick={() => {
                  setOutsideMed({ ...INITIAL_OUTSIDE_MED });
                  setOutsideError('');
                  setOutsideSuccess('');
                }}
              >
                Clear
              </button>
            </div>
          </form>
        </div>
      )}

      {/* === History Tab === */}
      {tab === 'history' && (
        <div style={{ padding: '8px 0' }}>
          {historyLoading && <p className={styles.loadingText}>Loading reconciliation history...</p>}
          {!historyLoading && history.length === 0 && (
            <p className={styles.emptyText}>No reconciliation history for this patient</p>
          )}
          {!historyLoading && history.length > 0 && (
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Medication</th>
                  <th>Action</th>
                  <th>By</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {entry.performedAt
                        ? new Date(entry.performedAt).toLocaleDateString()
                        : '--'}
                    </td>
                    <td>{entry.medicationName}</td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '1px 6px',
                          borderRadius: 3,
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#fff',
                          background: actionColor(entry.action),
                        }}
                      >
                        {entry.action.toUpperCase()}
                      </span>
                    </td>
                    <td>{entry.performedBy || '--'}</td>
                    <td style={{ color: 'var(--cprs-text-muted)', fontSize: 12 }}>
                      {entry.notes || '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MedCategory sub-component                                           */
/* ------------------------------------------------------------------ */

function MedCategory({
  title,
  meds,
  selected,
  onSelect,
  badgeClass,
}: {
  title: string;
  meds: MedRecMedication[];
  selected: MedRecMedication | null;
  onSelect: (m: MedRecMedication) => void;
  badgeClass: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--cprs-text-muted)',
          padding: '4px 0',
          borderBottom: '1px solid var(--cprs-border-light)',
          marginBottom: 4,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {title} ({meds.length})
      </div>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th>Medication</th>
            <th>Status</th>
            <th>Decision</th>
          </tr>
        </thead>
        <tbody>
          {meds.map((m) => (
            <tr
              key={m.id}
              onClick={() => onSelect(m)}
              style={
                selected?.id === m.id ? { background: 'var(--cprs-selected)', cursor: 'pointer' } : { cursor: 'pointer' }
              }
            >
              <td>{m.name}</td>
              <td>
                <span className={`${styles.badge} ${badgeClass}`}>{m.status || m.source}</span>
              </td>
              <td>
                {m.reconcileAction ? (
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '1px 6px',
                      borderRadius: 3,
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#fff',
                      background: actionColor(m.reconcileAction),
                    }}
                  >
                    {m.reconcileAction.toUpperCase()}
                  </span>
                ) : (
                  <span style={{ color: 'var(--cprs-text-muted)', fontSize: 11 }}>Pending</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
