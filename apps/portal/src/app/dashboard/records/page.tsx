/**
 * My Records — Phase 80
 *
 * Patient-facing record portability page:
 *   Tab 1: Generate & Download — create PDF/HTML summary, download by token
 *   Tab 2: Share — create time-limited share links, revoke
 *   Tab 3: Access Audit — who accessed shared records
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { API_BASE } from '@/lib/api-config';

/* ================================================================== */
/* API helpers                                                          */
/* ================================================================== */

async function apiFetch<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

async function downloadBlob(path: string, filename: string) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ================================================================== */
/* Types                                                                */
/* ================================================================== */

interface ExportRecord {
  token: string;
  format: string;
  sections: string[];
  rpcUsed: string[];
  pendingTargets: string[];
  createdAt: string;
  expiresAt: string;
  downloadCount: number;
  revokedAt: string | null;
}

interface ShareRecord {
  id: string;
  token: string;
  label: string;
  sections: string[];
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  accessCount: number;
  locked: boolean;
  lastAccessedAt: string | null;
}

interface AuditEvent {
  shareId: string;
  accessedAt: string;
  ipHint: string;
  success: boolean;
  action: string;
}

type Tab = 'download' | 'share' | 'audit';

/* ================================================================== */
/* Styles                                                               */
/* ================================================================== */

const S = {
  page: {
    maxWidth: 900,
    margin: '0 auto',
    padding: 24,
    fontFamily: "'Segoe UI', Tahoma, sans-serif",
  } as const,
  h1: { fontSize: 22, fontWeight: 600, marginBottom: 4, color: '#212529' } as const,
  subtitle: { fontSize: 13, color: '#6c757d', marginBottom: 20 } as const,
  tabs: { display: 'flex', gap: 0, borderBottom: '2px solid #dee2e6', marginBottom: 20 } as const,
  tab: (active: boolean) =>
    ({
      padding: '8px 20px',
      cursor: 'pointer',
      border: 'none',
      borderBottom: active ? '2px solid #007bff' : '2px solid transparent',
      background: 'transparent',
      color: active ? '#007bff' : '#495057',
      fontWeight: active ? 600 : 400,
      fontSize: 14,
      marginBottom: -2,
    }) as const,
  card: {
    background: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
  } as const,
  btn: {
    background: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
  } as const,
  btnDanger: {
    background: '#dc3545',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: 12,
  } as const,
  btnOutline: {
    background: 'transparent',
    color: '#007bff',
    border: '1px solid #007bff',
    borderRadius: 4,
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: 12,
  } as const,
  btnDisabled: {
    background: '#6c757d',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '8px 16px',
    cursor: 'not-allowed',
    fontSize: 13,
    opacity: 0.65,
  } as const,
  error: {
    background: '#fee',
    border: '1px solid #fcc',
    color: '#721c24',
    borderRadius: 6,
    padding: '10px 14px',
    marginBottom: 12,
    fontSize: 13,
  } as const,
  success: {
    background: '#d4edda',
    border: '1px solid #c3e6cb',
    color: '#155724',
    borderRadius: 6,
    padding: '10px 14px',
    marginBottom: 12,
    fontSize: 13,
  } as const,
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: '#495057',
    marginBottom: 4,
  } as const,
  input: {
    padding: '6px 10px',
    border: '1px solid #ced4da',
    borderRadius: 4,
    fontSize: 13,
    width: '100%',
  } as const,
  select: {
    padding: '6px 10px',
    border: '1px solid #ced4da',
    borderRadius: 4,
    fontSize: 13,
  } as const,
  badge: (color: string) =>
    ({
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 10,
      fontSize: 11,
      fontWeight: 600,
      background: color,
      color: '#fff',
    }) as const,
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  th: {
    textAlign: 'left' as const,
    padding: '8px 10px',
    borderBottom: '2px solid #dee2e6',
    color: '#495057',
    fontWeight: 600,
    fontSize: 12,
  },
  td: { padding: '8px 10px', borderBottom: '1px solid #f0f0f0' },
  mono: {
    fontFamily: "'Consolas', monospace",
    fontSize: 12,
    background: '#e9ecef',
    padding: '2px 6px',
    borderRadius: 3,
  },
};

/* ================================================================== */
/* Component                                                            */
/* ================================================================== */

