'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { csrfHeaders } from '@/lib/csrf';
import { API_BASE as API } from '@/lib/api-config';
import styles from '../cprs.module.css';

interface Ward {
  ien: string;
  name: string;
}

interface Team {
  ien: string;
  name: string;
}

interface Specialty {
  ien: string;
  name: string;
}

interface PatientEntry {
  dfn: string;
  name: string;
}

interface AdmissionEntry {
  dfn: string;
  name: string;
  admitDate: string;
  ward: string;
  roomBed: string;
  movementType?: string;
  locationText?: string;
  rawDateTime?: string;
}

interface CensusSummary {
  ien: string;
  name: string;
  patientCount: number;
}

interface CensusPatient {
  dfn: string;
  name: string;
  admitDate: string;
  ward: string;
  roomBed: string;
}

interface MovementEntry {
  date: string;
  type: string;
  fromLocation: string;
  toLocation: string;
  ward: string;
  roomBed: string;
  provider: string;
}

interface ApiResponse<T> {
  ok: boolean;
  source?: string;
  count: number;
  results: T[];
  rpcUsed?: string[];
  pendingTargets?: string[];
  _integration?: string;
  _error?: string;
  _note?: string;
  wardIen?: string;
}

type SubTab = 'ward' | 'provider' | 'team' | 'specialty' | 'admissions' | 'census' | 'movements';

const SUB_TABS: Array<{ key: SubTab; label: string }> = [
  { key: 'census', label: 'Census' },
  { key: 'movements', label: 'Movements' },
  { key: 'ward', label: 'Ward Lists' },
  { key: 'provider', label: 'My Patients' },
  { key: 'team', label: 'Teams' },
  { key: 'specialty', label: 'Specialty' },
  { key: 'admissions', label: 'Admissions' },
];

