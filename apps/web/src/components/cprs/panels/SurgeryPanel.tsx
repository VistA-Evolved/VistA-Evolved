'use client';

import { useState, useEffect } from 'react';
import { useDataCache, type Surgery } from '../../../stores/data-cache';
import styles from '../cprs.module.css';
import CachePendingBanner from './CachePendingBanner';
import { API_BASE } from '@/lib/api-config';

interface Props {
  dfn: string;
}

interface SurgeryDetailResponse {
  ok: boolean;
  resolvedFromId?: string;
  noteId?: string;
  text?: string;
  detail?: string;
  linkedDocuments?: Array<{ id: string; title: string; date?: string; status?: string }>;
  rawCase?: string[];
  rpcUsed?: string[];
  error?: string;
}

export default function SurgeryPanel({ dfn }: Props) {
  const { fetchDomain, getDomain, getDomainMeta, isLoading } = useDataCache();
  const [selected, setSelected] = useState<Surgery | null>(null);
  const [detail, setDetail] = useState<SurgeryDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchDomain(dfn, 'surgery');
  }, [dfn, fetchDomain]);

  useEffect(() => {
    setSelected(null);
    setDetail(null);
    setDetailLoading(false);
  }, [dfn]);

  useEffect(() => {
    if (!selected?.id) {
      setDetail(null);
      setDetailLoading(false);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    fetch(`${API_BASE}/vista/surgery/detail?id=${encodeURIComponent(selected.id)}&dfn=${encodeURIComponent(dfn)}`, {
      credentials: 'include',
    })
      .then((response) => response.json())
      .then((payload: SurgeryDetailResponse) => {
        if (!cancelled) setDetail(payload);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setDetail({
            ok: false,
            error: error instanceof Error ? error.message : 'Failed to load surgery detail',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selected?.id]);

  const cases = getDomain(dfn, 'surgery');
  const loading = isLoading(dfn, 'surgery');
  const surgeryMeta = getDomainMeta(dfn, 'surgery');
  useEffect(() => {
    if (!selected) return;

    const freshSelected = cases.find((surgeryCase) => surgeryCase.id === selected.id) || null;
    if (!freshSelected) {
      setSelected(null);
      setDetail(null);
      setDetailLoading(false);
      return;
    }

    if (freshSelected !== selected) {
      setSelected(freshSelected);
    }
  }, [cases, selected]);

  const visibleCases = cases;
  const showPendingBanner =
    !loading && visibleCases.length === 0 && surgeryMeta.fetched && (surgeryMeta.pending || surgeryMeta.ok !== true);

  return (
    <div>
      <div className={styles.panelTitle}>Surgery</div>
      <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', margin: '2px 0 8px' }}>
        Contract: ORWSR LIST &bull; Data source: live RPC
      </p>

      <div className={styles.splitPane}>
        <div className={styles.splitLeft}>
          {showPendingBanner && (
            <CachePendingBanner
              title="Surgery list pending"
              noun="surgery-list"
              meta={surgeryMeta}
              defaultTargets={['ORWSR LIST']}
            />
          )}
          {!showPendingBanner && (
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Procedure</th>
                  <th>Date</th>
                  <th>Case #</th>
                </tr>
              </thead>
              <tbody>
                {visibleCases.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelected(s)}
                    style={selected?.id === s.id ? { background: 'var(--cprs-selected)' } : undefined}
                  >
                    <td>{s.procedure}</td>
                    <td>{s.date}</td>
                    <td>{s.caseNum}</td>
                  </tr>
                ))}
                {!loading && visibleCases.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', fontStyle: 'italic' }}>
                      No surgical cases on file
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          {loading && (
            <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', padding: 8 }}>Loading...</p>
          )}
        </div>
        <div className={styles.splitRight}>
          {selected ? (
            <div>
              <div className={styles.panelTitle}>{selected.procedure}</div>
              <div className={styles.formGroup}>
                <label>Date</label>
                <div>{selected.date}</div>
              </div>
              <div className={styles.formGroup}>
                <label>Case #</label>
                <div>{selected.caseNum}</div>
              </div>
              <div className={styles.formGroup}>
                <label>Surgeon</label>
                <div>{selected.surgeon}</div>
              </div>
              <div className={styles.formGroup}>
                <label>Linked Note</label>
                <div>{detailLoading ? 'Loading...' : detail?.noteId || 'No linked TIU note resolved'}</div>
              </div>

              <div className={styles.formGroup}>
                <label>RPC Path</label>
                <div>{detail?.rpcUsed?.join(', ') || 'ORWSR ONECASE'}</div>
              </div>

              {!detailLoading && detail?.resolvedFromId && detail.resolvedFromId !== selected.id && (
                <div
                  style={{
                    marginTop: 12,
                    padding: '8px 10px',
                    borderRadius: 4,
                    background: 'rgba(255,193,7,0.08)',
                    border: '1px solid rgba(255,193,7,0.3)',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#856404' }}>
                    Detail resolved through linked surgery document #{detail.resolvedFromId}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--cprs-text-muted)', marginTop: 4 }}>
                    The selected surgery case header did not return usable detail from VistA, so the panel
                    followed the linked document entry for the same case.
                  </div>
                </div>
              )}

              {detail?.linkedDocuments && detail.linkedDocuments.length > 0 && (
                <div className={styles.formGroup}>
                  <label>Linked Documents</label>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {detail.linkedDocuments.map((doc) => (
                      <div
                        key={`${doc.id}-${doc.title}`}
                        style={{
                          padding: '6px 8px',
                          border: '1px solid var(--cprs-border)',
                          borderRadius: 4,
                          background: 'var(--cprs-bg-subtle)',
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{doc.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--cprs-text-muted)' }}>
                          #{doc.id}
                          {doc.date ? ` * ${doc.date}` : ''}
                          {doc.status ? ` * ${doc.status}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailLoading && (
                <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', paddingTop: 8 }}>
                  Loading operative detail...
                </p>
              )}

              {!detailLoading && detail && !detail.ok && (
                <div
                  style={{
                    marginTop: 12,
                    padding: '8px 10px',
                    borderRadius: 4,
                    background: 'rgba(220,53,69,0.06)',
                    border: '1px solid rgba(220,53,69,0.25)',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#8b1e2d' }}>
                    Surgery detail unavailable
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--cprs-text-muted)', marginTop: 4 }}>
                    {detail.error || 'The selected surgery case did not return detail from VistA.'}
                  </div>
                </div>
              )}

              {!detailLoading && detail?.ok && detail.text && (
                <div className={styles.formGroup}>
                  <label>Operative Report Text</label>
                  <pre
                    style={{
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'inherit',
                      fontSize: 12,
                      lineHeight: 1.45,
                      margin: 0,
                      padding: 10,
                      border: '1px solid var(--cprs-border)',
                      background: 'var(--cprs-bg-subtle)',
                      borderRadius: 4,
                      maxHeight: 260,
                      overflow: 'auto',
                    }}
                  >
                    {detail.text}
                  </pre>
                </div>
              )}

              {!detailLoading && detail?.ok && !detail.text && (
                <div
                  style={{
                    marginTop: 12,
                    padding: '8px 10px',
                    borderRadius: 4,
                    background: 'rgba(255,193,7,0.08)',
                    border: '1px solid rgba(255,193,7,0.3)',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#856404' }}>
                    No operative note text resolved
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--cprs-text-muted)', marginTop: 4 }}>
                    The selected surgery case loaded through ORWSR ONECASE, but no linked TIU note text
                    was resolved for display.
                  </div>
                </div>
              )}

              {!detailLoading && detail?.ok && detail.detail && (
                <div className={styles.formGroup}>
                  <label>Detailed Display</label>
                  <pre
                    style={{
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'inherit',
                      fontSize: 11,
                      lineHeight: 1.45,
                      margin: 0,
                      padding: 10,
                      border: '1px solid var(--cprs-border)',
                      background: 'var(--cprs-bg-subtle)',
                      borderRadius: 4,
                      maxHeight: 220,
                      overflow: 'auto',
                    }}
                  >
                    {detail.detail}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <p className={styles.emptyText}>Select a surgical case to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}
