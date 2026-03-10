'use client';

/**
 * Admin Integration Console -- Phase 18B/D + Phase 21 + Phase 58.
 *
 * Enterprise integration dashboard with:
 *   - Integration registry table (all types: VistA RPC, FHIR, DICOM, HL7v2, devices)
 *   - Health summary panel (connected/disconnected/degraded counts)
 *   - Enable/disable toggles
 *   - Probe All + probe individual
 *   - Error log viewer
 *   - Device onboarding form
 *   - Legacy connector view (Phase 17F compatibility)
 *   - VistA HL7/HLO Telemetry (Phase 21) -- real-time data from VistA globals
 *   - HL7 Message Browser (Phase 58) -- individual message list + detail viewer + masking
 *
 * Accessible at /cprs/admin/integrations.
 */

import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/stores/session-context';
import { csrfHeaders } from '@/lib/csrf';
import styles from '@/components/cprs/cprs.module.css';
import { API_BASE } from '@/lib/api-config';

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

/* VistA HL7/HLO Telemetry types (Phase 21) */
interface HL7Link {
  ien: number;
  name: string;
  type: string;
  state: string;
  device: string;
  port: string;
}

interface InteropSummary {
  ok: boolean;
  source: string;
  elapsedMs: number;
  hl7: {
    linkCount: number;
    linkSample: HL7Link[];
    messageStats: {
      total: number;
      outbound: number;
      inbound: number;
      completed: number;
      errors: number;
      pending: number;
      lookbackHours: number;
    };
  };
  hlo: {
    domain: string;
    mode: string;
    appCount: number;
  };
  queues: {
    hl7Messages: { total: number; pending: number; errors: number };
    hloMessages: { total: number };
    monitorJobs: { count: number };
  };
  rpcsUsed: string[];
  vistaFiles: string[];
  timestamp: string;
}

/* Phase 58: HL7 Message Browser types */
interface HL7MessageRow {
  ien: number;
  direction: string;
  directionLabel: string;
  status: string;
  statusLabel: string;
  linkIen: number;
  date: string;
  textIen: number;
}

interface HL7MessageSegment {
  type: string;
  count: number;
  masked: boolean;
}

interface HL7MessageDetail {
  ien: number;
  direction: string;
  directionLabel: string;
  status: string;
  statusLabel: string;
  linkIen: number;
  date: string;
  textIen: number;
  segments: HL7MessageSegment[];
  totalSegments: number;
}

interface MessageDetailResponse {
  ok: boolean;
  masked: boolean;
  maskNote?: string;
  unmaskedBy?: string;
  unmaskedAt?: string;
  reason?: string;
  detail: HL7MessageDetail;
  rpc: string;
  rpcsUsed: string[];
  vistaFiles: string;
  timestamp: string;
}

/* ------------------------------------------------------------------ */
/* Type labels                                                         */
/* ------------------------------------------------------------------ */

