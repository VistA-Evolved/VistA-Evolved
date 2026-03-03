'use client';

/**
 * Remittance Intake — Phase 94: PH HMO Workflow Automation
 *
 * Remittance/EOB document intake and payment posting dashboard.
 *
 * Tabs:
 *   - Documents:  List uploaded remittance/EOB documents
 *   - Upload:     Upload new remittance (metadata only -- blob stored externally)
 *   - Stats:      Remittance metrics overview
 */

import React, { useState, useEffect, useCallback } from 'react';
import { csrfHeaders } from '@/lib/csrf';
import { API_BASE as API } from '@/lib/api-config';


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
  uploaded: '#666', tagged: '#f59e0b', reviewed: '#3b82f6', posted: '#22c55e', disputed: '#ef4444'
};

/* ── Types ──────────────────────────────────────────────────── */

interface RemittanceDoc {
  id: string;
  status: string;
  payerId: string;
  payerName?: string;
  docType: string;
  filename: string;
  totalPaid: number;
  underpaymentFlagged: boolean;
  underpaymentAmount?: number;
  postedToVista: boolean;
  lineItems: Array<{ claimId?: string; billedAmount: number; paidAmount: number; adjustmentAmount: number }>;
  auditTrail: Array<{ timestamp: string; action: string; actor: string; detail?: string }>;
  uploadedAt: string;
}

interface RemitStats {
  total: number;
  byStatus: Record<string, number>;
  totalPaid: number;
  underpaymentCount: number;
  underpaymentTotal: number;
}

