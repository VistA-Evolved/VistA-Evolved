'use client';

import { useEffect, useState, useCallback } from 'react';
import styles from '../cprs.module.css';

interface Immunization {
  ien: string;
  name: string;
  dateTime: string;
  reaction: string;
  inverseDt: string;
}

interface ImmunizationResponse {
  ok: boolean;
  source?: string;
  count: number;
  results: Immunization[];
  rpcUsed: string[];
  pendingTargets: string[];
  _integration?: string;
}

interface Props {
  dfn: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function ImmunizationsPanel({ dfn }: Props) {
  const [data, setData] = useState<ImmunizationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Immunization | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchImmunizations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/vista/immunizations?dfn=${dfn}`, {
        credentials: 'include',
      });
      const json: ImmunizationResponse = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Failed to load immunizations');
    } finally {
      setLoading(false);
    }
  }, [dfn]);

  useEffect(() => {
    fetchImmunizations();
  }, [fetchImmunizations]);

  const isPending = data?._integration === 'pending';
  const immunizations = data?.results || [];

  return (
    <div>
      <div className={styles.panelTitle}>Immunizations</div>
      <div className={styles.panelToolbar}>
        <button className={styles.btn} disabled title="Add immunization — integration pending (PX SAVE DATA)">
          + Add Immunization (pending)
        </button>
        <button className={styles.btn} onClick={fetchImmunizations} disabled={loading}>
          Refresh
        </button>
        {data?.rpcUsed && data.rpcUsed.length > 0 && (
          <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>
            RPC: {data.rpcUsed.join(', ')}
          </span>
        )}
      </div>

      {isPending && (
        <div style={{ background: '#2a2200', border: '1px solid #665500', padding: '8px 12px', margin: '8px 0', borderRadius: 4, fontSize: 12 }}>
          <strong style={{ color: '#ffcc00' }}>Integration Pending</strong>
          <span style={{ color: '#d9c9a3', marginLeft: 8 }}>
            VistA RPC unavailable — target: ORQQPX IMMUN LIST
          </span>
        </div>
      )}

      <div className={styles.splitPane}>
        <div className={styles.splitLeft}>
          {loading && <p className={styles.loadingText}>Loading immunizations...</p>}
          {error && <p style={{ color: '#ff6666', fontSize: 12, padding: 8 }}>{error}</p>}
          {!loading && !error && immunizations.length === 0 && !isPending && (
            <p className={styles.emptyText}>No immunizations on record</p>
          )}
          {!loading && immunizations.length > 0 && (
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Immunization</th>
                  <th>Date</th>
                  <th>Reaction</th>
                </tr>
              </thead>
              <tbody>
                {immunizations.map((imm) => (
                  <tr
                    key={imm.ien}
                    onClick={() => setSelected(imm)}
                    style={selected?.ien === imm.ien ? { background: 'var(--cprs-selected)' } : undefined}
                  >
                    <td>{imm.name || imm.ien}</td>
                    <td>{imm.dateTime || '\u2014'}</td>
                    <td>{imm.reaction || 'None'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className={styles.splitRight}>
          {selected ? (
            <div style={{ padding: 8, fontSize: 12 }}>
              <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>{selected.name}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '4px 8px' }}>
                <span style={{ color: '#888' }}>IEN:</span><span>{selected.ien}</span>
                <span style={{ color: '#888' }}>Date:</span><span>{selected.dateTime || '\u2014'}</span>
                <span style={{ color: '#888' }}>Reaction:</span><span>{selected.reaction || 'None'}</span>
              </div>
              {data?.pendingTargets && data.pendingTargets.length > 0 && (
                <div style={{ marginTop: 12, fontSize: 11, color: '#888' }}>
                  Pending targets: {data.pendingTargets.join(', ')}
                </div>
              )}
            </div>
          ) : (
            <p className={styles.emptyText}>Select an immunization to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}
