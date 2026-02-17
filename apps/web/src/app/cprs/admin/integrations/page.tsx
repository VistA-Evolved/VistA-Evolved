'use client';

/**
 * Admin Integrations page — Phase 17F.
 *
 * Displays connector/integration status for the current tenant.
 * Allows admin users to probe connector health.
 * Accessible at /cprs/admin/integrations.
 */

import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/stores/session-context';
import styles from '@/components/cprs/cprs.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001';

interface Connector {
  id: string;
  label: string;
  type: string;
  host: string;
  port: number;
  status: 'connected' | 'disconnected' | 'degraded' | 'unknown';
  lastChecked: string | null;
}

export default function IntegrationsPage() {
  const { user, hasRole } = useSession();
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [probing, setProbing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tenantId = 'default'; // Phase 17: resolved from session

  const fetchConnectors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/integrations/${tenantId}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setConnectors(data.connectors);
      } else {
        setError(data.error || 'Failed to load integrations');
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (hasRole('admin')) fetchConnectors();
    else setLoading(false);
  }, [hasRole, fetchConnectors]);

  async function handleProbe() {
    setProbing(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/integrations/${tenantId}/probe`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        await fetchConnectors(); // Refresh after probe
      } else {
        setError(data.error || 'Probe failed');
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setProbing(false);
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'connected': return '#16a34a';
      case 'disconnected': return '#dc2626';
      case 'degraded': return '#d97706';
      default: return '#6b7280';
    }
  };

  if (!hasRole('admin')) {
    return (
      <div className={styles.shell} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div className={styles.menuBar}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>EHR &mdash; Evolved</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--cprs-text-muted)' }}>Admin &rarr; Integrations</span>
        </div>
        <div style={{ flex: 1, padding: 24 }}>
          <p style={{ color: 'var(--cprs-text-muted)' }}>Access denied. Admin role required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shell} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className={styles.menuBar}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>EHR &mdash; Evolved</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--cprs-text-muted)' }}>Admin &rarr; Integrations</span>
      </div>

      <div style={{ flex: 1, padding: 24, maxWidth: 800, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, margin: 0 }}>Integration Status</h2>
          <button
            className={styles.btn}
            onClick={handleProbe}
            disabled={probing}
            style={{ fontSize: 12 }}
          >
            {probing ? 'Probing...' : 'Probe All'}
          </button>
        </div>

        {error && (
          <p style={{ color: 'var(--cprs-danger)', fontSize: 12, marginBottom: 8 }}>{error}</p>
        )}

        {loading ? (
          <p style={{ fontSize: 12, color: 'var(--cprs-text-muted)' }}>Loading...</p>
        ) : connectors.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--cprs-text-muted)' }}>No integrations configured.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--cprs-border)' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Connector</th>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Type</th>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Host</th>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Port</th>
                <th style={{ textAlign: 'center', padding: '6px 8px' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Last Checked</th>
              </tr>
            </thead>
            <tbody>
              {connectors.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--cprs-border)' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 500 }}>{c.label}</td>
                  <td style={{ padding: '6px 8px' }}>{c.type}</td>
                  <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{c.host}</td>
                  <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{c.port}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#fff',
                      background: statusColor(c.status),
                    }}>
                      {c.status}
                    </span>
                  </td>
                  <td style={{ padding: '6px 8px', color: 'var(--cprs-text-muted)' }}>
                    {c.lastChecked ? new Date(c.lastChecked).toLocaleString() : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
