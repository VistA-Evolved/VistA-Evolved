'use client';

import { useState, useEffect } from 'react';
import { useDataCache, type Surgery } from '../../../stores/data-cache';
import styles from '../cprs.module.css';

interface Props { dfn: string; }

export default function SurgeryPanel({ dfn }: Props) {
  const { fetchDomain, getDomain, isLoading } = useDataCache();
  const [selected, setSelected] = useState<Surgery | null>(null);

  useEffect(() => { fetchDomain(dfn, 'surgery'); }, [dfn, fetchDomain]);

  const cases = getDomain(dfn, 'surgery');
  const loading = isLoading(dfn, 'surgery');

  return (
    <div>
      <div className={styles.panelTitle}>Surgery</div>
      <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', margin: '2px 0 8px' }}>
        Contract: ORWSR LIST &bull; Data source: live RPC
      </p>

      <div className={styles.splitPane}>
        <div className={styles.splitLeft}>
          <table className={styles.dataTable}>
            <thead><tr><th>Procedure</th><th>Date</th><th>Case #</th></tr></thead>
            <tbody>
              {cases.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setSelected(s)}
                  style={selected?.id === s.id ? { background: 'var(--cprs-selected)' } : undefined}
                >
                  <td>{s.procedure}</td>
                  <td>{s.date}</td>
                  <td>{s.caseNum}</td>
                </tr>
              ))}
              {!loading && cases.length === 0 && (
                <tr><td colSpan={3} style={{ textAlign: 'center', fontStyle: 'italic' }}>No surgical cases on file</td></tr>
              )}
            </tbody>
          </table>
          {loading && <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', padding: 8 }}>Loading...</p>}
        </div>
        <div className={styles.splitRight}>
          {selected ? (
            <div>
              <div className={styles.panelTitle}>{selected.procedure}</div>
              <div className={styles.formGroup}><label>Date</label><div>{selected.date}</div></div>
              <div className={styles.formGroup}><label>Case #</label><div>{selected.caseNum}</div></div>
              <div className={styles.formGroup}><label>Surgeon</label><div>{selected.surgeon}</div></div>
              <div style={{
                marginTop: 12, padding: '8px 10px', borderRadius: 4,
                background: 'rgba(255,165,0,0.06)', border: '1px solid rgba(255,165,0,0.3)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#856404' }}>
                  Operative Report -- Integration Pending
                </div>
                <div style={{ fontSize: 11, color: 'var(--cprs-text-muted)', marginTop: 4 }}>
                  Full operative/surgical report text requires ORWSR REPORT RPC (not yet wired).
                  Currently showing list-level fields from ORWSR LIST only.
                </div>
                <div style={{ fontSize: 10, color: 'var(--cprs-text-muted)', marginTop: 4 }}>
                  Target RPC: ORWSR REPORT | VistA File: Surgery (File 130)
                </div>
              </div>
            </div>
          ) : (
            <p className={styles.emptyText}>Select a surgical case to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}
