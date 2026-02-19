'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useDataCache } from '@/stores/data-cache';
import { useCPRSUI } from '@/stores/cprs-ui-state';
import styles from '../cprs.module.css';

interface Props { dfn: string; }

function Section({
  title,
  contractId,
  loading,
  error,
  children,
  onResize,
}: {
  title: string;
  contractId?: string;
  loading: boolean;
  error?: string | null;
  children: React.ReactNode;
  onResize?: (delta: number) => void;
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
    <div className={styles.coverSection}>
      <h3>{title}</h3>
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

export default function CoverSheetPanel({ dfn }: Props) {
  const cache = useDataCache();
  const { preferences } = useCPRSUI();

  useEffect(() => { cache.fetchAll(dfn); }, [dfn]); // eslint-disable-line react-hooks/exhaustive-deps

  const problems = cache.getDomain(dfn, 'problems');
  const allergies = cache.getDomain(dfn, 'allergies');
  const meds = cache.getDomain(dfn, 'medications');
  const vitals = cache.getDomain(dfn, 'vitals');
  const notes = cache.getDomain(dfn, 'notes');

  const pLoading = cache.isLoading(dfn, 'problems');
  const aLoading = cache.isLoading(dfn, 'allergies');
  const mLoading = cache.isLoading(dfn, 'medications');
  const vLoading = cache.isLoading(dfn, 'vitals');
  const nLoading = cache.isLoading(dfn, 'notes');

  const [heights, setHeights] = useState<Record<string, number>>(
    preferences.coverSheetLayout.panelHeights
  );

  const handleResize = useCallback((panel: string) => (delta: number) => {
    setHeights((prev) => ({ ...prev, [panel]: Math.max(80, (prev[panel] || 150) + delta) }));
  }, []);

  return (
    <div className={styles.coverGrid}>
      {/* Top-left: Active Problems */}
      <Section title="Active Problems" contractId="CT_PROBLEMS" loading={pLoading} onResize={handleResize('problems')}>
        {problems.length === 0 ? <p className={styles.emptyText}>No active problems</p> : (
          <table className={styles.dataTable}>
            <thead><tr><th>Problem</th><th>Status</th><th>Onset</th></tr></thead>
            <tbody>
              {problems.map((p) => (
                <tr key={p.id}><td>{p.text}</td><td><span className={`${styles.badge} ${styles[p.status] || ''}`}>{p.status}</span></td><td>{p.onset || '—'}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Top-right: Allergies */}
      <Section title="Allergies / Adverse Reactions" contractId="ORQQAL LIST" loading={aLoading} onResize={handleResize('allergies')}>
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

      {/* Mid-left: Medications */}
      <Section title="Active Medications" contractId="ORWPS ACTIVE" loading={mLoading} onResize={handleResize('meds')}>
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

      {/* Mid-right: Vitals */}
      <Section title="Vitals" contractId="ORQQVI VITALS" loading={vLoading} onResize={handleResize('vitals')}>
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

      {/* Bottom-left: Recent Notes */}
      <Section title="Recent Notes" contractId="TIU DOCUMENTS BY CONTEXT" loading={nLoading} onResize={handleResize('notes')}>
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

      {/* Bottom-right: Reminders / Appointments */}
      <Section title="Clinical Reminders" contractId="ORQQPX REMINDERS" loading={false}>
        <p className={styles.pendingText}>
          Clinical Reminders integration pending.<br />
          Contract: ORQQPX REMINDERS LIST / ORQQPX REMINDER DETAIL
        </p>
      </Section>
    </div>
  );
}
