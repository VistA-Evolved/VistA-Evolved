'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { csrfHeaders } from '@/lib/csrf';
import { API_BASE as API } from '@/lib/api-config';

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

interface Ward { ien: string; name: string }
interface Team { ien: string; name: string }
interface Specialty { ien: string; name: string }
interface PatientEntry { dfn: string; name: string }
interface AdmissionEntry { dfn: string; name: string; admitDate: string; ward: string; roomBed: string }
interface ApiResponse<T> {
  ok: boolean;
  source?: string;
  count: number;
  results: T[];
  rpcUsed: string[];
  pendingTargets: string[];
  _integration?: string;
  _error?: string;
}

/* ------------------------------------------------------------------ */
/* Shared fetcher                                                        */
/* ------------------------------------------------------------------ */


async function apiFetch<T>(path: string): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API}${path}`, { credentials: 'include', headers: { ...csrfHeaders() } });
    if (!res.ok) {
      return { ok: false, count: 0, results: [], rpcUsed: [], pendingTargets: [], _error: `HTTP ${res.status}` };
    }
    return await res.json();
  } catch (err: any) {
    return { ok: false, count: 0, results: [], rpcUsed: [], pendingTargets: [], _error: err.message };
  }
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                        */
/* ------------------------------------------------------------------ */

function IntegrationPendingBanner({ label, targets }: { label: string; targets: string[] }) {
  return (
    <div style={{
      background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 4, padding: '8px 12px',
      margin: '8px 0', fontSize: 12, color: '#92400e',
    }}>
      <strong>Integration Pending:</strong> {label}
      {targets.length > 0 && (
        <span style={{ marginLeft: 8 }}>
          Target RPC{targets.length > 1 ? 's' : ''}: {targets.join(', ')}
        </span>
      )}
    </div>
  );
}

function LoadingRow() {
  return (
    <tr><td colSpan={4} style={{ padding: 12, textAlign: 'center', color: '#6b7280', fontSize: 12 }}>
      Loading from VistA...
    </td></tr>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <tr><td colSpan={4} style={{ padding: 12, textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>
      {message}
    </td></tr>
  );
}

function PatientTable({ patients, loading, emptyMsg }: {
  patients: PatientEntry[];
  loading: boolean;
  emptyMsg: string;
}) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
          <th style={{ textAlign: 'left', padding: '6px 8px' }}>DFN</th>
          <th style={{ textAlign: 'left', padding: '6px 8px' }}>Patient Name</th>
        </tr>
      </thead>
      <tbody>
        {loading ? <LoadingRow /> :
          patients.length === 0 ? <EmptyRow message={emptyMsg} /> :
          patients.map((p) => (
            <tr key={p.dfn} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '4px 8px' }}>{p.dfn}</td>
              <td style={{ padding: '4px 8px' }}>{p.name}</td>
            </tr>
          ))
        }
      </tbody>
    </table>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-tab: Ward Census                                                  */
/* ------------------------------------------------------------------ */

function WardCensusTab() {
  const [wards, setWards] = useState<Ward[]>([]);
  const [wardsLoading, setWardsLoading] = useState(true);
  const [wardsError, setWardsError] = useState<string | null>(null);
  const [wardsPending, setWardsPending] = useState<string[]>([]);

  const [selectedWard, setSelectedWard] = useState('');
  const [patients, setPatients] = useState<PatientEntry[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientsPending, setPatientsPending] = useState<string[]>([]);

  useEffect(() => {
    setWardsLoading(true);
    apiFetch<Ward>('/vista/adt/wards').then((r) => {
      setWards(r.results);
      setWardsError(r._error || null);
      setWardsPending(r.pendingTargets || []);
      setWardsLoading(false);
    });
  }, []);

  const loadWardPatients = useCallback((wardIen: string) => {
    setSelectedWard(wardIen);
    if (!wardIen) { setPatients([]); return; }
    setPatientsLoading(true);
    apiFetch<PatientEntry>(`/vista/adt/ward-patients?ward=${encodeURIComponent(wardIen)}`).then((r) => {
      setPatients(r.results);
      setPatientsPending(r.pendingTargets || []);
      setPatientsLoading(false);
    });
  }, []);

  return (
    <div>
      {wardsPending.length > 0 && <IntegrationPendingBanner label="Ward list" targets={wardsPending} />}
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Ward:</label>
        <select
          value={selectedWard}
          onChange={(e) => loadWardPatients(e.target.value)}
          disabled={wardsLoading}
          style={{ fontSize: 12, padding: '2px 4px', minWidth: 200 }}
        >
          <option value="">{wardsLoading ? 'Loading wards...' : '-- Select Ward --'}</option>
          {wards.map((w) => (
            <option key={w.ien} value={w.ien}>{w.name}</option>
          ))}
        </select>
        {wardsError && <span style={{ color: '#ef4444', fontSize: 11 }}>{wardsError}</span>}
      </div>
      {patientsPending.length > 0 && <IntegrationPendingBanner label="Ward patient list" targets={patientsPending} />}
      {selectedWard && (
        <PatientTable
          patients={patients}
          loading={patientsLoading}
          emptyMsg="No patients on this ward"
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-tab: My Patients (Provider)                                       */
/* ------------------------------------------------------------------ */

function MyPatientsTab() {
  const [patients, setPatients] = useState<PatientEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string[]>([]);

  useEffect(() => {
    apiFetch<PatientEntry>('/vista/adt/provider-patients').then((r) => {
      setPatients(r.results);
      setPending(r.pendingTargets || []);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      {pending.length > 0 && <IntegrationPendingBanner label="Provider patients" targets={pending} />}
      <PatientTable patients={patients} loading={loading} emptyMsg="No patients assigned to you" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-tab: Team Patients                                                */
/* ------------------------------------------------------------------ */

function TeamPatientsTab() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamsPending, setTeamsPending] = useState<string[]>([]);

  const [selectedTeam, setSelectedTeam] = useState('');
  const [patients, setPatients] = useState<PatientEntry[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientsPending, setPatientsPending] = useState<string[]>([]);

  useEffect(() => {
    setTeamsLoading(true);
    apiFetch<Team>('/vista/adt/teams').then((r) => {
      setTeams(r.results);
      setTeamsPending(r.pendingTargets || []);
      setTeamsLoading(false);
    });
  }, []);

  const loadTeamPatients = useCallback((teamIen: string) => {
    setSelectedTeam(teamIen);
    if (!teamIen) { setPatients([]); return; }
    setPatientsLoading(true);
    apiFetch<PatientEntry>(`/vista/adt/team-patients?team=${encodeURIComponent(teamIen)}`).then((r) => {
      setPatients(r.results);
      setPatientsPending(r.pendingTargets || []);
      setPatientsLoading(false);
    });
  }, []);

  return (
    <div>
      {teamsPending.length > 0 && <IntegrationPendingBanner label="Team list" targets={teamsPending} />}
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Team:</label>
        <select
          value={selectedTeam}
          onChange={(e) => loadTeamPatients(e.target.value)}
          disabled={teamsLoading}
          style={{ fontSize: 12, padding: '2px 4px', minWidth: 200 }}
        >
          <option value="">{teamsLoading ? 'Loading teams...' : '-- Select Team --'}</option>
          {teams.map((t) => (
            <option key={t.ien} value={t.ien}>{t.name}</option>
          ))}
        </select>
      </div>
      {patientsPending.length > 0 && <IntegrationPendingBanner label="Team patients" targets={patientsPending} />}
      {selectedTeam && (
        <PatientTable
          patients={patients}
          loading={patientsLoading}
          emptyMsg="No patients on this team"
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-tab: Specialty                                                    */
/* ------------------------------------------------------------------ */

function SpecialtyTab() {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [specLoading, setSpecLoading] = useState(true);
  const [specPending, setSpecPending] = useState<string[]>([]);

  const [selectedSpec, setSelectedSpec] = useState('');
  const [patients, setPatients] = useState<PatientEntry[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientsPending, setPatientsPending] = useState<string[]>([]);

  useEffect(() => {
    setSpecLoading(true);
    apiFetch<Specialty>('/vista/adt/specialties').then((r) => {
      setSpecialties(r.results);
      setSpecPending(r.pendingTargets || []);
      setSpecLoading(false);
    });
  }, []);

  const loadSpecialtyPatients = useCallback((specIen: string) => {
    setSelectedSpec(specIen);
    if (!specIen) { setPatients([]); return; }
    setPatientsLoading(true);
    apiFetch<PatientEntry>(`/vista/adt/specialty-patients?specialty=${encodeURIComponent(specIen)}`).then((r) => {
      setPatients(r.results);
      setPatientsPending(r.pendingTargets || []);
      setPatientsLoading(false);
    });
  }, []);

  return (
    <div>
      {specPending.length > 0 && <IntegrationPendingBanner label="Specialty list" targets={specPending} />}
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Specialty:</label>
        <select
          value={selectedSpec}
          onChange={(e) => loadSpecialtyPatients(e.target.value)}
          disabled={specLoading}
          style={{ fontSize: 12, padding: '2px 4px', minWidth: 200 }}
        >
          <option value="">{specLoading ? 'Loading...' : '-- Select Specialty --'}</option>
          {specialties.map((s) => (
            <option key={s.ien} value={s.ien}>{s.name}</option>
          ))}
        </select>
      </div>
      {patientsPending.length > 0 && <IntegrationPendingBanner label="Specialty patients" targets={patientsPending} />}
      {selectedSpec && (
        <PatientTable
          patients={patients}
          loading={patientsLoading}
          emptyMsg="No patients for this specialty"
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-tab: Admission History (patient-scoped)                           */
/* ------------------------------------------------------------------ */

function AdmissionHistoryTab({ dfn }: { dfn: string }) {
  const [admissions, setAdmissions] = useState<AdmissionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string[]>([]);

  useEffect(() => {
    if (!dfn) return;
    setLoading(true);
    apiFetch<AdmissionEntry>(`/vista/adt/admission-list?dfn=${encodeURIComponent(dfn)}`).then((r) => {
      setAdmissions(r.results);
      setPending(r.pendingTargets || []);
      setLoading(false);
    });
  }, [dfn]);

  return (
    <div>
      {pending.length > 0 && <IntegrationPendingBanner label="Admission history" targets={pending} />}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
            <th style={{ textAlign: 'left', padding: '6px 8px' }}>Admit Date</th>
            <th style={{ textAlign: 'left', padding: '6px 8px' }}>Ward</th>
            <th style={{ textAlign: 'left', padding: '6px 8px' }}>Room</th>
            <th style={{ textAlign: 'left', padding: '6px 8px' }}>Patient</th>
          </tr>
        </thead>
        <tbody>
          {loading ? <LoadingRow /> :
            admissions.length === 0 ? <EmptyRow message="No admission history found" /> :
            admissions.map((a, i) => (
              <tr key={`${a.dfn}-${i}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '4px 8px' }}>{a.admitDate}</td>
                <td style={{ padding: '4px 8px' }}>{a.ward}</td>
                <td style={{ padding: '4px 8px' }}>{a.roomBed || '--'}</td>
                <td style={{ padding: '4px 8px' }}>{a.name}</td>
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Panel                                                            */
/* ------------------------------------------------------------------ */

