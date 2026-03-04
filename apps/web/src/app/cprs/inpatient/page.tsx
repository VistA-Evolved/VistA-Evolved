'use client';

/**
 * Inpatient Operations — Phase 83
 *
 * 4 tabs: Census | Bedboard | ADT Workflow | Movement Timeline
 * Data: VistA ORQPT WARDS + ORQPT WARD PATIENTS + ORWPT16 ADMITLST
 * Write RPCs (DGPM) are capability-probed — UI shows structured blockers.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { csrfHeaders } from '@/lib/csrf';
import { API_BASE } from '@/lib/api-config';

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

type Tab = 'census' | 'bedboard' | 'adt' | 'movements';

interface WardSummary {
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

interface BedSlot {
  ward: string;
  wardIen: string;
  roomBed: string;
  status: 'occupied' | 'empty';
  patientDfn: string | null;
  patientName: string | null;
  patientInitials: string | null;
  admitDate: string | null;
}

interface MovementEvent {
  date: string;
  type: string;
  fromLocation: string;
  toLocation: string;
  ward: string;
  roomBed: string;
  provider: string;
}

interface PendingInfo {
  ok: boolean;
  status: string;
  action: string;
  message: string;
  pendingTargets: string[];
  vistaGrounding?: {
    vistaFiles: string[];
    targetRoutines: string[];
    requiredFields?: string[];
    migrationPath: string;
    sandboxNote: string;
  };
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'census', label: 'Ward Census' },
  { id: 'bedboard', label: 'Bed Board' },
  { id: 'adt', label: 'ADT Workflow' },
  { id: 'movements', label: 'Movements' },
];

/* ------------------------------------------------------------------ */
/* Inline styles                                                        */
/* ------------------------------------------------------------------ */

