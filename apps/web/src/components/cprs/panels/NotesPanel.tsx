'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useDataCache, type DomainFetchMeta, type Note } from '@/stores/data-cache';
import { useTenant } from '@/stores/tenant-context';
import { csrfHeaders } from '@/lib/csrf';
import styles from '../cprs.module.css';
import { API_BASE } from '@/lib/api-config';

/* ------------------------------------------------------------------ */
/* Local note templates (fallbacks when no facility templates exist)    */
/* ------------------------------------------------------------------ */

const LOCAL_TEMPLATES = [
  { id: 't-soap', name: 'SOAP Note', text: 'S: \nO: \nA: \nP: \n' },
  {
    id: 't-progress',
    name: 'Progress Note',
    text: 'Date: \nProvider: \n\nSubjective:\n\nObjective:\n\nAssessment:\n\nPlan:\n',
  },
  {
    id: 't-telephone',
    name: 'Telephone Encounter',
    text: 'Call from: \nReason: \nAdvice given: \nFollow-up: \n',
  },
  { id: 't-addendum', name: 'Addendum', text: 'ADDENDUM:\n\n' },
  { id: 't-brief', name: 'Brief Note', text: '' },
];

/* ------------------------------------------------------------------ */
/* Status display helpers                                              */
/* ------------------------------------------------------------------ */

function statusBadge(status: string) {
  const s = status.toLowerCase().trim();
  if (s.includes('unsigned') || s.includes('uncosigned'))
    return { label: 'Unsigned', color: 'var(--cprs-warning, #ffc107)' };
  if (s.includes('completed') || s.includes('signed'))
    return { label: 'Signed', color: 'var(--cprs-success, #28a745)' };
  if (s.includes('retracted') || s.includes('amended'))
    return { label: s.charAt(0).toUpperCase() + s.slice(1), color: 'var(--cprs-info, #17a2b8)' };
  return { label: status || 'Unknown', color: 'var(--cprs-muted, #6c757d)' };
}

function isUnsignedStatus(status: string | undefined | null) {
  const s = (status || '').toLowerCase().trim();
  return s.includes('unsigned') || s.includes('uncosigned');
}

interface Props {
  dfn: string;
}