export default function RecordsPage() {
  const [tab, setTab] = useState<Tab>('download');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Download tab state
  const [format, setFormat] = useState<'pdf' | 'html'>('pdf');
  const [generating, setGenerating] = useState(false);
  const [exports, setExports] = useState<ExportRecord[]>([]);

  // Share tab state
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [shareLabel, setShareLabel] = useState('');
  const [shareTtl, setShareTtl] = useState(60);
  const [shareDob, setShareDob] = useState('');
  const [selectedExport, setSelectedExport] = useState('');
  const [creatingShare, setCreatingShare] = useState(false);
  const [newShareInfo, setNewShareInfo] = useState<{
    accessCode: string;
    shareToken: string;
    expiresAt: string;
  } | null>(null);

  // Audit tab state
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);

  const loadExports = useCallback(async () => {
    try {
      const data = await apiFetch<{ ok: boolean; exports: ExportRecord[] }>(
        '/portal/record/exports'
      );
      if (data.ok) setExports(data.exports);
    } catch {}
  }, []);

  const loadShares = useCallback(async () => {
    try {
      const data = await apiFetch<{ ok: boolean; shares: ShareRecord[] }>('/portal/record/shares');
      if (data.ok) setShares(data.shares);
    } catch {}
  }, []);

  const loadAudit = useCallback(async () => {
    try {
      const data = await apiFetch<{ ok: boolean; events: AuditEvent[] }>(
        '/portal/record/share/audit'
      );
      if (data.ok) setAuditEvents(data.events);
    } catch {}
  }, []);

  useEffect(() => {
    loadExports();
    loadShares();
    loadAudit();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------------------------------------------------------------- */
  /* Actions                                                            */
  /* ---------------------------------------------------------------- */

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    setSuccess('');
    try {
      const data = await apiFetch<{
        ok: boolean;
        token: string;
        format: string;
        rpcUsed: string[];
        pendingTargets: string[];
        expiresAt: string;
      }>('/portal/record/export', {
        method: 'POST',
        body: JSON.stringify({ format }),
      });
      if (data.ok) {
        setSuccess(
          `Summary generated (${data.rpcUsed.length} RPCs used). Token: ${data.token.slice(0, 12)}...`
        );
        if (data.pendingTargets.length > 0) {
          setSuccess((prev) => prev + ` | Pending: ${data.pendingTargets.join(', ')}`);
        }
        await loadExports();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (token: string, fmt: string) => {
    setError('');
    try {
      const ext = fmt === 'html' ? 'html' : 'pdf';
      await downloadBlob(`/portal/record/export/${token}`, `health-summary.${ext}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateShare = async () => {
    if (!selectedExport || !shareDob) {
      setError('Select an export and enter your date of birth.');
      return;
    }
    setCreatingShare(true);
    setError('');
    setNewShareInfo(null);
    try {
      const data = await apiFetch<{
        ok: boolean;
        shareId: string;
        shareToken: string;
        accessCode: string;
        expiresAt: string;
      }>('/portal/record/share', {
        method: 'POST',
        body: JSON.stringify({
          exportToken: selectedExport,
          label: shareLabel || 'Shared health summary',
          ttlMinutes: shareTtl,
          patientDob: shareDob,
        }),
      });
      if (data.ok) {
        setNewShareInfo({
          accessCode: data.accessCode,
          shareToken: data.shareToken,
          expiresAt: data.expiresAt,
        });
        setSuccess('Share link created. Save the access code below.');
        await loadShares();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreatingShare(false);
    }
  };

  const handleRevokeExport = async (token: string) => {
    setError('');
    try {
      await apiFetch(`/portal/record/export/${token}/revoke`, { method: 'POST' });
      setSuccess('Export revoked.');
      await loadExports();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRevoke = async (shareId: string) => {
    setError('');
    try {
      await apiFetch(`/portal/record/share/${shareId}/revoke`, { method: 'POST' });
      setSuccess('Share revoked.');
      await loadShares();
      await loadAudit();
    } catch (err: any) {
      setError(err.message);
    }
  };

  /* ---------------------------------------------------------------- */
  /* Render                                                             */
  /* ---------------------------------------------------------------- */

  const activeExports = exports.filter((e) => !e.revokedAt && new Date(e.expiresAt) > new Date());

  return (
    <div style={S.page}>
      <h1 style={S.h1}>My Records</h1>
      <p style={S.subtitle}>Generate, download, and share your health record summary.</p>

      {error && (
        <div style={S.error}>
          {error}
          <button
            onClick={() => setError('')}
            style={{
              float: 'right',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            X
          </button>
        </div>
      )}
      {success && (
        <div style={S.success}>
          {success}
          <button
            onClick={() => setSuccess('')}
            style={{
              float: 'right',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            X
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={S.tabs}>
        <button style={S.tab(tab === 'download')} onClick={() => setTab('download')}>
          Generate &amp; Download
        </button>
        <button style={S.tab(tab === 'share')} onClick={() => setTab('share')}>
          Share
        </button>
        <button style={S.tab(tab === 'audit')} onClick={() => setTab('audit')}>
          Access Audit
        </button>
      </div>

      {/* ============================================================ */}
      {/* Tab: Download                                                 */}
      {/* ============================================================ */}
      {tab === 'download' && (
        <div>
          <div style={S.card}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#212529' }}>
              Generate Health Summary
            </h3>
            <p style={{ fontSize: 13, color: '#6c757d', marginBottom: 12 }}>
              Generates a comprehensive summary using your VistA health records. Includes allergies,
              medications, problems, vitals, demographics, immunizations, and lab results.
            </p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <label style={S.label}>
                Format:
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as 'pdf' | 'html')}
                  style={{ ...S.select, marginLeft: 8 }}
                >
                  <option value="pdf">PDF</option>
                  <option value="html">HTML</option>
                </select>
              </label>
              <button
                onClick={handleGenerate}
                disabled={generating}
                style={generating ? S.btnDisabled : S.btn}
              >
                {generating ? 'Generating...' : 'Generate Summary'}
              </button>
            </div>
          </div>

          {/* Export list */}
          {exports.length > 0 && (
            <div style={S.card}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#212529' }}>Your Exports</h3>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Token</th>
                    <th style={S.th}>Format</th>
                    <th style={S.th}>RPCs</th>
                    <th style={S.th}>Created</th>
                    <th style={S.th}>Expires</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exports.map((exp) => {
                    const expired = new Date(exp.expiresAt) < new Date();
                    const revoked = !!exp.revokedAt;
                    const status = revoked ? 'Revoked' : expired ? 'Expired' : 'Active';
                    const badgeColor = revoked ? '#dc3545' : expired ? '#6c757d' : '#28a745';
                    return (
                      <tr key={exp.token}>
                        <td style={S.td}>
                          <span style={S.mono}>{exp.token.slice(0, 12)}...</span>
                        </td>
                        <td style={S.td}>{exp.format.toUpperCase()}</td>
                        <td style={S.td}>
                          {exp.rpcUsed.length} used
                          {exp.pendingTargets.length > 0
                            ? `, ${exp.pendingTargets.length} pending`
                            : ''}
                        </td>
                        <td style={S.td}>{new Date(exp.createdAt).toLocaleString()}</td>
                        <td style={S.td}>{new Date(exp.expiresAt).toLocaleString()}</td>
                        <td style={S.td}>
                          <span style={S.badge(badgeColor)}>{status}</span>
                        </td>
                        <td style={S.td}>
                          {!revoked && !expired && (
                            <span style={{ display: 'flex', gap: 6 }}>
                              <button
                                onClick={() => handleDownload(exp.token, exp.format)}
                                style={S.btnOutline}
                              >
                                Download
                              </button>
                              <button
                                onClick={() => handleRevokeExport(exp.token)}
                                style={S.btnDanger}
                              >
                                Revoke
                              </button>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* Tab: Share                                                     */}
      {/* ============================================================ */}
      {tab === 'share' && (
        <div>
          <div style={S.card}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#212529' }}>
              Create Share Link
            </h3>
            <p style={{ fontSize: 13, color: '#6c757d', marginBottom: 12 }}>
              Share your health summary with another provider. They will need an access code and
              your date of birth to view it.
            </p>

            {activeExports.length === 0 ? (
              <p
                style={{
                  color: '#856404',
                  background: '#fff3cd',
                  padding: 10,
                  borderRadius: 4,
                  fontSize: 13,
                }}
              >
                No active exports. Generate a summary first in the Download tab.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={S.label}>Select Export</label>
                  <select
                    value={selectedExport}
                    onChange={(e) => setSelectedExport(e.target.value)}
                    style={S.select}
                  >
                    <option value="">-- Select --</option>
                    {activeExports.map((exp) => (
                      <option key={exp.token} value={exp.token}>
                        {exp.format.toUpperCase()} - {exp.sections.length} sections -{' '}
                        {new Date(exp.createdAt).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={S.label}>Label (for your reference)</label>
                    <input
                      type="text"
                      value={shareLabel}
                      onChange={(e) => setShareLabel(e.target.value)}
                      placeholder="e.g., For Dr. Smith"
                      style={S.input}
                    />
                  </div>
                  <div>
                    <label style={S.label}>TTL (minutes)</label>
                    <select
                      value={shareTtl}
                      onChange={(e) => setShareTtl(Number(e.target.value))}
                      style={S.select}
                    >
                      <option value={30}>30 min</option>
                      <option value={60}>1 hour</option>
                      <option value={240}>4 hours</option>
                      <option value={720}>12 hours</option>
                      <option value={1440}>24 hours</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={S.label}>Your Date of Birth (YYYY-MM-DD)</label>
                  <input
                    type="date"
                    value={shareDob}
                    onChange={(e) => setShareDob(e.target.value)}
                    style={{ ...S.input, maxWidth: 200 }}
                  />
                </div>
                <button
                  onClick={handleCreateShare}
                  disabled={creatingShare}
                  style={creatingShare ? S.btnDisabled : S.btn}
                >
                  {creatingShare ? 'Creating...' : 'Create Share Link'}
                </button>
              </div>
            )}
          </div>

          {/* New share info */}
          {newShareInfo && (
            <div style={{ ...S.success, marginTop: 12 }}>
              <p style={{ margin: 0, fontWeight: 600 }}>Share Link Created Successfully</p>
              <p style={{ margin: '8px 0 4px', fontSize: 13 }}>
                <strong>Access Code:</strong> <span style={S.mono}>{newShareInfo.accessCode}</span>
              </p>
              <p style={{ margin: '0 0 4px', fontSize: 13 }}>
                <strong>Expires:</strong> {new Date(newShareInfo.expiresAt).toLocaleString()}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: '#856404' }}>
                Share the access code with the provider. They will also need your date of birth to
                verify.
              </p>
            </div>
          )}

          {/* Active shares */}
          {shares.length > 0 && (
            <div style={{ ...S.card, marginTop: 16 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#212529' }}>
                Your Share Links
              </h3>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Label</th>
                    <th style={S.th}>Created</th>
                    <th style={S.th}>Expires</th>
                    <th style={S.th}>Accessed</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shares.map((share) => {
                    const expired = new Date(share.expiresAt) < new Date();
                    const revoked = !!share.revokedAt;
                    const status = revoked
                      ? 'Revoked'
                      : expired
                        ? 'Expired'
                        : share.locked
                          ? 'Locked'
                          : 'Active';
                    const badgeColor = revoked
                      ? '#dc3545'
                      : expired
                        ? '#6c757d'
                        : share.locked
                          ? '#ffc107'
                          : '#28a745';
                    return (
                      <tr key={share.id}>
                        <td style={S.td}>{share.label}</td>
                        <td style={S.td}>{new Date(share.createdAt).toLocaleString()}</td>
                        <td style={S.td}>{new Date(share.expiresAt).toLocaleString()}</td>
                        <td style={S.td}>{share.accessCount}x</td>
                        <td style={S.td}>
                          <span style={S.badge(badgeColor)}>{status}</span>
                        </td>
                        <td style={S.td}>
                          {!revoked && !expired && (
                            <button onClick={() => handleRevoke(share.id)} style={S.btnDanger}>
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* Tab: Audit                                                    */}
      {/* ============================================================ */}
      {tab === 'audit' && (
        <div>
          <div style={S.card}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#212529' }}>
              Who Accessed Your Records
            </h3>
            <p style={{ fontSize: 13, color: '#6c757d', marginBottom: 12 }}>
              This log shows every attempt to access your shared health records.
            </p>

            <button onClick={loadAudit} style={S.btnOutline}>
              Refresh
            </button>
          </div>

          {auditEvents.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6c757d', marginTop: 20, fontSize: 14 }}>
              No access events recorded yet.
            </p>
          ) : (
            <table style={{ ...S.table, marginTop: 12 }}>
              <thead>
                <tr>
                  <th style={S.th}>Share ID</th>
                  <th style={S.th}>Time</th>
                  <th style={S.th}>IP (masked)</th>
                  <th style={S.th}>Result</th>
                  <th style={S.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {auditEvents.map((ev, idx) => (
                  <tr key={idx}>
                    <td style={S.td}>
                      <span style={S.mono}>{ev.shareId.slice(0, 16)}</span>
                    </td>
                    <td style={S.td}>{new Date(ev.accessedAt).toLocaleString()}</td>
                    <td style={S.td}>{ev.ipHint}</td>
                    <td style={S.td}>
                      <span style={S.badge(ev.success ? '#28a745' : '#dc3545')}>
                        {ev.success ? 'Success' : 'Failed'}
                      </span>
                    </td>
                    <td style={S.td}>{ev.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
