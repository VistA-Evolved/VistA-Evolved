'use client';

/**
 * LongitudinalPanel -- Phase 540: JLV-style Longitudinal Viewer v1
 *
 * Aggregates clinical data across 8 domains (allergies, problems, vitals,
 * notes, medications, labs, consults, surgery) into a unified timeline.
 *
 * Three views:
 * - Timeline: chronological event stream with domain badges
 * - Summary: domain-level count cards
 * - Medications: active vs historical medication view
 */

import { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function apiFetch(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

type LongView = 'timeline' | 'summary' | 'meds';

const DOMAIN_COLORS: Record<string, string> = {
  allergy: '#dc3545',
  problem: '#fd7e14',
  vital: '#198754',
  note: '#0d6efd',
  medication: '#6f42c1',
  lab: '#20c997',
  consult: '#0dcaf0',
  surgery: '#6c757d',
};

interface Props {
  dfn?: string;
}

export default function LongitudinalPanel({ dfn }: Props) {
  const [view, setView] = useState<LongView>('timeline');
  const [patientDfn, setPatientDfn] = useState(dfn || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Timeline state
  const [events, setEvents] = useState<any[]>([]);
  const [domains, setDomains] = useState<Record<string, number>>({});
  const [eventCount, setEventCount] = useState(0);

  // Summary state
  const [summary, setSummary] = useState<any[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);

  // Meds state
  const [medsData, setMedsData] = useState<any>(null);

  const loadTimeline = useCallback(async () => {
    if (!patientDfn) return;
    setLoading(true); setError('');
    try {
      const data = await apiFetch(`/vista/longitudinal/timeline?dfn=${patientDfn}`);
      setEvents(data.events || []);
      setDomains(data.domains || {});
      setEventCount(data.eventCount || 0);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  }, [patientDfn]);

  const loadSummary = useCallback(async () => {
    if (!patientDfn) return;
    setLoading(true); setError('');
    try {
      const data = await apiFetch(`/vista/longitudinal/summary?dfn=${patientDfn}`);
      setSummary(data.summary || []);
      setTotalEvents(data.totalEvents || 0);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  }, [patientDfn]);

  const loadMeds = useCallback(async () => {
    if (!patientDfn) return;
    setLoading(true); setError('');
    try {
      const data = await apiFetch(`/vista/longitudinal/meds-summary?dfn=${patientDfn}`);
      setMedsData(data);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  }, [patientDfn]);

  useEffect(() => {
    if (!patientDfn) return;
    if (view === 'timeline') loadTimeline();
    else if (view === 'summary') loadSummary();
    else if (view === 'meds') loadMeds();
  }, [view, patientDfn, loadTimeline, loadSummary, loadMeds]);

  return (
    <div style={{ padding: '1rem' }}>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
        Longitudinal Viewer
        <span style={{ fontSize: '0.7rem', marginLeft: '0.5rem', color: '#0d6efd' }}>Phase 540 - JLV v1</span>
      </h2>

      {/* Patient DFN input */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Patient DFN"
          value={patientDfn}
          onChange={e => setPatientDfn(e.target.value)}
          style={{ padding: '0.375rem', border: '1px solid #ced4da', borderRadius: 4, width: 120, fontSize: '0.85rem' }}
        />
        <button
          onClick={() => { if (view === 'timeline') loadTimeline(); else if (view === 'summary') loadSummary(); else loadMeds(); }}
          style={{ padding: '0.375rem 0.75rem', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.85rem' }}>
          Load
        </button>
      </div>

      {/* View tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid #dee2e6', marginBottom: '1rem' }}>
        {(['timeline', 'summary', 'meds'] as LongView[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: '0.5rem 1rem', border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: view === v ? 600 : 400,
              color: view === v ? '#0d6efd' : '#495057',
              borderBottom: view === v ? '2px solid #0d6efd' : '2px solid transparent',
              fontSize: '0.85rem',
            }}>
            {v === 'timeline' ? 'Timeline' : v === 'summary' ? 'Summary' : 'Medications'}
          </button>
        ))}
      </div>

      {error && <div style={{ color: '#dc3545', marginBottom: '0.5rem', fontSize: '0.85rem' }}>{error}</div>}
      {loading && <div style={{ color: '#6c757d', fontStyle: 'italic' }}>Loading...</div>}

      {/* Timeline view */}
      {view === 'timeline' && !loading && (
        <div>
          <p style={{ fontSize: '0.8rem', color: '#6c757d', marginBottom: '0.75rem' }}>
            {eventCount} events across 8 domains
            {Object.entries(domains).filter(([, c]) => c > 0).map(([d, c]) => ` | ${d}: ${c}`).join('')}
          </p>
          {events.length === 0 && patientDfn ? (
            <p style={{ fontStyle: 'italic', color: '#6c757d' }}>No events found for this patient.</p>
          ) : (
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              {events.slice(0, 200).map((ev: any, i: number) => (
                <div key={ev.id || i} style={{
                  display: 'flex', gap: '0.75rem', padding: '0.5rem 0',
                  borderBottom: '1px solid #f0f0f0', alignItems: 'flex-start',
                }}>
                  <span style={{
                    display: 'inline-block', padding: '0.125rem 0.5rem',
                    borderRadius: 4, fontSize: '0.65rem', fontWeight: 600,
                    background: DOMAIN_COLORS[ev.domain] || '#6c757d',
                    color: '#fff', minWidth: 65, textAlign: 'center',
                    flexShrink: 0,
                  }}>
                    {ev.domain}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#6c757d', minWidth: 80, flexShrink: 0 }}>
                    {ev.date || 'undated'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.85rem' }}>{ev.summary}</span>
                    {ev.detail && <span style={{ fontSize: '0.75rem', color: '#6c757d', marginLeft: '0.5rem' }}>({ev.detail})</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary view */}
      {view === 'summary' && !loading && (
        <div>
          <p style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Total: {totalEvents} clinical events
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
            {summary.map((s: any) => (
              <div key={s.domain} style={{
                padding: '1rem', background: '#f8f9fa', borderRadius: 8,
                borderLeft: `4px solid ${DOMAIN_COLORS[s.domain === 'medications' ? 'medication' : s.domain === 'allergies' ? 'allergy' : s.domain] || '#6c757d'}`,
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{s.count}</div>
                <div style={{ fontSize: '0.8rem', color: '#495057', textTransform: 'capitalize' }}>{s.domain}</div>
                <div style={{ fontSize: '0.65rem', color: '#6c757d', marginTop: '0.25rem' }}>{s.rpc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Medications view */}
      {view === 'meds' && !loading && medsData && (
        <div>
          <p style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            {medsData.totalMedications} total medications
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '0.9rem', color: '#198754', marginBottom: '0.5rem' }}>
                Active ({medsData.active?.count || 0})
              </h3>
              {(medsData.active?.items || []).length === 0 ? (
                <p style={{ fontStyle: 'italic', fontSize: '0.8rem', color: '#6c757d' }}>None</p>
              ) : (
                <ul style={{ margin: 0, padding: '0 0 0 1rem', fontSize: '0.8rem' }}>
                  {medsData.active.items.map((m: any) => (
                    <li key={m.id} style={{ marginBottom: '0.25rem' }}>{m.summary}</li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 style={{ fontSize: '0.9rem', color: '#dc3545', marginBottom: '0.5rem' }}>
                Historical ({medsData.historical?.count || 0})
              </h3>
              {(medsData.historical?.items || []).length === 0 ? (
                <p style={{ fontStyle: 'italic', fontSize: '0.8rem', color: '#6c757d' }}>None</p>
              ) : (
                <ul style={{ margin: 0, padding: '0 0 0 1rem', fontSize: '0.8rem' }}>
                  {medsData.historical.items.map((m: any) => (
                    <li key={m.id} style={{ marginBottom: '0.25rem' }}>{m.summary}</li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 style={{ fontSize: '0.9rem', color: '#6c757d', marginBottom: '0.5rem' }}>
                Other ({medsData.other?.count || 0})
              </h3>
              {(medsData.other?.items || []).length === 0 ? (
                <p style={{ fontStyle: 'italic', fontSize: '0.8rem', color: '#6c757d' }}>None</p>
              ) : (
                <ul style={{ margin: 0, padding: '0 0 0 1rem', fontSize: '0.8rem' }}>
                  {medsData.other.items.map((m: any) => (
                    <li key={m.id} style={{ marginBottom: '0.25rem' }}>{m.summary}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