const TYPE_LABELS: Record<string, string> = {
  'vista-rpc': 'VistA RPC',
  fhir: 'FHIR R4',
  'fhir-c0fhir': 'C0FHIR Suite',
  'fhir-vpr': 'VPR FHIR',
  dicom: 'DICOM',
  dicomweb: 'DICOMweb',
  hl7v2: 'HL7v2',
  lis: 'Lab System',
  'pacs-vna': 'PACS/VNA',
  device: 'Device',
  external: 'External',
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function IntegrationsPage() {
  const { hasRole } = useSession();
  const [tab, setTab] = useState<
    'registry' | 'legacy' | 'onboard' | 'hl7hlo' | 'msgbrowser' | 'hybrids'
  >('registry');
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [probing, setProbing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedError, setSelectedError] = useState<string | null>(null);
  const [errorLogEntries, setErrorLogEntries] = useState<Integration['errorLog']>([]);

  // Phase 541: VA GUI Hybrids state
  const [hybridsData, setHybridsData] = useState<{
    ok: boolean;
    summary: {
      totalHybrids: number;
      avgMigrationReadiness: number;
      totalRpcOverlap: number;
      totalRpcGap: number;
    };
    systems: {
      id: string;
      name: string;
      agency: string;
      category: string;
      hostPlatform: string;
      deploymentModel: string;
      migrationStrategy: string;
      surfaceCount: number;
      coveredSurfaces: number;
      rpcOverlapCount: number;
      rpcGapCount: number;
      capabilityOverlapCount: number;
      migrationReadiness: number;
    }[];
  } | null>(null);
  const [hybridsLoading, setHybridsLoading] = useState(false);
  const [hybridsError, setHybridsError] = useState<string | null>(null);

  // VistA HL7/HLO telemetry state (Phase 21)
  const [interopSummary, setInteropSummary] = useState<InteropSummary | null>(null);
  const [interopLoading, setInteropLoading] = useState(false);
  const [interopError, setInteropError] = useState<string | null>(null);
  const [interopLastFetch, setInteropLastFetch] = useState<Date | null>(null);

  // Phase 58: HL7 Message Browser state
  const [msgList, setMsgList] = useState<HL7MessageRow[]>([]);
  const [msgListLoading, setMsgListLoading] = useState(false);
  const [msgListError, setMsgListError] = useState<string | null>(null);
  const [msgDirFilter, setMsgDirFilter] = useState<string>('*');
  const [msgStatusFilter, setMsgStatusFilter] = useState<string>('*');
  const [msgLimit, setMsgLimit] = useState<string>('50');
  const [selectedMsgIen, setSelectedMsgIen] = useState<number | null>(null);
  const [msgDetail, setMsgDetail] = useState<MessageDetailResponse | null>(null);
  const [msgDetailLoading, setMsgDetailLoading] = useState(false);
  const [unmaskReason, setUnmaskReason] = useState('');
  const [unmaskLoading, setUnmaskLoading] = useState(false);
  const [unmaskError, setUnmaskError] = useState<string | null>(null);

  // Device onboarding form state
  const [deviceForm, setDeviceForm] = useState({
    id: '',
    label: '',
    host: '',
    port: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    modalityCode: '',
    aeTitle: '',
    location: '',
  });
  const [onboardMsg, setOnboardMsg] = useState<string | null>(null);

  const tenantId = 'default';

  /* -- Fetchers ---------------------------------------------------- */

  const fetchRegistry = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/registry/${tenantId}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setIntegrations(data.integrations);
    } catch {
      /* ignore */
    }
  }, [tenantId]);

  const fetchHealthSummary = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/registry/${tenantId}/health-summary`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) setHealthSummary(data.summary);
    } catch {
      /* ignore */
    }
  }, [tenantId]);

  const fetchConnectors = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/integrations/${tenantId}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) setConnectors(data.connectors);
    } catch {
      /* ignore */
    }
  }, [tenantId]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchRegistry(), fetchHealthSummary(), fetchConnectors()]);
    setLoading(false);
  }, [fetchRegistry, fetchHealthSummary, fetchConnectors]);

  /** Fetch VistA HL7/HLO interop telemetry (Phase 21) */
  const fetchInteropSummary = useCallback(async () => {
    setInteropLoading(true);
    setInteropError(null);
    try {
      const res = await fetch(`${API_BASE}/vista/interop/summary`, {
        credentials: 'include',
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json();
      if (data.ok) {
        setInteropSummary(data as InteropSummary);
        setInteropLastFetch(new Date());
      } else {
        setInteropError(data.error || 'Failed to fetch interop telemetry');
      }
    } catch (e: unknown) {
      setInteropError((e as Error).message || 'Network error');
    } finally {
      setInteropLoading(false);
    }
  }, []);

  /** Phase 58: Fetch HL7 message list with filters */
  const fetchMsgList = useCallback(async () => {
    setMsgListLoading(true);
    setMsgListError(null);
    try {
      const params = new URLSearchParams();
      if (msgDirFilter !== '*') params.set('direction', msgDirFilter);
      if (msgStatusFilter !== '*') params.set('status', msgStatusFilter);
      params.set('limit', msgLimit);
      const res = await fetch(`${API_BASE}/vista/interop/v2/hl7/messages?${params.toString()}`, {
        credentials: 'include',
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json();
      if (data.ok && data.available) {
        setMsgList(data.messages || []);
      } else if (data.ok && !data.available) {
        setMsgListError(data.message || 'HL7 message data not available');
        setMsgList([]);
      } else {
        setMsgListError(data.error || 'Failed to fetch messages');
      }
    } catch (e: unknown) {
      setMsgListError((e as Error).message || 'Network error');
    } finally {
      setMsgListLoading(false);
    }
  }, [msgDirFilter, msgStatusFilter, msgLimit]);

  /** Phase 58: Fetch single message detail (masked) */
  const fetchMsgDetail = useCallback(async (ien: number) => {
    setSelectedMsgIen(ien);
    setMsgDetailLoading(true);
    setMsgDetail(null);
    setUnmaskReason('');
    setUnmaskError(null);
    try {
      const res = await fetch(`${API_BASE}/vista/interop/v2/hl7/messages/${ien}`, {
        credentials: 'include',
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      if (data.ok) {
        setMsgDetail(data as MessageDetailResponse);
      } else {
        setMsgDetail(null);
      }
    } catch {
      setMsgDetail(null);
    } finally {
      setMsgDetailLoading(false);
    }
  }, []);

  /** Phase 58: Unmask a message detail (admin only, audited) */
  const handleUnmask = useCallback(async () => {
    if (!selectedMsgIen || unmaskReason.length < 10) {
      setUnmaskError('Reason must be at least 10 characters');
      return;
    }
    setUnmaskLoading(true);
    setUnmaskError(null);
    try {
      const res = await fetch(
        `${API_BASE}/vista/interop/v2/hl7/messages/${selectedMsgIen}/unmask`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
          body: JSON.stringify({ reason: unmaskReason }),
          signal: AbortSignal.timeout(15000),
        }
      );
      const data = await res.json();
      if (data.ok) {
        setMsgDetail(data as MessageDetailResponse);
      } else {
        setUnmaskError(data.error || 'Unmask failed');
      }
    } catch (e: unknown) {
      setUnmaskError((e as Error).message || 'Network error');
    } finally {
      setUnmaskLoading(false);
    }
  }, [selectedMsgIen, unmaskReason]);

  useEffect(() => {
    if (hasRole('admin')) {
      fetchAll();
      fetchInteropSummary();
    } else {
      setLoading(false);
    }
  }, [hasRole, fetchAll, fetchInteropSummary]);

  /* -- Actions ----------------------------------------------------- */

  async function handleProbeAll() {
    setProbing(true);
    setError(null);
    try {
      await fetch(`${API_BASE}/admin/registry/${tenantId}/probe-all`, {
        method: 'POST',
        credentials: 'include',
        headers: { ...csrfHeaders() },
      });
      // Also probe legacy connectors
      await fetch(`${API_BASE}/admin/integrations/${tenantId}/probe`, {
        method: 'POST',
        credentials: 'include',
        headers: { ...csrfHeaders() },
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
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ enabled }),
      });
      await fetchRegistry();
      await fetchHealthSummary();
    } catch {
      /* ignore */
    }
  }

  async function handleProbeSingle(integrationId: string) {
    try {
      await fetch(`${API_BASE}/admin/registry/${tenantId}/${integrationId}/probe`, {
        method: 'POST',
        credentials: 'include',
        headers: { ...csrfHeaders() },
      });
      await fetchRegistry();
      await fetchHealthSummary();
    } catch {
      /* ignore */
    }
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
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ ...deviceForm, port: Number(deviceForm.port) }),
      });
      const data = await res.json();
      if (data.ok) {
        setOnboardMsg(`Device "${deviceForm.label}" onboarded successfully`);
        setDeviceForm({
          id: '',
          label: '',
          host: '',
          port: '',
          manufacturer: '',
          model: '',
          serialNumber: '',
          modalityCode: '',
          aeTitle: '',
          location: '',
        });
        await fetchAll();
      } else {
        setOnboardMsg(data.error || 'Onboarding failed');
      }
    } catch (e: unknown) {
      setOnboardMsg((e as Error).message);
    }
  }

  /* -- Helpers ----------------------------------------------------- */

  const statusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return '#16a34a';
      case 'disconnected':
        return '#dc2626';
      case 'degraded':
        return '#d97706';
      case 'disabled':
        return '#9ca3af';
      default:
        return '#6b7280';
    }
  };

  /* -- Render ------------------------------------------------------ */

  if (!hasRole('admin')) {
    return (
      <div
        className={styles.shell}
        style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}
      >
        <div className={styles.menuBar}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>EHR &mdash; Evolved</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--cprs-text-muted)' }}>
            Admin &rarr; Integrations
          </span>
        </div>
        <div style={{ flex: 1, padding: 24 }}>
          <p style={{ color: 'var(--cprs-text-muted)' }}>Access denied. Admin role required.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={styles.shell}
      style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}
    >
      <div className={styles.menuBar}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>EHR &mdash; Evolved</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--cprs-text-muted)' }}>
          Admin &rarr; Integration Console
        </span>
      </div>

      <div style={{ flex: 1, padding: 24, maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        {/* -- Health Summary Bar -------------------------------------- */}
        {healthSummary && (
          <div
            style={{
              display: 'flex',
              gap: 16,
              marginBottom: 16,
              padding: '10px 16px',
              background: 'var(--cprs-bg)',
              border: '1px solid var(--cprs-border)',
              borderRadius: 6,
              fontSize: 12,
            }}
          >
            <span>
              <strong>{healthSummary.total}</strong> total
            </span>
            <span>
              <strong>{healthSummary.enabled}</strong> enabled
            </span>
            <span style={{ color: '#16a34a' }}>
              <strong>{healthSummary.connected}</strong> connected
            </span>
            <span style={{ color: '#dc2626' }}>
              <strong>{healthSummary.disconnected}</strong> disconnected
            </span>
            <span style={{ color: '#d97706' }}>
              <strong>{healthSummary.degraded}</strong> degraded
            </span>
            <span style={{ color: '#6b7280' }}>
              <strong>{healthSummary.unknown}</strong> unknown
            </span>
            <span style={{ color: '#9ca3af' }}>
              <strong>{healthSummary.disabled}</strong> disabled
            </span>
          </div>
        )}

        {/* -- Tab Nav ------------------------------------------------ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          {(['registry', 'hl7hlo', 'msgbrowser', 'onboard', 'legacy', 'hybrids'] as const).map(
            (t) => (
              <button
                key={t}
                className={styles.btn}
                onClick={() => setTab(t)}
                style={{
                  fontSize: 12,
                  fontWeight: tab === t ? 600 : 400,
                  borderBottom:
                    tab === t ? '2px solid var(--cprs-primary)' : '2px solid transparent',
                  borderRadius: 0,
                }}
              >
                {t === 'registry'
                  ? 'Integration Registry'
                  : t === 'hl7hlo'
                    ? 'VistA HL7/HLO'
                    : t === 'msgbrowser'
                      ? 'Message Browser'
                      : t === 'onboard'
                        ? 'Device Onboarding'
                        : t === 'hybrids'
                          ? 'GUI Hybrids'
                          : 'Legacy Connectors'}
              </button>
            )
          )}
          <div style={{ flex: 1 }} />
          <button
            className={styles.btn}
            onClick={handleProbeAll}
            disabled={probing}
            style={{ fontSize: 12 }}
          >
            {probing ? 'Probing...' : 'Probe All'}
          </button>
        </div>

        {error && (
          <p style={{ color: 'var(--cprs-danger)', fontSize: 12, marginBottom: 8 }}>{error}</p>
        )}

        {/* -- Registry Tab ------------------------------------------- */}
        {tab === 'registry' && (
          <>
            {loading ? (
              <p style={{ fontSize: 12, color: 'var(--cprs-text-muted)' }}>Loading...</p>
            ) : integrations.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--cprs-text-muted)' }}>
                No integrations in registry. Default entries seeded on API start.
              </p>
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
                        {i.notes && (
                          <span style={{ fontSize: 10, color: 'var(--cprs-text-muted)' }}>
                            {i.notes.slice(0, 60)}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <span
                          style={{
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: 'var(--cprs-bg)',
                            fontSize: 11,
                          }}
                        >
                          {TYPE_LABELS[i.type] || i.type}
                        </span>
                      </td>
                      <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: 11 }}>
                        {i.host}:{i.port}
                        {i.basePath}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={i.enabled}
                          onChange={(e) => handleToggle(i.id, e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#fff',
                            background: statusColor(i.status),
                          }}
                        >
                          {i.status}
                        </span>
                      </td>
                      <td
                        style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}
                      >
                        {i.queueMetrics.pending > 0 ? i.queueMetrics.pending : '-'}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                        {i.errorLog.length > 0 ? (
                          <button
                            className={styles.btn}
                            onClick={() => viewErrorLog(i)}
                            style={{ fontSize: 11, color: '#dc2626', padding: '1px 6px' }}
                          >
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
                        <button
                          className={styles.btn}
                          onClick={() => handleProbeSingle(i.id)}
                          style={{ fontSize: 11, padding: '2px 8px' }}
                        >
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
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  border: '1px solid var(--cprs-border)',
                  borderRadius: 6,
                  background: 'var(--cprs-bg)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <strong style={{ fontSize: 13 }}>Error Log: {selectedError}</strong>
                  <button
                    className={styles.btn}
                    onClick={() => setSelectedError(null)}
                    style={{ fontSize: 11 }}
                  >
                    Close
                  </button>
                </div>
                {errorLogEntries.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--cprs-text-muted)' }}>
                    No errors recorded.
                  </p>
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
                          <td style={{ padding: '4px', fontFamily: 'monospace' }}>
                            {new Date(e.timestamp).toLocaleString()}
                          </td>
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

        {/* -- Device Onboarding Tab ---------------------------------- */}
        {tab === 'onboard' && (
          <div style={{ maxWidth: 600 }}>
            <h3 style={{ fontSize: 14, margin: '0 0 12px' }}>Onboard New Device / Modality</h3>
            <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', margin: '0 0 12px' }}>
              Register a new DICOM modality, bedside device, or lab instrument. Config-not-code:
              devices are configured entries, not hard-coded.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(
                [
                  'id',
                  'label',
                  'host',
                  'port',
                  'manufacturer',
                  'model',
                  'serialNumber',
                  'modalityCode',
                  'aeTitle',
                  'location',
                ] as const
              ).map((field) => (
                <label key={field} style={{ display: 'block', fontSize: 12 }}>
                  <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>
                    {field.replace(/([A-Z])/g, ' $1').trim()}
                    {[
                      'id',
                      'label',
                      'host',
                      'port',
                      'manufacturer',
                      'model',
                      'modalityCode',
                    ].includes(field) && ' *'}
                  </span>
                  <input
                    value={deviceForm[field]}
                    onChange={(e) => setDeviceForm({ ...deviceForm, [field]: e.target.value })}
                    placeholder={
                      field === 'modalityCode'
                        ? 'CT, MR, US, XR, CR, ECG...'
                        : field === 'port'
                          ? '104'
                          : ''
                    }
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '4px 6px',
                      fontSize: 12,
                      border: '1px solid var(--cprs-border)',
                      borderRadius: 3,
                      marginTop: 2,
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
              <p
                style={{
                  fontSize: 12,
                  marginTop: 8,
                  color: onboardMsg.includes('successfully') ? '#16a34a' : '#dc2626',
                }}
              >
                {onboardMsg}
              </p>
            )}
          </div>
        )}

        {/* -- Legacy Connectors Tab ---------------------------------- */}
        {tab === 'legacy' && (
          <>
            <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', marginBottom: 8 }}>
              Phase 17F legacy connector view. These are the original ConnectorConfig entries from
              tenant config.
            </p>
            {connectors.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--cprs-text-muted)' }}>
                No legacy connectors configured.
              </p>
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
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#fff',
                            background: statusColor(c.status),
                          }}
                        >
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

        {/* -- VA GUI Hybrids Tab (Phase 541) --------------------------- */}
        {tab === 'hybrids' && (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <div>
                <h3 style={{ fontSize: 14, margin: 0 }}>VA/IHS GUI Hybrids Capability Map</h3>
                <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', margin: '2px 0 0' }}>
                  Cross-reference of desktop GUI apps and VistA-Evolved feature overlap.
                </p>
              </div>
              <button
                className={styles.btn}
                style={{ fontSize: 11 }}
                onClick={async () => {
                  setHybridsLoading(true);
                  setHybridsError(null);
                  try {
                    const r = await fetch(`${API_BASE}/vista/hybrids/summary`, {
                      credentials: 'include',
                    });
                    if (r.ok) {
                      setHybridsData(await r.json());
                    } else {
                      setHybridsError(`Failed to load hybrids map (${r.status})`);
                    }
                  } catch (e: any) {
                    setHybridsError(e.message || 'Network error loading hybrids map');
                  } finally {
                    setHybridsLoading(false);
                  }
                }}
              >
                {hybridsLoading ? 'Loading...' : 'Load Hybrids Map'}
              </button>
            </div>
            {hybridsError && (
              <div
                style={{
                  padding: '8px 12px',
                  background: '#fee2e2',
                  color: '#991b1b',
                  borderRadius: 6,
                  fontSize: 12,
                  marginBottom: 12,
                }}
              >
                {hybridsError}
              </div>
            )}
            {hybridsData?.summary && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    background: 'var(--cprs-bg-alt)',
                    padding: 10,
                    borderRadius: 6,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 20, fontWeight: 700 }}>
                    {hybridsData.summary.totalHybrids}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--cprs-text-muted)' }}>Total Systems</div>
                </div>
                <div
                  style={{
                    background: 'var(--cprs-bg-alt)',
                    padding: 10,
                    borderRadius: 6,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 20, fontWeight: 700 }}>
                    {hybridsData.summary.avgMigrationReadiness}%
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--cprs-text-muted)' }}>Avg Readiness</div>
                </div>
                <div
                  style={{
                    background: 'var(--cprs-bg-alt)',
                    padding: 10,
                    borderRadius: 6,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#16a34a' }}>
                    {hybridsData.summary.totalRpcOverlap}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--cprs-text-muted)' }}>
                    RPCs Overlapping
                  </div>
                </div>
                <div
                  style={{
                    background: 'var(--cprs-bg-alt)',
                    padding: 10,
                    borderRadius: 6,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#dc2626' }}>
                    {hybridsData.summary.totalRpcGap}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--cprs-text-muted)' }}>RPCs Gap</div>
                </div>
              </div>
            )}
            {hybridsData?.systems && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--cprs-border)' }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>System</th>
                    <th style={{ textAlign: 'center', padding: '6px 8px' }}>Platform</th>
                    <th style={{ textAlign: 'center', padding: '6px 8px' }}>Deploy</th>
                    <th style={{ textAlign: 'center', padding: '6px 8px' }}>Strategy</th>
                    <th style={{ textAlign: 'center', padding: '6px 8px' }}>Surfaces</th>
                    <th style={{ textAlign: 'center', padding: '6px 8px' }}>RPC +/-</th>
                    <th style={{ textAlign: 'center', padding: '6px 8px' }}>Readiness</th>
                  </tr>
                </thead>
                <tbody>
                  {hybridsData.systems.map((h) => (
                    <tr key={h.id} style={{ borderBottom: '1px solid var(--cprs-border)' }}>
                      <td style={{ padding: '6px 8px' }}>
                        <div style={{ fontWeight: 500 }}>{h.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--cprs-text-muted)' }}>
                          {h.agency?.toUpperCase()}
                        </div>
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: 10,
                            background: 'var(--cprs-bg-alt)',
                            padding: '2px 6px',
                            borderRadius: 8,
                          }}
                        >
                          {h.hostPlatform}
                        </span>
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', fontSize: 11 }}>
                        {h.deploymentModel}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 8,
                            fontWeight: 600,
                            background:
                              h.migrationStrategy === 'replace'
                                ? '#dcfce7'
                                : h.migrationStrategy === 'wrap'
                                  ? '#fef9c3'
                                  : h.migrationStrategy === 'deprecate'
                                    ? '#fee2e2'
                                    : '#e0e7ff',
                            color:
                              h.migrationStrategy === 'replace'
                                ? '#166534'
                                : h.migrationStrategy === 'wrap'
                                  ? '#854d0e'
                                  : h.migrationStrategy === 'deprecate'
                                    ? '#991b1b'
                                    : '#3730a3',
                          }}
                        >
                          {h.migrationStrategy}
                        </span>
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', fontSize: 11 }}>
                        {h.coveredSurfaces}/{h.surfaceCount}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', fontSize: 11 }}>
                        <span style={{ color: '#16a34a' }}>+{h.rpcOverlapCount}</span>
                        {' / '}
                        <span style={{ color: '#dc2626' }}>-{h.rpcGapCount}</span>
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            justifyContent: 'center',
                          }}
                        >
                          <div
                            style={{
                              width: 60,
                              height: 6,
                              background: '#e5e7eb',
                              borderRadius: 3,
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${h.migrationReadiness}%`,
                                height: '100%',
                                borderRadius: 3,
                                background:
                                  h.migrationReadiness >= 60
                                    ? '#16a34a'
                                    : h.migrationReadiness >= 30
                                      ? '#d97706'
                                      : '#dc2626',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600 }}>
                            {h.migrationReadiness}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!hybridsData && !hybridsLoading && (
              <p style={{ fontSize: 12, color: 'var(--cprs-text-muted)' }}>
                Click &quot;Load Hybrids Map&quot; to view the cross-reference data.
              </p>
            )}
          </>
        )}

        {/* -- VistA HL7/HLO Telemetry Tab (Phase 21) ------------------ */}
        {tab === 'hl7hlo' && (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <div>
                <h3 style={{ fontSize: 14, margin: 0 }}>VistA HL7 / HLO Interop Telemetry</h3>
                <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', margin: '2px 0 0' }}>
                  Real-time data from VistA globals via ZVEMIOP M routine v1.1 (read-only RPCs).
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {interopLastFetch && (
                  <span style={{ fontSize: 10, color: 'var(--cprs-text-muted)' }}>
                    Last: {interopLastFetch.toLocaleTimeString()}
                  </span>
                )}
                <button
                  className={styles.btn}
                  onClick={fetchInteropSummary}
                  disabled={interopLoading}
                  style={{ fontSize: 12 }}
                >
                  {interopLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>

            {interopError && (
              <p style={{ color: 'var(--cprs-danger)', fontSize: 12, marginBottom: 8 }}>
                {interopError}
              </p>
            )}

            {interopLoading && !interopSummary && (
              <p style={{ fontSize: 12, color: 'var(--cprs-text-muted)' }}>
                Fetching VistA telemetry...
              </p>
            )}

            {interopSummary && (
              <>
                {/* Summary Cards */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  {/* HLO System */}
                  <div
                    style={{
                      padding: 12,
                      border: '1px solid var(--cprs-border)',
                      borderRadius: 6,
                      background: 'var(--cprs-bg)',
                    }}
                  >
                    <div style={{ fontSize: 11, color: 'var(--cprs-text-muted)', marginBottom: 4 }}>
                      HLO Engine
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{interopSummary.hlo.mode}</div>
                    <div style={{ fontSize: 11, color: 'var(--cprs-text-muted)', marginTop: 2 }}>
                      Domain:{' '}
                      <span style={{ fontFamily: 'monospace' }}>{interopSummary.hlo.domain}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--cprs-text-muted)' }}>
                      Registered Apps: <strong>{interopSummary.hlo.appCount}</strong>
                    </div>
                  </div>

                  {/* HL7 Links */}
                  <div
                    style={{
                      padding: 12,
                      border: '1px solid var(--cprs-border)',
                      borderRadius: 6,
                      background: 'var(--cprs-bg)',
                    }}
                  >
                    <div style={{ fontSize: 11, color: 'var(--cprs-text-muted)', marginBottom: 4 }}>
                      HL7 Logical Links
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>
                      {interopSummary.hl7.linkCount}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--cprs-text-muted)', marginTop: 2 }}>
                      From file #870 (HL LOGICAL LINK)
                    </div>
                  </div>

                  {/* Message Stats */}
                  <div
                    style={{
                      padding: 12,
                      border: '1px solid var(--cprs-border)',
                      borderRadius: 6,
                      background: 'var(--cprs-bg)',
                    }}
                  >
                    <div style={{ fontSize: 11, color: 'var(--cprs-text-muted)', marginBottom: 4 }}>
                      HL7 Messages ({interopSummary.hl7.messageStats.lookbackHours}h)
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>
                      {interopSummary.hl7.messageStats.total}
                    </div>
                    <div style={{ fontSize: 11, display: 'flex', gap: 8, marginTop: 2 }}>
                      <span style={{ color: '#16a34a' }}>
                        {interopSummary.hl7.messageStats.completed} completed
                      </span>
                      <span style={{ color: '#d97706' }}>
                        {interopSummary.hl7.messageStats.pending} pending
                      </span>
                      <span style={{ color: '#dc2626' }}>
                        {interopSummary.hl7.messageStats.errors} errors
                      </span>
                    </div>
                  </div>

                  {/* Queue Depth */}
                  <div
                    style={{
                      padding: 12,
                      border: '1px solid var(--cprs-border)',
                      borderRadius: 6,
                      background: 'var(--cprs-bg)',
                    }}
                  >
                    <div style={{ fontSize: 11, color: 'var(--cprs-text-muted)', marginBottom: 4 }}>
                      Queue Depth
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>
                      {interopSummary.queues.hl7Messages.total +
                        interopSummary.queues.hloMessages.total}
                    </div>
                    <div style={{ fontSize: 11, display: 'flex', gap: 8, marginTop: 2 }}>
                      <span>{interopSummary.queues.hl7Messages.pending} pending</span>
                      <span
                        style={{
                          color:
                            interopSummary.queues.hl7Messages.errors > 0 ? '#dc2626' : 'inherit',
                        }}
                      >
                        {interopSummary.queues.hl7Messages.errors} errors
                      </span>
                      <span>{interopSummary.queues.monitorJobs.count} monitor jobs</span>
                    </div>
                  </div>
                </div>

                {/* RPC / elapsed info */}
                <div
                  style={{
                    display: 'flex',
                    gap: 16,
                    marginBottom: 12,
                    fontSize: 11,
                    color: 'var(--cprs-text-muted)',
                  }}
                >
                  <span>
                    Fetched in <strong>{interopSummary.elapsedMs}ms</strong>
                  </span>
                  <span>RPCs: {interopSummary.rpcsUsed.length}</span>
                  <span>VistA files: {interopSummary.vistaFiles.join(', ')}</span>
                </div>

                {/* HL7 Logical Links Table */}
                <h4 style={{ fontSize: 13, margin: '0 0 8px' }}>HL7 Logical Links (sample)</h4>
                {interopSummary.hl7.linkSample.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--cprs-text-muted)' }}>
                    No links available.
                  </p>
                ) : (
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: 12,
                      marginBottom: 12,
                    }}
                  >
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--cprs-border)' }}>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>IEN</th>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>Name</th>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>Type</th>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>State</th>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>Device</th>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>Port</th>
                      </tr>
                    </thead>
                    <tbody>
                      {interopSummary.hl7.linkSample.map((link) => (
                        <tr key={link.ien} style={{ borderBottom: '1px solid var(--cprs-border)' }}>
                          <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>
                            {link.ien}
                          </td>
                          <td style={{ padding: '4px 8px', fontWeight: 500 }}>{link.name}</td>
                          <td style={{ padding: '4px 8px' }}>
                            <span
                              style={{
                                padding: '1px 6px',
                                borderRadius: 4,
                                background: 'var(--cprs-bg)',
                                fontSize: 11,
                              }}
                            >
                              {link.type}
                            </span>
                          </td>
                          <td style={{ padding: '4px 8px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '1px 6px',
                                borderRadius: 10,
                                fontSize: 10,
                                fontWeight: 600,
                                color: '#fff',
                                background:
                                  link.state === 'active'
                                    ? '#16a34a'
                                    : link.state === 'error'
                                      ? '#dc2626'
                                      : '#6b7280',
                              }}
                            >
                              {link.state}
                            </span>
                          </td>
                          <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 11 }}>
                            {link.device || '-'}
                          </td>
                          <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 11 }}>
                            {link.port || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* RPCs Used */}
                <div
                  style={{
                    padding: 10,
                    background: 'var(--cprs-bg)',
                    border: '1px solid var(--cprs-border)',
                    borderRadius: 6,
                    fontSize: 11,
                  }}
                >
                  <strong>RPCs used:</strong>{' '}
                  {interopSummary.rpcsUsed.map((rpc, i) => (
                    <span key={rpc}>
                      <code
                        style={{
                          fontSize: 10,
                          background: 'rgba(0,0,0,0.05)',
                          padding: '1px 4px',
                          borderRadius: 3,
                        }}
                      >
                        {rpc}
                      </code>
                      {i < interopSummary.rpcsUsed.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                  <span style={{ marginLeft: 8, color: 'var(--cprs-text-muted)' }}>
                    M routine: ZVEMIOP
                  </span>
                </div>
              </>
            )}
          </>
        )}

        {/* -- HL7 Message Browser Tab (Phase 58) ------------------- */}
        {tab === 'msgbrowser' && (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <div>
                <h3 style={{ fontSize: 14, margin: 0 }}>HL7 Message Browser</h3>
                <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', margin: '2px 0 0' }}>
                  Browse individual HL7 messages from VistA file #773. PHI segments masked by
                  default.
                </p>
              </div>
            </div>

            {/* Filters */}
            <div
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                marginBottom: 12,
                padding: '8px 12px',
                background: 'var(--cprs-bg)',
                border: '1px solid var(--cprs-border)',
                borderRadius: 6,
                fontSize: 12,
              }}
            >
              <label>
                Direction:{' '}
                <select
                  value={msgDirFilter}
                  onChange={(e) => setMsgDirFilter(e.target.value)}
                  style={{
                    fontSize: 12,
                    padding: '2px 4px',
                    border: '1px solid var(--cprs-border)',
                    borderRadius: 3,
                  }}
                >
                  <option value="*">All</option>
                  <option value="I">Inbound</option>
                  <option value="O">Outbound</option>
                </select>
              </label>
              <label>
                Status:{' '}
                <select
                  value={msgStatusFilter}
                  onChange={(e) => setMsgStatusFilter(e.target.value)}
                  style={{
                    fontSize: 12,
                    padding: '2px 4px',
                    border: '1px solid var(--cprs-border)',
                    borderRadius: 3,
                  }}
                >
                  <option value="*">All</option>
                  <option value="D">Done</option>
                  <option value="E">Error</option>
                  <option value="P">Pending</option>
                </select>
              </label>
              <label>
                Limit:{' '}
                <select
                  value={msgLimit}
                  onChange={(e) => setMsgLimit(e.target.value)}
                  style={{
                    fontSize: 12,
                    padding: '2px 4px',
                    border: '1px solid var(--cprs-border)',
                    borderRadius: 3,
                  }}
                >
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </label>
              <button
                className={styles.btn}
                onClick={fetchMsgList}
                disabled={msgListLoading}
                style={{ fontSize: 12 }}
              >
                {msgListLoading ? 'Loading...' : 'Search'}
              </button>
            </div>

            {msgListError && (
              <p style={{ color: 'var(--cprs-danger)', fontSize: 12, marginBottom: 8 }}>
                {msgListError}
              </p>
            )}

            {/* Message List Table */}
            {msgList.length > 0 && (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 12,
                  marginBottom: 16,
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--cprs-border)' }}>
                    <th style={{ textAlign: 'left', padding: '4px 8px' }}>IEN</th>
                    <th style={{ textAlign: 'left', padding: '4px 8px' }}>Direction</th>
                    <th style={{ textAlign: 'left', padding: '4px 8px' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '4px 8px' }}>Link IEN</th>
                    <th style={{ textAlign: 'left', padding: '4px 8px' }}>Date</th>
                    <th style={{ textAlign: 'center', padding: '4px 8px' }}>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {msgList.map((msg) => (
                    <tr
                      key={msg.ien}
                      style={{
                        borderBottom: '1px solid var(--cprs-border)',
                        background:
                          selectedMsgIen === msg.ien ? 'rgba(59, 131, 246, 0.08)' : undefined,
                        cursor: 'pointer',
                      }}
                      onClick={() => fetchMsgDetail(msg.ien)}
                    >
                      <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>{msg.ien}</td>
                      <td style={{ padding: '4px 8px' }}>
                        <span
                          style={{
                            padding: '1px 6px',
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 600,
                            background:
                              msg.direction === 'I'
                                ? '#dbeafe'
                                : msg.direction === 'O'
                                  ? '#fef3c7'
                                  : '#f3f4f6',
                            color:
                              msg.direction === 'I'
                                ? '#1d4ed8'
                                : msg.direction === 'O'
                                  ? '#92400e'
                                  : '#6b7280',
                          }}
                        >
                          {msg.directionLabel || msg.direction}
                        </span>
                      </td>
                      <td style={{ padding: '4px 8px' }}>
                        <span
                          style={{
                            padding: '1px 6px',
                            borderRadius: 10,
                            fontSize: 10,
                            fontWeight: 600,
                            color: '#fff',
                            background:
                              msg.status === 'D'
                                ? '#16a34a'
                                : msg.status === 'E'
                                  ? '#dc2626'
                                  : msg.status === 'P'
                                    ? '#d97706'
                                    : '#6b7280',
                          }}
                        >
                          {msg.statusLabel || msg.status}
                        </span>
                      </td>
                      <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>
                        {msg.linkIen || '-'}
                      </td>
                      <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 11 }}>
                        {msg.date || '-'}
                      </td>
                      <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                        <button
                          className={styles.btn}
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchMsgDetail(msg.ien);
                          }}
                          style={{ fontSize: 10, padding: '1px 6px' }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {!msgListLoading && msgList.length === 0 && !msgListError && (
              <p style={{ fontSize: 12, color: 'var(--cprs-text-muted)', marginBottom: 16 }}>
                Click &quot;Search&quot; to load HL7 messages from VistA file #773.
              </p>
            )}

            {/* Message Detail Panel */}
            {selectedMsgIen && (
              <div
                style={{
                  padding: 16,
                  border: '1px solid var(--cprs-border)',
                  borderRadius: 6,
                  background: 'var(--cprs-bg)',
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <h4 style={{ fontSize: 13, margin: 0 }}>
                    Message Detail: IEN {selectedMsgIen}
                    {msgDetail?.masked && (
                      <span
                        style={{
                          marginLeft: 8,
                          padding: '2px 8px',
                          borderRadius: 10,
                          fontSize: 10,
                          fontWeight: 600,
                          background: '#fef3c7',
                          color: '#92400e',
                        }}
                      >
                        PHI MASKED
                      </span>
                    )}
                    {msgDetail && !msgDetail.masked && (
                      <span
                        style={{
                          marginLeft: 8,
                          padding: '2px 8px',
                          borderRadius: 10,
                          fontSize: 10,
                          fontWeight: 600,
                          background: '#fee2e2',
                          color: '#991b1b',
                        }}
                      >
                        UNMASKED
                      </span>
                    )}
                  </h4>
                  <button
                    className={styles.btn}
                    onClick={() => {
                      setSelectedMsgIen(null);
                      setMsgDetail(null);
                    }}
                    style={{ fontSize: 11 }}
                  >
                    Close
                  </button>
                </div>

                {msgDetailLoading && (
                  <p style={{ fontSize: 12, color: 'var(--cprs-text-muted)' }}>
                    Loading message detail...
                  </p>
                )}

                {msgDetail && (
                  <>
                    {/* Metadata grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: 8,
                        marginBottom: 12,
                        fontSize: 12,
                      }}
                    >
                      <div>
                        <strong>Direction:</strong>{' '}
                        {msgDetail.detail.directionLabel || msgDetail.detail.direction}
                      </div>
                      <div>
                        <strong>Status:</strong>{' '}
                        {msgDetail.detail.statusLabel || msgDetail.detail.status}
                      </div>
                      <div>
                        <strong>Link IEN:</strong> {msgDetail.detail.linkIen}
                      </div>
                      <div>
                        <strong>Date:</strong> {msgDetail.detail.date}
                      </div>
                      <div>
                        <strong>Text IEN (#772):</strong> {msgDetail.detail.textIen}
                      </div>
                      <div>
                        <strong>Total Segments:</strong> {msgDetail.detail.totalSegments}
                      </div>
                    </div>

                    {/* Segment type summary table */}
                    {msgDetail.detail.segments.length > 0 && (
                      <>
                        <h5 style={{ fontSize: 12, margin: '0 0 4px' }}>Segment Type Summary</h5>
                        <table
                          style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: 11,
                            marginBottom: 12,
                          }}
                        >
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--cprs-border)' }}>
                              <th style={{ textAlign: 'left', padding: '3px 6px' }}>
                                Segment Type
                              </th>
                              <th style={{ textAlign: 'right', padding: '3px 6px' }}>Count</th>
                              <th style={{ textAlign: 'center', padding: '3px 6px' }}>PHI</th>
                            </tr>
                          </thead>
                          <tbody>
                            {msgDetail.detail.segments.map((seg) => (
                              <tr
                                key={seg.type}
                                style={{ borderBottom: '1px solid var(--cprs-border)' }}
                              >
                                <td
                                  style={{
                                    padding: '3px 6px',
                                    fontFamily: 'monospace',
                                    fontWeight: 500,
                                    color: seg.masked ? '#92400e' : undefined,
                                  }}
                                >
                                  {seg.type}
                                </td>
                                <td style={{ padding: '3px 6px', textAlign: 'right' }}>
                                  {seg.count}
                                </td>
                                <td style={{ padding: '3px 6px', textAlign: 'center' }}>
                                  {seg.masked ? (
                                    <span
                                      style={{
                                        padding: '1px 4px',
                                        borderRadius: 3,
                                        fontSize: 9,
                                        background: '#fef3c7',
                                        color: '#92400e',
                                        fontWeight: 600,
                                      }}
                                    >
                                      MASKED
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--cprs-text-muted)' }}>-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    )}

                    {/* Mask note */}
                    {msgDetail.masked && msgDetail.maskNote && (
                      <p
                        style={{
                          fontSize: 11,
                          color: '#92400e',
                          background: '#fefce8',
                          padding: '6px 10px',
                          borderRadius: 4,
                          marginBottom: 12,
                        }}
                      >
                        {msgDetail.maskNote}
                      </p>
                    )}

                    {/* Unmask section (admin only) */}
                    {msgDetail.masked && hasRole('admin') && (
                      <div
                        style={{
                          padding: 12,
                          border: '1px solid #fcd34d',
                          borderRadius: 6,
                          background: '#fffbeb',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            marginBottom: 4,
                            color: '#92400e',
                          }}
                        >
                          Unmask PHI Segments
                        </div>
                        <p style={{ fontSize: 11, color: '#78350f', margin: '0 0 8px' }}>
                          Unmasking reveals PHI segment type flags. This action is audited and
                          requires a justification reason (min 10 chars).
                        </p>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <input
                            type="text"
                            placeholder="Enter reason for unmask (min 10 chars)..."
                            value={unmaskReason}
                            onChange={(e) => setUnmaskReason(e.target.value)}
                            style={{
                              flex: 1,
                              fontSize: 12,
                              padding: '4px 8px',
                              border: '1px solid #fcd34d',
                              borderRadius: 3,
                            }}
                          />
                          <button
                            className={styles.btn}
                            onClick={handleUnmask}
                            disabled={unmaskLoading || unmaskReason.length < 10}
                            style={{
                              fontSize: 11,
                              padding: '4px 12px',
                              background: '#f59e0b',
                              color: '#fff',
                              borderColor: '#d97706',
                            }}
                          >
                            {unmaskLoading ? 'Unmasking...' : 'Unmask'}
                          </button>
                        </div>
                        {unmaskError && (
                          <p style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>
                            {unmaskError}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Unmask confirmation banner */}
                    {!msgDetail.masked && msgDetail.unmaskedBy && (
                      <div
                        style={{
                          padding: 8,
                          border: '1px solid #fca5a5',
                          borderRadius: 6,
                          background: '#fef2f2',
                          fontSize: 11,
                          color: '#991b1b',
                        }}
                      >
                        <strong>Unmasked by:</strong> {msgDetail.unmaskedBy} at{' '}
                        {msgDetail.unmaskedAt}
                        <br />
                        <strong>Reason:</strong> {msgDetail.reason}
                      </div>
                    )}

                    {/* RPC info */}
                    <div style={{ marginTop: 8, fontSize: 10, color: 'var(--cprs-text-muted)' }}>
                      RPC: <code>{msgDetail.rpc}</code> | Files: {msgDetail.vistaFiles} |{' '}
                      {msgDetail.timestamp}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* -- Integration Architecture Note -------------------------- */}
        <div
          style={{
            marginTop: 24,
            padding: 12,
            background: 'var(--cprs-bg)',
            border: '1px solid var(--cprs-border)',
            borderRadius: 6,
            fontSize: 11,
            color: 'var(--cprs-text-muted)',
          }}
        >
          <strong>Integration Architecture (Phase 18 + Phase 21 + Phase 58):</strong>
          <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
            <li>
              <strong>VistA-first:</strong> VistA RPC Broker is always the primary connection
            </li>
            <li>
              <strong>FHIR:</strong> C0FHIR Suite (MUMPS-native FHIR R4) or external FHIR servers
            </li>
            <li>
              <strong>Imaging:</strong> VistA Imaging (MAG4) + PACS/VNA (Orthanc, dcm4chee) +
              DICOMweb + OHIF viewer
            </li>
            <li>
              <strong>HL7v2:</strong> MLLP feeds for ADT, ORM, ORU messages
            </li>
            <li>
              <strong>Devices:</strong> Config-not-code onboarding for DICOM modalities, LIS
              instruments, bedside monitors
            </li>
            <li>
              <strong>Probes:</strong> TCP socket (DICOM/HL7v2), HTTP (FHIR/DICOMweb), XWB (VistA
              RPC)
            </li>
            <li>
              <strong>HL7/HLO Telemetry (Phase 21):</strong> Real-time read from VistA globals via
              ZVEMIOP M routine -- files #870, #773, #772, #779.x, #778, #776
            </li>
            <li>
              <strong>Message Browser (Phase 58):</strong> Individual HL7 message list + detail from
              #773/#772 via VE INTEROP MSG LIST/DETAIL. PHI masking ON by default. Unmask requires
              admin + reason, audited.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
