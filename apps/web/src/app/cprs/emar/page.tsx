'use client';

/**
 * Phase 85 — eMAR + BCMA Posture
 *
 * Standalone eMAR page with patient context and 4 tabs:
 *  1) Schedule — Active medication schedule from ORWPS ACTIVE (real VistA)
 *  2) Allergies — Allergy warnings from ORQQAL LIST (real VistA)
 *  3) Administration — Record med admin (integration-pending → PSB MED LOG)
 *  4) BCMA Scanner — Barcode medication verification (integration-pending → PSJBCMA)
 *
 * VistA-sourced: ORWPS ACTIVE, ORQQAL LIST, ORWORR GETTXT.
 * BCMA write paths: integration-pending with named PSB/PSJ targets.
 * Heuristic duplicate therapy detection labeled as such.
 */

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { csrfHeaders } from '@/lib/csrf';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...opts,
    headers: { ...csrfHeaders(), ...(opts?.headers || {}) },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

type Tab = 'schedule' | 'allergies' | 'admin' | 'bcma';

interface ScheduleEntry {
  orderIEN: string;
  rxId: string;
  drugName: string;
  type: string;
  status: string;
  sig: string;
  route: string;
  schedule: string;
  isPRN: boolean;
  frequency: string;
  nextDue: string | null;
}

interface AllergyEntry {
  id: string;
  allergen: string;
  severity: string;
  reactions: string[];
}

interface InteractionWarning {
  allergen: string;
  severity: string;
  note: string;
}

interface DuplicateAlert {
  drugA: string;
  drugB: string;
  orderA: string;
  orderB: string;
  reason: string;
}

interface PendingTarget {
  rpc: string;
  package: string;
  reason: string;
}

/* ------------------------------------------------------------------ */
/* Styles                                                               */
/* ------------------------------------------------------------------ */

const colors = {
  bg: '#f5f5f5', surface: '#ffffff', border: '#ddd',
  headerBg: '#1a365d', headerText: '#ffffff',
  primary: '#2b6cb0', accent: '#3182ce',
  success: '#38a169', warning: '#d69e2e', danger: '#e53e3e',
  text: '#1a202c', textMuted: '#718096',
  pendingBg: '#fffbeb', pendingBorder: '#f6e05e',
  heuristicBg: '#ebf8ff', heuristicBorder: '#90cdf4',
  allergyBg: '#fff5f5', allergyBorder: '#fc8181',
  prnBg: '#f0fff4', scheduledBg: '#ebf8ff',
};

/* ------------------------------------------------------------------ */
/* Sub-components                                                       */
/* ------------------------------------------------------------------ */

function IntegrationPendingBanner({ targets, context }: { targets: PendingTarget[]; context?: string }) {
  return (
    <div style={{
      background: colors.pendingBg, border: `1px solid ${colors.pendingBorder}`,
      borderRadius: 6, padding: '12px 16px', margin: '12px 0',
    }}>
      <div style={{ fontWeight: 600, color: '#975a16', marginBottom: 4 }}>
        Integration Pending{context ? ` — ${context}` : ''}
      </div>
      <div style={{ fontSize: 13, color: '#744210', marginBottom: 8 }}>
        This feature requires VistA packages not available in the WorldVistA Docker sandbox.
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {targets.map((t, i) => (
          <span key={i} style={{
            background: '#fefcbf', border: '1px solid #ecc94b', borderRadius: 4,
            padding: '2px 8px', fontSize: 12, fontFamily: 'monospace',
          }}>
            {t.rpc} ({t.package})
          </span>
        ))}
      </div>
    </div>
  );
}

function HeuristicDisclaimer({ text }: { text: string }) {
  return (
    <div style={{
      background: colors.heuristicBg, border: `1px solid ${colors.heuristicBorder}`,
      borderRadius: 6, padding: '10px 14px', margin: '12px 0', fontSize: 13,
    }}>
      <strong style={{ color: '#2b6cb0' }}>⚕ Heuristic Alert:</strong>{' '}
      <span style={{ color: '#2a4365' }}>{text}</span>
    </div>
  );
}

