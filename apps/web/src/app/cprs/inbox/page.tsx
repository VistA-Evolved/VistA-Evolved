'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/stores/session-context';
import CPRSMenuBar from '@/components/cprs/CPRSMenuBar';
import styles from '@/components/cprs/cprs.module.css';
import { csrfHeaders } from '@/lib/csrf';
import { API_BASE } from '@/lib/api-config';


/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface InboxItem {
  id: string;
  type: 'unsigned_order' | 'abnormal_lab' | 'pending_consult' | 'flagged_result' | 'cosign_needed' | 'notification';
  priority: 'routine' | 'urgent' | 'stat';
  patientDfn?: string;
  patientName?: string;
  summary: string;
  detail: string;
  dateTime: string;
  acknowledged: boolean;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const TYPE_LABELS: Record<string, string> = {
  unsigned_order: 'Unsigned Order',
  abnormal_lab: 'Abnormal Lab',
  pending_consult: 'Pending Consult',
  flagged_result: 'Flagged Result',
  cosign_needed: 'Co-Sign Needed',
  notification: 'Notification',
};

const PRIORITY_COLORS: Record<string, string> = {
  stat: '#dc3545',
  urgent: '#fd7e14',
  routine: 'var(--cprs-text-muted)',
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function InboxPage() {
  const router = useRouter();
  const { user } = useSession();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());
  const [ackPending, setAckPending] = useState<Set<string>>(new Set());

  const fetchInbox = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/vista/inbox`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setItems(data.items || []);
      } else {
        setError(data.error || 'Failed to load inbox');
      }
    } catch {
      setError('Cannot reach API server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  async function handleAcknowledge(id: string) {
    // Optimistically hide the item
    setAcknowledged((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`${API_BASE}/vista/inbox/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({ itemId: id }),
      });
      const data = await res.json();
      if (!data.ok && (data.integrationPending || data.pending)) {
        setAckPending((prev) => new Set(prev).add(id));
      }
    } catch {
      // API endpoint not yet available -- mark as integration-pending
      setAckPending((prev) => new Set(prev).add(id));
    }
  }

  function handleOpenChart(dfn: string) {
    router.push(`/cprs/chart/${dfn}/cover`);
  }

  const filteredItems = items.filter((item) => {
    if (filter !== 'all' && item.type !== filter) return false;
    return !acknowledged.has(item.id);
  });

  const pendingCount = items.filter((i) => !acknowledged.has(i.id)).length;

  return (
    <div className={styles.shell}>
      <CPRSMenuBar />

      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 18, margin: 0 }}>Inbox / Notifications</h1>
            <p style={{ fontSize: 12, color: 'var(--cprs-text-muted)', margin: '4px 0 0' }}>
              {user?.userName || 'Provider'} &bull; {pendingCount} pending item{pendingCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              className={styles.formSelect}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ width: 'auto', fontSize: 12 }}
            >
              <option value="all">All Types</option>
              <option value="unsigned_order">Unsigned Orders</option>
              <option value="abnormal_lab">Abnormal Labs</option>
              <option value="pending_consult">Pending Consults</option>
              <option value="flagged_result">Flagged Results</option>
              <option value="cosign_needed">Co-Sign Needed</option>
              <option value="notification">Notifications</option>
            </select>
            <button className={styles.btn} onClick={fetchInbox} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: '8px 12px', background: '#f8d7da', border: '1px solid #dc3545', borderRadius: 4, color: '#721c24', fontSize: 12, marginBottom: 12 }}>
            {error}
          </div>
        )}

        {ackPending.size > 0 && (
          <div style={{ padding: '8px 12px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 4, color: '#856404', fontSize: 12, marginBottom: 12 }}>
            <strong>Integration Pending:</strong> {ackPending.size} item{ackPending.size !== 1 ? 's' : ''} acknowledged locally only.
            VistA persistence requires ORWORB KILL EXPIR MSG RPC (not available in sandbox).
            Items will reappear on page refresh.
          </div>
        )}

        {!loading && filteredItems.length === 0 && !error && (
          <div style={{ padding: 32, textAlign: 'center', border: '1px dashed var(--cprs-border)', borderRadius: 6 }}>
            <p style={{ fontSize: 14, fontWeight: 600 }}>Inbox Empty</p>
            <p style={{ fontSize: 12, color: 'var(--cprs-text-muted)' }}>
              No pending items require your attention.
            </p>
            <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', marginTop: 8 }}>
              Contract: ORWORB FASTUSER, ORWORB UNSIG ORDERS
            </p>
          </div>
        )}

        {filteredItems.length > 0 && (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th style={{ width: 28 }}></th>
                <th>Type</th>
                <th>Patient</th>
                <th>Summary</th>
                <th>Priority</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: PRIORITY_COLORS[item.priority] || 'var(--cprs-text-muted)',
                    }} />
                  </td>
                  <td style={{ fontSize: 11, fontWeight: 600 }}>
                    {TYPE_LABELS[item.type] || item.type}
                  </td>
                  <td style={{ fontSize: 11 }}>
                    {item.patientName || '—'}
                  </td>
                  <td style={{ fontSize: 11 }}>{item.summary}</td>
                  <td style={{
                    fontSize: 10,
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    color: PRIORITY_COLORS[item.priority],
                  }}>
                    {item.priority}
                  </td>
                  <td style={{ fontSize: 10, color: 'var(--cprs-text-muted)' }}>
                    {new Date(item.dateTime).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {item.patientDfn && (
                        <button
                          className={styles.btn}
                          style={{ fontSize: 10, padding: '2px 6px' }}
                          onClick={() => handleOpenChart(item.patientDfn!)}
                        >
                          Open Chart
                        </button>
                      )}
                      <button
                        className={styles.btn}
                        style={{ fontSize: 10, padding: '2px 6px' }}
                        onClick={() => handleAcknowledge(item.id)}
                      >
                        Acknowledge
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ marginTop: 16, padding: 8, background: 'var(--cprs-bg)', borderRadius: 4, fontSize: 11, color: 'var(--cprs-text-muted)' }}>
          <strong>Architecture:</strong> Inbox aggregates data from ORWORB FASTUSER (notifications),
          ORWORB UNSIG ORDERS (unsigned orders), and cross-references lab/consult domains.
          In the Docker sandbox, notification counts depend on the test data state.
        </div>
      </div>
    </div>
  );
}
