'use client';

import { useState, useEffect, useMemo } from 'react';
import { useDataCache, type LabResult } from '../../../stores/data-cache';
import styles from '../cprs.module.css';

interface Props { dfn: string; }

/** Determine if a flag indicates critical (HH/LL) vs abnormal (H/L) */
function flagSeverity(flag?: string): 'critical' | 'abnormal' | 'normal' {
  if (!flag) return 'normal';
  const f = flag.toUpperCase().trim();
  if (f === 'HH' || f === 'LL' || f === '**' || f === 'CRITICAL') return 'critical';
  if (f === 'H' || f === 'L' || f === '*' || f === 'ABNORMAL') return 'abnormal';
  return 'normal';
}

function flagColor(severity: 'critical' | 'abnormal' | 'normal'): string {
  if (severity === 'critical') return '#dc3545';
  if (severity === 'abnormal') return '#fd7e14';
  return 'inherit';
}

type ResultFilter = 'all' | 'abnormal' | 'unacknowledged';

export default function LabsPanel({ dfn }: Props) {
  const { fetchDomain, getDomain, isLoading, acknowledgeLabs } = useDataCache();
  const [selected, setSelected] = useState<LabResult | null>(null);
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());
  const [filterMode, setFilterMode] = useState<ResultFilter>('all');
  const [ackMode, setAckMode] = useState<string>(''); // 'real' | 'draft' | 'local' | ''

  useEffect(() => { fetchDomain(dfn, 'labs'); }, [dfn, fetchDomain]);

  const labs = getDomain(dfn, 'labs');
  const loading = isLoading(dfn, 'labs');

  const filteredLabs = useMemo(() => {
    return labs.filter((lab) => {
      if (filterMode === 'abnormal') return flagSeverity(lab.flag) !== 'normal';
      if (filterMode === 'unacknowledged') return !acknowledged.has(lab.id);
      return true;
    });
  }, [labs, filterMode, acknowledged]);

  const abnormalCount = labs.filter((l) => flagSeverity(l.flag) !== 'normal').length;
  const criticalCount = labs.filter((l) => flagSeverity(l.flag) === 'critical').length;
  const unackCount = labs.filter((l) => !acknowledged.has(l.id)).length;

  function handleAcknowledge(id: string) {
    setAcknowledged((prev) => new Set(prev).add(id));
    // Server-side write-back
    acknowledgeLabs(dfn, [id], 'current-user').then((r) => setAckMode(r.mode)).catch(() => {});
  }

  function handleAcknowledgeAll() {
    const ids = labs.map((l) => l.id);
    setAcknowledged((prev) => {
      const next = new Set(prev);
      labs.forEach((l) => next.add(l.id));
      return next;
    });
    acknowledgeLabs(dfn, ids, 'current-user').then((r) => setAckMode(r.mode)).catch(() => {});
  }

  return (
    <div>
      <div className={styles.panelTitle}>Laboratory Results</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2px 0 8px' }}>
        <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', margin: 0 }}>
          Contract: ORWLRR INTERIM &bull; {labs.length} result{labs.length !== 1 ? 's' : ''}
          {abnormalCount > 0 && <> &bull; <span style={{ color: '#fd7e14', fontWeight: 600 }}>{abnormalCount} abnormal</span></>}
          {criticalCount > 0 && <> &bull; <span style={{ color: '#dc3545', fontWeight: 600 }}>{criticalCount} CRITICAL</span></>}
          {unackCount > 0 && <> &bull; {unackCount} unacknowledged</>}
        </p>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <select
            className={styles.formSelect}
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as ResultFilter)}
            style={{ width: 'auto', fontSize: 11, padding: '2px 4px' }}
          >
            <option value="all">All Results</option>
            <option value="abnormal">Abnormal Only</option>
            <option value="unacknowledged">Unacknowledged</option>
          </select>
          {unackCount > 0 && (
            <button className={styles.btn} style={{ fontSize: 10, padding: '2px 6px' }} onClick={handleAcknowledgeAll}>
              Ack All
            </button>
          )}
        </div>
      </div>

      <div className={styles.splitPane}>
        <div className={styles.splitLeft}>
          <table className={styles.dataTable}>
            <thead><tr><th>Test</th><th>Date</th><th>Flag</th><th>Status</th></tr></thead>
            <tbody>
              {filteredLabs.map((lab) => {
                const severity = flagSeverity(lab.flag);
                return (
                  <tr
                    key={lab.id}
                    onClick={() => setSelected(lab)}
                    style={{
                      ...(selected?.id === lab.id ? { background: 'var(--cprs-selected)' } : undefined),
                      ...(severity === 'critical' ? { borderLeft: '3px solid #dc3545' } : severity === 'abnormal' ? { borderLeft: '3px solid #fd7e14' } : undefined),
                    }}
                  >
                    <td style={{ fontWeight: severity !== 'normal' ? 600 : 400, color: flagColor(severity) }}>{lab.name}</td>
                    <td>{lab.date || '—'}</td>
                    <td>
                      {severity === 'critical'
                        ? <span style={{ color: '#dc3545', fontWeight: 700, fontSize: 11 }}>{lab.flag}</span>
                        : severity === 'abnormal'
                        ? <span style={{ color: '#fd7e14', fontWeight: 600, fontSize: 11 }}>{lab.flag}</span>
                        : <span style={{ color: 'var(--cprs-text-muted)', fontSize: 11 }}>—</span>
                      }
                    </td>
                    <td>
                      {acknowledged.has(lab.id)
                        ? <span className={`${styles.badge} ${styles.signed}`}>Ack&apos;d</span>
                        : <span className={`${styles.badge} ${styles.unsigned}`}>{lab.status}</span>
                      }
                    </td>
                  </tr>
                );
              })}
              {!loading && filteredLabs.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', fontStyle: 'italic' }}>
                  {filterMode === 'all' ? 'No lab results on file' : `No ${filterMode} results`}
                </td></tr>
              )}
            </tbody>
          </table>
          {loading && <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', padding: 8 }}>Loading...</p>}
        </div>
        <div className={styles.splitRight}>
          {selected ? (
            <div>
              <div className={styles.panelTitle} style={{ color: flagColor(flagSeverity(selected.flag)) }}>
                {selected.name} — Detail
                {flagSeverity(selected.flag) === 'critical' && (
                  <span style={{ marginLeft: 8, fontSize: 10, background: '#dc3545', color: '#fff', padding: '1px 6px', borderRadius: 3 }}>CRITICAL</span>
                )}
              </div>
              <div className={styles.formGroup}><label>Date</label><div>{selected.date || '—'}</div></div>
              <div className={styles.formGroup}>
                <label>Status</label>
                <div>
                  {flagSeverity(selected.flag) === 'critical' ? (
                    <span style={{ color: '#dc3545', fontWeight: 700 }}>CRITICAL {selected.flag === 'HH' ? '(HIGH)' : selected.flag === 'LL' ? '(LOW)' : ''}</span>
                  ) : flagSeverity(selected.flag) === 'abnormal' ? (
                    <span style={{ color: '#fd7e14', fontWeight: 600 }}>{selected.flag === 'H' ? 'HIGH' : selected.flag === 'L' ? 'LOW' : 'ABNORMAL'}</span>
                  ) : (
                    <span className={`${styles.badge} ${styles.signed}`}>{selected.status}</span>
                  )}
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Result</label>
                <div style={{ fontFamily: 'monospace', fontWeight: 600, color: flagColor(flagSeverity(selected.flag)) }}>
                  {selected.value}{selected.units ? ` ${selected.units}` : ''}
                </div>
              </div>
              {selected.refRange && (
                <div className={styles.formGroup}>
                  <label>Reference Range</label>
                  <div style={{ fontSize: 12 }}>{selected.refRange}</div>
                </div>
              )}
              {selected.specimen && (
                <div className={styles.formGroup}>
                  <label>Specimen</label>
                  <div style={{ fontSize: 12 }}>{selected.specimen}</div>
                </div>
              )}
              {!acknowledged.has(selected.id) && (
                <div>
                  <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => handleAcknowledge(selected.id)} style={{ marginTop: 8 }}>
                    Acknowledge Result
                  </button>
                  <p style={{ fontSize: 10, color: 'var(--cprs-text-muted)', marginTop: 4 }}>
                    Contract: ORWLRR ACK &bull; {ackMode === 'real' ? 'Synced to EHR' : ackMode === 'draft' ? 'Stored server-side (sync pending)' : 'Server-side acknowledgement'}
                  </p>
                </div>
              )}
              {acknowledged.has(selected.id) && (
                <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', marginTop: 8, fontStyle: 'italic' }}>
                  Result acknowledged.
                </p>
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
