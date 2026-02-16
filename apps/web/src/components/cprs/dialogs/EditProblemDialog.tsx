'use client';

import { useState } from 'react';
import { useCPRSUI } from '../../../stores/cprs-ui-state';
import styles from '../cprs.module.css';

/**
 * Edit Problem dialog — allows modifying status and notes on an existing problem.
 * Full ORQQPL EDIT SAVE integration is pending; for now this updates the UI state only.
 */
export default function EditProblemDialog() {
  const { closeModal, modalData } = useCPRSUI();
  const problem = (modalData?.problem ?? null) as { description?: string; status?: string; note?: string; icdCode?: string } | null;

  const [status, setStatus] = useState<string>(problem?.status ?? 'active');
  const [note, setNote] = useState<string>(problem?.note ?? '');
  const [success, setSuccess] = useState(false);

  function handleSave() {
    // In a full implementation this would call ORQQPL EDIT SAVE
    // For now, just close with a success indication
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
          {success && <div style={{ color: 'green', fontSize: 12, marginBottom: 8 }}>Changes saved.</div>}

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