function AllergyBanner({ warnings }: { warnings: InteractionWarning[] }) {
  if (warnings.length === 0) return null;
  return (
    <div style={{
      background: colors.allergyBg, border: `2px solid ${colors.allergyBorder}`,
      borderRadius: 6, padding: '12px 16px', margin: '12px 0',
    }}>
      <div style={{ fontWeight: 700, color: '#c53030', marginBottom: 6, fontSize: 15 }}>
        Allergy Warnings
      </div>
      {warnings.map((w, i) => (
        <div key={i} style={{ fontSize: 13, color: '#742a2a', marginBottom: 4 }}>
          <strong>{w.allergen}</strong> (Severity: {w.severity}) — {w.note}
        </div>
      ))}
    </div>
  );
}

function DuplicateTherapyBanner({ duplicates }: { duplicates: DuplicateAlert[] }) {
  if (duplicates.length === 0) return null;
  return (
    <div style={{
      background: colors.heuristicBg, border: `2px solid ${colors.heuristicBorder}`,
      borderRadius: 6, padding: '12px 16px', margin: '12px 0',
    }}>
      <div style={{ fontWeight: 700, color: '#2b6cb0', marginBottom: 6, fontSize: 15 }}>
        Potential Duplicate Therapy (Heuristic)
      </div>
      <div style={{ fontSize: 12, color: '#4a5568', marginBottom: 8, fontStyle: 'italic' }}>
        This is a name-based heuristic check — NOT a clinical decision support engine. Always verify with pharmacy.
      </div>
      {duplicates.map((d, i) => (
        <div key={i} style={{ fontSize: 13, color: '#2a4365', marginBottom: 4 }}>
          <strong>{d.drugA}</strong> + <strong>{d.drugB}</strong> — {d.reason}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Schedule Tab                                                         */
/* ------------------------------------------------------------------ */

function ScheduleTab({ dfn }: { dfn: string }) {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateAlert[]>([]);
  const [pendingTargets, setPendingTargets] = useState<PendingTarget[]>([]);
  const [heuristicWarning, setHeuristicWarning] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!dfn) return;
    setLoading(true);
    setError('');

    Promise.allSettled([
      apiFetch(`/emar/schedule?dfn=${dfn}`),
      apiFetch(`/emar/duplicate-check?dfn=${dfn}`),
    ]).then(([schedResult, dupResult]) => {
      if (schedResult.status === 'fulfilled' && schedResult.value.ok) {
        setSchedule(schedResult.value.schedule || []);
        setPendingTargets(schedResult.value.pendingTargets || []);
        setHeuristicWarning(schedResult.value._heuristicWarning || '');
      } else if (schedResult.status === 'fulfilled' && !schedResult.value.ok) {
        setError(schedResult.value.error || 'Failed to load schedule');
      } else {
        setError('Failed to load medication schedule');
      }

      if (dupResult.status === 'fulfilled' && dupResult.value.ok) {
        setDuplicates(dupResult.value.duplicates || []);
      }
    }).finally(() => setLoading(false));
  }, [dfn]);

  if (loading) return <div style={{ padding: 20, color: colors.textMuted }}>Loading medication schedule...</div>;
  if (error) return <div style={{ padding: 20, color: colors.danger }}>{error}</div>;

  const scheduledMeds = schedule.filter(m => !m.isPRN);
  const prnMeds = schedule.filter(m => m.isPRN);

  return (
    <div>
      {heuristicWarning && (
        <HeuristicDisclaimer text={heuristicWarning} />
      )}
      <DuplicateTherapyBanner duplicates={duplicates} />
      {pendingTargets.length > 0 && (
        <IntegrationPendingBanner targets={pendingTargets} context="Real-time due times require BCMA" />
      )}

      {/* Scheduled Medications */}
      <div style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: colors.text, margin: '0 0 8px 0' }}>
          Scheduled Medications ({scheduledMeds.length})
        </h3>
        {scheduledMeds.length === 0 ? (
          <div style={{ color: colors.textMuted, fontSize: 13, padding: '12px 0' }}>
            No scheduled medications found for this patient.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#edf2f7', borderBottom: `2px solid ${colors.border}` }}>
                  <th style={{ textAlign: 'left', padding: '8px 10px' }}>Medication</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px' }}>Sig</th>
                  <th style={{ textAlign: 'center', padding: '8px 10px' }}>Route</th>
                  <th style={{ textAlign: 'center', padding: '8px 10px' }}>Schedule</th>
                  <th style={{ textAlign: 'center', padding: '8px 10px' }}>Frequency</th>
                  <th style={{ textAlign: 'center', padding: '8px 10px' }}>Status</th>
                  <th style={{ textAlign: 'center', padding: '8px 10px' }}>Next Due</th>
                </tr>
              </thead>
              <tbody>
                {scheduledMeds.map((med, i) => (
                  <tr key={med.orderIEN || i} style={{
                    borderBottom: `1px solid ${colors.border}`,
                    background: i % 2 === 0 ? colors.surface : '#f8fafc',
                  }}>
                    <td style={{ padding: '8px 10px', fontWeight: 500 }}>
                      {med.drugName}
                      <div style={{ fontSize: 11, color: colors.textMuted }}>
                        {med.type} | Order: {med.orderIEN}
                      </div>
                    </td>
                    <td style={{ padding: '8px 10px', maxWidth: 200, wordBreak: 'break-word' }}>
                      {med.sig || '—'}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{
                        background: '#e2e8f0', borderRadius: 4, padding: '2px 6px',
                        fontSize: 12, fontFamily: 'monospace',
                      }}>
                        {med.route}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'monospace', fontSize: 12 }}>
                      {med.schedule}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: 12 }}>
                      {med.frequency}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{
                        background: med.status === 'active' ? '#c6f6d5' : '#e2e8f0',
                        color: med.status === 'active' ? '#22543d' : '#4a5568',
                        borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                      }}>
                        {med.status}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: 12 }}>
                      {med.nextDue || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PRN Medications */}
      <div style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: colors.text, margin: '0 0 8px 0' }}>
          PRN (As Needed) Medications ({prnMeds.length})
        </h3>
        {prnMeds.length === 0 ? (
          <div style={{ color: colors.textMuted, fontSize: 13, padding: '12px 0' }}>
            No PRN medications found.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
            {prnMeds.map((med, i) => (
              <div key={med.orderIEN || i} style={{
                background: colors.prnBg, border: '1px solid #c6f6d5',
                borderRadius: 6, padding: 12,
              }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{med.drugName}</div>
                <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  {med.route} | {med.sig || 'See order'}
                </div>
                <div style={{ fontSize: 12, color: '#38a169', marginTop: 4 }}>
                  PRN — {med.frequency}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Allergies Tab                                                        */
/* ------------------------------------------------------------------ */

function AllergiesTab({ dfn }: { dfn: string }) {
  const [allergies, setAllergies] = useState<AllergyEntry[]>([]);
  const [warnings, setWarnings] = useState<InteractionWarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!dfn) return;
    setLoading(true);
    setError('');

    apiFetch(`/emar/allergies?dfn=${dfn}`)
      .then(data => {
        if (data.ok) {
          setAllergies(data.allergies || []);
          setWarnings(data.interactionWarnings || []);
        } else {
          setError(data.error || 'Failed to load allergies');
        }
      })
      .catch(() => setError('Failed to load allergy data'))
      .finally(() => setLoading(false));
  }, [dfn]);

  if (loading) return <div style={{ padding: 20, color: colors.textMuted }}>Loading allergy data...</div>;
  if (error) return <div style={{ padding: 20, color: colors.danger }}>{error}</div>;

  return (
    <div>
      <AllergyBanner warnings={warnings} />

      <h3 style={{ fontSize: 15, fontWeight: 600, color: colors.text, margin: '12px 0 8px 0' }}>
        Documented Allergies ({allergies.length})
      </h3>

      {allergies.length === 0 ? (
        <div style={{
          background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: 6,
          padding: 16, color: '#22543d', fontSize: 14,
        }}>
          No Known Allergies (NKA)
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#edf2f7', borderBottom: `2px solid ${colors.border}` }}>
              <th style={{ textAlign: 'left', padding: '8px 10px' }}>Allergen</th>
              <th style={{ textAlign: 'center', padding: '8px 10px' }}>Severity</th>
              <th style={{ textAlign: 'left', padding: '8px 10px' }}>Reactions</th>
            </tr>
          </thead>
          <tbody>
            {allergies.map((a, i) => (
              <tr key={a.id} style={{
                borderBottom: `1px solid ${colors.border}`,
                background: a.severity?.toUpperCase() === 'SEVERE' ? '#fff5f5' :
                            i % 2 === 0 ? colors.surface : '#f8fafc',
              }}>
                <td style={{ padding: '8px 10px', fontWeight: 500 }}>{a.allergen}</td>
                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                  <span style={{
                    background: a.severity?.toUpperCase() === 'SEVERE' ? '#fed7d7' :
                                a.severity?.toUpperCase() === 'MODERATE' ? '#fefcbf' : '#e2e8f0',
                    color: a.severity?.toUpperCase() === 'SEVERE' ? '#c53030' :
                           a.severity?.toUpperCase() === 'MODERATE' ? '#975a16' : '#4a5568',
                    borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                  }}>
                    {a.severity || 'unknown'}
                  </span>
                </td>
                <td style={{ padding: '8px 10px', fontSize: 12 }}>
                  {a.reactions.length > 0 ? a.reactions.join(', ') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{
        marginTop: 16, fontSize: 12, color: colors.textMuted, padding: '8px 0',
        borderTop: `1px solid ${colors.border}`,
      }}>
        Source: VistA ORQQAL LIST RPC (real patient data). Drug-allergy interaction checking at
        scan time requires BCMA PSB ALLERGY RPC (integration-pending).
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Administration Tab (integration-pending)                             */
/* ------------------------------------------------------------------ */

function AdminTab({ dfn }: { dfn: string }) {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [selectedMed, setSelectedMed] = useState<ScheduleEntry | null>(null);
  const [adminAction, setAdminAction] = useState<'given' | 'held' | 'refused' | 'unavailable'>('given');
  const [adminReason, setAdminReason] = useState('');
  const [adminResult, setAdminResult] = useState<{ ok: boolean; status?: string; message?: string; error?: string } | null>(null);

  useEffect(() => {
    if (!dfn) return;
    setLoading(true);
    setFetchError('');
    // Reset selection state on DFN change
    setSelectedMed(null);
    setAdminAction('given');
    setAdminReason('');
    setAdminResult(null);
    apiFetch(`/emar/schedule?dfn=${dfn}`)
      .then(data => {
        if (data.ok) setSchedule(data.schedule || []);
        else setFetchError(data.error || 'Failed to load medications');
      })
      .catch(() => setFetchError('Failed to load medication schedule'))
      .finally(() => setLoading(false));
  }, [dfn]);

  const handleAdminister = useCallback(async () => {
    if (!selectedMed) return;
    try {
      const result = await apiFetch('/emar/administer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dfn,
          orderIEN: selectedMed.orderIEN,
          action: adminAction,
          reason: adminReason,
        }),
      });
      setAdminResult(result);
    } catch {
      setAdminResult({ ok: false, error: 'Failed to record administration' });
    }
  }, [dfn, selectedMed, adminAction, adminReason]);

  if (loading) return <div style={{ padding: 20, color: colors.textMuted }}>Loading medications...</div>;
  if (fetchError) return <div style={{ padding: 20, color: colors.danger }}>{fetchError}</div>;

  return (
    <div>
      <IntegrationPendingBanner
        targets={[
          { rpc: 'PSB MED LOG', package: 'PSB', reason: 'Write administration record to BCMA Medication Log (file 53.79)' },
        ]}
        context="Medication administration recording"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
        {/* Left: Med selection list */}
        <div>
          <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px 0' }}>Select Medication</h4>
          <div style={{ maxHeight: 400, overflowY: 'auto', border: `1px solid ${colors.border}`, borderRadius: 6 }} role="listbox" aria-label="Active medications">
            {schedule.length === 0 ? (
              <div style={{ padding: 16, color: colors.textMuted, fontSize: 13 }}>No active medications.</div>
            ) : schedule.map((med, i) => (
              <div
                key={med.orderIEN || i}
                role="option"
                tabIndex={0}
                aria-selected={selectedMed?.orderIEN === med.orderIEN}
                onClick={() => { setSelectedMed(med); setAdminResult(null); }}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedMed(med); setAdminResult(null); } }}
                style={{
                  padding: '10px 12px', cursor: 'pointer',
                  borderBottom: `1px solid ${colors.border}`,
                  background: selectedMed?.orderIEN === med.orderIEN ? '#ebf8ff' : colors.surface,
                }}
              >
                <div style={{ fontWeight: 500, fontSize: 13 }}>{med.drugName}</div>
                <div style={{ fontSize: 11, color: colors.textMuted }}>
                  {med.route} | {med.schedule} | {med.isPRN ? 'PRN' : 'Scheduled'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Admin form */}
        <div>
          <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px 0' }}>Record Administration</h4>
          {!selectedMed ? (
            <div style={{ padding: 16, color: colors.textMuted, fontSize: 13, background: '#f7fafc', borderRadius: 6 }}>
              Select a medication from the list to record administration.
            </div>
          ) : (
            <div style={{ background: '#f7fafc', border: `1px solid ${colors.border}`, borderRadius: 6, padding: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
                {selectedMed.drugName}
              </div>
              <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>
                {selectedMed.sig || 'No sig available'} | Route: {selectedMed.route}
              </div>

              <label htmlFor="admin-action" style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Action:</label>
              <select
                id="admin-action"
                value={adminAction}
                onChange={e => setAdminAction(e.target.value as typeof adminAction)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: `1px solid ${colors.border}`, marginBottom: 12 }}
              >
                <option value="given">Given</option>
                <option value="held">Held</option>
                <option value="refused">Refused</option>
                <option value="unavailable">Unavailable</option>
              </select>

              {adminAction !== 'given' && (
                <>
                  <label htmlFor="admin-reason" style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Reason:</label>
                  <textarea
                    id="admin-reason"
                    value={adminReason}
                    onChange={e => setAdminReason(e.target.value)}
                    rows={3}
                    placeholder="Reason for held/refused/unavailable..."
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: `1px solid ${colors.border}`, marginBottom: 12, resize: 'vertical' }}
                  />
                </>
              )}

              <button
                onClick={handleAdminister}
                style={{
                  background: colors.primary, color: '#fff', border: 'none', borderRadius: 4,
                  padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                }}
              >
                Record Administration
              </button>

              {adminResult && (
                <div style={{
                  marginTop: 12, padding: '10px 12px', borderRadius: 4,
                  background: (adminResult.status === 'integration-pending' || adminResult.status === 'unsupported-in-sandbox') ? colors.pendingBg : '#fed7d7',
                  border: `1px solid ${(adminResult.status === 'integration-pending' || adminResult.status === 'unsupported-in-sandbox') ? colors.pendingBorder : '#fc8181'}`,
                  fontSize: 13,
                }}>
                  {(adminResult.status === 'integration-pending' || adminResult.status === 'unsupported-in-sandbox') ? (
                    <>
                      <strong>{adminResult.status === 'unsupported-in-sandbox' ? 'Unsupported in Sandbox:' : 'Integration Pending:'}</strong> {adminResult.message}
                      <div style={{ fontSize: 11, color: '#975a16', marginTop: 4 }}>
                        Target: PSB MED LOG → File 53.79 BCMA MEDICATION LOG
                      </div>
                    </>
                  ) : (
                    <><strong>Error:</strong> {adminResult.error || 'Unknown error'}</>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* BCMA Scanner Tab (integration-pending)                               */
/* ------------------------------------------------------------------ */

function BCMATab({ dfn }: { dfn: string }) {
  const [barcode, setBarcode] = useState('');
  const [scanResult, setScanResult] = useState<{ ok: boolean; status?: string; message?: string; error?: string } | null>(null);
  const [scanning, setScanning] = useState(false);

  // Reset state on DFN change
  useEffect(() => {
    setBarcode('');
    setScanResult(null);
  }, [dfn]);

  const handleScan = useCallback(async () => {
    if (!barcode.trim()) return;
    setScanning(true);
    setScanResult(null);
    try {
      const result = await apiFetch('/emar/barcode-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dfn, barcode: barcode.trim() }),
      });
      setScanResult(result);
    } catch {
      setScanResult({ ok: false, error: 'Scan request failed' });
    } finally {
      setScanning(false);
    }
  }, [dfn, barcode]);

  return (
    <div>
      <IntegrationPendingBanner
        targets={[
          { rpc: 'PSB MED LOG', package: 'PSB', reason: 'BCMA medication verification against active orders' },
          { rpc: 'PSJBCMA', package: 'PSB', reason: 'Barcode-to-medication lookup via PSJ BCMA routines' },
        ]}
        context="Barcode Medication Administration (BCMA)"
      />

      <div style={{
        background: '#f7fafc', border: `1px solid ${colors.border}`, borderRadius: 6,
        padding: 20, marginTop: 16, maxWidth: 500,
      }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px 0' }}>
          BCMA 5-Rights Verification
        </h4>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6,
          marginBottom: 16,
        }}>
          {['Right Patient', 'Right Medication', 'Right Dose', 'Right Route', 'Right Time'].map(right => (
            <div key={right} style={{
              background: '#e2e8f0', borderRadius: 4, padding: '6px 4px',
              textAlign: 'center', fontSize: 11, fontWeight: 500, color: '#4a5568',
            }}>
              {right}
            </div>
          ))}
        </div>

        <label htmlFor="bcma-barcode" style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
          Scan Medication Barcode:
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            id="bcma-barcode"
            type="text"
            value={barcode}
            onChange={e => setBarcode(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleScan(); }}
            placeholder="Scan or enter barcode..."
            style={{
              flex: 1, padding: '8px 10px', borderRadius: 4,
              border: `1px solid ${colors.border}`, fontSize: 14, fontFamily: 'monospace',
            }}
            autoFocus
          />
          <button
            onClick={handleScan}
            disabled={!barcode.trim() || scanning}
            style={{
              background: colors.primary, color: '#fff', border: 'none', borderRadius: 4,
              padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              opacity: !barcode.trim() || scanning ? 0.6 : 1,
            }}
          >
            {scanning ? 'Scanning...' : 'Verify'}
          </button>
        </div>

        {scanResult && (
          scanResult.ok === false ? (
            <div style={{
              marginTop: 12, padding: '10px 12px', borderRadius: 4,
              background: '#fed7d7', border: '1px solid #fc8181', fontSize: 13,
            }}>
              <strong>Error:</strong> {scanResult.error || 'Scan request failed'}
            </div>
          ) : (
            <div style={{
              marginTop: 12, padding: '10px 12px', borderRadius: 4,
              background: colors.pendingBg, border: `1px solid ${colors.pendingBorder}`, fontSize: 13,
            }}>
              <strong>{scanResult.status === 'unsupported-in-sandbox' ? 'Unsupported in Sandbox:' : 'Integration Pending:'}</strong> {scanResult.message || 'BCMA verification requires PSB/PSJ packages'}
              <div style={{ fontSize: 11, color: '#975a16', marginTop: 4 }}>
                Targets: PSB MED LOG, PSJBCMA
              </div>
              <div style={{ fontSize: 11, color: '#4a5568', marginTop: 4 }}>
                Full BCMA workflow: Install BCMA package → configure barcode scanner hardware →
                enable PSB/PSJ RPCs → implement 5-rights verification workflow
              </div>
            </div>
          )
        )}
      </div>

      <div style={{
        marginTop: 20, padding: 16, background: colors.surface,
        border: `1px solid ${colors.border}`, borderRadius: 6,
      }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px 0' }}>About BCMA</h4>
        <div style={{ fontSize: 13, color: '#4a5568', lineHeight: 1.6 }}>
          Barcode Medication Administration (BCMA) is a VistA safety system that uses barcode
          scanning to verify the 5 Rights of medication administration before each dose. The
          system relies on the PSB (BCMA) and PSJ (Inpatient Pharmacy) packages, which are not
          included in the WorldVistA Docker sandbox.
        </div>
        <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 8 }}>
          VistA files: PSB(53.79) BCMA MEDICATION LOG, PSB(53.795) BCMA UNABLE TO SCAN LOG
        </div>
        <div style={{ fontSize: 12, color: colors.textMuted }}>
          Target routines: PSJBCMA, PSJBCMA1, PSBML, PSBMLEN
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main page content (needs searchParams)                               */
/* ------------------------------------------------------------------ */

function EmarPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dfnParam = searchParams.get('dfn') || '3';

  const [tab, setTab] = useState<Tab>('schedule');
  const [dfn, setDfn] = useState(dfnParam);
  const [dfnInput, setDfnInput] = useState(dfnParam);

  // Patient context
  const [patientName, setPatientName] = useState('');
  const [patientLocation, setPatientLocation] = useState('');
  const [patientRoomBed, setPatientRoomBed] = useState('');

  // Allergy warning count for tab badge
  const [allergyCount, setAllergyCount] = useState(0);

  useEffect(() => {
    apiFetch(`/vista/nursing/patient-context?dfn=${dfn}`)
      .then(data => {
        if (data.ok && data.patient) {
          setPatientName(data.patient.name || '');
          setPatientLocation(data.patient.location || '');
          setPatientRoomBed(data.patient.roomBed || '');
        }
      })
      .catch(() => {});

    apiFetch(`/emar/allergies?dfn=${dfn}`)
      .then(data => {
        if (data.ok) setAllergyCount(data.count || 0);
      })
      .catch(() => {});
  }, [dfn]);

  const handleDfnChange = useCallback(() => {
    const val = dfnInput.trim();
    if (val && /^\d+$/.test(val)) {
      setDfn(val);
      router.replace(`/cprs/emar?dfn=${val}`);
    }
  }, [dfnInput, router]);

  const tabs: Array<{ key: Tab; label: string; badge?: number }> = [
    { key: 'schedule', label: 'Medication Schedule' },
    { key: 'allergies', label: 'Allergy Warnings', badge: allergyCount },
    { key: 'admin', label: 'Administration' },
    { key: 'bcma', label: 'BCMA Scanner' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: colors.bg }}>
      {/* Header */}
      <div style={{
        background: colors.headerBg, color: colors.headerText,
        padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => router.push('/cprs/inpatient')}
            style={{
              background: 'rgba(255,255,255,0.15)', color: colors.headerText,
              border: 'none', borderRadius: 4, padding: '6px 12px', cursor: 'pointer', fontSize: 13,
            }}
          >
            Back to Inpatient
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
            eMAR — Medication Administration Record
          </h1>
        </div>
        <div style={{ fontSize: 13, opacity: 0.9 }}>Phase 85 — VistA-first + BCMA posture</div>
      </div>

      {/* Patient context banner */}
      <div style={{
        background: '#2d3748', color: '#e2e8f0', padding: '8px 20px',
        display: 'flex', alignItems: 'center', gap: 20, fontSize: 13,
      }}>
        <div>
          <span style={{ fontWeight: 600 }}>Patient:</span>{' '}
          {patientName || `DFN ${dfn}`}
        </div>
        {patientLocation && (
          <div><span style={{ fontWeight: 600 }}>Location:</span> {patientLocation}</div>
        )}
        {patientRoomBed && (
          <div><span style={{ fontWeight: 600 }}>Room/Bed:</span> {patientRoomBed}</div>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12 }}>DFN:</label>
          <input
            type="text"
            value={dfnInput}
            onChange={e => setDfnInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleDfnChange(); }}
            style={{
              width: 60, padding: '2px 6px', borderRadius: 3,
              border: '1px solid #4a5568', background: '#1a202c', color: '#e2e8f0',
              fontFamily: 'monospace', fontSize: 12,
            }}
          />
          <button
            onClick={handleDfnChange}
            style={{
              background: '#4a5568', color: '#e2e8f0', border: 'none',
              borderRadius: 3, padding: '2px 8px', cursor: 'pointer', fontSize: 12,
            }}
          >
            Go
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', borderBottom: `2px solid ${colors.border}`,
        background: colors.surface, padding: '0 20px',
      }} role="tablist" aria-label="eMAR tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 16px', fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? colors.primary : colors.textMuted,
              background: 'transparent', border: 'none', cursor: 'pointer',
              borderBottom: tab === t.key ? `2px solid ${colors.primary}` : '2px solid transparent',
              marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span style={{
                background: colors.danger, color: '#fff', borderRadius: 10,
                padding: '1px 6px', fontSize: 10, fontWeight: 700, minWidth: 16, textAlign: 'center',
              }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: 20, maxWidth: 1200 }} role="tabpanel" aria-label={`${tab} panel`}>
        {tab === 'schedule' && <ScheduleTab dfn={dfn} />}
        {tab === 'allergies' && <AllergiesTab dfn={dfn} />}
        {tab === 'admin' && <AdminTab dfn={dfn} />}
        {tab === 'bcma' && <BCMATab dfn={dfn} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Default export with Suspense boundary                                */
/* ------------------------------------------------------------------ */

export default function EmarPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading eMAR...</div>}>
      <EmarPageContent />
    </Suspense>
  );
}
