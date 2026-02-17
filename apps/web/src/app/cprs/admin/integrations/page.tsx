'use client';

/**
 * Admin Integration Console — Phase 18B/D.
 *
 * Enterprise integration dashboard with:
 *   - Integration registry table (all types: VistA RPC, FHIR, DICOM, HL7v2, devices)
 *   - Health summary panel (connected/disconnected/degraded counts)
 *   - Enable/disable toggles
 *   - Probe All + probe individual
 *   - Error log viewer
 *   - Device onboarding form
 *   - Legacy connector view (Phase 17F compatibility)
 *
 * Accessible at /cprs/admin/integrations.
 */

import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/stores/session-context';
import styles from '@/components/cprs/cprs.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Integration {
  id: string;
  label: string;
  type: string;
  enabled: boolean;
  host: string;
  port: number;
  basePath: string;
  authMethod: string;
  status: string;
  lastChecked: string | null;
  lastSuccess: string | null;
  lastError: string | null;
  errorLog: Array<{ timestamp: string; code: string; message: string }>;
  queueMetrics: { pending: number; processed: number; errors: number; avgLatencyMs: number };
  notes: string;
}

interface HealthSummary {
  total: number;
  enabled: number;
  connected: number;
  disconnected: number;
  degraded: number;
  unknown: number;
  disabled: number;
  byType: Record<string, number>;
}

interface Connector {
  id: string;
  label: string;
  type: string;
  host: string;
  port: number;
  status: 'connected' | 'disconnected' | 'degraded' | 'unknown';
  lastChecked: string | null;
}

/* ------------------------------------------------------------------ */
/* Type labels                                                         */
/* ------------------------------------------------------------------ */