async function apiFetch<T>(path: string): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API}${path}`, {
      credentials: 'include',
      headers: { ...csrfHeaders() },
    });
    if (!res.ok) {
      return {
        ok: false,
        count: 0,
        results: [],
        rpcUsed: [],
        pendingTargets: [],
        _error: `HTTP ${res.status}`,
      };
    }
    return await res.json();
  } catch (err: any) {
    return {
      ok: false,
      count: 0,
      results: [],
      rpcUsed: [],
      pendingTargets: [],
      _error: err?.message || 'Request failed',
    };
  }
}

function Banner({ title, children, tone = 'warning' }: { title: string; children: string; tone?: 'warning' | 'info' }) {
  const palette =
    tone === 'warning'
      ? { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' }
      : { bg: '#eff6ff', border: '#60a5fa', text: '#1d4ed8' };
  return (
    <div
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 4,
        padding: '8px 12px',
        margin: '8px 0',
        fontSize: 12,
        color: palette.text,
      }}
    >
      <strong>{title}:</strong> {children}
    </div>
  );
}

function PendingBanner({ label, targets, note }: { label: string; targets?: string[]; note?: string }) {
  if ((!targets || targets.length === 0) && !note) return null;
  const suffix = targets && targets.length > 0 ? ` | Target RPC${targets.length > 1 ? 's' : ''}: ${targets.join(', ')}` : '';
  const noteSuffix = note ? ` | ${note}` : '';
  return <Banner title="Integration Pending">{`${label}${suffix}${noteSuffix}`}</Banner>;
}

function RpcBanner({ rpcUsed }: { rpcUsed?: string[] }) {
  if (!rpcUsed || rpcUsed.length === 0) return null;
  return <Banner title="RPC Used" tone="info">{rpcUsed.join(', ')}</Banner>;
}

function TableShell({ columns, loading, emptyMessage, children }: { columns: string[]; loading: boolean; emptyMessage: string; children: ReactNode }) {
  const childCount = Array.isArray(children) ? children.length : children ? 1 : 0;
  return (
    <table className={styles.dataTable}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column}>{column}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <tr>
            <td colSpan={columns.length} className={styles.loadingText}>Loading from VistA...</td>
          </tr>
        ) : childCount === 0 ? (
          <tr>
            <td colSpan={columns.length} className={styles.emptyText}>{emptyMessage}</td>
          </tr>
        ) : (
          children
        )}
      </tbody>
    </table>
  );
}

function ListSelector({ label, value, disabled, options, placeholder, onChange }: { label: string; value: string; disabled?: boolean; options: Array<{ value: string; label: string }>; placeholder: string; onChange: (value: string) => void }) {
  return (
    <div className={styles.formGroup} style={{ maxWidth: 320 }}>
      <label>{label}</label>
      <select className={styles.formSelect} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function PatientTable({ patients, loading, emptyMessage }: { patients: PatientEntry[]; loading: boolean; emptyMessage: string }) {
  return (
    <TableShell columns={['DFN', 'Patient Name']} loading={loading} emptyMessage={emptyMessage}>
      {patients.map((patient) => (
        <tr key={patient.dfn}>
          <td>{patient.dfn}</td>
          <td>{patient.name}</td>
        </tr>
      ))}
    </TableShell>
  );
}

function WardListsTab() {
  const [wards, setWards] = useState<Ward[]>([]);
  const [wardsLoading, setWardsLoading] = useState(true);
  const [wardsPendingTargets, setWardsPendingTargets] = useState<string[]>([]);
  const [wardsRpcUsed, setWardsRpcUsed] = useState<string[]>([]);
  const [wardsError, setWardsError] = useState<string | null>(null);
  const [selectedWard, setSelectedWard] = useState('');
  const [patients, setPatients] = useState<PatientEntry[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientsPendingTargets, setPatientsPendingTargets] = useState<string[]>([]);
  const [patientsRpcUsed, setPatientsRpcUsed] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setWardsLoading(true);
    void apiFetch<Ward>('/vista/adt/wards').then((response) => {
      if (cancelled) return;
      setWards(response.results || []);
      setWardsPendingTargets(response.pendingTargets || []);
      setWardsRpcUsed(response.rpcUsed || []);
      setWardsError(response._error || null);
      setWardsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadWardPatients = useCallback((wardIen: string) => {
    setSelectedWard(wardIen);
    if (!wardIen) {
      setPatients([]);
      setPatientsPendingTargets([]);
      setPatientsRpcUsed([]);
      return;
    }
    setPatientsLoading(true);
    void apiFetch<PatientEntry>(`/vista/adt/ward-patients?ward=${encodeURIComponent(wardIen)}`).then((response) => {
      setPatients(response.results || []);
      setPatientsPendingTargets(response.pendingTargets || []);
      setPatientsRpcUsed(response.rpcUsed || []);
      setPatientsLoading(false);
    });
  }, []);

  return (
    <div>
      <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Ward Lists</h3>
      <PendingBanner label="Ward list" targets={wardsPendingTargets} note={wardsError || undefined} />
      <RpcBanner rpcUsed={wardsRpcUsed} />
      <ListSelector
        label="Ward"
        value={selectedWard}
        disabled={wardsLoading}
        options={wards.map((ward) => ({ value: ward.ien, label: ward.name }))}
        placeholder={wardsLoading ? 'Loading wards...' : 'Select ward'}
        onChange={loadWardPatients}
      />
      <PendingBanner label="Ward patient list" targets={patientsPendingTargets} />
      <RpcBanner rpcUsed={patientsRpcUsed} />
      <PatientTable patients={patients} loading={patientsLoading} emptyMessage="No patients on this ward." />
    </div>
  );
}

function ProviderPatientsTab() {
  const [response, setResponse] = useState<ApiResponse<PatientEntry> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void apiFetch<PatientEntry>('/vista/adt/provider-patients').then((next) => {
      if (cancelled) return;
      setResponse(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>My Patients</h3>
      <PendingBanner label="Provider patients" targets={response?.pendingTargets} note={response?._error} />
      <RpcBanner rpcUsed={response?.rpcUsed} />
      <PatientTable patients={response?.results || []} loading={loading} emptyMessage="No patients assigned to this provider." />
    </div>
  );
}

function TeamsTab() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamsPendingTargets, setTeamsPendingTargets] = useState<string[]>([]);
  const [teamsRpcUsed, setTeamsRpcUsed] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [patients, setPatients] = useState<PatientEntry[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientsPendingTargets, setPatientsPendingTargets] = useState<string[]>([]);
  const [patientsRpcUsed, setPatientsRpcUsed] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setTeamsLoading(true);
    void apiFetch<Team>('/vista/adt/teams').then((response) => {
      if (cancelled) return;
      setTeams(response.results || []);
      setTeamsPendingTargets(response.pendingTargets || []);
      setTeamsRpcUsed(response.rpcUsed || []);
      setTeamsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadTeamPatients = useCallback((teamIen: string) => {
    setSelectedTeam(teamIen);
    if (!teamIen) {
      setPatients([]);
      setPatientsPendingTargets([]);
      setPatientsRpcUsed([]);
      return;
    }
    setPatientsLoading(true);
    void apiFetch<PatientEntry>(`/vista/adt/team-patients?team=${encodeURIComponent(teamIen)}`).then((response) => {
      setPatients(response.results || []);
      setPatientsPendingTargets(response.pendingTargets || []);
      setPatientsRpcUsed(response.rpcUsed || []);
      setPatientsLoading(false);
    });
  }, []);

  return (
    <div>
      <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Team Patients</h3>
      <PendingBanner label="Team list" targets={teamsPendingTargets} />
      <RpcBanner rpcUsed={teamsRpcUsed} />
      <ListSelector
        label="Team"
        value={selectedTeam}
        disabled={teamsLoading}
        options={teams.map((team) => ({ value: team.ien, label: team.name }))}
        placeholder={teamsLoading ? 'Loading teams...' : 'Select team'}
        onChange={loadTeamPatients}
      />
      <PendingBanner label="Team patient list" targets={patientsPendingTargets} />
      <RpcBanner rpcUsed={patientsRpcUsed} />
      <PatientTable patients={patients} loading={patientsLoading} emptyMessage="No patients found for this team." />
    </div>
  );
}

function SpecialtyTab() {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [specialtiesLoading, setSpecialtiesLoading] = useState(true);
  const [specialtiesPendingTargets, setSpecialtiesPendingTargets] = useState<string[]>([]);
  const [specialtiesRpcUsed, setSpecialtiesRpcUsed] = useState<string[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [patients, setPatients] = useState<PatientEntry[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientsPendingTargets, setPatientsPendingTargets] = useState<string[]>([]);
  const [patientsRpcUsed, setPatientsRpcUsed] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setSpecialtiesLoading(true);
    void apiFetch<Specialty>('/vista/adt/specialties').then((response) => {
      if (cancelled) return;
      setSpecialties(response.results || []);
      setSpecialtiesPendingTargets(response.pendingTargets || []);
      setSpecialtiesRpcUsed(response.rpcUsed || []);
      setSpecialtiesLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadSpecialtyPatients = useCallback((specialtyIen: string) => {
    setSelectedSpecialty(specialtyIen);
    if (!specialtyIen) {
      setPatients([]);
      setPatientsPendingTargets([]);
      setPatientsRpcUsed([]);
      return;
    }
    setPatientsLoading(true);
    void apiFetch<PatientEntry>(`/vista/adt/specialty-patients?specialty=${encodeURIComponent(specialtyIen)}`).then((response) => {
      setPatients(response.results || []);
      setPatientsPendingTargets(response.pendingTargets || []);
      setPatientsRpcUsed(response.rpcUsed || []);
      setPatientsLoading(false);
    });
  }, []);

  return (
    <div>
      <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Specialty Patients</h3>
      <PendingBanner label="Specialty list" targets={specialtiesPendingTargets} />
      <RpcBanner rpcUsed={specialtiesRpcUsed} />
      <ListSelector
        label="Specialty"
        value={selectedSpecialty}
        disabled={specialtiesLoading}
        options={specialties.map((specialty) => ({ value: specialty.ien, label: specialty.name }))}
        placeholder={specialtiesLoading ? 'Loading specialties...' : 'Select specialty'}
        onChange={loadSpecialtyPatients}
      />
      <PendingBanner label="Specialty patient list" targets={patientsPendingTargets} />
      <RpcBanner rpcUsed={patientsRpcUsed} />
      <PatientTable patients={patients} loading={patientsLoading} emptyMessage="No patients found for this specialty." />
    </div>
  );
}

function AdmissionsTab({ dfn }: { dfn: string }) {
  const [response, setResponse] = useState<ApiResponse<AdmissionEntry> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void apiFetch<AdmissionEntry>(`/vista/adt/admission-list?dfn=${encodeURIComponent(dfn)}`).then((next) => {
      if (cancelled) return;
      setResponse(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [dfn]);

  return (
    <div>
      <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Admission History</h3>
      <PendingBanner label="Admission history" targets={response?.pendingTargets} note={response?._error} />
      <RpcBanner rpcUsed={response?.rpcUsed} />
      <TableShell columns={['Admit Date', 'Movement', 'Ward', 'Location']} loading={loading} emptyMessage="No admission history found.">
        {(response?.results || []).map((admission, index) => (
          <tr key={`${admission.dfn}-${index}`}>
            <td>{admission.admitDate || '—'}</td>
            <td>{admission.movementType || 'ADMISSION'}</td>
            <td>{admission.ward || '—'}</td>
            <td>{admission.locationText || admission.roomBed || '—'}</td>
          </tr>
        ))}
      </TableShell>
    </div>
  );
}

function CensusTab() {
  const [summary, setSummary] = useState<ApiResponse<CensusSummary> | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [selectedWard, setSelectedWard] = useState('');
  const [detail, setDetail] = useState<ApiResponse<CensusPatient> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSummaryLoading(true);
    void apiFetch<CensusSummary>('/vista/adt/census').then((response) => {
      if (cancelled) return;
      setSummary(response);
      setSummaryLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadWardDetail = useCallback((wardIen: string) => {
    setSelectedWard(wardIen);
    if (!wardIen) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    void apiFetch<CensusPatient>(`/vista/adt/census?ward=${encodeURIComponent(wardIen)}`).then((response) => {
      setDetail(response);
      setDetailLoading(false);
    });
  }, []);

  return (
    <div className={styles.splitPane}>
      <div className={styles.splitLeft} style={{ maxWidth: 360 }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Ward Census Summary</h3>
        <PendingBanner label="Census summary" targets={summary?.pendingTargets} note={summary?._error || summary?._note} />
        <RpcBanner rpcUsed={summary?.rpcUsed} />
        <TableShell columns={['Ward', 'Patients']} loading={summaryLoading} emptyMessage="No ward census summary returned.">
          {(summary?.results || []).map((ward) => (
            <tr
              key={ward.ien}
              onClick={() => loadWardDetail(ward.ien)}
              style={{ background: selectedWard === ward.ien ? 'var(--cprs-hover-bg)' : undefined, cursor: 'pointer' }}
            >
              <td>{ward.name}</td>
              <td>{ward.patientCount}</td>
            </tr>
          ))}
        </TableShell>
      </div>
      <div className={styles.splitRight}>
        <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Selected Ward Census</h3>
        <PendingBanner label="Ward census detail" targets={detail?.pendingTargets} note={detail?._error} />
        <RpcBanner rpcUsed={detail?.rpcUsed} />
        <TableShell columns={['DFN', 'Patient', 'Admit Date', 'Ward', 'Room/Bed']} loading={detailLoading} emptyMessage="Select a ward to load census detail.">
          {(detail?.results || []).map((patient) => (
            <tr key={`${patient.dfn}-${patient.name}`}>
              <td>{patient.dfn}</td>
              <td>{patient.name}</td>
              <td>{patient.admitDate || '—'}</td>
              <td>{patient.ward || '—'}</td>
              <td>{patient.roomBed || '—'}</td>
            </tr>
          ))}
        </TableShell>
      </div>
    </div>
  );
}

function MovementsTab({ dfn }: { dfn: string }) {
  const [response, setResponse] = useState<ApiResponse<MovementEntry> | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    void apiFetch<MovementEntry>(`/vista/adt/movements?dfn=${encodeURIComponent(dfn)}`).then((next) => {
      setResponse(next);
      setLoading(false);
    });
  }, [dfn]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div>
      <div className={styles.panelToolbar}>
        <h3 style={{ margin: 0, fontSize: 15 }}>Patient Movement Timeline</h3>
        <button className={styles.btn} onClick={refresh}>Refresh</button>
      </div>
      <PendingBanner label="Movement history" targets={response?.pendingTargets} note={response?._error || response?._note} />
      <RpcBanner rpcUsed={response?.rpcUsed} />
      <TableShell columns={['Date', 'Type', 'From', 'To', 'Ward', 'Room/Bed', 'Provider']} loading={loading} emptyMessage="No movement history returned for this patient.">
        {(response?.results || []).map((movement, index) => (
          <tr key={`${movement.date}-${movement.type}-${index}`}>
            <td>{movement.date || '—'}</td>
            <td>{movement.type || '—'}</td>
            <td>{movement.fromLocation || '—'}</td>
            <td>{movement.toLocation || '—'}</td>
            <td>{movement.ward || '—'}</td>
            <td>{movement.roomBed || '—'}</td>
            <td>{movement.provider || '—'}</td>
          </tr>
        ))}
      </TableShell>
      <div style={{ marginTop: 10, padding: 12, border: '1px solid var(--cprs-border)', borderRadius: 4, background: 'var(--cprs-section-bg)' }}>
        <strong>Truthfulness Contract</strong>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--cprs-text-muted)' }}>
          This tab uses the live movements route. In VEHU it may currently show admissions only because full transfer and discharge history depends on the custom ZVEADT MVHIST RPC rather than the standard ORWPT16 admission list.
        </p>
      </div>
    </div>
  );
}

export default function ADTPanel({ dfn }: { dfn: string }) {
  const [activeTab, setActiveTab] = useState<SubTab>('census');

  return (
    <div>
      <div className={styles.panelTitle}>ADT / Inpatient Operations</div>
      <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', margin: '2px 0 10px' }}>
        Contract: Phase 137 ADT census and movement depth over live `/vista/adt/*` routes, with truthful DG write posture.
      </p>

      <Banner title="Writeback Posture">
        ADT writes remain integration-pending in VEHU. Admit, transfer, and discharge must stay explicit about DGPM NEW ADMISSION, DGPM NEW TRANSFER, and DGPM NEW DISCHARGE instead of presenting fake completion.
      </Banner>

      <div className={styles.panelToolbar} style={{ flexWrap: 'wrap' }}>
        {SUB_TABS.map((tab) => (
          <button key={tab.key} className={activeTab === tab.key ? styles.btnPrimary : styles.btn} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'census' && <CensusTab />}
      {activeTab === 'movements' && <MovementsTab dfn={dfn} />}
      {activeTab === 'ward' && <WardListsTab />}
      {activeTab === 'provider' && <ProviderPatientsTab />}
      {activeTab === 'team' && <TeamsTab />}
      {activeTab === 'specialty' && <SpecialtyTab />}
      {activeTab === 'admissions' && <AdmissionsTab dfn={dfn} />}
    </div>
  );
}
