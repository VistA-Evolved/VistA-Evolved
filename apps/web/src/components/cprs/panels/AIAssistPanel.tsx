'use client';

/**
 * AIAssistPanel — Phase 33
 *
 * Clinician-side AI assist panel in CPRS chart view.
 * Three tabs:
 * 1. Intake Summary — Draft clinician-ready note from intake data
 * 2. Lab Education — Generate patient education for lab results
 * 3. AI Audit — View AI usage audit trail (admin)
 *
 * All AI outputs require clinician confirmation before clinical use.
 * No diagnosis, treatment plans, prescribing guidance, or autonomous ordering.
 */

import { useState, useCallback } from 'react';
import { csrfHeaders } from '@/lib/csrf';
import { API_BASE } from '@/lib/api-config';


/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

interface AIResponseData {
  text: string;
  modelId: string;
  promptId: string;
  promptHash: string;
  citations: Array<{ source: string; category: string; snippet: string }>;
  confidence: 'high' | 'medium' | 'low';
  requiresConfirmation: boolean;
  wasRedacted: boolean;
  safetyWarnings: string[];
  latencyMs: number;
  responseId: string;
  generatedAt: string;
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
  deployment: string;
  status: string;
  allowedUseCases: string[];
}

interface AuditEvent {
  id: string;
  timestamp: string;
  useCase: string;
  modelId: string;
  actorRole: string;
  outcome: string;
  latencyMs: number;
  citationCount: number;
  clinicianConfirmed: boolean | null;
}

interface AuditStats {
  totalEvents: number;
  byOutcome: Record<string, number>;
  byUseCase: Record<string, number>;
  byModel: Record<string, number>;
  avgLatencyMs: number;
  blockedCount: number;
  confirmationRate: number;
}

/* ------------------------------------------------------------------ */
/* API helper                                                           */
/* ------------------------------------------------------------------ */

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...opts,
    headers: { 'Content-Type': 'application/json', ...csrfHeaders(), ...(opts?.headers || {}) },
  });
  return res.json();
}

/* ------------------------------------------------------------------ */
/* Sub-tab: Intake Summary                                              */
/* ------------------------------------------------------------------ */

