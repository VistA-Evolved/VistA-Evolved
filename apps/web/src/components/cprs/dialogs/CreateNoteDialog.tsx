'use client';

import { useState } from 'react';
import { useCPRSUI } from '../../../stores/cprs-ui-state';
import { useDataCache, type Note } from '../../../stores/data-cache';
import styles from '../cprs.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Create Note dialog -- Phase 57 write safety model.
 * POST /vista/cprs/notes/create with TIU CREATE RECORD + TIU SET DOCUMENT TEXT.
 * Falls back to local draft if RPC unavailable.
 */
export default function CreateNoteDialog() {
  const { closeModal, modalData } = useCPRSUI();
  const { addLocalItem } = useDataCache();
  const dfn = String(modalData?.dfn ?? '');

  const [titleIen, setTitleIen] = useState('3');
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'local' | ''>('');

  async function handleSave() {
    if (!noteText.trim()) { setError('Note text is required'); return; }
    setSaving(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/vista/cprs/notes/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': `note-${dfn}-${Date.now()}` },
        credentials: 'include',
        body: JSON.stringify({ dfn, titleIen, noteText }),
      });
      const data = await res.json();
      if (data.ok && data.mode === 'real') {
        setSyncStatus('synced');
        setSuccess(true);
        setTimeout(() => closeModal(), 800);
        return;
      }
      if (data.ok && data.mode === 'draft') {
        setSyncStatus('local');
        setSuccess(true);
        setTimeout(() => closeModal(), 800);
        return;
      }
      saveLocal();
    } catch {
      saveLocal();
    } finally {
      setSaving(false);
    }
  }

  function saveLocal() {
    const draft: Note = {
      id: `draft-${Date.now()}`,
      title: 'Draft Note',
      date: new Date().toISOString().slice(0, 10),
      author: 'Current User',
      text: noteText.trim(),
    };
    addLocalItem(dfn, 'notes', draft);
    setSyncStatus('local');
    setSuccess(true);
    setTimeout(() => closeModal(), 800);
  }

  if (!dfn) return null;

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && closeModal()}>
      <div className={styles.modalContent} style={{ maxWidth: 600 }}>
        <div className={styles.modalHeader}>
          <span>Create Note</span>
          <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>&times;</button>
        </div>
        <div className={styles.modalBody}>
          {error && <div className={styles.errorText}>{error}</div>}
          {success && (
            <div style={{
              padding: '6px 10px', borderRadius: 4, marginBottom: 8, fontSize: 12,
              background: syncStatus === 'synced' ? '#d4edda' : '#fff3cd',
              border: syncStatus === 'synced' ? '1px solid #28a745' : '1px solid #ffc107',
            }}>
              {syncStatus === 'synced' ? 'Note created in VistA' : 'Note saved as local draft (VistA sync pending)'}
            </div>
          )}

          <div className={styles.formGroup}>
            <label>Note Title IEN</label>
            <input className={styles.formInput} value={titleIen} onChange={(e) => setTitleIen(e.target.value)} />
          </div>

          <div className={styles.formGroup}>
            <label>Note Text *</label>
            <textarea
              className={styles.formTextarea}
              rows={10}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter note text..."
            />
          </div>

          <div className={styles.modalFooter}>
            <button className={styles.btn} onClick={closeModal}>Cancel</button>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Create Note'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
