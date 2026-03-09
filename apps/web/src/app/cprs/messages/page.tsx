'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import CPRSMenuBar from '@/components/cprs/CPRSMenuBar';
import styles from '@/components/cprs/cprs.module.css';
import { csrfHeaders } from '@/lib/csrf';
import { API_BASE } from '@/lib/api-config';
import { SESSION_EXPIRED_EVENT, useSession } from '@/stores/session-context';

interface MailRecipient {
  type: 'user' | 'mail-group';
  id: string;
  name: string;
}

interface MailGroup {
  name: string;
  ien: string;
}

interface MailFolder {
  id: string;
  name: string;
  totalMessages: number;
  newMessages: number;
}

interface MailMessageSummary {
  ien: string;
  subject: string;
  fromDuz: string;
  fromName: string;
  date: string;
  direction: 'outbound' | 'inbound';
  isNew: boolean;
}

interface MailMessageDetail {
  ien: string;
  subject: string;
  fromDuz: string;
  fromName: string;
  date: string;
  direction: 'outbound' | 'inbound';
  bodyLines: string[];
  recipients: Array<{ duz: string; name: string; readDate: string }>;
}

async function parseProtectedJson(res: Response) {
  if (res.status === 401) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    throw new Error('Authentication required');
  }
  return res.json();
}

