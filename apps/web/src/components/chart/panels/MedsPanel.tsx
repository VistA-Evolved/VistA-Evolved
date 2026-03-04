'use client';

import { useEffect, useState } from 'react';
import { fetchMedications } from '@/lib/api';
import type { Medication } from '@/lib/chart-types';
import styles from './panels.module.css';

interface MedsPanelProps {
  dfn: string;
}

export default function MedsPanel({ dfn }: MedsPanelProps) {
  const [meds, setMeds] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMedications(dfn)
      .then((m) => {
        if (!cancelled) {
          setMeds(m);
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
      <div className={styles.panelTitle}>Medications</div>
      {loading && <p className={styles.loadingText}>Loading medications...</p>}
      {error && <p className={styles.errorText}>{error}</p>}
      {!loading && !error && meds.length === 0 && (
        <p className={styles.emptyText}>No active medications</p>
      )}
      {!loading && !error && meds.length > 0 && (
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Medication</th>
              <th>Sig</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {meds.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{m.sig}</td>
                <td>
                  <span
                    className={`${styles.listBadge} ${m.status?.toLowerCase() === 'active' ? styles.active : ''}`}
                  >
                    {m.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
