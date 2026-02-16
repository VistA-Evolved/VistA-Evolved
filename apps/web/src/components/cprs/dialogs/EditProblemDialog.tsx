'use client';

import { useState } from 'react';
import { useCPRSUI } from '../../../stores/cprs-ui-state';
import { useDataCache } from '../../../stores/data-cache';
import styles from '../cprs.module.css';

/**
 * Edit Problem dialog — allows modifying status and notes on an existing problem.
 * Full ORQQPL EDIT SAVE integration is pending; for now this persists edits
 * to the local data-cache so the Problems list reflects changes immediately.
 */
export default function EditProblemDialog() {
  const { closeModal, modalData } = useCPRSUI();
  const { addLocalItem } = useDataCache();
  const dfn = String(modalData?.dfn ?? '');
  const problem = (modalData?.problem ?? null) as { id?: string; description?: string; status?: string; note?: string; icdCode?: string } | null;

  const [status, setStatus] = useState<string>(problem?.status ?? 'active');
  const [note, setNote] = useState<string>(problem?.note ?? '');
  const [success, setSuccess] = useState(false);

  function handleSave() {
    // Full ORQQPL EDIT SAVE integration pending — persist to local cache for now
    if (dfn && problem) {
      addLocalItem(dfn, 'problems', {
        id: problem.id ?? `edited-${Date.now()}`,
        text: `${problem.description ?? ''}${problem.icdCode ? ` (${problem.icdCode})` : ''} [${note ? 'note: ' + note : ''}]`,
        status,
        onset: undefined,
      });
    }
    setSuccess(true);
    setTimeout(() => closeModal(), 600);
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
          {success && <div style={{ color: 'green', fontSize: 12, marginBottom: 8 }}>Changes saved locally. (Server sync pending ORQQPL EDIT SAVE integration.)</div>}

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
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}
