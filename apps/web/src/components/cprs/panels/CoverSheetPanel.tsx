'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useDataCache } from '@/stores/data-cache';
import { useCPRSUI, DEFAULT_PANEL_ORDER, DEFAULT_PANEL_HEIGHTS } from '@/stores/cprs-ui-state';
import IntegrationPendingModal, { type PendingActionInfo } from '../IntegrationPendingModal';
import { getActionsByLocation } from '@/actions/actionRegistry';
import styles from '../cprs.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

interface Props { dfn: string; }

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
    function onMove(e: MouseEvent) { resizeFn(e.clientY - startY); startY = e.clientY; }
    function onUp() { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
    handle.addEventListener('mousedown', onDown);
    return () => handle.removeEventListener('mousedown', onDown);
  }, [onResize]);

  // Keyboard resize: arrow keys on focused handle
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!onResize) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); onResize(10); }
    if (e.key === 'ArrowUp') { e.preventDefault(); onResize(-10); }
  }, [onResize]);

  const isDragOver = dragOverKey === panelKey;

  return (
    <div
      className={styles.coverSection}
      style={{
        minHeight: height ?? undefined,
        ...(draggable ? { cursor: 'grab' } : {}),
        ...(isDragOver ? { outline: '2px dashed var(--cprs-accent, #0066b2)', outlineOffset: -2 } : {}),
      }}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      data-panel-key={panelKey}
    >
      <h3>
        {draggable && <span style={{ cursor: 'grab', marginRight: 6, opacity: 0.5 }} aria-hidden>&#x2630;</span>}
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

async function fetchJson(url: string) {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

/* ------------------------------------------------------------------ */
/* Panel content renderers                                            */
/* ------------------------------------------------------------------ */

interface PanelData {
  problems: any[]; allergies: any[]; meds: any[]; vitals: any[];
  notes: any[]; labs: any[];
  ordersSummary: { unsigned: number; recent: any[] } | null;
  immunizations: any[]; immuPending: boolean;
  reminders: any[];
}

interface PanelLoading {
  problems: boolean; allergies: boolean; meds: boolean; vitals: boolean;
  notes: boolean; labs: boolean; orders: boolean; immunizations: boolean; reminders: boolean;
}

interface PanelDef {
  title: string;
  contractId: string;
  pending?: boolean;
  pendingActionId?: string;
  render: (data: PanelData) => React.ReactNode;
}

function buildPanelDefs(): Record<string, PanelDef> {
  return {
    problems: {
      title: 'Active Problems',
      contractId: 'CT_PROBLEMS',
      render: (d) =>
        d.problems.length === 0 ? <p className={styles.emptyText}>No active problems</p> : (
          <table className={styles.dataTable}>
            <thead><tr><th>Problem</th><th>Status</th><th>Onset</th></tr></thead>
            <tbody>
              {d.problems.map((p) => (
                <tr key={p.id}><td>{p.text}</td><td><span className={`${styles.badge} ${styles[p.status] || ''}`}>{p.status}</span></td><td>{p.onset || '\u2014'}</td></tr>
              ))}
            </tbody>
          </table>
        ),
    },
    allergies: {
      title: 'Allergies / Adverse Reactions',
      contractId: 'ORQQAL LIST',
      render: (d) =>
        d.allergies.length === 0 ? <p className={styles.emptyText}>No known allergies</p> : (
          <table className={styles.dataTable}>
            <thead><tr><th>Allergen</th><th>Severity</th><th>Reactions</th></tr></thead>
            <tbody>
              {d.allergies.map((a) => (
                <tr key={a.id}><td>{a.allergen}</td><td>{a.severity}</td><td>{a.reactions}</td></tr>
              ))}
            </tbody>
          </table>
        ),
    },
    meds: {
      title: 'Active Medications',
      contractId: 'ORWPS ACTIVE',
      render: (d) =>
        d.meds.length === 0 ? <p className={styles.emptyText}>No active medications</p> : (
          <table className={styles.dataTable}>
            <thead><tr><th>Medication</th><th>Sig</th><th>Status</th></tr></thead>
            <tbody>
              {d.meds.map((m) => (
                <tr key={m.id}><td>{m.name}</td><td>{m.sig}</td><td><span className={`${styles.badge} ${styles[m.status] || ''}`}>{m.status}</span></td></tr>
              ))}
            </tbody>
          </table>
        ),
    },
    vitals: {
      title: 'Vitals',
      contractId: 'ORQQVI VITALS',
      render: (d) =>
        d.vitals.length === 0 ? <p className={styles.emptyText}>No vitals recorded</p> : (
          <table className={styles.dataTable}>
            <thead><tr><th>Type</th><th>Value</th><th>Date</th></tr></thead>
            <tbody>
              {d.vitals.map((v, i) => (
                <tr key={i}><td>{v.type}</td><td>{v.value}</td><td>{v.takenAt}</td></tr>
              ))}
            </tbody>
          </table>
        ),
    },
    notes: {
      title: 'Recent Notes',
      contractId: 'TIU DOCUMENTS BY CONTEXT',
      render: (d) =>
        d.notes.length === 0 ? <p className={styles.emptyText}>No notes on record</p> : (
          <table className={styles.dataTable}>
            <thead><tr><th>Title</th><th>Date</th><th>Author</th></tr></thead>
            <tbody>
              {d.notes.slice(0, 10).map((n) => (
                <tr key={n.id}><td>{n.title}</td><td>{n.date}</td><td>{n.author}</td></tr>
              ))}
            </tbody>
          </table>
        ),
    },
    labs: {
      title: 'Recent Labs',
      contractId: 'ORWLRR INTERIM',
      render: (d) =>
        d.labs.length === 0 ? <p className={styles.emptyText}>No recent lab results</p> : (
          <table className={styles.dataTable}>
            <thead><tr><th>Test</th><th>Result</th><th>Date</th></tr></thead>
            <tbody>
              {d.labs.slice(0, 10).map((l, i) => (
                <tr key={i}><td>{l.name || '\u2014'}</td><td>{l.value || '\u2014'}</td><td>{l.date || '\u2014'}</td></tr>
              ))}
            </tbody>
          </table>
        ),
    },
    orders: {
      title: 'Orders Summary',
      contractId: 'ORWORB UNSIG ORDERS',
      render: (d) =>
        !d.ordersSummary || d.ordersSummary.recent.length === 0 ? (
          <p className={styles.emptyText}>No unsigned orders</p>
        ) : (
          <>
            <p style={{ fontSize: 12, color: '#d9c9a3', margin: '0 0 4px' }}>
              {d.ordersSummary.unsigned} unsigned order(s)
            </p>
            <table className={styles.dataTable}>
              <thead><tr><th>Order</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {d.ordersSummary.recent.slice(0, 8).map((o, i) => (
                  <tr key={i}><td>{o.name}</td><td>{o.status}</td><td>{o.date || '\u2014'}</td></tr>
                ))}
              </tbody>
            </table>
          </>
        ),
    },
    appointments: {
      title: 'Appointments',
      contractId: 'SD API APPOINTMENTS',
      pending: true,
      pendingActionId: 'cover.load-appointments',
      render: () => (
        <p className={styles.pendingText}>
          Appointments integration pending.<br />
          <span style={{ fontSize: 11, color: '#888' }}>Target: SD API APPOINTMENTS BY DFN</span>
        </p>
      ),
    },
    immunizations: {
      title: 'Immunizations',
      contractId: 'ORQQPX IMMUN LIST',
      render: (d) =>
        d.immuPending && d.immunizations.length === 0 ? (
          <p className={styles.pendingText}>
            Immunization data integration pending.<br />
            <span style={{ fontSize: 11, color: '#888' }}>Target: ORQQPX IMMUN LIST</span>
          </p>
        ) : d.immunizations.length === 0 ? (
          <p className={styles.emptyText}>No immunizations on record</p>
        ) : (
          <table className={styles.dataTable}>
            <thead><tr><th>Immunization</th><th>Date</th><th>Reaction</th></tr></thead>
            <tbody>
              {d.immunizations.slice(0, 8).map((im: any, i: number) => (
                <tr key={i}><td>{im.name || im.ien}</td><td>{im.dateTime || '\u2014'}</td><td>{im.reaction || 'None'}</td></tr>
              ))}
            </tbody>
          </table>
        ),
    },
    reminders: {
      title: 'Clinical Reminders',
      contractId: 'ORQQPX REMINDERS LIST',
      render: (d) =>
        d.reminders.length === 0 ? (
          <p className={styles.emptyText}>No clinical reminders due</p>
        ) : (
          <table className={styles.dataTable}>
            <thead><tr><th>Reminder</th><th>Due</th><th>Status</th></tr></thead>
            <tbody>
              {d.reminders.slice(0, 8).map((r: any, i: number) => (
                <tr key={i}><td>{r.name || r.ien}</td><td>{r.due || '\u2014'}</td><td>{r.status || '\u2014'}</td></tr>
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
  const cache = useDataCache();
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
  const [ordersSummary, setOrdersSummary] = useState<{ unsigned: number; recent: any[] } | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [immunizations, setImmunizations] = useState<any[]>([]);
  const [immuLoading, setImmuLoading] = useState(false);
  const [immuPending, setImmuPending] = useState(false);
  const [reminders, setReminders] = useState<any[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(false);

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

  // Data fetching
  useEffect(() => { cache.fetchAll(dfn); }, [dfn]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setOrdersLoading(true);
    fetchJson(`${API_BASE}/vista/cprs/orders-summary?dfn=${dfn}`)
      .then((d) => { if (d.ok) setOrdersSummary({ unsigned: d.unsigned, recent: d.recent }); })
      .catch(() => {})
      .finally(() => setOrdersLoading(false));
  }, [dfn]);

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

  useEffect(() => {
    setRemindersLoading(true);
    fetchJson(`${API_BASE}/vista/cprs/reminders?dfn=${dfn}`)
      .then((d) => { if (d.ok && d.results) setReminders(d.results); })
      .catch(() => {})
      .finally(() => setRemindersLoading(false));
  }, [dfn]);

  const problems = cache.getDomain(dfn, 'problems');
  const allergiesData = cache.getDomain(dfn, 'allergies');
  const meds = cache.getDomain(dfn, 'medications');
  const vitals = cache.getDomain(dfn, 'vitals');
  const notes = cache.getDomain(dfn, 'notes');
  const labs = cache.getDomain(dfn, 'labs');

  const loadingMap: PanelLoading = {
    problems: cache.isLoading(dfn, 'problems'),
    allergies: cache.isLoading(dfn, 'allergies'),
    meds: cache.isLoading(dfn, 'medications'),
    vitals: cache.isLoading(dfn, 'vitals'),
    notes: cache.isLoading(dfn, 'notes'),
    labs: cache.isLoading(dfn, 'labs'),
    orders: ordersLoading,
    immunizations: immuLoading,
    reminders: remindersLoading,
  };

  const panelData: PanelData = {
    problems, allergies: allergiesData, meds, vitals, notes, labs,
    ordersSummary, immunizations, immuPending, reminders,
  };

  const panelDefs = buildPanelDefs();

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
    return () => { if (heightsTimerRef.current) clearTimeout(heightsTimerRef.current); };
  }, [heights, saveCoverSheetLayout]);

  const handleResize = useCallback((panel: string) => (delta: number) => {
    setHeights((prev) => ({
      ...prev,
      [panel]: Math.min(800, Math.max(80, (prev[panel] || 200) + delta)),
    }));
  }, []);

  // Drag-and-drop handlers
  const handleDragStart = useCallback((key: string) => (e: React.DragEvent) => {
    setDragKey(key);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', key);
  }, []);

  const handleDragOver = useCallback((key: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverKey(key);
  }, []);

  const handleDrop = useCallback((targetKey: string) => (e: React.DragEvent) => {
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
  }, [dragKey, panelOrder, saveCoverSheetLayout]);

  // Toggle panel visibility
  const toggleVisibility = useCallback((key: string) => {
    const vis = { ...(panelVisibility ?? {}) };
    vis[key] = !(vis[key] ?? true);
    saveCoverSheetLayout({ panelVisibility: vis });
  }, [panelVisibility, saveCoverSheetLayout]);

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
            border: '1px solid var(--cprs-border, #3a3a3a)', background: customizeMode ? 'var(--cprs-accent, #0066b2)' : 'transparent',
            color: customizeMode ? '#fff' : 'var(--cprs-text, #ccc)', padding: '2px 10px', borderRadius: 3, cursor: 'pointer', fontSize: 12,
          }}
          aria-pressed={customizeMode}
          title="Toggle layout customization mode"
        >
          {customizeMode ? 'Done Customizing' : 'Customize Layout'}
        </button>
        <button
          onClick={() => { resetCoverSheetLayout(); setHeights({ ...DEFAULT_PANEL_HEIGHTS }); }}
          style={{
            border: '1px solid var(--cprs-border, #3a3a3a)', background: 'transparent',
            color: 'var(--cprs-text, #ccc)', padding: '2px 10px', borderRadius: 3, cursor: 'pointer', fontSize: 12,
          }}
          title="Reset cover sheet layout to CPRS defaults"
        >
          Reset Layout
        </button>
        {customizeMode && (
          <span style={{ marginLeft: 'auto', color: '#888', fontSize: 11 }}>
            Drag panels to reorder{preferences.layoutMode === 'modern' ? '' : ' (enable Modern mode for drag)'} | Click eye icon to hide/show
          </span>
        )}
      </div>

      {/* Visibility toggles in customize mode */}
      {customizeMode && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '4px 8px', borderBottom: '1px solid var(--cprs-border, #3a3a3a)', fontSize: 11 }}>
          {panelOrder.map((key) => {
            const def = panelDefs[key];
            if (!def) return null;
            const visible = panelVisibility ? panelVisibility[key] !== false : true;
            return (
              <button
                key={key}
                onClick={() => toggleVisibility(key)}
                style={{
                  border: '1px solid var(--cprs-border, #3a3a3a)', borderRadius: 3, padding: '1px 8px',
                  background: visible ? 'var(--cprs-selected, #222)' : 'transparent',
                  color: visible ? 'var(--cprs-text, #ccc)' : '#666', cursor: 'pointer', fontSize: 11,
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
          const isPending = def.pending || (key === 'immunizations' && immuPending && immunizations.length === 0);
          return (
            <Section
              key={key}
              panelKey={key}
              title={def.title}
              contractId={def.contractId}
              loading={loadingMap[key as keyof PanelLoading] ?? false}
              pending={isPending}
              onPendingClick={def.pendingActionId ? () => showPending(def.pendingActionId!) : undefined}
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
