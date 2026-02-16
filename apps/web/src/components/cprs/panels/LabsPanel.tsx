'use client';

import { useState, useEffect } from 'react';
import { useDataCache, type LabResult } from '../../../stores/data-cache';
import styles from '../cprs.module.css';

interface Props { dfn: string; }

export default function LabsPanel({ dfn }: Props) {
  const { fetchDomain, getDomain, isLoading } = useDataCache();
  const [selected, setSelected] = useState<LabResult | null>(null);
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());

  useEffect(() => { fetchDomain(dfn, 'labs'); }, [dfn, fetchDomain]);

  const labs = getDomain(dfn, 'labs');
  const loading = isLoading(dfn, 'labs');

  function handleAcknowledge(id: string) {
    setAcknowledged((prev) => new Set(prev).add(id));
  }

  return (
    <div>
      <div className={styles.panelTitle}>Laboratory Results</div>
      <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', margin: '2px 0 8px' }}>
        Contract: ORWLRR INTERIM &bull; Data source: live RPC
      </p>

      <div className={styles.splitPane}>
        <div className={styles.splitLeft}>
          <table className={styles.dataTable}>
            <thead><tr><th>Test</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              {labs.map((lab) => (
                <tr
                  key={lab.id}
                  onClick={() => setSelected(lab)}
                  style={selected?.id === lab.id ? { background: 'var(--cprs-selected)' } : undefined}
                >
                  <td>{lab.name}</td>
                  <td>{lab.date || '—'}</td>
                  <td>
                    {acknowledged.has(lab.id)
                      ? <span className={`${styles.badge} ${styles.signed}`}>Acknowledged</span>
                      : <span className={`${styles.badge} ${styles.unsigned}`}>{lab.status}</span>
                    }
                  </td>
                </tr>
              ))}
              {!loading && labs.length === 0 && (
                <tr><td colSpan={3} style={{ textAlign: 'center', fontStyle: 'italic' }}>No lab results on file</td></tr>
              )}
            </tbody>
          </table>
          {loading && <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', padding: 8 }}>Loading...</p>}
        </div>
        <div className={styles.splitRight}>
          {selected ? (
            <div>
              <div className={styles.panelTitle}>{selected.name} — Detail</div>
              <div className={styles.formGroup}><label>Date</label><div>{selected.date || '—'}</div></div>
              <div className={styles.formGroup}><label>Status</label><div>{selected.status}</div></div>
              <div className={styles.formGroup}>
                <label>Results</label>
                <div style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{selected.value}</div>
              </div>
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
