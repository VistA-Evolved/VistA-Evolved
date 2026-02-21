'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useDataCache } from '@/stores/data-cache';
import { useCPRSUI } from '@/stores/cprs-ui-state';
import IntegrationPendingModal, { type PendingActionInfo } from '../IntegrationPendingModal';
import { getActionsByLocation } from '@/actions/actionRegistry';
import styles from '../cprs.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

interface Props { dfn: string; }

function Section({
  title,
  contractId,
  loading,
  error,
  pending,
  onPendingClick,
  children,
  onResize,
  height,
}: {
  title: string;
  contractId?: string;
  loading: boolean;
  error?: string | null;
  pending?: boolean;
  onPendingClick?: () => void;
  children: React.ReactNode;
  onResize?: (delta: number) => void;
  height?: number;
}) {
  const handleRef = useRef<HTMLDivElement>(null);

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
    function onMove(e: MouseEvent) { resizeFn(e.clientY - startY); startY = e.clientY; }
    function onUp() { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
    handle.addEventListener('mousedown', onDown);
    return () => handle.removeEventListener('mousedown', onDown);
  }, [onResize]);

  return (
    <div className={styles.coverSection} style={height ? { minHeight: height } : undefined}>
      <h3>
        {title}
        {pending && (
          <span
            className={styles.pendingBadge}
            onClick={onPendingClick}
            title="Integration pending -- click for details"
            style={{ cursor: 'pointer', marginLeft: 8, fontSize: 11, background: '#4a3d2d', color: '#d9c9a3', padding: '1px 6px', borderRadius: 3 }}
          >
            PENDING
          </span>
        )}
      </h3>
      {loading && <p className={styles.loadingText}>Loading...</p>}
      {error && <p className={styles.errorText}>{error}</p>}
      {!loading && !error && children}
      {contractId && !loading && !error && (
        <div style={{ position: 'absolute', top: 4, right: 8, fontSize: 9, color: '#767676' }}>{contractId}</div>
      )}
      <div ref={handleRef} className={styles.resizeHandle} />
    </div>
  );
}