export default function MessagesPage() {
  const router = useRouter();
  const { ready: sessionReady, authenticated } = useSession();
  const [tab, setTab] = useState<'inbox' | 'compose'>('inbox');

  const [folders, setFolders] = useState<MailFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState('1');
  const [vistaMessages, setVistaMessages] = useState<MailMessageSummary[]>([]);
  const [vistaDetail, setVistaDetail] = useState<MailMessageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composePriority, setComposePriority] = useState<'routine' | 'priority' | 'urgent'>(
    'routine'
  );
  const [composeRecipientType, setComposeRecipientType] = useState<'user' | 'mail-group'>(
    'mail-group'
  );
  const [composeRecipientId, setComposeRecipientId] = useState('');
  const [composeRecipientName, setComposeRecipientName] = useState('');
  const [mailGroups, setMailGroups] = useState<MailGroup[]>([]);
  const [sending, setSending] = useState(false);
  const [composeError, setComposeError] = useState('');
  const [composeSuccess, setComposeSuccess] = useState('');

  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/vista/mailman/folders`, { credentials: 'include' });
      const data = await parseProtectedJson(res);
      if (!res.ok || !data.ok || !Array.isArray(data.folders)) {
        throw new Error(data.error || 'Unable to load VistA MailMan folders');
      }

      const nextFolders = data.folders as MailFolder[];
      setFolders(nextFolders);

      if (!nextFolders.some((folder) => folder.id === selectedFolderId)) {
        setSelectedFolderId(nextFolders[0]?.id || '1');
      }
    } catch (err) {
      setFolders([]);
      setError(
        err instanceof Error
          ? err.message
          : 'VistA MailMan folders are unavailable. This screen does not use local fallback.'
      );
    }
  }, [selectedFolderId]);

  const fetchVistaMessages = useCallback(async (folderId: string) => {
    setLoading(true);
    setError('');
    setVistaDetail(null);

    try {
      const endpoint =
        folderId === '1'
          ? `${API_BASE}/vista/mailman/inbox?limit=100`
          : `${API_BASE}/messaging/mail-list?folderId=${encodeURIComponent(folderId)}&limit=100`;
      const res = await fetch(endpoint, { credentials: 'include' });
      const data = await parseProtectedJson(res);

      if (!res.ok || !data.ok || data.source !== 'vista') {
        throw new Error(data.error || 'Unable to load VistA MailMan messages');
      }

      setVistaMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (err) {
      setVistaMessages([]);
      setError(err instanceof Error ? err.message : 'Cannot reach VistA MailMan');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVistaDetail = useCallback(async (ien: string) => {
    try {
      const res = await fetch(`${API_BASE}/vista/mailman/message/${ien}`, {
        credentials: 'include',
      });
      const data = await parseProtectedJson(res);

      if (!res.ok || !data.ok || !data.message) {
        throw new Error(data.error || 'Unable to open VistA MailMan message');
      }

      setVistaDetail(data.message);
    } catch (err) {
      setVistaDetail(null);
      setError(err instanceof Error ? err.message : 'Unable to open VistA MailMan message');
    }
  }, []);

  const fetchMailGroups = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/messaging/mail-groups`, { credentials: 'include' });
      const data = await parseProtectedJson(res);
      if (data.ok && data.groups) {
        setMailGroups(data.groups);
        if (!composeRecipientId && data.groups.length > 0) {
          setComposeRecipientId(data.groups[0].name);
          setComposeRecipientName(data.groups[0].name);
        }
      }
    } catch {
      /* silent */
    }
  }, [composeRecipientId]);

  useEffect(() => {
    if (sessionReady && !authenticated) {
      router.replace('/cprs/login?redirect=%2Fcprs%2Fmessages');
    }
  }, [authenticated, router, sessionReady]);

  useEffect(() => {
    if (!sessionReady || !authenticated) return;
    fetchFolders();
    fetchMailGroups();
  }, [authenticated, fetchFolders, fetchMailGroups, sessionReady]);

  useEffect(() => {
    if (!sessionReady || !authenticated) return;
    fetchVistaMessages(selectedFolderId);
  }, [authenticated, fetchVistaMessages, selectedFolderId, sessionReady]);

  const openVistaMessage = useCallback(
    async (msg: MailMessageSummary) => {
      setVistaDetail(null);
      await fetchVistaDetail(msg.ien);

      if (msg.isNew) {
        try {
          await fetch(`${API_BASE}/vista/mailman/manage`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
            body: JSON.stringify({ action: 'markread', ien: msg.ien, basket: selectedFolderId }),
          });
          fetchFolders();
          fetchVistaMessages(selectedFolderId);
        } catch {
          /* silent */
        }
      }
    },
    [fetchFolders, fetchVistaDetail, fetchVistaMessages, selectedFolderId]
  );

  const handleSend = useCallback(async () => {
    setComposeError('');
    setComposeSuccess('');

    if (!composeSubject || composeSubject.length < 3 || composeSubject.length > 65) {
      setComposeError('Subject must be 3-65 characters');
      return;
    }
    if (!composeBody.trim()) {
      setComposeError('Message body is required');
      return;
    }
    if (!composeRecipientId) {
      setComposeError('Please select a recipient');
      return;
    }

    setSending(true);
    try {
      const recipients: MailRecipient[] = [
        {
          type: composeRecipientType,
          id: composeRecipientId,
          name: composeRecipientName,
        },
      ];

      const res = await fetch(`${API_BASE}/vista/mailman/send`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({
          subject: composeSubject,
          body: composeBody,
          priority: composePriority,
          to: recipients,
        }),
      });

      const data = await parseProtectedJson(res);
      if (!res.ok || !data.ok) {
        setComposeError(data.error || 'VistA MailMan send failed');
        return;
      }

      setComposeSuccess(
        data.vistaRef
          ? `Message sent to VistA MailMan (${data.vistaRef})`
          : 'Message sent to VistA MailMan'
      );
      setComposeSubject('');
      setComposeBody('');
      setComposePriority('routine');
      fetchFolders();
      fetchVistaMessages(selectedFolderId);
    } catch {
      setComposeError('Cannot reach VistA MailMan');
    } finally {
      setSending(false);
    }
  }, [
    composeBody,
    composePriority,
    composeRecipientId,
    composeRecipientName,
    composeRecipientType,
    composeSubject,
    fetchFolders,
    fetchVistaMessages,
    selectedFolderId,
  ]);

  if (!sessionReady || !authenticated) {
    return (
      <div className={styles.container}>
        <CPRSMenuBar />
        <p style={{ padding: '16px' }}>Checking session...</p>
      </div>
    );
  }

  const formatDate = (d: string | null) => {
    if (!d) return '';
    try {
      return new Date(d).toLocaleString();
    } catch {
      return d;
    }
  };

  return (
    <div className={styles.container}>
      <CPRSMenuBar />

      <div style={{ padding: '8px 16px' }}>
        <h2 style={{ margin: '0 0 8px' }}>
          Secure Messages
          <span style={{ fontSize: '0.6em', color: '#28a745', marginLeft: '8px' }}>
            VistA MailMan
          </span>
        </h2>

        <div style={{ fontSize: '0.85em', color: 'var(--cprs-text-muted)', marginBottom: '8px' }}>
          This clinician screen reads and sends directly through VistA MailMan. No local fallback is used here.
        </div>

        {folders.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', marginBottom: '6px', flexWrap: 'wrap' }}>
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setSelectedFolderId(f.id);
                  setVistaDetail(null);
                }}
                style={{
                  padding: '3px 10px',
                  fontSize: '0.8em',
                  background:
                    selectedFolderId === f.id
                      ? 'var(--cprs-accent, #0078d4)'
                      : 'var(--cprs-bg-secondary, #f0f0f0)',
                  color: selectedFolderId === f.id ? 'white' : 'inherit',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                }}
              >
                {f.name} ({f.totalMessages}
                {f.newMessages > 0 ? `, ${f.newMessages} new` : ''})
              </button>
            ))}
          </div>
        )}

        {folders.length > 0 && (
          <div style={{ fontSize: '0.8em', color: 'var(--cprs-text-muted)', marginBottom: '8px' }}>
            Use the MailMan baskets above to review inbox, sent, and other routed messages.
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: '4px',
            marginBottom: '8px',
            borderBottom: '1px solid var(--cprs-border)',
          }}
        >
          {(['inbox', 'compose'] as const).map((nextTab) => (
            <button
              key={nextTab}
              onClick={() => setTab(nextTab)}
              style={{
                padding: '6px 16px',
                background: tab === nextTab ? 'var(--cprs-bg-active, #e8e8e8)' : 'transparent',
                border: 'none',
                borderBottom:
                  tab === nextTab
                    ? '2px solid var(--cprs-accent, #0078d4)'
                    : '2px solid transparent',
                cursor: 'pointer',
                fontWeight: tab === nextTab ? 600 : 400,
                textTransform: 'capitalize',
              }}
            >
              {nextTab} {nextTab === 'inbox' ? `(${vistaMessages.length})` : ''}
            </button>
          ))}
        </div>

        {error && <div style={{ color: '#dc3545', marginBottom: '8px' }}>{error}</div>}

        {tab === 'inbox' && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <div
              style={{
                flex: '0 0 45%',
                maxHeight: '60vh',
                overflowY: 'auto',
                borderRight: '1px solid var(--cprs-border)',
              }}
            >
              {loading ? (
                <div style={{ padding: '16px', color: 'var(--cprs-text-muted)' }}>Loading...</div>
              ) : vistaMessages.length > 0 ? (
                vistaMessages.map((msg) => (
                  <div
                    key={msg.ien}
                    onClick={() => openVistaMessage(msg)}
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--cprs-border)',
                      cursor: 'pointer',
                      background:
                        vistaDetail?.ien === msg.ien
                          ? 'var(--cprs-bg-active, #e8e8e8)'
                          : 'transparent',
                      fontWeight: msg.isNew ? 700 : 400,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.85em' }}>
                        {msg.fromName || `DUZ ${msg.fromDuz}`}
                      </span>
                      <span style={{ fontSize: '0.75em', color: 'var(--cprs-text-muted)' }}>
                        {formatDate(msg.date)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.9em', marginTop: '2px' }}>
                      {msg.isNew && (
                        <span style={{ color: '#0078d4', marginRight: '4px' }}>[NEW]</span>
                      )}
                      {msg.subject}
                    </div>
                    <div style={{ fontSize: '0.75em', color: '#28a745', marginTop: '2px' }}>
                      VistA IEN: {msg.ien}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '16px', color: 'var(--cprs-text-muted)' }}>
                  No messages in this basket.
                </div>
              )}
            </div>

            <div style={{ flex: 1, padding: '0 12px' }}>
              {vistaDetail ? (
                <div>
                  <h3 style={{ margin: '0 0 4px' }}>{vistaDetail.subject}</h3>
                  <div
                    style={{
                      fontSize: '0.85em',
                      color: 'var(--cprs-text-muted)',
                      marginBottom: '8px',
                    }}
                  >
                    From: {vistaDetail.fromName || `DUZ ${vistaDetail.fromDuz}`} |{' '}
                    {formatDate(vistaDetail.date)}
                  </div>
                  {vistaDetail.recipients.length > 0 && (
                    <div
                      style={{
                        fontSize: '0.85em',
                        color: 'var(--cprs-text-muted)',
                        marginBottom: '12px',
                      }}
                    >
                      To: {vistaDetail.recipients.map((r) => r.name || `DUZ ${r.duz}`).join(', ')}
                    </div>
                  )}
                  <div
                    style={{
                      whiteSpace: 'pre-wrap',
                      background: 'var(--cprs-bg-secondary, #f5f5f5)',
                      padding: '12px',
                      borderRadius: '4px',
                      fontSize: '0.9em',
                      minHeight: '120px',
                      marginBottom: '12px',
                    }}
                  >
                    {vistaDetail.bodyLines.join('\n')}
                  </div>
                  <div style={{ fontSize: '0.7em', color: '#28a745', marginBottom: '6px' }}>
                    Source: VistA MailMan (IEN {vistaDetail.ien})
                  </div>
                  <button
                    onClick={() => {
                      setTab('compose');
                      setComposeSubject(`RE: ${vistaDetail.subject}`);
                      setComposeBody('');
                      if (vistaDetail.fromDuz) {
                        setComposeRecipientType('user');
                        setComposeRecipientId(vistaDetail.fromDuz);
                        setComposeRecipientName(
                          vistaDetail.fromName || `User ${vistaDetail.fromDuz}`
                        );
                      }
                    }}
                    style={{
                      padding: '6px 16px',
                      background: 'var(--cprs-accent, #0078d4)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                    }}
                  >
                    Reply
                  </button>
                </div>
              ) : (
                <div style={{ padding: '16px', color: 'var(--cprs-text-muted)' }}>
                  Select a VistA MailMan message to read.
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'compose' && (
          <div style={{ maxWidth: '600px' }}>
            {composeError && (
              <div style={{ color: '#dc3545', marginBottom: '8px' }}>{composeError}</div>
            )}
            {composeSuccess && (
              <div style={{ color: '#28a745', marginBottom: '8px' }}>{composeSuccess}</div>
            )}

            <div style={{ fontSize: '0.8em', color: 'var(--cprs-text-muted)', marginBottom: '10px' }}>
              Sends from this screen go directly to VistA MailMan. If VistA rejects the message, it is not stored locally here.
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '0.85em', marginBottom: '2px' }}>
                Recipient Type
              </label>
              <select
                value={composeRecipientType}
                onChange={(e) => setComposeRecipientType(e.target.value as 'user' | 'mail-group')}
                style={{ padding: '4px 8px', width: '100%' }}
              >
                <option value="mail-group">Mail Group</option>
                <option value="user">User (DUZ)</option>
              </select>
            </div>

            {composeRecipientType === 'mail-group' ? (
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '0.85em', marginBottom: '2px' }}>
                  Mail Group
                </label>
                {mailGroups.length > 0 ? (
                  <select
                    value={composeRecipientId}
                    onChange={(e) => {
                      setComposeRecipientId(e.target.value);
                      setComposeRecipientName(e.target.value);
                    }}
                    style={{ padding: '4px 8px', width: '100%' }}
                  >
                    {mailGroups.map((g) => (
                      <option key={g.ien} value={g.name}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    placeholder="Enter mail group name"
                    value={composeRecipientId}
                    onChange={(e) => {
                      setComposeRecipientId(e.target.value);
                      setComposeRecipientName(e.target.value);
                    }}
                    style={{ padding: '4px 8px', width: '100%' }}
                  />
                )}
              </div>
            ) : (
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '0.85em', marginBottom: '2px' }}>
                  Recipient DUZ
                </label>
                <input
                  placeholder="Enter user DUZ"
                  value={composeRecipientId}
                  onChange={(e) => {
                    setComposeRecipientId(e.target.value);
                    setComposeRecipientName(`User ${e.target.value}`);
                  }}
                  style={{ padding: '4px 8px', width: '100%' }}
                />
              </div>
            )}

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '0.85em', marginBottom: '2px' }}>
                Subject (3-65 chars)
              </label>
              <input
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                maxLength={65}
                style={{ padding: '4px 8px', width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '0.85em', marginBottom: '2px' }}>
                Priority
              </label>
              <select
                value={composePriority}
                onChange={(e) =>
                  setComposePriority(e.target.value as 'routine' | 'priority' | 'urgent')
                }
                style={{ padding: '4px 8px', width: '100%' }}
              >
                <option value="routine">Routine</option>
                <option value="priority">Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.85em', marginBottom: '2px' }}>
                Message Body
              </label>
              <textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                rows={8}
                style={{ padding: '8px', width: '100%', resize: 'vertical' }}
              />
            </div>

            <button
              onClick={handleSend}
              disabled={sending}
              style={{
                padding: '8px 24px',
                background: sending ? '#999' : 'var(--cprs-accent, #0078d4)',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: sending ? 'not-allowed' : 'pointer',
              }}
            >
              {sending ? 'Sending...' : 'Send to VistA MailMan'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
