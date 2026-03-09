'use client';

import { useState } from 'react';
import { useCPRSUI } from '../../../stores/cprs-ui-state';
import { useDataCache, type Problem } from '../../../stores/data-cache';
import { csrfHeaders } from '@/lib/csrf';
import styles from '../cprs.module.css';
import { API_BASE } from '@/lib/api-config';

/**
 * Edit Problem dialog for an existing problem-list item.
 * Uses the CPRS write route first, then truthfully updates the local cache if
 * the server stores the edit as a draft fallback.
 */
export default function EditProblemDialog() {
  const { closeModal, modalData } = useCPRSUI();
  const { updateProblem } = useDataCache();
  const dfn = String(modalData?.dfn ?? '');
  const problem = (modalData?.problem ?? null) as (Problem & {
    description?: string;
    note?: string;
    icdCode?: string;
  }) | null;
  const problemText = problem?.description ?? problem?.text ?? '';

  const [status, setStatus] = useState<string>(problem?.status ?? 'active');
  const [note, setNote] = useState<string>(problem?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [serverSync, setServerSync] = useState<'pending' | 'synced' | 'draft'>('pending');

  async function handleSave() {
    if (!dfn || !problem) return;
    if (!problemText.trim()) {
      setError('Problem text missing');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/vista/cprs/problems/edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `problem-edit-${dfn}-${Date.now()}`,
          ...csrfHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({
          dfn,
          problemIen: problem.id,
          problemText,
          status,
          comment: note,
          icdCode: problem.icdCode,
        }),
      });
      const data = await res.json();
      if (data.ok && data.mode === 'real') {
        applyLocalEdit();
        setServerSync('synced');
      } else if (data.ok && data.mode === 'draft') {
        applyLocalEdit();
        setServerSync('draft');
      } else {
        setError(data.error || data.message || 'Problem update failed');
        setSaving(false);
        return;
      }
    } catch {
      setError('Network error -- unable to update problem');
      setSaving(false);
      return;
    }

    setSuccess(true);
    setSaving(false);
    setTimeout(() => closeModal(), 800);
  }

  function applyLocalEdit() {
    if (!problem?.id) return;
    updateProblem(dfn, problem.id, (existing) => ({
      ...existing,
      text: problemText,
      status,
      ...(problem.icdCode ? ({ icdCode: problem.icdCode } as any) : {}),
      ...(note ? ({ note } as any) : {}),
    }));
  }

  if (!problem) return null;

  return (
    <div
      className={styles.modalOverlay}
      onClick={(e) => e.target === e.currentTarget && closeModal()}
    >
      <div className={styles.modalContent} style={{ maxWidth: 480 }}>
        <div className={styles.modalHeader}>
          <span>Edit Problem</span>
          <button
            onClick={closeModal}
            style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}
          >
            &times;
          </button>
        </div>
        <div className={styles.modalBody}>
          {error && <div className={styles.errorText}>{error}</div>}
          {success && (
            <div
              style={{
                color: serverSync === 'synced' ? 'green' : '#856404',
                fontSize: 12,
                marginBottom: 8,
                padding: '4px 8px',
                background: serverSync === 'synced' ? '#d4edda' : '#fff3cd',
                borderRadius: 4,
              }}
            >
              {serverSync === 'synced'
                ? 'Changes saved to VistA (ORQQPL EDIT SAVE).'
                : 'Changes saved as server-side draft (VistA sync pending).'}
            </div>
          )}

          <div className={styles.formGroup}>
            <label>Problem</label>
            <div style={{ fontWeight: 600 }}>{problemText || '(unknown)'}</div>
          </div>

          {problem.icdCode && (
            <div className={styles.formGroup}>
              <label>ICD Code</label>
              <div>{problem.icdCode}</div>
            </div>
          )}

          <div className={styles.formGroup}>
            <label>Status</label>
            <select
              className={styles.formSelect}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Comment / Note</label>
            <textarea
              className={styles.formTextarea}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a comment..."
            />
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.btn} onClick={closeModal}>
            Cancel
          </button>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
