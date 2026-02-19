'use client';

import { useState } from 'react';
import { useCPRSUI } from '../../../stores/cprs-ui-state';
import { useDataCache } from '../../../stores/data-cache';
import styles from '../cprs.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/* Quick-order IENs from Phase 8B */
const QUICK_ORDERS = [
  { label: 'Acetaminophen Tab 325mg PO Q4H PRN', ien: 1628 },
  { label: 'Amoxicillin Cap 500mg PO TID', ien: 1634 },
  { label: 'Lisinopril Tab 10mg PO Daily', ien: 1638 },
  { label: 'Metformin Tab 500mg PO BID', ien: 1640 },
  { label: 'Omeprazole Cap 20mg PO Daily', ien: 1644 },
  { label: 'Amlodipine Tab 5mg PO Daily', ien: 1648 },
  { label: 'Atorvastatin Tab 20mg PO QPM', ien: 1652 },
  { label: 'Metoprolol Tab 25mg PO BID', ien: 1656 },
  { label: 'Hydrochlorothiazide Tab 25mg PO Daily', ien: 1658 },
];

export default function AddMedicationDialog() {
  const { closeModal, modalData } = useCPRSUI();
  const { addDraftOrder, addLocalItem } = useDataCache();
  const dfn = String(modalData?.dfn ?? '');

  const [mode, setMode] = useState<'quick' | 'manual'>('quick');
  const [selectedQO, setSelectedQO] = useState<number | null>(null);
  const [manualName, setManualName] = useState('');
  const [manualDose, setManualDose] = useState('');
  const [manualRoute, setManualRoute] = useState('PO');
  const [manualSchedule, setManualSchedule] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleSubmitQuickOrder() {
    if (!selectedQO) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/vista/medications?dfn=${dfn}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ quickOrderIEN: selectedQO }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult({ ok: true, msg: data.order || 'Order placed successfully.' });
        setTimeout(() => closeModal(), 1200);
      } else {
        setResult({ ok: false, msg: data.error || 'Order failed.' });
      }
    } catch (err: unknown) {
      setResult({ ok: false, msg: `Network error: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmitManual() {
    if (!manualName.trim()) return;
    // Save as local draft since manual med ordering requires OERR logic
    addDraftOrder(dfn, {
      id: `draft-${Date.now()}`,
      type: 'med',
      name: `${manualName.trim()} ${manualDose} ${manualRoute} ${manualSchedule}`.trim(),
      status: 'draft',
      details: JSON.stringify({ name: manualName.trim(), dose: manualDose, route: manualRoute, schedule: manualSchedule }),
      createdAt: new Date().toISOString(),
    });
    addLocalItem(dfn, 'medications', {
      id: `draft-med-${Date.now()}`,
      name: manualName.trim(),
      sig: `${manualDose} ${manualRoute} ${manualSchedule}`.trim(),
      status: 'active',
    });
    setResult({ ok: true, msg: 'Saved as local draft order.' });
    setTimeout(() => closeModal(), 800);
  }

  if (!dfn) return null;

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && closeModal()}>
      <div className={styles.modalContent} style={{ maxWidth: 560 }}>
        <div className={styles.modalHeader}>
          <span>Add Medication Order</span>
          <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>&times;</button>
        </div>
        <div className={styles.modalBody}>
          {/* Mode selector */}
          <div className={styles.subTabs}>
            <button className={`${styles.subTab} ${mode === 'quick' ? styles.active : ''}`} onClick={() => setMode('quick')}>Quick Order</button>
            <button className={`${styles.subTab} ${mode === 'manual' ? styles.active : ''}`} onClick={() => setMode('manual')}>Manual Entry</button>
          </div>

          {result && (
            <div style={{ padding: '6px 10px', marginBottom: 8, borderRadius: 4, fontSize: 12,
              background: result.ok ? '#d4edda' : '#f8d7da',
              border: result.ok ? '1px solid #28a745' : '1px solid #dc3545',
              color: result.ok ? '#155724' : '#721c24',
            }}>
              {result.msg}
            </div>
          )}

          {mode === 'quick' && (
            <>
              <p style={{ fontSize: 12, color: 'var(--cprs-text-muted)', margin: '4px 0 8px' }}>
                Select a quick order to place via ORWDX SEND (Phase 8B AUTOACK):
              </p>
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {QUICK_ORDERS.map((qo) => (
                  <div
                    key={qo.ien}
                    onClick={() => setSelectedQO(qo.ien)}
                    style={{
                      padding: '6px 8px', cursor: 'pointer', borderRadius: 3, fontSize: 12, marginBottom: 2,
                      background: selectedQO === qo.ien ? 'var(--cprs-selected)' : undefined,
                      border: selectedQO === qo.ien ? '1px solid var(--cprs-primary)' : '1px solid transparent',
                    }}
                  >
                    {qo.label} <span style={{ color: 'var(--cprs-text-muted)' }}>(IEN {qo.ien})</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {mode === 'manual' && (
            <>
              <p style={{ fontSize: 12, color: 'var(--cprs-text-muted)', margin: '4px 0 8px' }}>
                Manual entry saves as a local draft order (full OERR integration pending).
              </p>
              <div className={styles.formGroup}>
                <label>Medication Name *</label>
                <input className={styles.formInput} value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="e.g. Lisinopril" autoFocus />
              </div>
              <div className={styles.formGroup}>
                <label>Dose</label>
                <input className={styles.formInput} value={manualDose} onChange={(e) => setManualDose(e.target.value)} placeholder="e.g. 10mg" />
              </div>
              <div className={styles.formGroup}>
                <label>Route</label>
                <select className={styles.formSelect} value={manualRoute} onChange={(e) => setManualRoute(e.target.value)}>
                  <option value="PO">PO (Oral)</option>
                  <option value="IV">IV (Intravenous)</option>
                  <option value="IM">IM (Intramuscular)</option>
                  <option value="SQ">SQ (Subcutaneous)</option>
                  <option value="TOP">Topical</option>
                  <option value="INH">Inhaled</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Schedule</label>
                <input className={styles.formInput} value={manualSchedule} onChange={(e) => setManualSchedule(e.target.value)} placeholder="e.g. Daily, BID, TID" />
              </div>
            </>
          )}
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.btn} onClick={closeModal}>Cancel</button>
          {mode === 'quick' ? (
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSubmitQuickOrder} disabled={submitting || !selectedQO}>
              {submitting ? 'Ordering...' : 'Place Quick Order'}
            </button>
          ) : (
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSubmitManual} disabled={!manualName.trim()}>
              Save Draft Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