const S = {
  page: {
    padding: '16px 24px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    maxWidth: '1400px',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  } as React.CSSProperties,
  title: {
    fontSize: '18px',
    fontWeight: 600,
    margin: 0,
    color: '#1a365d',
  } as React.CSSProperties,
  tabBar: {
    display: 'flex',
    borderBottom: '2px solid #cbd5e0',
    marginBottom: '16px',
    gap: '0',
  } as React.CSSProperties,
  tab: (active: boolean) =>
    ({
      padding: '8px 20px',
      cursor: 'pointer',
      border: 'none',
      borderBottom: active ? '3px solid #2b6cb0' : '3px solid transparent',
      background: active ? '#ebf4ff' : 'transparent',
      fontWeight: active ? 600 : 400,
      color: active ? '#2b6cb0' : '#4a5568',
      fontSize: '13px',
      transition: 'all 0.15s',
    }) as React.CSSProperties,
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '16px',
    marginBottom: '12px',
  } as React.CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '13px',
  } as React.CSSProperties,
  th: {
    textAlign: 'left' as const,
    padding: '8px 12px',
    background: '#f7fafc',
    borderBottom: '2px solid #e2e8f0',
    fontWeight: 600,
    color: '#2d3748',
    fontSize: '12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  } as React.CSSProperties,
  td: {
    padding: '8px 12px',
    borderBottom: '1px solid #edf2f7',
    color: '#4a5568',
  } as React.CSSProperties,
  wardBtn: (selected: boolean) =>
    ({
      padding: '6px 14px',
      margin: '2px 4px',
      cursor: 'pointer',
      border: selected ? '2px solid #2b6cb0' : '1px solid #cbd5e0',
      borderRadius: '4px',
      background: selected ? '#ebf4ff' : '#fff',
      fontWeight: selected ? 600 : 400,
      color: selected ? '#2b6cb0' : '#4a5568',
      fontSize: '13px',
    }) as React.CSSProperties,
  bedGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '10px',
    marginTop: '12px',
  } as React.CSSProperties,
  bedCard: (occupied: boolean) =>
    ({
      padding: '12px',
      borderRadius: '6px',
      border: occupied ? '2px solid #3182ce' : '2px dashed #cbd5e0',
      background: occupied ? '#ebf8ff' : '#f7fafc',
      textAlign: 'center' as const,
      cursor: occupied ? 'pointer' : 'default',
      minHeight: '80px',
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'center',
      alignItems: 'center',
      gap: '4px',
    }) as React.CSSProperties,
  initials: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#2b6cb0',
  } as React.CSSProperties,
  bedLabel: {
    fontSize: '11px',
    color: '#718096',
    fontWeight: 500,
  } as React.CSSProperties,
  emptyBed: {
    fontSize: '12px',
    color: '#a0aec0',
  } as React.CSSProperties,
  loading: {
    padding: '24px',
    textAlign: 'center' as const,
    color: '#718096',
    fontSize: '14px',
  } as React.CSSProperties,
  error: {
    padding: '12px 16px',
    background: '#fff5f5',
    border: '1px solid #fed7d7',
    borderRadius: '6px',
    color: '#c53030',
    fontSize: '13px',
    marginBottom: '12px',
  } as React.CSSProperties,
  pendingBanner: {
    padding: '16px',
    background: '#fffff0',
    border: '1px solid #fefcbf',
    borderRadius: '6px',
    marginBottom: '12px',
  } as React.CSSProperties,
  pendingTitle: {
    fontWeight: 600,
    color: '#975a16',
    fontSize: '14px',
    marginBottom: '8px',
  } as React.CSSProperties,
  pendingText: {
    fontSize: '13px',
    color: '#744210',
    lineHeight: '1.5',
  } as React.CSSProperties,
  codeBlock: {
    background: '#fefce8',
    padding: '8px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#92400e',
    marginTop: '8px',
    overflowX: 'auto' as const,
  } as React.CSSProperties,
  actionBtn: (disabled: boolean) =>
    ({
      padding: '10px 24px',
      border: 'none',
      borderRadius: '6px',
      background: disabled ? '#e2e8f0' : '#2b6cb0',
      color: disabled ? '#a0aec0' : '#fff',
      fontSize: '14px',
      fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'background 0.15s',
    }) as React.CSSProperties,
  badge: (color: string) =>
    ({
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '10px',
      fontSize: '11px',
      fontWeight: 600,
      background:
        color === 'blue'
          ? '#bee3f8'
          : color === 'green'
            ? '#c6f6d5'
            : color === 'yellow'
              ? '#fefcbf'
              : '#e2e8f0',
      color:
        color === 'blue'
          ? '#2a4365'
          : color === 'green'
            ? '#22543d'
            : color === 'yellow'
              ? '#744210'
              : '#4a5568',
    }) as React.CSSProperties,
  timeline: {
    position: 'relative' as const,
    paddingLeft: '24px',
    borderLeft: '3px solid #e2e8f0',
    marginLeft: '12px',
  } as React.CSSProperties,
  timelineEvent: {
    position: 'relative' as const,
    paddingBottom: '16px',
    paddingLeft: '16px',
  } as React.CSSProperties,
  timelineDot: {
    position: 'absolute' as const,
    left: '-30px',
    top: '4px',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: '#3182ce',
    border: '2px solid #fff',
    boxShadow: '0 0 0 2px #bee3f8',
  } as React.CSSProperties,
  modal: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  } as React.CSSProperties,
  modalContent: {
    background: '#fff',
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '540px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto',
  } as React.CSSProperties,
  selectInput: {
    padding: '6px 10px',
    border: '1px solid #cbd5e0',
    borderRadius: '4px',
    fontSize: '13px',
    minWidth: '200px',
  } as React.CSSProperties,
  row: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    marginBottom: '8px',
  } as React.CSSProperties,
  label: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#4a5568',
    marginBottom: '2px',
  } as React.CSSProperties,
  sourceTag: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    background: '#c6f6d5',
    color: '#22543d',
  } as React.CSSProperties,
  pendingTag: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    background: '#fefcbf',
    color: '#744210',
  } as React.CSSProperties,
  clickRow: {
    cursor: 'pointer',
  } as React.CSSProperties,
};

