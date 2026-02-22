'use client';

/**
 * Denials Workbench — Phase 91
 *
 * Admin page for managing claim denials:
 *  - List all denials with filter (resolved/unresolved, source)
 *  - View denial detail with reason codes and remediation guidance
 *  - Resolve denials with notes
 *  - Link to parent claim case
 *
 * Uses /rcm/claims/lifecycle/denials endpoint.
 */

import React, { useEffect, useState, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/* ── Types ────────────────────────────────────────────────────── */

interface DenialItem {
  id: string;
  claimCaseId: string;
  source: string;
  reasonCode: string;
  reasonDescription: string;
  reasonCategory?: string;
  denialAmount?: number;
  deniedAt: string;
  recommendedAction?: string;
  fieldToFix?: string;
  assignedTo?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
  appealId?: string;
  claimCase?: {
    id: string;
    lifecycleStatus: string;
    patientDfn: string;
    patientName?: string;
    payerId: string;
    payerName?: string;
    totalCharge: number;
    dateOfService: string;
  };
}

/* ── Source Colors ─────────────────────────────────────────────── */

const SOURCE_COLORS: Record<string, string> = {
  payer_remit: '#dc2626',
  payer_status: '#f59e0b',
  scrub_reject: '#8b5cf6',
  portal_response: '#0891b2',
  manual: '#6b7280',
};

/* ── Component ────────────────────────────────────────────────── */

export default function DenialsWorkbenchPage() {
  const [denials, setDenials] = useState<DenialItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [resolvedFilter, setResolvedFilter] = useState<string>('false');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const limit = 25;

  // Resolve form
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const fetchDenials = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (resolvedFilter) params.set('resolved', resolvedFilter);
      if (sourceFilter) params.set('source', sourceFilter);
      params.set('limit', String(limit));
      params.set('offset', String(page * limit));

      const res = await fetch(`${API}/rcm/claims/lifecycle/denials?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setDenials(data.items || []);
        setTotal(data.total || 0);
      } else {
        setError(data.error || 'Failed to load denials');
      }
    } catch (e: any) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [resolvedFilter, sourceFilter, page]);

  useEffect(() => { fetchDenials(); }, [fetchDenials]);

  const resolveDenial = async (denialId: string) => {
    try {
      const res = await fetch(`${API}/rcm/claims/lifecycle/denials/${denialId}/resolve`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionNote }),
      });
      const data = await res.json();
      if (data.ok) {
        setResolvingId(null);
        setResolutionNote('');
        fetchDenials();
      } else {
        alert(data.error || 'Resolution failed');
      }
    } catch (e: any) {
      alert(e.message || 'Network error');
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, margin: 0 }}>Denials Workbench</h1>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <select value={resolvedFilter} onChange={e => { setResolvedFilter(e.target.value); setPage(0); }}
          style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4 }}>
          <option value="">All</option>
          <option value="false">Unresolved</option>
          <option value="true">Resolved</option>
        </select>
        <select value={sourceFilter} onChange={e => { setSourceFilter(e.target.value); setPage(0); }}
          style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4 }}>
          <option value="">All Sources</option>
          <option value="payer_remit">Payer Remit</option>
          <option value="payer_status">Payer Status</option>
          <option value="scrub_reject">Scrub Reject</option>
          <option value="portal_response">Portal Response</option>
          <option value="manual">Manual</option>
        </select>
        <button onClick={fetchDenials}
          style={{ padding: '4px 12px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', background: '#f9fafb' }}>
          Refresh
        </button>
      </div>

      {error && <div style={{ color: '#dc2626', marginBottom: 8, fontSize: 13 }}>{error}</div>}

      {/* Denials Table */}
      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>Loading...</div>
      ) : denials.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
          No denials found. {resolvedFilter === 'false' ? 'All denials have been resolved.' : ''}
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '6px 8px' }}>Reason</th>
              <th style={{ padding: '6px 8px' }}>Source</th>
              <th style={{ padding: '6px 8px' }}>Patient</th>
              <th style={{ padding: '6px 8px' }}>Payer</th>
              <th style={{ padding: '6px 8px' }}>Amount</th>
              <th style={{ padding: '6px 8px' }}>Denied</th>
              <th style={{ padding: '6px 8px' }}>Status</th>
              <th style={{ padding: '6px 8px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {denials.map(d => (
              <React.Fragment key={d.id}>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '6px 8px' }}>
                    <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{d.reasonCode}</div>
                    <div style={{ color: '#6b7280', fontSize: 11 }}>{d.reasonDescription}</div>
                    {d.reasonCategory && (
                      <span style={{ fontSize: 10, color: '#9ca3af' }}>Category: {d.reasonCategory}</span>
                    )}
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '1px 6px',
                      fontSize: 10,
                      fontWeight: 600,
                      borderRadius: 3,
                      color: '#fff',
                      background: SOURCE_COLORS[d.source] || '#6b7280',
                    }}>
                      {d.source.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    {d.claimCase?.patientName || d.claimCase?.patientDfn || '-'}
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    {d.claimCase?.payerName || d.claimCase?.payerId || '-'}
                  </td>
                  <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>
                    {d.denialAmount ? formatCurrency(d.denialAmount) : '-'}
                  </td>
                  <td style={{ padding: '6px 8px', color: '#6b7280', fontSize: 11 }}>
                    {new Date(d.deniedAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    {d.resolvedAt ? (
                      <span style={{ color: '#059669', fontWeight: 500, fontSize: 11 }}>Resolved</span>
                    ) : (
                      <span style={{ color: '#dc2626', fontWeight: 500, fontSize: 11 }}>Open</span>
                    )}
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    {!d.resolvedAt && (
                      <button
                        onClick={() => setResolvingId(resolvingId === d.id ? null : d.id)}
                        style={{
                          padding: '2px 8px',
                          fontSize: 11,
                          border: '1px solid #059669',
                          borderRadius: 3,
                          color: '#059669',
                          background: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        Resolve
                      </button>
                    )}
                    {d.resolvedAt && d.resolutionNote && (
                      <span style={{ fontSize: 10, color: '#6b7280' }} title={d.resolutionNote}>
                        {d.resolutionNote.slice(0, 30)}{d.resolutionNote.length > 30 ? '...' : ''}
                      </span>
                    )}
                  </td>
                </tr>

                {/* Inline remediation panel */}
                {!d.resolvedAt && d.recommendedAction && resolvingId !== d.id && (
                  <tr>
                    <td colSpan={8} style={{ padding: '4px 8px 8px', background: '#fffbeb', fontSize: 11 }}>
                      <strong>Recommended:</strong> {d.recommendedAction}
                      {d.fieldToFix && <span style={{ color: '#6b7280' }}> (field: {d.fieldToFix})</span>}
                    </td>
                  </tr>
                )}

                {/* Resolution form */}
                {resolvingId === d.id && (
                  <tr>
                    <td colSpan={8} style={{ padding: '8px', background: '#f0fdf4' }}>
                      {d.recommendedAction && (
                        <div style={{ fontSize: 11, marginBottom: 6, color: '#6b7280' }}>
                          <strong>Recommended:</strong> {d.recommendedAction}
                          {d.fieldToFix && <span> (field: {d.fieldToFix})</span>}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          placeholder="Resolution note..."
                          value={resolutionNote}
                          onChange={e => setResolutionNote(e.target.value)}
                          style={{ flex: 1, padding: '4px 8px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 3 }}
                        />
                        <button
                          onClick={() => resolveDenial(d.id)}
                          style={{ padding: '4px 12px', fontSize: 12, background: '#059669', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' }}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => { setResolvingId(null); setResolutionNote(''); }}
                          style={{ padding: '4px 12px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 3, cursor: 'pointer', background: '#fff' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {total > limit && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'center' }}>
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
            style={{ padding: '4px 12px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4, cursor: page === 0 ? 'default' : 'pointer' }}>
            Prev
          </button>
          <span style={{ fontSize: 12, lineHeight: '28px', color: '#6b7280' }}>
            Page {page + 1} of {Math.ceil(total / limit)}
          </span>
          <button disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)}
            style={{ padding: '4px 12px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4, cursor: (page + 1) * limit >= total ? 'default' : 'pointer' }}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
