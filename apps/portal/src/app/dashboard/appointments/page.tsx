/**
 * Appointments Page — Upcoming/past appointments with cancel/reschedule request.
 * VistA scheduling RPCs not available in sandbox — uses demo data with
 * request flows that show "clinic will confirm" messaging.
 * Phase 139: check-in status visibility + lifecycle indicator.
 * Phase 147: writeback mode indicator + honest scheduling badge.
 */

'use client';

import { useEffect, useState } from 'react';
import { DataSourceBadge } from '@/components/data-source-badge';
import {
  fetchAppointments,
  fetchSchedulingMode,
  requestNewAppointment,
  requestAppointmentCancellation,
  requestAppointmentReschedule,
} from '@/lib/api';

type View = 'list' | 'request';

/** Phase 147: writeback mode shapes — aligned with API SchedulingMode */
interface SchedulingMode {
  writebackEnabled: boolean;
  sdesInstalled: boolean;
  sdoeInstalled: boolean;
  sdwlInstalled: boolean;
  sdvwInstalled?: boolean;
  mode: 'vista_direct' | 'vista_waitlist' | 'sdes_partial' | 'request_only';
  detail: string;
}

type AppointmentSource = 'ehr' | 'pending' | 'local';

function getAppointmentSource(appt: any): AppointmentSource {
  const source = String(appt?.source || '').toLowerCase();
  if (source === 'ehr' || source === 'pending' || source === 'local') {
    return source as AppointmentSource;
  }
  return 'pending';
}

function getAppointmentBadgeMeta(
  appointments: any[],
  schedulingMode: SchedulingMode | null
): { source: AppointmentSource; label?: string } {
  if (appointments.length === 0) {
    if (schedulingMode && !schedulingMode.writebackEnabled) {
      return { source: 'pending', label: 'Request Only' };
    }
    return { source: 'local', label: 'No Appointments' };
  }

  const sources = new Set(appointments.map((appt) => getAppointmentSource(appt)));
  if (sources.size === 1) {
    const only = Array.from(sources)[0] as AppointmentSource;
    if (only === 'local') return { source: 'local', label: 'Local Schedule' };
    if (only === 'pending') return { source: 'pending', label: 'Request Pending' };
    return { source: 'ehr' };
  }

  if (sources.has('local')) return { source: 'local', label: 'Mixed Sources' };
  return { source: 'pending', label: 'Mixed Sources' };
}

