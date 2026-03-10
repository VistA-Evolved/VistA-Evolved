/**
 * Activity Log Page -- Phase 29
 *
 * Patient-visible log of all access events (who viewed, when, what).
 * Supports filtering by event type and date range.
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

interface AccessLogEntry {
  id: string;
  userId: string;
  actorName: string;
  isProxy: boolean;
  eventType: string;
  description: string;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, string>;
  timestamp: string;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  sign_in: 'Sign In',
  sign_out: 'Sign Out',
  view_record_section: 'View Record',
  download_record: 'Download',
  export_record: 'Export',
  share_code_create: 'Share Code Created',
  share_code_redeem: 'Share Code Used',
  proxy_switch: 'Proxy Switch',
  proxy_access: 'Proxy Access',
  proxy_invite_sent: 'Invite Sent',
  proxy_invite_accepted: 'Invite Accepted',
  proxy_invite_declined: 'Invite Declined',
  message_send: 'Message Sent',
  message_read: 'Message Read',
  appointment_schedule: 'Appointment',
  refill_request: 'Refill Request',
  password_change: 'Password Changed',
  mfa_change: 'MFA Changed',
  device_revoke: 'Device Revoked',
  consent_update: 'Consent Updated',
  account_update: 'Account Updated',
};

const EVENT_ICONS: Record<string, string> = {
  sign_in: '🔑',
  sign_out: '🚪',
  view_record_section: '📋',
  download_record: '📥',
  export_record: '📤',
  share_code_create: '🔗',
  share_code_redeem: '✅',
  proxy_switch: '👥',
  proxy_access: '👤',
  proxy_invite_sent: '📨',
  proxy_invite_accepted: '✅',
  proxy_invite_declined: '❌',
  message_send: '💬',
  message_read: '📖',
  appointment_schedule: '📅',
  refill_request: '💊',
  password_change: '🔐',
  mfa_change: '🛡️',
  device_revoke: '📱',
  consent_update: '📝',
  account_update: '⚙️',
};

const FILTER_OPTIONS = [
  { value: '', label: 'All Events' },
  { value: 'sign_in', label: 'Sign Ins' },
  { value: 'view_record_section', label: 'Record Views' },
  { value: 'proxy_access', label: 'Proxy Access' },
  { value: 'export_record', label: 'Exports / Downloads' },
  { value: 'password_change', label: 'Account Changes' },
];

const PAGE_SIZE = 25;

export default function ActivityPage() {
  const [entries, setEntries] = useState<AccessLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [eventFilter, setEventFilter] = useState('');
  const [sinceFilter, setSinceFilter] = useState('');

  const loadEntries = useCallback(
    async (appendMode = false) => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('limit', String(PAGE_SIZE));
        params.set('offset', String(appendMode ? offset : 0));
        if (eventFilter) params.set('eventType', eventFilter);
        if (sinceFilter) params.set('since', new Date(sinceFilter).toISOString());

        const res = await portalFetch(`/portal/iam/activity?${params.toString()}`);
        const newEntries: AccessLogEntry[] = res.entries || [];

        if (appendMode) {
          setEntries((prev) => [...prev, ...newEntries]);
        } else {
          setEntries(newEntries);
          setOffset(0);
        }
        setHasMore(newEntries.length === PAGE_SIZE);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [eventFilter, sinceFilter, offset]
  );

  // Initial load + filter changes
  useEffect(() => {
    setOffset(0);
    loadEntries(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventFilter, sinceFilter]);

  const loadMore = () => {
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
    loadEntries(true);
  };

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return (
      d.toLocaleDateString() +
      ' ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  };

  return (
    <div className="container">
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Activity Log</h1>
      <p
        style={{ color: 'var(--portal-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}
      >
        See who accessed your health records and when
      </p>

      {error && (
        <div className="card" style={{ borderLeft: '3px solid #e53e3e', marginBottom: '1rem' }}>
          <p style={{ color: '#e53e3e', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label
              style={{
                fontSize: '0.75rem',
                display: 'block',
                marginBottom: '0.25rem',
                color: 'var(--portal-text-muted)',
              }}
            >
              Event Type
            </label>
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              {FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{
                fontSize: '0.75rem',
                display: 'block',
                marginBottom: '0.25rem',
                color: 'var(--portal-text-muted)',
              }}
            >
              Since
            </label>
            <input
              type="date"
              value={sinceFilter}
              onChange={(e) => setSinceFilter(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
          {(eventFilter || sinceFilter) && (
            <button
              onClick={() => {
                setEventFilter('');
                setSinceFilter('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#3182ce',
                fontSize: '0.8125rem',
                cursor: 'pointer',
                alignSelf: 'flex-end',
                padding: '0.5rem 0',
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Entries */}
      <div className="card">
        {entries.length === 0 && !loading ? (
          <p style={{ color: 'var(--portal-text-muted)', textAlign: 'center', padding: '2rem 0' }}>
            No activity found{eventFilter || sinceFilter ? ' for the selected filters' : ''}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {entries.map((entry, idx) => (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  padding: '0.75rem 0',
                  borderBottom: idx < entries.length - 1 ? '1px solid #eee' : 'none',
                }}
              >
                <span
                  style={{ fontSize: '1.25rem', width: '2rem', textAlign: 'center', flexShrink: 0 }}
                >
                  {EVENT_ICONS[entry.eventType] || '📌'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      gap: '0.5rem',
                    }}
                  >
                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500 }}>
                      {EVENT_TYPE_LABELS[entry.eventType] || entry.eventType}
                      {entry.isProxy && (
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            background: '#fef3c7',
                            color: '#92400e',
                            padding: '0.0625rem 0.375rem',
                            borderRadius: '8px',
                            marginLeft: '0.375rem',
                          }}
                        >
                          Proxy
                        </span>
                      )}
                    </p>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--portal-text-muted)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: '0.125rem 0 0',
                      fontSize: '0.8125rem',
                      color: 'var(--portal-text-muted)',
                    }}
                  >
                    {entry.description}
                  </p>
                  <p
                    style={{
                      margin: '0.125rem 0 0',
                      fontSize: '0.6875rem',
                      color: 'var(--portal-text-muted)',
                    }}
                  >
                    {entry.actorName}
                    {entry.ipAddress ? ` - ${entry.ipAddress}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {hasMore && entries.length > 0 && (
          <div style={{ textAlign: 'center', paddingTop: '1rem' }}>
            <button
              onClick={loadMore}
              disabled={loading}
              style={{
                fontSize: '0.875rem',
                color: '#3182ce',
                background: 'none',
                border: '1px solid #3182ce',
                borderRadius: '4px',
                padding: '0.375rem 1rem',
                cursor: 'pointer',
              }}
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
