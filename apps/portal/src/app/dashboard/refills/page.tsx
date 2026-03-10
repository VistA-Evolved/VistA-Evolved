/**
 * Refills Page -- Medication refill requests (Phase 32).
 * Submit new refill requests, view status, cancel pending.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { DataSourceBadge } from '@/components/data-source-badge';
import { API_BASE as API } from '@/lib/api-config';

interface RefillRequest {
  id: string;
  medicationName: string;
  medicationId: string;
  status: string;
  statusNote: string;
  requestedAt: string;
  updatedAt: string;
  vistaSync: string;
  isProxy: boolean;
}

export default function RefillsPage() {
  const [refills, setRefills] = useState<RefillRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [medName, setMedName] = useState('');
  const [medId, setMedId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadRefills = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/portal/refills`, { credentials: 'include' });
      if (res.ok) {
        const d = await res.json();
        setRefills(d.refills || []);
      }
    } catch {
      /* swallow */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRefills();
  }, [loadRefills]);

  async function submitRefill() {
    if (!medName.trim() || !medId.trim()) {
      setNotice('Please enter medication name and ID.');
      return;
    }
    setSubmitting(true);
    setNotice('');
    try {
      const res = await fetch(`${API}/portal/refills`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicationName: medName.trim(), medicationId: medId.trim() }),
      });
      const d = await res.json();
      if (d.ok) {
        setNotice(
          'Refill request submitted successfully. Review and EHR filing are still pending until the request moves beyond the pending queue.'
        );
        setMedName('');
        setMedId('');
        loadRefills();
      } else {
        setNotice(d.error || 'Failed to submit refill request.');
      }
    } catch {
      setNotice('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelRefill(id: string) {
    try {
      const res = await fetch(`${API}/portal/refills/${id}/cancel`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        setNotice('Refill request cancelled.');
        loadRefills();
      }
    } catch {
      /* swallow */
    }
  }

  const statusColor = (s: string) => {
    switch (s) {
      case 'approved':
      case 'filed_in_vista':
        return '#16a34a';
      case 'denied':
      case 'cancelled':
        return '#ef4444';
      case 'pending_review':
      case 'requested':
        return '#d97706';
      default:
        return '#64748b';
    }
  };

  return (
    <div className="container">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Refill Requests</h1>
        <p style={{ color: 'var(--portal-text-muted)', fontSize: '0.875rem' }}>
          Request medication refills and track their status
        </p>
      </div>

      {notice && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            marginBottom: '1rem',
            borderRadius: 4,
            fontSize: '0.875rem',
            background: notice.includes('success') ? '#dcfce7' : '#fef3c7',
            color: notice.includes('success') ? '#166534' : '#92400e',
          }}
        >
          {notice}
        </div>
      )}

      {/* Submit form */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.5rem' }}>Request a Refill</h3>
        <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.75rem' }}>
          Enter the medication name and ID from your active medications list.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label
              style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: 2 }}
            >
              Medication Name
            </label>
            <input
              value={medName}
              onChange={(e) => setMedName(e.target.value)}
              placeholder="e.g., LISINOPRIL 10MG TAB"
              style={{
                width: '100%',
                padding: '0.375rem 0.5rem',
                border: '1px solid #e2e8f0',
                borderRadius: 4,
                fontSize: '0.875rem',
              }}
            />
          </div>
          <div style={{ width: 120 }}>
            <label
              style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: 2 }}
            >
              Medication ID
            </label>
            <input
              value={medId}
              onChange={(e) => setMedId(e.target.value)}
              placeholder="med-1001"
              style={{
                width: '100%',
                padding: '0.375rem 0.5rem',
                border: '1px solid #e2e8f0',
                borderRadius: 4,
                fontSize: '0.875rem',
              }}
            />
          </div>
          <button
            onClick={submitRefill}
            disabled={submitting}
            style={{
              padding: '0.375rem 1rem',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              fontSize: '0.875rem',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? 'Submitting...' : 'Request Refill'}
          </button>
        </div>
      </div>

      {/* Refill list */}
      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem',
          }}
        >
          <h3 style={{ margin: 0 }}>Your Refill Requests</h3>
          <DataSourceBadge source="pending" />
        </div>

        {loading ? (
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Loading refills...</p>
        ) : refills.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <p>No refill requests yet.</p>
          </div>
        ) : (
          <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '0.375rem 0.5rem' }}>Medication</th>
                <th style={{ padding: '0.375rem 0.5rem' }}>Status</th>
                <th style={{ padding: '0.375rem 0.5rem' }}>Requested</th>
                <th style={{ padding: '0.375rem 0.5rem' }}>Note</th>
                <th style={{ padding: '0.375rem 0.5rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {refills.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.375rem 0.5rem', fontWeight: 500 }}>
                    {r.medicationName}
                  </td>
                  <td style={{ padding: '0.375rem 0.5rem' }}>
                    <span style={{ color: statusColor(r.status), fontWeight: 500 }}>
                      {r.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '0.375rem 0.5rem', color: '#64748b' }}>
                    {new Date(r.requestedAt).toLocaleDateString()}
                  </td>
                  <td
                    style={{ padding: '0.375rem 0.5rem', fontSize: '0.8125rem', color: '#64748b' }}
                  >
                    {r.statusNote}
                  </td>
                  <td style={{ padding: '0.375rem 0.5rem' }}>
                    {['requested', 'pending_review'].includes(r.status) && (
                      <button
                        onClick={() => cancelRefill(r.id)}
                        style={{
                          fontSize: '0.75rem',
                          color: '#ef4444',
                          background: 'transparent',
                          border: '1px solid #ef4444',
                          borderRadius: 4,
                          padding: '2px 8px',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
