'use client';

/**
 * Clinician Scheduling Dashboard -- Phase 63, enhanced Phase 131, Phase 139.
 *
 * Tabs: Schedule (clinic/date view), Patient Appointments, Requests Queue,
 *       Clinics & Providers, Lifecycle (Phase 131), VistA Posture (Phase 131)
 * Phase 139: Approve/reject buttons in Request Queue, check-in/out in Lifecycle.
 * Data: VistA SDOE encounters + SD W/L wait list RPCs + ORWPT + SDVW
 */

import { useState, useEffect, useCallback } from 'react';
import { csrfHeaders } from '@/lib/csrf';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...opts,
    headers: { ...csrfHeaders(), ...(opts?.headers || {}) },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

type Tab = 'schedule' | 'patient' | 'requests' | 'clinics' | 'lifecycle' | 'posture' | 'waitlist' | 'recall' | 'parity';

const TABS: { id: Tab; label: string }[] = [
  { id: 'schedule', label: 'Clinic Schedule' },
  { id: 'patient', label: 'Patient Appointments' },
  { id: 'requests', label: 'Request Queue' },
  { id: 'clinics', label: 'Clinics & Providers' },
  { id: 'waitlist', label: 'Wait List' },
  { id: 'recall', label: 'Recall' },
  { id: 'lifecycle', label: 'Lifecycle' },
  { id: 'posture', label: 'VistA Posture' },
  { id: 'parity', label: 'VSE Parity' },
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

  // New request form state
  const [showReqForm, setShowReqForm] = useState(false);
  const [reqClinic, setReqClinic] = useState('');
  const [reqDate, setReqDate] = useState('');
  const [reqReason, setReqReason] = useState('');
  const [reqType, setReqType] = useState('in_person');
  const [submitting, setSubmitting] = useState(false);

  // Requests tab state
  const [requests, setRequests] = useState<any[]>([]);

  // Clinics tab state
  const [clinics, setClinics] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);

  // Phase 131: Lifecycle tab state
  const [lifecycleEntries, setLifecycleEntries] = useState<any[]>([]);
  const [lifecycleStats, setLifecycleStats] = useState<any>(null);
  const [lifecycleDfn, setLifecycleDfn] = useState('');

  // Phase 131: VistA Posture tab state
  const [postureEntries, setPostureEntries] = useState<any[]>([]);
  const [postureSummary, setPostureSummary] = useState<any>(null);
  const [referenceData, setReferenceData] = useState<any>(null);

  // Phase 539: Wait List tab state
  const [waitlistEntries, setWaitlistEntries] = useState<any[]>([]);

  // Phase 539: Recall tab state
  const [recallDfn, setRecallDfn] = useState('');
  const [recallEntries, setRecallEntries] = useState<any[]>([]);
  const [recallGrounding, setRecallGrounding] = useState<any>(null);

  // Phase 539: Parity tab state
  const [parityData, setParityData] = useState<any>(null);

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

  const loadLifecycle = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const url = lifecycleDfn
        ? `/scheduling/lifecycle?patientDfn=${lifecycleDfn}`
        : '/scheduling/lifecycle';
      const data = await apiFetch(url);
      setLifecycleEntries(data.data || []);
      if (data.stats) setLifecycleStats(data.stats);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }, [lifecycleDfn]);

  const loadPosture = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [postureData, refData] = await Promise.all([
        apiFetch('/scheduling/posture'),
        apiFetch('/scheduling/reference-data'),
      ]);
      setPostureEntries(postureData.data || []);
      setPostureSummary(postureData.summary || null);
      setReferenceData(refData.data || null);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  const submitRequest = useCallback(async () => {
    if (!patientDfn || !reqClinic || !reqDate || !reqReason) {
      setError('Patient DFN, clinic, date, and reason are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await apiFetch('/scheduling/appointments/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientDfn,
          clinicName: reqClinic,
          preferredDate: reqDate,
          reason: reqReason,
          appointmentType: reqType,
        }),
      });
      setReqClinic(''); setReqDate(''); setReqReason('');
      setShowReqForm(false);
      // Reload patient appointments to show the new request
      await loadPatientAppts();
    } catch (err: any) {
      setError(err.message);
    }
    setSubmitting(false);
  }, [patientDfn, reqClinic, reqDate, reqReason, reqType, loadPatientAppts]);

  // Phase 139: Approve / Reject request actions
  const triageRequest = useCallback(async (id: string, action: 'approve' | 'reject') => {
    setError('');
    try {
      await apiFetch(`/scheduling/requests/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: action === 'reject' ? 'Rejected by scheduling staff' : undefined }),
      });
      await loadRequests();
    } catch (err: any) {
      setError(err.message);
    }
  }, [loadRequests]);

  // Phase 139: Quick check-in from lifecycle tab
  const quickCheckin = useCallback(async (apptRef: string, dfn: string, clinic: string, clinicIen?: string) => {
    setError('');
    try {
      await apiFetch(`/scheduling/appointments/${apptRef}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientDfn: dfn, clinicName: clinic, clinicIen }),
      });
      await loadLifecycle();
    } catch (err: any) {
      setError(err.message);
    }
  }, [loadLifecycle]);

  const quickCheckout = useCallback(async (apptRef: string, dfn: string, clinic: string, clinicIen?: string) => {
    setError('');
    try {
      await apiFetch(`/scheduling/appointments/${apptRef}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientDfn: dfn, clinicName: clinic, clinicIen }),
      });
      await loadLifecycle();
    } catch (err: any) {
      setError(err.message);
    }
  }, [loadLifecycle]);

  // Phase 539: Wait List loader
  const loadWaitlist = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await apiFetch('/scheduling/waitlist');
      setWaitlistEntries(data.data || data.entries || []);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  }, []);

  // Phase 539: Recall loader
  const loadRecall = useCallback(async () => {
    if (!recallDfn) return;
    setLoading(true); setError('');
    try {
      const data = await apiFetch(`/scheduling/recall?dfn=${recallDfn}`);
      setRecallEntries(data.data || []);
      setRecallGrounding(data.vistaGrounding || null);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  }, [recallDfn]);

  // Phase 539: Parity loader
  const loadParity = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await apiFetch('/scheduling/parity');
      setParityData(data);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'schedule') loadSchedule();
    else if (tab === 'requests') loadRequests();
    else if (tab === 'clinics') loadClinics();
    else if (tab === 'lifecycle') loadLifecycle();
    else if (tab === 'posture') loadPosture();
    else if (tab === 'waitlist') loadWaitlist();
    else if (tab === 'parity') loadParity();
  }, [tab, loadSchedule, loadRequests, loadClinics, loadLifecycle, loadPosture, loadWaitlist, loadParity]);

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
            <button
              onClick={() => setShowReqForm(!showReqForm)}
              disabled={!patientDfn}
              style={{ padding: '0.375rem 0.75rem', background: patientDfn ? '#198754' : '#6c757d', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.875rem', marginLeft: 'auto' }}
            >
              {showReqForm ? 'Hide Form' : 'New Request'}
            </button>
          </div>

          {showReqForm && patientDfn && (
            <div style={{ padding: '0.75rem', border: '1px solid #c3e6cb', background: '#f0faf3', borderRadius: 6, marginBottom: '1rem' }}>
              <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem' }}>New Appointment Request for DFN {patientDfn}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Clinic</label>
                  <input type="text" value={reqClinic} onChange={(e) => setReqClinic(e.target.value)}
                    placeholder="e.g. Primary Care" style={{ display: 'block', width: '100%', padding: '0.25rem 0.375rem', border: '1px solid #ced4da', borderRadius: 4, fontSize: '0.8rem', marginTop: 2 }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Preferred Date</label>
                  <input type="datetime-local" value={reqDate} onChange={(e) => setReqDate(e.target.value)}
                    style={{ display: 'block', width: '100%', padding: '0.25rem 0.375rem', border: '1px solid #ced4da', borderRadius: 4, fontSize: '0.8rem', marginTop: 2 }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Visit Type</label>
                  <select value={reqType} onChange={(e) => setReqType(e.target.value)}
                    style={{ display: 'block', width: '100%', padding: '0.25rem 0.375rem', border: '1px solid #ced4da', borderRadius: 4, fontSize: '0.8rem', marginTop: 2 }}>
                    <option value="in_person">In Person</option>
                    <option value="telehealth">Telehealth</option>
                    <option value="phone">Phone</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Reason</label>
                  <input type="text" value={reqReason} onChange={(e) => setReqReason(e.target.value)}
                    placeholder="Brief reason" style={{ display: 'block', width: '100%', padding: '0.25rem 0.375rem', border: '1px solid #ced4da', borderRadius: 4, fontSize: '0.8rem', marginTop: 2 }} />
                </div>
              </div>
              <button onClick={submitRequest} disabled={submitting || !reqClinic || !reqDate || !reqReason}
                style={{ padding: '0.375rem 0.75rem', background: (submitting || !reqClinic || !reqDate || !reqReason) ? '#6c757d' : '#198754', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' }}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          )}

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
                  <th style={{ padding: '0.5rem' }}>Actions</th>
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
                      <span style={{ padding: '0.125rem 0.5rem', borderRadius: 10, fontSize: '0.75rem',
                        background: r.status === 'approved' ? '#d1e7dd' : r.status === 'rejected' ? '#f8d7da' : '#fff3cd',
                        color: r.status === 'approved' ? '#0f5132' : r.status === 'rejected' ? '#842029' : '#664d03' }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem', fontSize: '0.75rem' }}>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</td>
                    <td style={{ padding: '0.5rem' }}>
                      {r.status === 'pending' && (
                        <span style={{ display: 'flex', gap: '0.25rem' }}>
                          <button onClick={() => triageRequest(r.id, 'approve')}
                            style={{ padding: '0.2rem 0.5rem', background: '#198754', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.7rem' }}>
                            Approve
                          </button>
                          <button onClick={() => triageRequest(r.id, 'reject')}
                            style={{ padding: '0.2rem 0.5rem', background: '#dc3545', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.7rem' }}>
                            Reject
                          </button>
                        </span>
                      )}
                      {r.status !== 'pending' && (
                        <span style={{ fontSize: '0.75rem', color: '#6c757d' }}>{r.status}</span>
                      )}
                    </td>
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

      {/* ---- Lifecycle Tab (Phase 131) ---- */}
      {tab === 'lifecycle' && !loading && (
        <div>
          <p style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '1rem' }}>
            Appointment lifecycle state transitions tracked in Postgres.
            States: requested &rarr; waitlisted &rarr; booked &rarr; checked_in &rarr; completed | cancelled | no_show
          </p>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Filter by DFN:</label>
            <input
              type="text"
              value={lifecycleDfn}
              onChange={(e) => setLifecycleDfn(e.target.value)}
              placeholder="(blank = summary)"
              style={{ padding: '0.375rem 0.5rem', border: '1px solid #ced4da', borderRadius: 4, fontSize: '0.875rem', width: 140 }}
            />
            <button
              onClick={loadLifecycle}
              style={{ padding: '0.375rem 0.75rem', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.875rem' }}
            >
              Load
            </button>
          </div>

          {lifecycleStats && (
            <div style={{ padding: '0.75rem', background: '#e8f4fd', borderRadius: 6, marginBottom: '1rem', fontSize: '0.875rem' }}>
              <strong>Stats:</strong> Total entries: {lifecycleStats.total}
              {lifecycleStats.byState && Object.keys(lifecycleStats.byState).length > 0 && (
                <span> | {Object.entries(lifecycleStats.byState).map(([s, c]) => `${s}: ${c}`).join(', ')}</span>
              )}
            </div>
          )}

          {lifecycleEntries.length === 0 ? (
            <p style={{ fontStyle: 'italic', color: '#6c757d' }}>
              {lifecycleDfn ? 'No lifecycle entries for this patient.' : 'No lifecycle entries recorded yet. Use POST /scheduling/lifecycle/transition to record state changes.'}
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>
                  <th style={{ padding: '0.375rem' }}>Time</th>
                  <th style={{ padding: '0.375rem' }}>Appt Ref</th>
                  <th style={{ padding: '0.375rem' }}>Clinic</th>
                  <th style={{ padding: '0.375rem' }}>Transition</th>
                  <th style={{ padding: '0.375rem' }}>RPC Used</th>
                  <th style={{ padding: '0.375rem' }}>Note</th>
                  <th style={{ padding: '0.375rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {lifecycleEntries.map((e: any) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                    <td style={{ padding: '0.375rem', fontSize: '0.75rem' }}>{e.createdAt ? new Date(e.createdAt).toLocaleString() : '-'}</td>
                    <td style={{ padding: '0.375rem', fontFamily: 'monospace', fontSize: '0.7rem' }}>{e.appointmentRef?.slice(0, 12) || '-'}</td>
                    <td style={{ padding: '0.375rem' }}>{e.clinicName || '-'}</td>
                    <td style={{ padding: '0.375rem' }}>
                      {e.previousState && <span style={{ color: '#6c757d' }}>{e.previousState} &rarr; </span>}
                      <span style={{
                        padding: '0.125rem 0.375rem',
                        borderRadius: 8,
                        fontSize: '0.7rem',
                        background: e.state === 'completed' ? '#d1e7dd' : e.state === 'cancelled' ? '#f8d7da' : e.state === 'booked' ? '#cfe2ff' : e.state === 'checked_in' ? '#cfe2ff' : '#fff3cd',
                        color: e.state === 'completed' ? '#0f5132' : e.state === 'cancelled' ? '#842029' : e.state === 'booked' ? '#084298' : e.state === 'checked_in' ? '#084298' : '#664d03',
                      }}>
                        {e.state}
                      </span>
                    </td>
                    <td style={{ padding: '0.375rem', fontSize: '0.7rem', color: '#6c757d' }}>{e.rpcUsed || '-'}</td>
                    <td style={{ padding: '0.375rem', fontSize: '0.75rem' }}>{e.transitionNote || '-'}</td>
                    <td style={{ padding: '0.375rem' }}>
                      {e.state === 'booked' && (
                        <button onClick={() => quickCheckin(e.appointmentRef, e.patientDfn, e.clinicName, e.clinicIen)}
                          style={{ padding: '0.15rem 0.4rem', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.65rem' }}>
                          Check In
                        </button>
                      )}
                      {e.state === 'checked_in' && (
                        <button onClick={() => quickCheckout(e.appointmentRef, e.patientDfn, e.clinicName, e.clinicIen)}
                          style={{ padding: '0.15rem 0.4rem', background: '#198754', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.65rem' }}>
                          Check Out
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ---- VistA Posture Tab (Phase 131) ---- */}
      {tab === 'posture' && !loading && (
        <div>
          <p style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '1rem' }}>
            VistA scheduling RPC availability matrix -- which RPCs exist and are callable in this sandbox.
          </p>

          {postureSummary && (
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ padding: '0.5rem 1rem', background: '#d1e7dd', borderRadius: 6, fontSize: '0.875rem' }}>
                <strong>{postureSummary.available}</strong> Available
              </div>
              <div style={{ padding: '0.5rem 1rem', background: '#fff3cd', borderRadius: 6, fontSize: '0.875rem' }}>
                <strong>{postureSummary.callableNoData}</strong> Callable (no data)
              </div>
              <div style={{ padding: '0.5rem 1rem', background: '#f8d7da', borderRadius: 6, fontSize: '0.875rem' }}>
                <strong>{postureSummary.notInstalled}</strong> Not installed
              </div>
            </div>
          )}

          {postureEntries.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>
                  <th style={{ padding: '0.375rem' }}>RPC Name</th>
                  <th style={{ padding: '0.375rem' }}>IEN</th>
                  <th style={{ padding: '0.375rem' }}>Package</th>
                  <th style={{ padding: '0.375rem' }}>Status</th>
                  <th style={{ padding: '0.375rem' }}>Sandbox Note</th>
                </tr>
              </thead>
              <tbody>
                {postureEntries.map((p: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e9ecef' }}>
                    <td style={{ padding: '0.375rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>{p.rpc}</td>
                    <td style={{ padding: '0.375rem', fontFamily: 'monospace' }}>{p.ien || '-'}</td>
                    <td style={{ padding: '0.375rem' }}>{p.vistaPackage}</td>
                    <td style={{ padding: '0.375rem' }}>
                      <span style={{
                        padding: '0.125rem 0.375rem',
                        borderRadius: 8,
                        fontSize: '0.7rem',
                        background: p.status === 'available' ? '#d1e7dd' : p.status === 'callable_no_data' ? '#fff3cd' : '#f8d7da',
                        color: p.status === 'available' ? '#0f5132' : p.status === 'callable_no_data' ? '#664d03' : '#842029',
                      }}>
                        {p.status === 'callable_no_data' ? 'no data' : p.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.375rem', fontSize: '0.75rem', color: '#6c757d' }}>{p.sandboxNote}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {referenceData && (
            <div>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Reference Data (SD W/L)</h3>
              <p style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.5rem' }}>
                From SD W/L PRIORITY, SD W/L TYPE, SD W/L CURRENT STATUS RPCs
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>Priorities ({referenceData.priorities?.length || 0})</h4>
                  {(referenceData.priorities || []).length === 0 ? (
                    <p style={{ fontStyle: 'italic', color: '#6c757d', fontSize: '0.8rem' }}>Empty (sandbox)</p>
                  ) : (
                    <ul style={{ margin: 0, padding: '0 0 0 1rem', fontSize: '0.8rem' }}>
                      {referenceData.priorities.map((p: any) => <li key={p.ien}>{p.ien}: {p.name}</li>)}
                    </ul>
                  )}
                </div>
                <div>
                  <h4 style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>Types ({referenceData.types?.length || 0})</h4>
                  {(referenceData.types || []).length === 0 ? (
                    <p style={{ fontStyle: 'italic', color: '#6c757d', fontSize: '0.8rem' }}>Empty (sandbox)</p>
                  ) : (
                    <ul style={{ margin: 0, padding: '0 0 0 1rem', fontSize: '0.8rem' }}>
                      {referenceData.types.map((t: any) => <li key={t.ien}>{t.ien}: {t.name}</li>)}
                    </ul>
                  )}
                </div>
                <div>
                  <h4 style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>Statuses ({referenceData.statuses?.length || 0})</h4>
                  {(referenceData.statuses || []).length === 0 ? (
                    <p style={{ fontStyle: 'italic', color: '#6c757d', fontSize: '0.8rem' }}>Empty (sandbox)</p>
                  ) : (
                    <ul style={{ margin: 0, padding: '0 0 0 1rem', fontSize: '0.8rem' }}>
                      {referenceData.statuses.map((s: any) => <li key={s.ien}>{s.ien}: {s.name}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Phase 539: Wait List tab */}
      {tab === 'waitlist' && !loading && (
        <div>
          <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Wait List Management</h2>
          <p style={{ fontSize: '0.8rem', color: '#6c757d', marginBottom: '1rem' }}>
            SD W/L RETRIVE FULL DATA -- patient wait-list entries across clinics.
          </p>
          {waitlistEntries.length === 0 ? (
            <p style={{ fontStyle: 'italic', color: '#6c757d' }}>No wait-list entries found (sandbox may be empty).</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #dee2e6', background: '#f8f9fa' }}>
                  <th style={{ padding: '0.375rem', textAlign: 'left' }}>IEN</th>
                  <th style={{ padding: '0.375rem', textAlign: 'left' }}>Patient</th>
                  <th style={{ padding: '0.375rem', textAlign: 'left' }}>Clinic</th>
                  <th style={{ padding: '0.375rem', textAlign: 'left' }}>Priority</th>
                  <th style={{ padding: '0.375rem', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '0.375rem', textAlign: 'left' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {waitlistEntries.map((w: any, i: number) => (
                  <tr key={w.ien || i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.375rem' }}>{w.ien || '-'}</td>
                    <td style={{ padding: '0.375rem' }}>{w.patientName || w.dfn || '-'}</td>
                    <td style={{ padding: '0.375rem' }}>{w.clinicName || w.clinic || '-'}</td>
                    <td style={{ padding: '0.375rem' }}>{w.priority || '-'}</td>
                    <td style={{ padding: '0.375rem' }}>{w.status || '-'}</td>
                    <td style={{ padding: '0.375rem' }}>{w.requestDate || w.date || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Phase 539: Recall tab */}
      {tab === 'recall' && !loading && (
        <div>
          <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Recall / Reminder Management</h2>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="Patient DFN"
              value={recallDfn}
              onChange={e => setRecallDfn(e.target.value)}
              style={{ padding: '0.375rem', border: '1px solid #ced4da', borderRadius: 4, width: 120, fontSize: '0.8rem' }}
            />
            <button
              onClick={loadRecall}
              style={{ padding: '0.375rem 0.75rem', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4, fontSize: '0.8rem', cursor: 'pointer' }}>
              Load Recalls
            </button>
          </div>
          <span style={{ display: 'inline-block', padding: '0.125rem 0.5rem', background: '#fff3cd', color: '#664d03', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            INTEGRATION PENDING
          </span>
          {recallEntries.length === 0 ? (
            <p style={{ fontStyle: 'italic', color: '#6c757d', fontSize: '0.85rem' }}>
              No recall entries. VistA File 403.5 (Recall Reminders) not populated in sandbox.
            </p>
          ) : (
            <ul style={{ fontSize: '0.85rem' }}>
              {recallEntries.map((r: any, i: number) => (
                <li key={r.ien || i}>{r.ien}: {r.description || r.recallType || 'Recall entry'}</li>
              ))}
            </ul>
          )}
          {recallGrounding && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f8f9fa', borderRadius: 6, fontSize: '0.75rem' }}>
              <strong>VistA Grounding</strong>
              <p style={{ margin: '0.25rem 0' }}><strong>Files:</strong> {recallGrounding.vistaFiles?.join(', ')}</p>
              <p style={{ margin: '0.25rem 0' }}><strong>RPCs:</strong> {recallGrounding.targetRpcs?.join(', ')}</p>
              <p style={{ margin: '0.25rem 0' }}><strong>Migration:</strong> {recallGrounding.migrationPath}</p>
              <p style={{ margin: '0.25rem 0', color: '#6c757d' }}>{recallGrounding.sandboxNote}</p>
            </div>
          )}
        </div>
      )}

      {/* Phase 539: VSE Parity tab */}
      {tab === 'parity' && !loading && (
        <div>
          <h2 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>VSE / VS GUI Parity Matrix</h2>
          {parityData ? (
            <>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', fontSize: '0.8rem' }}>
                <span><strong>Overall Coverage:</strong> {parityData.overallCoveragePct}%</span>
                <span><strong>Endpoints:</strong> {parityData.endpointCount}</span>
                <span><strong>RPCs:</strong> {parityData.rpcCount}</span>
                <span><strong>Capabilities:</strong> {parityData.capabilityCount}</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #dee2e6', background: '#f8f9fa' }}>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>VSE Surface</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Priority</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Coverage</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>RPCs</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Gaps</th>
                  </tr>
                </thead>
                <tbody>
                  {(parityData.surfaces || []).map((s: any) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.5rem', fontWeight: 500 }}>{s.name}</td>
                      <td style={{ padding: '0.5rem' }}>
                        <span style={{
                          padding: '0.125rem 0.375rem', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600,
                          background: s.priority === 'p0-critical' ? '#f8d7da' : s.priority === 'p1-high' ? '#fff3cd' : '#d1e7dd',
                          color: s.priority === 'p0-critical' ? '#842029' : s.priority === 'p1-high' ? '#664d03' : '#0f5132',
                        }}>
                          {s.priority}
                        </span>
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                        <div style={{ background: '#e9ecef', borderRadius: 4, height: 16, position: 'relative', overflow: 'hidden' }}>
                          <div style={{
                            background: s.coveragePct >= 80 ? '#198754' : s.coveragePct >= 50 ? '#ffc107' : '#dc3545',
                            height: '100%', width: `${s.coveragePct}%`, borderRadius: 4,
                          }} />
                          <span style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', fontSize: '0.65rem', fontWeight: 600, lineHeight: '16px' }}>
                            {s.coveragePct}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '0.5rem' }}>{s.veStatus}</td>
                      <td style={{ padding: '0.5rem', fontSize: '0.7rem', color: '#6c757d' }}>{s.rpcs?.join(', ')}</td>
                      <td style={{ padding: '0.5rem', fontSize: '0.7rem', color: '#6c757d' }}>{s.gaps?.join('; ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p style={{ fontStyle: 'italic', color: '#6c757d' }}>Loading parity data...</p>
          )}
        </div>
      )}
    </div>
  );
}