function IntakeSummaryTab({ dfn }: { dfn: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIResponseData | null>(null);
  const [confirmed, setConfirmed] = useState<boolean | null>(null);
  const [auditEventId, setAuditEventId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const generateSummary = useCallback(async () => {
    setLoading(true);
    setError('');
    setResult(null);
    setConfirmed(null);

    try {
      const data = await apiFetch('/ai/request', {
        method: 'POST',
        body: JSON.stringify({
          useCase: 'intake-summary',
          promptId: 'intake-summary-v1',
          variables: {
            intakeDate: new Date().toISOString().split('T')[0],
            intakeData: '(Intake data will be loaded from patient intake session)',
            chartContext: '',
          },
          patientDfn: dfn,
        }),
      });

      if (!data.ok) {
        setError(data.error || 'AI request failed');
        return;
      }

      setResult(data.response);
      setAuditEventId(data.auditEventId);
    } catch (err) {
      setError('Failed to connect to AI Gateway');
    } finally {
      setLoading(false);
    }
  }, [dfn]);

  const handleConfirm = useCallback(async (accept: boolean) => {
    if (!auditEventId) return;
    await apiFetch(`/ai/confirm/${auditEventId}`, {
      method: 'POST',
      body: JSON.stringify({ confirmed: accept }),
    });
    setConfirmed(accept);
  }, [auditEventId]);

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>Intake Summary Draft</h3>
      <p style={{ fontSize: 12, color: '#666', margin: '0 0 12px' }}>
        Generate a clinician-ready note draft from patient intake data.
        <strong> Requires your review and confirmation before use.</strong>
      </p>

      <button
        onClick={generateSummary}
        disabled={loading}
        style={{
          padding: '6px 16px', background: '#2563eb', color: '#fff',
          border: 'none', borderRadius: 4, cursor: loading ? 'wait' : 'pointer',
          fontSize: 13,
        }}
      >
        {loading ? 'Generating...' : 'Generate Intake Summary'}
      </button>

      {error && (
        <div style={{ margin: '12px 0', padding: 8, background: '#fee2e2', borderRadius: 4, color: '#b91c1c', fontSize: 13 }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 12 }}>
          {result.requiresConfirmation && confirmed === null && (
            <div style={{ padding: 8, background: '#fef3c7', borderRadius: 4, marginBottom: 8, fontSize: 13 }}>
              ⚠ This draft requires your confirmation before clinical use.
            </div>
          )}

          <div style={{
            background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6,
            padding: 12, fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.5,
          }}>
            {result.text}
          </div>

          <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{
              fontSize: 11, padding: '2px 6px', borderRadius: 3,
              background: result.confidence === 'high' ? '#d1fae5' :
                result.confidence === 'medium' ? '#fef3c7' : '#fee2e2',
            }}>
              Confidence: {result.confidence}
            </span>
            <span style={{ fontSize: 11, color: '#666' }}>
              Model: {result.modelId} | {result.latencyMs}ms | {result.citations.length} citations
            </span>
            {result.wasRedacted && (
              <span style={{ fontSize: 11, padding: '2px 6px', background: '#dbeafe', borderRadius: 3 }}>
                PHI Redacted
              </span>
            )}
          </div>

          {result.safetyWarnings.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#b45309' }}>
              {result.safetyWarnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
            </div>
          )}

          {result.citations.length > 0 && (
            <details style={{ marginTop: 8, fontSize: 12 }}>
              <summary style={{ cursor: 'pointer', color: '#2563eb' }}>
                Citations ({result.citations.length})
              </summary>
              <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                {result.citations.map((c, i) => (
                  <li key={i}>
                    <strong>{c.source}</strong> ({c.category})
                    {c.snippet && <span style={{ color: '#666' }}> — {c.snippet.slice(0, 100)}</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {result.requiresConfirmation && confirmed === null && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button
                onClick={() => handleConfirm(true)}
                style={{ padding: '6px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
              >
                ✓ Accept Draft
              </button>
              <button
                onClick={() => handleConfirm(false)}
                style={{ padding: '6px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
              >
                ✗ Reject Draft
              </button>
            </div>
          )}
          {confirmed === true && (
            <div style={{ marginTop: 8, color: '#16a34a', fontSize: 13 }}>✓ Draft accepted — ready for clinical use</div>
          )}
          {confirmed === false && (
            <div style={{ marginTop: 8, color: '#dc2626', fontSize: 13 }}>✗ Draft rejected</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-tab: Lab Education                                               */
/* ------------------------------------------------------------------ */

function LabEducationTab({ dfn }: { dfn: string }) {
  const [labName, setLabName] = useState('');
  const [labValue, setLabValue] = useState('');
  const [labUnits, setLabUnits] = useState('');
  const [refRange, setRefRange] = useState('');
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [error, setError] = useState('');

  const handleExplain = useCallback(async () => {
    if (!labName.trim()) return;
    setLoading(true);
    setError('');
    setExplanation('');

    try {
      const data = await apiFetch('/ai/request', {
        method: 'POST',
        body: JSON.stringify({
          useCase: 'lab-education',
          promptId: 'lab-education-v1',
          variables: {
            labName: labName.trim(),
            labValue: labValue.trim(),
            labUnits: labUnits.trim(),
            referenceRange: refRange.trim(),
            labDate: new Date().toISOString().split('T')[0],
          },
          patientDfn: dfn,
        }),
      });

      if (!data.ok) {
        setError(data.error || 'Failed to generate explanation');
        return;
      }
      setExplanation(data.response?.text || '');
    } catch {
      setError('Failed to connect to AI Gateway');
    } finally {
      setLoading(false);
    }
  }, [dfn, labName, labValue, labUnits, refRange]);

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>Lab Result Education</h3>
      <p style={{ fontSize: 12, color: '#666', margin: '0 0 12px' }}>
        Generate a patient-friendly explanation of a lab result for education purposes.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxWidth: 500 }}>
        <div>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>Test Name *</label>
          <input value={labName} onChange={(e) => setLabName(e.target.value)} placeholder="e.g., HbA1c" style={{ width: '100%', padding: 4, fontSize: 13, border: '1px solid #ccc', borderRadius: 3 }} />
        </div>
        <div>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>Result Value</label>
          <input value={labValue} onChange={(e) => setLabValue(e.target.value)} placeholder="e.g., 7.2" style={{ width: '100%', padding: 4, fontSize: 13, border: '1px solid #ccc', borderRadius: 3 }} />
        </div>
        <div>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>Units</label>
          <input value={labUnits} onChange={(e) => setLabUnits(e.target.value)} placeholder="e.g., %" style={{ width: '100%', padding: 4, fontSize: 13, border: '1px solid #ccc', borderRadius: 3 }} />
        </div>
        <div>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>Reference Range</label>
          <input value={refRange} onChange={(e) => setRefRange(e.target.value)} placeholder="e.g., &lt;5.7%" style={{ width: '100%', padding: 4, fontSize: 13, border: '1px solid #ccc', borderRadius: 3 }} />
        </div>
      </div>

      <button
        onClick={handleExplain}
        disabled={loading || !labName.trim()}
        style={{ marginTop: 8, padding: '6px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: loading ? 'wait' : 'pointer', fontSize: 13 }}
      >
        {loading ? 'Generating...' : 'Explain for Patient'}
      </button>

      {error && (
        <div style={{ margin: '12px 0', padding: 8, background: '#fee2e2', borderRadius: 4, color: '#b91c1c', fontSize: 13 }}>{error}</div>
      )}

      {explanation && (
        <div style={{ marginTop: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: 12, fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
          {explanation}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-tab: AI Audit                                                    */
/* ------------------------------------------------------------------ */

function AuditTab() {
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadAudit = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsData, eventsData] = await Promise.all([
        apiFetch('/ai/audit/stats'),
        apiFetch('/ai/audit?limit=20'),
      ]);
      if (statsData.ok) setStats(statsData.stats);
      if (eventsData.ok) setEvents(eventsData.events || []);
      if (!statsData.ok && !eventsData.ok) setError('Admin access required');
    } catch {
      setError('Failed to load audit data');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>AI Usage Audit</h3>

      <button
        onClick={loadAudit}
        disabled={loading}
        style={{ padding: '6px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, marginBottom: 12 }}
      >
        {loading ? 'Loading...' : 'Load Audit Data'}
      </button>

      {error && (
        <div style={{ padding: 8, background: '#fee2e2', borderRadius: 4, color: '#b91c1c', fontSize: 13, marginBottom: 8 }}>{error}</div>
      )}

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          <div style={{ padding: 8, background: '#f0f9ff', borderRadius: 4, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>{stats.totalEvents}</div>
            <div style={{ fontSize: 11, color: '#666' }}>Total Events</div>
          </div>
          <div style={{ padding: 8, background: '#f0fdf4', borderRadius: 4, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>{stats.avgLatencyMs}ms</div>
            <div style={{ fontSize: 11, color: '#666' }}>Avg Latency</div>
          </div>
          <div style={{ padding: 8, background: '#fef3c7', borderRadius: 4, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>{stats.blockedCount}</div>
            <div style={{ fontSize: 11, color: '#666' }}>Blocked</div>
          </div>
          <div style={{ padding: 8, background: '#ede9fe', borderRadius: 4, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>{(stats.confirmationRate * 100).toFixed(0)}%</div>
            <div style={{ fontSize: 11, color: '#666' }}>Confirmation Rate</div>
          </div>
        </div>
      )}

      {events.length > 0 && (
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: 4 }}>Time</th>
              <th style={{ padding: 4 }}>Use Case</th>
              <th style={{ padding: 4 }}>Model</th>
              <th style={{ padding: 4 }}>Outcome</th>
              <th style={{ padding: 4 }}>Latency</th>
              <th style={{ padding: 4 }}>Confirmed</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: 4 }}>{new Date(e.timestamp).toLocaleTimeString()}</td>
                <td style={{ padding: 4 }}>{e.useCase}</td>
                <td style={{ padding: 4 }}>{e.modelId}</td>
                <td style={{ padding: 4 }}>
                  <span style={{
                    padding: '1px 4px', borderRadius: 3, fontSize: 11,
                    background: e.outcome === 'success' ? '#d1fae5' :
                      e.outcome === 'blocked' ? '#fee2e2' : '#fef3c7',
                  }}>
                    {e.outcome}
                  </span>
                </td>
                <td style={{ padding: 4 }}>{e.latencyMs}ms</td>
                <td style={{ padding: 4 }}>
                  {e.clinicianConfirmed === null ? '—' : e.clinicianConfirmed ? '✓' : '✗'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Panel                                                           */
/* ------------------------------------------------------------------ */

export default function AIAssistPanel({ dfn }: { dfn: string }) {
  const [activeTab, setActiveTab] = useState<'summary' | 'education' | 'audit'>('summary');

  const tabs = [
    { key: 'summary' as const, label: 'Intake Summary' },
    { key: 'education' as const, label: 'Lab Education' },
    { key: 'audit' as const, label: 'AI Audit' },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '8px 16px',
              background: activeTab === t.key ? '#fff' : 'transparent',
              border: 'none',
              borderBottom: activeTab === t.key ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: activeTab === t.key ? 600 : 400,
              color: activeTab === t.key ? '#1e40af' : '#64748b',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Governance banner */}
      <div style={{ padding: '4px 16px', background: '#eff6ff', borderBottom: '1px solid #dbeafe', fontSize: 11, color: '#1e40af' }}>
        AI Assist — Governed | No diagnosis, treatment plans, or prescribing guidance | All outputs audited | Clinician confirmation required for clinical drafts
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'summary' && <IntakeSummaryTab dfn={dfn} />}
        {activeTab === 'education' && <LabEducationTab dfn={dfn} />}
        {activeTab === 'audit' && <AuditTab />}
      </div>
    </div>
  );
}
