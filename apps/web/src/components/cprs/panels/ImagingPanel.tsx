'use client';

import { useState, useEffect, useCallback } from 'react';
import { csrfHeaders } from '@/lib/csrf';
import styles from '../cprs.module.css';
import { API_BASE } from '@/lib/api-config';

interface Props {
  dfn: string;
}

interface ImagingStudy {
  studyId: string;
  studyDate: string;
  modality: string;
  description: string;
  imageCount: number;
  status: string;
  source: 'vista' | 'orthanc' | 'dicomweb' | 'pacs';
  studyInstanceUid?: string;
  linkedOrderId?: string;
  accessionNumber?: string;
  orderLinked?: boolean;
}

interface WorklistItem {
  id: string;
  patientDfn: string;
  patientName: string;
  accessionNumber: string;
  scheduledProcedure: string;
  modality: string;
  scheduledTime: string;
  facility: string;
  location: string;
  orderingProviderName: string;
  clinicalIndication: string;
  priority: 'routine' | 'stat' | 'urgent';
  status: string;
  linkedStudyUid: string | null;
  linkedOrthancStudyId: string | null;
  source: string;
}

interface ImagingStatus {
  ok: boolean;
  viewerEnabled: boolean;
  capabilities: {
    vistaImaging: { available: boolean; status: string };
    radiology: { available: boolean; status: string };
    orthanc?: { configured: boolean; url: string };
    ohifViewer?: { configured: boolean; url: string };
  };
  message: string;
}

type ModalityFilter = 'all' | 'CR' | 'CT' | 'MR' | 'US' | 'XR' | 'DX' | 'NM' | 'PT';
type ImagingTab = 'studies' | 'worklist' | 'orders' | 'capture' | 'devices' | 'audit';

/** Phase 24: Break-glass session info from API. */
interface BreakGlassInfo {
  id: string;
  reason: string;
  expiresAt: string;
  patientDfn: string;
}

/** Phase 24: Device registry entry from API. */
interface DeviceEntry {
  id: string;
  aeTitle: string;
  hostname: string;
  port: number;
  modality: string;
  description: string;
  status: 'active' | 'inactive' | 'testing' | 'decommissioned';
  tlsMode: string;
  facility: string;
  lastEchoAt: string | null;
  lastEchoSuccess: boolean | null;
}

/** Phase 24: Imaging audit entry from API. */
interface AuditEntry {
  id: string;
  seq: number;
  timestamp: string;
  action: string;
  outcome: string;
  actorName: string;
  actorRole: string;
  studyInstanceUid?: string;
  patientDfn?: string;
}

