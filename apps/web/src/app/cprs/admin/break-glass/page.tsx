'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/stores/session-context';
import styles from '@/components/cprs/cprs.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface BreakGlassSession {
  id: string;
  requesterDuz: string;
  requesterName: string;
  requesterRole: string;
  targetModule: string;
  targetPermission: string;
  patientDfn: string | null;
  reason: string;
  tenantId: string;
  status: 'pending' | 'active' | 'expired' | 'revoked' | 'denied';
  requestedAt: number;
  activatedAt: number | null;
  expiresAt: number | null;
  revokedAt: number | null;
  approverDuz: string | null;
  approverName: string | null;
  revokerDuz: string | null;
  revokerName: string | null;
  sourceIp: string;
}

interface BreakGlassStats {
  total: number;
  byStatus: Record<string, number>;
  activeCount: number;
  pendingCount: number;
}

interface IamPosture {
  authMode: {
    mode: string;
    runtimeMode: string;
    oidcConfigured: boolean;
    compliant: boolean;
  };
  roleMapping: {
    mappingCount: number;
    isCustom: boolean;
    fallbackRole: string;
  };
  breakGlass: BreakGlassStats;
}

/* ------------------------------------------------------------------ */
/* Helper: fetch with credentials                                      */
/* ------------------------------------------------------------------ */

async function apiFetch(path: string, options?: RequestInit) {
  const csrfToken = typeof window !== 'undefined'
    ? (window as any).__csrfToken || ''
    : '';
  return fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
      ...((options?.headers as Record<string, string>) || {}),
    },
    ...options,
  });
}

/* ------------------------------------------------------------------ */
/* Status badge                                                        */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: '#f59e0b',
    active: '#22c55e',
    expired: '#6b7280',
    revoked: '#ef4444',
    denied: '#dc2626',
  };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 12,
      fontWeight: 600,
      color: '#fff',
      backgroundColor: colors[status] || '#6b7280',
    }}>
      {status.toUpperCase()}
    </span>
  );
}

/* ================================================================== */
/* Main Page Component                                                 */
/* ================================================================== */

