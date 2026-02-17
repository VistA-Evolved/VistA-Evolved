'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from '../cprs.module.css';

interface Props { dfn: string; }

interface ImagingStudy {
  studyId: string;
  studyDate: string;
  modality: string;
  description: string;
  imageCount: number;
  status: string;
  source: 'vista' | 'orthanc' | 'dicomweb' | 'pacs';
  studyInstanceUid?: string;
  linkedOrderId?: string;
  accessionNumber?: string;
  orderLinked?: boolean;
}

interface WorklistItem {
  id: string;
  patientDfn: string;
  patientName: string;
  accessionNumber: string;
  scheduledProcedure: string;
  modality: string;
  scheduledTime: string;
  facility: string;
  location: string;
  orderingProviderName: string;
  clinicalIndication: string;
  priority: 'routine' | 'stat' | 'urgent';
  status: string;
  linkedStudyUid: string | null;
  linkedOrthancStudyId: string | null;
  source: string;
}

interface ImagingStatus {
  ok: boolean;
  viewerEnabled: boolean;
  capabilities: {
    vistaImaging: { available: boolean; status: string };
    radiology: { available: boolean; status: string };
    orthanc?: { configured: boolean; url: string };
    ohifViewer?: { configured: boolean; url: string };
  };
  message: string;
}

