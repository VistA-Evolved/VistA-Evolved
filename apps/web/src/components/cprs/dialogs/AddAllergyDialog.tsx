'use client';

import { useState } from 'react';
import { useCPRSUI } from '../../../stores/cprs-ui-state';
import { useDataCache } from '../../../stores/data-cache';
import styles from '../cprs.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Add Allergy dialog -- Phase 57 write safety model.
 * POST /vista/cprs/allergies/add with ORWDAL32 SAVE ALLERGY.
 * Falls back to local draft if RPC unavailable.
 */
export default function AddAllergyDialog() {
  const { closeModal, modalData } = useCPRSUI();
  const { addLocalItem } = useDataCache();
  const dfn = String(modalData?.dfn ?? '');

  const [reactant, setReactant] = useState('');
  const [reactions, setReactions] = useState('');
  const [severity, setSeverity] = useState('');
  const [observedHistorical, setObservedHistorical] = useState('h^HISTORICAL');
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'local' | ''>('');

  async function handleSave() {
    if (!reactant.trim()) { setError('Reactant is required'); return; }
    setSaving(true);
    setError('');

    const reactionList = reactions.split(',').map((r) => r.trim()).filter(Boolean);

    try {
      const res = await fetch(`${API_BASE}/vista/cprs/allergies/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': `allergy-${dfn}-${Date.now()}` },
        credentials: 'include',
        body: JSON.stringify({ dfn, reactant, reactions: reactionList, severity, observedHistorical, comments }),
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
    addLocalItem(dfn, 'allergies', {
      id: `draft-${Date.now()}`,
      name: reactant.trim(),
      reactions: reactions || 'Unknown',
      severity: severity || 'Unknown',
    });
    setSyncStatus('local');
    setSuccess(true);
    setTimeout(() => closeModal(), 800);
  }

  if (!dfn) return null;

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && closeModal()}>
      <div className={styles.modalContent} style={{ maxWidth: 520 }}>
        <div className={styles.modalHeader}>
          <span>Add Allergy</span>
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
              {syncStatus === 'synced' ? 'Allergy saved to VistA' : 'Allergy saved as local draft (VistA sync pending)'}
            </div>
          )}

          <div className={styles.formGroup}>
            <label>Reactant/Agent *</label>
            <input className={styles.formInput} value={reactant} onChange={(e) => setReactant(e.target.value)} placeholder="e.g., PENICILLIN" />
          </div>

          <div className={styles.formGroup}>
            <label>Reactions (comma-separated)</label>
            <input className={styles.formInput} value={reactions} onChange={(e) => setReactions(e.target.value)} placeholder="e.g., RASH, HIVES" />
          </div>

          <div className={styles.formGroup}>
            <label>Severity</label>
            <select className={styles.formSelect} value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="">-- Select --</option>
              <option value="1">Mild</option>
              <option value="2">Moderate</option>
              <option value="3">Severe</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Observed / Historical</label>
            <select className={styles.formSelect} value={observedHistorical} onChange={(e) => setObservedHistorical(e.target.value)}>
              <option value="h^HISTORICAL">Historical</option>
              <option value="o^OBSERVED">Observed</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Comments</label>
            <textarea className={styles.formTextarea} rows={3} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Additional comments..." />
          </div>

          <div className={styles.modalFooter}>
            <button className={styles.btn} onClick={closeModal}>Cancel</button>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Allergy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