export default function BreakGlassPage() {
  const router = useRouter();
  const { authenticated, ready, user, hasRole } = useSession();
  const [tab, setTab] = useState<'sessions' | 'posture' | 'request'>('sessions');

  // Sessions state
  const [sessions, setSessions] = useState<BreakGlassSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState('');

  // Posture state
  const [posture, setPosture] = useState<IamPosture | null>(null);
  const [postureLoading, setPostureLoading] = useState(false);

  // Request form state
  const [reqModule, setReqModule] = useState('');
  const [reqPermission, setReqPermission] = useState('');
  const [reqReason, setReqReason] = useState('');
  const [reqPatientDfn, setReqPatientDfn] = useState('');
  const [reqSubmitting, setReqSubmitting] = useState(false);
  const [reqResult, setReqResult] = useState('');

  // Action feedback
  const [actionMsg, setActionMsg] = useState('');

  /* ---------------------------------------------------------------- */
  /* Auth guard                                                        */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (ready && !authenticated) router.push('/');
  }, [ready, authenticated, router]);

  /* ---------------------------------------------------------------- */
  /* Data loading                                                      */
  /* ---------------------------------------------------------------- */

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError('');
    try {
      const res = await apiFetch('/admin/break-glass/active');
      const data = await res.json();
      if (data.ok) {
        setSessions(data.sessions || []);
      } else {
        setSessionsError(data.error || 'Failed to load sessions');
      }
    } catch (e: any) {
      setSessionsError(e.message);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const loadPosture = useCallback(async () => {
    setPostureLoading(true);
    try {
      const res = await apiFetch('/admin/iam/posture');
      const data = await res.json();
      if (data.ok) setPosture(data);
    } catch { /* ignore */ }
    finally { setPostureLoading(false); }
  }, []);

  useEffect(() => {
    if (authenticated && hasRole?.('admin')) {
      loadSessions();
      loadPosture();
    }
  }, [authenticated, hasRole, loadSessions, loadPosture]);

  /* ---------------------------------------------------------------- */
  /* Actions                                                           */
  /* ---------------------------------------------------------------- */

  async function handleApprove(sessionId: string) {
    setActionMsg('');
    try {
      const res = await apiFetch('/admin/break-glass/approve', {
        method: 'POST',
        body: JSON.stringify({ sessionId, ttlMinutes: 30 }),
      });
      const data = await res.json();
      setActionMsg(data.ok ? 'Approved' : (data.error || 'Failed'));
      loadSessions();
    } catch (e: any) {
      setActionMsg(e.message);
    }
  }

  async function handleDeny(sessionId: string) {
    setActionMsg('');
    try {
      const res = await apiFetch('/admin/break-glass/deny', {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      setActionMsg(data.ok ? 'Denied' : (data.error || 'Failed'));
      loadSessions();
    } catch (e: any) {
      setActionMsg(e.message);
    }
  }

  async function handleRevoke(sessionId: string) {
    setActionMsg('');
    try {
      const res = await apiFetch('/admin/break-glass/revoke', {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      setActionMsg(data.ok ? 'Revoked' : (data.error || 'Failed'));
      loadSessions();
    } catch (e: any) {
      setActionMsg(e.message);
    }
  }

  async function handleRequest() {
    setReqSubmitting(true);
    setReqResult('');
    try {
      const res = await apiFetch('/admin/break-glass/request', {
        method: 'POST',
        body: JSON.stringify({
          targetModule: reqModule,
          targetPermission: reqPermission,
          reason: reqReason,
          patientDfn: reqPatientDfn || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setReqResult(`Request created: ${data.session?.id}`);
        setReqModule('');
        setReqPermission('');
        setReqReason('');
        setReqPatientDfn('');
        loadSessions();
      } else {
        setReqResult(data.error || 'Failed');
      }
    } catch (e: any) {
      setReqResult(e.message);
    } finally {
      setReqSubmitting(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Render guards                                                     */
  /* ---------------------------------------------------------------- */

  if (!ready) return <div className={styles.panel}>Loading...</div>;
  if (!authenticated) return null;
  if (!hasRole?.('admin')) {
    return (
      <div className={styles.panel}>
        <h2>Enterprise Break-Glass Management</h2>
        <p style={{ color: '#ef4444' }}>Admin role required.</p>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div className={styles.panel} style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 8 }}>Enterprise Break-Glass Management</h2>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
        Phase 141 — Manage break-glass access requests, approvals, and revocations.
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #333' }}>
        {(['sessions', 'posture', 'request'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 16px',
              background: tab === t ? '#1a1a2e' : 'transparent',
              color: tab === t ? '#60a5fa' : '#aaa',
              border: 'none',
              borderBottom: tab === t ? '2px solid #60a5fa' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: tab === t ? 600 : 400,
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {actionMsg && (
        <div style={{ padding: 8, marginBottom: 12, background: '#1e293b', borderRadius: 4, fontSize: 13 }}>
          {actionMsg}
        </div>
      )}

      {/* Sessions Tab */}
      {tab === 'sessions' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Break-Glass Sessions</h3>
            <button onClick={loadSessions} style={{ padding: '4px 12px', cursor: 'pointer' }}>
              Refresh
            </button>
          </div>

          {sessionsLoading && <p>Loading...</p>}
          {sessionsError && <p style={{ color: '#ef4444' }}>{sessionsError}</p>}

          {!sessionsLoading && sessions.length === 0 && (
            <p style={{ color: '#888' }}>No break-glass sessions found.</p>
          )}

          {sessions.map((s) => (
            <div
              key={s.id}
              style={{
                border: '1px solid #333',
                borderRadius: 6,
                padding: 12,
                marginBottom: 8,
                background: '#0f172a',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <StatusBadge status={s.status} />
                  <span style={{ marginLeft: 8, fontWeight: 600 }}>{s.requesterName}</span>
                  <span style={{ color: '#888', marginLeft: 8, fontSize: 12 }}>
                    DUZ: {s.requesterDuz} / {s.requesterRole}
                  </span>
                </div>
                <span style={{ color: '#888', fontSize: 12 }}>
                  {new Date(s.requestedAt).toLocaleString()}
                </span>
              </div>

              <div style={{ fontSize: 13, marginBottom: 4 }}>
                <strong>Module:</strong> {s.targetModule} &middot;{' '}
                <strong>Permission:</strong> {s.targetPermission}
                {s.patientDfn && <> &middot; <strong>Patient:</strong> DFN {s.patientDfn}</>}
              </div>

              <div style={{ fontSize: 13, color: '#d1d5db', marginBottom: 8 }}>
                <strong>Reason:</strong> {s.reason}
              </div>

              {s.approverName && (
                <div style={{ fontSize: 12, color: '#888' }}>
                  Approved by: {s.approverName}
                  {s.expiresAt && <> &middot; Expires: {new Date(s.expiresAt).toLocaleString()}</>}
                </div>
              )}

              {s.revokerName && (
                <div style={{ fontSize: 12, color: '#888' }}>
                  {s.status === 'denied' ? 'Denied' : 'Revoked'} by: {s.revokerName}
                </div>
              )}

              {/* Action buttons */}
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                {s.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(s.id)}
                      style={{ padding: '4px 12px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDeny(s.id)}
                      style={{ padding: '4px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                    >
                      Deny
                    </button>
                  </>
                )}
                {s.status === 'active' && (
                  <button
                    onClick={() => handleRevoke(s.id)}
                    style={{ padding: '4px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Posture Tab */}
      {tab === 'posture' && (
        <div>
          <h3>IAM Posture</h3>
          {postureLoading && <p>Loading...</p>}
          {posture && (
            <div style={{ display: 'grid', gap: 12 }}>
              {/* Auth Mode */}
              <div style={{ border: '1px solid #333', borderRadius: 6, padding: 12, background: '#0f172a' }}>
                <h4 style={{ margin: '0 0 8px' }}>Auth Mode</h4>
                <div style={{ fontSize: 13 }}>
                  <div><strong>Mode:</strong> {posture.authMode.mode}</div>
                  <div><strong>Runtime:</strong> {posture.authMode.runtimeMode}</div>
                  <div><strong>OIDC Configured:</strong> {posture.authMode.oidcConfigured ? 'Yes' : 'No'}</div>
                  <div>
                    <strong>Compliant:</strong>{' '}
                    <span style={{ color: posture.authMode.compliant ? '#22c55e' : '#ef4444' }}>
                      {posture.authMode.compliant ? 'YES' : 'NO'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Role Mapping */}
              <div style={{ border: '1px solid #333', borderRadius: 6, padding: 12, background: '#0f172a' }}>
                <h4 style={{ margin: '0 0 8px' }}>Role Mapping</h4>
                <div style={{ fontSize: 13 }}>
                  <div><strong>Mappings:</strong> {posture.roleMapping.mappingCount}</div>
                  <div><strong>Custom:</strong> {posture.roleMapping.isCustom ? 'Yes' : 'No (defaults)'}</div>
                  <div><strong>Fallback Role:</strong> {posture.roleMapping.fallbackRole}</div>
                </div>
              </div>

              {/* Break-Glass Stats */}
              <div style={{ border: '1px solid #333', borderRadius: 6, padding: 12, background: '#0f172a' }}>
                <h4 style={{ margin: '0 0 8px' }}>Break-Glass</h4>
                <div style={{ fontSize: 13 }}>
                  <div><strong>Total Sessions:</strong> {posture.breakGlass.total}</div>
                  <div><strong>Active:</strong> {posture.breakGlass.activeCount}</div>
                  <div><strong>Pending:</strong> {posture.breakGlass.pendingCount}</div>
                  {Object.entries(posture.breakGlass.byStatus).map(([k, v]) => (
                    <div key={k}><strong>{k}:</strong> {v}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Request Tab */}
      {tab === 'request' && (
        <div>
          <h3>Request Break-Glass Access</h3>
          <div style={{ display: 'grid', gap: 12, maxWidth: 500 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Target Module</label>
              <input
                value={reqModule}
                onChange={(e) => setReqModule(e.target.value)}
                placeholder="e.g., imaging, clinical, rcm"
                style={{ width: '100%', padding: 8, background: '#1e293b', border: '1px solid #333', borderRadius: 4, color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Target Permission</label>
              <input
                value={reqPermission}
                onChange={(e) => setReqPermission(e.target.value)}
                placeholder="e.g., imaging_admin, full_access"
                style={{ width: '100%', padding: 8, background: '#1e293b', border: '1px solid #333', borderRadius: 4, color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Patient DFN (optional)</label>
              <input
                value={reqPatientDfn}
                onChange={(e) => setReqPatientDfn(e.target.value)}
                placeholder="e.g., 3"
                style={{ width: '100%', padding: 8, background: '#1e293b', border: '1px solid #333', borderRadius: 4, color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Reason (min 10 characters)</label>
              <textarea
                value={reqReason}
                onChange={(e) => setReqReason(e.target.value)}
                placeholder="Describe the clinical emergency or operational need..."
                rows={3}
                style={{ width: '100%', padding: 8, background: '#1e293b', border: '1px solid #333', borderRadius: 4, color: '#fff', resize: 'vertical' }}
              />
            </div>
            <button
              onClick={handleRequest}
              disabled={reqSubmitting || !reqModule || !reqPermission || reqReason.length < 10}
              style={{
                padding: '8px 16px',
                background: '#f59e0b',
                color: '#000',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 600,
                opacity: reqSubmitting || !reqModule || !reqPermission || reqReason.length < 10 ? 0.5 : 1,
              }}
            >
              {reqSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
            {reqResult && (
              <div style={{ padding: 8, background: '#1e293b', borderRadius: 4, fontSize: 13 }}>
                {reqResult}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
