'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { API_BASE } from '@/lib/api-config';
import { csrfHeaders } from '@/lib/csrf';
import styles from '../cprs.module.css';

interface EncountersPanelProps {
  dfn: string;
}

interface Encounter {
  id: string;
  date: string;
  location: string;
  serviceCategory: string;
  provider: string;
  status: string;
  diagnoses: Diagnosis[];
  procedures: Procedure[];
  visitType?: string;
}

interface Diagnosis {
  id: string;
  icd10: string;
  description: string;
  rank: 'primary' | 'secondary';
}

interface Procedure {
  id: string;
  cpt: string;
  description: string;
  modifiers: string[];
  quantity: number;
}

interface Immunization {
  id: string;
  vaccine: string;
  cvxCode: string;
  dateGiven: string;
  site: string;
  route: string;
  lot: string;
  manufacturer: string;
  administrator: string;
  series?: string;
  reaction?: string;
}

type ActiveTab = 'visits' | 'encounter' | 'immunizations';

const SERVICE_CATEGORIES = [
  'Ambulatory', 'Hospitalization', 'Emergency', 'Observation',
  'Telehealth', 'Home Health', 'Consult', 'Procedure Visit',
];

const IMM_SITES = [
  'Left Deltoid', 'Right Deltoid', 'Left Thigh', 'Right Thigh',
  'Left Gluteal', 'Right Gluteal', 'Left Forearm', 'Right Forearm',
  'Intranasal', 'Oral', 'Other',
];

const IMM_ROUTES = ['Intramuscular', 'Subcutaneous', 'Intradermal', 'Oral', 'Intranasal', 'Intravenous', 'Other'];

const EMPTY_ENCOUNTER = {
  date: new Date().toISOString().slice(0, 16),
  location: '',
  serviceCategory: 'Ambulatory',
  visitType: '',
};

const EMPTY_PROCEDURE = { cpt: '', description: '', modifiers: '', quantity: 1 };
const EMPTY_DIAGNOSIS = { icd10: '', description: '', rank: 'primary' as const };
const EMPTY_IMMUNIZATION = {
  vaccine: '', cvxCode: '', site: 'Left Deltoid', route: 'Intramuscular',
  lot: '', manufacturer: '', series: '',
};

function encounterStatusColor(status: string): string {
  const s = status.toLowerCase();
  if (s === 'completed' || s === 'signed') return '#16a34a';
  if (s === 'in-progress' || s === 'open') return '#2563eb';
  if (s === 'cancelled') return '#dc2626';
  return 'var(--cprs-text-muted)';
}

