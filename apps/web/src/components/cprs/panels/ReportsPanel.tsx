'use client';

import { useState } from 'react';
import styles from '../cprs.module.css';

interface Props { dfn: string; }

const REPORT_CATEGORIES = [
  { id: 'clinical', label: 'Clinical Reports' },
  { id: 'health-summary', label: 'Health Summary' },
  { id: 'imaging', label: 'Imaging' },
  { id: 'lab', label: 'Lab Reports' },
  { id: 'surgery', label: 'Surgery Reports' },
  { id: 'discharge', label: 'Discharge Summaries' },
  { id: 'remote', label: 'Remote Data' },
] as const;

/* Sample reports for interactive UI */
const MOCK_REPORTS: Record<string, { id: string; title: string; date: string; text: string }[]> = {
  'clinical': [
    { id: 'c1', title: 'Annual Physical', date: '2025-12-01', text: 'Annual physical examination completed. No acute findings.' },
    { id: 'c2', title: 'Follow-up Visit', date: '2025-11-15', text: 'Follow-up for hypertension management. BP well controlled.' },
  ],
  'health-summary': [
    { id: 'hs1', title: 'Health Summary', date: '2025-12-15', text: 'Active Problems: Essential hypertension\nAllergies: Penicillin\nActive Meds: Lisinopril 10mg daily' },
  ],
  'imaging': [
    { id: 'i1', title: 'Chest X-Ray', date: '2025-10-20', text: 'PA and lateral views. Heart size normal. Lungs clear. No acute findings.' },
  ],
  'lab': [
    { id: 'l1', title: 'Chemistry Panel', date: '2025-12-15', text: 'BMP within normal limits. See Labs tab for details.' },
  ],
  'surgery': [],
  'discharge': [],
  'remote': [
    { id: 'r1', title: 'Remote Data Viewer', date: '', text: 'Remote data integration pending. This panel will display data from other facilities when connected.' },
  ],
};

export default function ReportsPanel({ dfn }: Props) {
  const [category, setCategory] = useState('clinical');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const reports = MOCK_REPORTS[category] ?? [];
  const current = reports.find((r) => r.id === selectedReport);

  return (
    <div>
      <div className={styles.panelTitle}>Reports</div>
      <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', margin: '2px 0 8px' }}>
        Contract: ORWRP REPORT LIST &bull; Data source: mock dataset (API integration pending)
      </p>

      <div className={styles.splitPane}>
        <div className={styles.splitLeft} style={{ maxWidth: 200 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 12 }}>Categories</div>
          {REPORT_CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              onClick={() => { setCategory(cat.id); setSelectedReport(null); }}
              style={{
                padding: '4px 8px',
                cursor: 'pointer',
                borderRadius: 3,
                fontSize: 12,
                background: category === cat.id ? 'var(--cprs-selected)' : undefined,
              }}
            >
              {cat.label}
            </div>
          ))}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {reports.length === 0 ? (
            <p className={styles.emptyText}>No reports in this category</p>
          ) : (
            <>
              <table className={styles.dataTable}>
                <thead><tr><th>Title</th><th>Date</th></tr></thead>
                <tbody>
                  {reports.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedReport(r.id)}
                      style={selectedReport === r.id ? { background: 'var(--cprs-selected)' } : undefined}
                    >
                      <td>{r.title}</td>
                      <td>{r.date || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {current && (
                <div style={{ padding: 8, border: '1px solid var(--cprs-border)', borderRadius: 4, background: 'var(--cprs-bg)' }}>
                  <div className={styles.panelTitle}>{current.title}</div>
                  <pre style={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', margin: 0 }}>
                    {current.text}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
