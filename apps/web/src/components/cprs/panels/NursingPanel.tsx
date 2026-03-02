'use client';

/**
 * NursingPanel — Phase 68 + Phase 84 + Phase 138 (hardened)
 *
 * 6 sub-tabs: Tasks, Vitals, Notes, Flowsheet, MAR, Handoff
 * Phase 138 additions:
 *   - CSRF headers on all mutation fetches
 *   - Flowsheet tab (vitals + I/O + assessments from /vista/nursing/flowsheet)
 *   - Handoff tab (SBAR reports from /handoff/reports)
 */

import { useState, useEffect } from 'react';
import { csrfHeaders } from '@/lib/csrf';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

interface VitalItem { date: string; type: string; value: string; units: string }
interface NoteItem { ien: string; title: string; date: string; author: string; status: string }
interface PendingTarget { rpc: string; package: string; reason: string }
interface NursingResponse<T> {
  ok: boolean;
  source: string;
  items: T[];
  rpcUsed: string[];
  pendingTargets: PendingTarget[];
  status?: string;
  note?: string;
}
interface FlowsheetEntry { type: string; value: string; date: string; units?: string; critical?: boolean }
interface HandoffReport { id: string; ward: string; shiftLabel: string; status: string; createdAt: string; patients?: unknown[] }

/* ------------------------------------------------------------------ */
/* Fetch helper                                                         */
/* ------------------------------------------------------------------ */

async function apiFetch<T>(path: string): Promise<NursingResponse<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { ...csrfHeaders() },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function apiFetchRaw<T = any>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { ...csrfHeaders() },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ------------------------------------------------------------------ */
/* Shared Components                                                    */
/* ------------------------------------------------------------------ */

function IntegrationPendingBanner({ targets }: { targets: PendingTarget[] }) {
  if (!targets?.length) return null;
  return (
    <div style={{
      padding: '8px 12px', margin: '8px 0', borderRadius: 4,
      background: '#fff3cd', border: '1px solid #ffc107', fontSize: 12,
    }}>
      <strong>Integration Pending</strong>
      <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
        {targets.map((t, i) => (
          <li key={i}><code>{t.rpc}</code> ({t.package}) -- {t.reason}</li>
        ))}
      </ul>
    </div>
  );
}

function LoadingSpinner() {
  return <div style={{ padding: 24, color: 'var(--cprs-text-muted, #888)', fontSize: 13 }}>Loading...</div>;
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{
      padding: '8px 12px', margin: '8px 0', borderRadius: 4,
      background: '#f8d7da', border: '1px solid #f5c6cb', fontSize: 12, color: '#721c24',
    }}>
      {message}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-tab: Task List                                                    */
/* ------------------------------------------------------------------ */