export default function EncountersPanel({ dfn }: EncountersPanelProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('visits');

  // Visit history
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [encLoading, setEncLoading] = useState(false);
  const [encError, setEncError] = useState('');
  const [selectedEnc, setSelectedEnc] = useState<Encounter | null>(null);

  // New encounter form
  const [encForm, setEncForm] = useState(EMPTY_ENCOUNTER);
  const [procedures, setProcedures] = useState<typeof EMPTY_PROCEDURE[]>([]);
  const [diagnoses, setDiagnoses] = useState<typeof EMPTY_DIAGNOSIS[]>([{ ...EMPTY_DIAGNOSIS }]);
  const [encSaving, setEncSaving] = useState(false);
  const [encFormError, setEncFormError] = useState('');
  const [encFormSuccess, setEncFormSuccess] = useState('');

  // Immunizations
  const [immunizations, setImmunizations] = useState<Immunization[]>([]);
  const [immLoading, setImmLoading] = useState(false);
  const [immError, setImmError] = useState('');
  const [immForm, setImmForm] = useState(EMPTY_IMMUNIZATION);
  const [showImmForm, setShowImmForm] = useState(false);
  const [immSaving, setImmSaving] = useState(false);
  const [immFormError, setImmFormError] = useState('');
  const [immFormSuccess, setImmFormSuccess] = useState('');
  const [selectedImm, setSelectedImm] = useState<Immunization | null>(null);

  const fetchEncounters = useCallback(async () => {
    setEncLoading(true);
    setEncError('');
    try {
      const r = await fetch(
        `${API_BASE}/vista/encounters/history?dfn=${encodeURIComponent(dfn)}`,
        { credentials: 'include' },
      );
      const d = await r.json();
      if (d.ok) {
        setEncounters(d.data ?? []);
      } else {
        setEncError(d.error ?? 'Failed to load encounter history');
      }
    } catch (e: any) {
      setEncError(e.message ?? 'Network error');
    }
    setEncLoading(false);
  }, [dfn]);

  const fetchImmunizations = useCallback(async () => {
    setImmLoading(true);
    setImmError('');
    try {
      const r = await fetch(
        `${API_BASE}/vista/immunizations/history?dfn=${encodeURIComponent(dfn)}`,
        { credentials: 'include' },
      );
      const d = await r.json();
      if (d.ok) {
        setImmunizations(d.data ?? []);
      } else {
        setImmError(d.error ?? 'Failed to load immunization history');
      }
    } catch (e: any) {
      setImmError(e.message ?? 'Network error');
    }
    setImmLoading(false);
  }, [dfn]);

  useEffect(() => {
    fetchEncounters();
    fetchImmunizations();
  }, [fetchEncounters, fetchImmunizations]);

  const handleSaveEncounter = useCallback(async () => {
    if (!encForm.location.trim()) { setEncFormError('Location is required'); return; }
    if (diagnoses.length === 0 || !diagnoses[0].icd10.trim()) { setEncFormError('At least one diagnosis (ICD-10) is required'); return; }
    setEncSaving(true);
    setEncFormError('');
    setEncFormSuccess('');
    try {
      const r = await fetch(`${API_BASE}/vista/encounters/create`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({
          dfn,
          ...encForm,
          procedures: procedures.filter(p => p.cpt.trim()),
          diagnoses: diagnoses.filter(d => d.icd10.trim()),
        }),
      });
      const d = await r.json();
      if (d.ok) {
        setEncFormSuccess('Encounter created successfully');
        setEncForm(EMPTY_ENCOUNTER);
        setProcedures([]);
        setDiagnoses([{ ...EMPTY_DIAGNOSIS }]);
        fetchEncounters();
      } else {
        setEncFormError(d.error ?? d.message ?? 'Failed to create encounter');
      }
    } catch (e: any) {
      setEncFormError(e.message ?? 'Network error');
    }
    setEncSaving(false);
  }, [encForm, procedures, diagnoses, dfn, fetchEncounters]);

  const handleGiveImmunization = useCallback(async () => {
    if (!immForm.vaccine.trim()) { setImmFormError('Vaccine name is required'); return; }
    if (!immForm.cvxCode.trim()) { setImmFormError('CVX code is required'); return; }
    setImmSaving(true);
    setImmFormError('');
    setImmFormSuccess('');
    try {
      const r = await fetch(`${API_BASE}/vista/immunizations/give`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ dfn, ...immForm }),
      });
      const d = await r.json();
      if (d.ok) {
        setImmFormSuccess(`${immForm.vaccine} administered successfully`);
        setImmForm(EMPTY_IMMUNIZATION);
        setShowImmForm(false);
        fetchImmunizations();
      } else {
        setImmFormError(d.error ?? d.message ?? 'Failed to record immunization');
      }
    } catch (e: any) {
      setImmFormError(e.message ?? 'Network error');
    }
    setImmSaving(false);
  }, [immForm, dfn, fetchImmunizations]);

  const addProcedure = useCallback(() => {
    setProcedures(p => [...p, { ...EMPTY_PROCEDURE }]);
  }, []);

  const updateProcedure = useCallback((idx: number, field: string, value: any) => {
    setProcedures(p => p.map((proc, i) => i === idx ? { ...proc, [field]: value } : proc));
  }, []);

  const removeProcedure = useCallback((idx: number) => {
    setProcedures(p => p.filter((_, i) => i !== idx));
  }, []);

  const addDiagnosis = useCallback(() => {
    setDiagnoses(d => [...d, { ...EMPTY_DIAGNOSIS, rank: 'secondary' }]);
  }, []);

  const updateDiagnosis = useCallback((idx: number, field: string, value: any) => {
    setDiagnoses(d => d.map((diag, i) => i === idx ? { ...diag, [field]: value } : diag));
  }, []);

  const removeDiagnosis = useCallback((idx: number) => {
    setDiagnoses(d => d.filter((_, i) => i !== idx));
  }, []);

  const encounterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    encounters.forEach(e => {
      const cat = e.serviceCategory || 'Other';
      counts[cat] = (counts[cat] ?? 0) + 1;
    });
    return counts;
  }, [encounters]);

  return (
    <div className={styles.content} style={{ padding: 16 }}>
      <div className={styles.panelTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>
          Encounters / Procedures
          {encounters.length > 0 && (
            <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: 'var(--cprs-text-muted)' }}>
              ({encounters.length} visits)
            </span>
          )}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => { fetchEncounters(); fetchImmunizations(); }} className={styles.toolbarBtn}>Refresh</button>
        </div>
      </div>

      <div className={styles.subTabs} style={{ marginBottom: 16 }}>
        <button className={`${styles.subTab} ${activeTab === 'visits' ? styles.active : ''}`} onClick={() => setActiveTab('visits')}>
          Visit History
          {encounters.length > 0 && (
            <span style={{ marginLeft: 6, fontSize: 10, background: 'var(--cprs-accent)', color: '#fff', borderRadius: 8, padding: '1px 6px' }}>
              {encounters.length}
            </span>
          )}
        </button>
        <button className={`${styles.subTab} ${activeTab === 'encounter' ? styles.active : ''}`} onClick={() => setActiveTab('encounter')}>
          New Encounter
        </button>
        <button className={`${styles.subTab} ${activeTab === 'immunizations' ? styles.active : ''}`} onClick={() => setActiveTab('immunizations')}>
          Immunizations
          {immunizations.length > 0 && (
            <span style={{ marginLeft: 6, fontSize: 10, background: '#7c3aed', color: '#fff', borderRadius: 8, padding: '1px 6px' }}>
              {immunizations.length}
            </span>
          )}
        </button>
      </div>

      {/* VISIT HISTORY TAB */}
      {activeTab === 'visits' && (
        <div>
          {encLoading && <div className={styles.loadingText}>Loading encounter history...</div>}
          {encError && <div className={styles.errorText}>{encError}</div>}

          {!encLoading && encounters.length > 0 && (
            <div className={styles.dashCardGrid} style={{ marginBottom: 16 }}>
              <div className={styles.dashCard}>
                <div className={styles.dashCardTitle}>Total Visits</div>
                <div className={styles.dashCardCount}>{encounters.length}</div>
              </div>
              {Object.entries(encounterCounts).slice(0, 3).map(([cat, count]) => (
                <div key={cat} className={styles.dashCard}>
                  <div className={styles.dashCardTitle}>{cat}</div>
                  <div className={styles.dashCardCount}>{count}</div>
                </div>
              ))}
            </div>
          )}

          {!encLoading && (
            <div className={styles.splitPane}>
              <div className={styles.splitLeft} style={{ minWidth: 340 }}>
                {encounters.length === 0 && (
                  <div className={styles.emptyText}>No encounter history found</div>
                )}
                {encounters.map(enc => (
                  <div
                    key={enc.id}
                    className={`${styles.tableRow} ${selectedEnc?.id === enc.id ? styles.selected : ''}`}
                    onClick={() => setSelectedEnc(enc)}
                    style={{
                      padding: '10px 14px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--cprs-border-light)',
                      borderLeft: `3px solid ${encounterStatusColor(enc.status)}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{enc.location}</div>
                        <div style={{ fontSize: 11, color: 'var(--cprs-text-muted)', marginTop: 2 }}>
                          {enc.date} — {enc.serviceCategory}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--cprs-text-muted)', marginTop: 2 }}>
                          {enc.provider}
                          {enc.diagnoses?.length > 0 && ` | ${enc.diagnoses.length} dx`}
                          {enc.procedures?.length > 0 && ` | ${enc.procedures.length} proc`}
                        </div>
                      </div>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                        color: '#fff', background: encounterStatusColor(enc.status), textTransform: 'capitalize',
                      }}>
                        {enc.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.splitRight} style={{ padding: 16 }}>
                {selectedEnc ? (
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>{selectedEnc.location}</h3>
                    <div style={{ fontSize: 12, color: 'var(--cprs-text-muted)', marginBottom: 16 }}>
                      {selectedEnc.date} — {selectedEnc.serviceCategory} — {selectedEnc.provider}
                    </div>

                    {selectedEnc.diagnoses?.length > 0 && (
                      <div className={styles.sectionCard} style={{ marginBottom: 12 }}>
                        <div className={styles.sectionCardHeader}><span>Diagnoses</span></div>
                        <div className={styles.sectionCardBody}>
                          <table style={{ width: '100%', fontSize: 12 }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--cprs-border-light)' }}>
                                <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 600, color: 'var(--cprs-text-muted)', fontSize: 11 }}>ICD-10</th>
                                <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 600, color: 'var(--cprs-text-muted)', fontSize: 11 }}>Description</th>
                                <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 600, color: 'var(--cprs-text-muted)', fontSize: 11 }}>Rank</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedEnc.diagnoses.map((dx, i) => (
                                <tr key={dx.id || i} style={{ borderBottom: '1px solid var(--cprs-border-light)' }}>
                                  <td style={{ padding: '6px 8px', fontWeight: 600, fontFamily: 'monospace' }}>{dx.icd10}</td>
                                  <td style={{ padding: '6px 8px' }}>{dx.description}</td>
                                  <td style={{ padding: '6px 8px' }}>
                                    <span style={{
                                      padding: '1px 6px', borderRadius: 8, fontSize: 10, fontWeight: 600,
                                      background: dx.rank === 'primary' ? '#dbeafe' : '#f3f4f6',
                                      color: dx.rank === 'primary' ? '#1d4ed8' : '#6b7280',
                                    }}>
                                      {dx.rank}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {selectedEnc.procedures?.length > 0 && (
                      <div className={styles.sectionCard}>
                        <div className={styles.sectionCardHeader}><span>Procedures</span></div>
                        <div className={styles.sectionCardBody}>
                          <table style={{ width: '100%', fontSize: 12 }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--cprs-border-light)' }}>
                                <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 600, color: 'var(--cprs-text-muted)', fontSize: 11 }}>CPT</th>
                                <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 600, color: 'var(--cprs-text-muted)', fontSize: 11 }}>Description</th>
                                <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 600, color: 'var(--cprs-text-muted)', fontSize: 11 }}>Modifiers</th>
                                <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 600, color: 'var(--cprs-text-muted)', fontSize: 11 }}>Qty</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedEnc.procedures.map((proc, i) => (
                                <tr key={proc.id || i} style={{ borderBottom: '1px solid var(--cprs-border-light)' }}>
                                  <td style={{ padding: '6px 8px', fontWeight: 600, fontFamily: 'monospace' }}>{proc.cpt}</td>
                                  <td style={{ padding: '6px 8px' }}>{proc.description}</td>
                                  <td style={{ padding: '6px 8px', fontSize: 11 }}>{proc.modifiers?.join(', ') || '—'}</td>
                                  <td style={{ padding: '6px 8px' }}>{proc.quantity}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {!selectedEnc.diagnoses?.length && !selectedEnc.procedures?.length && (
                      <div className={styles.emptyText}>No diagnoses or procedures recorded for this encounter</div>
                    )}
                  </div>
                ) : (
                  <div className={styles.emptyText}>Select a visit to view details</div>
                )}
              </div>
            </div>
          )}

          {!encLoading && encounters.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 16px' }}>
              <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.5 }}>&#x1F4CB;</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--cprs-text-muted)' }}>No Encounter History</div>
              <div style={{ fontSize: 12, color: 'var(--cprs-text-muted)', marginTop: 4 }}>
                No clinical encounters on file for this patient
              </div>
            </div>
          )}
        </div>
      )}

      {/* NEW ENCOUNTER TAB */}
      {activeTab === 'encounter' && (
        <div>
          {encFormSuccess && (
            <div style={{ padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, marginBottom: 12, fontSize: 12, color: '#166534' }}>
              {encFormSuccess}
            </div>
          )}

          <div className={styles.sectionCard}>
            <div className={styles.sectionCardHeader}><span>Visit Information</span></div>
            <div className={styles.sectionCardBody}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--cprs-text-muted)', display: 'block', marginBottom: 4 }}>
                    Date / Time *
                  </label>
                  <input
                    className={styles.formInput}
                    type="datetime-local"
                    value={encForm.date}
                    onChange={e => setEncForm(f => ({ ...f, date: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--cprs-text-muted)', display: 'block', marginBottom: 4 }}>
                    Location *
                  </label>
                  <input
                    className={styles.formInput}
                    placeholder="Clinic or facility name"
                    value={encForm.location}
                    onChange={e => setEncForm(f => ({ ...f, location: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--cprs-text-muted)', display: 'block', marginBottom: 4 }}>
                    Service Category
                  </label>
                  <select
                    className={styles.formSelect}
                    value={encForm.serviceCategory}
                    onChange={e => setEncForm(f => ({ ...f, serviceCategory: e.target.value }))}
                    style={{ width: '100%' }}
                  >
                    {SERVICE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--cprs-text-muted)', display: 'block', marginBottom: 4 }}>
                    Visit Type (optional)
                  </label>
                  <input
                    className={styles.formInput}
                    placeholder="e.g. Follow-up, New Patient"
                    value={encForm.visitType}
                    onChange={e => setEncForm(f => ({ ...f, visitType: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Diagnoses */}
          <div className={styles.sectionCard} style={{ marginTop: 12 }}>
            <div className={styles.sectionCardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Diagnoses (ICD-10) *</span>
              <button className={styles.toolbarBtn} onClick={addDiagnosis} style={{ fontSize: 11 }}>+ Add Diagnosis</button>
            </div>
            <div className={styles.sectionCardBody}>
              {diagnoses.length === 0 && (
                <div className={styles.emptyText}>Add at least one diagnosis</div>
              )}
              {diagnoses.map((dx, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
                  <div style={{ width: 120 }}>
                    <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--cprs-text-muted)', display: 'block', marginBottom: 2 }}>
                      ICD-10 Code
                    </label>
                    <input
                      className={styles.formInput}
                      placeholder="e.g. J06.9"
                      value={dx.icd10}
                      onChange={e => updateDiagnosis(i, 'icd10', e.target.value)}
                      style={{ width: '100%', fontFamily: 'monospace' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--cprs-text-muted)', display: 'block', marginBottom: 2 }}>
                      Description
                    </label>
                    <input
                      className={styles.formInput}
                      placeholder="Diagnosis description"
                      value={dx.description}
                      onChange={e => updateDiagnosis(i, 'description', e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ width: 110 }}>
                    <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--cprs-text-muted)', display: 'block', marginBottom: 2 }}>
                      Rank
                    </label>
                    <select
                      className={styles.formSelect}
                      value={dx.rank}
                      onChange={e => updateDiagnosis(i, 'rank', e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="primary">Primary</option>
                      <option value="secondary">Secondary</option>
                    </select>
                  </div>
                  <button
                    className={styles.toolbarBtn}
                    onClick={() => removeDiagnosis(i)}
                    style={{ color: '#dc2626', padding: '4px 8px', fontSize: 11, flexShrink: 0 }}
                    title="Remove diagnosis"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Procedures */}
          <div className={styles.sectionCard} style={{ marginTop: 12 }}>
            <div className={styles.sectionCardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Procedures (CPT)</span>
              <button className={styles.toolbarBtn} onClick={addProcedure} style={{ fontSize: 11 }}>+ Add Procedure</button>
            </div>
            <div className={styles.sectionCardBody}>
              {procedures.length === 0 && (
                <div className={styles.emptyText} style={{ fontSize: 11 }}>No procedures added (optional)</div>
              )}
              {procedures.map((proc, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
                  <div style={{ width: 100 }}>
                    <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--cprs-text-muted)', display: 'block', marginBottom: 2 }}>
                      CPT Code
                    </label>
                    <input
                      className={styles.formInput}
                      placeholder="99213"
                      value={proc.cpt}
                      onChange={e => updateProcedure(i, 'cpt', e.target.value)}
                      style={{ width: '100%', fontFamily: 'monospace' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--cprs-text-muted)', display: 'block', marginBottom: 2 }}>
                      Description
                    </label>
                    <input
                      className={styles.formInput}
                      placeholder="Procedure description"
                      value={proc.description}
                      onChange={e => updateProcedure(i, 'description', e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ width: 100 }}>
                    <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--cprs-text-muted)', display: 'block', marginBottom: 2 }}>
                      Modifiers
                    </label>
                    <input
                      className={styles.formInput}
                      placeholder="25, 59"
                      value={proc.modifiers}
                      onChange={e => updateProcedure(i, 'modifiers', e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ width: 60 }}>
                    <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--cprs-text-muted)', display: 'block', marginBottom: 2 }}>
                      Qty
                    </label>
                    <input
                      className={styles.formInput}
                      type="number"
                      min={1}
                      value={proc.quantity}
                      onChange={e => updateProcedure(i, 'quantity', parseInt(e.target.value) || 1)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <button
                    className={styles.toolbarBtn}
                    onClick={() => removeProcedure(i)}
                    style={{ color: '#dc2626', padding: '4px 8px', fontSize: 11, flexShrink: 0 }}
                    title="Remove procedure"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {encFormError && <div className={styles.errorText} style={{ marginTop: 8 }}>{encFormError}</div>}

          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button
              className={styles.btn}
              onClick={handleSaveEncounter}
              disabled={encSaving}
              style={{ background: 'var(--cprs-accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 20px', fontWeight: 600 }}
            >
              {encSaving ? 'Saving...' : 'Save Encounter'}
            </button>
            <button
              className={styles.toolbarBtn}
              onClick={() => {
                setEncForm(EMPTY_ENCOUNTER);
                setProcedures([]);
                setDiagnoses([{ ...EMPTY_DIAGNOSIS }]);
                setEncFormError('');
              }}
            >
              Clear Form
            </button>
          </div>
        </div>
      )}

      {/* IMMUNIZATIONS TAB */}
      {activeTab === 'immunizations' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button
              onClick={() => setShowImmForm(!showImmForm)}
              className={styles.toolbarBtn}
              style={showImmForm ? { background: 'var(--cprs-accent)', color: '#fff' } : {}}
            >
              {showImmForm ? 'Cancel' : '+ Administer Immunization'}
            </button>
          </div>

          {immFormSuccess && (
            <div style={{ padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, marginBottom: 12, fontSize: 12, color: '#166534' }}>
              {immFormSuccess}
            </div>
          )}

          {showImmForm && (
            <div className={styles.sectionCard} style={{ marginBottom: 16 }}>
              <div className={styles.sectionCardHeader}><span>Administer Immunization</span></div>
              <div className={styles.sectionCardBody}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--cprs-text-muted)', display: 'block', marginBottom: 4 }}>
                      Vaccine Name *
                    </label>
                    <input
                      className={styles.formInput}
                      placeholder="e.g. Influenza, Tdap, COVID-19"
                      value={immForm.vaccine}
                      onChange={e => setImmForm(f => ({ ...f, vaccine: e.target.value }))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--cprs-text-muted)', display: 'block', marginBottom: 4 }}>
                      CVX Code *
                    </label>
                    <input
                      className={styles.formInput}
                      placeholder="e.g. 141, 115, 213"
                      value={immForm.cvxCode}
                      onChange={e => setImmForm(f => ({ ...f, cvxCode: e.target.value }))}
                      style={{ width: '100%', fontFamily: 'monospace' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--cprs-text-muted)', display: 'block', marginBottom: 4 }}>
                      Site
                    </label>
                    <select
                      className={styles.formSelect}
                      value={immForm.site}
                      onChange={e => setImmForm(f => ({ ...f, site: e.target.value }))}
                      style={{ width: '100%' }}
                    >
                      {IMM_SITES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--cprs-text-muted)', display: 'block', marginBottom: 4 }}>
                      Route
                    </label>
                    <select
                      className={styles.formSelect}
                      value={immForm.route}
                      onChange={e => setImmForm(f => ({ ...f, route: e.target.value }))}
                      style={{ width: '100%' }}
                    >
                      {IMM_ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--cprs-text-muted)', display: 'block', marginBottom: 4 }}>
                      Lot Number
                    </label>
                    <input
                      className={styles.formInput}
                      placeholder="Lot #"
                      value={immForm.lot}
                      onChange={e => setImmForm(f => ({ ...f, lot: e.target.value }))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--cprs-text-muted)', display: 'block', marginBottom: 4 }}>
                      Manufacturer
                    </label>
                    <input
                      className={styles.formInput}
                      placeholder="Manufacturer name"
                      value={immForm.manufacturer}
                      onChange={e => setImmForm(f => ({ ...f, manufacturer: e.target.value }))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--cprs-text-muted)', display: 'block', marginBottom: 4 }}>
                      Series (optional)
                    </label>
                    <input
                      className={styles.formInput}
                      placeholder="e.g. Dose 1 of 2"
                      value={immForm.series}
                      onChange={e => setImmForm(f => ({ ...f, series: e.target.value }))}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {immFormError && <div className={styles.errorText} style={{ marginTop: 8 }}>{immFormError}</div>}

                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <button
                    className={styles.btn}
                    onClick={handleGiveImmunization}
                    disabled={immSaving}
                    style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', fontWeight: 600 }}
                  >
                    {immSaving ? 'Recording...' : 'Record Administration'}
                  </button>
                  <button className={styles.toolbarBtn} onClick={() => setShowImmForm(false)}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {immLoading && <div className={styles.loadingText}>Loading immunization history...</div>}
          {immError && <div className={styles.errorText}>{immError}</div>}

          {!immLoading && (
            <div className={styles.splitPane}>
              <div className={styles.splitLeft} style={{ minWidth: 320 }}>
                {immunizations.length === 0 && (
                  <div className={styles.emptyText}>No immunization history found</div>
                )}
                {immunizations.map(imm => (
                  <div
                    key={imm.id}
                    className={`${styles.tableRow} ${selectedImm?.id === imm.id ? styles.selected : ''}`}
                    onClick={() => setSelectedImm(imm)}
                    style={{
                      padding: '10px 14px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--cprs-border-light)',
                      borderLeft: '3px solid #7c3aed',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{imm.vaccine}</div>
                        <div style={{ fontSize: 11, color: 'var(--cprs-text-muted)', marginTop: 2 }}>
                          {imm.dateGiven} — {imm.site}
                        </div>
                        {imm.series && <div style={{ fontSize: 10, color: 'var(--cprs-text-muted)' }}>{imm.series}</div>}
                      </div>
                      <span style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 8, fontWeight: 500,
                        background: '#ede9fe', color: '#6d28d9', fontFamily: 'monospace',
                      }}>
                        CVX {imm.cvxCode}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.splitRight} style={{ padding: 16 }}>
                {selectedImm ? (
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>{selectedImm.vaccine}</h3>
                    <div style={{ fontSize: 12, color: 'var(--cprs-text-muted)', marginBottom: 16 }}>
                      CVX: {selectedImm.cvxCode} {selectedImm.series && `| ${selectedImm.series}`}
                    </div>

                    <div className={styles.sectionCard}>
                      <div className={styles.sectionCardHeader}><span>Administration Details</span></div>
                      <div className={styles.sectionCardBody}>
                        <table style={{ width: '100%', fontSize: 12 }}>
                          <tbody>
                            <tr><td style={{ fontWeight: 600, padding: '4px 8px 4px 0', color: 'var(--cprs-text-muted)', width: 120 }}>Date Given</td><td style={{ padding: '4px 0' }}>{selectedImm.dateGiven}</td></tr>
                            <tr><td style={{ fontWeight: 600, padding: '4px 8px 4px 0', color: 'var(--cprs-text-muted)' }}>Site</td><td style={{ padding: '4px 0' }}>{selectedImm.site}</td></tr>
                            <tr><td style={{ fontWeight: 600, padding: '4px 8px 4px 0', color: 'var(--cprs-text-muted)' }}>Route</td><td style={{ padding: '4px 0' }}>{selectedImm.route}</td></tr>
                            {selectedImm.lot && <tr><td style={{ fontWeight: 600, padding: '4px 8px 4px 0', color: 'var(--cprs-text-muted)' }}>Lot #</td><td style={{ padding: '4px 0' }}>{selectedImm.lot}</td></tr>}
                            {selectedImm.manufacturer && <tr><td style={{ fontWeight: 600, padding: '4px 8px 4px 0', color: 'var(--cprs-text-muted)' }}>Manufacturer</td><td style={{ padding: '4px 0' }}>{selectedImm.manufacturer}</td></tr>}
                            <tr><td style={{ fontWeight: 600, padding: '4px 8px 4px 0', color: 'var(--cprs-text-muted)' }}>Administrator</td><td style={{ padding: '4px 0' }}>{selectedImm.administrator}</td></tr>
                            {selectedImm.reaction && <tr><td style={{ fontWeight: 600, padding: '4px 8px 4px 0', color: 'var(--cprs-text-muted)' }}>Reaction</td><td style={{ padding: '4px 0', color: '#dc2626' }}>{selectedImm.reaction}</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyText}>Select an immunization to view details</div>
                )}
              </div>
            </div>
          )}

          {!immLoading && immunizations.length === 0 && !showImmForm && (
            <div style={{ textAlign: 'center', padding: '40px 16px' }}>
              <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.5 }}>&#x1F489;</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--cprs-text-muted)' }}>No Immunization History</div>
              <div style={{ fontSize: 12, color: 'var(--cprs-text-muted)', marginTop: 4 }}>
                No immunization records found for this patient
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