/* ------------------------------------------------------------------ */
/* Census Tab                                                           */
/* ------------------------------------------------------------------ */

function CensusTab() {
  const router = useRouter();
  const [wards, setWards] = useState<WardSummary[]>([]);
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [census, setCensus] = useState<CensusPatient[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCensus, setLoadingCensus] = useState(false);
  const [error, setError] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<CensusPatient | null>(null);

  const loadWards = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/vista/inpatient/wards');
      setWards(data.results || []);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  const loadCensus = useCallback(async (wardIen: string) => {
    setLoadingCensus(true);
    setError('');
    try {
      const data = await apiFetch(`/vista/inpatient/ward-census?ward=${wardIen}`);
      setCensus(data.results || []);
    } catch (err: any) {
      setError(err.message);
    }
    setLoadingCensus(false);
  }, []);

  useEffect(() => {
    loadWards();
  }, [loadWards]);

  useEffect(() => {
    if (selectedWard) loadCensus(selectedWard);
    else setCensus([]);
  }, [selectedWard, loadCensus]);

  const handlePatientClick = (p: CensusPatient) => {
    setSelectedPatient(p);
  };

  return (
    <div>
      {/* Ward selector */}
      <div style={S.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={S.label}>Select Ward:</span>
          <span style={S.sourceTag}>Source: VistA (ORQPT WARDS)</span>
        </div>
        {loading ? (
          <div style={S.loading}>Loading wards...</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {wards.map((w) => (
              <button
                key={w.ien}
                style={S.wardBtn(selectedWard === w.ien)}
                onClick={() => setSelectedWard(w.ien)}
              >
                {w.name} ({w.patientCount})
              </button>
            ))}
            {wards.length === 0 && !loading && (
              <span style={{ color: '#a0aec0', fontSize: '13px' }}>
                No wards found. Is VistA connected?
              </span>
            )}
          </div>
        )}
      </div>

      {error && <div style={S.error}>{error}</div>}

      {/* Census table */}
      {selectedWard && (
        <div style={S.card}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: '14px', color: '#2d3748' }}>
              Ward Census ({census.length} patients)
            </span>
            {loadingCensus && (
              <span style={{ color: '#718096', fontSize: '12px' }}>Loading...</span>
            )}
          </div>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>DFN</th>
                <th style={S.th}>Name</th>
                <th style={S.th}>Ward</th>
                <th style={S.th}>Room/Bed</th>
                <th style={S.th}>Admit Date</th>
              </tr>
            </thead>
            <tbody>
              {census.map((p) => (
                <tr
                  key={p.dfn}
                  onClick={() => handlePatientClick(p)}
                  style={{
                    ...S.clickRow,
                    background: selectedPatient?.dfn === p.dfn ? '#ebf8ff' : 'transparent',
                  }}
                  onMouseOver={(e) => {
                    (e.currentTarget as HTMLElement).style.background = '#f7fafc';
                  }}
                  onMouseOut={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      selectedPatient?.dfn === p.dfn ? '#ebf8ff' : 'transparent';
                  }}
                >
                  <td style={S.td}>{p.dfn}</td>
                  <td style={{ ...S.td, fontWeight: 500 }}>{p.name}</td>
                  <td style={S.td}>{p.ward || '-'}</td>
                  <td style={S.td}>{p.roomBed || '-'}</td>
                  <td style={S.td}>{p.admitDate || '-'}</td>
                </tr>
              ))}
              {census.length === 0 && !loadingCensus && selectedWard && (
                <tr>
                  <td colSpan={5} style={{ ...S.td, textAlign: 'center', color: '#a0aec0' }}>
                    No patients on this ward
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Patient detail drawer */}
      {selectedPatient && (
        <div style={S.modal} onClick={() => setSelectedPatient(null)}>
          <div style={S.modalContent} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '16px', color: '#1a365d' }}>Patient Detail</h3>
              <button
                onClick={() => setSelectedPatient(null)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: '#a0aec0',
                }}
              >
                &times;
              </button>
            </div>
            <table style={{ ...S.table, fontSize: '13px' }}>
              <tbody>
                <tr>
                  <td style={{ ...S.td, fontWeight: 600, width: '140px' }}>DFN</td>
                  <td style={S.td}>{selectedPatient.dfn}</td>
                </tr>
                <tr>
                  <td style={{ ...S.td, fontWeight: 600 }}>Name</td>
                  <td style={S.td}>{selectedPatient.name}</td>
                </tr>
                <tr>
                  <td style={{ ...S.td, fontWeight: 600 }}>Ward</td>
                  <td style={S.td}>{selectedPatient.ward || 'Unknown'}</td>
                </tr>
                <tr>
                  <td style={{ ...S.td, fontWeight: 600 }}>Room/Bed</td>
                  <td style={S.td}>{selectedPatient.roomBed || 'Unknown'}</td>
                </tr>
                <tr>
                  <td style={{ ...S.td, fontWeight: 600 }}>Admit Date</td>
                  <td style={S.td}>{selectedPatient.admitDate || 'Unknown'}</td>
                </tr>
              </tbody>
            </table>
            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
              <button
                style={S.actionBtn(false)}
                onClick={() => router.push(`/cprs/chart/${selectedPatient.dfn}/cover`)}
              >
                Open Chart
              </button>
              <button
                style={{ ...S.actionBtn(false), background: '#718096' }}
                onClick={() => setSelectedPatient(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bedboard Tab                                                         */
/* ------------------------------------------------------------------ */

function BedboardTab() {
  const [wards, setWards] = useState<WardSummary[]>([]);
  const [selectedWard, setSelectedWard] = useState('');
  const [beds, setBeds] = useState<BedSlot[]>([]);
  const [wardName, setWardName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedBed, setSelectedBed] = useState<BedSlot | null>(null);
  const [pendingNote, setPendingNote] = useState('');

  const loadWards = useCallback(async () => {
    try {
      const data = await apiFetch('/vista/inpatient/wards');
      setWards(data.results || []);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const loadBedboard = useCallback(async (wardIen: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`/vista/inpatient/bedboard?ward=${wardIen}`);
      setBeds(data.results || []);
      setWardName(data.wardName || '');
      setPendingNote(data._note || '');
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadWards();
  }, [loadWards]);

  useEffect(() => {
    if (selectedWard) loadBedboard(selectedWard);
    else {
      setBeds([]);
      setWardName('');
    }
  }, [selectedWard, loadBedboard]);

  return (
    <div>
      <div style={S.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={S.label}>Select Ward:</span>
          <select
            style={S.selectInput}
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
          >
            <option value="">-- Select Ward --</option>
            {wards.map((w) => (
              <option key={w.ien} value={w.ien}>
                {w.name} ({w.patientCount})
              </option>
            ))}
          </select>
          {wardName && <span style={{ fontWeight: 600, color: '#2b6cb0' }}>{wardName}</span>}
        </div>

        {pendingNote && (
          <div style={{ ...S.pendingBanner, padding: '8px 12px', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', color: '#975a16' }}>{pendingNote}</span>
          </div>
        )}
      </div>

      {error && <div style={S.error}>{error}</div>}

      {loading && <div style={S.loading}>Loading bed board...</div>}

      {/* Bed grid */}
      {selectedWard && !loading && (
        <div style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontWeight: 600, fontSize: '14px', color: '#2d3748' }}>
              Bed Board: {wardName}
            </span>
            <span style={S.badge('blue')}>{beds.length} occupied</span>
          </div>

          <div style={S.bedGrid}>
            {beds.map((bed, i) => (
              <div
                key={`${bed.roomBed}-${i}`}
                style={S.bedCard(bed.status === 'occupied')}
                onClick={() => bed.status === 'occupied' && setSelectedBed(bed)}
                title={bed.patientName || 'Empty'}
              >
                {bed.status === 'occupied' ? (
                  <>
                    <div style={S.initials}>{bed.patientInitials}</div>
                    <div style={S.bedLabel}>{bed.roomBed}</div>
                    <div style={{ fontSize: '10px', color: '#718096' }}>{bed.patientName}</div>
                  </>
                ) : (
                  <>
                    <div style={S.emptyBed}>Empty</div>
                    <div style={S.bedLabel}>{bed.roomBed}</div>
                  </>
                )}
              </div>
            ))}
            {beds.length === 0 && (
              <div
                style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  color: '#a0aec0',
                  padding: '24px',
                }}
              >
                No beds with patients found for this ward
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bed detail modal */}
      {selectedBed && (
        <div style={S.modal} onClick={() => setSelectedBed(null)}>
          <div style={S.modalContent} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '16px', color: '#1a365d' }}>
                Bed Occupancy Detail
              </h3>
              <button
                onClick={() => setSelectedBed(null)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: '#a0aec0',
                }}
              >
                &times;
              </button>
            </div>
            <table style={{ ...S.table, fontSize: '13px' }}>
              <tbody>
                <tr>
                  <td style={{ ...S.td, fontWeight: 600, width: '120px' }}>Room/Bed</td>
                  <td style={S.td}>{selectedBed.roomBed}</td>
                </tr>
                <tr>
                  <td style={{ ...S.td, fontWeight: 600 }}>Ward</td>
                  <td style={S.td}>{selectedBed.ward}</td>
                </tr>
                <tr>
                  <td style={{ ...S.td, fontWeight: 600 }}>Status</td>
                  <td style={S.td}>
                    <span style={S.badge('blue')}>Occupied</span>
                  </td>
                </tr>
                <tr>
                  <td style={{ ...S.td, fontWeight: 600 }}>Patient</td>
                  <td style={S.td}>{selectedBed.patientName || '-'}</td>
                </tr>
                <tr>
                  <td style={{ ...S.td, fontWeight: 600 }}>DFN</td>
                  <td style={S.td}>{selectedBed.patientDfn || '-'}</td>
                </tr>
                <tr>
                  <td style={{ ...S.td, fontWeight: 600 }}>Admit Date</td>
                  <td style={S.td}>{selectedBed.admitDate || '-'}</td>
                </tr>
              </tbody>
            </table>
            <div style={{ marginTop: '12px' }}>
              <button
                style={{ ...S.actionBtn(false), background: '#718096' }}
                onClick={() => setSelectedBed(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ADT Workflow Tab                                                      */
/* ------------------------------------------------------------------ */

function ADTWorkflowTab() {
  const [showModal, setShowModal] = useState<'admit' | 'transfer' | 'discharge' | null>(null);
  const [pendingInfo, setPendingInfo] = useState<PendingInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: 'admit' | 'transfer' | 'discharge') => {
    setShowModal(action);
    setLoading(true);
    try {
      const data = await apiFetch(`/vista/inpatient/${action}`, { method: 'POST' });
      setPendingInfo(data);
    } catch (err: any) {
      setPendingInfo({
        ok: false,
        status: 'error',
        action,
        message: err.message,
        pendingTargets: [],
      });
    }
    setLoading(false);
  };

  const closeModal = () => {
    setShowModal(null);
    setPendingInfo(null);
  };

  return (
    <div>
      <div style={S.card}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#2d3748' }}>ADT Actions</h3>
        <p style={{ fontSize: '13px', color: '#718096', margin: '0 0 16px 0' }}>
          Select an action below. Write operations require DG ADT package RPCs that are not
          available in the WorldVistA sandbox. Each action shows what VistA integration is needed.
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button style={S.actionBtn(false)} onClick={() => handleAction('admit')}>
            Admit Patient
          </button>
          <button
            style={{ ...S.actionBtn(false), background: '#d69e2e' }}
            onClick={() => handleAction('transfer')}
          >
            Transfer Patient
          </button>
          <button
            style={{ ...S.actionBtn(false), background: '#e53e3e' }}
            onClick={() => handleAction('discharge')}
          >
            Discharge Patient
          </button>
        </div>
      </div>

      <div style={{ ...S.pendingBanner, background: '#e8f4f8', border: '1px solid #90cdf4' }}>
        <div style={{ ...S.pendingTitle, color: '#2b6cb0' }}>Unsupported in Sandbox</div>
        <div style={S.pendingText}>
          ADT write operations (Admit/Transfer/Discharge) target the DG ADT package (
          <code>DGPM</code> routines) which is not exposed in the WorldVistA Docker sandbox context{' '}
          <code>OR CPRS GUI CHART</code>. These will activate when DG ADT write RPCs become
          available on the connected VistA instance.
        </div>
        <div style={S.codeBlock}>
          Target RPCs: DGPM NEW ADMISSION, DGPM NEW TRANSFER, DGPM NEW DISCHARGE{'\n'}
          VistA Files: PATIENT MOVEMENT (405), WARD LOCATION (42), PATIENT (2){'\n'}M Routines:
          DGPMV, DGADM, DGTRAN, DGDIS
        </div>
      </div>

      {/* Action modal */}
      {showModal && (
        <div style={S.modal} onClick={closeModal}>
          <div style={S.modalContent} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '16px', color: '#1a365d' }}>
                {showModal === 'admit' && 'Admit Patient'}
                {showModal === 'transfer' && 'Transfer Patient'}
                {showModal === 'discharge' && 'Discharge Patient'}
              </h3>
              <button
                onClick={closeModal}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: '#a0aec0',
                }}
              >
                &times;
              </button>
            </div>

            {loading && <div style={S.loading}>Checking integration status...</div>}

            {pendingInfo && !loading && (
              <div>
                <div style={S.pendingBanner}>
                  <div style={S.pendingTitle}>
                    {pendingInfo.status === 'unsupported-in-sandbox'
                      ? 'Unsupported in Sandbox'
                      : pendingInfo.status === 'integration-pending'
                        ? 'Integration Pending'
                        : 'Error'}
                  </div>
                  <div style={S.pendingText}>{pendingInfo.message}</div>
                </div>

                {pendingInfo.vistaGrounding && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={S.label}>VistA Integration Requirements:</div>
                    <div style={S.codeBlock}>
                      <div>
                        <strong>Target RPC:</strong> {pendingInfo.pendingTargets.join(', ')}
                      </div>
                      <div>
                        <strong>VistA Files:</strong>{' '}
                        {pendingInfo.vistaGrounding.vistaFiles.join(', ')}
                      </div>
                      <div>
                        <strong>M Routines:</strong>{' '}
                        {pendingInfo.vistaGrounding.targetRoutines.join(', ')}
                      </div>
                      {pendingInfo.vistaGrounding.requiredFields && (
                        <div>
                          <strong>Required Fields:</strong>{' '}
                          {pendingInfo.vistaGrounding.requiredFields.join(', ')}
                        </div>
                      )}
                      <div>
                        <strong>Migration Path:</strong> {pendingInfo.vistaGrounding.migrationPath}
                      </div>
                      <div>
                        <strong>Sandbox Note:</strong> {pendingInfo.vistaGrounding.sandboxNote}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button style={{ ...S.actionBtn(false), background: '#718096' }} onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Movement Timeline Tab                                                */
/* ------------------------------------------------------------------ */

function MovementTimelineTab() {
  const [dfn, setDfn] = useState('');
  const [movements, setMovements] = useState<MovementEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingNote, setPendingNote] = useState('');
  const [vistaGrounding, setVistaGrounding] = useState<PendingInfo['vistaGrounding'] | null>(null);

  const loadMovements = useCallback(async () => {
    if (!dfn) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`/vista/inpatient/patient-movements?dfn=${dfn}`);
      setMovements(data.results || []);
      setPendingNote(data._note || '');
      setVistaGrounding(data.vistaGrounding || null);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }, [dfn]);

  return (
    <div>
      <div style={S.card}>
        <div style={S.row}>
          <div>
            <div style={S.label}>Patient DFN:</div>
            <input
              type="text"
              style={S.selectInput}
              value={dfn}
              onChange={(e) => setDfn(e.target.value)}
              placeholder="Enter patient DFN"
              onKeyDown={(e) => e.key === 'Enter' && loadMovements()}
            />
          </div>
          <button
            style={{ ...S.actionBtn(!dfn), marginTop: '16px' }}
            onClick={loadMovements}
            disabled={!dfn}
          >
            Load Movements
          </button>
        </div>
      </div>

      {error && <div style={S.error}>{error}</div>}

      {loading && <div style={S.loading}>Loading movement history...</div>}

      {/* Movement timeline */}
      {movements.length > 0 && !loading && (
        <div style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontWeight: 600, fontSize: '14px', color: '#2d3748' }}>
              Movement Timeline
            </span>
            <span style={S.badge('blue')}>{movements.length} events</span>
            <span style={S.pendingTag}>Partial data</span>
          </div>

          <div style={S.timeline}>
            {movements.map((m, i) => (
              <div key={i} style={S.timelineEvent}>
                <div style={S.timelineDot} />
                <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '2px' }}>
                  {m.date || 'Unknown date'}
                </div>
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#2d3748' }}>{m.type}</div>
                <div style={{ fontSize: '13px', color: '#4a5568' }}>
                  {m.fromLocation && <span>From: {m.fromLocation} &rarr; </span>}
                  {m.toLocation && <span>To: {m.toLocation}</span>}
                  {!m.fromLocation && !m.toLocation && m.ward && (
                    <span>
                      Ward: {m.ward}
                      {m.roomBed ? `, Bed: ${m.roomBed}` : ''}
                    </span>
                  )}
                </div>
                {m.provider && (
                  <div style={{ fontSize: '12px', color: '#718096' }}>Provider: {m.provider}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {movements.length === 0 && !loading && dfn && (
        <div style={{ ...S.card, textAlign: 'center', color: '#a0aec0' }}>
          No movement records found for DFN {dfn}
        </div>
      )}

      {/* Pending integration note */}
      {pendingNote && (
        <div style={S.pendingBanner}>
          <div style={S.pendingTitle}>Partial Data Notice</div>
          <div style={S.pendingText}>{pendingNote}</div>
          {vistaGrounding && (
            <div style={S.codeBlock}>
              <div>
                <strong>Target RPC:</strong> ZVEADTM LIST
              </div>
              <div>
                <strong>VistA Files:</strong> {vistaGrounding.vistaFiles?.join(', ')}
              </div>
              <div>
                <strong>M Routines:</strong> {vistaGrounding.targetRoutines?.join(', ')}
              </div>
              <div>
                <strong>Migration Path:</strong> {vistaGrounding.migrationPath}
              </div>
              {vistaGrounding.sandboxNote && (
                <div>
                  <strong>Sandbox Note:</strong> {vistaGrounding.sandboxNote}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Page                                                            */
/* ------------------------------------------------------------------ */

export default function InpatientPage() {
  const [tab, setTab] = useState<Tab>('census');

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h2 style={S.title}>Inpatient Operations</h2>
        <span style={S.sourceTag}>VistA-sourced</span>
      </div>

      <div style={S.tabBar}>
        {TABS.map((t) => (
          <button key={t.id} style={S.tab(tab === t.id)} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'census' && <CensusTab />}
      {tab === 'bedboard' && <BedboardTab />}
      {tab === 'adt' && <ADTWorkflowTab />}
      {tab === 'movements' && <MovementTimelineTab />}
    </div>
  );
}
