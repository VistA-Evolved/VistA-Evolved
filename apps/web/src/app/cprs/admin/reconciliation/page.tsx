'use client';

/**
 * RCM Reconciliation -- Phase 99
 *
 * Tabbed interface for payment reconciliation:
 *   - Upload -- Import remittance batch (835 JSON or manual)
 *   - Payments -- Paginated payment list with match status
 *   - Matches -- Review queue for matches needing confirmation
 *   - Underpayments -- Cases with shortfall, bridge to denials
 *   - Dashboard -- Reconciliation stats
 *
 * Accessible at /cprs/admin/reconciliation. Requires session.
 */

import { useState, useEffect, useCallback } from 'react';
import { csrfHeaders } from '@/lib/csrf';
import styles from '@/components/cprs/cprs.module.css';
import { API_BASE } from '@/lib/api-config';

type Tab = 'upload' | 'payments' | 'matches' | 'underpayments' | 'dashboard';

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...opts,
    headers: { ...csrfHeaders(), ...(opts?.headers || {}) },
  });
  return res.json();
}

async function apiFetchStrict<T>(path: string, opts?: RequestInit): Promise<T> {
  const data = await apiFetch(path, opts);
  if (data && typeof data === 'object' && 'ok' in data && data.ok === false) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Request failed');
  }
  return data as T;
}

