/**
 * Messages Page -- Secure messaging with care team.
 * Inbox / Drafts / Sent tabs, compose form.
 *
 * Portal secure messaging with truthful VistA MailMan or local-mode posture.
 *
 * IMPORTANT: SLA disclaimer -- this is NOT for urgent communication.
 */

'use client';

import { useEffect, useState } from 'react';
import { DataSourceBadge } from '@/components/data-source-badge';
import {
  fetchInbox,
  fetchDrafts,
  fetchSentMessages,
  createMessageDraft,
  sendMessageDraft,
  deleteMessageDraft,
  fetchVistaMailmanInbox,
  sendVistaMailmanMessage,
} from '@/lib/api';

type Tab = 'inbox' | 'drafts' | 'sent' | 'compose';

function describeVistaSync(vistaSync?: string) {
  switch (vistaSync) {
    case 'synced':
      return { label: 'VistA MailMan synced', color: '#166534' };
    case 'failed':
      return { label: 'MailMan sync failed', color: '#b91c1c' };
    case 'pending':
      return { label: 'Sync pending', color: '#92400e' };
    case 'not_synced':
      return { label: 'Local mode only', color: '#64748b' };
    default:
      return null;
  }
}

export default function MessagesPage() {
  const [tab, setTab] = useState<Tab>('inbox');
  const [inbox, setInbox] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [sent, setSent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [slaDisclaimer, setSlaDisclaimer] = useState('');
  const [composeSubject, setSubject] = useState('');
  const [composeBody, setBody] = useState('');
  const [composeCategory, setCategory] = useState('general');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [vistaSync, setVistaSync] = useState<string>('');
  const [inboxSource, setInboxSource] = useState<'vista' | 'local' | ''>('');
  const noticeIsError =
    notice.toLowerCase().includes('failed') || notice.toLowerCase().includes('required');

  useEffect(() => {
    loadMessages();
  }, []);

  async function loadMessages() {
    setLoading(true);
    // Phase 130: Try VistA MailMan inbox first, fall back to Postgres
    let inboxMessages: any[] = [];
    let source: 'vista' | 'local' = 'local';
    try {
      const vistaRes = await fetchVistaMailmanInbox(50);
      if (vistaRes.ok && (vistaRes.data as any)?.source === 'vista') {
        inboxMessages = (vistaRes.data as any)?.messages || [];
        source = 'vista';
      }
    } catch {
      /* VistA unavailable -- fall through */
    }
    if (source !== 'vista') {
      const inRes = await fetchInbox();
      inboxMessages = (inRes.data as any)?.messages || [];
      source = (inRes.data as any)?.source === 'vista' ? 'vista' : 'local';
    }
    setInbox(inboxMessages);
    setInboxSource(source);
    setSlaDisclaimer(
      source === 'local'
        ? 'Local Mode -- VistA MailMan unavailable. Messages are stored locally.'
        : ''
    );

    const [dRes, sRes] = await Promise.all([fetchDrafts(), fetchSentMessages()]);
    setDrafts((dRes.data as any)?.messages || []);
    setSent((sRes.data as any)?.messages || []);
    setLoading(false);
  }

  async function handleSend() {
    if (!composeSubject.trim() || !composeBody.trim()) {
      setNotice('Subject and message body are required.');
      return;
    }
    setSending(true);
    setNotice('');

    // Phase 130: Try VistA MailMan primary send first
    try {
      const mmRes = await sendVistaMailmanMessage({
        subject: composeSubject,
        body: composeBody,
        category: composeCategory,
      });
      if (mmRes.ok && (mmRes.data as any)?.ok) {
        const src = (mmRes.data as any)?.source || 'unknown';
        const syncStatus = (mmRes.data as any)?.vistaSync || 'not_synced';
        setVistaSync(syncStatus);
        const label =
          src === 'vista'
            ? 'Message sent to the clinic via VistA MailMan.'
            : 'Message stored locally only. VistA MailMan is unavailable, so clinic delivery is not yet confirmed.';
        setSubject('');
        setBody('');
        setCategory('general');
        setNotice(label);
        setSending(false);
        setTab('sent');
        loadMessages();
        return;
      }
    } catch {
      /* fall through to legacy path */
    }

    // Fallback: legacy draft+send via Postgres store
    const draftRes = await createMessageDraft({
      subject: composeSubject,
      body: composeBody,
      category: composeCategory,
    });
    if (!draftRes.ok) {
      setNotice('Failed to create message.');
      setSending(false);
      return;
    }
    const draftId = (draftRes.data as any)?.message?.id;
    if (!draftId) {
      setNotice('Failed to create message draft.');
      setSending(false);
      return;
    }
    const sendRes = await sendMessageDraft(draftId);
    setSending(false);
    if (sendRes.ok) {
      setVistaSync('local-only');
      setSubject('');
      setBody('');
      setCategory('general');
      setNotice(
        'Message stored locally only. VistA MailMan is unavailable, so clinic delivery is not yet confirmed.'
      );
      setTab('sent');
      loadMessages();
    } else {
      setNotice('Failed to send message.');
    }
  }

  async function handleDeleteDraft(id: string) {
    await deleteMessageDraft(id);
    loadMessages();
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'inbox', label: 'Inbox', count: inbox.length },
    { key: 'drafts', label: 'Drafts', count: drafts.length },
    { key: 'sent', label: 'Sent', count: sent.length },
    { key: 'compose', label: 'Compose' },
  ];

  return (
    <div className="container">
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Messages</h1>
      <p style={{ color: 'var(--portal-text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
        Secure messaging with your care team
      </p>

      {slaDisclaimer && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            background: '#fef3c7',
            borderRadius: 4,
            fontSize: '0.8125rem',
            color: '#92400e',
            marginBottom: '1rem',
          }}
        >
          {slaDisclaimer}
        </div>
      )}

      {/* Phase 130: Data source indicator */}
      {inboxSource && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.75rem',
            fontSize: '0.8125rem',
            color: '#64748b',
          }}
        >
          <span>Data source:</span>
          <DataSourceBadge source={inboxSource === 'vista' ? 'ehr' : 'local'} />
          {inboxSource === 'local' && <span style={{ color: '#92400e' }}>(Local Mode)</span>}
        </div>
      )}

      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          gap: '0',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '1rem',
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? '#2563eb' : '#64748b',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === t.key ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: '-2px',
            }}
          >
            {t.label} {t.count !== undefined ? `(${t.count})` : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Loading messages...</p>
      ) : (
        <>
          {tab === 'inbox' && (
            <MessageList
              messages={inbox}
              emptyText="No messages in your inbox."
              dataSource={inboxSource || 'local'}
            />
          )}
          {tab === 'drafts' && (
            <MessageList
              messages={drafts}
              emptyText="No drafts."
              onDelete={handleDeleteDraft}
              dataSource="local"
            />
          )}
          {tab === 'sent' && (
            <MessageList messages={sent} emptyText="No sent messages." dataSource="local" />
          )}
          {tab === 'compose' && (
            <div className="card">
              <h3 style={{ margin: '0 0 0.75rem' }}>New Message</h3>
              {notice && (
                <div
                  style={{
                    padding: '0.375rem 0.75rem',
                    borderRadius: 4,
                    marginBottom: '0.75rem',
                    background: noticeIsError ? '#fef2f2' : '#dcfce7',
                    color: noticeIsError ? '#dc2626' : '#166534',
                    fontSize: '0.8125rem',
                  }}
                >
                  {notice}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 500 }}>Category</label>
                  <select
                    value={composeCategory}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '0.375rem',
                      borderRadius: 4,
                      border: '1px solid #cbd5e1',
                      marginTop: '0.25rem',
                    }}
                  >
                    <option value="general">General Question</option>
                    <option value="medication">Medication Question</option>
                    <option value="appointment">Appointment</option>
                    <option value="test_result">Test Result</option>
                    <option value="education">Health Education</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 500 }}>Subject</label>
                  <input
                    type="text"
                    value={composeSubject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Message subject"
                    maxLength={200}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '0.375rem',
                      borderRadius: 4,
                      border: '1px solid #cbd5e1',
                      marginTop: '0.25rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 500 }}>Message</label>
                  <textarea
                    value={composeBody}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Type your message here..."
                    rows={6}
                    maxLength={10000}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '0.375rem',
                      borderRadius: 4,
                      border: '1px solid #cbd5e1',
                      marginTop: '0.25rem',
                      resize: 'vertical',
                    }}
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  style={{
                    alignSelf: 'flex-end',
                    padding: '0.5rem 1.25rem',
                    background: sending ? '#94a3b8' : '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    fontWeight: 600,
                    cursor: sending ? 'not-allowed' : 'pointer',
                  }}
                >
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
                {vistaSync && (
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: describeVistaSync(vistaSync)?.color || '#64748b',
                      marginTop: '0.25rem',
                    }}
                  >
                    Delivery posture: {describeVistaSync(vistaSync)?.label || vistaSync}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MessageList({
  messages,
  emptyText,
  onDelete,
  dataSource = 'local',
}: {
  messages: any[];
  emptyText: string;
  onDelete?: (id: string) => void;
  dataSource?: 'vista' | 'local';
}) {
  if (!messages.length) {
    return (
      <div className="card">
        <div className="empty-state" style={{ padding: '1.5rem' }}>
          <p>{emptyText}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {messages.map((msg: any) => (
        (() => {
          const messageSource = msg.vistaSync === 'synced' || msg.vistaRef ? 'vista' : dataSource;
          const syncMeta = describeVistaSync(msg.vistaSync);
          return (
        <div
          key={msg.id || msg.ien || msg.subject}
          className="card"
          style={{ padding: '0.75rem 1rem' }}
        >
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                {msg.subject || '(No subject)'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>
                {msg.category && (
                  <span style={{ textTransform: 'capitalize' }}>
                    {msg.category.replace('_', ' ')} *{' '}
                  </span>
                )}
                {msg.fromName && <span>{msg.fromName} * </span>}
                {msg.status === 'sent'
                  ? 'Sent'
                  : msg.status === 'draft'
                    ? 'Draft'
                    : msg.isNew
                      ? 'New'
                      : 'Received'}{' '}
                {msg.date
                  ? new Date(msg.date).toLocaleDateString()
                  : msg.sentAt
                    ? new Date(msg.sentAt).toLocaleDateString()
                    : msg.createdAt
                      ? new Date(msg.createdAt).toLocaleDateString()
                      : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {msg.status === 'draft' && onDelete && (
                <button
                  onClick={() => onDelete(msg.id)}
                  style={{
                    fontSize: '0.75rem',
                    color: '#dc2626',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              )}
              <DataSourceBadge source={messageSource === 'vista' ? 'ehr' : 'local'} />
            </div>
          </div>
          {syncMeta && msg.status !== 'draft' && (
            <div style={{ fontSize: '0.75rem', color: syncMeta.color, marginTop: '0.25rem' }}>
              {syncMeta.label}
            </div>
          )}
          {msg.body && (
            <p
              style={{
                fontSize: '0.8125rem',
                color: '#475569',
                marginTop: '0.375rem',
                whiteSpace: 'pre-wrap',
              }}
            >
              {msg.body.length > 200 ? msg.body.slice(0, 200) + '...' : msg.body}
            </p>
          )}
        </div>
          );
        })()
      ))}
    </div>
  );
}
