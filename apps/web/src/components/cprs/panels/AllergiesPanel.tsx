'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDataCache, type Allergy } from '@/stores/data-cache';
import { useCPRSUI } from '@/stores/cprs-ui-state';
import { API_BASE } from '@/lib/api-config';
import { csrfHeaders } from '@/lib/csrf';
import styles from '../cprs.module.css';

interface AllergiesPanelProps {
  dfn: string;
}

type SeverityLevel = 'severe' | 'moderate' | 'mild' | 'unknown';

function classifySeverity(sev: string | undefined): SeverityLevel {
  if (!sev) return 'unknown';
  const s = sev.toLowerCase();
  if (s.includes('severe') || s.includes('critical') || s.includes('life')) return 'severe';
  if (s.includes('moderate')) return 'moderate';
  if (s.includes('mild') || s.includes('minimal')) return 'mild';
  return 'unknown';
}

function SeverityBadge({ severity }: { severity: string }) {
  const level = classifySeverity(severity);
  const cls = level === 'severe' ? styles.severitySevere
    : level === 'moderate' ? styles.severityModerate
      : level === 'mild' ? styles.severityMild
        : styles.severityMild;
  return (
    <span className={`${styles.severityBadge} ${cls}`}>
      {severity || 'Unknown'}
    </span>
  );
}

function formatReactions(reactions: string): string[] {
  if (!reactions) return [];
  return reactions.split(/[,;]/).map(r => r.trim()).filter(Boolean);
}

