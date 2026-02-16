'use client';

import { useState } from 'react';
import { useCPRSUI } from '../../../stores/cprs-ui-state';
import { useDataCache, type Problem } from '../../../stores/data-cache';
import styles from '../cprs.module.css';

/**
 * Add Problem dialog.
 * Phase 9B revealed that the RPC ORQQPL ADD SAVE requires ICD coding lookup
 * (ORQQPL4 LEX) which isn't yet wired end-to-end. Until then, problems are
 * saved as local drafts in the data cache and a banner explains the limitation.
 */
export default function AddProblemDialog() {
  const { closeModal, modalData } = useCPRSUI();
  const { addLocalItem } = useDataCache();
  const dfn = String(modalData?.dfn ?? '');

  const [description, setDescription] = useState('');
  const [onset, setOnset] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [icdCode, setIcdCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSave() {
    if (!description.trim()) { setError('Description is required'); return; }
    setSaving(true);
    setError('');

    try {
      // Try API first
      const res = await fetch(`http://127.0.0.1:3001/vista/problems?dfn=${dfn}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, onset, status, icdCode }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => closeModal(), 800);
        return;
      }

      // API not available — save as local draft
      const draft: Problem = {
        id: `draft-${Date.now()}`,
        text: `${description.trim()}${icdCode ? ` (${icdCode})` : ''}`,
        onset: onset || 'Unknown',
        status,
      };
      addLocalItem(dfn, 'problems', draft);
      setSuccess(true);
      setTimeout(() => closeModal(), 800);
    } catch {
      // Network error — save locally
      const draft: Problem = {
        id: `draft-${Date.now()}-2`,
        text: `${description.trim()}${icdCode ? ` (${icdCode})` : ''}`,
        onset: onset || 'Unknown',
        status,
      };
      addLocalItem(dfn, 'problems', draft);
      setSuccess(true);
      setTimeout(() => closeModal(), 800);
    } finally {
      setSaving(false);
    }
  }

  if (!dfn) return null;

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && closeModal()}>
      <div className={styles.modalContent} style={{ maxWidth: 520 }}>
        <div className={styles.modalHeader}>
          <span>Add Problem</span>
          <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>&times;</button>
        </div>
        <div className={styles.modalBody}>
          <div style={{ padding: '6px 10px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 4, marginBottom: 12, fontSize: 12 }}>
            <strong>Note:</strong> ICD lexicon lookup (ORQQPL4 LEX) is not yet wired. Problems will be saved as local drafts until full API integration is complete.
          </div>

          {error && <div className={styles.errorText}>{error}</div>}
          {success && <div style={{ color: 'green', fontSize: 12, marginBottom: 8 }}>Problem saved successfully.</div>}

          <div className={styles.formGroup}>
            <label>Problem Description *</label>
            <input className={styles.formInput} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Essential hypertension" autoFocus />
          </div>
          <div className={styles.formGroup}>
            <label>ICD Code</label>
            <input className={styles.formInput} value={icdCode} onChange={(e) => setIcdCode(e.target.value)} placeholder="e.g. I10" />
          </div>
          <div className={styles.formGroup}>
            <label>Date of Onset</label>
            <input className={styles.formInput} type="date" value={onset} onChange={(e) => setOnset(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label>Status</label>
            <select className={styles.formSelect} value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.btn} onClick={closeModal}>Cancel</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Problem'}
          </button>
        </div>
      </div>
    </div>
  );
}
