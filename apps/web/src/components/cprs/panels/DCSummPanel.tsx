'use client';

import { useState, useEffect } from 'react';
import { useDataCache, type DCSummary } from '../../../stores/data-cache';
import styles from '../cprs.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Props { dfn: string; }

export default function DCSummPanel({ dfn }: Props) {
  const { fetchDomain, getDomain, isLoading } = useDataCache();
  const [selected, setSelected] = useState<DCSummary | null>(null);
  const [fullText, setFullText] = useState<string>('');
  const [textLoading, setTextLoading] = useState(false);

  useEffect(() => { fetchDomain(dfn, 'dcSummaries'); }, [dfn, fetchDomain]);

  const summaries = getDomain(dfn, 'dcSummaries');
  const loading = isLoading(dfn, 'dcSummaries');

  async function handleSelect(s: DCSummary) {
    setSelected(s);
    setFullText('');
    setTextLoading(true);
    try {
      const res = await fetch(`${API_BASE}/vista/tiu-text?id=${s.id}`, { credentials: 'include' });
      const data = await res.json();
      setFullText(data.ok ? (data.text ?? '(no text)') : 'Error loading text');
    } catch {
      setFullText('Network error loading text');
    } finally {
      setTextLoading(false);
    }
  }

  return (
    <div>
      <div className={styles.panelTitle}>Discharge Summaries</div>
      <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', margin: '2px 0 8px' }}>
        Contract: TIU DOCUMENTS BY CONTEXT (CLASS 244) &bull; Data source: live RPC
      </p>

      <div className={styles.splitPane}>
        <div className={styles.splitLeft}>
          <table className={styles.dataTable}>
            <thead><tr><th>Title</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              {summaries.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => handleSelect(s)}
                  style={selected?.id === s.id ? { background: 'var(--cprs-selected)' } : undefined}
                >
                  <td>{s.title}</td>
                  <td>{s.date}</td>
                  <td>
                    <span className={`${styles.badge} ${/unsigned/i.test(s.status) ? styles.unsigned : styles.signed}`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && summaries.length === 0 && (
                <tr><td colSpan={3} style={{ textAlign: 'center', fontStyle: 'italic' }}>No discharge summaries on file</td></tr>
              )}
            </tbody>
          </table>
          {loading && <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', padding: 8 }}>Loading...</p>}
        </div>
        <div className={styles.splitRight}>
          {selected ? (
            <div>
              <div className={styles.panelTitle}>{selected.title}</div>
              <div className={styles.formGroup}><label>Date</label><div>{selected.date}</div></div>
              <div className={styles.formGroup}><label>Author</label><div>{selected.author}</div></div>
              <div className={styles.formGroup}>
                <label>Status</label>
                <div>
                  <span className={`${styles.badge} ${/unsigned/i.test(selected.status) ? styles.unsigned : styles.signed}`}>
                    {selected.status}
                  </span>
                </div>
              </div>
              <div style={{ marginTop: 8, padding: 8, border: '1px solid var(--cprs-border)', borderRadius: 4, background: 'var(--cprs-bg)' }}>
                <pre style={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', margin: 0 }}>
                  {textLoading ? 'Loading...' : fullText}
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
