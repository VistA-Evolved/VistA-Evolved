'use client';

/**
 * Inpatient Census — Phase 137
 *
 * Dedicated ward census page showing:
 * - Ward list with patient counts
 * - Drill-down to ward-level patient list
 * - Admission dates, room/bed assignments
 *
 * Data: VistA ORQPT WARDS + ORQPT WARD PATIENTS + ORWPT16 ADMITLST
 * Auth: session-based with credentials: 'include'
 */

import { useState, useEffect, useCallback } from 'react';
import { csrfHeaders } from '@/lib/csrf';
import { API_BASE } from '@/lib/api-config';


async function apiFetch(path: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { ...csrfHeaders() },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Styles                                                               */
/* ------------------------------------------------------------------ */

const S = {
  page: {
    padding: '20px 28px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    maxWidth: '1200px',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  } as React.CSSProperties,
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1a365d',
    margin: 0,
  } as React.CSSProperties,
  subtitle: {
    fontSize: '13px',
    color: '#718096',
    margin: '4px 0 0 0',
  } as React.CSSProperties,
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '16px',
    marginBottom: '14px',
  } as React.CSSProperties,
  wardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
    marginBottom: '20px',
  } as React.CSSProperties,
  wardCard: (selected: boolean) =>
    ({
      padding: '14px',
      border: selected ? '2px solid #2b6cb0' : '1px solid #e2e8f0',
      borderRadius: '6px',
      background: selected ? '#ebf4ff' : '#fff',
      cursor: 'pointer',
      transition: 'all 0.15s',
    }) as React.CSSProperties,
  wardName: {
    fontWeight: 600,
    color: '#2d3748',
    fontSize: '14px',
    margin: 0,
  } as React.CSSProperties,
  wardCount: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#2b6cb0',
    margin: '4px 0',
  } as React.CSSProperties,
  wardLabel: {
    fontSize: '11px',
    color: '#a0aec0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  } as React.CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '13px',
  } as React.CSSProperties,
  th: {
    textAlign: 'left' as const,
    padding: '10px 12px',
    background: '#f7fafc',
    borderBottom: '2px solid #e2e8f0',
    fontWeight: 600,
    color: '#2d3748',
    fontSize: '11px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  } as React.CSSProperties,
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid #edf2f7',
    color: '#4a5568',
  } as React.CSSProperties,
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 600,
    background: '#c6f6d5',
    color: '#276749',
  } as React.CSSProperties,
  status: {
    fontSize: '12px',
    color: '#a0aec0',
    textAlign: 'right' as const,
  } as React.CSSProperties,
  loading: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#a0aec0',
    fontSize: '14px',
  } as React.CSSProperties,
  error: {
    padding: '12px 16px',
    background: '#fff5f5',
    border: '1px solid #fed7d7',
    borderRadius: '6px',
    color: '#c53030',
    fontSize: '13px',
  } as React.CSSProperties,
  backBtn: {
    padding: '6px 14px',
    border: '1px solid #cbd5e0',
    borderRadius: '4px',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#4a5568',
  } as React.CSSProperties,
};

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export default function InpatientCensusPage() {
  const [wards, setWards] = useState<WardSummary[]>([]);
  const [selectedWard, setSelectedWard] = useState<string | null>(null);
  const [census, setCensus] = useState<CensusPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [censusLoading, setCensusLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>('');

  const loadWards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/vista/inpatient/wards');
      setWards(data.results || []);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (err: any) {
      setError(err.message || 'Failed to load wards');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCensus = useCallback(async (wardIen: string) => {
    setCensusLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/vista/inpatient/ward-census?ward=${wardIen}`);
      setCensus(data.results || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load census');
      setCensus([]);
    } finally {
      setCensusLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWards();
  }, [loadWards]);

  useEffect(() => {
    if (selectedWard) loadCensus(selectedWard);
    else setCensus([]);
  }, [selectedWard, loadCensus]);

  const totalPatients = wards.reduce((sum, w) => sum + w.patientCount, 0);
  const selectedWardObj = wards.find((w) => w.ien === selectedWard);

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Ward Census</h1>
          <p style={S.subtitle}>
            {wards.length} wards | {totalPatients} total patients
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={S.status}>Last refresh: {lastRefresh || '--'}</span>
          <button style={S.backBtn} onClick={loadWards}>
            Refresh
          </button>
        </div>
      </div>

      {error && <div style={S.error}>{error}</div>}

      {loading ? (
        <div style={S.loading}>Loading ward census...</div>
      ) : (
        <>
          {/* Ward grid */}
          <div style={S.wardGrid}>
            {wards.map((w) => (
              <div
                key={w.ien}
                style={S.wardCard(selectedWard === w.ien)}
                onClick={() =>
                  setSelectedWard(selectedWard === w.ien ? null : w.ien)
                }
              >
                <p style={S.wardName}>{w.name}</p>
                <p style={S.wardCount}>{w.patientCount}</p>
                <p style={S.wardLabel}>patients</p>
              </div>
            ))}
          </div>

          {/* Census detail table */}
          {selectedWard && (
            <div style={S.card}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}
              >
                <h2
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#2d3748',
                    margin: 0,
                  }}
                >
                  {selectedWardObj?.name || `Ward ${selectedWard}`} Census
                </h2>
                <span style={S.badge}>{census.length} patients</span>
              </div>

              {censusLoading ? (
                <div style={S.loading}>Loading patients...</div>
              ) : census.length === 0 ? (
                <p style={{ color: '#a0aec0', textAlign: 'center', padding: '20px' }}>
                  No patients currently in this ward
                </p>
              ) : (
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Patient</th>
                      <th style={S.th}>DFN</th>
                      <th style={S.th}>Admit Date</th>
                      <th style={S.th}>Ward</th>
                      <th style={S.th}>Room/Bed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {census.map((p) => (
                      <tr key={p.dfn}>
                        <td style={S.td}>{p.name}</td>
                        <td style={S.td}>{p.dfn}</td>
                        <td style={S.td}>{p.admitDate || '--'}</td>
                        <td style={S.td}>{p.ward || '--'}</td>
                        <td style={S.td}>{p.roomBed || 'Unassigned'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