function NotesPendingBanner({ meta }: { meta: DomainFetchMeta }) {
  const statusLabel = meta.status || (meta.ok ? 'ok' : 'request-failed');
  const targetRpcs = meta.pendingTargets.length > 0 ? meta.pendingTargets : ['TIU DOCUMENTS BY CONTEXT'];

  return (
    <div
      style={{
        border: '1px solid #f59e0b',
        borderRadius: 6,
        padding: 12,
        background: '#fffbeb',
        color: '#92400e',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Notes list pending</div>
      <div style={{ fontSize: 13, marginBottom: 6 }}>
        {meta.error
          ? `The latest notes fetch failed: ${meta.error}`
          : meta.pendingNote ||
            'The latest notes fetch did not return a trustworthy live TIU notes list.'}
      </div>
      <div style={{ fontSize: 12, marginBottom: 4 }}>
        <strong>Status:</strong> {statusLabel}
      </div>
      {meta.rpcUsed.length > 0 && (
        <div style={{ fontSize: 12, marginBottom: 4 }}>
          <strong>RPC attempted:</strong> {meta.rpcUsed.join(', ')}
        </div>
      )}
      <div style={{ fontSize: 12 }}>
        <strong>Target RPCs:</strong> {targetRpcs.join(', ')}
      </div>
    </div>
  );
}

export default function NotesPanel({ dfn }: Props) {
  const cache = useDataCache();
  const { noteTemplates, isFeatureEnabled } = useTenant();
  const [selected, setSelected] = useState<Note | null>(null);
  const [showNewNote, setShowNewNote] = useState(false);
  const [showAddendum, setShowAddendum] = useState(false);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteText, setNoteText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Note text viewer state
  const [viewText, setViewText] = useState<string | null>(null);
  const [viewTextLoading, setViewTextLoading] = useState(false);

  // Sign state
  const [esCode, setEsCode] = useState('');
  const [signLoading, setSignLoading] = useState(false);
  const [signMsg, setSignMsg] = useState<string | null>(null);

  // Addendum state
  const [addendumText, setAddendumText] = useState('');
  const [addendumLoading, setAddendumLoading] = useState(false);
  const [addendumMsg, setAddendumMsg] = useState<string | null>(null);

  // VistA titles
  const [vistaTitles, setVistaTitles] = useState<{ ien: string; name: string }[]>([]);
  const [selectedTitleIen, setSelectedTitleIen] = useState('10'); // default GENERAL NOTE

  // Merge facility-managed templates with local fallbacks (Phase 17E)
  const NOTE_TEMPLATES = useMemo(() => {
    if (!isFeatureEnabled('notes.templates')) return LOCAL_TEMPLATES;
    if (noteTemplates.length === 0) return LOCAL_TEMPLATES;
    const facilityTemplates = noteTemplates.map((t) => ({
      id: t.id,
      name: t.title,
      text: t.body,
    }));
    const facilityIds = new Set(facilityTemplates.map((t) => t.id));
    const localOnly = LOCAL_TEMPLATES.filter((t) => !facilityIds.has(t.id));
    return [...facilityTemplates, ...localOnly];
  }, [noteTemplates, isFeatureEnabled]);

  useEffect(() => {
    cache.fetchDomain(dfn, 'notes');
  }, [dfn]); // eslint-disable-line react-hooks/exhaustive-deps

  const notes = cache.getDomain(dfn, 'notes');
  const loading = cache.isLoading(dfn, 'notes');
  const notesMeta = cache.getDomainMeta(dfn, 'notes');
  const hasNotes = notes.length > 0;
  const showPendingNotesBanner =
    !loading && notes.length === 0 && notesMeta.fetched && (notesMeta.pending || notesMeta.ok !== true);

  useEffect(() => {
    setSelected(null);
    setViewText(null);
    setViewTextLoading(false);
    setShowAddendum(false);
    setShowSignDialog(false);
    setAddendumText('');
    setEsCode('');
    setSignMsg(null);
    setAddendumMsg(null);
  }, [dfn]);

  useEffect(() => {
    if (!selected) return;

    const freshSelected = notes.find((note) => note.id === selected.id) || null;
    if (!freshSelected) {
      setSelected(null);
      setViewText(null);
      setViewTextLoading(false);
      setShowAddendum(false);
      setShowSignDialog(false);
      setAddendumText('');
      setEsCode('');
      return;
    }

    if (freshSelected !== selected) {
      setSelected(freshSelected);
    }
  }, [notes, selected]);

  // Fetch VistA titles on mount
  useEffect(() => {
    async function loadTitles() {
      try {
        const res = await fetch(`${API_BASE}/vista/cprs/notes/titles`, { credentials: 'include' });
        const data = await res.json();
        if (data.ok && data.titles?.length) {
          setVistaTitles(data.titles);
          setSelectedTitleIen(data.titles[0].ien);
        } else if (data.defaultTitles?.length) {
          setVistaTitles(data.defaultTitles);
        }
      } catch {
        /* titles fetch is best-effort */
      }
    }
    loadTitles();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch note text when a note is selected
  const fetchNoteText = useCallback(
    async (noteId: string) => {
      setViewText(null);
      setViewTextLoading(true);
      try {
        const res = await fetch(`${API_BASE}/vista/cprs/notes/text?ien=${noteId}`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (data.ok) {
          setViewText(data.text);
        } else {
          setViewText(`[Error loading note text: ${data.error || 'Unknown error'}]`);
        }
      } catch (e: unknown) {
        setViewText(`[Error: ${(e as Error).message}]`);
      } finally {
        setViewTextLoading(false);
      }
    },
    [API_BASE]
  );

  function handleSelectNote(n: Note) {
    setSelected(n);
    setShowAddendum(false);
    setShowSignDialog(false);
    setSignMsg(null);
    setAddendumMsg(null);
    fetchNoteText(n.id);
  }

  function handleRefresh() {
    cache.fetchDomain(dfn, 'notes');
    setSelected(null);
    setViewText(null);
    setSaveMsg(null);
    setSignMsg(null);
    setAddendumMsg(null);
  }

  async function handleSaveNote() {
    if (!noteText.trim()) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`${API_BASE}/vista/cprs/notes/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({
          dfn,
          titleIen: selectedTitleIen || '10',
          noteText,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        const mode = data.mode === 'draft' ? ' (draft)' : '';
        setSaveMsg(`Note created${mode} (ID: ${data.documentIen || data.draftId})`);
        setShowNewNote(false);
        setNoteTitle('');
        setNoteText('');
        setSelectedTemplate(null);
        cache.fetchDomain(dfn, 'notes');
      } else if (data.status === 'create-blocked') {
        setSaveMsg(
          `Note creation blocked: ${data.message || data.error || 'note body persistence failed'}${
            data.documentIen ? ` (TIU shell ID: ${data.documentIen})` : ''
          }`
        );
      } else {
        setSaveMsg(`Error: ${data.error || data.errors?.map((e: any) => e.message).join(', ')}`);
      }
    } catch (e: unknown) {
      setSaveMsg(`Error: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleSign() {
    if (!selected || !esCode.trim()) return;
    setSignLoading(true);
    setSignMsg(null);
    try {
      const res = await fetch(`${API_BASE}/vista/cprs/notes/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({ dfn, docIen: selected.id, esCode }),
      });
      const data = await res.json();
      if (data.ok) {
        const mode = data.mode === 'draft' ? ' (pending)' : '';
        setSignMsg(`Signed${mode}`);
        setEsCode('');
        setShowSignDialog(false);
        cache.fetchDomain(dfn, 'notes');
      } else if (data.status === 'sign-blocked') {
        setEsCode('');
        setSignMsg(`Signing blocked: ${data.message || data.error || 'e-signature verification failed'}`);
      } else if (data.status === 'sign-failed') {
        setEsCode('');
        setSignMsg(`Signing failed: ${data.message || data.error || 'RPC call failed'}`);
      } else {
        setEsCode('');
        setSignMsg(`Sign failed: ${data.message || data.error || 'unknown error'}`);
      }
    } catch (e: unknown) {
      setEsCode('');
      setSignMsg(`Sign error: ${(e as Error).message}`);
    } finally {
      setSignLoading(false);
    }
  }

  async function handleAddendum() {
    if (!selected || !addendumText.trim()) return;
    setAddendumLoading(true);
    setAddendumMsg(null);
    try {
      const res = await fetch(`${API_BASE}/vista/cprs/notes/addendum`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({ dfn, parentDocIen: selected.id, noteText: addendumText }),
      });
      const data = await res.json();
      if (data.ok) {
        const mode = data.mode === 'draft' ? ' (pending)' : '';
        setAddendumMsg(`Addendum created${mode}`);
        setAddendumText('');
        setShowAddendum(false);
        cache.fetchDomain(dfn, 'notes');
      } else if (data.status === 'addendum-blocked') {
        setAddendumMsg(
          `Addendum blocked: ${data.message || data.error || 'note body persistence failed'}${
            data.addendumIen ? ` (TIU shell ID: ${data.addendumIen})` : ''
          }`
        );
      } else {
        setAddendumMsg(`Error: ${data.error || 'Addendum failed'}`);
      }
    } catch (e: unknown) {
      setAddendumMsg(`Error: ${(e as Error).message}`);
    } finally {
      setAddendumLoading(false);
    }
  }

  function applyTemplate(templateId: string) {
    const tmpl = NOTE_TEMPLATES.find((t) => t.id === templateId);
    if (tmpl) {
      setSelectedTemplate(templateId);
      setNoteText(tmpl.text);
      if (!noteTitle) setNoteTitle(tmpl.name);
    }
  }

  const isUnsigned = selected ? isUnsignedStatus(selected.status) : false;

  return (
    <div>
      <div className={styles.panelTitle}>Progress Notes</div>
      <div className={styles.panelToolbar}>
        <button className={styles.btn} onClick={() => setShowNewNote(!showNewNote)}>
          {showNewNote ? 'Cancel' : '+ New Note'}
        </button>
        <button className={styles.btn} onClick={handleRefresh} title="Refresh notes list">
          Refresh
        </button>
        {selected && isUnsigned && (
          <button
            className={styles.btn}
            onClick={() => {
              setShowSignDialog(!showSignDialog);
              setShowAddendum(false);
            }}
          >
            Sign
          </button>
        )}
        {selected && (
          <button
            className={styles.btn}
            onClick={() => {
              setShowAddendum(!showAddendum);
              setShowSignDialog(false);
            }}
          >
            + Addendum
          </button>
        )}
      </div>

      {saveMsg && (
        <p
          style={{
            color: saveMsg.startsWith('Error') ? 'var(--cprs-danger)' : 'var(--cprs-success)',
            fontSize: 12,
            margin: '4px 0',
          }}
        >
          {saveMsg}
        </p>
      )}
      {signMsg && (
        <p
          style={{
            color: signMsg.startsWith('Error') ? 'var(--cprs-danger)' : 'var(--cprs-success)',
            fontSize: 12,
            margin: '4px 0',
          }}
        >
          {signMsg}
        </p>
      )}
      {addendumMsg && (
        <p
          style={{
            color: addendumMsg.startsWith('Error') ? 'var(--cprs-danger)' : 'var(--cprs-success)',
            fontSize: 12,
            margin: '4px 0',
          }}
        >
          {addendumMsg}
        </p>
      )}

      {/* --- Sign Dialog --- */}
      {showSignDialog && selected && (
        <div
          style={{
            border: '1px solid var(--cprs-border)',
            padding: 12,
            marginBottom: 8,
            borderRadius: 4,
            background: 'var(--cprs-bg-alt, #f8f9fa)',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Sign Note: {selected.title}</div>
          <div className={styles.formGroup}>
            <label>Electronic Signature Code</label>
            <input
              className={styles.formInput}
              type="password"
              value={esCode}
              onChange={(e) => setEsCode(e.target.value)}
              placeholder="Enter electronic signature code"
              autoComplete="off"
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={styles.btnPrimary}
              onClick={handleSign}
              disabled={signLoading || !esCode.trim()}
            >
              {signLoading ? 'Signing...' : 'Apply Signature'}
            </button>
            <button
              className={styles.btn}
              onClick={() => {
                setShowSignDialog(false);
                setEsCode('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* --- Addendum Form --- */}
      {showAddendum && selected && (
        <div
          style={{
            border: '1px solid var(--cprs-border)',
            padding: 12,
            marginBottom: 8,
            borderRadius: 4,
            background: 'var(--cprs-bg-alt, #f8f9fa)',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Addendum to: {selected.title}</div>
          <div className={styles.formGroup}>
            <label>Addendum Text</label>
            <textarea
              className={styles.formTextarea}
              value={addendumText}
              onChange={(e) => setAddendumText(e.target.value)}
              rows={6}
              placeholder="Enter addendum text..."
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={styles.btnPrimary}
              onClick={handleAddendum}
              disabled={addendumLoading || !addendumText.trim()}
            >
              {addendumLoading ? 'Saving...' : 'Save Addendum'}
            </button>
            <button
              className={styles.btn}
              onClick={() => {
                setShowAddendum(false);
                setAddendumText('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* --- New Note Form --- */}
      {showNewNote && (
        <div
          style={{
            border: '1px solid var(--cprs-border)',
            padding: 12,
            marginBottom: 8,
            borderRadius: 4,
          }}
        >
          <div className={styles.formGroup}>
            <label>Template</label>
            <div className={styles.templateList}>
              {NOTE_TEMPLATES.map((t) => (
                <div
                  key={t.id}
                  className={`${styles.templateItem} ${selectedTemplate === t.id ? styles.selected : ''}`}
                  onClick={() => applyTemplate(t.id)}
                >
                  {t.name}
                </div>
              ))}
            </div>
          </div>
          {vistaTitles.length > 0 && (
            <div className={styles.formGroup}>
              <label>Note Title (VistA)</label>
              <select
                className={styles.formInput}
                value={selectedTitleIen}
                onChange={(e) => setSelectedTitleIen(e.target.value)}
              >
                {vistaTitles.map((t) => (
                  <option key={t.ien} value={t.ien}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className={styles.formGroup}>
            <label>Title</label>
            <input
              className={styles.formInput}
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Note title (display)"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Text</label>
            <textarea
              className={styles.formTextarea}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={10}
              placeholder="Enter note text..."
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={styles.btnPrimary}
              onClick={handleSaveNote}
              disabled={saving || !noteText.trim()}
            >
              {saving ? 'Saving...' : 'Save Note'}
            </button>
            <button
              className={styles.btn}
              onClick={() => {
                setShowNewNote(false);
                setNoteTitle('');
                setNoteText('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* --- Split Pane: List + Detail --- */}
      <div className={styles.splitPane}>
        <div className={styles.splitLeft}>
          {loading && !hasNotes && <p className={styles.loadingText}>Loading notes...</p>}
          {loading && hasNotes && (
            <p className={styles.loadingText} style={{ marginBottom: 8 }}>
              Refreshing notes...
            </p>
          )}
          {showPendingNotesBanner && <NotesPendingBanner meta={notesMeta} />}
          {!loading && !showPendingNotesBanner && notes.length === 0 && (
            <p className={styles.emptyText}>No notes on record</p>
          )}
          {!showPendingNotesBanner && notes.length > 0 && (
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Date</th>
                  <th>Author</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {notes.map((n) => {
                  const badge = statusBadge(n.status);
                  return (
                    <tr
                      key={n.id}
                      onClick={() => handleSelectNote(n)}
                      style={
                        selected?.id === n.id ? { background: 'var(--cprs-selected)' } : undefined
                      }
                    >
                      <td>{n.title}</td>
                      <td>{n.date}</td>
                      <td>{n.author}</td>
                      <td>
                        <span style={{ color: badge.color, fontSize: 11, fontWeight: 600 }}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className={styles.splitRight}>
          {selected ? (
            <div>
              <div className={styles.panelTitle}>Note Detail</div>
              <div className={styles.formGroup}>
                <label>Title</label>
                <div>{selected.title}</div>
              </div>
              <div className={styles.formGroup}>
                <label>Date</label>
                <div>{selected.date}</div>
              </div>
              <div className={styles.formGroup}>
                <label>Author</label>
                <div>{selected.author}</div>
              </div>
              <div className={styles.formGroup}>
                <label>Location</label>
                <div>{selected.location}</div>
              </div>
              <div className={styles.formGroup}>
                <label>Status</label>
                <div>
                  {(() => {
                    const badge = statusBadge(selected.status);
                    return (
                      <span style={{ color: badge.color, fontWeight: 600 }}>{badge.label}</span>
                    );
                  })()}
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Note Text</label>
                {viewTextLoading && <p className={styles.loadingText}>Loading note text...</p>}
                {!viewTextLoading && viewText !== null && (
                  <pre
                    style={{
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace',
                      fontSize: 12,
                      background: 'var(--cprs-bg-alt, #f8f9fa)',
                      padding: 8,
                      borderRadius: 4,
                      maxHeight: 400,
                      overflow: 'auto',
                      border: '1px solid var(--cprs-border)',
                    }}
                  >
                    {viewText}
                  </pre>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--cprs-muted)', marginTop: 4 }}>
                Source: VistA TIU | IEN: {selected.id}
              </div>
            </div>
          ) : (
            <p className={styles.emptyText}>Select a note to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}
