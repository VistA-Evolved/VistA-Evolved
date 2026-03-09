/**
 * Family Access (Proxy Management) Page — Phase 29
 *
 * Allows portal users to:
 * - View connected patient profiles (self + proxies)
 * - Send proxy invitation to connect to another patient's record
 * - View pending/past invitations
 * - Respond to incoming proxy invitations (accept/decline)
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

interface PatientProfile {
  id: string;
  patientDfn: string;
  patientName: string;
  relationship: string;
  isSelf: boolean;
  accessLevel: string;
  enrolledAt: string;
  verified: boolean;
}

interface ProxyInvitation {
  id: string;
  requestorName: string;
  patientName: string;
  relationship: string;
  requestedAccessLevel: string;
  status: string;
  reason: string;
  createdAt: string;
  expiresAt: string;
  policyResult: { allowed: boolean; blockedRules: string[]; warnings: string[] } | null;
}

const RELATIONSHIPS = [
  { value: 'parent', label: 'Parent' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'caregiver', label: 'Caregiver' },
  { value: 'legal_representative', label: 'Legal Representative' },
  { value: 'power_of_attorney', label: 'Power of Attorney' },
];

export default function ProxyPage() {
  const [profiles, setProfiles] = useState<PatientProfile[]>([]);
  const [sentInvitations, setSentInvitations] = useState<ProxyInvitation[]>([]);
  const [receivedInvitations, setReceivedInvitations] = useState<ProxyInvitation[]>([]);
  const [csrfToken, setCsrfToken] = useState('');
  const [iamAvailable, setIamAvailable] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // New invitation form
  const [showForm, setShowForm] = useState(false);
  const [invitePatientDfn, setInvitePatientDfn] = useState('');
  const [invitePatientName, setInvitePatientName] = useState('');
  const [inviteRelationship, setInviteRelationship] = useState('caregiver');
  const [inviteReason, setInviteReason] = useState('');
  const [inviteAge, setInviteAge] = useState('');

  const loadData = useCallback(async () => {
    try {
      await portalFetch('/portal/iam/session');
      setIamAvailable(true);

      const [profilesRes, sentRes, receivedRes, csrfRes] = await Promise.all([
        portalFetch('/portal/iam/profiles'),
        portalFetch('/portal/iam/proxy/invitations'),
        portalFetch('/portal/iam/proxy/invitations/for-patient').catch(() => ({ invitations: [] })),
        portalFetch('/portal/iam/csrf-token'),
      ]);
      setProfiles(profilesRes.profiles || []);
      setSentInvitations(sentRes.invitations || []);
      setReceivedInvitations(receivedRes.invitations || []);
      setCsrfToken(csrfRes.csrfToken || '');
    } catch (err: any) {
      if (typeof err?.message === 'string' && err.message.includes('Not authenticated')) {
        setIamAvailable(false);
        setError('');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInvite = async () => {
    setError('');
    setMessage('');
    if (!invitePatientDfn || !invitePatientName || !inviteReason) {
      setError('Please fill in all required fields');
      return;
    }
    try {
      await portalFetch('/portal/iam/proxy/invite', {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
        body: JSON.stringify({
          patientDfn: invitePatientDfn,
          patientName: invitePatientName,
          relationship: inviteRelationship,
          accessLevel: 'read_only',
          reason: inviteReason,
          patientAge: inviteAge ? Number(inviteAge) : undefined,
        }),
      });
      setMessage('Proxy invitation sent successfully');
      setShowForm(false);
      setInvitePatientDfn('');
      setInvitePatientName('');
      setInviteReason('');
      setInviteAge('');
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRespond = async (invId: string, response: 'accepted' | 'declined') => {
    setError('');
    setMessage('');
    try {
      await portalFetch(`/portal/iam/proxy/invitations/${invId}/respond`, {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
        body: JSON.stringify({ response }),
      });
      setMessage(`Invitation ${response}`);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCancel = async (invId: string) => {
    setError('');
    try {
      await portalFetch(`/portal/iam/proxy/invitations/${invId}/cancel`, {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
      });
      setMessage('Invitation cancelled');
      loadData();
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
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Family Access</h1>
      <p
        style={{ color: 'var(--portal-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}
      >
        Manage access to family members' health records
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

      {/* Connected Profiles */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.125rem', marginBottom: '0.75rem' }}>Connected Records</h2>
        {!iamAvailable ? (
          <p style={{ color: 'var(--portal-text-muted)' }}>
            Family access is available only after signing in to the portal account system. Your
            patient session is active, but proxy-management features are not currently available in
            this session.
          </p>
        ) : profiles.length === 0 ? (
          <p style={{ color: 'var(--portal-text-muted)' }}>No patient records connected</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {profiles.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem',
                  background: 'var(--portal-bg-alt, #f7f7f7)',
                  borderRadius: '4px',
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{p.patientName}</p>
                  <p
                    style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--portal-text-muted)' }}
                  >
                    {p.isSelf ? 'Your record' : `${p.relationship} - ${p.accessLevel}`}
                    {p.verified && ' (verified)'}
                  </p>
                </div>
                {p.isSelf && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      background: '#ebf4ff',
                      color: '#3182ce',
                      padding: '0.125rem 0.5rem',
                      borderRadius: '12px',
                    }}
                  >
                    Self
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {iamAvailable && (
        <>
          {/* Request Proxy Access */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
              }}
            >
              <h2 style={{ fontSize: '1.125rem', margin: 0 }}>Request Access</h2>
              <button
                onClick={() => setShowForm(!showForm)}
                style={{
                  fontSize: '0.875rem',
                  color: '#3182ce',
                  background: 'none',
                  border: '1px solid #3182ce',
                  borderRadius: '4px',
                  padding: '0.25rem 0.75rem',
                  cursor: 'pointer',
                }}
              >
                {showForm ? 'Cancel' : 'New Request'}
              </button>
            </div>
            {showForm && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  maxWidth: '400px',
                }}
              >
                <input
                  type="text"
                  placeholder="Patient record number"
                  value={invitePatientDfn}
                  onChange={(e) => setInvitePatientDfn(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                />
                <input
                  type="text"
                  placeholder="Patient full name"
                  value={invitePatientName}
                  onChange={(e) => setInvitePatientName(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                />
                <select
                  value={inviteRelationship}
                  onChange={(e) => setInviteRelationship(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  {RELATIONSHIPS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Patient age (optional)"
                  value={inviteAge}
                  onChange={(e) => setInviteAge(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                />
                <textarea
                  placeholder="Reason for access request"
                  value={inviteReason}
                  onChange={(e) => setInviteReason(e.target.value)}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    minHeight: '60px',
                  }}
                />
                <button
                  onClick={handleInvite}
                  disabled={!invitePatientDfn || !invitePatientName || !inviteReason}
                  className="btn-primary"
                  style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
                >
                  Send Request
                </button>
              </div>
            )}
          </div>

          {/* Incoming Invitations */}
          {receivedInvitations.filter((i) => i.status === 'pending').length > 0 && (
            <div className="card" style={{ marginBottom: '1rem', borderLeft: '3px solid #ed8936' }}>
              <h2 style={{ fontSize: '1.125rem', marginBottom: '0.75rem' }}>Pending Requests</h2>
              {receivedInvitations
                .filter((i) => i.status === 'pending')
                .map((inv) => (
                  <div
                    key={inv.id}
                    style={{
                      padding: '0.75rem',
                      background: 'var(--portal-bg-alt, #f7f7f7)',
                      borderRadius: '4px',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <p style={{ margin: '0 0 0.25rem' }}>
                      <strong>{inv.requestorName}</strong> requests <strong>{inv.relationship}</strong>{' '}
                      access
                    </p>
                    <p
                      style={{
                        margin: '0 0 0.5rem',
                        fontSize: '0.8125rem',
                        color: 'var(--portal-text-muted)',
                      }}
                    >
                      Reason: {inv.reason}
                    </p>
                    {inv.policyResult?.warnings?.map((w, i) => (
                      <p
                        key={i}
                        style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', color: '#ed8936' }}
                      >
                        {w}
                      </p>
                    ))}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleRespond(inv.id, 'accepted')}
                        style={{
                          padding: '0.25rem 0.75rem',
                          background: '#38a169',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRespond(inv.id, 'declined')}
                        style={{
                          padding: '0.25rem 0.75rem',
                          background: '#e53e3e',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Sent Invitations History */}
          {sentInvitations.length > 0 && (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.125rem', marginBottom: '0.75rem' }}>Your Requests</h2>
              {sentInvitations.map((inv) => (
                <div
                  key={inv.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem',
                    borderBottom: '1px solid #eee',
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>
                      <strong>{inv.patientName}</strong> ({inv.relationship})
                    </p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--portal-text-muted)' }}>
                      {inv.status} - {new Date(inv.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {inv.status === 'pending' && (
                    <button
                      onClick={() => handleCancel(inv.id)}
                      style={{
                        fontSize: '0.75rem',
                        color: '#e53e3e',
                        background: 'none',
                        border: '1px solid #e53e3e',
                        borderRadius: '4px',
                        padding: '0.125rem 0.5rem',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