const TYPE_LABELS: Record<string, string> = {
  'vista-rpc': 'VistA RPC',
  'fhir': 'FHIR R4',
  'fhir-c0fhir': 'C0FHIR Suite',
  'fhir-vpr': 'VPR FHIR',
  'dicom': 'DICOM',
  'dicomweb': 'DICOMweb',
  'hl7v2': 'HL7v2',
  'lis': 'Lab System',
  'pacs-vna': 'PACS/VNA',
  'device': 'Device',
  'external': 'External',
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function IntegrationsPage() {
  const { user, hasRole } = useSession();
  const [tab, setTab] = useState<'registry' | 'legacy' | 'onboard'>('registry');
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [probing, setProbing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedError, setSelectedError] = useState<string | null>(null);
  const [errorLogEntries, setErrorLogEntries] = useState<Integration['errorLog']>([]);

  // Device onboarding form state
  const [deviceForm, setDeviceForm] = useState({
    id: '', label: '', host: '', port: '', manufacturer: '', model: '',
    serialNumber: '', modalityCode: '', aeTitle: '', location: '',
  });
  const [onboardMsg, setOnboardMsg] = useState<string | null>(null);

  const tenantId = 'default';

  /* ── Fetchers ──────────────────────────────────────────────────── */

  const fetchRegistry = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/registry/${tenantId}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setIntegrations(data.integrations);
    } catch { /* ignore */ }
  }, [tenantId]);

  const fetchHealthSummary = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/registry/${tenantId}/health-summary`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setHealthSummary(data.summary);
    } catch { /* ignore */ }
  }, [tenantId]);

  const fetchConnectors = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/integrations/${tenantId}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setConnectors(data.connectors);
    } catch { /* ignore */ }
  }, [tenantId]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchRegistry(), fetchHealthSummary(), fetchConnectors()]);
    setLoading(false);
  }, [fetchRegistry, fetchHealthSummary, fetchConnectors]);

  useEffect(() => {
    if (hasRole('admin')) fetchAll();
    else setLoading(false);
  }, [hasRole, fetchAll]);

  /* ── Actions ───────────────────────────────────────────────────── */

  async function handleProbeAll() {
    setProbing(true);
    setError(null);
    try {
      await fetch(`${API_BASE}/admin/registry/${tenantId}/probe-all`, {
        method: 'POST', credentials: 'include',
      });
      // Also probe legacy connectors
      await fetch(`${API_BASE}/admin/integrations/${tenantId}/probe`, {
        method: 'POST', credentials: 'include',
      });
      await fetchAll();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setProbing(false);
    }
  }

  async function handleToggle(integrationId: string, enabled: boolean) {
    try {
      await fetch(`${API_BASE}/admin/registry/${tenantId}/${integrationId}/toggle`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      await fetchRegistry();
      await fetchHealthSummary();
    } catch { /* ignore */ }
  }

  async function handleProbeSingle(integrationId: string) {
    try {
      await fetch(`${API_BASE}/admin/registry/${tenantId}/${integrationId}/probe`, {
        method: 'POST', credentials: 'include',
      });
      await fetchRegistry();
      await fetchHealthSummary();
    } catch { /* ignore */ }
  }

  function viewErrorLog(integration: Integration) {
    setSelectedError(integration.id);
    setErrorLogEntries(integration.errorLog);
  }

  async function handleOnboardDevice() {
    setOnboardMsg(null);
    const required = ['id', 'label', 'host', 'port', 'manufacturer', 'model', 'modalityCode'];
    const missing = required.filter((f) => !(deviceForm as any)[f]);
    if (missing.length > 0) {
      setOnboardMsg(`Missing: ${missing.join(', ')}`);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/admin/registry/${tenantId}/onboard-device`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...deviceForm, port: Number(deviceForm.port) }),
      });
      const data = await res.json();
      if (data.ok) {
        setOnboardMsg(`Device "${deviceForm.label}" onboarded successfully`);
        setDeviceForm({ id: '', label: '', host: '', port: '', manufacturer: '', model: '', serialNumber: '', modalityCode: '', aeTitle: '', location: '' });
        await fetchAll();
      } else {
        setOnboardMsg(data.error || 'Onboarding failed');
      }
    } catch (e: unknown) {
      setOnboardMsg((e as Error).message);
    }
  }

  /* ── Helpers ───────────────────────────────────────────────────── */

  const statusColor = (status: string) => {
    switch (status) {
      case 'connected': return '#16a34a';
      case 'disconnected': return '#dc2626';
      case 'degraded': return '#d97706';
      case 'disabled': return '#9ca3af';
      default: return '#6b7280';
    }
  };

  /* ── Render ────────────────────────────────────────────────────── */

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
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--cprs-text-muted)' }}>Admin &rarr; Integration Console</span>
      </div>

      <div style={{ flex: 1, padding: 24, maxWidth: 1100, margin: '0 auto', width: '100%' }}>

        {/* ── Health Summary Bar ────────────────────────────────────── */}
        {healthSummary && (
          <div style={{
            display: 'flex', gap: 16, marginBottom: 16, padding: '10px 16px',
            background: 'var(--cprs-bg)', border: '1px solid var(--cprs-border)', borderRadius: 6,
            fontSize: 12,
          }}>
            <span><strong>{healthSummary.total}</strong> total</span>
            <span><strong>{healthSummary.enabled}</strong> enabled</span>
            <span style={{ color: '#16a34a' }}><strong>{healthSummary.connected}</strong> connected</span>
            <span style={{ color: '#dc2626' }}><strong>{healthSummary.disconnected}</strong> disconnected</span>
            <span style={{ color: '#d97706' }}><strong>{healthSummary.degraded}</strong> degraded</span>
            <span style={{ color: '#6b7280' }}><strong>{healthSummary.unknown}</strong> unknown</span>
            <span style={{ color: '#9ca3af' }}><strong>{healthSummary.disabled}</strong> disabled</span>
          </div>
        )}

        {/* ── Tab Nav ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          {(['registry', 'onboard', 'legacy'] as const).map((t) => (
            <button key={t} className={styles.btn} onClick={() => setTab(t)}
              style={{
                fontSize: 12,
                fontWeight: tab === t ? 600 : 400,
                borderBottom: tab === t ? '2px solid var(--cprs-primary)' : '2px solid transparent',
                borderRadius: 0,
              }}>
              {t === 'registry' ? 'Integration Registry' : t === 'onboard' ? 'Device Onboarding' : 'Legacy Connectors'}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button className={styles.btn} onClick={handleProbeAll} disabled={probing} style={{ fontSize: 12 }}>
            {probing ? 'Probing...' : 'Probe All'}
          </button>
        </div>

        {error && <p style={{ color: 'var(--cprs-danger)', fontSize: 12, marginBottom: 8 }}>{error}</p>}

        {/* ── Registry Tab ─────────────────────────────────────────── */}
        {tab === 'registry' && (
          <>
            {loading ? (
              <p style={{ fontSize: 12, color: 'var(--cprs-text-muted)' }}>Loading...</p>
            ) : integrations.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--cprs-text-muted)' }}>No integrations in registry. Default entries seeded on API start.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--cprs-border)' }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Integration</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Type</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Endpoint</th>
                    <th style={{ textAlign: 'center', padding: '6px 8px' }}>Enabled</th>
                    <th style={{ textAlign: 'center', padding: '6px 8px' }}>Status</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px' }}>Queue</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px' }}>Errors</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Last Checked</th>
                    <th style={{ textAlign: 'center', padding: '6px 8px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {integrations.map((i) => (
                    <tr key={i.id} style={{ borderBottom: '1px solid var(--cprs-border)' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 500 }}>
                        {i.label}
                        {i.notes && <br />}
                        {i.notes && <span style={{ fontSize: 10, color: 'var(--cprs-text-muted)' }}>{i.notes.slice(0, 60)}</span>}
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <span style={{ padding: '1px 6px', borderRadius: 4, background: 'var(--cprs-bg)', fontSize: 11 }}>
                          {TYPE_LABELS[i.type] || i.type}
                        </span>
                      </td>
                      <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: 11 }}>
                        {i.host}:{i.port}{i.basePath}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <input type="checkbox" checked={i.enabled}
                          onChange={(e) => handleToggle(i.id, e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 10,
                          fontSize: 11, fontWeight: 600, color: '#fff',
                          background: statusColor(i.status),
                        }}>
                          {i.status}
                        </span>
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>
                        {i.queueMetrics.pending > 0 ? i.queueMetrics.pending : '-'}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                        {i.errorLog.length > 0 ? (
                          <button className={styles.btn} onClick={() => viewErrorLog(i)}
                            style={{ fontSize: 11, color: '#dc2626', padding: '1px 6px' }}>
                            {i.errorLog.length}
                          </button>
                        ) : (
                          <span style={{ color: 'var(--cprs-text-muted)' }}>0</span>
                        )}
                      </td>
                      <td style={{ padding: '6px 8px', color: 'var(--cprs-text-muted)' }}>
                        {i.lastChecked ? new Date(i.lastChecked).toLocaleString() : 'Never'}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <button className={styles.btn} onClick={() => handleProbeSingle(i.id)}
                          style={{ fontSize: 11, padding: '2px 8px' }}>
                          Probe
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Error log modal */}
            {selectedError && (
              <div style={{
                marginTop: 16, padding: 12, border: '1px solid var(--cprs-border)',
                borderRadius: 6, background: 'var(--cprs-bg)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong style={{ fontSize: 13 }}>Error Log: {selectedError}</strong>
                  <button className={styles.btn} onClick={() => setSelectedError(null)} style={{ fontSize: 11 }}>Close</button>
                </div>
                {errorLogEntries.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--cprs-text-muted)' }}>No errors recorded.</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--cprs-border)' }}>
                        <th style={{ textAlign: 'left', padding: '4px' }}>Timestamp</th>
                        <th style={{ textAlign: 'left', padding: '4px' }}>Code</th>
                        <th style={{ textAlign: 'left', padding: '4px' }}>Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errorLogEntries.map((e, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--cprs-border)' }}>
                          <td style={{ padding: '4px', fontFamily: 'monospace' }}>{new Date(e.timestamp).toLocaleString()}</td>
                          <td style={{ padding: '4px', color: '#dc2626' }}>{e.code}</td>
                          <td style={{ padding: '4px' }}>{e.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Device Onboarding Tab ────────────────────────────────── */}
        {tab === 'onboard' && (
          <div style={{ maxWidth: 600 }}>
            <h3 style={{ fontSize: 14, margin: '0 0 12px' }}>Onboard New Device / Modality</h3>
            <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', margin: '0 0 12px' }}>
              Register a new DICOM modality, bedside device, or lab instrument.
              Config-not-code: devices are configured entries, not hard-coded.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(['id', 'label', 'host', 'port', 'manufacturer', 'model', 'serialNumber', 'modalityCode', 'aeTitle', 'location'] as const).map((field) => (
                <label key={field} style={{ display: 'block', fontSize: 12 }}>
                  <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>
                    {field.replace(/([A-Z])/g, ' $1').trim()}
                    {['id', 'label', 'host', 'port', 'manufacturer', 'model', 'modalityCode'].includes(field) && ' *'}
                  </span>
                  <input
                    value={deviceForm[field]}
                    onChange={(e) => setDeviceForm({ ...deviceForm, [field]: e.target.value })}
                    placeholder={field === 'modalityCode' ? 'CT, MR, US, XR, CR, ECG...' : field === 'port' ? '104' : ''}
                    style={{
                      display: 'block', width: '100%', padding: '4px 6px', fontSize: 12,
                      border: '1px solid var(--cprs-border)', borderRadius: 3, marginTop: 2,
                    }}
                  />
                </label>
              ))}
            </div>

            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={handleOnboardDevice}
              style={{ marginTop: 12, fontSize: 12 }}
            >
              Onboard Device
            </button>

            {onboardMsg && (
              <p style={{ fontSize: 12, marginTop: 8, color: onboardMsg.includes('successfully') ? '#16a34a' : '#dc2626' }}>
                {onboardMsg}
              </p>
            )}
          </div>
        )}

        {/* ── Legacy Connectors Tab ────────────────────────────────── */}
        {tab === 'legacy' && (
          <>
            <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', marginBottom: 8 }}>
              Phase 17F legacy connector view. These are the original ConnectorConfig entries from tenant config.
            </p>
            {connectors.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--cprs-text-muted)' }}>No legacy connectors configured.</p>
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
                          display: 'inline-block', padding: '2px 8px', borderRadius: 10,
                          fontSize: 11, fontWeight: 600, color: '#fff',
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
          </>
        )}

        {/* ── Integration Architecture Note ────────────────────────── */}
        <div style={{ marginTop: 24, padding: 12, background: 'var(--cprs-bg)', border: '1px solid var(--cprs-border)', borderRadius: 6, fontSize: 11, color: 'var(--cprs-text-muted)' }}>
          <strong>Integration Architecture (Phase 18):</strong>
          <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
            <li><strong>VistA-first:</strong> VistA RPC Broker is always the primary connection</li>
            <li><strong>FHIR:</strong> C0FHIR Suite (MUMPS-native FHIR R4) or external FHIR servers</li>
            <li><strong>Imaging:</strong> VistA Imaging (MAG4) + PACS/VNA (Orthanc, dcm4chee) + DICOMweb + OHIF viewer</li>
            <li><strong>HL7v2:</strong> MLLP feeds for ADT, ORM, ORU messages</li>
            <li><strong>Devices:</strong> Config-not-code onboarding for DICOM modalities, LIS instruments, bedside monitors</li>
            <li><strong>Probes:</strong> TCP socket (DICOM/HL7v2), HTTP (FHIR/DICOMweb), XWB (VistA RPC)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
