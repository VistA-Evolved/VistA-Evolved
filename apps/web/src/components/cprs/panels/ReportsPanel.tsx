'use client';

/**
 * Reports Panel — Phase 18C enhanced.
 *
 * Shows report types + text viewer (original Phase 14B).
 * Phase 18 adds:
 *   - Imaging status indicator (connected/not available)
 *   - Patient study list from /vista/imaging/studies
 *   - Viewer launch button (OHIF / external PACS URL)
 */

import { useState, useEffect } from 'react';
import { useDataCache, type ReportDef } from '../../../stores/data-cache';
import styles from '../cprs.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Props { dfn: string; }

interface ImagingStudy {
  studyId: string;
  studyDate: string;
  modality: string;
  description: string;
  imageCount: number;
  status: string;
  source: string;
  studyInstanceUid?: string;
}

interface ImagingStatus {
  viewerEnabled: boolean;
  capabilities: {
    vistaImaging: { available: boolean };
    radiology: { available: boolean };
    registryEntries: Array<{ id: string; label: string; type: string; status: string }>;
  };
}

export default function ReportsPanel({ dfn }: Props) {
  const { fetchDomain, getDomain, isLoading } = useDataCache();
  const [selectedReport, setSelectedReport] = useState<ReportDef | null>(null);
  const [reportText, setReportText] = useState<string>('');
  const [textLoading, setTextLoading] = useState(false);

  // Phase 18C: Imaging integration state
  const [imagingStatus, setImagingStatus] = useState<ImagingStatus | null>(null);
  const [studies, setStudies] = useState<ImagingStudy[]>([]);
  const [studiesLoading, setStudiesLoading] = useState(false);
  const [showStudies, setShowStudies] = useState(false);

  useEffect(() => { fetchDomain(dfn, 'reports'); }, [dfn, fetchDomain]);

  // Fetch imaging status once
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/vista/imaging/status`, { credentials: 'include' });
        const data = await res.json();
        if (data.ok) setImagingStatus(data);
      } catch { /* ignore */ }
    })();
  }, []);

  const reports = getDomain(dfn, 'reports');
  const loading = isLoading(dfn, 'reports');

  async function handleSelect(r: ReportDef) {
    setSelectedReport(r);
    setReportText('');
    setTextLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/vista/reports/text?dfn=${dfn}&id=${encodeURIComponent(r.id)}&hsType=${encodeURIComponent(r.hsType ?? '')}`
      );
      const data = await res.json();
      setReportText(data.ok ? (data.text ?? '(no report text)') : `Error: ${data.error ?? 'unknown'}`);
    } catch {
      setReportText('Network error loading report');
    } finally {
      setTextLoading(false);
    }
  }

  async function handleLoadStudies() {
    setShowStudies(true);
    setStudiesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/vista/imaging/studies?dfn=${dfn}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setStudies(data.studies || []);
    } catch { /* ignore */ }
    setStudiesLoading(false);
  }

  async function handleViewerLaunch(studyUid: string) {
    try {
      const res = await fetch(`${API_BASE}/vista/imaging/viewer-url?studyUid=${encodeURIComponent(studyUid)}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok && data.viewer?.url) {
        window.open(data.viewer.url, '_blank', 'noopener');
      }
    } catch { /* ignore */ }
  }

  return (
    <div>
      <div className={styles.panelTitle}>Reports</div>
      <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', margin: '2px 0 8px' }}>
        Contract: ORWRP REPORT LISTS / ORWRP REPORT TEXT &bull; Data source: live RPC
      </p>

      <div className={styles.splitPane}>
        <div className={styles.splitLeft} style={{ maxWidth: 280 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 12 }}>
            {loading ? 'Loading reports...' : `${reports.length} report type(s)`}
          </div>
          {reports.map((r) => (
            <div
              key={r.id}
              onClick={() => handleSelect(r)}
              style={{
                padding: '4px 8px',
                cursor: 'pointer',
                borderRadius: 3,
                fontSize: 12,
                background: selectedReport?.id === r.id ? 'var(--cprs-selected)' : undefined,
              }}
            >
              {r.name}
            </div>
          ))}
          {!loading && reports.length === 0 && (
            <p className={styles.emptyText}>No report types available</p>
          )}

          {/* Phase 18C: Imaging status and study list */}
          <div style={{
            marginTop: 12, padding: 8,
            border: `1px ${imagingStatus?.viewerEnabled ? 'solid' : 'dashed'} var(--cprs-border)`,
            borderRadius: 4, fontSize: 11,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                background: imagingStatus?.viewerEnabled ? '#16a34a' : '#6b7280',
              }} />
              <strong>Imaging</strong>
              <span style={{ color: 'var(--cprs-text-muted)' }}>
                {imagingStatus?.viewerEnabled ? 'Active' : 'Not Available'}
              </span>
            </div>

            {imagingStatus && (
              <div style={{ fontSize: 10, color: 'var(--cprs-text-muted)', marginBottom: 4 }}>
                MAG4: {imagingStatus.capabilities.vistaImaging.available ? 'yes' : 'no'}
                {' | '}RA: {imagingStatus.capabilities.radiology.available ? 'yes' : 'no'}
                {imagingStatus.capabilities.registryEntries.length > 0 && (
                  <> | {imagingStatus.capabilities.registryEntries.length} external</>
                )}
              </div>
            )}

            <button
              className={styles.btn}
              onClick={handleLoadStudies}
              style={{ fontSize: 11, padding: '2px 8px', width: '100%' }}
            >
              {studiesLoading ? 'Loading...' : showStudies ? 'Refresh Studies' : 'Load Patient Studies'}
            </button>

            {showStudies && !studiesLoading && (
              <div style={{ marginTop: 4 }}>
                {studies.length === 0 ? (
                  <p style={{ fontSize: 10, color: 'var(--cprs-text-muted)', margin: '4px 0 0' }}>
                    No imaging studies found for this patient.
                  </p>
                ) : (
                  studies.map((s) => (
                    <div key={s.studyId} style={{
                      padding: '3px 0', borderBottom: '1px solid var(--cprs-border)',
                      fontSize: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <strong>{s.modality}</strong> {s.description}
                        <br />{s.studyDate} &bull; {s.imageCount} img &bull; {s.source}
                      </div>
                      {s.studyInstanceUid && (
                        <button
                          className={styles.btn}
                          onClick={() => handleViewerLaunch(s.studyInstanceUid!)}
                          style={{ fontSize: 9, padding: '1px 4px', flexShrink: 0 }}
                        >
                          View
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {selectedReport ? (
            <div style={{ padding: 8, border: '1px solid var(--cprs-border)', borderRadius: 4, background: 'var(--cprs-bg)' }}>
              <div className={styles.panelTitle}>{selectedReport.name}</div>
              <pre style={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', margin: 0, minHeight: 60 }}>
                {textLoading ? 'Loading report...' : reportText}
              </pre>
            </div>
          ) : (
            <p className={styles.emptyText}>Select a report type, then view the report for this patient</p>
          )}
        </div>
      </div>
    </div>
  );
}
