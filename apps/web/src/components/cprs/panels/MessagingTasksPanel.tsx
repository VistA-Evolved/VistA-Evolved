'use client';

import { useState, useEffect, useCallback } from 'react';
import { csrfHeaders } from '@/lib/csrf';
import styles from '../cprs.module.css';
import { API_BASE } from '@/lib/api-config';

/**
 * MessagingTasksPanel — Phase 32 CPRS staff panel
 *
 * Displays:
 * 1. Unread patient messages (staff queue)
 * 2. Pending refill requests
 * 3. Active tasks across patients
 */

interface StaffMessage {
  id: string;
  patientDfn: string;
  senderName: string;
  subject: string;
  body: string;
  sentAt: string;
  status: string;
}

interface RefillRequest {
  id: string;
  patientDfn: string;
  patientName: string;
  medicationName: string;
  status: string;
  statusNote: string;
  requestedAt: string;
  vistaSync: string;
}

interface StaffTask {
  id: string;
  patientDfn: string;
  patientName: string;
  category: string;
  priority: string;
  title: string;
  body: string;
  status: string;
  createdAt: string;
}

type ActiveSubTab = 'messages' | 'refills' | 'tasks';

export default function MessagingTasksPanel({ dfn }: { dfn: string }) {
  const [activeSubTab, setActiveSubTab] = useState<ActiveSubTab>('messages');
  const [messages, setMessages] = useState<StaffMessage[]>([]);
  const [refills, setRefills] = useState<RefillRequest[]>([]);
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const base = API_BASE;
      const opts = { credentials: 'include' as RequestCredentials };

      const [msgRes, refillRes, taskRes] = await Promise.allSettled([
        fetch(`${base}/portal/staff/messages`, opts),
        fetch(`${base}/portal/staff/refills`, opts),
        fetch(`${base}/portal/staff/tasks`, opts),
      ]);

      if (msgRes.status === 'fulfilled' && msgRes.value.ok) {
        const d = await msgRes.value.json();
        setMessages(d.messages || []);
      }
      if (refillRes.status === 'fulfilled' && refillRes.value.ok) {
        const d = await refillRes.value.json();
        setRefills(d.refills || []);
      }
      if (taskRes.status === 'fulfilled' && taskRes.value.ok) {
        const d = await taskRes.value.json();
        setTasks(d.tasks || []);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const reviewRefill = async (refillId: string, action: 'approve' | 'deny') => {
    try {
      const base = API_BASE;
      const res = await fetch(`${base}/portal/staff/refills/${refillId}/review`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ action, note: `${action === 'approve' ? 'Approved' : 'Denied'} via CPRS` }),
      });
      if (res.ok) fetchData();
    } catch { /* swallow */ }
  };

  const replyToMessage = async (msgId: string) => {
    const body = prompt('Reply text:');
    if (!body) return;
    try {
      const base = API_BASE;
      await fetch(`${base}/portal/staff/messages/${msgId}/reply`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ body }),
      });
      fetchData();
    } catch { /* swallow */ }
  };

  const subTabs: { key: ActiveSubTab; label: string; count: number }[] = [
    { key: 'messages', label: 'Messages', count: messages.length },
    { key: 'refills', label: 'Refills', count: refills.length },
    { key: 'tasks', label: 'Tasks', count: tasks.length },
  ];

  return (
    <div style={{ padding: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8, borderBottom: '1px solid var(--cprs-border, #ccc)', paddingBottom: 4 }}>
        {subTabs.map(st => (
          <button
            key={st.key}
            onClick={() => setActiveSubTab(st.key)}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              border: 'none',
              borderBottom: activeSubTab === st.key ? '2px solid var(--cprs-accent, #2563eb)' : '2px solid transparent',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: activeSubTab === st.key ? 600 : 400,
              color: 'var(--cprs-text, #333)',
            }}
          >
            {st.label} {st.count > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: 8, padding: '1px 5px', fontSize: 10, marginLeft: 4 }}>{st.count}</span>}
          </button>
        ))}
        <button onClick={fetchData} style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 8px', cursor: 'pointer' }}>Refresh</button>
      </div>

      {loading && <p className={styles.emptyText}>Loading...</p>}
      {error && <p style={{ color: '#ef4444', fontSize: 12 }}>{error}</p>}

      {!loading && activeSubTab === 'messages' && (
        <div>
          {messages.length === 0 ? (
            <p className={styles.emptyText}>No unread patient messages.</p>
          ) : (
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--cprs-border, #ccc)', textAlign: 'left' }}>
                  <th style={{ padding: '4px 8px' }}>From</th>
                  <th style={{ padding: '4px 8px' }}>Subject</th>
                  <th style={{ padding: '4px 8px' }}>Sent</th>
                  <th style={{ padding: '4px 8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {messages.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--cprs-border, #eee)' }}>
                    <td style={{ padding: '4px 8px' }}>{m.senderName}</td>
                    <td style={{ padding: '4px 8px' }}>{m.subject}</td>
                    <td style={{ padding: '4px 8px' }}>{new Date(m.sentAt).toLocaleDateString()}</td>
                    <td style={{ padding: '4px 8px' }}>
                      <button onClick={() => replyToMessage(m.id)} style={{ fontSize: 11, cursor: 'pointer' }}>Reply</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!loading && activeSubTab === 'refills' && (
        <div>
          {refills.length === 0 ? (
            <p className={styles.emptyText}>No pending refill requests.</p>
          ) : (
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--cprs-border, #ccc)', textAlign: 'left' }}>
                  <th style={{ padding: '4px 8px' }}>Patient</th>
                  <th style={{ padding: '4px 8px' }}>Medication</th>
                  <th style={{ padding: '4px 8px' }}>Status</th>
                  <th style={{ padding: '4px 8px' }}>VistA</th>
                  <th style={{ padding: '4px 8px' }}>Requested</th>
                  <th style={{ padding: '4px 8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {refills.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--cprs-border, #eee)' }}>
                    <td style={{ padding: '4px 8px' }}>{r.patientName}</td>
                    <td style={{ padding: '4px 8px' }}>{r.medicationName}</td>
                    <td style={{ padding: '4px 8px' }}>{r.status}</td>
                    <td style={{ padding: '4px 8px' }}>
                      <span style={{ fontSize: 10, color: r.vistaSync === 'filed' ? '#16a34a' : '#d97706' }}>
                        {r.vistaSync}
                      </span>
                    </td>
                    <td style={{ padding: '4px 8px' }}>{new Date(r.requestedAt).toLocaleDateString()}</td>
                    <td style={{ padding: '4px 8px', display: 'flex', gap: 4 }}>
                      <button onClick={() => reviewRefill(r.id, 'approve')} style={{ fontSize: 11, color: '#16a34a', cursor: 'pointer' }}>Approve</button>
                      <button onClick={() => reviewRefill(r.id, 'deny')} style={{ fontSize: 11, color: '#ef4444', cursor: 'pointer' }}>Deny</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!loading && activeSubTab === 'tasks' && (
        <div>
          {tasks.length === 0 ? (
            <p className={styles.emptyText}>No active tasks.</p>
          ) : (
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--cprs-border, #ccc)', textAlign: 'left' }}>
                  <th style={{ padding: '4px 8px' }}>Patient</th>
                  <th style={{ padding: '4px 8px' }}>Category</th>
                  <th style={{ padding: '4px 8px' }}>Priority</th>
                  <th style={{ padding: '4px 8px' }}>Title</th>
                  <th style={{ padding: '4px 8px' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--cprs-border, #eee)' }}>
                    <td style={{ padding: '4px 8px' }}>{t.patientName}</td>
                    <td style={{ padding: '4px 8px' }}>{t.category.replace(/_/g, ' ')}</td>
                    <td style={{ padding: '4px 8px' }}>
                      <span style={{ color: t.priority === 'urgent' ? '#ef4444' : t.priority === 'high' ? '#d97706' : '#6b7280' }}>
                        {t.priority}
                      </span>
                    </td>
                    <td style={{ padding: '4px 8px' }}>{t.title}</td>
                    <td style={{ padding: '4px 8px' }}>{new Date(t.createdAt).toLocaleDateString()}</td>
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
