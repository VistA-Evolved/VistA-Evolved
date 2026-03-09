'use client';

/**
 * TelehealthPanel — Phase 30
 *
 * Clinician-side telehealth management panel in CPRS chart view.
 * Allows providers to:
 * - View active telehealth rooms for the current patient
 * - Create a new room for a telehealth appointment
 * - Join a video visit
 * - Monitor waiting room status
 * - End a visit
 *
 * No PHI in meeting URLs. Provider adapter is transparent to the UI.
 */

import { useState, useEffect, useCallback } from 'react';
import { csrfHeaders } from '@/lib/csrf';
import { API_BASE } from '@/lib/api-config';

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

interface TelehealthRoom {
  roomId: string;
  appointmentId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

interface WaitingRoomState {
  roomId: string;
  appointmentId: string;
  status: string;
  patientJoinedAt?: string;
  providerJoinedAt?: string;
}

interface RoomStats {
  total: number;
  created: number;
  waiting: number;
  active: number;
  ended: number;
}

interface ProviderHealth {
  provider: string;
  healthy: boolean;
  availableProviders: string[];
  roomStats: RoomStats;
}

interface ChartAppointment {
  id: string;
  dateTime: string;
  clinic: string;
  status: string;
  reason?: string;
  source?: string;
}

/* ------------------------------------------------------------------ */
/* API helper                                                           */
/* ------------------------------------------------------------------ */

async function clinicianFetch<T = unknown>(
  path: string,
  opts: RequestInit = {}
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...csrfHeaders(), ...opts.headers },
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: body || `HTTP ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: 'Network error' };
  }
}

async function fetchChartAppointments(dfn: string): Promise<ChartAppointment[]> {
  try {
    const res = await fetch(`${API_BASE}/vista/cprs/appointments?dfn=${encodeURIComponent(dfn)}`, {
      credentials: 'include',
      headers: { ...csrfHeaders() },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.ok && Array.isArray(data.results) ? (data.results as ChartAppointment[]) : [];
  } catch {
    return [];
  }
}

function isTelehealthAppointment(appt: ChartAppointment): boolean {
  const haystack = `${appt.clinic || ''} ${appt.reason || ''}`.toLowerCase();
  return /telehealth|video|virtual/.test(haystack);
}

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

interface Props {
  dfn: string;
}

export default function TelehealthPanel({ dfn }: Props) {
  const [rooms, setRooms] = useState<TelehealthRoom[]>([]);
  const [roomStats, setRoomStats] = useState<RoomStats | null>(null);
  const [health, setHealth] = useState<ProviderHealth | null>(null);
  const [appointments, setAppointments] = useState<ChartAppointment[]>([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [waitState, setWaitState] = useState<WaitingRoomState | null>(null);
  const launchableAppointments = appointments
    .filter((appt) => isTelehealthAppointment(appt))
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  const selectedAppointment = launchableAppointments.find((appt) => appt.id === selectedAppointmentId) || null;
  const canCreateRoom = Boolean(selectedAppointmentId);

  // Load rooms and health
  const loadData = useCallback(async () => {
    setLoading(true);
    const [roomsRes, healthRes, appointmentData] = await Promise.all([
      clinicianFetch<{ rooms: TelehealthRoom[]; stats: RoomStats }>('/telehealth/rooms'),
      clinicianFetch<ProviderHealth>('/telehealth/health'),
      fetchChartAppointments(dfn),
    ]);
    if (roomsRes.ok && roomsRes.data) setRooms(roomsRes.data.rooms || []);
    if (roomsRes.ok && roomsRes.data) setRoomStats(roomsRes.data.stats || null);
    if (healthRes.ok && healthRes.data) setHealth(healthRes.data);
    setAppointments(Array.isArray(appointmentData) ? appointmentData : []);
    setLoading(false);
  }, [dfn]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Poll waiting state for active room
  useEffect(() => {
    if (!activeRoomId) return;
    const poll = setInterval(async () => {
      const res = await clinicianFetch<{ waiting: WaitingRoomState }>(
        `/telehealth/rooms/${activeRoomId}/waiting`
      );
      if (res.ok && res.data?.waiting) setWaitState(res.data.waiting);
    }, 5000);
    return () => clearInterval(poll);
  }, [activeRoomId]);

  useEffect(() => {
    if (launchableAppointments.length === 0) {
      if (selectedAppointmentId) setSelectedAppointmentId('');
      return;
    }
    const stillExists = launchableAppointments.some((appt) => appt.id === selectedAppointmentId);
    if (!stillExists) {
      setSelectedAppointmentId(launchableAppointments[0].id);
    }
  }, [launchableAppointments, selectedAppointmentId]);

  /* ── Handlers ── */

  const handleCreateRoom = async () => {
    if (!canCreateRoom) {
      setNotice({
        text: 'No launchable telehealth appointment is selected for this patient. Select a telehealth appointment first.',
        type: 'error',
      });
      return;
    }
    setCreating(true);
    setNotice(null);
    const appointmentId = selectedAppointmentId;
    const res = await clinicianFetch<{ room: TelehealthRoom; reused?: boolean }>('/telehealth/rooms', {
      method: 'POST',
      body: JSON.stringify({ appointmentId, patientDfn: dfn }),
    });
    if (res.ok && res.data?.room) {
      setNotice({
        text: res.data.reused
          ? 'An active room already exists for the selected appointment.'
          : 'Room created. Share the appointment link with the patient.',
        type: 'success',
      });
      await loadData();
    } else {
      setNotice({ text: res.error || 'Failed to create room', type: 'error' });
    }
    setCreating(false);
  };

  const handleJoin = async (roomId: string) => {
    const res = await clinicianFetch<{ joinUrl: string }>(`/telehealth/rooms/${roomId}/join`, {
      method: 'POST',
    });
    if (res.ok && res.data?.joinUrl) {
      setJoinUrl(res.data.joinUrl);
      setActiveRoomId(roomId);
    } else {
      setNotice({ text: 'Failed to join room', type: 'error' });
    }
  };

  const handleEnd = async (roomId: string) => {
    await clinicianFetch(`/telehealth/rooms/${roomId}/end`, { method: 'POST' });
    setJoinUrl(null);
    setActiveRoomId(null);
    setWaitState(null);
    setNotice({ text: 'Visit ended.', type: 'success' });
    await loadData();
  };

  const handleLeaveVisit = () => {
    setJoinUrl(null);
    setActiveRoomId(null);
    setWaitState(null);
  };

  /* ── Styles ── */

  const sectionStyle: React.CSSProperties = { marginBottom: '1rem' };
  const cardStyle: React.CSSProperties = {
    padding: '0.75rem',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    marginBottom: '0.5rem',
    background: '#fff',
  };
  const badgeStyle = (color: string): React.CSSProperties => ({
    display: 'inline-block',
    padding: '0.125rem 0.5rem',
    borderRadius: '9999px',
    fontSize: '0.6875rem',
    fontWeight: 600,
    background: color,
    color: '#fff',
  });

  const statusColor = (status: string) => {
    switch (status) {
      case 'created':
        return '#6b7280';
      case 'waiting':
        return '#f59e0b';
      case 'active':
        return '#22c55e';
      case 'ended':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const visibleRoomStats = roomStats || health?.roomStats || null;

  /* ── Visit mode ── */

  if (joinUrl) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.5rem 0.75rem',
            background: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <div>
            <strong>Video Visit</strong>
            {waitState && (
              <span style={{ marginLeft: '0.75rem', fontSize: '0.8125rem', color: '#6b7280' }}>
                Patient: {waitState.patientJoinedAt ? 'Connected' : 'Not joined'}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleLeaveVisit}
              style={{
                padding: '0.25rem 0.75rem',
                fontSize: '0.8125rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              Minimize
            </button>
            {activeRoomId && (
              <button
                onClick={() => handleEnd(activeRoomId)}
                style={{
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.8125rem',
                  border: '1px solid #ef4444',
                  borderRadius: '4px',
                  background: '#fef2f2',
                  color: '#ef4444',
                  cursor: 'pointer',
                }}
              >
                End Visit
              </button>
            )}
          </div>
        </div>
        <iframe
          src={joinUrl}
          allow="camera; microphone; display-capture; autoplay; clipboard-write"
          style={{ flex: 1, width: '100%', minHeight: '400px', border: 'none' }}
          title="Telehealth Video Visit"
        />
      </div>
    );
  }

  /* ── Management mode ── */

  return (
    <div style={{ padding: '1rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Telehealth</h3>
        <button
          onClick={handleCreateRoom}
          disabled={creating || !canCreateRoom}
          title={
            canCreateRoom
              ? 'Create a room for the selected telehealth appointment'
              : 'Select a telehealth appointment to launch a room'
          }
          style={{
            padding: '0.375rem 0.75rem',
            fontSize: '0.8125rem',
            background: canCreateRoom ? '#2563eb' : '#9ca3af',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: creating ? 'wait' : canCreateRoom ? 'pointer' : 'not-allowed',
            opacity: creating || !canCreateRoom ? 0.6 : 1,
          }}
        >
          {creating ? 'Creating...' : 'New Video Visit'}
        </button>
      </div>
      {!canCreateRoom && (
        <p style={{ marginTop: '-0.5rem', marginBottom: '0.75rem', fontSize: '0.8125rem', color: '#6b7280' }}>
          This panel launches visits from real patient appointment records. Select a telehealth appointment below to enable room creation.
        </p>
      )}

      <div style={sectionStyle}>
        <h4 style={{ fontSize: '0.875rem', marginBottom: '0.5rem', color: '#374151' }}>
          Telehealth Appointments
        </h4>
        {loading ? (
          <p style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>Loading appointments...</p>
        ) : launchableAppointments.length === 0 ? (
          <p style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
            No launchable telehealth appointments were found for this patient.
          </p>
        ) : (
          launchableAppointments.map((appt) => {
            const isSelected = appt.id === selectedAppointmentId;
            return (
              <button
                key={appt.id}
                type="button"
                onClick={() => setSelectedAppointmentId(appt.id)}
                style={{
                  ...cardStyle,
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  background: isSelected ? '#eff6ff' : '#fff',
                  border: isSelected ? '1px solid #2563eb' : '1px solid #e5e7eb',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{appt.clinic}</span>
                  <span style={badgeStyle(isSelected ? '#2563eb' : '#6b7280')}>
                    {appt.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  {new Date(appt.dateTime).toLocaleString()} | Ref: {appt.id}
                </div>
                {appt.reason && (
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    Reason: {appt.reason}
                  </div>
                )}
              </button>
            );
          })
        )}
        {selectedAppointment && (
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
            Selected appointment: {selectedAppointment.clinic} at{' '}
            {new Date(selectedAppointment.dateTime).toLocaleString()}
          </div>
        )}
      </div>

      {notice && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            marginBottom: '0.75rem',
            borderRadius: '4px',
            background: notice.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: notice.type === 'success' ? '#166534' : '#991b1b',
            fontSize: '0.8125rem',
          }}
        >
          {notice.text}
        </div>
      )}

      {/* Provider Status */}
      {health && (
        <div style={{ ...sectionStyle }}>
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                Provider: {health.provider}
              </span>
              <span style={badgeStyle(health.healthy ? '#22c55e' : '#ef4444')}>
                {health.healthy ? 'Connected' : 'Unavailable'}
              </span>
            </div>
            {visibleRoomStats && (
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                Created: {visibleRoomStats.created} | Waiting: {visibleRoomStats.waiting} |
                {' '}Active: {visibleRoomStats.active} | Ended: {visibleRoomStats.ended} |
                {' '}Total: {visibleRoomStats.total}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Rooms */}
      <div style={sectionStyle}>
        <h4 style={{ fontSize: '0.875rem', marginBottom: '0.5rem', color: '#374151' }}>
          Active Rooms
        </h4>
        {loading ? (
          <p style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>Loading...</p>
        ) : rooms.length === 0 ? (
          <p style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>No active telehealth rooms.</p>
        ) : (
          rooms.map((room) => (
            <div key={room.roomId} style={cardStyle}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                    {room.roomId.slice(0, 12)}...
                  </span>
                  <span style={{ ...badgeStyle(statusColor(room.status)), marginLeft: '0.5rem' }}>
                    {room.status}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {room.status !== 'ended' && (
                    <>
                      <button
                        onClick={() => handleJoin(room.roomId)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          background: '#2563eb',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        Join
                      </button>
                      <button
                        onClick={() => handleEnd(room.roomId)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          background: '#fef2f2',
                          color: '#ef4444',
                          border: '1px solid #ef4444',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        End
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '0.6875rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                Created: {new Date(room.createdAt).toLocaleTimeString()} | Expires:{' '}
                {new Date(room.expiresAt).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Privacy notice */}
      <div
        style={{
          padding: '0.5rem 0.75rem',
          background: '#f9fafb',
          borderRadius: '4px',
          border: '1px solid #e5e7eb',
          fontSize: '0.6875rem',
          color: '#9ca3af',
        }}
      >
        Recording is OFF by default. No PHI in meeting URLs. Room links auto-expire within 4 hours.
      </div>
    </div>
  );
}
