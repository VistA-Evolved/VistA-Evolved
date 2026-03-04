/**
 * Account Settings Page — Phase 29
 *
 * Allows portal users to:
 * - View account info
 * - Change password
 * - View/revoke device sessions
 * - Setup MFA (if feature-flagged)
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { API_BASE } from '@/lib/api-config';

async function portalFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

interface DeviceSession {
  id: string;
  deviceType: string;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
  lastActiveAt: string;
  active: boolean;
}

interface AccountSession {
  userId: string;
  displayName: string;
  profiles: { id: string; patientName: string; relationship: string; isSelf: boolean }[];
  mfaEnabled: boolean;
}

export default function AccountPage() {
  const [session, setSession] = useState<AccountSession | null>(null);
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [csrfToken, setCsrfToken] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [sessionRes, devicesRes, csrfRes] = await Promise.all([
        portalFetch('/portal/iam/session'),
        portalFetch('/portal/iam/devices'),
        portalFetch('/portal/iam/csrf-token'),
      ]);
      setSession(sessionRes.session);
      setDevices(devicesRes.devices || []);
      setCsrfToken(csrfRes.csrfToken || '');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePasswordChange = async () => {
    setError('');
    setMessage('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      await portalFetch('/portal/iam/password/change', {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setMessage('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRevokeDevice = async (id: string) => {
    try {
      await portalFetch(`/portal/iam/devices/${id}/revoke`, {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
      });
      setDevices((prev) => prev.filter((d) => d.id !== id));
      setMessage('Device session revoked');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRevokeAll = async () => {
    try {
      const res = await portalFetch('/portal/iam/devices/revoke-all', {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
      });
      setDevices([]);
      setMessage(`${res.revokedCount} device sessions revoked`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading)
    return (
      <div className="container">
        <p>Loading...</p>
      </div>
    );

  return (
    <div className="container">
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Account Settings</h1>
      <p
        style={{ color: 'var(--portal-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}
      >
        Manage your account security and devices
      </p>

      {error && (
        <div className="card" style={{ borderLeft: '3px solid #e53e3e', marginBottom: '1rem' }}>
          <p style={{ color: '#e53e3e', margin: 0 }}>{error}</p>
        </div>
      )}
      {message && (
        <div className="card" style={{ borderLeft: '3px solid #38a169', marginBottom: '1rem' }}>
          <p style={{ color: '#38a169', margin: 0 }}>{message}</p>
        </div>
      )}

      {/* Account Info */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.125rem', marginBottom: '0.75rem' }}>Account Info</h2>
        {session && (
          <div>
            <p>
              <strong>Name:</strong> {session.displayName}
            </p>
            <p>
              <strong>Patient Profiles:</strong> {session.profiles.length}
            </p>
            <p>
              <strong>MFA:</strong> {session.mfaEnabled ? 'Enabled' : 'Not enabled'}
            </p>
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.125rem', marginBottom: '0.75rem' }}>Change Password</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '320px' }}>
          <input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <button
            onClick={handlePasswordChange}
            disabled={!currentPassword || !newPassword || !confirmPassword}
            className="btn-primary"
            style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
          >
            Change Password
          </button>
        </div>
      </div>

      {/* Device Sessions */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
          }}
        >
          <h2 style={{ fontSize: '1.125rem', margin: 0 }}>Active Devices</h2>
          {devices.length > 0 && (
            <button
              onClick={handleRevokeAll}
              style={{
                fontSize: '0.8125rem',
                color: '#e53e3e',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Sign out all devices
            </button>
          )}
        </div>
        {devices.length === 0 ? (
          <p style={{ color: 'var(--portal-text-muted)' }}>No active device sessions</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {devices.map((d) => (
              <div
                key={d.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem',
                  background: 'var(--portal-bg-alt, #f7f7f7)',
                  borderRadius: '4px',
                }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>
                    <strong>{d.deviceType}</strong> - {d.ipAddress}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--portal-text-muted)' }}>
                    Last active: {new Date(d.lastActiveAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleRevokeDevice(d.id)}
                  style={{
                    fontSize: '0.75rem',
                    color: '#e53e3e',
                    background: 'none',
                    border: '1px solid #e53e3e',
                    borderRadius: '4px',
                    padding: '0.25rem 0.5rem',
                    cursor: 'pointer',
                  }}
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
