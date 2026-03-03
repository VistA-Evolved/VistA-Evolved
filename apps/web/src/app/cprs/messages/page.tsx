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

interface SecureMessageRecipient {
  type: 'user' | 'mail-group';
  id: string;
  name: string;
  cc?: boolean;
  informational?: boolean;
}

interface SecureMessage {
  id: string;
  threadId: string;
  direction: 'outbound' | 'inbound';
  fromDuz: string;
  fromName: string;
  recipients: SecureMessageRecipient[];
  subject: string;
  body: string;
  priority: 'routine' | 'priority' | 'urgent';
  status: string;
  category: string;
  replyToId: string | null;
  createdAt: string;
  sentAt: string | null;
  readAt: string | null;
  vistaSync: string;
}

interface MailGroup {
  name: string;
  ien: string;
}

/** VistA MailMan folder from ZVE MAIL FOLDERS */
interface MailFolder {
  id: string;
  name: string;
  totalMessages: number;
  newMessages: number;
}

/** VistA MailMan message summary from ZVE MAIL LIST */
interface MailMessageSummary {
  ien: string;
  subject: string;
  fromDuz: string;
  fromName: string;
  date: string;
  direction: 'outbound' | 'inbound';
  isNew: boolean;
}

/** VistA MailMan message detail from ZVE MAIL GET */
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

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function MessagesPage() {
  const router = useRouter();
  const { user } = useSession();

  // Tab state
  const [tab, setTab] = useState<'inbox' | 'sent' | 'compose'>('inbox');

  // VistA MailMan state (primary)
  const [folders, setFolders] = useState<MailFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState('1'); // 1=IN basket
  const [vistaMessages, setVistaMessages] = useState<MailMessageSummary[]>([]);
  const [vistaDetail, setVistaDetail] = useState<MailMessageDetail | null>(null);
  const [vistaSource, setVistaSource] = useState<'vista' | 'local' | 'loading'>('loading');

  // Fallback legacy state
  const [inboxMessages, setInboxMessages] = useState<SecureMessage[]>([]);
  const [sentMessages, setSentMessages] = useState<SecureMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected message (legacy)
  const [selectedMsg, setSelectedMsg] = useState<SecureMessage | null>(null);

  // Compose state
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composePriority, setComposePriority] = useState<'routine' | 'priority' | 'urgent'>('routine');
  const [composeRecipientType, setComposeRecipientType] = useState<'user' | 'mail-group'>('mail-group');
  const [composeRecipientId, setComposeRecipientId] = useState('');
  const [composeRecipientName, setComposeRecipientName] = useState('');
  const [mailGroups, setMailGroups] = useState<MailGroup[]>([]);
  const [sending, setSending] = useState(false);
  const [composeError, setComposeError] = useState('');
  const [composeSuccess, setComposeSuccess] = useState('');

  /* ---- VistA Data Loading (Primary) ---- */

  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/messaging/folders`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok && data.folders) {
        setFolders(data.folders);
        setVistaSource(data.source || 'vista');
      }
    } catch { /* silent */ }
  }, []);

  const fetchVistaMessages = useCallback(async (folderId: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/messaging/mail-list?folderId=${folderId}&limit=100`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok && data.source === 'vista') {
        setVistaMessages(data.messages || []);
        setVistaSource('vista');
      } else {
        setVistaSource('local');
        // Fall back to legacy inbox
        const fallbackRes = await fetch(`${API_BASE}/messaging/inbox`, { credentials: 'include' });
        const fbData = await fallbackRes.json();
        if (fbData.ok) setInboxMessages(fbData.messages || []);
      }
    } catch {
      setVistaSource('local');
      setError('Cannot reach API server');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVistaDetail = useCallback(async (ien: string) => {
    try {
      const res = await fetch(`${API_BASE}/messaging/mail-get?ien=${ien}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok && data.message) {
        setVistaDetail(data.message);
      }
    } catch { /* silent */ }
  }, []);

  /* ---- Legacy Data Loading (Fallback) ---- */

  const fetchInbox = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/messaging/inbox`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setInboxMessages(data.messages || []);
      else setError(data.error || 'Failed to load inbox');
    } catch {
      setError('Cannot reach API server');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSent = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/messaging/sent`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setSentMessages(data.messages || []);
    } catch { /* silent */ }
  }, []);

  const fetchMailGroups = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/messaging/mail-groups`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok && data.groups) {
        setMailGroups(data.groups);
        if (data.groups.length > 0) {
          setComposeRecipientId(data.groups[0].name);
          setComposeRecipientName(data.groups[0].name);
        }
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchFolders();
    fetchVistaMessages(selectedFolderId);
    fetchSent();
    fetchMailGroups();
  }, [fetchFolders, fetchVistaMessages, selectedFolderId, fetchSent, fetchMailGroups]);

  /* ---- Message Detail ---- */

  const openMessage = useCallback(async (msg: SecureMessage) => {
    setSelectedMsg(msg);
    setVistaDetail(null);
    // Mark as read on the server
    if (!msg.readAt) {
      try {
        await fetch(`${API_BASE}/messaging/message/${msg.id}/read`, {
          method: 'POST',
          credentials: 'include',
          headers: { ...csrfHeaders() },
        });
      } catch { /* silent */ }
    }
  }, []);

  const openVistaMessage = useCallback(async (msg: MailMessageSummary) => {
    setSelectedMsg(null);
    setVistaDetail(null);
    await fetchVistaDetail(msg.ien);
    // Mark as read via VistA
    if (msg.isNew) {
      try {
        await fetch(`${API_BASE}/messaging/mail-manage`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
          body: JSON.stringify({ action: 'markread', ien: msg.ien, basket: selectedFolderId }),
        });
        // Refresh folder counts
        fetchFolders();
        fetchVistaMessages(selectedFolderId);
      } catch { /* silent */ }
    }
  }, [fetchVistaDetail, selectedFolderId, fetchFolders, fetchVistaMessages]);

  /* ---- Compose + Send ---- */

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
      const res = await fetch(`${API_BASE}/messaging/compose`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({
          subject: composeSubject,
          body: composeBody,
          priority: composePriority,
          recipients: [{
            type: composeRecipientType,
            id: composeRecipientId,
            name: composeRecipientName,
          }],
        }),
      });
      const data = await res.json();
      if (data.ok) {
        const syncNote = data.vistaSync === 'synced'
          ? ' (synced to VistA MailMan)'
          : data.vistaSync === 'failed'
            ? ' (VistA sync failed -- stored locally)'
            : '';
        setComposeSuccess(`Message sent${syncNote}`);
        setComposeSubject('');
        setComposeBody('');
        setComposePriority('routine');
        fetchFolders();
        fetchVistaMessages(selectedFolderId);
        fetchSent();
      } else {
        setComposeError(data.error || 'Failed to send');
      }
    } catch {
      setComposeError('Cannot reach API server');
    } finally {
      setSending(false);
    }
  }, [composeSubject, composeBody, composePriority, composeRecipientType, composeRecipientId, composeRecipientName, fetchFolders, fetchVistaMessages, selectedFolderId, fetchSent]);

  /* ---- Reply ---- */

  const handleReply = useCallback((msg: SecureMessage) => {
    setTab('compose');
    setComposeSubject(`RE: ${msg.subject}`);
    setComposeBody('');
    if (msg.fromDuz && !msg.fromDuz.startsWith('patient-')) {
      setComposeRecipientType('user');
      setComposeRecipientId(msg.fromDuz);
      setComposeRecipientName(msg.fromName);
    }
  }, []);

  /* ---- Render Helpers ---- */

  const priorityColor = (p: string) => {
    if (p === 'urgent') return '#dc3545';
    if (p === 'priority') return '#fd7e14';
    return 'var(--cprs-text-muted)';
  };

  const formatDate = (d: string | null) => {
    if (!d) return '';
    try { return new Date(d).toLocaleString(); } catch { return d; }
  };

  /* ================================================================ */
  /* RENDER                                                           */
  /* ================================================================ */

  return (
    <div className={styles.container}>
      <CPRSMenuBar />

      <div style={{ padding: '8px 16px' }}>
        <h2 style={{ margin: '0 0 8px' }}>
          Secure Messages
          {vistaSource === 'vista' && <span style={{ fontSize: '0.6em', color: '#28a745', marginLeft: '8px' }}>VistA MailMan</span>}
          {vistaSource === 'local' && <span style={{ fontSize: '0.6em', color: '#fd7e14', marginLeft: '8px' }}>Local fallback</span>}
        </h2>

        {/* Folder selector (VistA baskets) */}
        {vistaSource === 'vista' && folders.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
            {folders.map(f => (
              <button
                key={f.id}
                onClick={() => { setSelectedFolderId(f.id); setVistaDetail(null); }}
                style={{
                  padding: '3px 10px',
                  fontSize: '0.8em',
                  background: selectedFolderId === f.id ? 'var(--cprs-accent, #0078d4)' : 'var(--cprs-bg-secondary, #f0f0f0)',
                  color: selectedFolderId === f.id ? 'white' : 'inherit',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                }}
              >
                {f.name} ({f.totalMessages}{f.newMessages > 0 ? `, ${f.newMessages} new` : ''})
              </button>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', borderBottom: '1px solid var(--cprs-border)' }}>
          {(['inbox', 'sent', 'compose'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setSelectedMsg(null); }}
              style={{
                padding: '6px 16px',
                background: tab === t ? 'var(--cprs-bg-active, #e8e8e8)' : 'transparent',
                border: 'none',
                borderBottom: tab === t ? '2px solid var(--cprs-accent, #0078d4)' : '2px solid transparent',
                cursor: 'pointer',
                fontWeight: tab === t ? 600 : 400,
                textTransform: 'capitalize',
              }}
            >
              {t} {t === 'inbox' ? `(${inboxMessages.length})` : t === 'sent' ? `(${sentMessages.length})` : ''}
            </button>
          ))}
        </div>

        {error && <div style={{ color: '#dc3545', marginBottom: '8px' }}>{error}</div>}

        {/* ---- INBOX TAB ---- */}
        {tab === 'inbox' && (
          <div style={{ display: 'flex', gap: '12px' }}>
            {/* Message List */}
            <div style={{ flex: '0 0 45%', maxHeight: '60vh', overflowY: 'auto', borderRight: '1px solid var(--cprs-border)' }}>
              {loading ? (
                <div style={{ padding: '16px', color: 'var(--cprs-text-muted)' }}>Loading...</div>
              ) : vistaSource === 'vista' && vistaMessages.length > 0 ? (
                /* VistA MailMan messages (primary) */
                vistaMessages.map(msg => (
                  <div
                    key={msg.ien}
                    onClick={() => openVistaMessage(msg)}
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--cprs-border)',
                      cursor: 'pointer',
                      background: vistaDetail?.ien === msg.ien ? 'var(--cprs-bg-active, #e8e8e8)' : 'transparent',
                      fontWeight: msg.isNew ? 700 : 400,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.85em' }}>{msg.fromName || `DUZ ${msg.fromDuz}`}</span>
                      <span style={{ fontSize: '0.75em', color: 'var(--cprs-text-muted)' }}>{formatDate(msg.date)}</span>
                    </div>
                    <div style={{ fontSize: '0.9em', marginTop: '2px' }}>
                      {msg.isNew && <span style={{ color: '#0078d4', marginRight: '4px' }}>[NEW]</span>}
                      {msg.subject}
                    </div>
                    <div style={{ fontSize: '0.75em', color: '#28a745', marginTop: '2px' }}>
                      VistA IEN: {msg.ien}
                    </div>
                  </div>
                ))
              ) : vistaSource === 'vista' && vistaMessages.length === 0 ? (
                <div style={{ padding: '16px', color: 'var(--cprs-text-muted)' }}>No messages in this basket</div>
              ) : inboxMessages.length === 0 ? (
                <div style={{ padding: '16px', color: 'var(--cprs-text-muted)' }}>No messages in local cache.</div>
              ) : (
                /* Fallback: local cache messages */
                inboxMessages.map(msg => (
                  <div
                    key={msg.id}
                    onClick={() => openMessage(msg)}
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--cprs-border)',
                      cursor: 'pointer',
                      background: selectedMsg?.id === msg.id ? 'var(--cprs-bg-active, #e8e8e8)' : 'transparent',
                      fontWeight: !msg.readAt && msg.direction === 'inbound' ? 700 : 400,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.85em' }}>{msg.fromName}</span>
                      <span style={{ fontSize: '0.75em', color: 'var(--cprs-text-muted)' }}>{formatDate(msg.createdAt)}</span>
                    </div>
                    <div style={{ fontSize: '0.9em', marginTop: '2px' }}>
                      <span style={{ color: priorityColor(msg.priority), marginRight: '4px' }}>
                        {msg.priority !== 'routine' ? `[${msg.priority.toUpperCase()}] ` : ''}
                      </span>
                      {msg.subject}
                    </div>
                    <div style={{ fontSize: '0.75em', color: 'var(--cprs-text-muted)', marginTop: '2px' }}>
                      {msg.vistaSync === 'synced' ? 'VistA synced' : msg.vistaSync === 'failed' ? 'VistA sync failed' : 'Local only'}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Detail */}
            <div style={{ flex: 1, padding: '0 12px' }}>
              {vistaDetail ? (
                /* VistA message detail */
                <div>
                  <h3 style={{ margin: '0 0 4px' }}>{vistaDetail.subject}</h3>
                  <div style={{ fontSize: '0.85em', color: 'var(--cprs-text-muted)', marginBottom: '8px' }}>
                    From: {vistaDetail.fromName || `DUZ ${vistaDetail.fromDuz}`} | {formatDate(vistaDetail.date)}
                  </div>
                  {vistaDetail.recipients.length > 0 && (
                    <div style={{ fontSize: '0.85em', color: 'var(--cprs-text-muted)', marginBottom: '12px' }}>
                      To: {vistaDetail.recipients.map(r => r.name || `DUZ ${r.duz}`).join(', ')}
                    </div>
                  )}
                  <div style={{
                    whiteSpace: 'pre-wrap',
                    background: 'var(--cprs-bg-secondary, #f5f5f5)',
                    padding: '12px',
                    borderRadius: '4px',
                    fontSize: '0.9em',
                    minHeight: '120px',
                    marginBottom: '12px',
                  }}>
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
                        setComposeRecipientName(vistaDetail.fromName || `User ${vistaDetail.fromDuz}`);
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
              ) : selectedMsg ? (
                <div>
                  <h3 style={{ margin: '0 0 4px' }}>{selectedMsg.subject}</h3>
                  <div style={{ fontSize: '0.85em', color: 'var(--cprs-text-muted)', marginBottom: '8px' }}>
                    From: {selectedMsg.fromName} | {formatDate(selectedMsg.createdAt)}
                    {selectedMsg.priority !== 'routine' && (
                      <span style={{ color: priorityColor(selectedMsg.priority), marginLeft: '8px' }}>
                        [{selectedMsg.priority.toUpperCase()}]
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.85em', color: 'var(--cprs-text-muted)', marginBottom: '12px' }}>
                    To: {selectedMsg.recipients.map(r => r.name).join(', ')}
                  </div>
                  <div style={{
                    whiteSpace: 'pre-wrap',
                    background: 'var(--cprs-bg-secondary, #f5f5f5)',
                    padding: '12px',
                    borderRadius: '4px',
                    fontSize: '0.9em',
                    minHeight: '120px',
                    marginBottom: '12px',
                  }}>
                    {selectedMsg.body}
                  </div>
                  <button
                    onClick={() => handleReply(selectedMsg)}
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
                <div style={{ padding: '16px', color: 'var(--cprs-text-muted)' }}>Select a message to read</div>
              )}
            </div>
          </div>
        )}

        {/* ---- SENT TAB ---- */}
        {tab === 'sent' && (
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {sentMessages.length === 0 ? (
              <div style={{ padding: '16px', color: 'var(--cprs-text-muted)' }}>No sent messages</div>
            ) : (
              sentMessages.map(msg => (
                <div
                  key={msg.id}
                  onClick={() => { setSelectedMsg(msg); setTab('inbox'); }}
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--cprs-border)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85em' }}>To: {msg.recipients.map(r => r.name).join(', ')}</span>
                    <span style={{ fontSize: '0.75em', color: 'var(--cprs-text-muted)' }}>{formatDate(msg.sentAt)}</span>
                  </div>
                  <div style={{ fontSize: '0.9em', marginTop: '2px' }}>{msg.subject}</div>
                  <div style={{ fontSize: '0.75em', color: 'var(--cprs-text-muted)', marginTop: '2px' }}>
                    {msg.vistaSync === 'synced' ? 'VistA synced' : msg.vistaSync === 'failed' ? 'VistA sync failed' : 'Local only'}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ---- COMPOSE TAB ---- */}
        {tab === 'compose' && (
          <div style={{ maxWidth: '600px' }}>
            {composeError && <div style={{ color: '#dc3545', marginBottom: '8px' }}>{composeError}</div>}
            {composeSuccess && <div style={{ color: '#28a745', marginBottom: '8px' }}>{composeSuccess}</div>}

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '0.85em', marginBottom: '2px' }}>Recipient Type</label>
              <select
                value={composeRecipientType}
                onChange={e => setComposeRecipientType(e.target.value as 'user' | 'mail-group')}
                style={{ padding: '4px 8px', width: '100%' }}
              >
                <option value="mail-group">Mail Group</option>
                <option value="user">User (DUZ)</option>
              </select>
            </div>

            {composeRecipientType === 'mail-group' ? (
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '0.85em', marginBottom: '2px' }}>Mail Group</label>
                {mailGroups.length > 0 ? (
                  <select
                    value={composeRecipientId}
                    onChange={e => {
                      setComposeRecipientId(e.target.value);
                      setComposeRecipientName(e.target.value);
                    }}
                    style={{ padding: '4px 8px', width: '100%' }}
                  >
                    {mailGroups.map(g => (
                      <option key={g.ien} value={g.name}>{g.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    placeholder="Enter mail group name"
                    value={composeRecipientId}
                    onChange={e => { setComposeRecipientId(e.target.value); setComposeRecipientName(e.target.value); }}
                    style={{ padding: '4px 8px', width: '100%' }}
                  />
                )}
              </div>
            ) : (
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '0.85em', marginBottom: '2px' }}>Recipient DUZ</label>
                <input
                  placeholder="Enter user DUZ"
                  value={composeRecipientId}
                  onChange={e => { setComposeRecipientId(e.target.value); setComposeRecipientName(`User ${e.target.value}`); }}
                  style={{ padding: '4px 8px', width: '100%' }}
                />
              </div>
            )}

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '0.85em', marginBottom: '2px' }}>Subject (3-65 chars)</label>
              <input
                value={composeSubject}
                onChange={e => setComposeSubject(e.target.value)}
                maxLength={65}
                style={{ padding: '4px 8px', width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '0.85em', marginBottom: '2px' }}>Priority</label>
              <select
                value={composePriority}
                onChange={e => setComposePriority(e.target.value as 'routine' | 'priority' | 'urgent')}
                style={{ padding: '4px 8px', width: '100%' }}
              >
                <option value="routine">Routine</option>
                <option value="priority">Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.85em', marginBottom: '2px' }}>Message Body</label>
              <textarea
                value={composeBody}
                onChange={e => setComposeBody(e.target.value)}
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
              {sending ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