async function fetchJson(url: string) {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export default function CoverSheetPanel({ dfn }: Props) {
  const cache = useDataCache();
  const { preferences, updatePreferences } = useCPRSUI();

  // Pending modal state
  const [pendingModal, setPendingModal] = useState<PendingActionInfo | null>(null);

  // Extra data states (labs, orders summary loaded via new Wave 1 endpoints)
  const [ordersSummary, setOrdersSummary] = useState<{ unsigned: number; recent: any[] } | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [immunizations, setImmunizations] = useState<any[]>([]);
  const [immuLoading, setImmuLoading] = useState(false);
  const [immuPending, setImmuPending] = useState(false);
  const [reminders, setReminders] = useState<any[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(false);

  useEffect(() => { cache.fetchAll(dfn); }, [dfn]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch orders summary from Wave 1 endpoint
  useEffect(() => {
    setOrdersLoading(true);
    fetchJson(`${API_BASE}/vista/cprs/orders-summary?dfn=${dfn}`)
      .then((d) => { if (d.ok) setOrdersSummary({ unsigned: d.unsigned, recent: d.recent }); })
      .catch(() => {})
      .finally(() => setOrdersLoading(false));
  }, [dfn]);

  // Fetch immunizations from Phase 65 endpoint
  useEffect(() => {
    setImmuLoading(true);
    fetchJson(`${API_BASE}/vista/immunizations?dfn=${dfn}`)
      .then((d) => {
        if (d.ok && d.results) setImmunizations(d.results);
        if (d._integration === 'pending') setImmuPending(true);
      })
      .catch(() => { setImmuPending(true); })
      .finally(() => setImmuLoading(false));
  }, [dfn]);

  // Fetch clinical reminders from Phase 78 wired endpoint
  useEffect(() => {
    setRemindersLoading(true);
    fetchJson(`${API_BASE}/vista/cprs/reminders?dfn=${dfn}`)
      .then((d) => { if (d.ok && d.results) setReminders(d.results); })
      .catch(() => {})
      .finally(() => setRemindersLoading(false));
  }, [dfn]);

  const problems = cache.getDomain(dfn, 'problems');
  const allergies = cache.getDomain(dfn, 'allergies');
  const meds = cache.getDomain(dfn, 'medications');
  const vitals = cache.getDomain(dfn, 'vitals');
  const notes = cache.getDomain(dfn, 'notes');
  const labs = cache.getDomain(dfn, 'labs');

  const pLoading = cache.isLoading(dfn, 'problems');
  const aLoading = cache.isLoading(dfn, 'allergies');
  const mLoading = cache.isLoading(dfn, 'medications');
  const vLoading = cache.isLoading(dfn, 'vitals');
  const nLoading = cache.isLoading(dfn, 'notes');
  const lLoading = cache.isLoading(dfn, 'labs');

  const [heights, setHeights] = useState<Record<string, number>>(
    preferences.coverSheetLayout.panelHeights
  );

  // Persist heights back to preferences on change
  useEffect(() => {
    const timer = setTimeout(() => {
      updatePreferences({
        coverSheetLayout: {
          ...preferences.coverSheetLayout,
          panelHeights: heights,
        },
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [heights]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResize = useCallback((panel: string) => (delta: number) => {
    setHeights((prev) => ({ ...prev, [panel]: Math.max(80, (prev[panel] || 150) + delta) }));
  }, []);

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

  return (
    <>
      <div className={styles.coverGrid}>
        {/* Row 1 left: Active Problems */}
        <Section title="Active Problems" contractId="CT_PROBLEMS" loading={pLoading} onResize={handleResize('problems')} height={heights.problems}>
          {problems.length === 0 ? <p className={styles.emptyText}>No active problems</p> : (
            <table className={styles.dataTable}>
              <thead><tr><th>Problem</th><th>Status</th><th>Onset</th></tr></thead>
              <tbody>
                {problems.map((p) => (
                  <tr key={p.id}><td>{p.text}</td><td><span className={`${styles.badge} ${styles[p.status] || ''}`}>{p.status}</span></td><td>{p.onset || '\u2014'}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* Row 1 right: Allergies */}
        <Section title="Allergies / Adverse Reactions" contractId="ORQQAL LIST" loading={aLoading} onResize={handleResize('allergies')} height={heights.allergies}>
          {allergies.length === 0 ? <p className={styles.emptyText}>No known allergies</p> : (
            <table className={styles.dataTable}>
              <thead><tr><th>Allergen</th><th>Severity</th><th>Reactions</th></tr></thead>
              <tbody>
                {allergies.map((a) => (
                  <tr key={a.id}><td>{a.allergen}</td><td>{a.severity}</td><td>{a.reactions}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* Row 2 left: Medications */}
        <Section title="Active Medications" contractId="ORWPS ACTIVE" loading={mLoading} onResize={handleResize('meds')} height={heights.meds}>
          {meds.length === 0 ? <p className={styles.emptyText}>No active medications</p> : (
            <table className={styles.dataTable}>
              <thead><tr><th>Medication</th><th>Sig</th><th>Status</th></tr></thead>
              <tbody>
                {meds.map((m) => (
                  <tr key={m.id}><td>{m.name}</td><td>{m.sig}</td><td><span className={`${styles.badge} ${styles[m.status] || ''}`}>{m.status}</span></td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* Row 2 right: Vitals */}
        <Section title="Vitals" contractId="ORQQVI VITALS" loading={vLoading} onResize={handleResize('vitals')} height={heights.vitals}>
          {vitals.length === 0 ? <p className={styles.emptyText}>No vitals recorded</p> : (
            <table className={styles.dataTable}>
              <thead><tr><th>Type</th><th>Value</th><th>Date</th></tr></thead>
              <tbody>
                {vitals.map((v, i) => (
                  <tr key={i}><td>{v.type}</td><td>{v.value}</td><td>{v.takenAt}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* Row 3 left: Recent Notes */}
        <Section title="Recent Notes" contractId="TIU DOCUMENTS BY CONTEXT" loading={nLoading} onResize={handleResize('notes')} height={heights.notes}>
          {notes.length === 0 ? <p className={styles.emptyText}>No notes on record</p> : (
            <table className={styles.dataTable}>
              <thead><tr><th>Title</th><th>Date</th><th>Author</th></tr></thead>
              <tbody>
                {notes.slice(0, 10).map((n) => (
                  <tr key={n.id}><td>{n.title}</td><td>{n.date}</td><td>{n.author}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* Row 3 right: Recent Labs (Phase 56 -- new) */}
        <Section title="Recent Labs" contractId="ORWLRR INTERIM" loading={lLoading} onResize={handleResize('labs')} height={heights.labs}>
          {labs.length === 0 ? <p className={styles.emptyText}>No recent lab results</p> : (
            <table className={styles.dataTable}>
              <thead><tr><th>Test</th><th>Result</th><th>Date</th></tr></thead>
              <tbody>
                {labs.slice(0, 10).map((l, i) => (
                  <tr key={i}><td>{l.name || '\u2014'}</td><td>{l.value || '\u2014'}</td><td>{l.date || '\u2014'}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* Row 4 left: Orders Summary (Phase 56 -- new) */}
        <Section title="Orders Summary" contractId="ORWORB UNSIG ORDERS" loading={ordersLoading} onResize={handleResize('orders')} height={heights.orders}>
          {!ordersSummary || ordersSummary.recent.length === 0 ? (
            <p className={styles.emptyText}>No unsigned orders</p>
          ) : (
            <>
              <p style={{ fontSize: 12, color: '#d9c9a3', margin: '0 0 4px' }}>
                {ordersSummary.unsigned} unsigned order(s)
              </p>
              <table className={styles.dataTable}>
                <thead><tr><th>Order</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {ordersSummary.recent.slice(0, 8).map((o, i) => (
                    <tr key={i}><td>{o.name}</td><td>{o.status}</td><td>{o.date || '\u2014'}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Section>

        {/* Row 4 right: Appointments (integration-pending) */}
        <Section
          title="Appointments"
          contractId="SD API APPOINTMENTS"
          loading={false}
          pending
          onPendingClick={() => showPending('cover.load-appointments')}
          onResize={handleResize('appointments')}
          height={heights.appointments}
        >
          <p className={styles.pendingText}>
            Appointments integration pending.<br />
            <span style={{ fontSize: 11, color: '#888' }}>Target: SD API APPOINTMENTS BY DFN</span>
          </p>
        </Section>

        {/* Row 5: Immunizations (Phase 65 -- VistA ORQQPX IMMUN LIST) */}
        <Section
          title="Immunizations"
          contractId="ORQQPX IMMUN LIST"
          loading={immuLoading}
          pending={immuPending && immunizations.length === 0}
          onResize={handleResize('immunizations')}
          height={heights.immunizations}
        >
          {immuPending && immunizations.length === 0 ? (
            <p className={styles.pendingText}>
              Immunization data integration pending.<br />
              <span style={{ fontSize: 11, color: '#888' }}>Target: ORQQPX IMMUN LIST</span>
            </p>
          ) : immunizations.length === 0 ? (
            <p className={styles.emptyText}>No immunizations on record</p>
          ) : (
            <table className={styles.dataTable}>
              <thead><tr><th>Immunization</th><th>Date</th><th>Reaction</th></tr></thead>
              <tbody>
                {immunizations.slice(0, 8).map((im: any, i: number) => (
                  <tr key={i}><td>{im.name || im.ien}</td><td>{im.dateTime || '\u2014'}</td><td>{im.reaction || 'None'}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* Row 6: Clinical Reminders (Phase 78: wired to ORQQPX REMINDERS LIST) */}
        <Section
          title="Clinical Reminders"
          contractId="ORQQPX REMINDERS"
          loading={remindersLoading}
          onResize={handleResize('reminders')}
          height={heights.reminders}
        >
          {reminders.length === 0 ? (
            <p className={styles.emptyText}>No clinical reminders due</p>
          ) : (
            <table className={styles.dataTable}>
              <thead><tr><th>Reminder</th><th>Due</th><th>Status</th></tr></thead>
              <tbody>
                {reminders.slice(0, 8).map((r: any, i: number) => (
                  <tr key={i}><td>{r.name || r.ien}</td><td>{r.due || '\u2014'}</td><td>{r.status || '\u2014'}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>

      {/* Integration Pending Modal */}
      {pendingModal && (
        <IntegrationPendingModal action={pendingModal} onClose={() => setPendingModal(null)} />
      )}
    </>
  );
}
