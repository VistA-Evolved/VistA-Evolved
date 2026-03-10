'use client';

import { Fragment, useState, useEffect, useCallback } from 'react';
import { csrfHeaders } from '@/lib/csrf';
import styles from '../cprs.module.css';
import { API_BASE } from '@/lib/api-config';

/**
 * MessagingTasksPanel -- Phase 32 CPRS staff panel
 *
 * Displays:
 * 1. Unread patient portal messages (staff queue)
 * 2. Pending refill requests
 * 3. Active tasks across patients
 */

interface StaffMessage {
  id: string;
  patientDfn: string;
  senderName?: string;
  fromName?: string;
  subject: string;
  body: string;
  sentAt?: string;
  createdAt?: string;
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
type QueueErrorMap = Partial<Record<ActiveSubTab, string>>;

async function readQueueResponse<T>(
  response: Response,
  key: string
): Promise<{ items: T[]; error: string | null }> {
  const payload = await response
    .json()
    .catch(() => null as { ok?: boolean; error?: string; message?: string; [k: string]: unknown } | null);

  if (!response.ok || !payload?.ok) {
    return {
      items: [],
      error:
        payload?.message ||
        payload?.error ||
        `${key} request failed with HTTP ${response.status}`,
    };
  }

  const items = Array.isArray(payload[key]) ? (payload[key] as T[]) : [];
  return { items, error: null };
}

function formatQueueDate(primary?: string, fallback?: string): string {
  const raw = primary || fallback;
  if (!raw) return 'Unknown';
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleDateString();
}

export default function MessagingTasksPanel({ dfn }: { dfn: string }) {
  const [activeSubTab, setActiveSubTab] = useState<ActiveSubTab>('messages');
  const [messages, setMessages] = useState<StaffMessage[]>([]);
  const [refills, setRefills] = useState<RefillRequest[]>([]);
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queueErrors, setQueueErrors] = useState<QueueErrorMap>({});
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replySending, setReplySending] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setQueueErrors({});
    setMessages([]);
    setRefills([]);
    setTasks([]);

    try {
      const opts = { credentials: 'include' as RequestCredentials };
      const patientQuery = `patientDfn=${encodeURIComponent(dfn)}`;

      const [msgRes, refillRes, taskRes] = await Promise.allSettled([
        fetch(`${API_BASE}/portal/staff/messages?${patientQuery}`, opts),
        fetch(`${API_BASE}/portal/staff/refills?${patientQuery}`, opts),
        fetch(`${API_BASE}/portal/staff/tasks?${patientQuery}`, opts),
      ]);

      const nextErrors: QueueErrorMap = {};

      if (msgRes.status === 'fulfilled') {
        const parsed = await readQueueResponse<StaffMessage>(msgRes.value, 'messages');
        setMessages(parsed.items);
        if (parsed.error) nextErrors.messages = parsed.error;
      } else {
        nextErrors.messages = msgRes.reason instanceof Error ? msgRes.reason.message : 'Messages request failed';
      }

      if (refillRes.status === 'fulfilled') {
        const parsed = await readQueueResponse<RefillRequest>(refillRes.value, 'refills');
        setRefills(parsed.items);
        if (parsed.error) nextErrors.refills = parsed.error;
      } else {
        nextErrors.refills =
          refillRes.reason instanceof Error ? refillRes.reason.message : 'Refills request failed';
      }

      if (taskRes.status === 'fulfilled') {
        const parsed = await readQueueResponse<StaffTask>(taskRes.value, 'tasks');
        setTasks(parsed.items);
        if (parsed.error) nextErrors.tasks = parsed.error;
      } else {
        nextErrors.tasks = taskRes.reason instanceof Error ? taskRes.reason.message : 'Tasks request failed';
      }

      setQueueErrors(nextErrors);

      if (Object.keys(nextErrors).length > 0) {
        setError('One or more staff queues failed to load. See the active tab for details.');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [dfn]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const reviewRefill = async (refillId: string, action: 'approve' | 'deny') => {
    try {
      const res = await fetch(`${API_BASE}/portal/staff/refills/${refillId}/review`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({
          action,
          note: `${action === 'approve' ? 'Approved' : 'Denied'} via CPRS`,
        }),
      });
      if (res.ok) fetchData();
    } catch {
      /* swallow */
    }
  };

  const startReply = (msgId: string) => {
    setReplyingToId((current) => (current === msgId ? null : msgId));
    setReplyDraft('');
    setReplyError(null);
  };

  const cancelReply = () => {
    setReplyingToId(null);
    setReplyDraft('');
    setReplyError(null);
  };

  const replyToMessage = async (msgId: string) => {
    const body = replyDraft.trim();
    if (!body) {
      setReplyError('Reply text is required');
      return;
    }

    setReplySending(true);
    setReplyError(null);

    try {
      const response = await fetch(`${API_BASE}/portal/staff/messages/${msgId}/reply`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ body }),
      });

      const payload = await response
        .json()
        .catch(() => null as { ok?: boolean; error?: string; message?: string } | null);

      if (!response.ok || !payload?.ok) {
        setReplyError(payload?.error || payload?.message || 'Failed to send reply');
        return;
      }

      cancelReply();
      await fetchData();
    } catch {
      setReplyError('Network error -- unable to send reply');
    } finally {
      setReplySending(false);
    }
  };

  const subTabs: { key: ActiveSubTab; label: string; count: number }[] = [
    { key: 'messages', label: 'Staff Queue', count: messages.length },
    { key: 'refills', label: 'Refills', count: refills.length },
    { key: 'tasks', label: 'Tasks', count: tasks.length },
  ];

  const canSendReply = replyDraft.trim().length > 0;

  return (
    <div style={{ padding: 8 }}>
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 8,
          borderBottom: '1px solid var(--cprs-border, #ccc)',
          paddingBottom: 4,
        }}
      >
        {subTabs.map((st) => (
          <button
            key={st.key}
            onClick={() => setActiveSubTab(st.key)}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              border: 'none',
              borderBottom:
                activeSubTab === st.key
                  ? '2px solid var(--cprs-accent, #2563eb)'
                  : '2px solid transparent',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: activeSubTab === st.key ? 600 : 400,
              color: 'var(--cprs-text, #333)',
            }}
          >
            {st.label}{' '}
            {st.count > 0 && (
              <span
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: 8,
                  padding: '1px 5px',
                  fontSize: 10,
                  marginLeft: 4,
                }}
              >
                {st.count}
              </span>
            )}
          </button>
        ))}
        <button
          onClick={fetchData}
          style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 8px', cursor: 'pointer' }}
        >
          Refresh
        </button>
      </div>

      {loading && <p className={styles.emptyText}>Loading...</p>}
      {error && <p style={{ color: '#ef4444', fontSize: 12 }}>{error}</p>}

      {!loading && activeSubTab === 'messages' && (
        <div>
          <div
            style={{
              fontSize: 11,
              color: '#6b7280',
              marginBottom: 8,
              padding: '6px 8px',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
            }}
          >
            This view is the patient portal staff queue for the current patient, not the clinician VistA MailMan inbox.
            Use File &gt; Messages / MailMan for direct MailMan access.
          </div>
          {queueErrors.messages ? (
            <p style={{ color: '#ef4444', fontSize: 12 }}>{queueErrors.messages}</p>
          ) : messages.length === 0 ? (
            <p className={styles.emptyText}>No unread patient portal messages in the staff queue.</p>
          ) : (
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr
                  style={{ borderBottom: '1px solid var(--cprs-border, #ccc)', textAlign: 'left' }}
                >
                  <th style={{ padding: '4px 8px' }}>From</th>
                  <th style={{ padding: '4px 8px' }}>Subject</th>
                  <th style={{ padding: '4px 8px' }}>Sent</th>
                  <th style={{ padding: '4px 8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((m) => (
                  <Fragment key={m.id}>
                    <tr style={{ borderBottom: '1px solid var(--cprs-border, #eee)' }}>
                      <td style={{ padding: '4px 8px' }}>{m.senderName || m.fromName || 'Unknown'}</td>
                      <td style={{ padding: '4px 8px' }}>{m.subject}</td>
                      <td style={{ padding: '4px 8px' }}>{formatQueueDate(m.sentAt, m.createdAt)}</td>
                      <td style={{ padding: '4px 8px' }}>
                        <button
                          onClick={() => startReply(m.id)}
                          style={{ fontSize: 11, cursor: 'pointer' }}
                        >
                          {replyingToId === m.id ? 'Cancel Reply' : 'Reply'}
                        </button>
                      </td>
                    </tr>
                    {replyingToId === m.id && (
                      <tr>
                        <td
                          colSpan={4}
                          style={{
                            padding: '8px 12px 12px',
                            background: 'rgba(37, 99, 235, 0.04)',
                            borderBottom: '1px solid var(--cprs-border, #eee)',
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>
                            Replying to {m.subject}
                          </div>
                          {replyError && (
                            <div className={styles.errorText} style={{ marginBottom: 8 }}>
                              {replyError}
                            </div>
                          )}
                          <textarea
                            className={styles.formTextarea}
                            rows={4}
                            value={replyDraft}
                            onChange={(e) => {
                              setReplyDraft(e.target.value);
                              if (replyError) setReplyError(null);
                            }}
                            placeholder="Write a response to the patient..."
                          />
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            <span style={{ fontSize: 11, color: '#6b7280' }}>
                              Reply will be sent through the patient portal staff messaging workflow.
                            </span>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className={styles.btn} onClick={cancelReply} disabled={replySending} title={replySending ? 'Reply sending is in progress.' : undefined}>
                                Cancel
                              </button>
                              <button
                                className={`${styles.btn} ${styles.btnPrimary}`}
                                onClick={() => replyToMessage(m.id)}
                                disabled={replySending || !canSendReply}
                                style={{ cursor: replySending || !canSendReply ? 'not-allowed' : 'pointer' }}
                              >
                                {replySending ? 'Sending...' : 'Send Reply'}
                              </button>
                            </div>
                          </div>
                          {!replyError && !canSendReply && (
                            <div style={{ marginTop: 8, fontSize: 11, color: '#6b7280' }}>
                              Enter reply text to enable Send Reply.
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!loading && activeSubTab === 'refills' && (
        <div>
          {queueErrors.refills ? (
            <p style={{ color: '#ef4444', fontSize: 12 }}>{queueErrors.refills}</p>
          ) : refills.length === 0 ? (
            <p className={styles.emptyText}>No pending refill requests.</p>
          ) : (
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr
                  style={{ borderBottom: '1px solid var(--cprs-border, #ccc)', textAlign: 'left' }}
                >
                  <th style={{ padding: '4px 8px' }}>Patient</th>
                  <th style={{ padding: '4px 8px' }}>Medication</th>
                  <th style={{ padding: '4px 8px' }}>Status</th>
                  <th style={{ padding: '4px 8px' }}>VistA</th>
                  <th style={{ padding: '4px 8px' }}>Requested</th>
                  <th style={{ padding: '4px 8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {refills.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--cprs-border, #eee)' }}>
                    <td style={{ padding: '4px 8px' }}>{r.patientName}</td>
                    <td style={{ padding: '4px 8px' }}>{r.medicationName}</td>
                    <td style={{ padding: '4px 8px' }}>{r.status}</td>
                    <td style={{ padding: '4px 8px' }}>
                      <span
                        style={{
                          fontSize: 10,
                          color: r.vistaSync === 'filed' ? '#16a34a' : '#d97706',
                        }}
                      >
                        {r.vistaSync}
                      </span>
                    </td>
                    <td style={{ padding: '4px 8px' }}>
                      {new Date(r.requestedAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '4px 8px', display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => reviewRefill(r.id, 'approve')}
                        style={{ fontSize: 11, color: '#16a34a', cursor: 'pointer' }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => reviewRefill(r.id, 'deny')}
                        style={{ fontSize: 11, color: '#ef4444', cursor: 'pointer' }}
                      >
                        Deny
                      </button>
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
          {queueErrors.tasks ? (
            <p style={{ color: '#ef4444', fontSize: 12 }}>{queueErrors.tasks}</p>
          ) : tasks.length === 0 ? (
            <p className={styles.emptyText}>No active tasks.</p>
          ) : (
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr
                  style={{ borderBottom: '1px solid var(--cprs-border, #ccc)', textAlign: 'left' }}
                >
                  <th style={{ padding: '4px 8px' }}>Patient</th>
                  <th style={{ padding: '4px 8px' }}>Category</th>
                  <th style={{ padding: '4px 8px' }}>Priority</th>
                  <th style={{ padding: '4px 8px' }}>Title</th>
                  <th style={{ padding: '4px 8px' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--cprs-border, #eee)' }}>
                    <td style={{ padding: '4px 8px' }}>{t.patientName}</td>
                    <td style={{ padding: '4px 8px' }}>{t.category.replace(/_/g, ' ')}</td>
                    <td style={{ padding: '4px 8px' }}>
                      <span
                        style={{
                          color:
                            t.priority === 'urgent'
                              ? '#ef4444'
                              : t.priority === 'high'
                                ? '#d97706'
                                : '#6b7280',
                        }}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td style={{ padding: '4px 8px' }}>{t.title}</td>
                    <td style={{ padding: '4px 8px' }}>
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
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
