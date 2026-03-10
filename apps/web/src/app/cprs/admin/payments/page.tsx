'use client';

/**
 * Payments Dashboard -- Phase 92
 *
 * Admin page for payment tracking, remittance batch management, and reconciliation:
 *  - Upload remittance files (CSV/portal export)
 *  - Import + parse into lines
 *  - Run matching engine
 *  - View batch detail with match/unmatched lines
 *  - Reconciliation worklist for manual linking
 *  - Aging buckets summary
 *  - Underpayment cases
 *
 * Uses /payerops/payments/* endpoints.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { csrfHeaders } from '@/lib/csrf';
import { API_BASE as API } from '@/lib/api-config';

/* -- Types ------------------------------------------------------ */

interface Batch {
  id: string;
  facilityId: string;
  payerId: string;
  payerName?: string;
  sourceMode: string;
  status: string;
  matchedCount: number;
  unmatchedCount: number;
  needsReviewCount: number;
  parsedSummary?: {
    totalLines: number;
    totalPaidAmount: number;
    totalBilledAmount: number;
    parseErrors: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface RemitLine {
  id: string;
  lineNumber: number;
  claimId?: string;
  externalClaimRef?: string;
  patientRef?: string;
  amountBilled: number;
  amountPaid: number;
  amountAdjusted: number;
  matchStatus: string;
  matchedClaimCaseId?: string;
  matchConfidence?: number;
  matchMethod?: string;
  serviceDate?: string;
  reasonText?: string;
}

interface AgingBucket {
  label: string;
  claimCount: number;
  totalOutstanding: number;
}

interface Underpayment {
  id: string;
  claimCaseId: string;
  expectedAmount: number;
  paidAmount: number;
  shortfallAmount: number;
  shortfallPercent: number;
  payerId: string;
  payerName?: string;
  status: string;
  createdAt: string;
}

/* -- Status Colors ---------------------------------------------- */

const BATCH_COLORS: Record<string, string> = {
  created: '#6b7280',
  uploaded: '#8b5cf6',
  imported: '#2563eb',
  matched: '#059669',
  partially_matched: '#d97706',
  needs_review: '#dc2626',
  closed: '#374151',
};

const MATCH_COLORS: Record<string, string> = {
  unmatched: '#dc2626',
  matched: '#059669',
  needs_review: '#f59e0b',
  manually_linked: '#2563eb',
};

/* -- Tabs -------------------------------------------------------- */

type Tab = 'batches' | 'reconciliation' | 'aging' | 'underpayments';

/* -- Component -------------------------------------------------- */

export default function PaymentsDashboardPage() {
  const [tab, setTab] = useState<Tab>('batches');

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, margin: 0 }}>
        Payments & Reconciliation
      </h1>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid #e5e7eb' }}>
        {(['batches', 'reconciliation', 'aging', 'underpayments'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '6px 16px',
              fontSize: 12,
              fontWeight: tab === t ? 700 : 400,
              border: 'none',
              borderBottom: tab === t ? '2px solid #2563eb' : '2px solid transparent',
              background: 'none',
              cursor: 'pointer',
              color: tab === t ? '#2563eb' : '#6b7280',
              textTransform: 'capitalize',
              marginBottom: -2,
            }}
          >
            {t.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {tab === 'batches' && <BatchesTab />}
      {tab === 'reconciliation' && <ReconciliationTab />}
      {tab === 'aging' && <AgingTab />}
      {tab === 'underpayments' && <UnderpaymentTab />}
    </div>
  );
}

/* -- Batches Tab --------------------------------------------- */

function BatchesTab() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [batchLines, setBatchLines] = useState<RemitLine[]>([]);

