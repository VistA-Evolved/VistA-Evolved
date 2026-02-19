'use client';

import { useEffect, useState, useMemo } from 'react';
import { useDataCache, type Note } from '@/stores/data-cache';
import { useTenant } from '@/stores/tenant-context';
import styles from '../cprs.module.css';

/* ------------------------------------------------------------------ */
/* Local note templates (fallbacks when no facility templates exist)    */
/* ------------------------------------------------------------------ */

const LOCAL_TEMPLATES = [
  { id: 't-soap', name: 'SOAP Note', text: 'S: \nO: \nA: \nP: \n' },
  { id: 't-progress', name: 'Progress Note', text: 'Date: \nProvider: \n\nSubjective:\n\nObjective:\n\nAssessment:\n\nPlan:\n' },
  { id: 't-telephone', name: 'Telephone Encounter', text: 'Call from: \nReason: \nAdvice given: \nFollow-up: \n' },
  { id: 't-addendum', name: 'Addendum', text: 'ADDENDUM:\n\n' },
  { id: 't-brief', name: 'Brief Note', text: '' },
];

interface Props { dfn: string; }

export default function NotesPanel({ dfn }: Props) {
  const cache = useDataCache();
  const { noteTemplates, isFeatureEnabled } = useTenant();
  const [selected, setSelected] = useState<Note | null>(null);
  const [showNewNote, setShowNewNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteText, setNoteText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Merge facility-managed templates with local fallbacks (Phase 17E)
  const NOTE_TEMPLATES = useMemo(() => {
    if (!isFeatureEnabled('notes.templates')) return LOCAL_TEMPLATES;
    if (noteTemplates.length === 0) return LOCAL_TEMPLATES;
    // Facility templates first, then local templates not duplicated by id
    const facilityTemplates = noteTemplates.map((t) => ({
      id: t.id,
      name: t.title,
      text: t.body,
    }));
    const facilityIds = new Set(facilityTemplates.map((t) => t.id));
    const localOnly = LOCAL_TEMPLATES.filter((t) => !facilityIds.has(t.id));
    return [...facilityTemplates, ...localOnly];
  }, [noteTemplates, isFeatureEnabled]);

  useEffect(() => { cache.fetchDomain(dfn, 'notes'); }, [dfn]); // eslint-disable-line react-hooks/exhaustive-deps

  const notes = cache.getDomain(dfn, 'notes');
  const loading = cache.isLoading(dfn, 'notes');

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

  async function handleSaveNote() {
    if (!noteTitle.trim() || !noteText.trim()) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`${API_BASE}/vista/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ dfn, title: noteTitle, text: noteText }),
      });
      const data = await res.json();
      if (data.ok) {
        setSaveMsg(`Note created (ID: ${data.id})`);
        setShowNewNote(false);
        setNoteTitle('');
        setNoteText('');
        setSelectedTemplate(null);
        cache.fetchDomain(dfn, 'notes'); // refresh
      } else {
        setSaveMsg(`Error: ${data.error}`);
      }
    } catch (e: unknown) {
      setSaveMsg(`Error: ${(e as Error).message}`);
    } finally {
      setSaving(false);
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

  return (
    <div>
      <div className={styles.panelTitle}>Progress Notes</div>
      <div className={styles.panelToolbar}>
        <button className={styles.btn} onClick={() => setShowNewNote(!showNewNote)}>
          {showNewNote ? 'Cancel New Note' : '+ New Note'}
        </button>
      </div>

      {saveMsg && <p style={{ color: saveMsg.startsWith('Error') ? 'var(--cprs-danger)' : 'var(--cprs-success)', fontSize: 12, margin: '4px 0' }}>{saveMsg}</p>}

      {showNewNote && (
        <div style={{ border: '1px solid var(--cprs-border)', padding: 12, marginBottom: 8, borderRadius: 4 }}>
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
          <div className={styles.formGroup}>
            <label>Title</label>
            <input className={styles.formInput} value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Note title" />
          </div>
          <div className={styles.formGroup}>
            <label>Text</label>
            <textarea className={styles.formTextarea} value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={10} placeholder="Enter note text..." />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={styles.btnPrimary} onClick={handleSaveNote} disabled={saving || !noteTitle.trim() || !noteText.trim()}>
              {saving ? 'Saving...' : 'Save Note'}
            </button>
            <button className={styles.btn} onClick={() => { setShowNewNote(false); setNoteTitle(''); setNoteText(''); }}>Cancel</button>
          </div>
        </div>
      )}

      <div className={styles.splitPane}>
        <div className={styles.splitLeft}>
          {loading && <p className={styles.loadingText}>Loading notes...</p>}
          {!loading && notes.length === 0 && <p className={styles.emptyText}>No notes on record</p>}
          {!loading && notes.length > 0 && (
            <table className={styles.dataTable}>
              <thead><tr><th>Title</th><th>Date</th><th>Author</th></tr></thead>
              <tbody>
                {notes.map((n) => (
                  <tr
                    key={n.id}
                    onClick={() => setSelected(n)}
                    style={selected?.id === n.id ? { background: 'var(--cprs-selected)' } : undefined}
                  >
                    <td>{n.title}</td>
                    <td>{n.date}</td>
                    <td>{n.author}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className={styles.splitRight}>
          {selected ? (
            <div>
              <div className={styles.panelTitle}>Note Detail</div>
              <div className={styles.formGroup}><label>Title</label><div>{selected.title}</div></div>
              <div className={styles.formGroup}><label>Date</label><div>{selected.date}</div></div>
              <div className={styles.formGroup}><label>Author</label><div>{selected.author}</div></div>
              <div className={styles.formGroup}><label>Location</label><div>{selected.location}</div></div>
              <div className={styles.formGroup}><label>Status</label><div><span className={styles.badge}>{selected.status}</span></div></div>
            </div>
          ) : (
            <p className={styles.emptyText}>Select a note to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}
