'use client';

import { useEffect, useState } from 'react';
import { fetchProblems } from '@/lib/api';
import type { Problem } from '@/lib/chart-types';
import styles from './panels.module.css';

interface ProblemsPanelProps {
  dfn: string;
}

export default function ProblemsPanel({ dfn }: ProblemsPanelProps) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchProblems(dfn)
      .then((p) => {
        if (!cancelled) {
          setProblems(p);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [dfn]);

  return (
    <div className={styles.listPanel}>
      <div className={styles.panelTitle}>Problem List</div>
      {loading && <p className={styles.loadingText}>Loading problems...</p>}
      {error && <p className={styles.errorText}>{error}</p>}
      {!loading && !error && problems.length === 0 && (
        <p className={styles.emptyText}>No problems on record</p>
      )}
      {!loading && !error && problems.length > 0 && (
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Problem</th>
              <th>Status</th>
              <th>Onset</th>
            </tr>
          </thead>
          <tbody>
            {problems.map((p) => (
              <tr key={p.id}>
                <td>{p.text}</td>
                <td>
                  <span
                    className={`${styles.listBadge} ${p.status?.toLowerCase() === 'active' ? styles.active : styles.inactive}`}
                  >
                    {p.status}
                  </span>
                </td>
                <td>{p.onset || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
