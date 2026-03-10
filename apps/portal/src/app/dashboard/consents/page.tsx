/**
 * Consent Management -- Phase 140
 *
 * Allows portal users to:
 * - View all consent types (HIPAA, data sharing, research, telehealth, portal terms)
 * - Grant or revoke consent decisions
 * - Track consent history (PG-backed when configured)
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { DataSourceBadge } from '@/components/data-source-badge';
import { API_BASE } from '@/lib/api-config';

interface ConsentItem {
  consentType: string;
  label: string;
  required: boolean;
  status: 'granted' | 'revoked' | 'pending';
  signedAt: string | null;
  revokedAt: string | null;
  version: number;
}

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

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  granted: { bg: '#dcfce7', text: '#166534', label: 'Granted' },
  revoked: { bg: '#fef2f2', text: '#991b1b', label: 'Revoked' },
  pending: { bg: '#fef3c7', text: '#92400e', label: 'Pending' },
};

export default function ConsentsPage() {
  const [loading, setLoading] = useState(true);
  const [consents, setConsents] = useState<ConsentItem[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadConsents = useCallback(() => {
    setLoading(true);
    portalFetch('/portal/consents')
      .then((data: any) => {
        setConsents(data.consents || []);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadConsents();
  }, [loadConsents]);

  const handleUpdate = async (consentType: string, newStatus: 'granted' | 'revoked') => {
    setUpdating(consentType);
    setError(null);
    setSuccess(null);
    try {
      await portalFetch('/portal/consents', {
        method: 'POST',
        body: JSON.stringify({ consentType, status: newStatus }),
      });
      setSuccess(`Consent ${newStatus === 'granted' ? 'granted' : 'revoked'} successfully`);
      loadConsents();
    } catch (err: any) {
      setError(err.message || 'Failed to update consent');
    } finally {
      setUpdating(null);
    }
  };

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
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Consent Management</h1>
          <p style={{ color: 'var(--portal-text-muted)', fontSize: '0.875rem' }}>
            Review and manage your health data consent decisions
          </p>
        </div>
        <DataSourceBadge source="local" label="Portal Managed" />
      </div>

      {error && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: 6,
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            color: '#991b1b',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: 6,
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            color: '#166534',
            fontSize: '0.875rem',
          }}
        >
          {success}
        </div>
      )}

      <div className="card">
        <h3 style={{ margin: '0 0 0.5rem' }}>Your Consents</h3>
        <p style={{ color: 'var(--portal-text-muted)', fontSize: '0.8125rem', margin: '0 0 1rem' }}>
          Required consents must be granted for full portal access. Optional consents can be changed
          at any time.
        </p>

        {loading ? (
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Loading consents...</p>
        ) : consents.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <p>No consent types available</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {consents.map((c) => {
              const statusInfo = STATUS_COLORS[c.status] || STATUS_COLORS.pending;
              return (
                <div
                  key={c.consentType}
                  style={{
                    padding: '0.75rem 1rem',
                    border: '1px solid var(--portal-border, #e2e8f0)',
                    borderRadius: 6,
                    background: '#fff',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{c.label}</span>
                        {c.required && (
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              background: '#dbeafe',
                              color: '#1e40af',
                              padding: '0.125rem 0.375rem',
                              borderRadius: 3,
                              fontWeight: 500,
                            }}
                          >
                            Required
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: '0.75rem',
                            background: statusInfo.bg,
                            color: statusInfo.text,
                            padding: '0.125rem 0.375rem',
                            borderRadius: 3,
                            fontWeight: 500,
                          }}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                      {c.signedAt && (
                        <div
                          style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}
                        >
                          Signed: {new Date(c.signedAt).toLocaleDateString()}
                        </div>
                      )}
                      {c.revokedAt && (
                        <div
                          style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem' }}
                        >
                          Revoked: {new Date(c.revokedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      {c.status !== 'granted' && (
                        <button
                          onClick={() => handleUpdate(c.consentType, 'granted')}
                          disabled={updating === c.consentType}
                          style={{
                            padding: '0.25rem 0.625rem',
                            fontSize: '0.8125rem',
                            background: updating === c.consentType ? '#94a3b8' : '#16a34a',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: updating === c.consentType ? 'not-allowed' : 'pointer',
                          }}
                        >
                          Grant
                        </button>
                      )}
                      {c.status === 'granted' && !c.required && (
                        <button
                          onClick={() => handleUpdate(c.consentType, 'revoked')}
                          disabled={updating === c.consentType}
                          style={{
                            padding: '0.25rem 0.625rem',
                            fontSize: '0.8125rem',
                            background: updating === c.consentType ? '#94a3b8' : '#dc2626',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: updating === c.consentType ? 'not-allowed' : 'pointer',
                          }}
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1rem' }}>
        Consent decisions are securely recorded and audited. Contact your provider for questions
        about consent policies.
      </p>
    </div>
  );
}
