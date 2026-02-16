'use client';

import { useState } from 'react';
import styles from '../cprs.module.css';

interface Props { dfn: string; }

/* Mock lab data for interactive UI - will be replaced by real API */
const MOCK_LABS = [
  { id: '1', name: 'CBC', date: '2025-12-15', status: 'Final', value: 'WBC: 7.2, Hgb: 14.1, Plt: 225' },
  { id: '2', name: 'BMP', date: '2025-12-15', status: 'Final', value: 'Na: 140, K: 4.1, Cr: 1.0, Glu: 95' },
  { id: '3', name: 'Lipid Panel', date: '2025-11-20', status: 'Final', value: 'TC: 195, LDL: 120, HDL: 55, Trig: 100' },
  { id: '4', name: 'HbA1c', date: '2025-11-20', status: 'Final', value: '5.8%' },
  { id: '5', name: 'TSH', date: '2025-10-01', status: 'Final', value: '2.1 mIU/L' },
  { id: '6', name: 'Urinalysis', date: '2025-10-01', status: 'Final', value: 'WNL' },
];

type Lab = typeof MOCK_LABS[number];

export default function LabsPanel({ dfn }: Props) {
  const [selected, setSelected] = useState<Lab | null>(null);
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());

  function handleAcknowledge(id: string) {
    setAcknowledged((prev) => new Set(prev).add(id));
  }

  return (
    <div>
      <div className={styles.panelTitle}>Laboratory Results</div>
      <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', margin: '2px 0 8px' }}>
        Contract: ORWLRR INTERIM / ORWLRR CHART &bull; Data source: mock dataset (API integration pending)
      </p>

      <div className={styles.splitPane}>
        <div className={styles.splitLeft}>
          <table className={styles.dataTable}>
            <thead><tr><th>Test</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              {MOCK_LABS.map((lab) => (
                <tr
                  key={lab.id}
                  onClick={() => setSelected(lab)}
                  style={selected?.id === lab.id ? { background: 'var(--cprs-selected)' } : undefined}
                >
                  <td>{lab.name}</td>
                  <td>{lab.date}</td>
                  <td>
                    {acknowledged.has(lab.id)
                      ? <span className={`${styles.badge} ${styles.signed}`}>Acknowledged</span>
                      : <span className={`${styles.badge} ${styles.unsigned}`}>{lab.status}</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.splitRight}>
          {selected ? (
            <div>
              <div className={styles.panelTitle}>{selected.name} — Detail</div>
              <div className={styles.formGroup}><label>Date</label><div>{selected.date}</div></div>
              <div className={styles.formGroup}><label>Status</label><div>{selected.status}</div></div>
              <div className={styles.formGroup}><label>Results</label><div style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{selected.value}</div></div>
              {!acknowledged.has(selected.id) && (
                <button className={styles.btn} onClick={() => handleAcknowledge(selected.id)} style={{ marginTop: 8 }}>
                  Acknowledge Result
                </button>
              )}
            </div>
          ) : (
            <p className={styles.emptyText}>Select a lab result to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}
