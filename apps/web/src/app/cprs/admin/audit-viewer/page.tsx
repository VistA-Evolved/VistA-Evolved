'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/stores/session-context';
import styles from '@/components/cprs/cprs.module.css';
import { API_BASE } from '@/lib/api-config';


interface AuditEntry {
  seq: number;
  hash: string;
  prevHash: string;
  timestamp: string;
  action: string;
  outcome: string;
  actorId: string;
  actorName: string;
  actorRoles: string[];
  requestId?: string;
  sourceIp?: string;
  tenantId?: string;
  detail?: Record<string, unknown>;
}

interface AuditStats {
  totalEntries: number;
  byAction: Record<string, number>;
  byOutcome: Record<string, number>;
  chainValid: boolean;
  oldestTimestamp: string | null;
  newestTimestamp: string | null;
}

interface ChainVerification {
  valid: boolean;
  totalEntries: number;
  brokenAt?: number;
  error?: string;
}

export default function AuditViewerPage() {
  const router = useRouter();
  const { authenticated, ready, user, hasRole } = useSession();
  const [tab, setTab] = useState<'events' | 'stats' | 'chain' | 'policy'>('events');

  // Events state
  const [events, setEvents] = useState<AuditEntry[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [limit, setLimit] = useState(50);

  // Stats state
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Chain verification state
  const [chainResult, setChainResult] = useState<ChainVerification | null>(null);
  const [chainLoading, setChainLoading] = useState(false);

  // Auth guard
  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/cprs/login');
    }
  }, [ready, authenticated, router]);

  // Require admin or support role
  const isAuthorized = user && (hasRole('admin') || hasRole('support'));

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    setEventsError('');
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.set('actionPrefix', actionFilter);
      if (outcomeFilter) params.set('outcome', outcomeFilter);
      params.set('limit', String(limit));
      const res = await fetch(`${API_BASE}/iam/audit/events?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setEvents(data.events || []);
      } else {
        setEventsError(data.error || 'Failed to load events');
      }
    } catch (err: unknown) {
      setEventsError(`Network error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setEventsLoading(false);
    }
  }, [actionFilter, outcomeFilter, limit]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/iam/audit/stats`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setStats(data.stats);
    } catch {
      // Non-critical
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const verifyChain = useCallback(async () => {
    setChainLoading(true);
    try {
      const res = await fetch(`${API_BASE}/iam/audit/verify`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setChainResult(data.verification);
    } catch {
      setChainResult({ valid: false, totalEntries: 0, error: 'Network error' });
    } finally {
      setChainLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;
    if (tab === 'events') loadEvents();
    if (tab === 'stats') loadStats();
    if (tab === 'chain') verifyChain();
  }, [tab, isAuthorized, loadEvents, loadStats, verifyChain]);

  if (!ready || !authenticated) {
    return (
      <div className={styles.shell} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: 'var(--cprs-text-muted)' }}>Checking session...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className={styles.shell} style={{ padding: 24 }}>
        <h2 style={{ color: '#c00' }}>Access Denied</h2>
        <p>Audit Viewer requires admin or support role.</p>
      </div>
    );
  }

  const outcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'success': return '#2e7d32';
      case 'failure': return '#c62828';
      case 'denied': return '#e65100';
      case 'error': return '#b71c1c';
      default: return '#666';
    }
  };

  return (
    <div className={styles.shell} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className={styles.menuBar}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>EHR &mdash; Evolved</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--cprs-text-muted)' }}>
          Immutable Audit Viewer (Phase 35)
        </span>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--cprs-border)', background: 'var(--cprs-bg)' }}>
        {(['events', 'stats', 'chain', 'policy'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: tab === t ? '2px solid var(--cprs-accent)' : '2px solid transparent',
              background: 'transparent',
              fontWeight: tab === t ? 600 : 400,
              cursor: 'pointer',
              fontSize: 12,
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
        {/* Events tab */}
        {tab === 'events' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <select
                className={styles.formInput}
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                style={{ width: 200 }}
              >
                <option value="">All Actions</option>
                <option value="auth.">Authentication</option>
                <option value="context.">Patient Context</option>
                <option value="rpc.">RPC Calls</option>
                <option value="write.">Write Attempts</option>
                <option value="policy.">Policy Decisions</option>
                <option value="security.">Security Events</option>
                <option value="system.">System Events</option>
              </select>
              <select
                className={styles.formInput}
                value={outcomeFilter}
                onChange={(e) => setOutcomeFilter(e.target.value)}
                style={{ width: 140 }}
              >
                <option value="">All Outcomes</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
                <option value="denied">Denied</option>
                <option value="error">Error</option>
              </select>
              <select
                className={styles.formInput}
                value={String(limit)}
                onChange={(e) => setLimit(Number(e.target.value))}
                style={{ width: 100 }}
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
              </select>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={loadEvents} disabled={eventsLoading}>
                {eventsLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {eventsError && <p style={{ color: '#c00', fontSize: 12 }}>{eventsError}</p>}

            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--cprs-border)', textAlign: 'left' }}>
                  <th style={{ padding: '4px 8px' }}>Seq</th>
                  <th style={{ padding: '4px 8px' }}>Time</th>
                  <th style={{ padding: '4px 8px' }}>Action</th>
                  <th style={{ padding: '4px 8px' }}>Outcome</th>
                  <th style={{ padding: '4px 8px' }}>Actor</th>
                  <th style={{ padding: '4px 8px' }}>Roles</th>
                  <th style={{ padding: '4px 8px' }}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.seq} style={{ borderBottom: '1px solid var(--cprs-border)' }}>
                    <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>{e.seq}</td>
                    <td style={{ padding: '4px 8px' }}>{new Date(e.timestamp).toLocaleString()}</td>
                    <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>{e.action}</td>
                    <td style={{ padding: '4px 8px', color: outcomeColor(e.outcome), fontWeight: 600 }}>{e.outcome}</td>
                    <td style={{ padding: '4px 8px' }}>{e.actorId}</td>
                    <td style={{ padding: '4px 8px', fontSize: 10 }}>{e.actorRoles?.join(', ')}</td>
                    <td style={{ padding: '4px 8px', fontSize: 10, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.detail ? JSON.stringify(e.detail) : '-'}
                    </td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 16, textAlign: 'center', color: '#888' }}>No events found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Stats tab */}
        {tab === 'stats' && (
          <div>
            {statsLoading ? (
              <p>Loading statistics...</p>
            ) : stats ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ border: '1px solid var(--cprs-border)', padding: 12, borderRadius: 4 }}>
                  <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>Overview</h3>
                  <p style={{ fontSize: 12 }}>Total entries: <strong>{stats.totalEntries}</strong></p>
                  <p style={{ fontSize: 12 }}>
                    Chain integrity: <strong style={{ color: stats.chainValid ? '#2e7d32' : '#c00' }}>
                      {stats.chainValid ? 'VALID' : 'BROKEN'}
                    </strong>
                  </p>
                  <p style={{ fontSize: 12 }}>Oldest: {stats.oldestTimestamp ? new Date(stats.oldestTimestamp).toLocaleString() : 'N/A'}</p>
                  <p style={{ fontSize: 12 }}>Newest: {stats.newestTimestamp ? new Date(stats.newestTimestamp).toLocaleString() : 'N/A'}</p>
                </div>
                <div style={{ border: '1px solid var(--cprs-border)', padding: 12, borderRadius: 4 }}>
                  <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>By Outcome</h3>
                  {Object.entries(stats.byOutcome).map(([outcome, count]) => (
                    <p key={outcome} style={{ fontSize: 12 }}>
                      <span style={{ color: outcomeColor(outcome), fontWeight: 600 }}>{outcome}</span>: {count}
                    </p>
                  ))}
                </div>
                <div style={{ border: '1px solid var(--cprs-border)', padding: 12, borderRadius: 4, gridColumn: '1 / -1' }}>
                  <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>By Action</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 4 }}>
                    {Object.entries(stats.byAction).sort((a, b) => b[1] - a[1]).map(([action, count]) => (
                      <p key={action} style={{ fontSize: 11, fontFamily: 'monospace' }}>
                        {action}: <strong>{count}</strong>
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p>No statistics available</p>
            )}
          </div>
        )}

        {/* Chain verification tab */}
        {tab === 'chain' && (
          <div>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={verifyChain} disabled={chainLoading} style={{ marginBottom: 12 }}>
              {chainLoading ? 'Verifying...' : 'Verify Hash Chain'}
            </button>
            {chainResult && (
              <div style={{
                border: `2px solid ${chainResult.valid ? '#2e7d32' : '#c00'}`,
                padding: 16,
                borderRadius: 8,
                background: chainResult.valid ? '#e8f5e9' : '#ffebee',
              }}>
                <h3 style={{ fontSize: 16, color: chainResult.valid ? '#2e7d32' : '#c00', margin: '0 0 8px' }}>
                  {chainResult.valid ? 'CHAIN VALID' : 'CHAIN INTEGRITY FAILURE'}
                </h3>
                <p style={{ fontSize: 13 }}>Total entries: {chainResult.totalEntries}</p>
                {chainResult.brokenAt && (
                  <p style={{ fontSize: 13, color: '#c00' }}>Broken at sequence: {chainResult.brokenAt}</p>
                )}
                {chainResult.error && (
                  <p style={{ fontSize: 13, color: '#c00' }}>{chainResult.error}</p>
                )}
                <p style={{ fontSize: 11, color: '#666', marginTop: 8 }}>
                  Each audit entry includes a SHA-256 hash of the previous entry.
                  A valid chain means no entries have been tampered with, deleted, or reordered.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Policy tab */}
        {tab === 'policy' && (
          <div>
            <h3 style={{ fontSize: 14, margin: '0 0 12px' }}>Policy Engine Status (Phase 35)</h3>
            <div style={{ border: '1px solid var(--cprs-border)', padding: 12, borderRadius: 4, marginBottom: 16 }}>
              <p style={{ fontSize: 12, margin: '0 0 4px' }}>Engine: <strong>In-process (OPA-compatible)</strong></p>
              <p style={{ fontSize: 12, margin: '0 0 4px' }}>Default behavior: <strong>DENY</strong></p>
              <p style={{ fontSize: 12, margin: '0 0 4px' }}>OIDC Provider: <strong>Keycloak</strong></p>
              <p style={{ fontSize: 12, margin: '0 0 4px' }}>Authorization model: <strong>RBAC + ABAC</strong></p>
              <p style={{ fontSize: 12, margin: 0 }}>Break-glass: <strong>Scaffold ready</strong></p>
            </div>

            <h4 style={{ fontSize: 13, margin: '0 0 8px' }}>Role Definitions</h4>
            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--cprs-border)', textAlign: 'left' }}>
                  <th style={{ padding: '4px 8px' }}>Role</th>
                  <th style={{ padding: '4px 8px' }}>Description</th>
                  <th style={{ padding: '4px 8px' }}>Clinical Write</th>
                  <th style={{ padding: '4px 8px' }}>Admin</th>
                  <th style={{ padding: '4px 8px' }}>Break-Glass</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { role: 'provider', desc: 'Full clinical access', write: true, admin: false, bg: true },
                  { role: 'nurse', desc: 'Vitals, notes, read', write: true, admin: false, bg: true },
                  { role: 'pharmacist', desc: 'Medications, read', write: true, admin: false, bg: true },
                  { role: 'clerk', desc: 'Limited read access', write: false, admin: false, bg: false },
                  { role: 'admin', desc: 'Unrestricted', write: true, admin: true, bg: true },
                  { role: 'patient', desc: 'Own data only', write: false, admin: false, bg: false },
                  { role: 'support', desc: 'Audit + health', write: false, admin: false, bg: false },
                ].map((r) => (
                  <tr key={r.role} style={{ borderBottom: '1px solid var(--cprs-border)' }}>
                    <td style={{ padding: '4px 8px', fontWeight: 600 }}>{r.role}</td>
                    <td style={{ padding: '4px 8px' }}>{r.desc}</td>
                    <td style={{ padding: '4px 8px', color: r.write ? '#2e7d32' : '#c00' }}>{r.write ? 'Yes' : 'No'}</td>
                    <td style={{ padding: '4px 8px', color: r.admin ? '#2e7d32' : '#c00' }}>{r.admin ? 'Yes' : 'No'}</td>
                    <td style={{ padding: '4px 8px', color: r.bg ? '#2e7d32' : '#888' }}>{r.bg ? 'Eligible' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
