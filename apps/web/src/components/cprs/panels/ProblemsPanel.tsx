'use client';

import { useEffect, useState } from 'react';
import { useDataCache, type Problem } from '@/stores/data-cache';
import { useCPRSUI } from '@/stores/cprs-ui-state';
import styles from '../cprs.module.css';

interface Props { dfn: string; }

export default function ProblemsPanel({ dfn }: Props) {
  const cache = useDataCache();
  const { openModal } = useCPRSUI();
  const [selected, setSelected] = useState<Problem | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => { cache.fetchDomain(dfn, 'problems'); }, [dfn]); // eslint-disable-line react-hooks/exhaustive-deps

  const problems = cache.getDomain(dfn, 'problems');
  const loading = cache.isLoading(dfn, 'problems');

  const filtered = filter === 'all' ? problems
    : problems.filter((p) => p.status?.toLowerCase() === filter);

  return (
    <div>
      <div className={styles.panelTitle}>Problem List</div>
      <div className={styles.panelToolbar}>
        <button className={styles.btn} onClick={() => openModal('addProblem', { dfn })}>
          + New Problem
        </button>
        <select className={styles.formSelect} style={{ width: 'auto' }} value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="all">All Problems</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      <div className={styles.splitPane}>
        <div className={styles.splitLeft}>
          {loading && <p className={styles.loadingText}>Loading problems...</p>}
          {!loading && filtered.length === 0 && <p className={styles.emptyText}>No problems on record</p>}
          {!loading && filtered.length > 0 && (
            <table className={styles.dataTable}>
              <thead><tr><th>Problem</th><th>Status</th></tr></thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelected(p)}
                    style={selected?.id === p.id ? { background: 'var(--cprs-selected)' } : undefined}
                  >
                    <td>{p.text}</td>
                    <td><span className={`${styles.badge} ${styles[p.status] || ''}`}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className={styles.splitRight}>
          {selected ? (
            <div>
              <div className={styles.panelTitle}>Problem Detail</div>
              <div className={styles.formGroup}>
                <label>Problem</label>
                <div>{selected.text}</div>
              </div>
              <div className={styles.formGroup}>
                <label>Status</label>
                <div><span className={`${styles.badge} ${styles[selected.status] || ''}`}>{selected.status}</span></div>
              </div>
              <div className={styles.formGroup}>
                <label>Onset Date</label>
                <div>{selected.onset || '—'}</div>
              </div>
              <div style={{ marginTop: 12 }}>
                <button className={styles.btn} onClick={() => openModal('editProblem', { dfn, problem: selected })}>
                  Edit Problem
                </button>
              </div>
            </div>
          ) : (
            <p className={styles.emptyText}>Select a problem to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}
