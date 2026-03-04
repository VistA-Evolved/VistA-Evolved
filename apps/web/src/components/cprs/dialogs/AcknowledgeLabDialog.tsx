'use client';

import { useState } from 'react';
import { useCPRSUI } from '../../../stores/cprs-ui-state';
import { csrfHeaders } from '@/lib/csrf';
import styles from '../cprs.module.css';
import { API_BASE } from '@/lib/api-config';

/**
 * Acknowledge Lab Results dialog -- Phase 57 write safety model.
 * POST /vista/cprs/labs/ack with ORWLRR ACK.
 * Falls back to server-side draft if RPC unavailable.
 */
export default function AcknowledgeLabDialog() {
  const { closeModal, modalData } = useCPRSUI();
  const dfn = String(modalData?.dfn ?? '');
  const rawLabIds = modalData?.labIds;
  const labIds: string[] = Array.isArray(rawLabIds) ? rawLabIds : [];

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'local' | ''>('');

  async function handleAcknowledge() {
    if (!labIds.length) {
      setError('No lab results selected for acknowledgement');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/vista/cprs/labs/ack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `lab-ack-${dfn}-${Date.now()}`,
          ...csrfHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({ dfn, labIds }),
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
      setError('Acknowledgement failed');
    } catch {
      setError('Network error -- please try again');
    } finally {
      setSaving(false);
    }
  }

  if (!dfn) return null;

  return (
    <div
      className={styles.modalOverlay}
      onClick={(e) => e.target === e.currentTarget && closeModal()}
    >
      <div className={styles.modalContent} style={{ maxWidth: 440 }}>
        <div className={styles.modalHeader}>
          <span>Acknowledge Lab Results</span>
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
                padding: '6px 10px',
                borderRadius: 4,
                marginBottom: 8,
                fontSize: 12,
                background: syncStatus === 'synced' ? '#d4edda' : '#fff3cd',
                border: syncStatus === 'synced' ? '1px solid #28a745' : '1px solid #ffc107',
              }}
            >
              {syncStatus === 'synced'
                ? `${labIds.length} lab result(s) acknowledged in VistA`
                : `${labIds.length} acknowledgement(s) stored locally (VistA sync pending)`}
            </div>
          )}

          <p style={{ fontSize: 13, marginBottom: 12 }}>
            Acknowledge <strong>{labIds.length}</strong> lab result(s) for patient DFN {dfn}?
          </p>

          {labIds.length > 0 && (
            <ul style={{ fontSize: 12, margin: '8px 0', paddingLeft: 20 }}>
              {labIds.slice(0, 10).map((id) => (
                <li key={id}>Lab ID: {id}</li>
              ))}
              {labIds.length > 10 && <li>...and {labIds.length - 10} more</li>}
            </ul>
          )}

          <div className={styles.modalFooter}>
            <button className={styles.btn} onClick={closeModal}>
              Cancel
            </button>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={handleAcknowledge}
              disabled={saving}
            >
              {saving ? 'Acknowledging...' : 'Acknowledge'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