type ModalityFilter = 'all' | 'CR' | 'CT' | 'MR' | 'US' | 'XR' | 'DX' | 'NM' | 'PT';
type ImagingTab = 'studies' | 'worklist' | 'orders';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ImagingPanel({ dfn }: Props) {
  const [activeTab, setActiveTab] = useState<ImagingTab>('studies');
  const [studies, setStudies] = useState<ImagingStudy[]>([]);
  const [worklist, setWorklist] = useState<WorklistItem[]>([]);
  const [status, setStatus] = useState<ImagingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ImagingStudy | null>(null);
  const [modalityFilter, setModalityFilter] = useState<ModalityFilter>('all');
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);

  const fetchStudies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${API_BASE}/vista/imaging/studies?dfn=${dfn}`, {
        credentials: 'include',
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setStudies(data.studies || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load imaging studies');
    } finally {
      setLoading(false);
    }
  }, [dfn]);

  const fetchStatus = useCallback(async () => {
    try {
      const resp = await fetch(`${API_BASE}/vista/imaging/status`, {
        credentials: 'include',
      });
      if (resp.ok) {
        setStatus(await resp.json());
      }
    } catch {
      // Status check is non-critical
    }
  }, []);

  const fetchWorklist = useCallback(async () => {
    try {
      const resp = await fetch(`${API_BASE}/imaging/worklist?patientDfn=${dfn}`, {
        credentials: 'include',
      });
      if (resp.ok) {
        const data = await resp.json();
        setWorklist(data.items || []);
      }
    } catch {
      // Worklist fetch is non-critical
    }
  }, [dfn]);

  useEffect(() => {
    fetchStudies();
    fetchStatus();
    fetchWorklist();
  }, [fetchStudies, fetchStatus, fetchWorklist]);

  const openViewer = useCallback(async (study: ImagingStudy) => {
    const uid = study.studyInstanceUid || study.studyId;
    try {
      const resp = await fetch(`${API_BASE}/imaging/viewer?studyUid=${uid}`, {
        credentials: 'include',
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.viewer?.url) {
          setViewerUrl(data.viewer.url);
          setViewerOpen(true);
          return;
        }
      }
      // Fallback: try vista/imaging/viewer-url
      const resp2 = await fetch(`${API_BASE}/vista/imaging/viewer-url?studyUid=${uid}`, {
        credentials: 'include',
      });
      if (resp2.ok) {
        const data2 = await resp2.json();
        if (data2.viewer?.url) {
          setViewerUrl(data2.viewer.url);
          setViewerOpen(true);
          return;
        }
      }
      setError('No viewer URL available for this study');
    } catch (err: any) {
      setError('Failed to generate viewer URL');
    }
  }, []);

  const filteredStudies = studies.filter((s) => {
    if (modalityFilter === 'all') return true;
    return s.modality?.toUpperCase() === modalityFilter;
  });

  const modalities = [...new Set(studies.map((s) => s.modality?.toUpperCase()).filter(Boolean))];
  const vistaCount = studies.filter((s) => s.source === 'vista').length;
  const dicomwebCount = studies.filter((s) => s.source === 'dicomweb').length;
  const vistaAvailable = status?.capabilities?.vistaImaging?.available ?? false;

  return (
    <div>
      <div className={styles.panelTitle}>Imaging Studies</div>

      {/* Phase 23: Tab bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--cprs-border)', marginBottom: 8 }}>
        {(['studies', 'worklist', 'orders'] as ImagingTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '4px 12px',
              fontSize: 11,
              fontWeight: activeTab === tab ? 600 : 400,
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--cprs-accent, #2563eb)' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === tab ? 'var(--cprs-accent, #2563eb)' : 'var(--cprs-text-muted)',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {tab === 'studies' ? `Studies (${studies.length})` :
             tab === 'worklist' ? `Worklist (${worklist.length})` :
             'New Order'}
          </button>
        ))}
      </div>

      {/* Unmatched studies banner */}
      {studies.some((s) => s.orderLinked === false) && activeTab === 'studies' && (
        <div style={{
          background: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: 4,
          padding: '6px 12px',
          marginBottom: 8,
          fontSize: 11,
          color: '#856404',
        }}>
          <strong>Unmatched:</strong> {studies.filter((s) => !s.orderLinked).length} study(ies) not linked to any imaging order.
          These may need manual reconciliation in the admin console.
        </div>
      )}

      {/* ===== WORKLIST TAB ===== */}
      {activeTab === 'worklist' && (
        <div>
          {worklist.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--cprs-text-muted)' }}>
              <p style={{ fontSize: 13 }}>No worklist items for this patient.</p>
              <p style={{ fontSize: 11 }}>Create an imaging order to add items to the worklist.</p>
            </div>
          ) : (
            <div style={{ border: '1px solid var(--cprs-border)', borderRadius: 4, overflow: 'auto', maxHeight: 400 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--cprs-surface)', borderBottom: '1px solid var(--cprs-border)' }}>
                    <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600 }}>Accession</th>
                    <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600 }}>Procedure</th>
                    <th style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 600 }}>Mod</th>
                    <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600 }}>Scheduled</th>
                    <th style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 600 }}>Priority</th>
                    <th style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 600 }}>Linked</th>
                  </tr>
                </thead>
                <tbody>
                  {worklist.map((item, i) => (
                    <tr key={item.id} style={{
                      borderBottom: '1px solid var(--cprs-border)',
                      background: i % 2 === 0 ? 'transparent' : 'var(--cprs-surface, #f8f9fa)',
                    }}>
                      <td style={{ padding: '3px 8px', fontFamily: 'monospace', fontSize: 10 }}>{item.accessionNumber}</td>
                      <td style={{ padding: '3px 8px' }}>{item.scheduledProcedure}</td>
                      <td style={{ padding: '3px 8px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', padding: '1px 4px', borderRadius: 3,
                          background: modalityColor(item.modality), color: '#fff', fontSize: 10, fontWeight: 600,
                        }}>{item.modality}</span>
                      </td>
                      <td style={{ padding: '3px 8px', fontSize: 11 }}>{formatDate(item.scheduledTime)}</td>
                      <td style={{ padding: '3px 8px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600,
                          color: item.priority === 'stat' ? '#dc2626' : item.priority === 'urgent' ? '#d97706' : '#6b7280',
                        }}>{item.priority.toUpperCase()}</span>
                      </td>
                      <td style={{ padding: '3px 8px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: 10, padding: '1px 6px', borderRadius: 8,
                          background: item.status === 'completed' ? '#d1fae5' : item.status === 'cancelled' ? '#fecaca' : '#e0e7ff',
                          color: item.status === 'completed' ? '#065f46' : item.status === 'cancelled' ? '#991b1b' : '#3730a3',
                        }}>{item.status}</span>
                      </td>
                      <td style={{ padding: '3px 8px', textAlign: 'center', fontSize: 11 }}>
                        {item.linkedStudyUid ? '✓' : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== NEW ORDER TAB ===== */}
      {activeTab === 'orders' && (
        <ImagingOrderForm dfn={dfn} onCreated={() => { fetchWorklist(); setActiveTab('worklist'); }} />
      )}

      {/* ===== STUDIES TAB (original content) ===== */}
      {activeTab === 'studies' && <>

      {/* Source info banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2px 0 8px' }}>
        <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', margin: 0 }}>
          {vistaAvailable ? 'VistA Imaging + Orthanc' : 'Orthanc DICOMweb'}
          {' '}&bull; {studies.length} {studies.length === 1 ? 'study' : 'studies'}
          {vistaCount > 0 && <> &bull; <span style={{ color: '#2563eb' }}>{vistaCount} VistA</span></>}
          {dicomwebCount > 0 && <> &bull; <span style={{ color: '#059669' }}>{dicomwebCount} PACS</span></>}
        </p>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <select
            className={styles.formSelect}
            value={modalityFilter}
            onChange={(e) => setModalityFilter(e.target.value as ModalityFilter)}
            style={{ fontSize: 11, padding: '2px 4px' }}
          >
            <option value="all">All modalities</option>
            {modalities.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <button
            className={styles.toolbarBtn}
            onClick={fetchStudies}
            style={{ fontSize: 11, padding: '2px 8px' }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Demo data banner when VistA Imaging is not available */}
      {!vistaAvailable && studies.length > 0 && (
        <div style={{
          background: 'var(--cprs-warning-bg, #fef3cd)',
          border: '1px solid var(--cprs-warning-border, #ffc107)',
          borderRadius: 4,
          padding: '6px 12px',
          marginBottom: 8,
          fontSize: 11,
          color: 'var(--cprs-warning-text, #856404)',
        }}>
          <strong>Demo Mode:</strong> VistA Imaging RPCs are not available on this distribution.
          Studies shown are from the Orthanc DICOM server (demo/test data).
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={{
          background: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: 4,
          padding: '6px 12px',
          marginBottom: 8,
          fontSize: 11,
          color: '#721c24',
        }}>
          {error}
          <button
            onClick={() => setError(null)}
            style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#721c24', textDecoration: 'underline', fontSize: 11 }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <p className={styles.emptyText} style={{ fontSize: 12 }}>Loading imaging studies...</p>
      )}

      {/* Empty state */}
      {!loading && studies.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--cprs-text-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
          <p style={{ fontSize: 13, margin: 0 }}>No imaging studies found for this patient.</p>
          <p style={{ fontSize: 11, margin: '4px 0 0', color: 'var(--cprs-text-muted)' }}>
            Studies will appear here when images are captured or uploaded to Orthanc.
          </p>
        </div>
      )}

      {/* Study list + detail split view */}
      {!loading && filteredStudies.length > 0 && (
        <div style={{ display: 'flex', gap: 8, minHeight: 300 }}>
          {/* Study list */}
          <div style={{
            flex: '0 0 55%',
            border: '1px solid var(--cprs-border)',
            borderRadius: 4,
            overflow: 'auto',
            maxHeight: 500,
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--cprs-surface)', borderBottom: '1px solid var(--cprs-border)' }}>
                  <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600 }}>Modality</th>
                  <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600 }}>Description</th>
                  <th style={{ padding: '4px 4px', textAlign: 'center', fontWeight: 600 }}>#</th>
                  <th style={{ padding: '4px 4px', textAlign: 'center', fontWeight: 600 }}>Src</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudies.map((study, i) => (
                  <tr
                    key={study.studyId || i}
                    onClick={() => setSelected(study)}
                    style={{
                      cursor: 'pointer',
                      background: selected?.studyId === study.studyId
                        ? 'var(--cprs-selected, #dbeafe)'
                        : i % 2 === 0 ? 'transparent' : 'var(--cprs-surface, #f8f9fa)',
                      borderBottom: '1px solid var(--cprs-border)',
                    }}
                  >
                    <td style={{ padding: '3px 8px', whiteSpace: 'nowrap' }}>
                      {formatDate(study.studyDate)}
                    </td>
                    <td style={{ padding: '3px 8px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '1px 4px',
                        borderRadius: 3,
                        background: modalityColor(study.modality),
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 600,
                      }}>
                        {study.modality || '?'}
                      </span>
                    </td>
                    <td style={{ padding: '3px 8px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {study.description || 'Unnamed study'}
                    </td>
                    <td style={{ padding: '3px 4px', textAlign: 'center', color: 'var(--cprs-text-muted)' }}>
                      {study.imageCount || '—'}
                    </td>
                    <td style={{ padding: '3px 4px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: 9,
                        color: study.source === 'vista' ? '#2563eb' : '#059669',
                      }}>
                        {study.source === 'vista' ? 'V' : 'P'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detail panel */}
          <div style={{
            flex: 1,
            border: '1px solid var(--cprs-border)',
            borderRadius: 4,
            padding: 12,
            overflow: 'auto',
          }}>
            {selected ? (
              <div>
                <h4 style={{ fontSize: 13, margin: '0 0 8px', fontWeight: 600 }}>
                  {selected.description || 'Study Details'}
                </h4>
                <table style={{ fontSize: 12, width: '100%' }}>
                  <tbody>
                    <DetailRow label="Date" value={formatDate(selected.studyDate)} />
                    <DetailRow label="Modality" value={selected.modality || 'Unknown'} />
                    <DetailRow label="Images" value={String(selected.imageCount || 0)} />
                    <DetailRow label="Status" value={selected.status} />
                    <DetailRow label="Source" value={selected.source === 'vista' ? 'VistA Imaging' : 'PACS/DICOMweb'} />
                    {selected.accessionNumber && (
                      <DetailRow label="Accession" value={selected.accessionNumber} mono />
                    )}
                    {selected.orderLinked && selected.linkedOrderId && (
                      <tr>
                        <td style={{ padding: '2px 8px 2px 0', color: 'var(--cprs-text-muted)', fontWeight: 500, whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                          Order:
                        </td>
                        <td style={{ padding: '2px 0', fontSize: 12 }}>
                          <span style={{
                            display: 'inline-block', padding: '1px 6px', borderRadius: 8,
                            background: '#d1fae5', color: '#065f46', fontSize: 10, fontWeight: 600,
                          }}>Linked</span>
                          {' '}
                          <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{selected.linkedOrderId}</span>
                        </td>
                      </tr>
                    )}
                    {selected.studyInstanceUid && (
                      <DetailRow label="Study UID" value={selected.studyInstanceUid} mono />
                    )}
                  </tbody>
                </table>

                {/* Open Viewer button */}
                {(selected.studyInstanceUid || selected.studyId) && (
                  <button
                    onClick={() => openViewer(selected)}
                    style={{
                      marginTop: 12,
                      padding: '6px 16px',
                      background: 'var(--cprs-accent, #2563eb)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 12,
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Open in OHIF Viewer
                  </button>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--cprs-text-muted)', textAlign: 'center', marginTop: 40 }}>
                Select a study to view details
              </p>
            )}
          </div>
        </div>
      )}

      </>}
      {/* END STUDIES TAB */}

      {/* OHIF Viewer modal */}
      {viewerOpen && viewerUrl && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 16px',
            background: '#1e293b',
            color: '#fff',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>OHIF DICOM Viewer</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <a
                href={viewerUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, color: '#93c5fd', textDecoration: 'underline' }}
              >
                Open in new tab
              </a>
              <button
                onClick={() => { setViewerOpen(false); setViewerUrl(null); }}
                style={{
                  background: '#475569',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  padding: '4px 12px',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
          <iframe
            src={viewerUrl}
            style={{ flex: 1, border: 'none', width: '100%' }}
            title="OHIF DICOM Viewer"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ImagingOrderForm — inline order creation (Phase 23)                 */
/* ------------------------------------------------------------------ */

const MODALITY_OPTIONS = ['CR', 'CT', 'MR', 'US', 'DX', 'NM', 'PT', 'XA', 'MG', 'RF'] as const;
const PRIORITY_OPTIONS = ['routine', 'urgent', 'stat'] as const;

function ImagingOrderForm({ dfn, onCreated }: { dfn: string; onCreated: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    scheduledProcedure: '',
    modality: 'CR' as string,
    priority: 'routine' as string,
    clinicalIndication: '',
    scheduledTime: '',
    facility: 'WORLDVISTA',
    location: 'RADIOLOGY',
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async () => {
    if (!form.scheduledProcedure.trim()) { setErr('Procedure is required'); return; }
    if (!form.clinicalIndication.trim()) { setErr('Clinical indication is required'); return; }
    setSubmitting(true);
    setErr(null);
    try {
      const resp = await fetch(`${API_BASE}/imaging/worklist/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          patientDfn: dfn,
          scheduledProcedure: form.scheduledProcedure.trim(),
          modality: form.modality,
          priority: form.priority,
          clinicalIndication: form.clinicalIndication.trim(),
          scheduledTime: form.scheduledTime || new Date().toISOString(),
          facility: form.facility,
          location: form.location,
        }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${resp.status}`);
      }
      onCreated();
    } catch (e: any) {
      setErr(e.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldStyle: React.CSSProperties = { width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid var(--cprs-border)', borderRadius: 3, background: 'var(--cprs-surface, #fff)' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--cprs-text-muted)', marginBottom: 2 };

  return (
    <div style={{ padding: '8px 0' }}>
      <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px' }}>Create Imaging Order</h4>
      {err && (
        <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: 4, padding: '6px 12px', marginBottom: 8, fontSize: 11, color: '#721c24' }}>
          {err}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <label style={labelStyle}>Procedure *</label>
          <input style={fieldStyle} value={form.scheduledProcedure} onChange={set('scheduledProcedure')} placeholder="e.g. CHEST 2 VIEWS PA AND LAT" />
        </div>
        <div>
          <label style={labelStyle}>Modality</label>
          <select style={fieldStyle} value={form.modality} onChange={set('modality')}>
            {MODALITY_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Priority</label>
          <select style={fieldStyle} value={form.priority} onChange={set('priority')}>
            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Scheduled Date/Time</label>
          <input style={fieldStyle} type="datetime-local" value={form.scheduledTime} onChange={set('scheduledTime')} />
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={labelStyle}>Clinical Indication *</label>
        <textarea style={{ ...fieldStyle, minHeight: 48 }} value={form.clinicalIndication} onChange={set('clinicalIndication')} placeholder="Reason for exam" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Facility</label>
          <input style={fieldStyle} value={form.facility} onChange={set('facility')} />
        </div>
        <div>
          <label style={labelStyle}>Location</label>
          <input style={fieldStyle} value={form.location} onChange={set('location')} />
        </div>
      </div>
      <button
        onClick={submit}
        disabled={submitting}
        style={{
          padding: '6px 20px',
          background: submitting ? '#94a3b8' : 'var(--cprs-accent, #2563eb)',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          fontSize: 12,
          cursor: submitting ? 'default' : 'pointer',
          fontWeight: 600,
        }}
      >
        {submitting ? 'Creating...' : 'Create Order'}
      </button>
      <p style={{ fontSize: 10, color: 'var(--cprs-text-muted)', marginTop: 8 }}>
        Orders are created in the local sidecar worklist. VistA Radiology integration is planned for a future phase.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helper components / functions                                       */
/* ------------------------------------------------------------------ */

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <tr>
      <td style={{ padding: '2px 8px 2px 0', color: 'var(--cprs-text-muted)', fontWeight: 500, whiteSpace: 'nowrap', verticalAlign: 'top' }}>
        {label}:
      </td>
      <td style={{
        padding: '2px 0',
        fontFamily: mono ? 'monospace' : 'inherit',
        fontSize: mono ? 10 : 12,
        wordBreak: 'break-all',
      }}>
        {value}
      </td>
    </tr>
  );
}

function formatDate(raw: string): string {
  if (!raw) return '—';
  // DICOM dates are YYYYMMDD
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  // Try ISO parse
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
  return raw;
}

function modalityColor(mod: string): string {
  const colors: Record<string, string> = {
    CT: '#2563eb',
    MR: '#7c3aed',
    CR: '#059669',
    DX: '#059669',
    US: '#d97706',
    NM: '#dc2626',
    PT: '#dc2626',
    XA: '#0891b2',
    MG: '#be185d',
    RF: '#4f46e5',
  };
  return colors[mod?.toUpperCase()] || '#6b7280';
}
