'use client';

import { useState, useCallback } from 'react';
import { useCPRSUI } from '../../../stores/cprs-ui-state';
import { useDataCache, type Problem } from '../../../stores/data-cache';
import { csrfHeaders } from '@/lib/csrf';
import styles from '../cprs.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface LexResult { id: string; icd: string; description: string; }

/**
 * Add Problem dialog with live ICD lexicon search (ORQQPL4 LEX).
 * Phase 12F: search box queries /vista/icd-search for real lexicon results.
 * Falls back to local drafts if problem save API is not yet fully wired.
 */
export default function AddProblemDialog() {
  const { closeModal, modalData } = useCPRSUI();
  const { addLocalItem } = useDataCache();
  const dfn = String(modalData?.dfn ?? '');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LexResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedLex, setSelectedLex] = useState<LexResult | null>(null);

  const [description, setDescription] = useState('');
  const [onset, setOnset] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [icdCode, setIcdCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'local' | ''>('');

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`${API_BASE}/vista/icd-search?q=${encodeURIComponent(q.trim())}`, { credentials: 'include' });
      const data = await res.json();
      setSearchResults(data.ok ? (data.results ?? []) : []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      doSearch(searchQuery);
    }
  }

  function handleSelectLex(lex: LexResult) {
    setSelectedLex(lex);
    setDescription(lex.description);
    setIcdCode(lex.icd);
    setSearchResults([]);
  }

  async function handleSave() {
    if (!description.trim()) { setError('Description is required'); return; }
    setSaving(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/vista/cprs/problems/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': `problem-add-${dfn}-${Date.now()}`, ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({ dfn, problemText: description, icdCode, onset, status }),
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
    const draft: Problem = {
      id: `draft-${Date.now()}`,
      text: `${description.trim()}${icdCode ? ` (${icdCode})` : ''}`,
      onset: onset || 'Unknown',
      status,
    };
    addLocalItem(dfn, 'problems', draft);
    setSyncStatus('local');
    setSuccess(true);
    setTimeout(() => closeModal(), 800);
  }

  if (!dfn) return null;

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && closeModal()}>
      <div className={styles.modalContent} style={{ maxWidth: 560 }}>
        <div className={styles.modalHeader}>
          <span>Add Problem</span>
          <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>&times;</button>
        </div>
        <div className={styles.modalBody}>
          {error && <div className={styles.errorText}>{error}</div>}
          {success && (
            <div style={{
              padding: '6px 10px', borderRadius: 4, marginBottom: 8, fontSize: 12,
              background: syncStatus === 'synced' ? '#d4edda' : '#fff3cd',
              border: syncStatus === 'synced' ? '1px solid #28a745' : '1px solid #ffc107',
              color: syncStatus === 'synced' ? '#155724' : '#856404',
            }}>
              {syncStatus === 'synced'
                ? 'Problem saved to VistA (ORQQPL ADD SAVE).'
                : 'Problem saved as local draft (VistA sync pending).'}
            </div>
          )}

          {/* ICD Lexicon Search */}
          <div className={styles.formGroup}>
            <label>Search Lexicon (ORQQPL4 LEX)</label>
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                className={styles.formInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Type diagnosis (e.g. hypertension) and press Enter"
                style={{ flex: 1 }}
              />
              <button className={styles.btn} onClick={() => doSearch(searchQuery)} disabled={searching || searchQuery.trim().length < 2}>
                {searching ? '...' : 'Search'}
              </button>
            </div>
          </div>

          {searchResults.length > 0 && (
            <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--cprs-border)', borderRadius: 4, marginBottom: 8 }}>
              {searchResults.map((r) => (
                <div
                  key={r.id}
                  onClick={() => handleSelectLex(r)}
                  style={{ padding: '4px 8px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid var(--cprs-border)' }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'var(--cprs-selected)'; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.background = ''; }}
                >
                  <strong>{r.icd}</strong> — {r.description}
                </div>
              ))}
            </div>
          )}

          {selectedLex && (
            <div style={{ padding: '4px 8px', background: '#d4edda', borderRadius: 4, marginBottom: 8, fontSize: 12 }}>
              Selected: <strong>{selectedLex.icd}</strong> — {selectedLex.description}
            </div>
          )}

          <div className={styles.formGroup}>
            <label>Problem Description *</label>
            <input className={styles.formInput} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Essential hypertension" />
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