export default function RemittanceIntakePage() {
  const [tab, setTab] = useState<'documents' | 'upload' | 'stats'>('documents');
  const [docs, setDocs] = useState<RemittanceDoc[]>([]);
  const [stats, setStats] = useState<RemitStats | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<RemittanceDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  /* Upload form */
  const [formPayer, setFormPayer] = useState('');
  const [formPayerName, setFormPayerName] = useState('');
  const [formDocType, setFormDocType] = useState('eob');
  const [formFilename, setFormFilename] = useState('');
  const [formStorageRef, setFormStorageRef] = useState('');

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const url = statusFilter
        ? `${API}/rcm/remittance?status=${statusFilter}`
        : `${API}/rcm/remittance`;
      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setDocs(data.documents ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [statusFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/rcm/remittance/stats`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setStats(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchDocs(); fetchStats(); }, [fetchDocs, fetchStats]);

  const handleUpload = async () => {
    if (!formPayer || !formFilename || !formStorageRef) {
      setMessage('Payer ID, filename, and storage reference required');
      return;
    }
    try {
      const res = await fetch(`${API}/rcm/remittance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({
          payerId: formPayer,
          payerName: formPayerName || undefined,
          docType: formDocType,
          filename: formFilename,
          storageRef: formStorageRef,
          uploadedBy: 'billing-staff',
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage(`Document uploaded: ${data.document?.id?.slice(0, 8)}...`);
        setTab('documents');
        fetchDocs();
        fetchStats();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setMessage(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleReview = async (id: string) => {
    try {
      const res = await fetch(`${API}/rcm/remittance/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({ actor: 'billing-staff' }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage(data.underpaymentFlagged
          ? `UNDERPAYMENT detected: ${data.underpaymentAmount} cents`
          : 'Review complete -- amounts match');
        fetchDocs();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setMessage(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handlePost = async (id: string) => {
    const notes = prompt('Posting notes (VistA AR integration pending in sandbox):');
    if (notes === null) return;
    try {
      const res = await fetch(`${API}/rcm/remittance/${id}/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({ postingNotes: notes, actor: 'billing-staff' }),
      });
      const data = await res.json();
      setMessage(data.ok ? `Marked as posted. ${data.vistaIntegration}` : `Error: ${data.error}`);
      fetchDocs();
    } catch (err) {
      setMessage(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const formatCents = (c: number) => `PHP ${(c / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  return (
    <div style={PAGE}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Remittance Intake</h1>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
        EOB / SOA / payment document intake and posting -- Phase 94
      </p>

      {message && (
        <div style={{
          ...CARD,
          background: message.includes('UNDERPAYMENT') ? '#2e1a1a' : '#1a1a2e',
          borderColor: message.includes('UNDERPAYMENT') ? '#dc2626' : '#2563eb',
          marginBottom: 16,
        }}>
          <span style={{ fontSize: 13 }}>{message}</span>
          <button onClick={() => setMessage('')} style={{ ...BTN_SECONDARY, marginLeft: 12, padding: '4px 8px', fontSize: 11 }}>dismiss</button>
        </div>
      )}

      <div style={TABS}>
        {(['documents', 'upload', 'stats'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={tab === t ? TAB_ACTIVE : TAB_BASE}>
            {t === 'documents' ? 'Documents' : t === 'upload' ? 'Upload' : 'Stats'}
          </button>
        ))}
      </div>

      {/* ── Documents ────────────────────────────────────────── */}
      {tab === 'documents' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...INPUT, width: 200 }}>
              <option value="">All statuses</option>
              {['uploaded', 'tagged', 'reviewed', 'posted', 'disputed'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button onClick={fetchDocs} style={BTN_PRIMARY}>Refresh</button>
          </div>

          {loading ? (
            <p style={{ color: '#888' }}>Loading...</p>
          ) : docs.length === 0 ? (
            <div style={CARD}><p style={{ color: '#888' }}>No remittance documents. Upload one from the Upload tab.</p></div>
          ) : (
            <table style={TABLE}>
              <thead>
                <tr>
                  <th style={TH}>ID</th>
                  <th style={TH}>Payer</th>
                  <th style={TH}>Type</th>
                  <th style={TH}>Filename</th>
                  <th style={TH}>Status</th>
                  <th style={TH}>Total Paid</th>
                  <th style={TH}>Uploaded</th>
                  <th style={TH}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.map(doc => (
                  <tr key={doc.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedDoc(doc)}>
                    <td style={TD}><code style={{ fontSize: 11 }}>{doc.id.slice(0, 8)}</code></td>
                    <td style={TD}>{doc.payerName ?? doc.payerId}</td>
                    <td style={TD}>{doc.docType}</td>
                    <td style={TD}>{doc.filename}</td>
                    <td style={TD}>
                      <span style={{ ...BADGE, background: STATUS_COLORS[doc.status] ?? '#666', color: '#fff' }}>
                        {doc.status}
                      </span>
                      {doc.underpaymentFlagged && (
                        <span style={{ ...BADGE, background: '#dc2626', color: '#fff', marginLeft: 4 }}>
                          UNDERPAID
                        </span>
                      )}
                    </td>
                    <td style={TD}>{formatCents(doc.totalPaid)}</td>
                    <td style={TD}>{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                    <td style={TD}>
                      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        {doc.status === 'tagged' && (
                          <button onClick={() => handleReview(doc.id)} style={{ ...BTN, background: '#2563eb', color: '#fff', padding: '4px 8px', fontSize: 11 }}>Review</button>
                        )}
                        {['reviewed', 'disputed'].includes(doc.status) && (
                          <button onClick={() => handlePost(doc.id)} style={{ ...BTN, background: '#16a34a', color: '#fff', padding: '4px 8px', fontSize: 11 }}>Post</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Detail panel */}
          {selectedDoc && (
            <div style={{ ...CARD, marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600 }}>Document: {selectedDoc.id.slice(0, 8)}</h3>
                <button onClick={() => setSelectedDoc(null)} style={BTN_SECONDARY}>Close</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                <div><strong>Payer:</strong> {selectedDoc.payerName ?? selectedDoc.payerId}</div>
                <div><strong>Status:</strong> {selectedDoc.status}</div>
                <div><strong>Type:</strong> {selectedDoc.docType}</div>
                <div><strong>Total Paid:</strong> {formatCents(selectedDoc.totalPaid)}</div>
                <div><strong>Posted to VistA:</strong> {selectedDoc.postedToVista ? 'Yes' : 'No (integration pending)'}</div>
                <div><strong>Underpayment:</strong> {selectedDoc.underpaymentFlagged ? formatCents(selectedDoc.underpaymentAmount ?? 0) : 'None'}</div>
              </div>

              {selectedDoc.lineItems.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Line Items</h4>
                  <table style={TABLE}>
                    <thead>
                      <tr>
                        <th style={TH}>Claim</th>
                        <th style={TH}>Billed</th>
                        <th style={TH}>Paid</th>
                        <th style={TH}>Adjustment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDoc.lineItems.map((li, i) => (
                        <tr key={i}>
                          <td style={TD}>{li.claimId?.slice(0, 8) ?? '-'}</td>
                          <td style={TD}>{formatCents(li.billedAmount)}</td>
                          <td style={TD}>{formatCents(li.paidAmount)}</td>
                          <td style={TD}>{formatCents(li.adjustmentAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedDoc.auditTrail.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Audit Trail</h4>
                  {selectedDoc.auditTrail.map((e, i) => (
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

      {/* ── Upload ───────────────────────────────────────────── */}
      {tab === 'upload' && (
        <div style={{ maxWidth: 600 }}>
          <div style={CARD}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Upload Remittance Document</h3>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
              Upload metadata only. The actual file blob should be stored in a secure external store.
              Provide the storage reference below.
            </p>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>HMO Payer ID *</label>
                <input style={INPUT} value={formPayer} onChange={e => setFormPayer(e.target.value)} placeholder="e.g. PH-MAXICARE" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>Payer Name</label>
                <input style={INPUT} value={formPayerName} onChange={e => setFormPayerName(e.target.value)} placeholder="e.g. MaxiCare Healthcare Corp." />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>Document Type</label>
                <select style={INPUT} value={formDocType} onChange={e => setFormDocType(e.target.value)}>
                  <option value="eob">EOB (Explanation of Benefits)</option>
                  <option value="soa">SOA (Statement of Account)</option>
                  <option value="check_image">Check Image</option>
                  <option value="payment_advice">Payment Advice</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>Filename *</label>
                <input style={INPUT} value={formFilename} onChange={e => setFormFilename(e.target.value)} placeholder="e.g. maxicare-remit-2025-01.pdf" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>Storage Reference *</label>
                <input style={INPUT} value={formStorageRef} onChange={e => setFormStorageRef(e.target.value)} placeholder="e.g. s3://bucket/remittances/abc123.pdf" />
              </div>
              <button onClick={handleUpload} style={BTN_PRIMARY}>Upload Document Metadata</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Stats ────────────────────────────────────────────── */}
      {tab === 'stats' && (
        <div>
          {stats ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div style={CARD}>
                <div style={{ fontSize: 11, color: '#888' }}>Total Documents</div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.total}</div>
              </div>
              <div style={CARD}>
                <div style={{ fontSize: 11, color: '#888' }}>Total Paid</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#22c55e' }}>{formatCents(stats.totalPaid)}</div>
              </div>
              <div style={CARD}>
                <div style={{ fontSize: 11, color: '#888' }}>Underpayments</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: stats.underpaymentCount > 0 ? '#ef4444' : '#888' }}>
                  {stats.underpaymentCount}
                </div>
                {stats.underpaymentTotal > 0 && (
                  <div style={{ fontSize: 11, color: '#ef4444' }}>{formatCents(stats.underpaymentTotal)}</div>
                )}
              </div>
              {Object.entries(stats.byStatus).map(([status, count]) => (
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