export default function ImagingPanel({ dfn }: Props) {
  const [activeTab, setActiveTab] = useState<ImagingTab>('studies');
  const [studies, setStudies] = useState<ImagingStudy[]>([]);
  const [worklist, setWorklist] = useState<WorklistItem[]>([]);
  const [status, setStatus] = useState<ImagingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ImagingStudy | null>(null);
  const [modalityFilter, setModalityFilter] = useState<ModalityFilter>('all');
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [_orderDialogOpen, _setOrderDialogOpen] = useState(false);

  // Phase 24: Break-glass state
  const [breakGlass, setBreakGlass] = useState<BreakGlassInfo | null>(null);
  const [breakGlassReason, setBreakGlassReason] = useState('');
  const [breakGlassLoading, setBreakGlassLoading] = useState(false);

  // Phase 24: Device registry state
  const [devices, setDevices] = useState<DeviceEntry[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);

  // Phase 24: Imaging audit state
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Phase 81: Report viewer state
  const [reportText, setReportText] = useState<string | null>(null);
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportPending, setReportPending] = useState<{ rpc: string; reason: string } | null>(null);
  const [viewerLink, setViewerLink] = useState<{
    url?: string;
    viewerType?: string;
    message: string;
    instructions?: string[];
  } | null>(null);

  // Phase 24: Session role (for showing admin tabs)
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchStudies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${API_BASE}/imaging/studies/${encodeURIComponent(dfn)}`, {
        credentials: 'include',
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setStudies(data.studies || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load imaging studies');
    } finally {
      setLoading(false);
    }
  }, [dfn]);

  const fetchStatus = useCallback(async () => {
    try {
      const resp = await fetch(`${API_BASE}/vista/imaging/status`, {
        credentials: 'include',
      });
      if (resp.ok) {
        setStatus(await resp.json());
      }
    } catch {
      // Status check is non-critical
    }
  }, []);

  const fetchWorklist = useCallback(async () => {
    try {
      const resp = await fetch(`${API_BASE}/imaging/worklist?patientDfn=${dfn}`, {
        credentials: 'include',
      });
      if (resp.ok) {
        const data = await resp.json();
        setWorklist(data.items || []);
      }
    } catch {
      // Worklist fetch is non-critical
    }
  }, [dfn]);

  // Phase 24: Check break-glass status
  const fetchBreakGlass = useCallback(async () => {
    try {
      const resp = await fetch(`${API_BASE}/security/break-glass/active`, {
        credentials: 'include',
      });
      if (resp.ok) {
        const data = await resp.json();
        const sessions = data.sessions || [];
        const active = sessions.find((s: any) => s.patientDfn === dfn);
        setBreakGlass(active || null);
      }
    } catch {
      // Non-critical
    }
  }, [dfn]);

  // Phase 24: Check if user is admin (for showing admin tabs)
  const fetchSessionRole = useCallback(async () => {
    try {
      const resp = await fetch(`${API_BASE}/auth/me`, {
        credentials: 'include',
      });
      if (resp.ok) {
        const data = await resp.json();
        setIsAdmin(data.session?.role === 'admin');
      }
    } catch {
      // Non-critical
    }
  }, []);

  // Phase 24: Fetch devices (admin only)
  const fetchDevices = useCallback(async () => {
    setDevicesLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/imaging/devices`, {
        credentials: 'include',
      });
      if (resp.ok) {
        const data = await resp.json();
        setDevices(data.devices || []);
      }
    } catch {
      // Non-critical
    } finally {
      setDevicesLoading(false);
    }
  }, []);

  // Phase 24: Fetch audit log (admin only)
  const fetchAuditLog = useCallback(async () => {
    setAuditLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/imaging/audit/events?limit=50`, {
        credentials: 'include',
      });
      if (resp.ok) {
        const data = await resp.json();
        setAuditEntries(data.entries || []);
      }
    } catch {
      // Non-critical
    } finally {
      setAuditLoading(false);
    }
  }, []);

  // Phase 81: Fetch radiology report for selected study
  const fetchReport = useCallback(async (studyId: string) => {
    setReportLoading(true);
    setReportText(null);
    setReportStatus(null);
    setReportPending(null);
    try {
      const resp = await fetch(`${API_BASE}/imaging/report/${encodeURIComponent(studyId)}`, {
        credentials: 'include',
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.available && data.reportText) {
          setReportText(data.reportText);
          setReportStatus(data.reportStatus || null);
        } else if (data.pendingTarget) {
          setReportPending({ rpc: data.pendingTarget.rpc, reason: data.pendingTarget.reason });
        } else {
          setReportPending({
            rpc: 'RA DETAILED REPORT',
            reason: 'No report data available for this study.',
          });
        }
      } else {
        setReportPending({
          rpc: 'RA DETAILED REPORT',
          reason: `Server returned HTTP ${resp.status}`,
        });
      }
    } catch {
      setReportPending({ rpc: 'RA DETAILED REPORT', reason: 'Failed to fetch report.' });
    } finally {
      setReportLoading(false);
    }
  }, []);

  // Phase 81: Fetch viewer link for selected study
  const fetchViewerLink = useCallback(async (studyId: string) => {
    setViewerLink(null);
    try {
      const resp = await fetch(`${API_BASE}/imaging/viewer-link/${encodeURIComponent(studyId)}`, {
        credentials: 'include',
      });
      if (resp.ok) {
        const data = await resp.json();
        setViewerLink({
          url: data.url,
          viewerType: data.viewerType,
          message: data.message,
          instructions: data.instructions,
        });
      } else {
        setViewerLink({
          message: `Server returned HTTP ${resp.status}`,
          instructions: ['Check API server status and authentication.'],
        });
      }
    } catch {
      setViewerLink({
        message: 'Failed to check viewer availability.',
        instructions: ['Check API server status.'],
      });
    }
  }, []);

  // Phase 24: Start break-glass access
  const startBreakGlass = useCallback(async () => {
    if (breakGlassReason.length < 10) return;
    setBreakGlassLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/security/break-glass/start`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ reason: breakGlassReason, patientDfn: dfn, ttlMinutes: 30 }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setBreakGlass(data.session);
        setBreakGlassReason('');
      }
    } catch (err: any) {
      setError('Failed to start break-glass access');
    } finally {
      setBreakGlassLoading(false);
    }
  }, [dfn, breakGlassReason]);

  // Phase 24: Stop break-glass access
  const stopBreakGlass = useCallback(async () => {
    if (!breakGlass) return;
    try {
      await fetch(`${API_BASE}/security/break-glass/stop`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ breakGlassId: breakGlass.id }),
      });
      setBreakGlass(null);
    } catch {
      // Non-critical
    }
  }, [breakGlass]);

  useEffect(() => {
    fetchStudies();
    fetchStatus();
    fetchWorklist();
    fetchBreakGlass();
    fetchSessionRole();
  }, [fetchStudies, fetchStatus, fetchWorklist, fetchBreakGlass, fetchSessionRole]);

  // Phase 24: Load admin data when admin tabs are selected
  useEffect(() => {
    if (activeTab === 'devices' && isAdmin && devices.length === 0) fetchDevices();
    if (activeTab === 'audit' && isAdmin && auditEntries.length === 0) fetchAuditLog();
  }, [activeTab, isAdmin, devices.length, auditEntries.length, fetchDevices, fetchAuditLog]);

  const openViewer = useCallback(async (study: ImagingStudy) => {
    const uid = study.studyInstanceUid || study.studyId;
    try {
      const resp = await fetch(`${API_BASE}/imaging/viewer?studyUid=${uid}`, {
        credentials: 'include',
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.viewer?.url) {
          setViewerUrl(data.viewer.url);
          setViewerOpen(true);
          return;
        }
      }
      // Fallback: try vista/imaging/viewer-url
      const resp2 = await fetch(`${API_BASE}/vista/imaging/viewer-url?studyUid=${uid}`, {
        credentials: 'include',
      });
      if (resp2.ok) {
        const data2 = await resp2.json();
        if (data2.viewer?.url) {
          setViewerUrl(data2.viewer.url);
          setViewerOpen(true);
          return;
        }
      }
      setError('No viewer URL available for this study');
    } catch (err: any) {
      setError('Failed to generate viewer URL');
    }
  }, []);

  const filteredStudies = studies.filter((s) => {
    if (modalityFilter === 'all') return true;
    return s.modality?.toUpperCase() === modalityFilter;
  });

  const modalities = [...new Set(studies.map((s) => s.modality?.toUpperCase()).filter(Boolean))];
  const vistaCount = studies.filter((s) => s.source === 'vista').length;
  const dicomwebCount = studies.filter((s) => s.source === 'dicomweb').length;
  const vistaAvailable = status?.capabilities?.vistaImaging?.available ?? false;

  return (
    <div>
      <div className={styles.panelTitle}>Imaging Studies</div>

      {/* Phase 24: Break-glass active banner */}
      {breakGlass && (
        <div
          style={{
            background: '#fef2f2',
            border: '2px solid #ef4444',
            borderRadius: 4,
            padding: '8px 12px',
            marginBottom: 8,
            fontSize: 11,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <strong style={{ color: '#dc2626' }}>⚠ BREAK-GLASS ACCESS ACTIVE</strong>
            <span style={{ marginLeft: 8, color: '#7f1d1d' }}>
              Reason: {breakGlass.reason} | Expires:{' '}
              {new Date(breakGlass.expiresAt).toLocaleTimeString()}
            </span>
          </div>
          <button
            onClick={stopBreakGlass}
            style={{
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              padding: '3px 10px',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            End Access
          </button>
        </div>
      )}

      {/* Phase 24: Tab bar with admin tabs */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: '1px solid var(--cprs-border)',
          marginBottom: 8,
        }}
      >
        {(['studies', 'worklist', 'orders', 'capture'] as ImagingTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '4px 12px',
              fontSize: 11,
              fontWeight: activeTab === tab ? 600 : 400,
              border: 'none',
              borderBottom:
                activeTab === tab
                  ? '2px solid var(--cprs-accent, #2563eb)'
                  : '2px solid transparent',
              background: 'transparent',
              color: activeTab === tab ? 'var(--cprs-accent, #2563eb)' : 'var(--cprs-text-muted)',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {tab === 'studies'
              ? `Studies (${studies.length})`
              : tab === 'worklist'
                ? `Worklist (${worklist.length})`
                : tab === 'capture'
                  ? 'Capture'
                  : 'New Order'}
          </button>
        ))}
        {/* Phase 24: Admin-only tabs */}
        {isAdmin && (
          <>
            <button
              onClick={() => setActiveTab('devices')}
              style={{
                padding: '4px 12px',
                fontSize: 11,
                fontWeight: activeTab === 'devices' ? 600 : 400,
                border: 'none',
                borderBottom:
                  activeTab === 'devices' ? '2px solid #7c3aed' : '2px solid transparent',
                background: 'transparent',
                color: activeTab === 'devices' ? '#7c3aed' : 'var(--cprs-text-muted)',
                cursor: 'pointer',
              }}
            >
              Devices
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              style={{
                padding: '4px 12px',
                fontSize: 11,
                fontWeight: activeTab === 'audit' ? 600 : 400,
                border: 'none',
                borderBottom: activeTab === 'audit' ? '2px solid #7c3aed' : '2px solid transparent',
                background: 'transparent',
                color: activeTab === 'audit' ? '#7c3aed' : 'var(--cprs-text-muted)',
                cursor: 'pointer',
              }}
            >
              Audit Log
            </button>
          </>
        )}
      </div>

      {/* Phase 24: Break-glass request panel (shown when error contains 'permission') */}
      {error && error.toLowerCase().includes('permission') && !breakGlass && (
        <div
          style={{
            background: '#fef3cd',
            border: '1px solid #f59e0b',
            borderRadius: 4,
            padding: '8px 12px',
            marginBottom: 8,
            fontSize: 11,
          }}
        >
          <strong style={{ color: '#92400e' }}>Access Restricted:</strong>
          <span style={{ marginLeft: 4, color: '#78350f' }}>
            You need imaging_view permission. Request emergency break-glass access:
          </span>
          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            <input
              type="text"
              placeholder="Clinical reason (min 10 chars)..."
              value={breakGlassReason}
              onChange={(e) => setBreakGlassReason(e.target.value)}
              style={{
                flex: 1,
                padding: '3px 8px',
                fontSize: 11,
                border: '1px solid #d1d5db',
                borderRadius: 4,
              }}
            />
            <button
              onClick={startBreakGlass}
              disabled={breakGlassReason.length < 10 || breakGlassLoading}
              style={{
                background: breakGlassReason.length >= 10 ? '#dc2626' : '#9ca3af',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '3px 12px',
                cursor: breakGlassReason.length >= 10 ? 'pointer' : 'not-allowed',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {breakGlassLoading ? 'Requesting...' : 'Break Glass'}
            </button>
          </div>
        </div>
      )}

      {/* Unmatched studies banner */}
      {studies.some((s) => s.orderLinked === false) && activeTab === 'studies' && (
        <div
          style={{
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: 4,
            padding: '6px 12px',
            marginBottom: 8,
            fontSize: 11,
            color: '#856404',
          }}
        >
          <strong>Unmatched:</strong> {studies.filter((s) => !s.orderLinked).length} study(ies) not
          linked to any imaging order. These may need manual reconciliation in the admin console.
        </div>
      )}

      {/* ===== WORKLIST TAB ===== */}
      {activeTab === 'worklist' && (
        <div>
          {worklist.length === 0 ? (
            <div
              style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--cprs-text-muted)' }}
            >
              <p style={{ fontSize: 13 }}>No worklist items for this patient.</p>
              <p style={{ fontSize: 11 }}>Create an imaging order to add items to the worklist.</p>
            </div>
          ) : (
            <div
              style={{
                border: '1px solid var(--cprs-border)',
                borderRadius: 4,
                overflow: 'auto',
                maxHeight: 400,
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr
                    style={{
                      background: 'var(--cprs-surface)',
                      borderBottom: '1px solid var(--cprs-border)',
                    }}
                  >
                    <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600 }}>
                      Accession
                    </th>
                    <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600 }}>
                      Procedure
                    </th>
                    <th style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 600 }}>
                      Mod
                    </th>
                    <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600 }}>
                      Scheduled
                    </th>
                    <th style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 600 }}>
                      Priority
                    </th>
                    <th style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 600 }}>
                      Status
                    </th>
                    <th style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 600 }}>
                      Linked
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {worklist.map((item, i) => (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid var(--cprs-border)',
                        background: i % 2 === 0 ? 'transparent' : 'var(--cprs-surface, #f8f9fa)',
                      }}
                    >
                      <td style={{ padding: '3px 8px', fontFamily: 'monospace', fontSize: 10 }}>
                        {item.accessionNumber}
                      </td>
                      <td style={{ padding: '3px 8px' }}>{item.scheduledProcedure}</td>
                      <td style={{ padding: '3px 8px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '1px 4px',
                            borderRadius: 3,
                            background: modalityColor(item.modality),
                            color: '#fff',
                            fontSize: 10,
                            fontWeight: 600,
                          }}
                        >
                          {item.modality}
                        </span>
                      </td>
                      <td style={{ padding: '3px 8px', fontSize: 11 }}>
                        {formatDate(item.scheduledTime)}
                      </td>
                      <td style={{ padding: '3px 8px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color:
                              item.priority === 'stat'
                                ? '#dc2626'
                                : item.priority === 'urgent'
                                  ? '#d97706'
                                  : '#6b7280',
                          }}
                        >
                          {item.priority.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '3px 8px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: 10,
                            padding: '1px 6px',
                            borderRadius: 8,
                            background:
                              item.status === 'completed'
                                ? '#d1fae5'
                                : item.status === 'cancelled'
                                  ? '#fecaca'
                                  : '#e0e7ff',
                            color:
                              item.status === 'completed'
                                ? '#065f46'
                                : item.status === 'cancelled'
                                  ? '#991b1b'
                                  : '#3730a3',
                          }}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td style={{ padding: '3px 8px', textAlign: 'center', fontSize: 11 }}>
                        {item.linkedStudyUid ? '✓' : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== NEW ORDER TAB ===== */}
      {activeTab === 'orders' && (
        <ImagingOrderForm
          dfn={dfn}
          onCreated={() => {
            fetchWorklist();
            setActiveTab('worklist');
          }}
        />
      )}

      {/* ===== CAPTURE TAB (Phase 538: SIC-like browser capture) ===== */}
      {activeTab === 'capture' && <ImagingCaptureTab dfn={dfn} />}

      {/* ===== DEVICES TAB (Phase 24, admin only) ===== */}
      {activeTab === 'devices' && isAdmin && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600 }}>DICOM Device Registry</span>
            <button
              onClick={fetchDevices}
              style={{ fontSize: 11, padding: '2px 8px', cursor: 'pointer' }}
              className={styles.toolbarBtn}
            >
              Refresh
            </button>
          </div>
          {devicesLoading ? (
            <p style={{ fontSize: 12, color: 'var(--cprs-text-muted)' }}>Loading devices...</p>
          ) : devices.length === 0 ? (
            <div
              style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--cprs-text-muted)' }}
            >
              <p style={{ fontSize: 13 }}>No DICOM devices registered.</p>
              <p style={{ fontSize: 11 }}>
                Use the API (POST /imaging/devices) to register devices.
              </p>
            </div>
          ) : (
            <div
              style={{
                border: '1px solid var(--cprs-border)',
                borderRadius: 4,
                overflow: 'auto',
                maxHeight: 400,
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr
                    style={{
                      background: 'var(--cprs-surface)',
                      borderBottom: '1px solid var(--cprs-border)',
                    }}
                  >
                    <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600 }}>
                      AE Title
                    </th>
                    <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600 }}>Host</th>
                    <th style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 600 }}>
                      Port
                    </th>
                    <th style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 600 }}>
                      Modality
                    </th>
                    <th style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 600 }}>
                      TLS
                    </th>
                    <th style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 600 }}>
                      Status
                    </th>
                    <th style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 600 }}>
                      Last Echo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((dev, i) => (
                    <tr
                      key={dev.id}
                      style={{
                        borderBottom: '1px solid var(--cprs-border)',
                        background: i % 2 === 0 ? 'transparent' : 'var(--cprs-surface, #f8f9fa)',
                      }}
                    >
                      <td style={{ padding: '3px 8px', fontFamily: 'monospace', fontSize: 10 }}>
                        {dev.aeTitle}
                      </td>
                      <td style={{ padding: '3px 8px' }}>{dev.hostname}</td>
                      <td style={{ padding: '3px 8px', textAlign: 'center' }}>{dev.port}</td>
                      <td style={{ padding: '3px 8px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '1px 4px',
                            borderRadius: 3,
                            background: '#6366f1',
                            color: '#fff',
                            fontSize: 10,
                            fontWeight: 600,
                          }}
                        >
                          {dev.modality}
                        </span>
                      </td>
                      <td style={{ padding: '3px 8px', textAlign: 'center', fontSize: 10 }}>
                        {dev.tlsMode === 'required'
                          ? '🔒'
                          : dev.tlsMode === 'optional'
                            ? '🔓'
                            : '—'}
                      </td>
                      <td style={{ padding: '3px 8px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: 10,
                            padding: '1px 6px',
                            borderRadius: 8,
                            background:
                              dev.status === 'active'
                                ? '#d1fae5'
                                : dev.status === 'testing'
                                  ? '#e0e7ff'
                                  : '#fecaca',
                            color:
                              dev.status === 'active'
                                ? '#065f46'
                                : dev.status === 'testing'
                                  ? '#3730a3'
                                  : '#991b1b',
                          }}
                        >
                          {dev.status}
                        </span>
                      </td>
                      <td style={{ padding: '3px 8px', textAlign: 'center', fontSize: 10 }}>
                        {dev.lastEchoAt ? (
                          <span style={{ color: dev.lastEchoSuccess ? '#059669' : '#dc2626' }}>
                            {dev.lastEchoSuccess ? '✓' : '✗'}{' '}
                            {new Date(dev.lastEchoAt).toLocaleDateString()}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== AUDIT TAB (Phase 24, admin only) ===== */}
      {activeTab === 'audit' && isAdmin && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600 }}>
              Imaging Audit Trail (Hash-Chained)
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={fetchAuditLog}
                style={{ fontSize: 11, padding: '2px 8px', cursor: 'pointer' }}
                className={styles.toolbarBtn}
              >
                Refresh
              </button>
              <button
                onClick={() => window.open(`${API_BASE}/imaging/audit/export?format=csv`, '_blank')}
                style={{ fontSize: 11, padding: '2px 8px', cursor: 'pointer' }}
                className={styles.toolbarBtn}
              >
                Export CSV
              </button>
            </div>
          </div>
          {auditLoading ? (
            <p style={{ fontSize: 12, color: 'var(--cprs-text-muted)' }}>
              Loading audit entries...
            </p>
          ) : auditEntries.length === 0 ? (
            <div
              style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--cprs-text-muted)' }}
            >
              <p style={{ fontSize: 13 }}>No imaging audit entries yet.</p>
            </div>
          ) : (
            <div
              style={{
                border: '1px solid var(--cprs-border)',
                borderRadius: 4,
                overflow: 'auto',
                maxHeight: 400,
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr
                    style={{
                      background: 'var(--cprs-surface)',
                      borderBottom: '1px solid var(--cprs-border)',
                    }}
                  >
                    <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 600 }}>#</th>
                    <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 600 }}>Time</th>
                    <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 600 }}>
                      Action
                    </th>
                    <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 600 }}>
                      Outcome
                    </th>
                    <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 600 }}>
                      Actor
                    </th>
                    <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 600 }}>
                      Study UID
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {auditEntries.map((entry, i) => (
                    <tr
                      key={entry.id}
                      style={{
                        borderBottom: '1px solid var(--cprs-border)',
                        background:
                          entry.outcome === 'denied'
                            ? '#fef2f2'
                            : i % 2 === 0
                              ? 'transparent'
                              : 'var(--cprs-surface, #f8f9fa)',
                      }}
                    >
                      <td style={{ padding: '2px 6px', fontFamily: 'monospace', fontSize: 10 }}>
                        {entry.seq}
                      </td>
                      <td style={{ padding: '2px 6px', whiteSpace: 'nowrap', fontSize: 10 }}>
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: '2px 6px' }}>
                        <span
                          style={{
                            fontSize: 9,
                            padding: '1px 4px',
                            borderRadius: 3,
                            background: entry.action.startsWith('BREAK_GLASS')
                              ? '#fef3c7'
                              : entry.action.startsWith('DEVICE')
                                ? '#e0e7ff'
                                : '#f3f4f6',
                            fontFamily: 'monospace',
                          }}
                        >
                          {entry.action}
                        </span>
                      </td>
                      <td style={{ padding: '2px 6px' }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color:
                              entry.outcome === 'success'
                                ? '#059669'
                                : entry.outcome === 'denied'
                                  ? '#dc2626'
                                  : '#d97706',
                          }}
                        >
                          {entry.outcome}
                        </span>
                      </td>
                      <td style={{ padding: '2px 6px', fontSize: 10 }}>{entry.actorName || '—'}</td>
                      <td style={{ padding: '2px 6px', fontFamily: 'monospace', fontSize: 9 }}>
                        {entry.studyInstanceUid ? entry.studyInstanceUid.slice(0, 20) + '…' : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== STUDIES TAB (original content) ===== */}
      {activeTab === 'studies' && (
        <>
          {/* Source info banner */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              margin: '2px 0 8px',
            }}
          >
            <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', margin: 0 }}>
              {vistaAvailable ? 'VistA Imaging + Orthanc' : 'Orthanc DICOMweb'} &bull;{' '}
              {studies.length} {studies.length === 1 ? 'study' : 'studies'}
              {vistaCount > 0 && (
                <>
                  {' '}
                  &bull; <span style={{ color: '#2563eb' }}>{vistaCount} VistA</span>
                </>
              )}
              {dicomwebCount > 0 && (
                <>
                  {' '}
                  &bull; <span style={{ color: '#059669' }}>{dicomwebCount} PACS</span>
                </>
              )}
            </p>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <select
                className={styles.formSelect}
                value={modalityFilter}
                onChange={(e) => setModalityFilter(e.target.value as ModalityFilter)}
                style={{ fontSize: 11, padding: '2px 4px' }}
              >
                <option value="all">All modalities</option>
                {modalities.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <button
                className={styles.toolbarBtn}
                onClick={fetchStudies}
                style={{ fontSize: 11, padding: '2px 8px' }}
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Demo data banner when VistA Imaging is not available */}
          {!vistaAvailable && studies.length > 0 && (
            <div
              style={{
                background: 'var(--cprs-warning-bg, #fef3cd)',
                border: '1px solid var(--cprs-warning-border, #ffc107)',
                borderRadius: 4,
                padding: '6px 12px',
                marginBottom: 8,
                fontSize: 11,
                color: 'var(--cprs-warning-text, #856404)',
              }}
            >
              <strong>Demo Mode:</strong> VistA Imaging RPCs are not available on this distribution.
              Studies shown are from the Orthanc DICOM server (demo/test data).
            </div>
          )}

          {/* Error state */}
          {error && (
            <div
              style={{
                background: '#f8d7da',
                border: '1px solid #f5c6cb',
                borderRadius: 4,
                padding: '6px 12px',
                marginBottom: 8,
                fontSize: 11,
                color: '#721c24',
              }}
            >
              {error}
              <button
                onClick={() => setError(null)}
                style={{
                  marginLeft: 8,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#721c24',
                  textDecoration: 'underline',
                  fontSize: 11,
                }}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <p className={styles.emptyText} style={{ fontSize: 12 }}>
              Loading imaging studies...
            </p>
          )}

          {/* Empty state */}
          {!loading && studies.length === 0 && !error && (
            <div
              style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--cprs-text-muted)' }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
              <p style={{ fontSize: 13, margin: 0 }}>No imaging studies found for this patient.</p>
              <p style={{ fontSize: 11, margin: '4px 0 0', color: 'var(--cprs-text-muted)' }}>
                Studies will appear here when images are captured or uploaded to Orthanc.
              </p>
            </div>
          )}

          {/* Study list + detail split view */}
          {!loading && filteredStudies.length > 0 && (
            <div style={{ display: 'flex', gap: 8, minHeight: 300 }}>
              {/* Study list */}
              <div
                style={{
                  flex: '0 0 55%',
                  border: '1px solid var(--cprs-border)',
                  borderRadius: 4,
                  overflow: 'auto',
                  maxHeight: 500,
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr
                      style={{
                        background: 'var(--cprs-surface)',
                        borderBottom: '1px solid var(--cprs-border)',
                      }}
                    >
                      <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600 }}>
                        Date
                      </th>
                      <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600 }}>
                        Modality
                      </th>
                      <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600 }}>
                        Description
                      </th>
                      <th style={{ padding: '4px 4px', textAlign: 'center', fontWeight: 600 }}>
                        #
                      </th>
                      <th style={{ padding: '4px 4px', textAlign: 'center', fontWeight: 600 }}>
                        Src
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudies.map((study, i) => (
                      <tr
                        key={study.studyId || i}
                        onClick={() => {
                          setSelected(study);
                          setReportText(null);
                          setReportStatus(null);
                          setReportPending(null);
                          setViewerLink(null);
                        }}
                        style={{
                          cursor: 'pointer',
                          background:
                            selected?.studyId === study.studyId
                              ? 'var(--cprs-selected, #dbeafe)'
                              : i % 2 === 0
                                ? 'transparent'
                                : 'var(--cprs-surface, #f8f9fa)',
                          borderBottom: '1px solid var(--cprs-border)',
                        }}
                      >
                        <td style={{ padding: '3px 8px', whiteSpace: 'nowrap' }}>
                          {formatDate(study.studyDate)}
                        </td>
                        <td style={{ padding: '3px 8px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '1px 4px',
                              borderRadius: 3,
                              background: modalityColor(study.modality),
                              color: '#fff',
                              fontSize: 10,
                              fontWeight: 600,
                            }}
                          >
                            {study.modality || '?'}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '3px 8px',
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {study.description || 'Unnamed study'}
                        </td>
                        <td
                          style={{
                            padding: '3px 4px',
                            textAlign: 'center',
                            color: 'var(--cprs-text-muted)',
                          }}
                        >
                          {study.imageCount || '—'}
                        </td>
                        <td style={{ padding: '3px 4px', textAlign: 'center' }}>
                          <span
                            style={{
                              fontSize: 9,
                              color: study.source === 'vista' ? '#2563eb' : '#059669',
                            }}
                          >
                            {study.source === 'vista' ? 'V' : 'P'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Detail panel */}
              <div
                style={{
                  flex: 1,
                  border: '1px solid var(--cprs-border)',
                  borderRadius: 4,
                  padding: 12,
                  overflow: 'auto',
                }}
              >
                {selected ? (
                  <div>
                    <h4 style={{ fontSize: 13, margin: '0 0 8px', fontWeight: 600 }}>
                      {selected.description || 'Study Details'}
                    </h4>
                    <table style={{ fontSize: 12, width: '100%' }}>
                      <tbody>
                        <DetailRow label="Date" value={formatDate(selected.studyDate)} />
                        <DetailRow label="Modality" value={selected.modality || 'Unknown'} />
                        <DetailRow label="Images" value={String(selected.imageCount || 0)} />
                        <DetailRow label="Status" value={selected.status} />
                        <DetailRow
                          label="Source"
                          value={selected.source === 'vista' ? 'VistA Imaging' : 'PACS/DICOMweb'}
                        />
                        {selected.accessionNumber && (
                          <DetailRow label="Accession" value={selected.accessionNumber} mono />
                        )}
                        {selected.orderLinked && selected.linkedOrderId && (
                          <tr>
                            <td
                              style={{
                                padding: '2px 8px 2px 0',
                                color: 'var(--cprs-text-muted)',
                                fontWeight: 500,
                                whiteSpace: 'nowrap',
                                verticalAlign: 'top',
                              }}
                            >
                              Order:
                            </td>
                            <td style={{ padding: '2px 0', fontSize: 12 }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '1px 6px',
                                  borderRadius: 8,
                                  background: '#d1fae5',
                                  color: '#065f46',
                                  fontSize: 10,
                                  fontWeight: 600,
                                }}
                              >
                                Linked
                              </span>{' '}
                              <span style={{ fontFamily: 'monospace', fontSize: 10 }}>
                                {selected.linkedOrderId}
                              </span>
                            </td>
                          </tr>
                        )}
                        {selected.studyInstanceUid && (
                          <DetailRow label="Study UID" value={selected.studyInstanceUid} mono />
                        )}
                      </tbody>
                    </table>

                    {/* Open Viewer button */}
                    {(selected.studyInstanceUid || selected.studyId) && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                        <button
                          onClick={() => openViewer(selected)}
                          style={{
                            padding: '6px 16px',
                            background: 'var(--cprs-accent, #2563eb)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            fontSize: 12,
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          Open in OHIF Viewer
                        </button>
                        <button
                          onClick={() => fetchReport(selected.studyInstanceUid || selected.studyId)}
                          disabled={reportLoading}
                          style={{
                            padding: '6px 16px',
                            background: '#059669',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            fontSize: 12,
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          {reportLoading ? 'Loading...' : 'View Report'}
                        </button>
                        <button
                          onClick={() =>
                            fetchViewerLink(selected.studyInstanceUid || selected.studyId)
                          }
                          style={{
                            padding: '6px 12px',
                            background: '#6366f1',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            fontSize: 12,
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          Viewer Link
                        </button>
                      </div>
                    )}

                    {/* Phase 81: Inline report viewer */}
                    {reportText && (
                      <div
                        style={{
                          marginTop: 10,
                          border: '1px solid var(--cprs-border)',
                          borderRadius: 4,
                          padding: 10,
                          background: 'var(--cprs-surface, #f8f9fa)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 6,
                          }}
                        >
                          <span style={{ fontSize: 12, fontWeight: 600 }}>Radiology Report</span>
                          {reportStatus && (
                            <span
                              style={{
                                fontSize: 10,
                                padding: '1px 6px',
                                borderRadius: 8,
                                background:
                                  reportStatus === 'final'
                                    ? '#d1fae5'
                                    : reportStatus === 'preliminary'
                                      ? '#fef3c7'
                                      : '#e0e7ff',
                                color:
                                  reportStatus === 'final'
                                    ? '#065f46'
                                    : reportStatus === 'preliminary'
                                      ? '#92400e'
                                      : '#3730a3',
                                fontWeight: 600,
                              }}
                            >
                              {reportStatus.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <pre
                          style={{
                            fontFamily: 'monospace',
                            fontSize: 11,
                            lineHeight: 1.4,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            margin: 0,
                            maxHeight: 200,
                            overflow: 'auto',
                          }}
                        >
                          {reportText}
                        </pre>
                        <button
                          onClick={() => setReportText(null)}
                          style={{
                            marginTop: 6,
                            fontSize: 10,
                            padding: '2px 8px',
                            background: 'none',
                            border: '1px solid var(--cprs-border)',
                            borderRadius: 3,
                            cursor: 'pointer',
                            color: 'var(--cprs-text-muted)',
                          }}
                        >
                          Close Report
                        </button>
                      </div>
                    )}

                    {/* Phase 81: Report pending target */}
                    {reportPending && !reportText && (
                      <div
                        style={{
                          marginTop: 10,
                          border: '1px solid #ffc107',
                          borderRadius: 4,
                          padding: 10,
                          background: '#fef3c7',
                          fontSize: 11,
                        }}
                      >
                        <strong style={{ color: '#92400e' }}>Report not available</strong>
                        <p style={{ margin: '4px 0 0', color: '#78350f' }}>
                          Target RPC:{' '}
                          <code style={{ fontFamily: 'monospace', fontSize: 10 }}>
                            {reportPending.rpc}
                          </code>
                        </p>
                        <p style={{ margin: '2px 0 0', color: '#78350f' }}>
                          {reportPending.reason}
                        </p>
                      </div>
                    )}

                    {/* Phase 81: Viewer link / integration instructions */}
                    {viewerLink && (
                      <div
                        style={{
                          marginTop: 10,
                          border: '1px solid var(--cprs-border)',
                          borderRadius: 4,
                          padding: 10,
                          background:
                            viewerLink.viewerType === 'ohif'
                              ? '#ecfdf5'
                              : viewerLink.viewerType === 'none'
                                ? '#fef2f2'
                                : '#f0f9ff',
                          fontSize: 11,
                        }}
                      >
                        <strong style={{ fontSize: 12 }}>
                          {viewerLink.viewerType === 'ohif'
                            ? 'OHIF Viewer Ready'
                            : viewerLink.viewerType === 'basic'
                              ? 'DICOMweb Available'
                              : 'Viewer Not Configured'}
                        </strong>
                        <p style={{ margin: '4px 0' }}>{viewerLink.message}</p>
                        {viewerLink.url && (
                          <a
                            href={viewerLink.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#2563eb', fontSize: 11, wordBreak: 'break-all' }}
                          >
                            {viewerLink.url}
                          </a>
                        )}
                        {viewerLink.instructions && viewerLink.instructions.length > 0 && (
                          <div
                            style={{
                              marginTop: 6,
                              padding: '6px 8px',
                              background: 'rgba(0,0,0,0.04)',
                              borderRadius: 3,
                            }}
                          >
                            <strong style={{ fontSize: 10, color: 'var(--cprs-text-muted)' }}>
                              Setup Instructions:
                            </strong>
                            <ul
                              style={{
                                margin: '4px 0 0',
                                paddingLeft: 16,
                                fontSize: 10,
                                lineHeight: 1.5,
                              }}
                            >
                              {viewerLink.instructions.filter(Boolean).map((inst, idx) => (
                                <li key={idx}>{inst}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <button
                          onClick={() => setViewerLink(null)}
                          style={{
                            marginTop: 6,
                            fontSize: 10,
                            padding: '2px 8px',
                            background: 'none',
                            border: '1px solid var(--cprs-border)',
                            borderRadius: 3,
                            cursor: 'pointer',
                            color: 'var(--cprs-text-muted)',
                          }}
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--cprs-text-muted)',
                      textAlign: 'center',
                      marginTop: 40,
                    }}
                  >
                    Select a study to view details
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}
      {/* END STUDIES TAB */}

      {/* OHIF Viewer modal */}
      {viewerOpen && viewerUrl && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 16px',
              background: '#1e293b',
              color: '#fff',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600 }}>OHIF DICOM Viewer</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <a
                href={viewerUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, color: '#93c5fd', textDecoration: 'underline' }}
              >
                Open in new tab
              </a>
              <button
                onClick={() => {
                  setViewerOpen(false);
                  setViewerUrl(null);
                }}
                style={{
                  background: '#475569',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  padding: '4px 12px',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
          <iframe
            src={viewerUrl}
            style={{ flex: 1, border: 'none', width: '100%' }}
            title="OHIF DICOM Viewer"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ImagingOrderForm — inline order creation (Phase 23)                 */
/* ------------------------------------------------------------------ */

/* ===== Phase 538: Imaging Capture Tab (SIC-like) ===== */
function ImagingCaptureTab({ dfn }: { dfn: string }) {
  const [captures, setCaptures] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [captureNotes, setCaptureNotes] = useState('');

  const fetchCaptures = useCallback(async () => {
    try {
      const resp = await fetch(`${API_BASE}/imaging/capture?dfn=${dfn}`, {
        credentials: 'include',
      });
      if (resp.ok) {
        const data = await resp.json();
        setCaptures(data.captures || []);
      }
    } catch {
      /* ignore */
    }
  }, [dfn]);

  useEffect(() => {
    fetchCaptures();
  }, [fetchCaptures]);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setErr(null);
    setSuccess(null);
    try {
      const buffer = await selectedFile.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      const resp = await fetch(`${API_BASE}/imaging/capture`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dfn,
          filename: selectedFile.name,
          mimeType: selectedFile.type || 'application/octet-stream',
          fileBase64: base64,
          notes: captureNotes,
        }),
      });
      const data = await resp.json();
      if (data.ok) {
        setSuccess(
          `Captured: ${data.capture.id.slice(0, 8)}... (Orthanc: ${data.orthancStored ? 'stored' : 'unavailable'})`
        );
        setSelectedFile(null);
        setCaptureNotes('');
        fetchCaptures();
      } else {
        setErr(data.error || 'Upload failed');
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
        Image Capture (SIC-like)
        <span
          style={{
            background: '#fef3c7',
            color: '#b45309',
            padding: '1px 6px',
            borderRadius: 3,
            fontSize: 10,
            fontWeight: 600,
            marginLeft: 8,
          }}
        >
          INTEGRATION PENDING
        </span>
      </div>

      {/* Upload form */}
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 6,
          padding: 12,
          marginBottom: 12,
          background: '#fafafa',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 8 }}>
          Upload Image / Document
        </div>
        <input
          type="file"
          accept="image/*,application/pdf,.dcm"
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          style={{ fontSize: 11, marginBottom: 6 }}
        />
        <div style={{ marginBottom: 6 }}>
          <input
            type="text"
            placeholder="Notes (optional)"
            value={captureNotes}
            onChange={(e) => setCaptureNotes(e.target.value)}
            style={{
              fontSize: 11,
              padding: '4px 8px',
              width: '100%',
              border: '1px solid #d1d5db',
              borderRadius: 4,
            }}
          />
        </div>
        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          style={{
            fontSize: 11,
            padding: '4px 12px',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            opacity: !selectedFile || uploading ? 0.5 : 1,
          }}
        >
          {uploading ? 'Uploading...' : 'Capture & Store'}
        </button>
        {err && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{err}</div>}
        {success && <div style={{ color: '#10b981', fontSize: 11, marginTop: 4 }}>{success}</div>}
      </div>

      {/* Capture history */}
      <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4 }}>
        Capture History ({captures.length})
      </div>
      {captures.length === 0 && (
        <div style={{ color: '#9ca3af', fontSize: 11 }}>No captures for this patient.</div>
      )}
      {captures.map((c: any) => (
        <div
          key={c.id}
          style={{
            padding: '6px 8px',
            borderBottom: '1px solid #f3f4f6',
            fontSize: 11,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>
            {c.originalFilename} ({c.mimeType})
          </span>
          <span
            style={{
              color:
                c.status === 'attached' ? '#10b981' : c.status === 'filed' ? '#2563eb' : '#6b7280',
            }}
          >
            {c.status}
          </span>
        </div>
      ))}

      {/* VistA grounding info */}
      <div
        style={{
          marginTop: 12,
          border: '1px solid #f59e0b',
          borderRadius: 6,
          padding: 10,
          background: '#fffbeb',
          fontSize: 11,
        }}
      >
        <div style={{ fontWeight: 600, color: '#b45309', marginBottom: 4 }}>VistA Grounding</div>
        <div>
          <strong>Target:</strong> File 2005 (Image), MAG4 ADD IMAGE, TIU ID ATTACH ENTRY
        </div>
        <div style={{ color: '#92400e', fontStyle: 'italic', marginTop: 4 }}>
          VistA filing pending -- images stored to Orthanc only in sandbox.
        </div>
      </div>
    </div>
  );
}

const MODALITY_OPTIONS = ['CR', 'CT', 'MR', 'US', 'DX', 'NM', 'PT', 'XA', 'MG', 'RF'] as const;
const PRIORITY_OPTIONS = ['routine', 'urgent', 'stat'] as const;

function ImagingOrderForm({ dfn, onCreated }: { dfn: string; onCreated: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    scheduledProcedure: '',
    modality: 'CR' as string,
    priority: 'routine' as string,
    clinicalIndication: '',
    scheduledTime: '',
    facility: 'WORLDVISTA',
    location: 'RADIOLOGY',
  });

  const set =
    (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async () => {
    if (!form.scheduledProcedure.trim()) {
      setErr('Procedure is required');
      return;
    }
    if (!form.clinicalIndication.trim()) {
      setErr('Clinical indication is required');
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const resp = await fetch(`${API_BASE}/imaging/worklist/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({
          patientDfn: dfn,
          scheduledProcedure: form.scheduledProcedure.trim(),
          modality: form.modality,
          priority: form.priority,
          clinicalIndication: form.clinicalIndication.trim(),
          scheduledTime: form.scheduledTime || new Date().toISOString(),
          facility: form.facility,
          location: form.location,
        }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${resp.status}`);
      }
      onCreated();
    } catch (e: any) {
      setErr(e.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    padding: '4px 8px',
    fontSize: 12,
    border: '1px solid var(--cprs-border)',
    borderRadius: 3,
    background: 'var(--cprs-surface, #fff)',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--cprs-text-muted)',
    marginBottom: 2,
  };

  return (
    <div style={{ padding: '8px 0' }}>
      <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px' }}>Create Imaging Order</h4>
      {err && (
        <div
          style={{
            background: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: 4,
            padding: '6px 12px',
            marginBottom: 8,
            fontSize: 11,
            color: '#721c24',
          }}
        >
          {err}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <label style={labelStyle}>Procedure *</label>
          <input
            style={fieldStyle}
            value={form.scheduledProcedure}
            onChange={set('scheduledProcedure')}
            placeholder="e.g. CHEST 2 VIEWS PA AND LAT"
          />
        </div>
        <div>
          <label style={labelStyle}>Modality</label>
          <select style={fieldStyle} value={form.modality} onChange={set('modality')}>
            {MODALITY_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Priority</label>
          <select style={fieldStyle} value={form.priority} onChange={set('priority')}>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Scheduled Date/Time</label>
          <input
            style={fieldStyle}
            type="datetime-local"
            value={form.scheduledTime}
            onChange={set('scheduledTime')}
          />
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={labelStyle}>Clinical Indication *</label>
        <textarea
          style={{ ...fieldStyle, minHeight: 48 }}
          value={form.clinicalIndication}
          onChange={set('clinicalIndication')}
          placeholder="Reason for exam"
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Facility</label>
          <input style={fieldStyle} value={form.facility} onChange={set('facility')} />
        </div>
        <div>
          <label style={labelStyle}>Location</label>
          <input style={fieldStyle} value={form.location} onChange={set('location')} />
        </div>
      </div>
      <button
        onClick={submit}
        disabled={submitting}
        style={{
          padding: '6px 20px',
          background: submitting ? '#94a3b8' : 'var(--cprs-accent, #2563eb)',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          fontSize: 12,
          cursor: submitting ? 'default' : 'pointer',
          fontWeight: 600,
        }}
      >
        {submitting ? 'Creating...' : 'Create Order'}
      </button>
      <p style={{ fontSize: 10, color: 'var(--cprs-text-muted)', marginTop: 8 }}>
        Orders are created in the local sidecar worklist. VistA Radiology integration is planned for
        a future phase.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helper components / functions                                       */
/* ------------------------------------------------------------------ */

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <tr>
      <td
        style={{
          padding: '2px 8px 2px 0',
          color: 'var(--cprs-text-muted)',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          verticalAlign: 'top',
        }}
      >
        {label}:
      </td>
      <td
        style={{
          padding: '2px 0',
          fontFamily: mono ? 'monospace' : 'inherit',
          fontSize: mono ? 10 : 12,
          wordBreak: 'break-all',
        }}
      >
        {value}
      </td>
    </tr>
  );
}

function formatDate(raw: string): string {
  if (!raw) return '—';
  // DICOM dates are YYYYMMDD
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  // Try ISO parse
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
  return raw;
}

function modalityColor(mod: string): string {
  const colors: Record<string, string> = {
    CT: '#2563eb',
    MR: '#7c3aed',
    CR: '#059669',
    DX: '#059669',
    US: '#d97706',
    NM: '#dc2626',
    PT: '#dc2626',
    XA: '#0891b2',
    MG: '#be185d',
    RF: '#4f46e5',
  };
  return colors[mod?.toUpperCase()] || '#6b7280';
}
