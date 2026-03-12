'use client';

import { useEffect, useState } from 'react';
import { API_BASE as API } from '@/lib/api-config';
import { csrfHeaders } from '@/lib/csrf';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Plan {
  id: string;
  name: string;
  entityType: string;
  priceMonthly: number;
  currency: string;
  features: string[];
  maxProviders: number;
  trialDays: number;
}

interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd?: string;
  cancelledAt?: string;
  externalId?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UsageCounters {
  api_call: number;
  rpc_call: number;
  physician_active: number;
  patient_record_access: number;
  storage_mb: number;
  fhir_request: number;
  hl7_message: number;
  report_generated: number;
}

interface UsageResponse {
  tenantId: string;
  counters: UsageCounters;
  source: string;
  durable: boolean;
  provider: string;
  note?: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
    ...opts,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }
  return data;
}

function formatDollars(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

type TabId = 'plans' | 'subscription' | 'usage' | 'health';

const TABS: { id: TabId; label: string }[] = [
  { id: 'plans', label: 'Plans' },
  { id: 'subscription', label: 'Subscription' },
  { id: 'usage', label: 'Usage' },
  { id: 'health', label: 'Health' },
];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function BillingPage() {
  const [tab, setTab] = useState<TabId>('plans');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [tenantId, setTenantId] = useState('Loading...');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (tab === 'plans') loadPlans();
    if (tab === 'subscription') loadSubscription();
    if (tab === 'usage') loadUsage();
    if (tab === 'health') loadHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    hydrateTenantId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function syncTenantId(nextTenantId?: string) {
    if (nextTenantId && nextTenantId !== tenantId) {
      setTenantId(nextTenantId);
    }
  }

  async function hydrateTenantId() {
    try {
      const data = await apiFetch('/billing/usage');
      syncTenantId(data.tenantId);
    } catch {
      setTenantId('Unavailable');
    }
  }

  async function loadPlans() {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/billing/plans');
      setPlans(data.plans || []);
    } catch (e: any) {
      setPlans([]);
      setError(e.message || 'Unable to load billing plans.');
    }
    setLoading(false);
  }

  async function loadSubscription() {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/billing/subscription');
      setSubscription(data.subscription || null);
      syncTenantId(data.subscription?.tenantId);
    } catch (e: any) {
      setSubscription(null);
      setError(e.message || 'Unable to load billing subscription.');
    }
    setLoading(false);
  }

  async function loadUsage() {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/billing/usage');
      setUsage(data || null);
      syncTenantId(data.tenantId);
    } catch (e: any) {
      setUsage(null);
      setError(e.message || 'Unable to load billing usage.');
    }
    setLoading(false);
  }

  async function loadHealth() {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/billing/health');
      setHealth(data);
    } catch (e: any) {
      setHealth({ ok: false, error: e.message });
      setError(e.message || 'Unable to load billing health.');
    }
    setLoading(false);
  }

  async function subscribe(planId: string) {
    setMsg('');
    setError('');
    try {
      const data = await apiFetch('/billing/subscribe', {
        method: 'POST',
        body: JSON.stringify({ planId }),
      });
      setMsg(data.ok ? 'Subscribed!' : data.error || 'Failed');
      loadSubscription();
      loadUsage();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function cancelSub() {
    setMsg('');
    setError('');
    try {
      const data = await apiFetch('/billing/cancel', {
        method: 'POST',
      });
      setMsg(data.ok ? 'Cancellation scheduled' : data.error || 'Failed');
      loadSubscription();
    } catch (e: any) {
      setError(e.message);
    }
  }

  /* ---- Render ---- */

  const tabStyle = (id: TabId) => ({
    padding: '8px 16px',
    cursor: 'pointer' as const,
    fontWeight: tab === id ? 600 : 400,
    background: 'transparent',
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderLeftWidth: 0,
    borderBottomWidth: '2px',
    borderBottomStyle: 'solid' as const,
    borderBottomColor: tab === id ? 'var(--accent-primary, #0078d4)' : 'transparent',
    color: tab === id ? 'var(--text-primary, #333)' : 'var(--text-secondary, #666)',
  });

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Billing & Metering</h1>
      <p style={{ color: 'var(--text-secondary, #666)', marginBottom: 16 }}>
        SaaS subscription management, plan configuration, and usage metering.
      </p>

      {/* Tenant selector */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 500, marginBottom: 4 }}>Session Tenant</div>
        <div style={{ fontFamily: 'monospace', fontSize: 13 }}>{tenantId}</div>
        <div style={{ color: 'var(--text-secondary, #666)', fontSize: 13, marginTop: 4 }}>
          Billing routes are session-scoped. This page reflects the currently authenticated tenant.
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #eee', marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t.id} style={tabStyle(t.id)} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {msg && (
        <div
          style={{
            padding: 8,
            marginBottom: 12,
            background: '#e8f5e9',
            borderRadius: 4,
            fontSize: 14,
          }}
        >
          {msg}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: 8,
            marginBottom: 12,
            background: '#ffebee',
            color: '#b71c1c',
            borderRadius: 4,
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {loading && <p style={{ color: '#999' }}>Loading...</p>}

      {/* Plans Tab */}
      {tab === 'plans' && !loading && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 16,
          }}
        >
          {plans.map((p) => (
            <div
              key={p.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: 8,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{p.name}</h3>
              <div
                style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent-primary, #0078d4)' }}
              >
                {p.priceMonthly === 0 ? 'Free' : formatDollars(p.priceMonthly, p.currency)}
                {p.priceMonthly > 0 && <span style={{ fontSize: 14, fontWeight: 400 }}>/mo</span>}
              </div>
              <p style={{ fontSize: 13, color: '#666', margin: 0 }}>{p.entityType.replace(/_/g, ' ')}</p>
              <ul style={{ fontSize: 13, margin: 0, paddingLeft: 16 }}>
                <li>Up to {p.maxProviders.toLocaleString()} providers</li>
                <li>{p.trialDays}-day trial</li>
                <li>{p.features.length} included capabilities</li>
              </ul>
              <div style={{ fontSize: 12, color: '#666' }}>{p.features.join(' • ')}</div>
              <button
                onClick={() => subscribe(p.id)}
                style={{
                  marginTop: 'auto',
                  padding: '8px 16px',
                  background: 'var(--accent-primary, #0078d4)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                Subscribe
              </button>
            </div>
          ))}
          {plans.length === 0 && <p>No plans available.</p>}
        </div>
      )}

      {/* Subscription Tab */}
      {tab === 'subscription' && !loading && (
        <div>
          {subscription ? (
            <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
              <h3 style={{ margin: '0 0 8px' }}>Current Subscription</h3>
              <table style={{ fontSize: 14 }}>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 500, paddingRight: 16 }}>ID</td>
                    <td>{subscription.id}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 500, paddingRight: 16 }}>Plan</td>
                    <td>{subscription.planId}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 500, paddingRight: 16 }}>Tenant</td>
                    <td style={{ fontFamily: 'monospace' }}>{subscription.tenantId}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 500, paddingRight: 16 }}>Status</td>
                    <td>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: subscription.status === 'active' ? '#e8f5e9' : '#fff3e0',
                          color: subscription.status === 'active' ? '#2e7d32' : '#e65100',
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                      >
                        {subscription.status}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 500, paddingRight: 16 }}>Period</td>
                    <td>
                      {new Date(subscription.currentPeriodStart).toLocaleDateString()} -{' '}
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </td>
                  </tr>
                  {subscription.trialEnd && (
                    <tr>
                      <td style={{ fontWeight: 500, paddingRight: 16 }}>Trial End</td>
                      <td>{new Date(subscription.trialEnd).toLocaleDateString()}</td>
                    </tr>
                  )}
                  {subscription.cancelledAt && (
                    <tr>
                      <td style={{ fontWeight: 500, paddingRight: 16 }}>Cancelled</td>
                      <td>{new Date(subscription.cancelledAt).toLocaleString()}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <button
                onClick={cancelSub}
                disabled={subscription.status === 'cancelled'}
                style={{
                  marginTop: 12,
                  padding: '6px 12px',
                  background: subscription.status === 'cancelled' ? '#bdbdbd' : '#d32f2f',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: subscription.status === 'cancelled' ? 'default' : 'pointer',
                }}
              >
                Cancel Subscription
              </button>
            </div>
          ) : (
            <p style={{ color: '#999' }}>
              No subscription for tenant &quot;{tenantId}&quot;. Subscribe from the Plans tab.
            </p>
          )}
        </div>
      )}

      {/* Usage Tab */}
      {tab === 'usage' && !loading && (
        <div>
          {usage ? (
            <div>
              <div style={{ color: 'var(--text-secondary, #666)', fontSize: 13, marginBottom: 12 }}>
                {usage.note || 'Current metering snapshot for the authenticated tenant.'}
              </div>
              <div style={{ color: 'var(--text-secondary, #666)', fontSize: 13, marginBottom: 12 }}>
                Source: {usage.source} • Durable: {usage.durable ? 'yes' : 'no'} • Provider: {usage.provider}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ddd' }}>
                    <th style={{ textAlign: 'left', padding: 8 }}>Meter</th>
                    <th style={{ textAlign: 'right', padding: 8 }}>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(usage.counters).map(([key, val]) => (
                    <tr key={key} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: 8 }}>{key.replace(/_/g, ' ')}</td>
                      <td style={{ textAlign: 'right', padding: 8, fontFamily: 'monospace' }}>
                        {(val as number).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#999' }}>No usage data available for the authenticated tenant.</p>
          )}
        </div>
      )}

      {/* Health Tab */}
      {tab === 'health' && !loading && health && (
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
          <h3 style={{ margin: '0 0 8px' }}>Billing Provider Health</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: health.ok ? '#4caf50' : '#f44336',
                display: 'inline-block',
              }}
            />
            <span style={{ fontWeight: 600 }}>{health.ok ? 'Healthy' : 'Unhealthy'}</span>
          </div>
          <pre
            style={{
              fontSize: 13,
              background: '#f5f5f5',
              padding: 12,
              borderRadius: 4,
              overflow: 'auto',
            }}
          >
            {JSON.stringify(health, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
