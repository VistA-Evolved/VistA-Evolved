'use client';

import { useState } from 'react';
import styles from '../cprs.module.css';

interface Props { dfn: string; }

const MOCK_SURGERIES = [
  { id: '1', procedure: 'Cholecystectomy (Laparoscopic)', date: '2024-03-15', surgeon: 'Provider, Clyde WV', status: 'Completed', notes: 'Uncomplicated. Discharged POD 1.' },
  { id: '2', procedure: 'Right Inguinal Hernia Repair', date: '2022-08-20', surgeon: 'Provider, Clyde WV', status: 'Completed', notes: 'Mesh repair. No complications.' },
];

type Surgery = typeof MOCK_SURGERIES[number];

export default function SurgeryPanel({ dfn }: Props) {
  const [selected, setSelected] = useState<Surgery | null>(null);

  return (
    <div>
      <div className={styles.panelTitle}>Surgery</div>
      <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', margin: '2px 0 8px' }}>
        Contract: ORWSR RPTLIST &bull; Data source: mock dataset (API integration pending)
      </p>

      <div className={styles.splitPane}>
        <div className={styles.splitLeft}>
          <table className={styles.dataTable}>
            <thead><tr><th>Procedure</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              {MOCK_SURGERIES.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setSelected(s)}
                  style={selected?.id === s.id ? { background: 'var(--cprs-selected)' } : undefined}
                >
                  <td>{s.procedure}</td>
                  <td>{s.date}</td>
                  <td><span className={`${styles.badge} ${styles.signed}`}>{s.status}</span></td>
                </tr>
              ))}
              {MOCK_SURGERIES.length === 0 && (
                <tr><td colSpan={3} style={{ textAlign: 'center', fontStyle: 'italic' }}>No surgical procedures on file</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className={styles.splitRight}>
          {selected ? (
            <div>
              <div className={styles.panelTitle}>{selected.procedure}</div>
              <div className={styles.formGroup}><label>Date</label><div>{selected.date}</div></div>
              <div className={styles.formGroup}><label>Surgeon</label><div>{selected.surgeon}</div></div>
              <div className={styles.formGroup}>
                <label>Status</label>
                <div><span className={`${styles.badge} ${styles.signed}`}>{selected.status}</span></div>
              </div>
              <div className={styles.formGroup}>
                <label>Operative Note</label>
                <div style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{selected.notes}</div>
              </div>
            </div>
          ) : (
            <p className={styles.emptyText}>Select a surgical procedure to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}
