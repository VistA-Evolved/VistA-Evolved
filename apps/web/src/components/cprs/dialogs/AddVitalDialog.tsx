'use client';

import { useState } from 'react';
import { useCPRSUI } from '../../../stores/cprs-ui-state';
import { useDataCache, type Vital } from '../../../stores/data-cache';
import { csrfHeaders } from '@/lib/csrf';
import styles from '../cprs.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const VITAL_TYPES = [
  { value: '1', label: 'Temperature' },
  { value: '2', label: 'Pulse' },
  { value: '3', label: 'Respiration' },
  { value: '4', label: 'Blood Pressure' },
  { value: '5', label: 'Height' },
  { value: '8', label: 'Weight' },
  { value: '9', label: 'Pain' },
  { value: '21', label: 'Pulse Oximetry' },
];

/**
 * Add Vital dialog -- Phase 57 write safety model.
 * POST /vista/cprs/vitals/add with GMV ADD VM.
 * Falls back to local draft if RPC unavailable.
 */
export default function AddVitalDialog() {
  const { closeModal, modalData } = useCPRSUI();
  const { addLocalItem } = useDataCache();
  const dfn = String(modalData?.dfn ?? '');

  const [vitalType, setVitalType] = useState('2');
  const [value, setValue] = useState('');
  const [units, setUnits] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'local' | ''>('');

  async function handleSave() {
    if (!value.trim()) { setError('Value is required'); return; }
    setSaving(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/vista/cprs/vitals/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': `vital-${dfn}-${Date.now()}`, ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({ dfn, vitalType, value, units }),
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
    const label = VITAL_TYPES.find(v => v.value === vitalType)?.label ?? 'Vital';
    const draft: Vital = {
      type: label,
      value: value.trim(),
      takenAt: new Date().toISOString().slice(0, 10),
    };
    addLocalItem(dfn, 'vitals', draft);
    setSyncStatus('local');
    setSuccess(true);
    setTimeout(() => closeModal(), 800);
  }

  if (!dfn) return null;

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && closeModal()}>
      <div className={styles.modalContent} style={{ maxWidth: 460 }}>
        <div className={styles.modalHeader}>
          <span>Add Vital Measurement</span>
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
              {syncStatus === 'synced' ? 'Vital saved to VistA' : 'Vital saved as local draft (VistA sync pending)'}
            </div>
          )}

          <div className={styles.formGroup}>
            <label>Vital Type *</label>
            <select className={styles.formSelect} value={vitalType} onChange={(e) => setVitalType(e.target.value)}>
              {VITAL_TYPES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Value *</label>
            <input className={styles.formInput} value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g., 72, 120/80" />
          </div>

          <div className={styles.formGroup}>
            <label>Units</label>
            <input className={styles.formInput} value={units} onChange={(e) => setUnits(e.target.value)} placeholder="e.g., bpm, mmHg" />
          </div>

          <div className={styles.modalFooter}>
            <button className={styles.btn} onClick={closeModal}>Cancel</button>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Vital'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
