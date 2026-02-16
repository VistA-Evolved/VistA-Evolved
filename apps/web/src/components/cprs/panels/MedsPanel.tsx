'use client';

import { useEffect, useState } from 'react';
import { useDataCache, type Medication } from '@/stores/data-cache';
import { useCPRSUI } from '@/stores/cprs-ui-state';
import styles from '../cprs.module.css';

interface Props { dfn: string; }

export default function MedsPanel({ dfn }: Props) {
  const cache = useDataCache();
  const { openModal } = useCPRSUI();
  const [selected, setSelected] = useState<Medication | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => { cache.fetchDomain(dfn, 'medications'); }, [dfn]); // eslint-disable-line react-hooks/exhaustive-deps

  const meds = cache.getDomain(dfn, 'medications');
  const loading = cache.isLoading(dfn, 'medications');

  const filtered = filter === 'all' ? meds
    : meds.filter((m) => m.status?.toLowerCase() === filter);

  const statusCounts = meds.reduce((acc, m) => {
    const s = m.status?.toLowerCase() || 'unknown';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      <div className={styles.panelTitle}>Medications</div>
      <div className={styles.panelToolbar}>
        <button className={styles.btn} onClick={() => openModal('addMedication', { dfn })}>
          + New Medication Order
        </button>
        <select className={styles.formSelect} style={{ width: 'auto' }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All ({meds.length})</option>
          {Object.entries(statusCounts).map(([s, c]) => (
            <option key={s} value={s}>{s} ({c})</option>
          ))}
        </select>
      </div>

      <div className={styles.chipList}>
        {Object.entries(statusCounts).map(([status, count]) => (
          <span key={status} className={`${styles.chip}`}>
            <span className={`${styles.badge} ${styles[status] || ''}`}>{status}</span>
            <span>{count}</span>
          </span>
        ))}
      </div>

      <div className={styles.splitPane}>
        <div className={styles.splitLeft}>
          {loading && <p className={styles.loadingText}>Loading medications...</p>}
          {!loading && filtered.length === 0 && <p className={styles.emptyText}>No medications</p>}
          {!loading && filtered.length > 0 && (
            <table className={styles.dataTable}>
              <thead><tr><th>Medication</th><th>Status</th></tr></thead>
              <tbody>
                {filtered.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => setSelected(m)}
                    style={selected?.id === m.id ? { background: 'var(--cprs-selected)' } : undefined}
                  >
                    <td>{m.name}</td>
                    <td><span className={`${styles.badge} ${styles[m.status?.toLowerCase()] || ''}`}>{m.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className={styles.splitRight}>
          {selected ? (
            <div>
              <div className={styles.panelTitle}>Medication Detail</div>
              <div className={styles.formGroup}><label>Name</label><div>{selected.name}</div></div>
              <div className={styles.formGroup}><label>Sig</label><div>{selected.sig || '—'}</div></div>
              <div className={styles.formGroup}><label>Status</label><div><span className={`${styles.badge} ${styles[selected.status?.toLowerCase()] || ''}`}>{selected.status}</span></div></div>
            </div>
          ) : (
            <p className={styles.emptyText}>Select a medication to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}
