'use client';

/**
 * Migration Console -- Phase 50 Data Portability & Migration Toolkit
 *
 * Admin-only tabbed interface:
 *   - Import Jobs -- upload CSV, validate, dry-run, run import, rollback
 *   - Export Jobs -- create export bundle, download
 *   - Mapping Templates -- browse/manage field mapping configs
 *   - Status -- migration stats + health
 *
 * Accessible at /cprs/admin/migration. Requires admin session.
 */

import { useState, useEffect, useCallback } from 'react';
import styles from '@/components/cprs/cprs.module.css';
import { csrfHeaders } from '@/lib/csrf';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type Tab = 'import' | 'export' | 'templates' | 'status';

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...opts,
    headers: { ...csrfHeaders(), ...(opts?.headers || {}) },
  });
  return res.json();
}

async function apiPost(path: string, body?: unknown) {
  return apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export default function MigrationPage() {
  const [tab, setTab] = useState<Tab>('import');
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    apiFetch('/migration/health').then(setHealth).catch(() => {});
  }, []);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'import', label: 'Import Jobs' },
    { id: 'export', label: 'Export Jobs' },
    { id: 'templates', label: 'Mapping Templates' },
    { id: 'status', label: 'Status' },
  ];

  return (
    <div className={styles.cprsPage}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #dee2e6', display: 'flex', alignItems: 'center', gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Data Migration Console</h2>
        {health && (
          <span style={{ fontSize: 11, color: health.ok ? '#198754' : '#dc3545', fontWeight: 600 }}>
            {health.ok ? 'ONLINE' : 'OFFLINE'}
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6c757d' }}>Phase 50 -- Migration Toolkit</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #dee2e6', background: '#f8f9fa' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 20px', border: 'none',
              borderBottom: tab === t.id ? '2px solid #0d6efd' : '2px solid transparent',
              background: 'transparent', cursor: 'pointer', fontSize: 13,
              fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? '#0d6efd' : '#495057',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 20 }}>
        {tab === 'import' && <ImportTab />}
        {tab === 'export' && <ExportTab />}
        {tab === 'templates' && <TemplatesTab />}
        {tab === 'status' && <StatusTab />}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Import Tab                                                          */
/* ================================================================== */

function ImportTab() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [entityType, setEntityType] = useState('patient');
  const [sourceFormat, setSourceFormat] = useState('generic-csv');
  const [templateId, setTemplateId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    apiFetch('/migration/jobs?direction=import').then(r => { if (r.ok) setJobs(r.jobs); });
    apiFetch('/migration/templates').then(r => { if (r.ok) setTemplates(r.templates); });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Auto-select template based on entity type + source format
  useEffect(() => {
    const match = templates.find((t: any) =>
      t.entityType === entityType && t.sourceFormat === sourceFormat
    );
    if (match) setTemplateId(match.id);
  }, [entityType, sourceFormat, templates]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setFileContent(reader.result as string);
    reader.readAsText(f);
  };

  const createImportJob = async () => {
    if (!fileContent) { setError('Please select a CSV file'); return; }
    setCreating(true);
    setError('');
    try {
      const res = await apiPost('/migration/jobs/import', {
        entityType,
        sourceFormat,
        templateId: templateId || undefined,
        fileName: file?.name,
        data: fileContent,
      });
      if (res.ok) {
        refresh();
        setFileContent('');
        setFile(null);
      } else {
        setError(res.error || 'Failed to create job');
      }
    } catch { setError('Network error'); }
    setCreating(false);
  };

  const runAction = async (jobId: string, action: string) => {
    setActionLoading(`${jobId}-${action}`);
    setError('');
    try {
      const res = await apiPost(`/migration/jobs/${jobId}/${action}`);
      if (!res.ok) setError(res.error || `${action} failed`);
      // Refresh job detail
      const detail = await apiFetch(`/migration/jobs/${jobId}`);
      if (detail.ok) setSelectedJob(detail.job);
      refresh();
    } catch { setError('Network error'); }
    setActionLoading('');
  };

  return (
    <div>
      <h3 style={{ marginTop: 0, fontSize: 15 }}>Create Import Job</h3>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
        <label style={{ fontSize: 12 }}>
          Entity Type
          <select value={entityType} onChange={e => setEntityType(e.target.value)}
            style={{ display: 'block', marginTop: 4, padding: '6px 8px', fontSize: 13 }}>
            <option value="patient">Patient</option>
            <option value="problem">Problem</option>
            <option value="medication">Medication</option>
            <option value="allergy">Allergy</option>
            <option value="appointment">Appointment</option>
            <option value="note">Note</option>
          </select>
        </label>
        <label style={{ fontSize: 12 }}>
          Source Format
          <select value={sourceFormat} onChange={e => setSourceFormat(e.target.value)}
            style={{ display: 'block', marginTop: 4, padding: '6px 8px', fontSize: 13 }}>
            <option value="generic-csv">Generic CSV</option>
            <option value="openemr-csv">OpenEMR CSV</option>
            <option value="fhir-bundle">FHIR Bundle</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <label style={{ fontSize: 12 }}>
          Template
          <select value={templateId} onChange={e => setTemplateId(e.target.value)}
            style={{ display: 'block', marginTop: 4, padding: '6px 8px', fontSize: 13 }}>
            <option value="">Auto-detect</option>
            {templates.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 12 }}>
          CSV File
          <input type="file" accept=".csv,.txt" onChange={handleFileChange}
            style={{ display: 'block', marginTop: 4, fontSize: 13 }} />
        </label>
        <button onClick={createImportJob} disabled={creating || !fileContent}
          style={{ padding: '8px 16px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
          {creating ? 'Creating...' : 'Upload & Create Job'}
        </button>
      </div>

      {error && <div style={{ color: '#dc3545', fontSize: 12, marginBottom: 12 }}>{error}</div>}

      {/* Job list */}
      <h3 style={{ fontSize: 15 }}>Import Jobs</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>
            <th style={{ padding: '8px 6px' }}>Job ID</th>
            <th style={{ padding: '8px 6px' }}>Entity</th>
            <th style={{ padding: '8px 6px' }}>Format</th>
            <th style={{ padding: '8px 6px' }}>Status</th>
            <th style={{ padding: '8px 6px' }}>File</th>
            <th style={{ padding: '8px 6px' }}>Created</th>
            <th style={{ padding: '8px 6px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((j: any) => (
            <tr key={j.id} style={{ borderBottom: '1px solid #dee2e6', cursor: 'pointer', background: selectedJob?.id === j.id ? '#e7f1ff' : undefined }}
              onClick={() => { apiFetch(`/migration/jobs/${j.id}`).then(r => { if (r.ok) setSelectedJob(r.job); }); }}>
              <td style={{ padding: '6px', fontFamily: 'monospace' }}>{j.id.substring(0, 16)}</td>
              <td style={{ padding: '6px' }}>{j.entityType}</td>
              <td style={{ padding: '6px' }}>{j.sourceFormat}</td>
              <td style={{ padding: '6px' }}>
                <StatusBadge status={j.status} />
              </td>
              <td style={{ padding: '6px' }}>{j.fileName || '--'}</td>
              <td style={{ padding: '6px' }}>{new Date(j.createdAt).toLocaleString()}</td>
              <td style={{ padding: '6px', display: 'flex', gap: 4 }}>
                {j.status === 'created' && <ActionBtn label="Validate" loading={actionLoading === `${j.id}-validate`} onClick={() => runAction(j.id, 'validate')} />}
                {j.status === 'validated' && <ActionBtn label="Dry Run" loading={actionLoading === `${j.id}-dry-run`} onClick={() => runAction(j.id, 'dry-run')} />}
                {(j.status === 'validated' || j.status === 'dry-run-complete') && <ActionBtn label="Import" loading={actionLoading === `${j.id}-run`} onClick={() => runAction(j.id, 'run')} color="#198754" />}
                {j.status === 'imported' && <ActionBtn label="Rollback" loading={actionLoading === `${j.id}-rollback`} onClick={() => runAction(j.id, 'rollback')} color="#dc3545" />}
              </td>
            </tr>
          ))}
          {jobs.length === 0 && <tr><td colSpan={7} style={{ padding: 16, textAlign: 'center', color: '#6c757d' }}>No import jobs</td></tr>}
        </tbody>
      </table>

      {/* Job detail panel */}
      {selectedJob && (
        <div style={{ marginTop: 16, padding: 12, background: '#f8f9fa', borderRadius: 6, border: '1px solid #dee2e6' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>Job Detail: {selectedJob.id}</h4>
          <div style={{ fontSize: 12 }}>
            <strong>Status:</strong> {selectedJob.status} &nbsp;|&nbsp;
            <strong>Entity:</strong> {selectedJob.entityType} &nbsp;|&nbsp;
            <strong>Template:</strong> {selectedJob.templateId || 'none'} &nbsp;|&nbsp;
            <strong>Created by:</strong> {selectedJob.createdByName}
          </div>
          {selectedJob.validation && (
            <div style={{ marginTop: 8 }}>
              <strong style={{ fontSize: 12 }}>Validation:</strong>
              <span style={{ color: selectedJob.validation.valid ? '#198754' : '#dc3545', fontSize: 12, marginLeft: 6 }}>
                {selectedJob.validation.valid ? 'VALID' : 'INVALID'}
              </span>
              <span style={{ fontSize: 11, marginLeft: 8, color: '#6c757d' }}>
                {selectedJob.validation.validRows}/{selectedJob.validation.totalRows} rows valid, {selectedJob.validation.errorCount} errors, {selectedJob.validation.warningCount} warnings
              </span>
              {selectedJob.validation.issues?.length > 0 && (
                <ul style={{ fontSize: 11, maxHeight: 120, overflow: 'auto', marginTop: 4 }}>
                  {selectedJob.validation.issues.slice(0, 20).map((iss: any, i: number) => (
                    <li key={i} style={{ color: iss.severity === 'error' ? '#dc3545' : iss.severity === 'warning' ? '#ffc107' : '#6c757d' }}>
                      {iss.row ? `Row ${iss.row}: ` : ''}{iss.message}
                    </li>
                  ))}
                </ul>
              )}
              {selectedJob.validation.preview?.length > 0 && (
                <details style={{ marginTop: 6 }}>
                  <summary style={{ fontSize: 11, cursor: 'pointer' }}>Preview ({selectedJob.validation.preview.length} rows)</summary>
                  <pre style={{ fontSize: 10, maxHeight: 150, overflow: 'auto', background: '#fff', padding: 8, borderRadius: 4 }}>
                    {JSON.stringify(selectedJob.validation.preview, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
          {selectedJob.dryRunResult && (
            <div style={{ marginTop: 8, fontSize: 12 }}>
              <strong>Dry Run:</strong> {selectedJob.dryRunResult.createCount} create, {selectedJob.dryRunResult.updateCount} update, {selectedJob.dryRunResult.skipCount} skip
            </div>
          )}
          {selectedJob.importResult && (
            <div style={{ marginTop: 8, fontSize: 12 }}>
              <strong>Import Result:</strong> {selectedJob.importResult.successCount} success, {selectedJob.importResult.failureCount} failed, {selectedJob.importResult.skippedCount} skipped
              {selectedJob.importResult.rollbackAvailable && <span style={{ color: '#ffc107', marginLeft: 8 }}>(rollback available)</span>}
            </div>
          )}
          {selectedJob.error && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#dc3545' }}>
              <strong>Error:</strong> {selectedJob.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* Export Tab                                                           */
/* ================================================================== */

function ExportTab() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [bundleType, setBundleType] = useState('patient-summary');
  const [encrypt, setEncrypt] = useState(false);
  const [dfn, setDfn] = useState('');
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    apiFetch('/migration/jobs?direction=export').then(r => { if (r.ok) setJobs(r.jobs); });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const createExportJob = async () => {
    setCreating(true);
    setError('');
    try {
      const res = await apiPost('/migration/jobs/export', { bundleType });
      if (res.ok) refresh();
      else setError(res.error || 'Failed');
    } catch { setError('Network error'); }
    setCreating(false);
  };

  const runExportAction = async (jobId: string) => {
    setActionLoading(jobId);
    setError('');
    try {
      const res = await apiPost(`/migration/jobs/${jobId}/run`, {
        encrypt,
        dfn: dfn || undefined,
        includeAllergies: true,
        includeProblems: true,
        includeMedications: true,
        includeNotes: true,
        includeVitals: true,
      });
      if (res.ok && res.result?.data) {
        // Download the export
        const decoded = atob(res.result.data);
        const blob = new Blob([decoded], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.result.fileName || 'export.json';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        setError(res.error || 'Export failed');
      }
      refresh();
    } catch { setError('Network error'); }
    setActionLoading('');
  };

  return (
    <div>
      <h3 style={{ marginTop: 0, fontSize: 15 }}>Create Export Job</h3>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
        <label style={{ fontSize: 12 }}>
          Bundle Type
          <select value={bundleType} onChange={e => setBundleType(e.target.value)}
            style={{ display: 'block', marginTop: 4, padding: '6px 8px', fontSize: 13 }}>
            <option value="patient-summary">Patient Summary</option>
            <option value="audit-export">Audit Export</option>
            <option value="clinical-data">Clinical Data</option>
          </select>
        </label>
        {bundleType === 'patient-summary' && (
          <label style={{ fontSize: 12 }}>
            Patient DFN (optional)
            <input value={dfn} onChange={e => setDfn(e.target.value)} placeholder="e.g. 3"
              style={{ display: 'block', marginTop: 4, padding: '6px 8px', fontSize: 13, width: 120 }} />
          </label>
        )}
        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={encrypt} onChange={e => setEncrypt(e.target.checked)} />
          Encrypt export
        </label>
        <button onClick={createExportJob} disabled={creating}
          style={{ padding: '8px 16px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
          {creating ? 'Creating...' : 'Create Export Job'}
        </button>
      </div>

      {error && <div style={{ color: '#dc3545', fontSize: 12, marginBottom: 12 }}>{error}</div>}

      <h3 style={{ fontSize: 15 }}>Export Jobs</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>
            <th style={{ padding: '8px 6px' }}>Job ID</th>
            <th style={{ padding: '8px 6px' }}>Bundle Type</th>
            <th style={{ padding: '8px 6px' }}>Status</th>
            <th style={{ padding: '8px 6px' }}>Created</th>
            <th style={{ padding: '8px 6px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((j: any) => (
            <tr key={j.id} style={{ borderBottom: '1px solid #dee2e6' }}>
              <td style={{ padding: '6px', fontFamily: 'monospace' }}>{j.id.substring(0, 16)}</td>
              <td style={{ padding: '6px' }}>{j.bundleType}</td>
              <td style={{ padding: '6px' }}><StatusBadge status={j.status} /></td>
              <td style={{ padding: '6px' }}>{new Date(j.createdAt).toLocaleString()}</td>
              <td style={{ padding: '6px' }}>
                {j.status === 'validated' && (
                  <ActionBtn label="Run Export" loading={actionLoading === j.id} onClick={() => runExportAction(j.id)} color="#198754" />
                )}
                {j.status === 'exported' && <span style={{ color: '#198754' }}>Complete</span>}
              </td>
            </tr>
          ))}
          {jobs.length === 0 && <tr><td colSpan={5} style={{ padding: 16, textAlign: 'center', color: '#6c757d' }}>No export jobs</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

/* ================================================================== */
/* Templates Tab                                                       */
/* ================================================================== */

function TemplatesTab() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    apiFetch('/migration/templates').then(r => { if (r.ok) setTemplates(r.templates); });
  }, []);

  return (
    <div>
      <h3 style={{ marginTop: 0, fontSize: 15 }}>Mapping Templates</h3>
      <p style={{ fontSize: 12, color: '#6c757d', marginBottom: 12 }}>
        Templates define how source CSV columns map to VistA-Evolved fields, with transforms and validation.
      </p>

      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: '0 0 300px' }}>
          {templates.map((t: any) => (
            <div key={t.id}
              onClick={() => setSelected(t)}
              style={{
                padding: '8px 12px', borderBottom: '1px solid #dee2e6', cursor: 'pointer',
                background: selected?.id === t.id ? '#e7f1ff' : undefined,
              }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div>
              <div style={{ fontSize: 11, color: '#6c757d' }}>{t.sourceFormat} / {t.entityType} / v{t.version}</div>
            </div>
          ))}
        </div>

        {selected && (
          <div style={{ flex: 1, padding: 12, background: '#f8f9fa', borderRadius: 6, border: '1px solid #dee2e6' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>{selected.name}</h4>
            <p style={{ fontSize: 12, color: '#6c757d' }}>{selected.description}</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginTop: 8 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>
                  <th style={{ padding: '6px 4px' }}>Source</th>
                  <th style={{ padding: '6px 4px' }}>Target</th>
                  <th style={{ padding: '6px 4px' }}>Required</th>
                  <th style={{ padding: '6px 4px' }}>Transforms</th>
                  <th style={{ padding: '6px 4px' }}>Validation</th>
                </tr>
              </thead>
              <tbody>
                {selected.fields?.map((f: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '4px', fontFamily: 'monospace' }}>{f.source}</td>
                    <td style={{ padding: '4px', fontFamily: 'monospace' }}>{f.target}</td>
                    <td style={{ padding: '4px' }}>{f.required ? 'Yes' : '--'}</td>
                    <td style={{ padding: '4px' }}>{f.transforms?.map((t: any) => t.fn).join(', ') || '--'}</td>
                    <td style={{ padding: '4px', fontFamily: 'monospace' }}>{f.validationPattern || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Status Tab                                                          */
/* ================================================================== */

function StatusTab() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    apiFetch('/migration/stats').then(setStats).catch(() => {});
  }, []);

  if (!stats) return <div style={{ fontSize: 13, color: '#6c757d' }}>Loading...</div>;

  return (
    <div>
      <h3 style={{ marginTop: 0, fontSize: 15 }}>Migration Status</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <StatCard label="Total Jobs" value={stats.totalJobs ?? 0} />
        <StatCard label="Templates" value={stats.templateCount ?? 0} />
        <StatCard label="Imports" value={stats.byDirection?.import ?? 0} />
        <StatCard label="Exports" value={stats.byDirection?.export ?? 0} />
      </div>

      {stats.byStatus && Object.keys(stats.byStatus).length > 0 && (
        <div>
          <h4 style={{ fontSize: 13, marginBottom: 8 }}>Jobs by Status</h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(stats.byStatus).map(([status, count]) => (
              <span key={status} style={{
                padding: '4px 10px', background: '#e9ecef', borderRadius: 12, fontSize: 11,
              }}>
                {status}: {count as number}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* Shared components                                                   */
/* ================================================================== */

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    created: '#6c757d',
    validating: '#0dcaf0',
    validated: '#198754',
    'validation-failed': '#dc3545',
    'dry-run': '#0dcaf0',
    'dry-run-complete': '#198754',
    importing: '#ffc107',
    imported: '#198754',
    'import-failed': '#dc3545',
    exporting: '#ffc107',
    exported: '#198754',
    'export-failed': '#dc3545',
    'rolled-back': '#6c757d',
  };
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
      background: (colors[status] ?? '#6c757d') + '22',
      color: colors[status] ?? '#6c757d',
    }}>
      {status}
    </span>
  );
}

function ActionBtn({ label, onClick, loading, color }: { label: string; onClick: () => void; loading: boolean; color?: string }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }} disabled={loading}
      style={{
        padding: '4px 10px', background: color ?? '#0d6efd', color: '#fff',
        border: 'none', borderRadius: 3, cursor: loading ? 'wait' : 'pointer', fontSize: 11,
        opacity: loading ? 0.6 : 1,
      }}>
      {loading ? '...' : label}
    </button>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      padding: 16, background: '#f8f9fa', borderRadius: 6, border: '1px solid #dee2e6',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#212529' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#6c757d', marginTop: 4 }}>{label}</div>
    </div>
  );
}
