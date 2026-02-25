'use client';

/**
 * LOA Workbench — Phase 94: PH HMO Workflow Automation
 *
 * Unified LOA management dashboard for billing staff.
 *
 * Tabs:
 *   - Active LOAs:  List of all LOA requests with status filters
 *   - Create LOA:   Form to create new LOA request
 *   - Stats:        LOA metrics overview
 */

import React, { useState, useEffect, useCallback } from 'react';
import { csrfHeaders } from '@/lib/csrf';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/* ── Types ──────────────────────────────────────────────────── */

interface LoaRequest {
  id: string;
  status: string;
  patientDfn: string;
  patientName?: string;
  payerId: string;
  memberId?: string;
  encounterDate?: string;
  diagnosisCodes: Array<{ code: string; codeSystem?: string; description?: string }> | string[];
  procedureCodes: Array<{ code: string; codeSystem?: string; description?: string }> | string[];
  providerName?: string;
  facilityName?: string;
  submissionMode?: string;
  checklist: Array<{ id: string; label: string; completed: boolean }>;
  auditTrail: Array<{ timestamp: string; action: string; actor: string; detail?: string }>;
  createdAt: string;
  updatedAt: string;
}

interface LoaStats {
  total: number;
  byStatus: Record<string, number>;
}

/* ── Styles ─────────────────────────────────────────────────── */

const PAGE: React.CSSProperties = { padding: '24px', fontFamily: 'Inter, system-ui, sans-serif', color: '#e0e0e0', background: '#0a0a0a', minHeight: '100vh' };
const TABS: React.CSSProperties = { display: 'flex', gap: 0, borderBottom: '1px solid #333', marginBottom: 24 };
const TAB_BASE: React.CSSProperties = { padding: '10px 20px', cursor: 'pointer', border: 'none', background: 'transparent', color: '#888', fontSize: 14, borderBottom: '2px solid transparent' };
const TAB_ACTIVE: React.CSSProperties = { ...TAB_BASE, color: '#60a5fa', borderBottomColor: '#60a5fa' };
const CARD: React.CSSProperties = { background: '#111', border: '1px solid #262626', borderRadius: 8, padding: 16, marginBottom: 12 };
const INPUT: React.CSSProperties = { background: '#1a1a1a', border: '1px solid #333', borderRadius: 4, padding: '8px 12px', color: '#e0e0e0', width: '100%', fontSize: 14 };
const BTN: React.CSSProperties = { padding: '8px 16px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const BTN_PRIMARY: React.CSSProperties = { ...BTN, background: '#2563eb', color: '#fff' };
const BTN_SECONDARY: React.CSSProperties = { ...BTN, background: '#333', color: '#ccc' };
const BADGE: React.CSSProperties = { display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 };
const TABLE: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 };
const TH: React.CSSProperties = { textAlign: 'left' as const, padding: '8px 12px', borderBottom: '1px solid #333', color: '#888', fontWeight: 500 };
const TD: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid #1a1a1a' };

const STATUS_COLORS: Record<string, string> = {
  draft: '#666', submitted: '#f59e0b', pending: '#3b82f6', approved: '#22c55e', denied: '#ef4444', cancelled: '#888', expired: '#a855f7'
};

