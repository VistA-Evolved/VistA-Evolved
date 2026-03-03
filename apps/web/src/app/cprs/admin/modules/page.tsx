'use client';

/**
 * Module Marketplace Console -- Phase 51 Enterprise Packaging
 *
 * Admin-only tabbed interface:
 *   - Modules -- list all modules, toggle enable/disable, dependency constraints
 *   - Connectors -- tenant connector configuration
 *   - Jurisdiction -- jurisdiction pack selection
 *   - Status -- marketplace summary statistics
 *
 * Accessible at /cprs/admin/modules. Requires admin session.
 */

import React, { useState, useEffect, useCallback } from 'react';
import styles from '@/components/cprs/cprs.module.css';
import { getCsrfTokenSync, getCsrfToken as fetchCsrfToken } from '@/lib/csrf';
import { API_BASE } from '@/lib/api-config';


type Tab = 'modules' | 'connectors' | 'jurisdiction' | 'status' | 'entitlements' | 'flags' | 'audit';

function getCsrfToken(): string {
  return getCsrfTokenSync();
}

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include', ...opts });
  if (!res.ok && res.headers.get('content-type')?.includes('application/json') === false) {
    return { ok: false, error: `HTTP ${res.status}` };
  }
  return res.json();
}

async function apiPut(path: string, body?: unknown) {
  const token = getCsrfTokenSync() || await fetchCsrfToken();
  return apiFetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function apiPatch(path: string, body?: unknown) {
  const token = getCsrfTokenSync() || await fetchCsrfToken();
  return apiFetch(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function apiPost(path: string, body?: unknown) {
  const token = getCsrfTokenSync() || await fetchCsrfToken();
  return apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
    body: body ? JSON.stringify(body) : undefined,
  });
}

interface ModuleManifest {
  moduleId: string;
  manifest: {
    name: string;
    version: string;
    description: string;
    alwaysEnabled: boolean;
    routePatterns: string[];
    dependencies: string[];
    adapters: string[];
    services: string[];
    permissions: string[];
    dataStores: { id: string; type: string; description: string }[];
    healthCheckEndpoint: string;
  };
  enabled: boolean;
  dependenciesMet: boolean;
  missingDependencies: string[];
}

interface ConnectorConfig {
  type: string;
  name: string;
  enabled: boolean;
  settings: Record<string, string | number | boolean>;
}

interface MarketplaceConfig {
  tenantId: string;
  facilityName: string;
  jurisdiction: string;
  enabledModules: string[];
  connectors: ConnectorConfig[];
  customSettings: Record<string, string | number | boolean>;
  updatedAt: string;
}

interface JurisdictionInfo {
  id: string;
  name: string;
  description: string;
  defaultConnectorCount: number;
}

export default function ModulesPage() {
  const [tab, setTab] = useState<Tab>('modules');
  const [manifests, setManifests] = useState<ModuleManifest[]>([]);
  const [marketplaceConfig, setMarketplaceConfig] = useState<MarketplaceConfig | null>(null);
  const [jurisdictions, setJurisdictions] = useState<JurisdictionInfo[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [mRes, cRes, jRes, sRes] = await Promise.all([
        apiFetch('/api/modules/manifests'),
        apiFetch('/api/marketplace/config'),
        apiFetch('/api/marketplace/jurisdictions'),
        apiFetch('/api/marketplace/summary'),
      ]);
      if (mRes.ok) setManifests(mRes.manifests || []);
      if (cRes.ok) setMarketplaceConfig(cRes.config || null);
      if (jRes.ok) setJurisdictions(jRes.jurisdictions || []);
      if (sRes.ok) setSummary(sRes);
    } catch {
      setError('Failed to load module data');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'modules', label: 'Modules' },
    { id: 'entitlements', label: 'Entitlements' },
    { id: 'flags', label: 'Feature Flags' },
    { id: 'connectors', label: 'Connectors' },
    { id: 'jurisdiction', label: 'Jurisdiction' },
    { id: 'audit', label: 'Audit Log' },
    { id: 'status', label: 'Status' },
  ];

  const toggleModule = async (moduleId: string, currentlyEnabled: boolean) => {
    if (!marketplaceConfig) return;
    setSaving(true);
    setError('');

    let newModules: string[];
    if (currentlyEnabled) {
      newModules = marketplaceConfig.enabledModules.filter(m => m !== moduleId);
    } else {
      newModules = [...marketplaceConfig.enabledModules, moduleId];
    }

    // Always include kernel
    if (!newModules.includes('kernel')) newModules.push('kernel');

    const res = await apiPost('/api/modules/override', {
      tenantId: marketplaceConfig.tenantId,
      modules: newModules,
    });

    if (!res.ok) {
      setError(res.error || 'Failed to toggle module');
      if (res.details) setError(res.details.join('; '));
    } else {
      await load();
    }
    setSaving(false);
  };

  const handleJurisdictionChange = async (jurisdictionId: string) => {
    if (!marketplaceConfig) return;
    setSaving(true);
    setError('');

    const res = await apiPatch('/api/marketplace/jurisdiction', {
      tenantId: marketplaceConfig.tenantId,
      jurisdiction: jurisdictionId,
    });

    if (!res.ok) {
      setError(res.error || 'Failed to change jurisdiction');
    } else {
      await load();
    }
    setSaving(false);
  };

  const toggleConnector = async (index: number) => {
    if (!marketplaceConfig) return;
    setSaving(true);
    setError('');

    const newConnectors = [...marketplaceConfig.connectors];
    newConnectors[index] = { ...newConnectors[index], enabled: !newConnectors[index].enabled };

    const res = await apiPatch('/api/marketplace/connectors', {
      tenantId: marketplaceConfig.tenantId,
      connectors: newConnectors,
    });

    if (!res.ok) {
      setError(res.error || 'Failed to update connectors');
    } else {
      await load();
    }
    setSaving(false);
  };

  return (
    <div className={styles.cprsPage}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #dee2e6', display: 'flex', alignItems: 'center', gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Module Marketplace</h2>
        {marketplaceConfig && (
          <span style={{ fontSize: 11, color: '#198754', fontWeight: 600 }}>
            {marketplaceConfig.enabledModules.length} modules enabled
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6c757d' }}>Phase 51 -- Enterprise Packaging</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #dee2e6', background: '#f8f9fa' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 20px', border: 'none',
              borderBottom: tab === t.id ? '2px solid #0d6efd' : '2px solid transparent',
              background: 'transparent', cursor: 'pointer', fontSize: 13,
              fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? '#0d6efd' : '#495057',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ padding: '8px 24px', background: '#f8d7da', color: '#842029', fontSize: 13 }}>
          {error}
          <button onClick={() => setError('')} style={{ marginLeft: 12, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>x</button>
        </div>
      )}

      {/* Tab content */}
      <div style={{ padding: '16px 24px', overflow: 'auto', flex: 1 }}>
        {tab === 'modules' && <ModulesTab manifests={manifests} onToggle={toggleModule} saving={saving} expanded={expandedModule} onExpand={setExpandedModule} />}
        {tab === 'entitlements' && <EntitlementsTab />}
        {tab === 'flags' && <FeatureFlagsTab />}
        {tab === 'connectors' && <ConnectorsTab config={marketplaceConfig} onToggle={toggleConnector} saving={saving} />}
        {tab === 'jurisdiction' && <JurisdictionTab config={marketplaceConfig} jurisdictions={jurisdictions} onChange={handleJurisdictionChange} saving={saving} />}
        {tab === 'audit' && <ModuleAuditTab />}
        {tab === 'status' && <StatusTab summary={summary} config={marketplaceConfig} manifests={manifests} />}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Modules Tab                                                         */
/* ================================================================== */

function ModulesTab({
  manifests, onToggle, saving, expanded, onExpand,
}: {
  manifests: ModuleManifest[];
  onToggle: (id: string, enabled: boolean) => void;
  saving: boolean;
  expanded: string | null;
  onExpand: (id: string | null) => void;
}) {
  return (
    <div>
      <p style={{ fontSize: 13, color: '#6c757d', marginBottom: 16 }}>
        Toggle modules to enable/disable them for this tenant. Modules with unmet dependencies cannot be enabled.
        Click a module row to see its full manifest.
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>
            <th style={{ padding: '8px 12px' }}>Module</th>
            <th style={{ padding: '8px 12px' }}>Version</th>
            <th style={{ padding: '8px 12px' }}>Status</th>
            <th style={{ padding: '8px 12px' }}>Dependencies</th>
            <th style={{ padding: '8px 12px' }}>Permissions</th>
            <th style={{ padding: '8px 12px' }}>Data Stores</th>
            <th style={{ padding: '8px 12px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {manifests.map(m => (
            <React.Fragment key={m.moduleId}>
              <tr
                style={{
                  borderBottom: '1px solid #dee2e6',
                  background: m.manifest.alwaysEnabled ? '#e8f5e9' : m.enabled ? '#fff' : '#f8f9fa',
                  cursor: 'pointer',
                }}
                onClick={() => onExpand(expanded === m.moduleId ? null : m.moduleId)}
              >
                <td style={{ padding: '8px 12px' }}>
                  <strong>{m.manifest.name}</strong>
                  <div style={{ fontSize: 11, color: '#6c757d' }}>{m.moduleId}</div>
                </td>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12 }}>
                  {m.manifest.version}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  {m.manifest.alwaysEnabled ? (
                    <span style={{ color: '#198754', fontWeight: 600, fontSize: 11 }}>ALWAYS ON</span>
                  ) : m.enabled ? (
                    <span style={{ color: '#0d6efd', fontWeight: 600, fontSize: 11 }}>ENABLED</span>
                  ) : (
                    <span style={{ color: '#dc3545', fontWeight: 600, fontSize: 11 }}>DISABLED</span>
                  )}
                </td>
                <td style={{ padding: '8px 12px', fontSize: 11 }}>
                  {m.manifest.dependencies.length === 0
                    ? <span style={{ color: '#6c757d' }}>none</span>
                    : m.manifest.dependencies.map(d => (
                      <span
                        key={d}
                        style={{
                          display: 'inline-block', marginRight: 4, padding: '1px 6px',
                          background: m.missingDependencies.includes(d) ? '#f8d7da' : '#d1e7dd',
                          borderRadius: 3, fontSize: 10,
                        }}
                      >
                        {d}
                        {m.missingDependencies.includes(d) && ' (missing)'}
                      </span>
                    ))
                  }
                </td>
                <td style={{ padding: '8px 12px', fontSize: 11 }}>
                  {m.manifest.permissions.length === 0
                    ? <span style={{ color: '#6c757d' }}>none</span>
                    : m.manifest.permissions.map(p => (
                      <span key={p} style={{ display: 'inline-block', marginRight: 4, padding: '1px 6px', background: '#e2e3e5', borderRadius: 3, fontSize: 10 }}>{p}</span>
                    ))
                  }
                </td>
                <td style={{ padding: '8px 12px', fontSize: 12 }}>
                  {m.manifest.dataStores.length}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  {m.manifest.alwaysEnabled ? (
                    <span style={{ fontSize: 11, color: '#6c757d' }}>locked</span>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggle(m.moduleId, m.enabled); }}
                      disabled={saving || (!m.enabled && !m.dependenciesMet)}
                      style={{
                        padding: '4px 12px', fontSize: 11, border: '1px solid #dee2e6',
                        borderRadius: 4, cursor: saving ? 'not-allowed' : 'pointer',
                        background: m.enabled ? '#dc3545' : '#198754',
                        color: '#fff', fontWeight: 600,
                        opacity: (!m.enabled && !m.dependenciesMet) ? 0.5 : 1,
                      }}
                      title={!m.dependenciesMet ? `Missing deps: ${m.missingDependencies.join(', ')}` : ''}
                    >
                      {m.enabled ? 'Disable' : 'Enable'}
                    </button>
                  )}
                </td>
              </tr>
              {expanded === m.moduleId && (
                <tr key={`${m.moduleId}-detail`} style={{ background: '#f0f4ff' }}>
                  <td colSpan={7} style={{ padding: '12px 24px' }}>
                    <ModuleDetail manifest={m} />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ModuleDetail({ manifest: m }: { manifest: ModuleManifest }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 12 }}>
      <div>
        <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>{m.manifest.name} v{m.manifest.version}</h4>
        <p style={{ color: '#6c757d', margin: '0 0 12px' }}>{m.manifest.description}</p>

        <div style={{ marginBottom: 8 }}>
          <strong>Health Check:</strong>{' '}
          <code style={{ background: '#e2e3e5', padding: '1px 6px', borderRadius: 3, fontSize: 11 }}>
            {m.manifest.healthCheckEndpoint || 'none'}
          </code>
        </div>

        <div style={{ marginBottom: 8 }}>
          <strong>Route Patterns ({m.manifest.routePatterns.length}):</strong>
          <div style={{ marginTop: 4 }}>
            {m.manifest.routePatterns.map((r, i) => (
              <code key={i} style={{ display: 'block', fontSize: 10, color: '#495057', padding: '1px 0' }}>{r}</code>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div style={{ marginBottom: 8 }}>
          <strong>Adapters:</strong>{' '}
          {m.manifest.adapters.length === 0
            ? <span style={{ color: '#6c757d' }}>none</span>
            : m.manifest.adapters.map(a => (
              <span key={a} style={{ display: 'inline-block', marginRight: 4, padding: '1px 6px', background: '#cff4fc', borderRadius: 3, fontSize: 10 }}>{a}</span>
            ))
          }
        </div>

        <div style={{ marginBottom: 8 }}>
          <strong>Services ({m.manifest.services.length}):</strong>
          <div style={{ marginTop: 4 }}>
            {m.manifest.services.map(s => (
              <span key={s} style={{ display: 'inline-block', marginRight: 4, marginBottom: 2, padding: '1px 6px', background: '#e2e3e5', borderRadius: 3, fontSize: 10 }}>{s}</span>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <strong>Data Stores ({m.manifest.dataStores.length}):</strong>
          {m.manifest.dataStores.map(ds => (
            <div key={ds.id} style={{ marginTop: 4, padding: '4px 8px', background: '#fff', border: '1px solid #dee2e6', borderRadius: 4 }}>
              <strong>{ds.id}</strong> <span style={{ color: '#6c757d', fontSize: 10 }}>({ds.type})</span>
              <div style={{ fontSize: 11, color: '#495057' }}>{ds.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Connectors Tab                                                      */
/* ================================================================== */

function ConnectorsTab({
  config, onToggle, saving,
}: {
  config: MarketplaceConfig | null;
  onToggle: (index: number) => void;
  saving: boolean;
}) {
  if (!config) return <p style={{ color: '#6c757d' }}>Loading tenant config...</p>;

  return (
    <div>
      <p style={{ fontSize: 13, color: '#6c757d', marginBottom: 16 }}>
        Connector settings for tenant <strong>{config.tenantId}</strong> ({config.jurisdiction} jurisdiction).
        Toggle connectors on/off. Secrets are managed via environment variables, not stored here.
      </p>
      {config.connectors.length === 0 ? (
        <p style={{ color: '#6c757d' }}>No connectors configured for this jurisdiction.</p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {config.connectors.map((c, i) => (
            <div key={i} style={{ border: '1px solid #dee2e6', borderRadius: 6, padding: '12px 16px', background: c.enabled ? '#fff' : '#f8f9fa' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <strong style={{ fontSize: 14 }}>{c.name}</strong>
                <span style={{ fontSize: 10, padding: '1px 8px', background: '#e2e3e5', borderRadius: 3 }}>{c.type}</span>
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  color: c.enabled ? '#198754' : '#dc3545',
                }}>
                  {c.enabled ? 'ACTIVE' : 'INACTIVE'}
                </span>
                <button
                  onClick={() => onToggle(i)}
                  disabled={saving}
                  style={{
                    marginLeft: 'auto', padding: '4px 12px', fontSize: 11,
                    border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer',
                    background: c.enabled ? '#dc3545' : '#198754', color: '#fff', fontWeight: 600,
                  }}
                >
                  {c.enabled ? 'Disable' : 'Enable'}
                </button>
              </div>
              <div style={{ fontSize: 12 }}>
                {Object.entries(c.settings).map(([k, v]) => (
                  <div key={k} style={{ display: 'inline-block', marginRight: 12, marginBottom: 4 }}>
                    <span style={{ color: '#6c757d' }}>{k}:</span>{' '}
                    <code style={{ background: '#e2e3e5', padding: '0 4px', borderRadius: 2, fontSize: 11 }}>
                      {String(v)}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* Jurisdiction Tab                                                    */
/* ================================================================== */

function JurisdictionTab({
  config, jurisdictions, onChange, saving,
}: {
  config: MarketplaceConfig | null;
  jurisdictions: JurisdictionInfo[];
  onChange: (id: string) => void;
  saving: boolean;
}) {
  if (!config) return <p style={{ color: '#6c757d' }}>Loading tenant config...</p>;

  return (
    <div>
      <p style={{ fontSize: 13, color: '#6c757d', marginBottom: 16 }}>
        Select a jurisdiction pack for tenant <strong>{config.tenantId}</strong>.
        Changing jurisdiction resets connector settings and regulatory defaults.
      </p>
      <div style={{ display: 'grid', gap: 12, maxWidth: 600 }}>
        {jurisdictions.map(j => (
          <div
            key={j.id}
            style={{
              border: config.jurisdiction === j.id ? '2px solid #0d6efd' : '1px solid #dee2e6',
              borderRadius: 6, padding: '12px 16px', cursor: 'pointer',
              background: config.jurisdiction === j.id ? '#e7f1ff' : '#fff',
            }}
            onClick={() => { if (j.id !== config.jurisdiction && !saving) onChange(j.id); }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong style={{ fontSize: 14 }}>{j.name}</strong>
              {config.jurisdiction === j.id && (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#0d6efd', background: '#cfe2ff', padding: '1px 8px', borderRadius: 3 }}>ACTIVE</span>
              )}
              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6c757d' }}>
                {j.defaultConnectorCount} default connector{j.defaultConnectorCount !== 1 ? 's' : ''}
              </span>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#495057' }}>{j.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Status Tab                                                          */
/* ================================================================== */

function StatusTab({
  summary, config, manifests,
}: {
  summary: any;
  config: MarketplaceConfig | null;
  manifests: ModuleManifest[];
}) {
  const enabledCount = manifests.filter(m => m.enabled).length;
  const disabledCount = manifests.filter(m => !m.enabled && !m.manifest.alwaysEnabled).length;
  const alwaysOnCount = manifests.filter(m => m.manifest.alwaysEnabled).length;
  const totalDataStores = manifests.reduce((sum, m) => sum + m.manifest.dataStores.length, 0);
  const totalPermissions = new Set(manifests.flatMap(m => m.manifest.permissions)).size;

  return (
    <div>
      <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Marketplace Summary</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Modules" value={manifests.length} />
        <StatCard label="Enabled" value={enabledCount} color="#198754" />
        <StatCard label="Disabled" value={disabledCount} color="#dc3545" />
        <StatCard label="Always On" value={alwaysOnCount} color="#0d6efd" />
        <StatCard label="Data Stores" value={totalDataStores} />
        <StatCard label="Unique Permissions" value={totalPermissions} />
        <StatCard label="Active SKU" value={summary?.activeSku || 'N/A'} />
        <StatCard label="Total Tenants" value={summary?.totalTenants || 0} />
        <StatCard label="Active Connectors" value={summary?.totalConnectors || 0} />
      </div>

      {config && (
        <div style={{ border: '1px solid #dee2e6', borderRadius: 6, padding: 16 }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>Current Tenant: {config.tenantId}</h4>
          <div style={{ fontSize: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div><strong>Facility:</strong> {config.facilityName}</div>
            <div><strong>Jurisdiction:</strong> {config.jurisdiction}</div>
            <div><strong>Modules:</strong> {config.enabledModules.length} enabled</div>
            <div><strong>Connectors:</strong> {config.connectors.filter(c => c.enabled).length} active</div>
            <div><strong>Last Updated:</strong> {new Date(config.updatedAt).toLocaleString()}</div>
          </div>

          {Object.keys(config.customSettings).length > 0 && (
            <div style={{ marginTop: 12 }}>
              <strong style={{ fontSize: 12 }}>Custom Settings:</strong>
              <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(config.customSettings).map(([k, v]) => (
                  <span key={k} style={{ fontSize: 11, padding: '2px 8px', background: '#e2e3e5', borderRadius: 3 }}>
                    {k}: <strong>{String(v)}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {summary?.jurisdictionBreakdown && Object.keys(summary.jurisdictionBreakdown).length > 0 && (
        <div style={{ marginTop: 16, border: '1px solid #dee2e6', borderRadius: 6, padding: 16 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>Jurisdiction Breakdown</h4>
          <div style={{ display: 'flex', gap: 16 }}>
            {Object.entries(summary.jurisdictionBreakdown).map(([j, count]) => (
              <div key={j} style={{ fontSize: 12 }}>
                <strong>{j}:</strong> {count as number} tenant{(count as number) !== 1 ? 's' : ''}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ border: '1px solid #dee2e6', borderRadius: 6, padding: '12px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: color || '#212529' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#6c757d', marginTop: 4 }}>{label}</div>
    </div>
  );
}

/* ================================================================== */
/* Entitlements Tab -- Phase 109                                       */
/* ================================================================== */

interface EntitlementRow {
  id: string;
  tenantId: string;
  moduleId: string;
  enabled: boolean;
  planTier: string;
  enabledAt: string | null;
  disabledAt: string | null;
  enabledBy: string | null;
}

function EntitlementsTab() {
  const [entitlements, setEntitlements] = useState<EntitlementRow[]>([]);
  const [enabledIds, setEnabledIds] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [seedMsg, setSeedMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const [eRes, cRes] = await Promise.all([
        apiFetch('/admin/modules/entitlements'),
        apiFetch('/admin/modules/catalog'),
      ]);
      if (eRes.ok) {
        setEntitlements(eRes.entitlements || []);
        setEnabledIds(eRes.enabledModuleIds || []);
      }
      if (cRes.ok) setCatalog(cRes.modules || []);
    } catch {
      setError('Failed to load entitlements');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleEntitlement = async (moduleId: string, currentEnabled: boolean) => {
    setSaving(true);
    setError('');
    const res = await apiPost('/admin/modules/entitlements', {
      moduleId,
      enabled: !currentEnabled,
      reason: `Admin toggle from UI`,
    });
    if (!res.ok) setError(res.error || 'Failed to toggle');
    await load();
    setSaving(false);
  };

  const seedBaseline = async () => {
    setSaving(true);
    setError('');
    setSeedMsg('');
    const res = await apiPost('/admin/modules/entitlements/seed', {});
    if (res.ok) {
      setSeedMsg(`Seeded ${res.modulesSeeded} modules (${res.totalEnabled} total enabled)`);
    } else {
      setError(res.error || 'Seed failed');
    }
    await load();
    setSaving(false);
  };

  // Build a map from catalog for display
  const catalogMap = new Map(catalog.map((c: any) => [c.moduleId, c]));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 13, color: '#6c757d', margin: 0 }}>
            DB-backed module entitlements per tenant. Toggle modules to enable/disable them. Always-enabled modules cannot be disabled.
          </p>
          <p style={{ fontSize: 12, color: '#0d6efd', marginTop: 4 }}>{enabledIds.length} modules enabled for default tenant</p>
        </div>
        <button onClick={seedBaseline} disabled={saving} style={{
          padding: '6px 16px', fontSize: 12, border: '1px solid #0d6efd', borderRadius: 4,
          background: '#0d6efd', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
        }}>Seed Baseline</button>
      </div>
      {error && <div style={{ padding: '6px 12px', background: '#f8d7da', color: '#842029', fontSize: 12, marginBottom: 8, borderRadius: 4 }}>{error}</div>}
      {seedMsg && <div style={{ padding: '6px 12px', background: '#d1e7dd', color: '#0f5132', fontSize: 12, marginBottom: 8, borderRadius: 4 }}>{seedMsg}</div>}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>
            <th style={{ padding: '8px 12px' }}>Module</th>
            <th style={{ padding: '8px 12px' }}>Name</th>
            <th style={{ padding: '8px 12px' }}>Enabled</th>
            <th style={{ padding: '8px 12px' }}>Plan Tier</th>
            <th style={{ padding: '8px 12px' }}>Last Changed</th>
            <th style={{ padding: '8px 12px' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {catalog.map((mod: any) => {
            const ent = entitlements.find(e => e.moduleId === mod.moduleId);
            const isEnabled = enabledIds.includes(mod.moduleId);
            return (
              <tr key={mod.moduleId} style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12 }}>{mod.moduleId}</td>
                <td style={{ padding: '8px 12px' }}>{mod.name}</td>
                <td style={{ padding: '8px 12px' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 3, fontSize: 11, fontWeight: 600,
                    background: isEnabled ? '#d1e7dd' : '#f8d7da',
                    color: isEnabled ? '#0f5132' : '#842029',
                  }}>{isEnabled ? 'ENABLED' : 'DISABLED'}</span>
                  {mod.alwaysEnabled && <span style={{ marginLeft: 4, fontSize: 10, color: '#6c757d' }}>(always-on)</span>}
                </td>
                <td style={{ padding: '8px 12px', fontSize: 12 }}>{ent?.planTier || '-'}</td>
                <td style={{ padding: '8px 12px', fontSize: 11, color: '#6c757d' }}>
                  {ent?.enabledAt ? new Date(ent.enabledAt).toLocaleString() : ent?.disabledAt ? new Date(ent.disabledAt).toLocaleString() : '-'}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  {!mod.alwaysEnabled && (
                    <button
                      disabled={saving}
                      onClick={() => toggleEntitlement(mod.moduleId, isEnabled)}
                      style={{
                        padding: '3px 10px', fontSize: 11, border: '1px solid',
                        borderRadius: 3, cursor: saving ? 'not-allowed' : 'pointer',
                        background: isEnabled ? '#fff' : '#0d6efd',
                        color: isEnabled ? '#dc3545' : '#fff',
                        borderColor: isEnabled ? '#dc3545' : '#0d6efd',
                      }}
                    >{isEnabled ? 'Disable' : 'Enable'}</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ================================================================== */
/* Feature Flags Tab -- Phase 109, upgraded Phase 285                  */
/* ================================================================== */

interface FlagRow {
  id: string;
  tenantId: string;
  flagKey: string;
  flagValue: string;
  moduleId: string | null;
  description: string | null;
  rolloutPercentage: number | null;
  userTargeting: unknown[] | null;
}

function FeatureFlagsTab() {
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [newFlag, setNewFlag] = useState({ flagKey: '', flagValue: '', moduleId: '', description: '', rolloutPercentage: '100' });

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/admin/modules/feature-flags');
      if (res.ok) setFlags(res.flags || []);
    } catch {
      setError('Failed to load flags');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createFlag = async () => {
    if (!newFlag.flagKey || !newFlag.flagValue) { setError('flagKey and flagValue are required'); return; }
    const pct = parseInt(newFlag.rolloutPercentage, 10);
    if (isNaN(pct) || pct < 0 || pct > 100) { setError('Rollout percentage must be 0-100'); return; }
    setSaving(true);
    setError('');
    const res = await apiPost('/admin/modules/feature-flags', {
      flagKey: newFlag.flagKey,
      flagValue: newFlag.flagValue,
      moduleId: newFlag.moduleId || undefined,
      description: newFlag.description || undefined,
      rolloutPercentage: pct,
      reason: 'Created from admin UI',
    });
    if (!res.ok) setError(res.error || 'Failed to create flag');
    else setNewFlag({ flagKey: '', flagValue: '', moduleId: '', description: '', rolloutPercentage: '100' });
    await load();
    setSaving(false);
  };

  const deleteFlag = async (flagKey: string) => {
    setSaving(true);
    setError('');
    const res = await apiFetch('/admin/modules/feature-flags', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
      body: JSON.stringify({ flagKey, reason: 'Deleted from admin UI' }),
    });
    if (!res.ok) setError(res.error || 'Failed to delete');
    await load();
    setSaving(false);
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: '#6c757d', marginBottom: 16 }}>
        Manage per-tenant feature flags with gradual rollout support. Flags are key-value pairs that control fine-grained behavior within modules.
      </p>
      {error && <div style={{ padding: '6px 12px', background: '#f8d7da', color: '#842029', fontSize: 12, marginBottom: 8, borderRadius: 4 }}>{error}</div>}

      {/* Create new flag form */}
      <div style={{ border: '1px solid #dee2e6', borderRadius: 6, padding: 12, marginBottom: 16, background: '#f8f9fa' }}>
        <strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>Add / Update Flag</strong>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <input placeholder="Flag key" value={newFlag.flagKey} onChange={e => setNewFlag(f => ({ ...f, flagKey: e.target.value }))}
            style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #ced4da', borderRadius: 3, width: 140 }} />
          <input placeholder="Flag value" value={newFlag.flagValue} onChange={e => setNewFlag(f => ({ ...f, flagValue: e.target.value }))}
            style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #ced4da', borderRadius: 3, width: 120 }} />
          <input placeholder="Module ID" value={newFlag.moduleId} onChange={e => setNewFlag(f => ({ ...f, moduleId: e.target.value }))}
            style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #ced4da', borderRadius: 3, width: 120 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <label style={{ fontSize: 10, color: '#6c757d' }}>Rollout %</label>
            <input type="number" min="0" max="100" value={newFlag.rolloutPercentage}
              onChange={e => setNewFlag(f => ({ ...f, rolloutPercentage: e.target.value }))}
              style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #ced4da', borderRadius: 3, width: 70 }} />
          </div>
          <input placeholder="Description" value={newFlag.description} onChange={e => setNewFlag(f => ({ ...f, description: e.target.value }))}
            style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #ced4da', borderRadius: 3, width: 180 }} />
          <button onClick={createFlag} disabled={saving}
            style={{ padding: '4px 14px', fontSize: 12, background: '#198754', color: '#fff', border: 'none', borderRadius: 3, cursor: saving ? 'not-allowed' : 'pointer' }}>
            Save
          </button>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>
            <th style={{ padding: '8px 12px' }}>Key</th>
            <th style={{ padding: '8px 12px' }}>Value</th>
            <th style={{ padding: '8px 12px' }}>Rollout</th>
            <th style={{ padding: '8px 12px' }}>Module</th>
            <th style={{ padding: '8px 12px' }}>Description</th>
            <th style={{ padding: '8px 12px' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {flags.length === 0 && (
            <tr><td colSpan={6} style={{ padding: 16, color: '#6c757d', textAlign: 'center' }}>No feature flags set for this tenant.</td></tr>
          )}
          {flags.map(f => (
            <tr key={f.flagKey} style={{ borderBottom: '1px solid #dee2e6' }}>
              <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12 }}>{f.flagKey}</td>
              <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12 }}>{f.flagValue}</td>
              <td style={{ padding: '8px 12px', fontSize: 12 }}>
                <span style={{
                  padding: '2px 6px',
                  borderRadius: 3,
                  fontSize: 11,
                  fontWeight: 600,
                  background: (f.rolloutPercentage ?? 100) === 100 ? '#d1e7dd' : (f.rolloutPercentage ?? 100) === 0 ? '#f8d7da' : '#fff3cd',
                  color: (f.rolloutPercentage ?? 100) === 100 ? '#0f5132' : (f.rolloutPercentage ?? 100) === 0 ? '#842029' : '#664d03',
                }}>
                  {f.rolloutPercentage ?? 100}%
                </span>
              </td>
              <td style={{ padding: '8px 12px', fontSize: 12 }}>{f.moduleId || '-'}</td>
              <td style={{ padding: '8px 12px', fontSize: 12, color: '#6c757d' }}>{f.description || '-'}</td>
              <td style={{ padding: '8px 12px' }}>
                <button onClick={() => deleteFlag(f.flagKey)} disabled={saving}
                  style={{ padding: '3px 10px', fontSize: 11, background: '#fff', color: '#dc3545', border: '1px solid #dc3545', borderRadius: 3, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ================================================================== */
/* Module Audit Tab -- Phase 109                                       */
/* ================================================================== */

interface AuditEntry {
  id: string;
  tenantId: string;
  actorId: string;
  actorType: string;
  entityType: string;
  entityId: string;
  action: string;
  beforeJson: string | null;
  afterJson: string | null;
  reason: string | null;
  createdAt: string;
}

function ModuleAuditTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  const limit = 50;

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(`/admin/modules/audit?limit=${limit}&offset=${offset}`);
      if (res.ok) {
        setEntries(res.entries || []);
        setTotal(res.total || 0);
      }
    } catch {
      setError('Failed to load audit log');
    }
  }, [offset]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: '#6c757d', margin: 0 }}>
          Append-only audit trail of all module entitlement and feature flag changes. {total} total entries.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0}
            style={{ padding: '4px 10px', fontSize: 11, border: '1px solid #ced4da', borderRadius: 3, cursor: offset === 0 ? 'not-allowed' : 'pointer' }}>Prev</button>
          <span style={{ fontSize: 11, lineHeight: '28px', color: '#6c757d' }}>{offset + 1}-{Math.min(offset + limit, total)} of {total}</span>
          <button onClick={() => setOffset(offset + limit)} disabled={offset + limit >= total}
            style={{ padding: '4px 10px', fontSize: 11, border: '1px solid #ced4da', borderRadius: 3, cursor: offset + limit >= total ? 'not-allowed' : 'pointer' }}>Next</button>
        </div>
      </div>
      {error && <div style={{ padding: '6px 12px', background: '#f8d7da', color: '#842029', fontSize: 12, marginBottom: 8, borderRadius: 4 }}>{error}</div>}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>
            <th style={{ padding: '6px 10px' }}>Time</th>
            <th style={{ padding: '6px 10px' }}>Actor</th>
            <th style={{ padding: '6px 10px' }}>Entity</th>
            <th style={{ padding: '6px 10px' }}>Action</th>
            <th style={{ padding: '6px 10px' }}>Reason</th>
            <th style={{ padding: '6px 10px' }}>Before / After</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 && (
            <tr><td colSpan={6} style={{ padding: 16, color: '#6c757d', textAlign: 'center' }}>No audit entries yet.</td></tr>
          )}
          {entries.map(e => (
            <tr key={e.id} style={{ borderBottom: '1px solid #dee2e6' }}>
              <td style={{ padding: '6px 10px', whiteSpace: 'nowrap', color: '#6c757d' }}>{new Date(e.createdAt).toLocaleString()}</td>
              <td style={{ padding: '6px 10px' }}>{e.actorId} <span style={{ fontSize: 10, color: '#6c757d' }}>({e.actorType})</span></td>
              <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{e.entityType}/{e.entityId}</td>
              <td style={{ padding: '6px 10px' }}>
                <span style={{
                  padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 600,
                  background: e.action === 'enable' || e.action === 'create' ? '#d1e7dd' : e.action === 'disable' || e.action === 'delete' ? '#f8d7da' : '#fff3cd',
                  color: e.action === 'enable' || e.action === 'create' ? '#0f5132' : e.action === 'disable' || e.action === 'delete' ? '#842029' : '#664d03',
                }}>{e.action.toUpperCase()}</span>
              </td>
              <td style={{ padding: '6px 10px', fontSize: 11, color: '#6c757d', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.reason || '-'}</td>
              <td style={{ padding: '6px 10px', fontSize: 10, fontFamily: 'monospace', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {e.beforeJson && <span title={e.beforeJson}>B: {e.beforeJson.substring(0, 40)}{e.beforeJson.length > 40 ? '...' : ''}</span>}
                {e.beforeJson && e.afterJson && ' | '}
                {e.afterJson && <span title={e.afterJson}>A: {e.afterJson.substring(0, 40)}{e.afterJson.length > 40 ? '...' : ''}</span>}
                {!e.beforeJson && !e.afterJson && '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
