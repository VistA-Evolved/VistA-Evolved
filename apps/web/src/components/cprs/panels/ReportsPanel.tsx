'use client';

import { useState, useEffect } from 'react';
import { useDataCache, type ReportDef } from '../../../stores/data-cache';
import styles from '../cprs.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001';

interface Props { dfn: string; }

export default function ReportsPanel({ dfn }: Props) {
  const { fetchDomain, getDomain, isLoading } = useDataCache();
  const [selectedReport, setSelectedReport] = useState<ReportDef | null>(null);
  const [reportText, setReportText] = useState<string>('');
  const [textLoading, setTextLoading] = useState(false);

  useEffect(() => { fetchDomain(dfn, 'reports'); }, [dfn, fetchDomain]);

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
          {/* Imaging report viewer placeholder — intentional */}
          <div style={{ marginTop: 12, padding: 8, border: '1px dashed var(--cprs-border)', borderRadius: 4, fontSize: 11, color: 'var(--cprs-text-muted)' }}>
            <strong>Imaging Reports:</strong> The imaging report viewer is a placeholder.
            Full integration requires RA DETAILED REPORT and MAG4 IMAGE LIST RPCs,
            plus DICOM viewer integration (Phase 13+).
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