export default function AppointmentsPage() {
  const [view, setView] = useState<View>('list');
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [past, setPast] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [schedulingMode, setSchedulingMode] = useState<SchedulingMode | null>(null);
  const upcomingBadge = getAppointmentBadgeMeta(upcoming, schedulingMode);
  const pastBadge = getAppointmentBadgeMeta(past, schedulingMode);

  // Request form
  const [reqClinic, setReqClinic] = useState('');
  const [reqDate, setReqDate] = useState('');
  const [reqReason, setReqReason] = useState('');
  const [reqType, setReqType] = useState('in_person');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
    loadSchedulingMode();
  }, []);

  async function loadData() {
    setLoading(true);
    const res = await fetchAppointments();
    const d = res.data as any;
    setUpcoming(d?.upcoming || []);
    setPast(d?.past || []);
    setLoading(false);
  }

  async function loadSchedulingMode() {
    try {
      const res = await fetchSchedulingMode();
      if (res.ok && res.data) setSchedulingMode(res.data as SchedulingMode);
    } catch {
      /* non-critical -- badge just won't show */
    }
  }

  async function handleRequest() {
    if (!reqClinic || !reqDate || !reqReason) {
      setNotice('All fields are required.');
      return;
    }
    setSubmitting(true);
    setNotice('');
    const res = await requestNewAppointment({
      clinicName: reqClinic,
      preferredDate: reqDate,
      reason: reqReason,
      appointmentType: reqType,
    });
    setSubmitting(false);
    if (res.ok) {
      const pending = (res.data as any)?.pending;
      const target = (res.data as any)?.target;
      setNotice(
        pending
          ? `Request submitted. Clinic confirmation pending${target ? ` (${target})` : ''}.`
          : (res.data as any)?.notice || 'Request submitted.'
      );
      setReqClinic('');
      setReqDate('');
      setReqReason('');
      setView('list');
      loadData();
    } else {
      setNotice('Failed to submit request.');
    }
  }

  async function handleCancel(id: string) {
    const reason = prompt('Reason for cancellation:');
    if (!reason) return;
    const res = await requestAppointmentCancellation(id, reason);
    if (res.ok) {
      const pending = (res.data as any)?.pending;
      const target = (res.data as any)?.target;
      setNotice(
        pending
          ? `Cancellation request submitted. Clinic confirmation pending${target ? ` (${target})` : ''}.`
          : (res.data as any)?.notice || 'Cancellation request submitted.'
      );
      loadData();
    }
  }

  async function handleReschedule(id: string) {
    const pref = prompt("When would you prefer? (e.g., 'Next Monday morning')");
    if (!pref) return;
    const res = await requestAppointmentReschedule(id, pref);
    if (res.ok) {
      const pending = (res.data as any)?.pending;
      const target = (res.data as any)?.target;
      setNotice(
        pending
          ? `Reschedule request submitted. Clinic confirmation pending${target ? ` (${target})` : ''}.`
          : (res.data as any)?.notice || 'Reschedule request submitted.'
      );
      loadData();
    }
  }

  return (
    <div className="container">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>My Appointments</h1>
          <p style={{ color: 'var(--portal-text-muted)', fontSize: '0.875rem' }}>
            Upcoming and past appointments
          </p>
          {schedulingMode && (
            <span
              title={schedulingMode.detail}
              style={{
                display: 'inline-block',
                marginTop: '0.25rem',
                padding: '0.125rem 0.5rem',
                background: schedulingMode.writebackEnabled ? '#dcfce7' : '#fef3c7',
                color: schedulingMode.writebackEnabled ? '#166534' : '#92400e',
                borderRadius: 4,
                fontSize: '0.6875rem',
                fontWeight: 600,
              }}
            >
              {schedulingMode.mode === 'vista_direct'
                ? 'VistA Direct Scheduling'
                : schedulingMode.mode === 'vista_waitlist'
                  ? 'VistA Waitlist Scheduling'
                  : schedulingMode.mode === 'sdes_partial'
                    ? 'SDES Scheduling (Partial)'
                    : 'Request Only (Clinic Confirms)'}
            </span>
          )}
        </div>
        <button
          onClick={() => setView(view === 'list' ? 'request' : 'list')}
          style={{
            padding: '0.375rem 0.75rem',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.8125rem',
          }}
        >
          {view === 'list' ? 'Request Appointment' : 'Back to List'}
        </button>
      </div>

      {notice && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: 4,
            marginBottom: '1rem',
            background: notice.includes('Failed') ? '#fef2f2' : '#dcfce7',
            color: notice.includes('Failed') ? '#dc2626' : '#166534',
            fontSize: '0.8125rem',
          }}
        >
          {notice}
        </div>
      )}

      {view === 'request' ? (
        <div className="card">
          <h3 style={{ margin: '0 0 0.75rem' }}>Request an Appointment</h3>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1rem' }}>
            Submit a request and the clinic will contact you to confirm.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500 }}>Clinic / Department</label>
              <input
                type="text"
                value={reqClinic}
                onChange={(e) => setReqClinic(e.target.value)}
                placeholder="e.g., Primary Care"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500 }}>Visit Type</label>
              <select
                value={reqType}
                onChange={(e) => setReqType(e.target.value)}
                style={inputStyle}
              >
                <option value="in_person">In Person</option>
                <option value="telehealth">Telehealth</option>
                <option value="phone">Phone</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500 }}>Preferred Date</label>
              <input
                type="datetime-local"
                value={reqDate}
                onChange={(e) => setReqDate(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500 }}>Reason for Visit</label>
              <textarea
                value={reqReason}
                onChange={(e) => setReqReason(e.target.value)}
                placeholder="Brief description of why you need this appointment"
                rows={3}
                maxLength={500}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
            <button
              onClick={handleRequest}
              disabled={submitting}
              style={{
                alignSelf: 'flex-end',
                padding: '0.5rem 1.25rem',
                background: submitting ? '#94a3b8' : '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </div>
      ) : loading ? (
        <p style={{ color: '#94a3b8' }}>Loading appointments...</p>
      ) : (
        <div className="grid-2">
          <div className="card">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
              }}
            >
              <h3 style={{ margin: 0 }}>Upcoming ({upcoming.length})</h3>
              <DataSourceBadge source={upcomingBadge.source} label={upcomingBadge.label} />
            </div>
            {upcoming.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No upcoming appointments.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {upcoming.map((a: any) => (
                  <AppointmentCard
                    key={a.id}
                    appt={a}
                    onCancel={() => handleCancel(a.id)}
                    onReschedule={() => handleReschedule(a.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
              }}
            >
              <h3 style={{ margin: 0 }}>Past Visits ({past.length})</h3>
              <DataSourceBadge source={pastBadge.source} label={pastBadge.label} />
            </div>
            {past.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No past appointments.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {past.map((a: any) => (
                  <AppointmentCard key={a.id} appt={a} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.375rem',
  borderRadius: 4,
  border: '1px solid #cbd5e1',
  marginTop: '0.25rem',
};

function AppointmentCard({
  appt,
  onCancel,
  onReschedule,
}: {
  appt: any;
  onCancel?: () => void;
  onReschedule?: () => void;
}) {
  const dt = new Date(appt.scheduledAt);
  const isPast = appt.status === 'completed' || appt.status === 'no_show';
  const statusColors: Record<string, { bg: string; color: string }> = {
    confirmed: { bg: '#dcfce7', color: '#166534' },
    pending_confirmation: { bg: '#fef3c7', color: '#92400e' },
    booked: { bg: '#dbeafe', color: '#1e40af' },
    checked_in: { bg: '#c7d2fe', color: '#3730a3' },
    completed: { bg: '#e0f2fe', color: '#0c4a6e' },
    cancelled: { bg: '#fef2f2', color: '#dc2626' },
    cancel_requested: { bg: '#fef2f2', color: '#c2410c' },
    reschedule_requested: { bg: '#fef3c7', color: '#92400e' },
    no_show: { bg: '#f1f5f9', color: '#64748b' },
    approved: { bg: '#dcfce7', color: '#166534' },
    rejected: { bg: '#fef2f2', color: '#dc2626' },
  };
  const sc = statusColors[appt.status] || { bg: '#f1f5f9', color: '#64748b' };
  const source = getAppointmentSource(appt);
  const sourceLabel =
    source === 'ehr' ? undefined : source === 'local' ? 'Local Schedule' : 'Request Pending';

  return (
    <div
      style={{
        padding: '0.5rem',
        background: '#f8fafc',
        borderRadius: 6,
        border: '1px solid #e2e8f0',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{appt.clinicName}</span>
        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
          <DataSourceBadge source={source} label={sourceLabel} />
          <span
            style={{
              display: 'inline-block',
              padding: '0.125rem 0.375rem',
              borderRadius: 4,
              fontSize: '0.6875rem',
              fontWeight: 600,
              background: sc.bg,
              color: sc.color,
            }}
          >
            {appt.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>
      <div style={{ fontSize: '0.8125rem', color: '#475569' }}>
        {dt.toLocaleDateString()} at{' '}
        {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        {' · '}
        {appt.duration}min · {appt.appointmentType?.replace('_', ' ')}
      </div>
      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>
        {appt.providerName} — {appt.reason}
      </div>
      {appt.status === 'checked_in' && (
        <div
          style={{ fontSize: '0.6875rem', color: '#3730a3', marginTop: '0.25rem', fontWeight: 600 }}
        >
          You are checked in. Please wait to be called.
        </div>
      )}
      {!isPast &&
        onCancel &&
        onReschedule &&
        !['cancelled', 'cancel_requested', 'checked_in', 'completed'].includes(appt.status) && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.375rem' }}>
            <button
              onClick={onReschedule}
              style={{
                fontSize: '0.75rem',
                color: '#2563eb',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Request Reschedule
            </button>
            <button
              onClick={onCancel}
              style={{
                fontSize: '0.75rem',
                color: '#dc2626',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Request Cancel
            </button>
          </div>
        )}
    </div>
  );
}
