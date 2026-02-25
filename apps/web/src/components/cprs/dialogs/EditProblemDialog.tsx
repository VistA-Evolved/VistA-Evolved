'use client';

import { useState } from 'react';
import { useCPRSUI } from '../../../stores/cprs-ui-state';
import { useDataCache } from '../../../stores/data-cache';
import { csrfHeaders } from '@/lib/csrf';
import styles from '../cprs.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Edit Problem dialog — allows modifying status and notes on an existing problem.
 * Attempts POST to /vista/problems for server persistence; falls back to local
 * data-cache if the API returns a blocker (ORQQPL EDIT SAVE not yet wired).
 */
export default function EditProblemDialog() {
  const { closeModal, modalData } = useCPRSUI();
  const { addLocalItem } = useDataCache();
  const dfn = String(modalData?.dfn ?? '');
  const problem = (modalData?.problem ?? null) as { id?: string; description?: string; status?: string; note?: string; icdCode?: string } | null;

  const [status, setStatus] = useState<string>(problem?.status ?? 'active');
  const [note, setNote] = useState<string>(problem?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverSync, setServerSync] = useState<'pending' | 'synced' | 'local'>('pending');

  async function handleSave() {
    if (!dfn || !problem) return;
    setSaving(true);

    try {
      // Try API first
      const res = await fetch(`${API_BASE}/vista/cprs/problems/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': `problem-edit-${dfn}-${Date.now()}`, ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({ dfn, problemIen: problem.id, problemText: problem.description, status, comment: note, icdCode: problem.icdCode }),
      });
      const data = await res.json();
      if (data.ok && data.mode === 'real') {
        setServerSync('synced');
      } else if (data.ok && data.mode === 'draft') {
        persistLocal();
        setServerSync('local');
      } else {
        persistLocal();
        setServerSync('local');
      }
    } catch {
      // Network error — save locally
      persistLocal();
      setServerSync('local');
    }

    setSuccess(true);
    setSaving(false);
    setTimeout(() => closeModal(), 800);
  }

  function persistLocal() {
    addLocalItem(dfn, 'problems', {
      id: problem?.id ?? `edited-${Date.now()}`,
      text: `${problem?.description ?? ''}${problem?.icdCode ? ` (${problem.icdCode})` : ''} [${note ? 'note: ' + note : ''}]`,
      status,
      onset: undefined,
    });
  }

  if (!problem) return null;

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && closeModal()}>
      <div className={styles.modalContent} style={{ maxWidth: 480 }}>
        <div className={styles.modalHeader}>
          <span>Edit Problem</span>
          <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>&times;</button>
        </div>
        <div className={styles.modalBody}>
          {success && (
            <div style={{ color: serverSync === 'synced' ? 'green' : '#856404', fontSize: 12, marginBottom: 8, padding: '4px 8px', background: serverSync === 'synced' ? '#d4edda' : '#fff3cd', borderRadius: 4 }}>
              {serverSync === 'synced'
                ? 'Changes saved to VistA (ORQQPL EDIT SAVE).'
                : 'Changes saved locally (VistA sync pending).'}
            </div>
          )}

          <div className={styles.formGroup}>
            <label>Problem</label>
            <div style={{ fontWeight: 600 }}>{problem.description ?? '(unknown)'}</div>
          </div>

          {problem.icdCode && (
            <div className={styles.formGroup}>
              <label>ICD Code</label>
              <div>{problem.icdCode}</div>
            </div>
          )}

          <div className={styles.formGroup}>
            <label>Status</label>
            <select className={styles.formSelect} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Comment / Note</label>
            <textarea className={styles.formTextarea} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a comment..." />
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.btn} onClick={closeModal}>Cancel</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