export default function AllergiesPanel({ dfn }: AllergiesPanelProps) {
  const { fetchDomain, getDomain, getDomainMeta, isLoading } = useDataCache();
  const { openModal } = useCPRSUI();
  const [selected, setSelected] = useState<Allergy | null>(null);
  const [filter, setFilter] = useState<'all' | 'severe' | 'moderate' | 'mild'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ allergen: '', severity: 'Moderate', reactions: '', type: 'Drug' });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const loading = isLoading(dfn, 'allergies');

  useEffect(() => {
    if (dfn) fetchDomain(dfn, 'allergies');
  }, [dfn, fetchDomain]);

  const rawAllergies = (getDomain(dfn, 'allergies') as Allergy[]) ?? [];
  const meta = getDomainMeta(dfn, 'allergies');

  const filteredAllergies = useMemo(() => {
    if (filter === 'all') return rawAllergies;
    return rawAllergies.filter(a => classifySeverity(a.severity) === filter);
  }, [rawAllergies, filter]);

  const severeCounts = useMemo(() => {
    const counts = { severe: 0, moderate: 0, mild: 0, unknown: 0 };
    rawAllergies.forEach(a => {
      const level = classifySeverity(a.severity);
      counts[level]++;
    });
    return counts;
  }, [rawAllergies]);

  const hasSevereAllergies = severeCounts.severe > 0;

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const r = await fetch(`${API_BASE}/vista/allergy-search?q=${encodeURIComponent(query)}`, { credentials: 'include' });
      if (r.ok) {
        const d = await r.json();
        setSearchResults(d.results ?? d.data ?? []);
      }
    } catch { /* search is best-effort */ }
    setSearching(false);
  }, []);

  const handleAddAllergy = useCallback(async () => {
    if (!addForm.allergen.trim()) { setAddError('Allergen name is required'); return; }
    setAddLoading(true);
    setAddError('');
    setAddSuccess('');
    try {
      const r = await fetch(`${API_BASE}/vista/allergies/add`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ dfn, ...addForm }),
      });
      const d = await r.json();
      if (d.ok) {
        setAddSuccess(`Allergy "${addForm.allergen}" added successfully`);
        setAddForm({ allergen: '', severity: 'Moderate', reactions: '', type: 'Drug' });
        setShowAddForm(false);
        fetchDomain(dfn, 'allergies');
      } else {
        setAddError(d.error ?? d.message ?? 'Failed to add allergy');
      }
    } catch (e: any) {
      setAddError(e.message);
    }
    setAddLoading(false);
  }, [addForm, dfn, fetchDomain]);

  const handleRefresh = useCallback(() => {
    fetchDomain(dfn, 'allergies');
  }, [dfn, fetchDomain]);

  return (
    <div className={styles.content} style={{ padding: 16 }}>
      <div className={styles.panelTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>
          Allergies / Adverse Reactions
          {rawAllergies.length > 0 && (
            <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: 'var(--cprs-text-muted)' }}>
              ({rawAllergies.length})
            </span>
          )}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setShowAddForm(!showAddForm)} className={styles.toolbarBtn}
            style={showAddForm ? { background: 'var(--cprs-accent)', color: '#fff' } : {}}>
            {showAddForm ? 'Cancel' : '+ Add Allergy'}
          </button>
          <button onClick={handleRefresh} className={styles.toolbarBtn}>Refresh</button>
        </div>
      </div>

      {/* Allergy alert banner for severe allergies */}
      {hasSevereAllergies && (
        <div className={styles.allergyBanner}>
          <span className={styles.allergyBannerIcon}>⚠</span>
          <span>
            <strong>{severeCounts.severe} SEVERE allerg{severeCounts.severe > 1 ? 'ies' : 'y'}</strong> —
            {rawAllergies.filter(a => classifySeverity(a.severity) === 'severe').map(a => a.allergen).join(', ')}
          </span>
        </div>
      )}

      {addSuccess && (
        <div style={{ padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, marginBottom: 12, fontSize: 12, color: '#166534' }}>
          {addSuccess}
        </div>
      )}

      {meta?.pending && (
        <div className={styles.pendingText}>
          Awaiting VistA configuration — target RPCs: {meta.pendingTargets?.join(', ')}
        </div>
      )}

      {loading && <div className={styles.loadingText}>Loading allergies...</div>}

      {/* Add allergy form */}
      {showAddForm && (
        <div className={styles.sectionCard} style={{ marginBottom: 16 }}>
          <div className={styles.sectionCardHeader}>
            <span>Add New Allergy / Adverse Reaction</span>
          </div>
          <div className={styles.sectionCardBody}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--cprs-text-muted)', display: 'block', marginBottom: 4 }}>
                  Allergen *
                </label>
                <input className={styles.formInput} placeholder="Search allergen..."
                  value={addForm.allergen}
                  onChange={e => { setAddForm({ ...addForm, allergen: e.target.value }); handleSearch(e.target.value); }}
                  style={{ width: '100%' }} />
                {searching && <div style={{ fontSize: 11, color: 'var(--cprs-text-muted)', marginTop: 4 }}>Searching...</div>}
                {searchResults.length > 0 && (
                  <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid var(--cprs-border-light)', borderRadius: 4, marginTop: 4 }}>
                    {searchResults.map((r: any, i: number) => (
                      <div key={i} style={{ padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}
                        onMouseDown={() => {
                          setAddForm({ ...addForm, allergen: r.name ?? r.allergen ?? String(r) });
                          setSearchResults([]);
                        }}>
                        {r.name ?? r.allergen ?? String(r)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--cprs-text-muted)', display: 'block', marginBottom: 4 }}>
                  Type
                </label>
                <select className={styles.formInput} value={addForm.type}
                  onChange={e => setAddForm({ ...addForm, type: e.target.value })}
                  style={{ width: '100%' }}>
                  <option value="Drug">Drug</option>
                  <option value="Food">Food</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--cprs-text-muted)', display: 'block', marginBottom: 4 }}>
                  Severity
                </label>
                <select className={styles.formInput} value={addForm.severity}
                  onChange={e => setAddForm({ ...addForm, severity: e.target.value })}
                  style={{ width: '100%' }}>
                  <option value="Severe">Severe</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Mild">Mild</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--cprs-text-muted)', display: 'block', marginBottom: 4 }}>
                  Reactions (comma-separated)
                </label>
                <input className={styles.formInput} placeholder="e.g. Rash, Hives, Itching"
                  value={addForm.reactions}
                  onChange={e => setAddForm({ ...addForm, reactions: e.target.value })}
                  style={{ width: '100%' }} />
              </div>
            </div>
            {addError && <div className={styles.errorText} style={{ marginTop: 8 }}>{addError}</div>}
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button className={styles.btn} onClick={handleAddAllergy} disabled={addLoading}
                style={{ background: 'var(--cprs-accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px' }}>
                {addLoading ? 'Saving...' : 'Save Allergy'}
              </button>
              <button className={styles.toolbarBtn} onClick={() => setShowAddForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      {!loading && rawAllergies.length > 0 && (
        <div className={styles.dashCardGrid} style={{ marginBottom: 16 }}>
          <div className={styles.dashCard} style={{ cursor: 'pointer', borderColor: filter === 'all' ? 'var(--cprs-accent)' : undefined }}
            onClick={() => setFilter('all')}>
            <div className={styles.dashCardTitle}>Total</div>
            <div className={styles.dashCardCount}>{rawAllergies.length}</div>
          </div>
          <div className={styles.dashCard} style={{ cursor: 'pointer', borderColor: filter === 'severe' ? '#dc2626' : severeCounts.severe > 0 ? '#fecaca' : undefined }}
            onClick={() => setFilter('severe')}>
            <div className={styles.dashCardTitle} style={{ color: '#dc2626' }}>Severe</div>
            <div className={styles.dashCardCount} style={{ color: '#dc2626' }}>{severeCounts.severe}</div>
          </div>
          <div className={styles.dashCard} style={{ cursor: 'pointer', borderColor: filter === 'moderate' ? '#d97706' : undefined }}
            onClick={() => setFilter('moderate')}>
            <div className={styles.dashCardTitle} style={{ color: '#d97706' }}>Moderate</div>
            <div className={styles.dashCardCount} style={{ color: '#d97706' }}>{severeCounts.moderate}</div>
          </div>
          <div className={styles.dashCard} style={{ cursor: 'pointer', borderColor: filter === 'mild' ? 'var(--cprs-success)' : undefined }}
            onClick={() => setFilter('mild')}>
            <div className={styles.dashCardTitle}>Mild</div>
            <div className={styles.dashCardCount} style={{ color: 'var(--cprs-success)' }}>{severeCounts.mild}</div>
          </div>
        </div>
      )}

      {/* Allergy list */}
      {!loading && (
        <div className={styles.splitPane}>
          <div className={styles.splitLeft} style={{ minWidth: 320 }}>
            {filteredAllergies.length === 0 && (
              <div className={styles.emptyText}>
                {rawAllergies.length === 0 ? 'No Known Allergies (NKA)' : `No ${filter} allergies found.`}
              </div>
            )}
            {filteredAllergies.map(a => (
              <div key={a.id}
                className={`${styles.tableRow} ${selected?.id === a.id ? styles.selected : ''}`}
                onClick={() => setSelected(a)}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  borderLeft: classifySeverity(a.severity) === 'severe' ? '3px solid #dc2626' : '3px solid transparent',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--cprs-border-light)',
                }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{a.allergen}</div>
                  {a.reactions && (
                    <div style={{ fontSize: 11, color: 'var(--cprs-text-muted)', marginTop: 2 }}>
                      {a.reactions}
                    </div>
                  )}
                </div>
                <SeverityBadge severity={a.severity} />
              </div>
            ))}
          </div>

          <div className={styles.splitRight} style={{ padding: 16 }}>
            {selected ? (
              <div>
                <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>{selected.allergen}</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div className={styles.dashCard}>
                    <div className={styles.dashCardTitle}>Severity</div>
                    <div style={{ marginTop: 4 }}><SeverityBadge severity={selected.severity} /></div>
                  </div>
                  <div className={styles.dashCard}>
                    <div className={styles.dashCardTitle}>Allergen ID</div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{selected.id}</div>
                  </div>
                </div>

                {selected.reactions && (
                  <div className={styles.sectionCard}>
                    <div className={styles.sectionCardHeader}>
                      <span>Reactions / Signs & Symptoms</span>
                    </div>
                    <div className={styles.sectionCardBody}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {formatReactions(selected.reactions).map((r, i) => (
                          <span key={i} className={`${styles.statusPill} ${styles.statusPending}`}>
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.emptyText}>
                Select an allergy to view details
              </div>
            )}
          </div>
        </div>
      )}

      {rawAllergies.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '32px 16px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--cprs-success)' }}>
            No Known Allergies
          </div>
          <div style={{ fontSize: 12, color: 'var(--cprs-text-muted)', marginTop: 4 }}>
            No allergy or adverse reaction data found for this patient
          </div>
        </div>
      )}

      {meta?.rpcUsed && meta.rpcUsed.length > 0 && (
        <div style={{ marginTop: 16, fontSize: 10, color: 'var(--cprs-text-muted)' }}>
          RPCs: {meta.rpcUsed.join(', ')}
        </div>
      )}
    </div>
  );
}
