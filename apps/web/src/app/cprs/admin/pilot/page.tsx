'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCsrfToken } from '@/lib/csrf';
import { API_BASE } from '@/lib/api-config';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface SiteConfig {
  id: string;
  name: string;
  code: string;
  status: string;
  environment: string;
  tenantId: string;
  vistaEndpoint: string;
  expectedUsers: number;
  goLiveDate?: string;
  siteContact?: string;
  notes?: string;
  lastPreflightScore?: number;
  createdAt: string;
  updatedAt: string;
}

interface PreflightCheck {
  id: string;
  name: string;
  severity: string;
  status: string;
  message: string;
}

interface PreflightResult {
  siteId: string;
  score: number;
  passed: number;
  failed: number;
  readiness: string;
  checks: PreflightCheck[];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

async function apiFetch(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  return res.json();
}

async function apiPost(path: string, body?: unknown) {
  const csrf = await getCsrfToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (csrf) headers['X-CSRF-Token'] = csrf;
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function PilotPage() {
  const [tab, setTab] = useState<'sites' | 'preflight'>('sites');
  const [sites, setSites] = useState<SiteConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preflight, setPreflight] = useState<PreflightResult | null>(null);
  const [_selectedSiteId, setSelectedSiteId] = useState('');

  // New site form
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newEnv, setNewEnv] = useState('staging');
  const [showForm, setShowForm] = useState(false);