type SubTab = 'ward' | 'provider' | 'team' | 'specialty' | 'admissions';

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'ward', label: 'Ward Census' },
  { key: 'provider', label: 'My Patients' },
  { key: 'team', label: 'Team Patients' },
  { key: 'specialty', label: 'Specialty' },
  { key: 'admissions', label: 'Admissions' },
];

export default function ADTPanel({ dfn }: { dfn: string }) {
  const [activeTab, setActiveTab] = useState<SubTab>('ward');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '8px 12px',
        borderBottom: '1px solid var(--cprs-border, #e5e7eb)',
        background: 'var(--cprs-surface, #f9fafb)',
      }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, marginRight: 16 }}>
          ADT / Inpatient Lists
        </h2>
        <span style={{
          fontSize: 10, color: '#6b7280', padding: '2px 6px',
          background: '#e5e7eb', borderRadius: 3,
        }}>
          Phase 67 -- VistA-first read posture
        </span>
      </div>

      {/* Sub-tab strip */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--cprs-border, #e5e7eb)',
        background: 'var(--cprs-surface, #fff)',
      }}>
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '6px 14px', fontSize: 12, border: 'none', cursor: 'pointer',
              background: activeTab === t.key ? 'var(--cprs-selected, #dbeafe)' : 'transparent',
              color: activeTab === t.key ? 'var(--cprs-text, #1e3a5f)' : 'var(--cprs-text-muted, #6b7280)',
              fontWeight: activeTab === t.key ? 600 : 400,
              borderBottom: activeTab === t.key ? '2px solid var(--cprs-accent, #2563eb)' : '2px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Write actions banner */}
      <IntegrationPendingBanner
        label="ADT write actions (Admit, Transfer, Discharge) require VistA DG package RPCs"
        targets={['DGPM NEW ADMISSION', 'DGPM NEW TRANSFER', 'DGPM NEW DISCHARGE']}
      />

      {/* Sub-tab content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
        {activeTab === 'ward' && <WardCensusTab />}
        {activeTab === 'provider' && <MyPatientsTab />}
        {activeTab === 'team' && <TeamPatientsTab />}
        {activeTab === 'specialty' && <SpecialtyTab />}
        {activeTab === 'admissions' && <AdmissionHistoryTab dfn={dfn} />}
      </div>
    </div>
  );
}
