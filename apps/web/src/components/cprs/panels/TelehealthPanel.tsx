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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
      headers: { 'Content-Type': 'application/json', ...opts.headers },
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

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

interface Props {
  dfn: string;
}

export default function TelehealthPanel({ dfn }: Props) {
  const [rooms, setRooms] = useState<TelehealthRoom[]>([]);
  const [health, setHealth] = useState<ProviderHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [waitState, setWaitState] = useState<WaitingRoomState | null>(null);

  // Load rooms and health
  const loadData = useCallback(async () => {
    setLoading(true);
    const [roomsRes, healthRes] = await Promise.all([
      clinicianFetch<{ rooms: TelehealthRoom[]; stats: RoomStats }>('/telehealth/rooms'),
      clinicianFetch<ProviderHealth>('/telehealth/health'),
    ]);
    if (roomsRes.ok && roomsRes.data) setRooms(roomsRes.data.rooms || []);
    if (healthRes.ok && healthRes.data) setHealth(healthRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Poll waiting state for active room
  useEffect(() => {
    if (!activeRoomId) return;
    const poll = setInterval(async () => {
      const res = await clinicianFetch<{ waiting: WaitingRoomState }>(`/telehealth/rooms/${activeRoomId}/waiting`);
      if (res.ok && res.data?.waiting) setWaitState(res.data.waiting);
    }, 5000);
    return () => clearInterval(poll);
  }, [activeRoomId]);

  /* ── Handlers ── */

  const handleCreateRoom = async () => {
    setCreating(true);
    setNotice(null);
    // Use DFN as a placeholder appointment ID for demo
    const appointmentId = `demo-${dfn}-${Date.now()}`;
    const res = await clinicianFetch<{ room: TelehealthRoom }>('/telehealth/rooms', {
      method: 'POST',
      body: JSON.stringify({ appointmentId }),
    });
    if (res.ok && res.data?.room) {
      setNotice({ text: 'Room created. Share the appointment link with the patient.', type: 'success' });
      await loadData();
    } else {
      setNotice({ text: res.error || 'Failed to create room', type: 'error' });
    }
    setCreating(false);
  };

  const handleJoin = async (roomId: string) => {
    const res = await clinicianFetch<{ joinUrl: string }>(`/telehealth/rooms/${roomId}/join`, { method: 'POST' });
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
      case 'created': return '#6b7280';
      case 'waiting': return '#f59e0b';
      case 'active': return '#22c55e';
      case 'ended': return '#ef4444';
      default: return '#6b7280';
    }
  };

  /* ── Visit mode ── */

  if (joinUrl) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.5rem 0.75rem',
          background: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
        }}>
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
              style={{ padding: '0.25rem 0.75rem', fontSize: '0.8125rem', border: '1px solid #d1d5db', borderRadius: '4px', background: '#fff', cursor: 'pointer' }}
            >
              Minimize
            </button>
            {activeRoomId && (
              <button
                onClick={() => handleEnd(activeRoomId)}
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.8125rem', border: '1px solid #ef4444', borderRadius: '4px', background: '#fef2f2', color: '#ef4444', cursor: 'pointer' }}
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Telehealth</h3>
        <button
          onClick={handleCreateRoom}
          disabled={creating}
          style={{
            padding: '0.375rem 0.75rem',
            fontSize: '0.8125rem',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: creating ? 'wait' : 'pointer',
            opacity: creating ? 0.6 : 1,
          }}
        >
          {creating ? 'Creating...' : 'New Video Visit'}
        </button>
      </div>

      {notice && (
        <div style={{
          padding: '0.5rem 0.75rem',
          marginBottom: '0.75rem',
          borderRadius: '4px',
          background: notice.type === 'success' ? '#f0fdf4' : '#fef2f2',
          color: notice.type === 'success' ? '#166534' : '#991b1b',
          fontSize: '0.8125rem',
        }}>
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
            {health.roomStats && (
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                Active: {health.roomStats.active} | Waiting: {health.roomStats.waiting} | Total: {health.roomStats.total}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Rooms */}
      <div style={sectionStyle}>
        <h4 style={{ fontSize: '0.875rem', marginBottom: '0.5rem', color: '#374151' }}>Active Rooms</h4>
        {loading ? (
          <p style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>Loading...</p>
        ) : rooms.length === 0 ? (
          <p style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>No active telehealth rooms.</p>
        ) : (
          rooms.map((room) => (
            <div key={room.roomId} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                Created: {new Date(room.createdAt).toLocaleTimeString()} |
                Expires: {new Date(room.expiresAt).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Privacy notice */}
      <div style={{
        padding: '0.5rem 0.75rem',
        background: '#f9fafb',
        borderRadius: '4px',
        border: '1px solid #e5e7eb',
        fontSize: '0.6875rem',
        color: '#9ca3af',
      }}>
        Recording is OFF by default. No PHI in meeting URLs.
        Room links auto-expire within 4 hours.
      </div>
    </div>
  );
}
