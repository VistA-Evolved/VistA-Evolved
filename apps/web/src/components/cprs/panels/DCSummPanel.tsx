'use client';

import { useState } from 'react';
import styles from '../cprs.module.css';

interface Props { dfn: string; }

const MOCK_SUMMARIES = [
  { id: '1', title: 'Discharge Summary — Cholecystectomy', date: '2024-03-16', status: 'Completed', author: 'Provider, Clyde WV',
    text: 'DISCHARGE SUMMARY\n\nAdmit Date: 03/15/2024\nDischarge Date: 03/16/2024\nAttending: Provider, Clyde WV\n\nDiagnosis: Cholelithiasis\nProcedure: Laparoscopic cholecystectomy\n\nHospital Course:\nPatient underwent uncomplicated laparoscopic cholecystectomy. Tolerated procedure well. Pain controlled with oral analgesics. Tolerating regular diet.\n\nDischarge Medications:\n- Acetaminophen 500mg PO Q6H PRN pain\n- Continue home medications\n\nFollow-up: Clinic in 2 weeks\n\nCondition at Discharge: Good' },
  { id: '2', title: 'Discharge Summary — Hernia Repair', date: '2022-08-21', status: 'Completed', author: 'Provider, Clyde WV',
    text: 'DISCHARGE SUMMARY\n\nAdmit Date: 08/20/2022\nDischarge Date: 08/21/2022\nAttending: Provider, Clyde WV\n\nDiagnosis: Right inguinal hernia\nProcedure: Right inguinal hernia repair with mesh\n\nHospital Course:\nUncomplicated mesh repair. Patient ambulating and tolerating diet.\n\nFollow-up: Clinic in 1 week' },
];

type DCSummary = typeof MOCK_SUMMARIES[number];

export default function DCSummPanel({ dfn }: Props) {
  const [selected, setSelected] = useState<DCSummary | null>(null);

  return (
    <div>
      <div className={styles.panelTitle}>Discharge Summaries</div>
      <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', margin: '2px 0 8px' }}>
        Contract: ORWOR UNSIGN &bull; Data source: mock dataset (API integration pending)
      </p>

      <div className={styles.splitPane}>
        <div className={styles.splitLeft}>
          <table className={styles.dataTable}>
            <thead><tr><th>Title</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              {MOCK_SUMMARIES.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setSelected(s)}
                  style={selected?.id === s.id ? { background: 'var(--cprs-selected)' } : undefined}
                >
                  <td>{s.title}</td>
                  <td>{s.date}</td>
                  <td><span className={`${styles.badge} ${styles.signed}`}>{s.status}</span></td>
                </tr>
              ))}
              {MOCK_SUMMARIES.length === 0 && (
                <tr><td colSpan={3} style={{ textAlign: 'center', fontStyle: 'italic' }}>No discharge summaries on file</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className={styles.splitRight}>
          {selected ? (
            <div>
              <div className={styles.panelTitle}>{selected.title}</div>
              <div className={styles.formGroup}><label>Date</label><div>{selected.date}</div></div>
              <div className={styles.formGroup}><label>Author</label><div>{selected.author}</div></div>
              <div className={styles.formGroup}>
                <label>Status</label>
                <div><span className={`${styles.badge} ${styles.signed}`}>{selected.status}</span></div>
              </div>
              <div style={{ marginTop: 8, padding: 8, border: '1px solid var(--cprs-border)', borderRadius: 4, background: 'var(--cprs-bg)' }}>
                <pre style={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', margin: 0 }}>
                  {selected.text}
                </pre>
              </div>
            </div>
          ) : (
            <p className={styles.emptyText}>Select a discharge summary to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}