function TaskListTab({ dfn }: { dfn: string }) {
  const [data, setData] = useState<NursingResponse<never> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<never>(`/vista/nursing/tasks?dfn=${dfn}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [dfn]);

  if (error) return <ErrorBanner message={error} />;
  if (!data) return <LoadingSpinner />;
  return (
    <div>
      <IntegrationPendingBanner targets={data.pendingTargets} />
      <p style={{ fontSize: 13, color: 'var(--cprs-text-muted, #888)', padding: 8 }}>
        Nursing task list will be populated when BCMA/PSB and order-based task derivation are available.
        Tasks are sourced from active orders, scheduled medications, nursing protocols, and provider instructions.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-tab: Vitals                                                       */
/* ------------------------------------------------------------------ */

function VitalsTab({ dfn }: { dfn: string }) {
  const [data, setData] = useState<NursingResponse<VitalItem> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<VitalItem>(`/vista/nursing/vitals?dfn=${dfn}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [dfn]);

  if (error) return <ErrorBanner message={error} />;
  if (!data) return <LoadingSpinner />;
  if (data.pendingTargets?.length) return <IntegrationPendingBanner targets={data.pendingTargets} />;

  return (
    <div>
      {data.items.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--cprs-text-muted, #888)', padding: 8 }}>
          No vitals on file for this patient. Source: {data.source}
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--cprs-border, #ccc)', textAlign: 'left' }}>
              <th style={{ padding: '4px 8px' }}>Date</th>
              <th style={{ padding: '4px 8px' }}>Type</th>
              <th style={{ padding: '4px 8px' }}>Value</th>
              <th style={{ padding: '4px 8px' }}>Units</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((v, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--cprs-border, #eee)' }}>
                <td style={{ padding: '4px 8px' }}>{v.date}</td>
                <td style={{ padding: '4px 8px' }}>{v.type}</td>
                <td style={{ padding: '4px 8px' }}>{v.value}</td>
                <td style={{ padding: '4px 8px' }}>{v.units}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {data.rpcUsed?.length > 0 && (
        <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>
          RPC: {data.rpcUsed.join(', ')} | Source: {data.source}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-tab: Notes                                                        */
/* ------------------------------------------------------------------ */

function NotesTab({ dfn }: { dfn: string }) {
  const [data, setData] = useState<NursingResponse<NoteItem> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<NoteItem>(`/vista/nursing/notes?dfn=${dfn}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [dfn]);

  if (error) return <ErrorBanner message={error} />;
  if (!data) return <LoadingSpinner />;
  if (data.pendingTargets?.length) return <IntegrationPendingBanner targets={data.pendingTargets} />;

  return (
    <div>
      {data.note && (
        <div style={{ fontSize: 11, color: '#666', padding: '4px 8px', background: '#f0f8ff', borderRadius: 4, marginBottom: 8 }}>
          {data.note}
        </div>
      )}
      {data.items.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--cprs-text-muted, #888)', padding: 8 }}>
          No nursing notes on file. Source: {data.source}
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--cprs-border, #ccc)', textAlign: 'left' }}>
              <th style={{ padding: '4px 8px' }}>Date</th>
              <th style={{ padding: '4px 8px' }}>Title</th>
              <th style={{ padding: '4px 8px' }}>Author</th>
              <th style={{ padding: '4px 8px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((n, i) => (
              <tr key={n.ien || i} style={{ borderBottom: '1px solid var(--cprs-border, #eee)' }}>
                <td style={{ padding: '4px 8px' }}>{n.date}</td>
                <td style={{ padding: '4px 8px' }}>{n.title}</td>
                <td style={{ padding: '4px 8px' }}>{n.author}</td>
                <td style={{ padding: '4px 8px' }}>{n.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {data.rpcUsed?.length > 0 && (
        <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>
          RPC: {data.rpcUsed.join(', ')} | Source: {data.source}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-tab: MAR                                                          */
/* ------------------------------------------------------------------ */

function MARTab({ dfn }: { dfn: string }) {
  const [data, setData] = useState<NursingResponse<never> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<never>(`/vista/nursing/mar?dfn=${dfn}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [dfn]);

  if (error) return <ErrorBanner message={error} />;
  if (!data) return <LoadingSpinner />;
  return (
    <div>
      <IntegrationPendingBanner targets={data.pendingTargets} />
      <p style={{ fontSize: 13, color: 'var(--cprs-text-muted, #888)', padding: 8 }}>
        Medication Administration Record (MAR) requires the BCMA/PSB package which is not available
        in the WorldVistA Docker sandbox. When BCMA is installed, this tab will show scheduled and
        PRN medications with administration timestamps, doses, and nursing verification.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-tab: Flowsheet (Phase 138)                                        */
/* ------------------------------------------------------------------ */

function FlowsheetTab({ dfn }: { dfn: string }) {
  const [data, setData] = useState<NursingResponse<FlowsheetEntry> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<FlowsheetEntry>(`/vista/nursing/flowsheet?dfn=${dfn}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [dfn]);

  if (error) return <ErrorBanner message={error} />;
  if (!data) return <LoadingSpinner />;
  return (
    <div>
      <IntegrationPendingBanner targets={data.pendingTargets} />
      {data.items.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--cprs-text-muted, #888)', padding: 8 }}>
          No flowsheet data found.
          {(data.status === 'integration-pending' || data.status === 'unsupported-in-sandbox') && ' Flowsheet aggregation will populate when I/O and assessment RPCs are wired.'}
          {data.source && ` Source: ${data.source}`}
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--cprs-border, #ccc)', textAlign: 'left' }}>
              <th style={{ padding: '4px 8px' }}>Date</th>
              <th style={{ padding: '4px 8px' }}>Type</th>
              <th style={{ padding: '4px 8px' }}>Value</th>
              <th style={{ padding: '4px 8px' }}>Flag</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((f, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--cprs-border, #eee)', background: f.critical ? 'rgba(220,38,38,0.08)' : undefined }}>
                <td style={{ padding: '4px 8px' }}>{f.date}</td>
                <td style={{ padding: '4px 8px' }}>{f.type}</td>
                <td style={{ padding: '4px 8px' }}>{f.value}{f.units ? ` ${f.units}` : ''}</td>
                <td style={{ padding: '4px 8px' }}>{f.critical ? '⚠' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {data.rpcUsed?.length > 0 && (
        <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>
          RPC: {data.rpcUsed.join(', ')} | Source: {data.source}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-tab: Handoff SBAR (Phase 138)                                     */
/* ------------------------------------------------------------------ */

function HandoffTab({ dfn }: { dfn: string }) {
  const [reports, setReports] = useState<HandoffReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetchRaw<{ ok: boolean; reports: HandoffReport[] }>(`/handoff/reports?status=submitted`)
      .then((d) => { setReports(d.reports || []); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [dfn]);

  if (error) return <ErrorBanner message={error} />;
  if (loading) return <LoadingSpinner />;

  return (
    <div>
      {reports.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--cprs-text-muted, #888)', padding: 8 }}>
          No submitted handoff reports. Handoff reports use SBAR format (Situation, Background,
          Assessment, Recommendation) and are created during shift changes.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--cprs-border, #ccc)', textAlign: 'left' }}>
              <th style={{ padding: '4px 8px' }}>Ward</th>
              <th style={{ padding: '4px 8px' }}>Shift</th>
              <th style={{ padding: '4px 8px' }}>Status</th>
              <th style={{ padding: '4px 8px' }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--cprs-border, #eee)' }}>
                <td style={{ padding: '4px 8px' }}>{r.ward}</td>
                <td style={{ padding: '4px 8px' }}>{r.shiftLabel}</td>
                <td style={{ padding: '4px 8px' }}>{r.status}</td>
                <td style={{ padding: '4px 8px' }}>{new Date(r.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Panel                                                            */
/* ------------------------------------------------------------------ */

type NursingSubTab = 'tasks' | 'vitals' | 'notes' | 'flowsheet' | 'mar' | 'handoff';

export default function NursingPanel({ dfn }: { dfn: string }) {
  const [activeTab, setActiveTab] = useState<NursingSubTab>('tasks');

  const tabs: Array<{ key: NursingSubTab; label: string }> = [
    { key: 'tasks', label: 'Task List' },
    { key: 'vitals', label: 'Vitals' },
    { key: 'notes', label: 'Notes' },
    { key: 'flowsheet', label: 'Flowsheet' },
    { key: 'mar', label: 'MAR' },
    { key: 'handoff', label: 'Handoff' },
  ];

  return (
    <div style={{ padding: 8 }}>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--cprs-border, #ccc)', marginBottom: 8 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '6px 16px',
              fontSize: 12,
              fontWeight: activeTab === t.key ? 600 : 400,
              background: activeTab === t.key ? 'var(--cprs-selected, #e8f0fe)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === t.key ? '2px solid var(--cprs-accent, #2563eb)' : '2px solid transparent',
              cursor: 'pointer',
              color: activeTab === t.key ? 'var(--cprs-text, #333)' : 'var(--cprs-text-muted, #888)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'tasks' && <TaskListTab dfn={dfn} />}
      {activeTab === 'vitals' && <VitalsTab dfn={dfn} />}
      {activeTab === 'notes' && <NotesTab dfn={dfn} />}
      {activeTab === 'flowsheet' && <FlowsheetTab dfn={dfn} />}
      {activeTab === 'mar' && <MARTab dfn={dfn} />}
      {activeTab === 'handoff' && <HandoffTab dfn={dfn} />}
    </div>
  );
}
