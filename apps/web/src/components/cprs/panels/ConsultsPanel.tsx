'use client';

import { useState } from 'react';
import styles from '../cprs.module.css';

interface Props { dfn: string; }

const MOCK_CONSULTS = [
  { id: '1', service: 'Cardiology', date: '2025-12-10', status: 'Complete', urgency: 'Routine', reason: 'Elevated BP, ECG changes', result: 'Echocardiogram WNL. Recommend continue current regimen.' },
  { id: '2', service: 'Endocrinology', date: '2025-11-01', status: 'Pending', urgency: 'Routine', reason: 'Borderline HbA1c', result: '' },
  { id: '3', service: 'Ophthalmology', date: '2025-09-15', status: 'Complete', urgency: 'Routine', reason: 'Annual diabetic eye exam', result: 'No diabetic retinopathy detected.' },
];

type Consult = typeof MOCK_CONSULTS[number];

export default function ConsultsPanel({ dfn }: Props) {
  const [selected, setSelected] = useState<Consult | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'complete'>('all');

  const filtered = MOCK_CONSULTS.filter((c) => {
    if (filter === 'pending') return c.status === 'Pending';
    if (filter === 'complete') return c.status === 'Complete';
    return true;
  });

  return (
    <div>
      <div className={styles.panelTitle}>Consults / Requests</div>
      <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', margin: '2px 0 8px' }}>
        Contract: ORQQCN LIST / ORQQCN DETAIL &bull; Data source: mock dataset (API integration pending)
      </p>

      <div className={styles.panelToolbar}>
        <select className={styles.formSelect} value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} style={{ width: 'auto' }}>
          <option value="all">All Consults</option>
          <option value="pending">Pending</option>
          <option value="complete">Complete</option>
        </select>
        <span style={{ fontSize: 11, color: 'var(--cprs-text-muted)' }}>{filtered.length} consult(s)</span>
      </div>

      <div className={styles.splitPane}>
        <div className={styles.splitLeft}>
          <table className={styles.dataTable}>
            <thead><tr><th>Service</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelected(c)}
                  style={selected?.id === c.id ? { background: 'var(--cprs-selected)' } : undefined}
                >
                  <td>{c.service}</td>
                  <td>{c.date}</td>
                  <td>
                    <span className={`${styles.badge} ${c.status === 'Pending' ? styles.draft : styles.signed}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.splitRight}>
          {selected ? (
            <div>
              <div className={styles.panelTitle}>{selected.service} Consult</div>
              <div className={styles.formGroup}><label>Date</label><div>{selected.date}</div></div>
              <div className={styles.formGroup}><label>Urgency</label><div>{selected.urgency}</div></div>
              <div className={styles.formGroup}><label>Reason</label><div>{selected.reason}</div></div>
              <div className={styles.formGroup}>
                <label>Status</label>
                <div>
                  <span className={`${styles.badge} ${selected.status === 'Pending' ? styles.draft : styles.signed}`}>
                    {selected.status}
                  </span>
                </div>
              </div>
              {selected.result && (
                <div className={styles.formGroup}>
                  <label>Result</label>
                  <div style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{selected.result}</div>
                </div>
              )}
            </div>
          ) : (
            <p className={styles.emptyText}>Select a consult to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}