  // Upload state
  const [csvContent, setCsvContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [matching, setMatching] = useState(false);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/payerops/payments/batches`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setBatches(data.items || []);
      else setError(data.error || 'Failed to load batches');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const fetchBatchDetail = async (batch: Batch) => {
    setSelectedBatch(batch);
    try {
      const res = await fetch(`${API}/payerops/payments/batches/${batch.id}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        setSelectedBatch(data.batch);
        setBatchLines(data.lines || []);
      }
    } catch {
      /* ignore */
    }
  };

  const createBatch = async (formData: Record<string, any>) => {
    try {
      const res = await fetch(`${API}/payerops/payments/batches`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.ok) {
        setShowCreate(false);
        fetchBatches();
      } else alert(data.error || 'Create failed');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const uploadAndImport = async (batchId: string) => {
    if (!csvContent.trim()) {
      alert('Paste CSV content first');
      return;
    }
    setUploading(true);
    try {
      // Upload
      await fetch(`${API}/payerops/payments/batches/${batchId}/upload`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ content: csvContent, fileName: 'remittance.csv' }),
      });
      // Import
      const res = await fetch(`${API}/payerops/payments/batches/${batchId}/import`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
      });
      const data = await res.json();
      if (data.ok) {
        alert(
          `Imported ${data.linesImported} lines. Parse errors: ${data.parseErrors?.length || 0}`
        );
        setCsvContent('');
        fetchBatches();
        if (selectedBatch?.id === batchId) fetchBatchDetail({ ...selectedBatch!, id: batchId });
      } else {
        alert(data.error || 'Import failed');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUploading(false);
    }
  };

  const runMatch = async (batchId: string) => {
    setMatching(true);
    try {
      const res = await fetch(`${API}/payerops/payments/batches/${batchId}/match`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
      });
      const data = await res.json();
      if (data.ok) {
        const r = data.matchResult;
        alert(`Matched: ${r.matched}, Needs Review: ${r.needsReview}`);
        fetchBatches();
        if (selectedBatch?.id === batchId) fetchBatchDetail({ ...selectedBatch!, id: batchId });
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setMatching(false);
    }
  };

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Remittance Batches</div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            padding: '4px 14px',
            fontSize: 12,
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          + New Batch
        </button>
      </div>

      {showCreate && (
        <CreateBatchForm onSubmit={createBatch} onCancel={() => setShowCreate(false)} />
      )}

      {error && <div style={{ color: '#dc2626', marginBottom: 8, fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 16 }}>
        {/* Batch list */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
              Loading...
            </div>
          ) : batches.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
              No batches yet. Create one to get started.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px' }}>Payer</th>
                  <th style={{ padding: '6px 8px' }}>Source</th>
                  <th style={{ padding: '6px 8px' }}>Status</th>
                  <th style={{ padding: '6px 8px' }}>Matched</th>
                  <th style={{ padding: '6px 8px' }}>Unmatched</th>
                  <th style={{ padding: '6px 8px' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => fetchBatchDetail(b)}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer',
                      background: selectedBatch?.id === b.id ? '#eff6ff' : undefined,
                    }}
                  >
                    <td style={{ padding: '6px 8px', fontWeight: 500 }}>
                      {b.payerName || b.payerId}
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <span
                        style={{
                          fontSize: 10,
                          padding: '1px 5px',
                          borderRadius: 3,
                          background: '#f3f4f6',
                        }}
                      >
                        {b.sourceMode.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <Badge label={b.status} color={BATCH_COLORS[b.status] || '#6b7280'} />
                    </td>
                    <td style={{ padding: '6px 8px', color: '#059669', fontWeight: 600 }}>
                      {b.matchedCount}
                    </td>
                    <td
                      style={{
                        padding: '6px 8px',
                        color: b.unmatchedCount > 0 ? '#dc2626' : '#6b7280',
                      }}
                    >
                      {b.unmatchedCount + b.needsReviewCount}
                    </td>
                    <td style={{ padding: '6px 8px', color: '#6b7280', fontSize: 11 }}>
                      {new Date(b.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Batch detail panel */}
        {selectedBatch && (
          <div
            style={{ width: 420, minWidth: 420, borderLeft: '1px solid #e5e7eb', paddingLeft: 16 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Batch Detail</h2>
              <button
                onClick={() => {
                  setSelectedBatch(null);
                  setBatchLines([]);
                }}
                style={{
                  fontSize: 11,
                  color: '#6b7280',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>

            <div style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}>
              <div>
                <strong>ID:</strong>{' '}
                <span style={{ fontFamily: 'monospace', fontSize: 10 }}>
                  {selectedBatch.id.slice(0, 8)}...
                </span>
              </div>
              <div>
                <strong>Payer:</strong> {selectedBatch.payerName || selectedBatch.payerId}
              </div>
              <div>
                <strong>Facility:</strong> {selectedBatch.facilityId}
              </div>
              <div>
                <strong>Status:</strong>{' '}
                <Badge
                  label={selectedBatch.status}
                  color={BATCH_COLORS[selectedBatch.status] || '#6b7280'}
                />
              </div>
              <div>
                <strong>Source:</strong> {selectedBatch.sourceMode.replace(/_/g, ' ')}
              </div>
              {selectedBatch.parsedSummary && (
                <>
                  <div>
                    <strong>Lines:</strong> {selectedBatch.parsedSummary.totalLines}
                  </div>
                  <div>
                    <strong>Total Paid:</strong>{' '}
                    {formatCurrency(selectedBatch.parsedSummary.totalPaidAmount)}
                  </div>
                  <div>
                    <strong>Total Billed:</strong>{' '}
                    {formatCurrency(selectedBatch.parsedSummary.totalBilledAmount)}
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
              {['created', 'uploaded'].includes(selectedBatch.status) && (
                <div style={{ width: '100%', marginBottom: 8 }}>
                  <textarea
                    placeholder="Paste CSV content here..."
                    value={csvContent}
                    onChange={(e) => setCsvContent(e.target.value)}
                    style={{
                      width: '100%',
                      height: 80,
                      fontSize: 11,
                      fontFamily: 'monospace',
                      padding: 6,
                      border: '1px solid #d1d5db',
                      borderRadius: 4,
                      resize: 'vertical',
                    }}
                  />
                  <button
                    onClick={() => uploadAndImport(selectedBatch.id)}
                    disabled={uploading}
                    style={{
                      padding: '4px 12px',
                      fontSize: 11,
                      background: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 3,
                      cursor: 'pointer',
                      marginTop: 4,
                    }}
                  >
                    {uploading ? 'Uploading...' : 'Upload & Import CSV'}
                  </button>
                </div>
              )}
              {['imported', 'partially_matched', 'needs_review'].includes(selectedBatch.status) && (
                <button
                  onClick={() => runMatch(selectedBatch.id)}
                  disabled={matching}
                  style={{
                    padding: '4px 12px',
                    fontSize: 11,
                    background: '#059669',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 3,
                    cursor: 'pointer',
                  }}
                >
                  {matching ? 'Matching...' : 'Run Matching'}
                </button>
              )}
            </div>

            {/* Lines table */}
            {batchLines.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Lines ({batchLines.length})
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                      <th style={{ padding: '4px 6px' }}>#</th>
                      <th style={{ padding: '4px 6px' }}>Paid</th>
                      <th style={{ padding: '4px 6px' }}>Billed</th>
                      <th style={{ padding: '4px 6px' }}>Match</th>
                      <th style={{ padding: '4px 6px' }}>Conf</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchLines.map((l) => (
                      <tr key={l.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '4px 6px' }}>{l.lineNumber}</td>
                        <td style={{ padding: '4px 6px', fontFamily: 'monospace' }}>
                          {formatCurrency(l.amountPaid)}
                        </td>
                        <td style={{ padding: '4px 6px', fontFamily: 'monospace' }}>
                          {formatCurrency(l.amountBilled)}
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <Badge
                            label={l.matchStatus.replace(/_/g, ' ')}
                            color={MATCH_COLORS[l.matchStatus] || '#6b7280'}
                          />
                        </td>
                        <td style={{ padding: '4px 6px', color: '#6b7280' }}>
                          {l.matchConfidence ?? '-'}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* -- Reconciliation Tab -------------------------------------- */

function ReconciliationTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [claimIdInput, setClaimIdInput] = useState('');

  const fetchReconciliation = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/payerops/payments/reconciliation`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) setItems(data.items || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReconciliation();
  }, [fetchReconciliation]);

  const linkClaim = async (lineId: string) => {
    if (!claimIdInput.trim()) {
      alert('Enter a Claim Case ID');
      return;
    }
    try {
      const res = await fetch(`${API}/payerops/payments/reconciliation/${lineId}/link-claim`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ claimCaseId: claimIdInput }),
      });
      const data = await res.json();
      if (data.ok) {
        setLinkingId(null);
        setClaimIdInput('');
        fetchReconciliation();
      } else alert(data.error || 'Link failed');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Reconciliation Worklist</div>
      <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12, marginTop: 0 }}>
        Unresolved remittance lines that could not be auto-matched. Manually link to a claim case.
      </p>

      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
          Loading...
        </div>
      ) : items.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
          All lines resolved. No items need review.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '6px 8px' }}>Line #</th>
              <th style={{ padding: '6px 8px' }}>Ext Ref</th>
              <th style={{ padding: '6px 8px' }}>Payer</th>
              <th style={{ padding: '6px 8px' }}>Amount Paid</th>
              <th style={{ padding: '6px 8px' }}>Service Date</th>
              <th style={{ padding: '6px 8px' }}>Status</th>
              <th style={{ padding: '6px 8px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any) => (
              <React.Fragment key={item.id}>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '6px 8px' }}>{item.lineNumber}</td>
                  <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: 10 }}>
                    {item.externalClaimRef || '-'}
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    {item.batchPayerName || item.batchPayerId || '-'}
                  </td>
                  <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>
                    {formatCurrency(item.amountPaid)}
                  </td>
                  <td style={{ padding: '6px 8px' }}>{item.serviceDate || '-'}</td>
                  <td style={{ padding: '6px 8px' }}>
                    <Badge
                      label={item.matchStatus.replace(/_/g, ' ')}
                      color={MATCH_COLORS[item.matchStatus] || '#6b7280'}
                    />
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <button
                      onClick={() => setLinkingId(linkingId === item.id ? null : item.id)}
                      style={{
                        padding: '2px 8px',
                        fontSize: 11,
                        border: '1px solid #2563eb',
                        borderRadius: 3,
                        color: '#2563eb',
                        background: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      Link
                    </button>
                  </td>
                </tr>
                {linkingId === item.id && (
                  <tr>
                    <td colSpan={7} style={{ padding: '6px 8px', background: '#f0f9ff' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          placeholder="Claim Case ID..."
                          value={claimIdInput}
                          onChange={(e) => setClaimIdInput(e.target.value)}
                          style={{
                            flex: 1,
                            padding: '4px 8px',
                            fontSize: 12,
                            border: '1px solid #d1d5db',
                            borderRadius: 3,
                          }}
                        />
                        <button
                          onClick={() => linkClaim(item.id)}
                          style={{
                            padding: '4px 12px',
                            fontSize: 12,
                            background: '#2563eb',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 3,
                            cursor: 'pointer',
                          }}
                        >
                          Confirm Link
                        </button>
                        <button
                          onClick={() => {
                            setLinkingId(null);
                            setClaimIdInput('');
                          }}
                          style={{
                            padding: '4px 12px',
                            fontSize: 12,
                            border: '1px solid #d1d5db',
                            borderRadius: 3,
                            cursor: 'pointer',
                            background: '#fff',
                          }}
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
    </div>
  );
}

/* -- Aging Tab ----------------------------------------------- */

function AgingTab() {
  const [report, setReport] = useState<{
    buckets: AgingBucket[];
    totalOutstanding: number;
    totalClaims: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/payerops/analytics/aging`, { credentials: 'include' });
        const data = await res.json();
        if (data.ok) setReport(data.report);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

  if (loading)
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
        Loading...
      </div>
    );
  if (!report)
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
        No aging data.
      </div>
    );

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
        Accounts Receivable Aging
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <StatCard
          label="Total Outstanding"
          value={formatCurrency(report.totalOutstanding)}
          color="#dc2626"
        />
        <StatCard label="Outstanding Claims" value={report.totalClaims} />
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
            <th style={{ padding: '8px' }}>Aging Bucket</th>
            <th style={{ padding: '8px' }}>Claims</th>
            <th style={{ padding: '8px' }}>Outstanding Amount</th>
            <th style={{ padding: '8px' }}>% of Total</th>
          </tr>
        </thead>
        <tbody>
          {report.buckets.map((b, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '8px', fontWeight: 500 }}>{b.label}</td>
              <td style={{ padding: '8px' }}>{b.claimCount}</td>
              <td style={{ padding: '8px', fontFamily: 'monospace' }}>
                {formatCurrency(b.totalOutstanding)}
              </td>
              <td style={{ padding: '8px', color: '#6b7280' }}>
                {report.totalOutstanding > 0
                  ? Math.round((b.totalOutstanding / report.totalOutstanding) * 100)
                  : 0}
                %
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -- Underpayment Tab ---------------------------------------- */

function UnderpaymentTab() {
  const [items, setItems] = useState<Underpayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/payerops/payments/underpayments`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (data.ok) {
          setItems(data.items || []);
          setTotal(data.total || 0);
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

  if (loading)
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
        Loading...
      </div>
    );

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
        Underpayment Cases ({total})
      </div>
      {items.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
          No underpayment cases detected.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '6px 8px' }}>Payer</th>
              <th style={{ padding: '6px 8px' }}>Expected</th>
              <th style={{ padding: '6px 8px' }}>Paid</th>
              <th style={{ padding: '6px 8px' }}>Shortfall</th>
              <th style={{ padding: '6px 8px' }}>%</th>
              <th style={{ padding: '6px 8px' }}>Status</th>
              <th style={{ padding: '6px 8px' }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '6px 8px' }}>{u.payerName || u.payerId}</td>
                <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>
                  {formatCurrency(u.expectedAmount)}
                </td>
                <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>
                  {formatCurrency(u.paidAmount)}
                </td>
                <td
                  style={{
                    padding: '6px 8px',
                    fontFamily: 'monospace',
                    color: '#dc2626',
                    fontWeight: 600,
                  }}
                >
                  {formatCurrency(u.shortfallAmount)}
                </td>
                <td style={{ padding: '6px 8px', color: '#dc2626' }}>{u.shortfallPercent}%</td>
                <td style={{ padding: '6px 8px' }}>
                  <Badge
                    label={u.status}
                    color={
                      u.status === 'open'
                        ? '#dc2626'
                        : u.status === 'resolved'
                          ? '#059669'
                          : '#f59e0b'
                    }
                  />
                </td>
                <td style={{ padding: '6px 8px', color: '#6b7280', fontSize: 11 }}>
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* -- Sub-Components ------------------------------------------ */

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 6px',
        fontSize: 10,
        fontWeight: 600,
        borderRadius: 3,
        color: '#fff',
        background: color,
        textTransform: 'uppercase',
      }}
    >
      {label.replace(/_/g, ' ')}
    </span>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div
      style={{
        padding: '8px 16px',
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: 6,
        minWidth: 140,
      }}
    >
      <div style={{ fontSize: 11, color: '#6b7280' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || '#1f2937' }}>{value}</div>
    </div>
  );
}

function CreateBatchForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (d: Record<string, any>) => void;
  onCancel: () => void;
}) {
  const [payerId, setPayerId] = useState('');
  const [payerName, setPayerName] = useState('');
  const [facilityId, setFacilityId] = useState('default');
  const [sourceMode, setSourceMode] = useState('manual_upload');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ payerId, payerName, facilityId, sourceMode, isDemo: true });
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        marginBottom: 16,
        padding: 12,
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: 6,
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8 }}>New Remittance Batch</div>
      <div
        style={{
          marginBottom: 10,
          padding: '8px 10px',
          background: '#fff7ed',
          border: '1px solid #fdba74',
          borderRadius: 6,
          color: '#9a3412',
        }}
      >
        New batches created from this form are demo remittance batches for workflow testing, not live
        payer remittances.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
        <label>
          Payer ID
          <br />
          <input
            value={payerId}
            onChange={(e) => setPayerId(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '4px 6px',
              border: '1px solid #d1d5db',
              borderRadius: 3,
              fontSize: 12,
            }}
          />
        </label>
        <label>
          Payer Name
          <br />
          <input
            value={payerName}
            onChange={(e) => setPayerName(e.target.value)}
            style={{
              width: '100%',
              padding: '4px 6px',
              border: '1px solid #d1d5db',
              borderRadius: 3,
              fontSize: 12,
            }}
          />
        </label>
        <label>
          Facility
          <br />
          <input
            value={facilityId}
            onChange={(e) => setFacilityId(e.target.value)}
            style={{
              width: '100%',
              padding: '4px 6px',
              border: '1px solid #d1d5db',
              borderRadius: 3,
              fontSize: 12,
            }}
          />
        </label>
        <label>
          Source
          <br />
          <select
            value={sourceMode}
            onChange={(e) => setSourceMode(e.target.value)}
            style={{
              width: '100%',
              padding: '4px 6px',
              border: '1px solid #d1d5db',
              borderRadius: 3,
              fontSize: 12,
            }}
          >
            <option value="manual_upload">Manual Upload</option>
            <option value="portal_export">Portal Export</option>
            <option value="api">API</option>
          </select>
        </label>
      </div>
      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <button
          type="submit"
          style={{
            padding: '4px 16px',
            fontSize: 12,
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 3,
            cursor: 'pointer',
          }}
        >
          Create
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '4px 16px',
            fontSize: 12,
            border: '1px solid #d1d5db',
            borderRadius: 3,
            cursor: 'pointer',
            background: '#fff',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