  const loadSites = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/admin/pilot/sites');
      if (data.ok) setSites(data.sites || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  const handleCreateSite = async () => {
    if (!newName || !newCode) return setError('Name and code are required');
    setError('');
    try {
      const data = await apiPost('/admin/pilot/sites', {
        name: newName,
        code: newCode,
        environment: newEnv,
      });
      if (data.ok) {
        setNewName('');
        setNewCode('');
        setShowForm(false);
        loadSites();
      } else {
        setError(data.error || 'Failed to create site');
      }
    } catch {
      setError('Request failed');
    }
  };

  const handleRunPreflight = async (siteId: string) => {
    setLoading(true);
    setPreflight(null);
    setSelectedSiteId(siteId);
    setTab('preflight');
    try {
      const data = await apiPost(`/admin/pilot/sites/${siteId}/preflight`);
      if (data.ok) setPreflight(data.preflight);
      else setError(data.error || 'Preflight failed');
    } catch {
      setError('Request failed');
    }
    setLoading(false);
    loadSites(); // refresh scores
  };

  const TABS = [
    { id: 'sites' as const, label: 'Sites' },
    { id: 'preflight' as const, label: 'Preflight' },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Pilot Hospital Readiness</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid #e5e7eb' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: tab === t.id ? '2px solid #2563eb' : '2px solid transparent',
              fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? '#2563eb' : '#6b7280',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            padding: 12,
            borderRadius: 6,
            marginBottom: 16,
            color: '#991b1b',
          }}
        >
          {error}
        </div>
      )}

      {/* ── Sites tab ──────────────────────────────────────────── */}
      {tab === 'sites' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontWeight: 600 }}>Pilot Sites</h3>
            <button
              onClick={() => setShowForm(!showForm)}
              style={{
                padding: '6px 14px',
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              {showForm ? 'Cancel' : '+ New Site'}
            </button>
          </div>

          {showForm && (
            <div
              style={{
                padding: 16,
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                <label>
                  <span style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Site Name</span>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      border: '1px solid #d1d5db',
                      borderRadius: 4,
                      width: 240,
                    }}
                    placeholder="Manila General Hospital"
                  />
                </label>
                <label>
                  <span style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Code</span>
                  <input
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      border: '1px solid #d1d5db',
                      borderRadius: 4,
                      width: 120,
                    }}
                    placeholder="MGH"
                  />
                </label>
                <label>
                  <span style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
                    Environment
                  </span>
                  <select
                    value={newEnv}
                    onChange={(e) => setNewEnv(e.target.value)}
                    style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4 }}
                  >
                    <option value="sandbox">Sandbox</option>
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                  </select>
                </label>
              </div>
              <button
                onClick={handleCreateSite}
                style={{
                  padding: '8px 20px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Create Site
              </button>
            </div>
          )}

          {loading && <p style={{ color: '#6b7280' }}>Loading...</p>}

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: 8 }}>Name</th>
                <th style={{ padding: 8 }}>Code</th>
                <th style={{ padding: 8 }}>Environment</th>
                <th style={{ padding: 8 }}>Status</th>
                <th style={{ padding: 8 }}>Score</th>
                <th style={{ padding: 8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: 8, fontWeight: 500 }}>{s.name}</td>
                  <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 13 }}>{s.code}</td>
                  <td style={{ padding: 8 }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                        background: s.environment === 'production' ? '#fef3c7' : '#eff6ff',
                        color: s.environment === 'production' ? '#92400e' : '#1d4ed8',
                      }}
                    >
                      {s.environment}
                    </span>
                  </td>
                  <td style={{ padding: 8 }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                        background:
                          s.status === 'ready'
                            ? '#dcfce7'
                            : s.status === 'active'
                              ? '#dbeafe'
                              : '#f3f4f6',
                        color:
                          s.status === 'ready'
                            ? '#166534'
                            : s.status === 'active'
                              ? '#1e40af'
                              : '#374151',
                      }}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td style={{ padding: 8, textAlign: 'right' }}>
                    {s.lastPreflightScore != null ? `${s.lastPreflightScore}%` : '-'}
                  </td>
                  <td style={{ padding: 8 }}>
                    <button
                      onClick={() => handleRunPreflight(s.id)}
                      style={{
                        padding: '4px 10px',
                        background: '#059669',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12,
                      }}
                    >
                      Run Preflight
                    </button>
                  </td>
                </tr>
              ))}
              {sites.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} style={{ padding: 16, textAlign: 'center', color: '#9ca3af' }}>
                    No pilot sites configured
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Preflight tab ──────────────────────────────────────── */}
      {tab === 'preflight' && (
        <div>
          {!preflight && !loading && (
            <p style={{ color: '#6b7280' }}>
              Select a site and run preflight checks from the Sites tab.
            </p>
          )}
          {loading && <p style={{ color: '#6b7280' }}>Running preflight checks...</p>}
          {preflight && (
            <div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                <div
                  style={{
                    padding: 20,
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    textAlign: 'center',
                    minWidth: 120,
                    background:
                      preflight.readiness === 'ready'
                        ? '#dcfce7'
                        : preflight.readiness === 'partial'
                          ? '#fef3c7'
                          : '#fef2f2',
                  }}
                >
                  <div style={{ fontSize: 32, fontWeight: 700 }}>{preflight.score}%</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Readiness Score</div>
                </div>
                <div
                  style={{
                    padding: 20,
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    textAlign: 'center',
                    minWidth: 100,
                  }}
                >
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#166534' }}>
                    {preflight.passed}
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Passed</div>
                </div>
                <div
                  style={{
                    padding: 20,
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    textAlign: 'center',
                    minWidth: 100,
                  }}
                >
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#991b1b' }}>
                    {preflight.failed}
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Failed</div>
                </div>
                <div
                  style={{
                    padding: 20,
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    textAlign: 'center',
                    minWidth: 120,
                  }}
                >
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      color:
                        preflight.readiness === 'ready'
                          ? '#166534'
                          : preflight.readiness === 'partial'
                            ? '#92400e'
                            : '#991b1b',
                    }}
                  >
                    {preflight.readiness}
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Status</div>
                </div>
              </div>

              <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Check Results</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                    <th style={{ padding: 8 }}>Check</th>
                    <th style={{ padding: 8 }}>Severity</th>
                    <th style={{ padding: 8 }}>Status</th>
                    <th style={{ padding: 8 }}>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {preflight.checks.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: 8 }}>{c.name}</td>
                      <td style={{ padding: 8 }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 12,
                            background:
                              c.severity === 'critical'
                                ? '#fef2f2'
                                : c.severity === 'warning'
                                  ? '#fef3c7'
                                  : '#eff6ff',
                            color:
                              c.severity === 'critical'
                                ? '#991b1b'
                                : c.severity === 'warning'
                                  ? '#92400e'
                                  : '#1d4ed8',
                          }}
                        >
                          {c.severity}
                        </span>
                      </td>
                      <td style={{ padding: 8 }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 12,
                            background: c.status === 'pass' ? '#dcfce7' : '#fef2f2',
                            color: c.status === 'pass' ? '#166534' : '#991b1b',
                          }}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td style={{ padding: 8 }}>{c.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
