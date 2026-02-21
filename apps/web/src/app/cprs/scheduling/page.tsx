'use client';

/**
 * Clinician Scheduling Dashboard — Phase 63
 *
 * Tabs: Schedule (clinic/date view), Patient Appointments, Requests Queue
 * Data: VistA SDOE encounters + SD W/L wait list RPCs
 */

import { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include', ...opts });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

type Tab = 'schedule' | 'patient' | 'requests' | 'clinics';

const TABS: { id: Tab; label: string }[] = [
  { id: 'schedule', label: 'Clinic Schedule' },
  { id: 'patient', label: 'Patient Appointments' },
  { id: 'requests', label: 'Request Queue' },
  { id: 'clinics', label: 'Clinics & Providers' },
];

export default function SchedulingPage() {
  const [tab, setTab] = useState<Tab>('schedule');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Schedule tab state
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().slice(0, 10));
  const [encounters, setEncounters] = useState<any[]>([]);

  // Patient tab state
  const [patientDfn, setPatientDfn] = useState('');
  const [patientAppts, setPatientAppts] = useState<any[]>([]);

  // Requests tab state
  const [requests, setRequests] = useState<any[]>([]);

  // Clinics tab state
  const [clinics, setClinics] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const start = scheduleDate;
      const end = scheduleDate; // same day
      const data = await apiFetch(`/scheduling/appointments/range?startDate=${start}&endDate=${end}`);
      setEncounters(data.data || []);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }, [scheduleDate]);

  const loadPatientAppts = useCallback(async () => {
    if (!patientDfn) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`/scheduling/appointments?dfn=${patientDfn}`);
      setPatientAppts(data.data || []);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }, [patientDfn]);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/scheduling/requests');
      setRequests(data.data || []);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  const loadClinics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [clinicData, providerData] = await Promise.all([
        apiFetch('/scheduling/clinics'),
        apiFetch('/scheduling/providers'),
      ]);
      setClinics(clinicData.data || []);
      setProviders(providerData.data || []);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'schedule') loadSchedule();
    else if (tab === 'requests') loadRequests();
    else if (tab === 'clinics') loadClinics();
  }, [tab, loadSchedule, loadRequests, loadClinics]);

  const tabStyle = (t: Tab) => ({
    padding: '0.5rem 1rem',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: tab === t ? 600 : 400,
    color: tab === t ? '#0d6efd' : '#495057',
    borderBottom: tab === t ? '2px solid #0d6efd' : '2px solid transparent',
  });

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Scheduling</h1>
      <p style={{ color: '#6c757d', marginBottom: '1rem', fontSize: '0.875rem' }}>
        VistA SD* encounter-based scheduling &mdash; real data from SDOE + SD W/L RPCs
      </p>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid #dee2e6', marginBottom: '1rem' }}>
        {TABS.map((t) => (
          <button key={t.id} style={tabStyle(t.id)} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: '0.75rem', background: '#f8d7da', color: '#842029', borderRadius: 4, marginBottom: '1rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {loading && <p style={{ color: '#6c757d' }}>Loading...</p>}

      {/* ---- Schedule Tab ---- */}
      {tab === 'schedule' && !loading && (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Date:</label>
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              style={{ padding: '0.375rem 0.5rem', border: '1px solid #ced4da', borderRadius: 4, fontSize: '0.875rem' }}
            />
            <button
              onClick={loadSchedule}
              style={{ padding: '0.375rem 0.75rem', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.875rem' }}
            >
              Load
            </button>
          </div>

          {encounters.length === 0 ? (
            <p style={{ color: '#6c757d', fontStyle: 'italic' }}>No encounters for this date.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem' }}>Time</th>
                  <th style={{ padding: '0.5rem' }}>Patient</th>
                  <th style={{ padding: '0.5rem' }}>Clinic</th>
                  <th style={{ padding: '0.5rem' }}>Provider</th>
                  <th style={{ padding: '0.5rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {encounters.map((enc: any, i: number) => (
                  <tr key={enc.id || i} style={{ borderBottom: '1px solid #e9ecef' }}>
                    <td style={{ padding: '0.5rem' }}>{enc.dateTime ? new Date(enc.dateTime).toLocaleTimeString() : '-'}</td>
                    <td style={{ padding: '0.5rem' }}>{enc.patientDfn || '-'}</td>
                    <td style={{ padding: '0.5rem' }}>{enc.clinic || '-'}</td>
                    <td style={{ padding: '0.5rem' }}>{enc.provider || '-'}</td>
                    <td style={{ padding: '0.5rem' }}>
                      <span style={{
                        padding: '0.125rem 0.5rem',
                        borderRadius: 10,
                        fontSize: '0.75rem',
                        background: enc.source === 'request' ? '#fff3cd' : '#d1e7dd',
                        color: enc.source === 'request' ? '#664d03' : '#0f5132',
                      }}>
                        {enc.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ---- Patient Appointments Tab ---- */}
      {tab === 'patient' && !loading && (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Patient DFN:</label>
            <input
              type="text"
              value={patientDfn}
              onChange={(e) => setPatientDfn(e.target.value)}
              placeholder="e.g. 3"
              style={{ padding: '0.375rem 0.5rem', border: '1px solid #ced4da', borderRadius: 4, fontSize: '0.875rem', width: 120 }}
            />
            <button
              onClick={loadPatientAppts}
              disabled={!patientDfn}
              style={{ padding: '0.375rem 0.75rem', background: patientDfn ? '#0d6efd' : '#6c757d', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.875rem' }}
            >
              Search
            </button>
          </div>

          {patientAppts.length === 0 ? (
            <p style={{ color: '#6c757d', fontStyle: 'italic' }}>No appointments found. Enter a patient DFN and search.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem' }}>Date/Time</th>
                  <th style={{ padding: '0.5rem' }}>Clinic</th>
                  <th style={{ padding: '0.5rem' }}>Provider</th>
                  <th style={{ padding: '0.5rem' }}>Status</th>
                  <th style={{ padding: '0.5rem' }}>Source</th>
                </tr>
              </thead>
              <tbody>
                {patientAppts.map((a: any, i: number) => (
                  <tr key={a.id || i} style={{ borderBottom: '1px solid #e9ecef' }}>
                    <td style={{ padding: '0.5rem' }}>{a.dateTime ? new Date(a.dateTime).toLocaleString() : a.scheduledAt ? new Date(a.scheduledAt).toLocaleString() : '-'}</td>
                    <td style={{ padding: '0.5rem' }}>{a.clinic || a.clinicName || '-'}</td>
                    <td style={{ padding: '0.5rem' }}>{a.provider || a.providerName || '-'}</td>
                    <td style={{ padding: '0.5rem' }}>
                      <span style={{
                        padding: '0.125rem 0.5rem',
                        borderRadius: 10,
                        fontSize: '0.75rem',
                        background: a.status?.includes('pending') || a.status?.includes('request') ? '#fff3cd' : '#d1e7dd',
                        color: a.status?.includes('pending') || a.status?.includes('request') ? '#664d03' : '#0f5132',
                      }}>
                        {a.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem', fontSize: '0.75rem', color: '#6c757d' }}>{a.source || 'local'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ---- Requests Tab ---- */}
      {tab === 'requests' && !loading && (
        <div>
          <p style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '1rem' }}>
            Pending appointment requests from patients (portal + clinician submissions).
          </p>
          {requests.length === 0 ? (
            <p style={{ fontStyle: 'italic', color: '#6c757d' }}>No pending requests.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem' }}>ID</th>
                  <th style={{ padding: '0.5rem' }}>Patient DFN</th>
                  <th style={{ padding: '0.5rem' }}>Clinic</th>
                  <th style={{ padding: '0.5rem' }}>Preferred Date</th>
                  <th style={{ padding: '0.5rem' }}>Type</th>
                  <th style={{ padding: '0.5rem' }}>Status</th>
                  <th style={{ padding: '0.5rem' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r: any) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                    <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>{r.id}</td>
                    <td style={{ padding: '0.5rem' }}>{r.patientDfn}</td>
                    <td style={{ padding: '0.5rem' }}>{r.clinicName}</td>
                    <td style={{ padding: '0.5rem' }}>{r.preferredDate ? new Date(r.preferredDate).toLocaleDateString() : '-'}</td>
                    <td style={{ padding: '0.5rem' }}>{r.type || 'new_appointment'}</td>
                    <td style={{ padding: '0.5rem' }}>
                      <span style={{ padding: '0.125rem 0.5rem', borderRadius: 10, fontSize: '0.75rem', background: '#fff3cd', color: '#664d03' }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem', fontSize: '0.75rem' }}>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ---- Clinics & Providers Tab ---- */}
      {tab === 'clinics' && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Clinics (Hospital Locations)</h3>
            <p style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.5rem' }}>
              Source: SD W/L RETRIVE HOSP LOC(#44)
            </p>
            {clinics.length === 0 ? (
              <p style={{ fontStyle: 'italic', color: '#6c757d' }}>No clinics loaded.</p>
            ) : (
              <div style={{ maxHeight: 400, overflow: 'auto', border: '1px solid #dee2e6', borderRadius: 4 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #dee2e6', background: '#f8f9fa' }}>
                      <th style={{ padding: '0.375rem', textAlign: 'left' }}>IEN</th>
                      <th style={{ padding: '0.375rem', textAlign: 'left' }}>Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clinics.map((c: any) => (
                      <tr key={c.ien} style={{ borderBottom: '1px solid #e9ecef' }}>
                        <td style={{ padding: '0.375rem', fontFamily: 'monospace' }}>{c.ien}</td>
                        <td style={{ padding: '0.375rem' }}>{c.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Providers</h3>
            <p style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.5rem' }}>
              Source: SD W/L RETRIVE PERSON(200)
            </p>
            {providers.length === 0 ? (
              <p style={{ fontStyle: 'italic', color: '#6c757d' }}>No providers loaded.</p>
            ) : (
              <div style={{ maxHeight: 400, overflow: 'auto', border: '1px solid #dee2e6', borderRadius: 4 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #dee2e6', background: '#f8f9fa' }}>
                      <th style={{ padding: '0.375rem', textAlign: 'left' }}>DUZ</th>
                      <th style={{ padding: '0.375rem', textAlign: 'left' }}>Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {providers.map((p: any) => (
                      <tr key={p.duz} style={{ borderBottom: '1px solid #e9ecef' }}>
                        <td style={{ padding: '0.375rem', fontFamily: 'monospace' }}>{p.duz}</td>
                        <td style={{ padding: '0.375rem' }}>{p.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