async function apiPost(path: string, body: unknown) {
  return apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function apiPatch(path: string, body: unknown) {
  return apiFetch(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/* -- Status colors --------------------------------------------- */

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  IMPORTED: '#0d6efd',
  MATCHED: '#198754',
  PARTIALLY_MATCHED: '#fd7e14',
  UNMATCHED: '#dc3545',
  POSTED: '#20c997',
  DISPUTED: '#6f42c1',
};

const UNDERPAYMENT_STATUS_COLORS: Record<string, string> = {
  NEW: '#0d6efd',
  INVESTIGATING: '#6f42c1',
  APPEALING: '#fd7e14',
  RESOLVED: '#198754',
  WRITTEN_OFF: '#6c757d',
};

const MATCH_STATUS_COLORS: Record<string, string> = {
  AUTO_MATCHED: '#198754',
  REVIEW_REQUIRED: '#fd7e14',
  CONFIRMED: '#20c997',
  REJECTED: '#dc3545',
};

/* -- Helpers --------------------------------------------------- */

function cents(c: number): string {
  return `$${(c / 100).toFixed(2)}`;
}

function badge(text: string, color: string): React.ReactElement {
  return (
    <span
      style={{
        backgroundColor: color,
        color: '#fff',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 600,
      }}
    >
      {text}
    </span>
  );
}

/* -- Main Page ------------------------------------------------- */

export default function ReconciliationPage() {
  const [tab, setTab] = useState<Tab>('upload');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Upload state
  const [jsonInput, setJsonInput] = useState('');

  // Payments state
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentTotal, setPaymentTotal] = useState(0);
  const [paymentTotalPages, setPaymentTotalPages] = useState(1);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');

  // Matches review state
  const [reviewMatches, setReviewMatches] = useState<any[]>([]);

  // Underpayments state
  const [underpayments, setUnderpayments] = useState<any[]>([]);
  const [upPage, setUpPage] = useState(1);
  const [upTotal, setUpTotal] = useState(0);
  const [upTotalPages, setUpTotalPages] = useState(1);
  const [upStatusFilter, setUpStatusFilter] = useState('');

  // Dashboard state
  const [stats, setStats] = useState<any>(null);

  // Imports history
  const [imports, setImports] = useState<any[]>([]);

  /* -- Data loaders ------------------------------------------ */

  const loadPayments = useCallback(async () => {
    setLoading(true);
    const qs = `page=${paymentPage}&limit=20${paymentStatusFilter ? `&status=${paymentStatusFilter}` : ''}`;
    const data = await apiFetch(`/rcm/reconciliation/payments?${qs}`);
    if (data.ok) {
      setPayments(data.items ?? []);
      setPaymentTotal(data.total ?? 0);
      setPaymentTotalPages(Math.max(1, Number(data.totalPages ?? 1) || 1));
    }
    setLoading(false);
  }, [paymentPage, paymentStatusFilter]);

  const loadReviewMatches = useCallback(async () => {
    setLoading(true);
    const data = await apiFetch('/rcm/reconciliation/matches/review');
    if (data.ok) setReviewMatches(data.matches ?? []);
    setLoading(false);
  }, []);

  const loadUnderpayments = useCallback(async () => {
    setLoading(true);
    const qs = `page=${upPage}&limit=20${upStatusFilter ? `&status=${upStatusFilter}` : ''}`;
    const data = await apiFetch(`/rcm/reconciliation/underpayments?${qs}`);
    if (data.ok) {
      setUnderpayments(data.items ?? []);
      setUpTotal(data.total ?? 0);
      setUpTotalPages(Math.max(1, Number(data.totalPages ?? 1) || 1));
    }
    setLoading(false);
  }, [upPage, upStatusFilter]);

  const loadStats = useCallback(async () => {
    setLoading(true);
    const data = await apiFetch('/rcm/reconciliation/stats');
    if (data.ok) setStats(data.stats);
    setLoading(false);
  }, []);

  const loadImports = useCallback(async () => {
    const data = await apiFetch('/rcm/reconciliation/imports');
    if (data.ok) setImports(data.imports ?? []);
  }, []);

  /* -- Tab data loading -------------------------------------- */

  useEffect(() => {
    apiFetchStrict<any>('/rcm/reconciliation/imports')
      .then((data) => {
        setImports(data.imports ?? []);
        setPageError(null);
      })
      .catch((error: unknown) => {
        setImports([]);
        setPageError(error instanceof Error ? error.message : 'Unable to load reconciliation console');
      })
      .finally(() => setBootstrapping(false));
  }, []);

  useEffect(() => {
    if (bootstrapping || pageError) return;
    if (tab === 'upload') loadImports();
    if (tab === 'payments') loadPayments();
    if (tab === 'matches') loadReviewMatches();
    if (tab === 'underpayments') loadUnderpayments();
    if (tab === 'dashboard') loadStats();
  }, [bootstrapping, pageError, tab, loadPayments, loadReviewMatches, loadUnderpayments, loadStats, loadImports]);

  /* -- Handlers ---------------------------------------------- */

  async function handleImport() {
    if (!jsonInput.trim()) {
      setMessage('Paste remittance JSON first');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const parsed = JSON.parse(jsonInput);
      const data = await apiPost('/rcm/reconciliation/import', parsed);
      if (data.ok) {
        setMessage(
          `Imported ${data.paymentsCreated} payment records. Import ID: ${data.import?.id ?? 'unknown'}`
        );
        setJsonInput('');
        loadImports();
      } else {
        setMessage(`Import failed: ${JSON.stringify(data.error ?? data)}`);
      }
    } catch (err: any) {
      setMessage(`Parse error: ${err.message}`);
    }
    setLoading(false);
  }

  async function handleRunMatching(importId: string) {
    setLoading(true);
    const data = await apiPost('/rcm/reconciliation/match-batch', { importId });
    if (data.ok) {
      setMessage(
        `Matching complete: ${data.matched} matched, ${data.needsReview} review, ${data.unmatched} unmatched, ${data.underpayments} underpayments`
      );
    } else {
      setMessage(`Matching failed: ${JSON.stringify(data.error ?? data)}`);
    }
    setLoading(false);
  }

  async function handleConfirmMatch(matchId: string, decision: 'CONFIRMED' | 'REJECTED') {
    const data = await apiPatch(`/rcm/reconciliation/matches/${matchId}`, {
      matchStatus: decision,
      notes: `${decision} via UI`,
    });
    if (data.ok) {
      setMessage(`Match ${decision.toLowerCase()}`);
      loadReviewMatches();
    }
  }

  async function handleSendToDenials(upId: string) {
    const data = await apiPost(`/rcm/reconciliation/underpayments/${upId}/send-to-denials`, {});
    if (data.ok) {
      setMessage(`Denial case created: ${data.denialCaseId}`);
      loadUnderpayments();
    } else {
      setMessage(`Error: ${JSON.stringify(data.error ?? data)}`);
    }
  }

  /* -- Tab bar ----------------------------------------------- */

  const tabs: { key: Tab; label: string }[] = [
    { key: 'upload', label: 'Upload Remittance' },
    { key: 'payments', label: 'Payments' },
    { key: 'matches', label: 'Review Matches' },
    { key: 'underpayments', label: 'Underpayments' },
    { key: 'dashboard', label: 'Dashboard' },
  ];

  return (
    <div className={styles.cprsRoot} style={{ padding: '16px' }}>
      <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>
        RCM Reconciliation
      </h1>

      {bootstrapping ? (
        <div style={{ marginBottom: '8px', color: '#666' }}>Loading reconciliation console...</div>
      ) : pageError ? (
        <div
          style={{
            padding: '8px 12px',
            marginBottom: '12px',
            backgroundColor: '#f8d7da',
            borderRadius: '4px',
            fontSize: '13px',
            color: '#842029',
          }}
        >
          Unable to load reconciliation console. {pageError}
        </div>
      ) : (
        <>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setTab(t.key);
                  setMessage('');
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '4px',
                  border: '1px solid #aaa',
                  background: tab === t.key ? '#0d6efd' : '#f8f9fa',
                  color: tab === t.key ? '#fff' : '#333',
                  cursor: 'pointer',
                  fontWeight: tab === t.key ? 600 : 400,
                  fontSize: '13px',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Status message */}
          {message && (
            <div
              style={{
                padding: '8px 12px',
                marginBottom: '12px',
                backgroundColor:
                  message.includes('failed') || message.includes('Error') || message.includes('error')
                    ? '#f8d7da'
                    : '#d1e7dd',
                borderRadius: '4px',
                fontSize: '13px',
              }}
            >
              {message}
            </div>
          )}

          {loading && <div style={{ marginBottom: '8px', color: '#666' }}>Loading...</div>}

          {/* -- Upload Tab -------------------------------------- */}
          {tab === 'upload' && (
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
            Import Remittance Batch
          </h2>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
            Paste a remittance JSON payload. Format:{' '}
            {`{ entries: [{ claimRef, payerId, billedAmount, paidAmount, ... }], sourceType, originalFilename }`}
          </p>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='{"entries": [{"claimRef": "CLM-001", "payerId": "PAYER-A", "billedAmount": 500, "paidAmount": 450}], "sourceType": "MANUAL"}'
            style={{
              width: '100%',
              height: '160px',
              fontFamily: 'monospace',
              fontSize: '12px',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              marginBottom: '8px',
            }}
          />
          <button
            onClick={handleImport}
            disabled={loading}
            style={{
              padding: '8px 20px',
              background: '#0d6efd',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Import
          </button>

          {/* Import history */}
          {imports.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                Import History
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ddd' }}>
                    <th style={{ textAlign: 'left', padding: '4px 8px' }}>ID</th>
                    <th style={{ textAlign: 'left', padding: '4px 8px' }}>Source</th>
                    <th style={{ textAlign: 'right', padding: '4px 8px' }}>Lines</th>
                    <th style={{ textAlign: 'right', padding: '4px 8px' }}>Total Paid</th>
                    <th style={{ textAlign: 'left', padding: '4px 8px' }}>Created</th>
                    <th style={{ textAlign: 'left', padding: '4px 8px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {imports.map((imp: any) => (
                    <tr key={imp.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>
                        {imp.id.slice(0, 8)}
                      </td>
                      <td style={{ padding: '4px 8px' }}>{imp.sourceType}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>{imp.lineCount}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                        {cents(imp.totalPaidCents)}
                      </td>
                      <td style={{ padding: '4px 8px' }}>{imp.createdAt?.slice(0, 16)}</td>
                      <td style={{ padding: '4px 8px' }}>
                        <button
                          onClick={() => handleRunMatching(imp.id)}
                          style={{
                            padding: '2px 8px',
                            fontSize: '11px',
                            border: '1px solid #198754',
                            color: '#198754',
                            background: '#fff',
                            borderRadius: '3px',
                            cursor: 'pointer',
                          }}
                        >
                          Run Matching
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
          )}

          {/* -- Payments Tab ------------------------------------ */}
          {tab === 'payments' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
            <label style={{ fontSize: '13px' }}>Status:</label>
            <select
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value);
                setPaymentPage(1);
              }}
              style={{
                border: '1px solid #ccc',
                fontSize: '12px',
              }}
            >
              <option value="">All</option>
              {['IMPORTED', 'MATCHED', 'PARTIALLY_MATCHED', 'UNMATCHED', 'POSTED', 'DISPUTED'].map(
                (s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                )
              )}
            </select>
            <span style={{ fontSize: '12px', color: '#666' }}>
              {paymentTotal} total | Page {paymentPage}/{paymentTotalPages}
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ textAlign: 'left', padding: '4px 8px' }}>Claim Ref</th>
                <th style={{ textAlign: 'left', padding: '4px 8px' }}>Payer</th>
                <th style={{ textAlign: 'left', padding: '4px 8px' }}>Status</th>
                <th style={{ textAlign: 'right', padding: '4px 8px' }}>Billed</th>
                <th style={{ textAlign: 'right', padding: '4px 8px' }}>Paid</th>
                <th style={{ textAlign: 'left', padding: '4px 8px' }}>Service Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p: any) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>{p.claimRef}</td>
                  <td style={{ padding: '4px 8px' }}>{p.payerId}</td>
                  <td style={{ padding: '4px 8px' }}>
                    {badge(p.status, PAYMENT_STATUS_COLORS[p.status] ?? '#999')}
                  </td>
                  <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                    {cents(p.billedAmountCents)}
                  </td>
                  <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                    {cents(p.paidAmountCents)}
                  </td>
                  <td style={{ padding: '4px 8px' }}>{p.serviceDate ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'center' }}>
            <button
              disabled={paymentPage <= 1}
              onClick={() => setPaymentPage((p) => p - 1)}
              style={{
                padding: '4px 12px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                cursor: 'pointer',
              }}
            >
              &lt; Prev
            </button>
            <button
              disabled={paymentPage >= paymentTotalPages}
              onClick={() => setPaymentPage((p) => p + 1)}
              style={{
                padding: '4px 12px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                cursor: 'pointer',
              }}
            >
              Next &gt;
            </button>
          </div>
        </div>
      )}

          {/* -- Matches Review Tab ------------------------------ */}
          {tab === 'matches' && (
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
            Matches Pending Review
          </h2>
          {reviewMatches.length === 0 ? (
            <p style={{ color: '#666', fontSize: '13px' }}>No matches need review.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ddd' }}>
                  <th style={{ textAlign: 'left', padding: '4px 8px' }}>Match ID</th>
                  <th style={{ textAlign: 'left', padding: '4px 8px' }}>Claim Ref</th>
                  <th style={{ textAlign: 'left', padding: '4px 8px' }}>Method</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>Confidence</th>
                  <th style={{ textAlign: 'left', padding: '4px 8px' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '4px 8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviewMatches.map((m: any) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>
                      {m.id.slice(0, 8)}
                    </td>
                    <td style={{ padding: '4px 8px' }}>{m.claimRef}</td>
                    <td style={{ padding: '4px 8px' }}>{m.matchMethod}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right' }}>{m.matchConfidence}%</td>
                    <td style={{ padding: '4px 8px' }}>
                      {badge(m.matchStatus, MATCH_STATUS_COLORS[m.matchStatus] ?? '#999')}
                    </td>
                    <td style={{ padding: '4px 8px' }}>
                      <button
                        onClick={() => handleConfirmMatch(m.id, 'CONFIRMED')}
                        style={{
                          marginRight: '4px',
                          padding: '2px 8px',
                          fontSize: '11px',
                          border: '1px solid #198754',
                          color: '#198754',
                          background: '#fff',
                          borderRadius: '3px',
                          cursor: 'pointer',
                        }}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => handleConfirmMatch(m.id, 'REJECTED')}
                        style={{
                          padding: '2px 8px',
                          fontSize: '11px',
                          border: '1px solid #dc3545',
                          color: '#dc3545',
                          background: '#fff',
                          borderRadius: '3px',
                          cursor: 'pointer',
                        }}
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
          )}

          {/* -- Underpayments Tab ------------------------------- */}
          {tab === 'underpayments' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
            <label style={{ fontSize: '13px' }}>Status:</label>
            <select
              value={upStatusFilter}
              onChange={(e) => {
                setUpStatusFilter(e.target.value);
                setUpPage(1);
              }}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                fontSize: '12px',
              }}
            >
              <option value="">All</option>
              {['NEW', 'INVESTIGATING', 'APPEALING', 'RESOLVED', 'WRITTEN_OFF'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span style={{ fontSize: '12px', color: '#666' }}>
              {upTotal} total | Page {upPage}/{upTotalPages}
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ textAlign: 'left', padding: '4px 8px' }}>Claim Ref</th>
                <th style={{ textAlign: 'left', padding: '4px 8px' }}>Payer</th>
                <th style={{ textAlign: 'left', padding: '4px 8px' }}>Status</th>
                <th style={{ textAlign: 'right', padding: '4px 8px' }}>Expected</th>
                <th style={{ textAlign: 'right', padding: '4px 8px' }}>Paid</th>
                <th style={{ textAlign: 'right', padding: '4px 8px' }}>Delta</th>
                <th style={{ textAlign: 'left', padding: '4px 8px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {underpayments.map((u: any) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>{u.claimRef}</td>
                  <td style={{ padding: '4px 8px' }}>{u.payerId}</td>
                  <td style={{ padding: '4px 8px' }}>
                    {badge(u.status, UNDERPAYMENT_STATUS_COLORS[u.status] ?? '#999')}
                  </td>
                  <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                    {cents(u.expectedAmountCents)}
                  </td>
                  <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                    {cents(u.paidAmountCents)}
                  </td>
                  <td
                    style={{
                      padding: '4px 8px',
                      textAlign: 'right',
                      color: '#dc3545',
                      fontWeight: 600,
                    }}
                  >
                    {cents(u.deltaCents)}
                  </td>
                  <td style={{ padding: '4px 8px' }}>
                    {u.status === 'NEW' || u.status === 'INVESTIGATING' ? (
                      <button
                        onClick={() => handleSendToDenials(u.id)}
                        style={{
                          padding: '2px 8px',
                          fontSize: '11px',
                          border: '1px solid #fd7e14',
                          color: '#fd7e14',
                          background: '#fff',
                          borderRadius: '3px',
                          cursor: 'pointer',
                        }}
                      >
                        Send to Denials
                      </button>
                    ) : u.denialCaseId ? (
                      <span style={{ fontSize: '11px', color: '#666' }}>
                        Denial: {u.denialCaseId.slice(0, 8)}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'center' }}>
            <button
              disabled={upPage <= 1}
              onClick={() => setUpPage((p) => p - 1)}
              style={{
                padding: '4px 12px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                cursor: 'pointer',
              }}
            >
              &lt; Prev
            </button>
            <button
              disabled={upPage >= upTotalPages}
              onClick={() => setUpPage((p) => p + 1)}
              style={{
                padding: '4px 12px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                cursor: 'pointer',
              }}
            >
              Next &gt;
            </button>
          </div>
        </div>
          )}

          {/* -- Dashboard Tab ----------------------------------- */}
          {tab === 'dashboard' && stats && (
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
            Reconciliation Dashboard
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '12px',
            }}
          >
            {[
              { label: 'Total Imports', value: stats.totalImports, color: '#0d6efd' },
              { label: 'Total Payments', value: stats.totalPayments, color: '#6f42c1' },
              { label: 'Matched', value: stats.matchedPayments, color: '#198754' },
              { label: 'Unmatched', value: stats.unmatchedPayments, color: '#dc3545' },
              { label: 'Total Paid', value: cents(stats.totalPaidCents), color: '#20c997' },
              { label: 'Underpayments', value: stats.totalUnderpayments, color: '#fd7e14' },
              { label: 'Open Underpayments', value: stats.openUnderpayments, color: '#fd7e14' },
              { label: 'Total Shortfall', value: cents(stats.totalDeltaCents), color: '#dc3545' },
            ].map((card) => (
              <div
                key={card.label}
                style={{
                  border: `2px solid ${card.color}`,
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '24px', fontWeight: 700, color: card.color }}>
                  {card.value}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  {card.label}
                </div>
              </div>
            ))}
          </div>
        </div>
          )}
        </>
      )}
    </div>
  );
}
