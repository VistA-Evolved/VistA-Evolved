'use client';

import { useState, useEffect } from 'react';
import { useDataCache, type Consult } from '../../../stores/data-cache';
import styles from '../cprs.module.css';
import { API_BASE } from '@/lib/api-config';
import CachePendingBanner from './CachePendingBanner';

interface Props {
  dfn: string;
}

function isPendingConsultStatus(consult: Consult): boolean {
  if (consult.statusCategory) return consult.statusCategory === 'pending';
  return /pending|active|scheduled|in progress|hold/i.test(consult.status);
}

function isCompleteConsultStatus(consult: Consult): boolean {
  if (consult.statusCategory) return consult.statusCategory === 'complete';
  return /complete|discontinued|cancelled/i.test(consult.status);
}

export default function ConsultsPanel({ dfn }: Props) {
  const { fetchDomain, getDomain, getDomainMeta, isLoading } = useDataCache();
  const [selected, setSelected] = useState<Consult | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'complete'>('all');
  const [detailText, setDetailText] = useState<string>('');
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchDomain(dfn, 'consults');
  }, [dfn, fetchDomain]);

  const consults = getDomain(dfn, 'consults');
  const loading = isLoading(dfn, 'consults');
  const consultsMeta = getDomainMeta(dfn, 'consults');

  useEffect(() => {
    setSelected(null);
    setDetailText('');
    setDetailLoading(false);
  }, [dfn]);

  useEffect(() => {
    if (!selected) return;

    const freshSelected = consults.find((consult) => consult.id === selected.id) || null;
    if (!freshSelected) {
      setSelected(null);
      setDetailText('');
      setDetailLoading(false);
      return;
    }

    if (freshSelected !== selected) {
      setSelected(freshSelected);
    }
  }, [consults, selected]);

  const filtered = consults.filter((c) => {
    if (filter === 'pending') return isPendingConsultStatus(c);
    if (filter === 'complete') return isCompleteConsultStatus(c);
    return true;
  });
  const showPendingBanner =
    !loading && consults.length === 0 && consultsMeta.fetched && (consultsMeta.pending || consultsMeta.ok !== true);
  const showFilterEmpty = !loading && consults.length > 0 && filtered.length === 0;

  async function handleSelect(c: Consult) {
    setSelected(c);
    setDetailText('');
    setDetailLoading(true);
    try {
      const res = await fetch(`${API_BASE}/vista/consults/detail?id=${c.id}`, {
        credentials: 'include',
      });
      const data = await res.json();
      setDetailText(data.ok ? (data.text ?? '(no detail text)') : 'Error loading detail');
    } catch {
      setDetailText('Network error loading detail');
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div>
      <div className={styles.panelTitle}>Consults / Requests</div>
      <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', margin: '2px 0 8px' }}>
        Contract: ORQQCN LIST / ORQQCN DETAIL &bull; Data source: live RPC
      </p>

      <div className={styles.panelToolbar}>
        <select
          className={styles.formSelect}
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          style={{ width: 'auto' }}
        >
          <option value="all">All Consults</option>
          <option value="pending">Pending</option>
          <option value="complete">Complete</option>
        </select>
        <span style={{ fontSize: 11, color: 'var(--cprs-text-muted)' }}>
          {loading ? 'Loading...' : `${filtered.length} consult(s)`}
        </span>
      </div>

      <div className={styles.splitPane}>
        <div className={styles.splitLeft}>
          {showPendingBanner && (
            <CachePendingBanner
              title="Consult list pending"
              noun="consult-list"
              meta={consultsMeta}
              defaultTargets={['ORQQCN LIST']}
            />
          )}
          {!showPendingBanner && (
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => handleSelect(c)}
                    style={selected?.id === c.id ? { background: 'var(--cprs-selected)' } : undefined}
                  >
                    <td>{c.service}</td>
                    <td>{c.date}</td>
                    <td>
                      <span className={`${styles.badge} ${isPendingConsultStatus(c) ? styles.draft : styles.signed}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!loading && showFilterEmpty && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', fontStyle: 'italic' }}>
                      No {filter} consults match the current filter
                    </td>
                  </tr>
                )}
                {!loading && !showFilterEmpty && filtered.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', fontStyle: 'italic' }}>
                      No consults on file
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <div className={styles.splitRight}>
          {selected ? (
            <div>
              <div className={styles.panelTitle}>{selected.service} Consult</div>
              <div className={styles.formGroup}>
                <label>Date</label>
                <div>{selected.date}</div>
              </div>
              <div className={styles.formGroup}>
                <label>Type</label>
                <div>{selected.type || '—'}</div>
              </div>
              <div className={styles.formGroup}>
                <label>Status</label>
                <div>
                  <span
                    className={`${styles.badge} ${isPendingConsultStatus(selected) ? styles.draft : styles.signed}`}
                  >
                    {selected.status}
                  </span>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Detail</label>
                <div style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', minHeight: 40 }}>
                  {detailLoading ? 'Loading...' : detailText}
                </div>
              </div>
            </div>
          ) : (
            <p className={styles.emptyText}>Select a consult to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}