export default function LoaWorkbenchPage() {
  const [tab, setTab] = useState<'active' | 'create' | 'stats'>('active');
  const [loas, setLoas] = useState<LoaRequest[]>([]);
  const [stats, setStats] = useState<LoaStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [selectedLoa, setSelectedLoa] = useState<LoaRequest | null>(null);
  const [message, setMessage] = useState('');

  /* ── Form state ───────────────────────────────────────────── */
  const [formPatientDfn, setFormPatientDfn] = useState('');
  const [formPatientName, setFormPatientName] = useState('');
  const [formPayerId, setFormPayerId] = useState('');
  const [formEncounterDate, setFormEncounterDate] = useState('');
  const [formDiagnosis, setFormDiagnosis] = useState('');
  const [formProcedure, setFormProcedure] = useState('');
  const [formProviderName, setFormProviderName] = useState('');
  const [formFacilityName, setFormFacilityName] = useState('');
  const [formMemberId, setFormMemberId] = useState('');

  const fetchLoas = useCallback(async () => {
    setLoading(true);
    try {
      const url = statusFilter
        ? `${API}/rcm/loa?status=${statusFilter}`
        : `${API}/rcm/loa`;
      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setLoas(data.requests ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [statusFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/rcm/loa/stats`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setStats(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchLoas(); fetchStats(); }, [fetchLoas, fetchStats]);

  const handleCreate = async () => {
    if (!formPatientDfn || !formPayerId) {
      setMessage('Patient DFN and Payer ID are required');
      return;
    }
    try {
      const res = await fetch(`${API}/rcm/loa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({
          patientDfn: formPatientDfn,
          patientName: formPatientName || undefined,
          payerId: formPayerId,
          encounterDate: formEncounterDate || undefined,
          diagnosisCodes: formDiagnosis ? formDiagnosis.split(',').map(s => s.trim()) : [],
          procedureCodes: formProcedure ? formProcedure.split(',').map(s => s.trim()) : [],
          providerName: formProviderName || undefined,
          facilityName: formFacilityName || undefined,
          memberId: formMemberId || undefined,
          actor: 'billing-staff',
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage(`LOA created: ${data.loa?.id?.slice(0, 8)}... (${data.submissionMode})`);
        setTab('active');
        fetchLoas();
        fetchStats();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setMessage(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleSubmitLoa = async (id: string) => {
    try {
      const res = await fetch(`${API}/rcm/loa/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({ actor: 'billing-staff' }),
      });
      const data = await res.json();
      setMessage(data.ok ? `LOA submitted. Packet generated.` : `Error: ${data.error}`);
      fetchLoas();
    } catch (err) {
      setMessage(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleApproveLoa = async (id: string) => {
    const refNum = prompt('Enter LOA reference/approval number:');
    if (!refNum) return;
    try {
      const res = await fetch(`${API}/rcm/loa/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({ referenceNumber: refNum, actor: 'billing-staff' }),
      });
      const data = await res.json();
      setMessage(data.ok ? `LOA approved with ref: ${refNum}` : `Error: ${data.error}`);
      fetchLoas();
    } catch (err) {
      setMessage(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleDenyLoa = async (id: string) => {
    const reason = prompt('Enter denial reason:');
    if (!reason) return;
    try {
      const res = await fetch(`${API}/rcm/loa/${id}/deny`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({ reason, actor: 'billing-staff' }),
      });
      const data = await res.json();
      setMessage(data.ok ? 'LOA denied' : `Error: ${data.error}`);
      fetchLoas();
    } catch (err) {
      setMessage(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div style={PAGE}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>LOA Workbench</h1>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
        PH HMO Letter of Authorization management -- Phase 94
      </p>

      {message && (
        <div style={{ ...CARD, background: '#1a1a2e', borderColor: '#2563eb', marginBottom: 16 }}>
          <span style={{ fontSize: 13 }}>{message}</span>
          <button onClick={() => setMessage('')} style={{ ...BTN_SECONDARY, marginLeft: 12, padding: '4px 8px', fontSize: 11 }}>dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div style={TABS}>
        {(['active', 'create', 'stats'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={tab === t ? TAB_ACTIVE : TAB_BASE}>
            {t === 'active' ? 'Active LOAs' : t === 'create' ? 'Create LOA' : 'Stats'}
          </button>
        ))}
      </div>

      {/* ── Active LOAs tab ──────────────────────────────────── */}
      {tab === 'active' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...INPUT, width: 200 }}>
              <option value="">All statuses</option>
              {['draft', 'submitted', 'pending', 'approved', 'denied', 'cancelled', 'expired'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button onClick={fetchLoas} style={BTN_PRIMARY}>Refresh</button>
          </div>

          {loading ? (
            <p style={{ color: '#888' }}>Loading...</p>
          ) : loas.length === 0 ? (
            <div style={CARD}><p style={{ color: '#888' }}>No LOA requests found. Create one from the Create LOA tab.</p></div>
          ) : (
            <table style={TABLE}>
              <thead>
                <tr>
                  <th style={TH}>ID</th>
                  <th style={TH}>Patient</th>
                  <th style={TH}>Payer</th>
                  <th style={TH}>Status</th>
                  <th style={TH}>Mode</th>
                  <th style={TH}>Created</th>
                  <th style={TH}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loas.map(loa => (
                  <tr key={loa.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedLoa(loa)}>
                    <td style={TD}><code style={{ fontSize: 11 }}>{loa.id.slice(0, 8)}</code></td>
                    <td style={TD}>{loa.patientName ?? loa.patientDfn}</td>
                    <td style={TD}>{loa.payerId}</td>
                    <td style={TD}>
                      <span style={{ ...BADGE, background: STATUS_COLORS[loa.status] ?? '#666', color: '#fff' }}>
                        {loa.status}
                      </span>
                    </td>
                    <td style={TD}>{loa.submissionMode ?? '-'}</td>
                    <td style={TD}>{new Date(loa.createdAt).toLocaleDateString()}</td>
                    <td style={TD}>
                      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        {loa.status === 'draft' && (
                          <button onClick={() => handleSubmitLoa(loa.id)} style={{ ...BTN, background: '#2563eb', color: '#fff', padding: '4px 8px', fontSize: 11 }}>Submit</button>
                        )}
                        {['submitted', 'pending'].includes(loa.status) && (
                          <>
                            <button onClick={() => handleApproveLoa(loa.id)} style={{ ...BTN, background: '#16a34a', color: '#fff', padding: '4px 8px', fontSize: 11 }}>Approve</button>
                            <button onClick={() => handleDenyLoa(loa.id)} style={{ ...BTN, background: '#dc2626', color: '#fff', padding: '4px 8px', fontSize: 11 }}>Deny</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Detail panel */}
          {selectedLoa && (
            <div style={{ ...CARD, marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600 }}>LOA Detail: {selectedLoa.id.slice(0, 8)}</h3>
                <button onClick={() => setSelectedLoa(null)} style={BTN_SECONDARY}>Close</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                <div><strong>Patient:</strong> {selectedLoa.patientName ?? selectedLoa.patientDfn}</div>
                <div><strong>Payer:</strong> {selectedLoa.payerId}</div>
                <div><strong>Status:</strong> {selectedLoa.status}</div>
                <div><strong>Mode:</strong> {selectedLoa.submissionMode ?? 'N/A'}</div>
                <div><strong>Member ID:</strong> {selectedLoa.memberId ?? 'N/A'}</div>
                <div><strong>Encounter:</strong> {selectedLoa.encounterDate ?? 'N/A'}</div>
                <div><strong>Diagnosis:</strong> {selectedLoa.diagnosisCodes?.map(c => typeof c === 'string' ? c : c.code).join(', ') || 'None'}</div>
                <div><strong>Procedures:</strong> {selectedLoa.procedureCodes?.map(c => typeof c === 'string' ? c : c.code).join(', ') || 'None'}</div>
              </div>

              {/* Checklist */}
              {selectedLoa.checklist?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Checklist</h4>
                  {selectedLoa.checklist.map(item => (
                    <div key={item.id} style={{ fontSize: 12, padding: '2px 0' }}>
                      {item.completed ? '\u2705' : '\u2B1C'} {item.label}
                    </div>
                  ))}
                </div>
              )}

              {/* Audit trail */}
              {selectedLoa.auditTrail?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Audit Trail</h4>
                  {selectedLoa.auditTrail.map((e, i) => (
                    <div key={i} style={{ fontSize: 11, color: '#888', padding: '1px 0' }}>
                      [{new Date(e.timestamp).toLocaleString()}] {e.action} by {e.actor}{e.detail ? ` -- ${e.detail}` : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Create LOA tab ───────────────────────────────────── */}
      {tab === 'create' && (
        <div style={{ maxWidth: 600 }}>
          <div style={CARD}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>New LOA Request</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>Patient DFN *</label>
                <input style={INPUT} value={formPatientDfn} onChange={e => setFormPatientDfn(e.target.value)} placeholder="e.g. 3" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>Patient Name</label>
                <input style={INPUT} value={formPatientName} onChange={e => setFormPatientName(e.target.value)} placeholder="e.g. EIGHT,PATIENT" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>HMO Payer ID *</label>
                <input style={INPUT} value={formPayerId} onChange={e => setFormPayerId(e.target.value)} placeholder="e.g. PH-MAXICARE" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>Member / HMO Card Number</label>
                <input style={INPUT} value={formMemberId} onChange={e => setFormMemberId(e.target.value)} placeholder="e.g. MC-1234567" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>Encounter Date</label>
                <input style={INPUT} type="date" value={formEncounterDate} onChange={e => setFormEncounterDate(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>Diagnosis Codes (comma-separated)</label>
                <input style={INPUT} value={formDiagnosis} onChange={e => setFormDiagnosis(e.target.value)} placeholder="e.g. J06.9, R10.9" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>Procedure Codes (comma-separated)</label>
                <input style={INPUT} value={formProcedure} onChange={e => setFormProcedure(e.target.value)} placeholder="e.g. 99213, 85025" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>Provider Name</label>
                <input style={INPUT} value={formProviderName} onChange={e => setFormProviderName(e.target.value)} placeholder="e.g. DR. JUAN DELA CRUZ" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>Facility Name</label>
                <input style={INPUT} value={formFacilityName} onChange={e => setFormFacilityName(e.target.value)} placeholder="e.g. WORLDVISTA HOSPITAL" />
              </div>

              <button onClick={handleCreate} style={BTN_PRIMARY}>Create LOA Request</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Stats tab ────────────────────────────────────────── */}
      {tab === 'stats' && (
        <div>
          {stats ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div style={CARD}>
                <div style={{ fontSize: 11, color: '#888' }}>Total LOAs</div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.total}</div>
              </div>
              {Object.entries(stats.byStatus ?? {}).map(([status, count]) => (
                <div key={status} style={CARD}>
                  <div style={{ fontSize: 11, color: '#888' }}>{status}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: STATUS_COLORS[status] ?? '#ccc' }}>{count}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#888' }}>Loading stats...</p>
          )}
        </div>
      )}
    </div>
  );
}
