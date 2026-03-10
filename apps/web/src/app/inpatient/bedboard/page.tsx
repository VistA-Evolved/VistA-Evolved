'use client';

/**
 * Inpatient Bed Board -- Phase 137
 *
 * Dedicated bed-level occupancy view showing:
 * - Ward selector
 * - Bed grid with occupancy status (occupied/empty)
 * - Patient initials + name on occupied beds
 * - Pending indicator for empty bed data (needs ZVEADT BEDS)
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

interface Ward {
  ien: string;
  name: string;
  patientCount: number;
}

interface BedSlot {
  ward: string;
  wardIen: string;
  roomBed: string;
  status: 'occupied' | 'empty' | 'oos';
  patientDfn: string | null;
  patientName: string | null;
  patientInitials: string | null;
  admitDate: string | null;
}

/* ------------------------------------------------------------------ */
/* Styles                                                               */
/* ------------------------------------------------------------------ */

const S = {
  page: {
    padding: '20px 28px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    maxWidth: '1400px',
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
  wardSelector: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
    marginBottom: '16px',
  } as React.CSSProperties,
  wardBtn: (selected: boolean) =>
    ({
      padding: '6px 14px',
      cursor: 'pointer',
      border: selected ? '2px solid #2b6cb0' : '1px solid #cbd5e0',
      borderRadius: '4px',
      background: selected ? '#ebf4ff' : '#fff',
      fontWeight: selected ? 600 : 400,
      color: selected ? '#2b6cb0' : '#4a5568',
      fontSize: '13px',
      transition: 'all 0.15s',
    }) as React.CSSProperties,
  bedGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '10px',
    marginTop: '12px',
  } as React.CSSProperties,
  bedCard: (status: string) =>
    ({
      padding: '14px',
      borderRadius: '6px',
      border:
        status === 'occupied'
          ? '2px solid #2b6cb0'
          : status === 'oos'
            ? '2px solid #e53e3e'
            : '2px dashed #cbd5e0',
      background: status === 'occupied' ? '#ebf4ff' : status === 'oos' ? '#fff5f5' : '#f7fafc',
      textAlign: 'center' as const,
      minHeight: '90px',
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'center',
    }) as React.CSSProperties,
  bedRoom: {
    fontSize: '11px',
    color: '#718096',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '4px',
  } as React.CSSProperties,
  bedInitials: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#2b6cb0',
    margin: '2px 0',
  } as React.CSSProperties,
  bedName: {
    fontSize: '11px',
    color: '#4a5568',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  } as React.CSSProperties,
  bedEmpty: {
    fontSize: '13px',
    color: '#a0aec0',
    fontStyle: 'italic' as const,
  } as React.CSSProperties,
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '16px',
    marginBottom: '14px',
  } as React.CSSProperties,
  legend: {
    display: 'flex',
    gap: '16px',
    marginBottom: '12px',
    fontSize: '12px',
    color: '#718096',
  } as React.CSSProperties,
  legendDot: (color: string) =>
    ({
      display: 'inline-block',
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      background: color,
      marginRight: '4px',
    }) as React.CSSProperties,
  pending: {
    padding: '10px 14px',
    background: '#fffbeb',
    border: '1px solid #fbbf24',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#92400e',
    marginBottom: '12px',
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
  refreshBtn: {
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

export default function InpatientBedboardPage() {
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWard, setSelectedWard] = useState<string | null>(null);
  const [beds, setBeds] = useState<BedSlot[]>([]);
  const [wardName, setWardName] = useState('');
  const [pendingTargets, setPendingTargets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [bedLoading, setBedLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/vista/inpatient/wards');
      setWards(data.results || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load wards');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBedboard = useCallback(async (wardIen: string) => {
    setBedLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/vista/inpatient/bedboard?ward=${wardIen}`);
      setBeds(data.results || []);
      setWardName(data.wardName || `Ward ${wardIen}`);
      setPendingTargets(data.pendingTargets || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load bedboard');
      setBeds([]);
    } finally {
      setBedLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWards();
  }, [loadWards]);

  useEffect(() => {
    if (selectedWard) loadBedboard(selectedWard);
    else {
      setBeds([]);
      setWardName('');
      setPendingTargets([]);
    }
  }, [selectedWard, loadBedboard]);

  const occupiedCount = beds.filter((b) => b.status === 'occupied').length;
  const emptyCount = beds.filter((b) => b.status === 'empty').length;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Bed Board</h1>
          <p style={S.subtitle}>Visual bed occupancy view | Select a ward to view bed grid</p>
        </div>
        <button style={S.refreshBtn} onClick={loadWards}>
          Refresh
        </button>
      </div>

      {error && <div style={S.error}>{error}</div>}

      {loading ? (
        <div style={S.loading}>Loading wards...</div>
      ) : (
        <>
          {/* Ward selector */}
          <div style={S.wardSelector}>
            {wards.map((w) => (
              <button
                key={w.ien}
                style={S.wardBtn(selectedWard === w.ien)}
                onClick={() => setSelectedWard(selectedWard === w.ien ? null : w.ien)}
              >
                {w.name} ({w.patientCount})
              </button>
            ))}
          </div>

          {/* Bed grid */}
          {selectedWard && (
            <div style={S.card}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
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
                  {wardName}
                </h2>
                <span style={{ fontSize: '13px', color: '#718096' }}>
                  {occupiedCount} occupied{emptyCount > 0 ? ` | ${emptyCount} empty` : ''}
                </span>
              </div>

              {pendingTargets.length > 0 && (
                <div style={S.pending}>
                  Note: Only occupied beds shown. Empty/out-of-service bed data requires{' '}
                  <strong>{pendingTargets.join(', ')}</strong> RPC (ZVEADT.m not yet installed).
                </div>
              )}

              <div style={S.legend}>
                <span>
                  <span style={S.legendDot('#2b6cb0')} /> Occupied
                </span>
                {emptyCount > 0 && (
                  <span>
                    <span style={S.legendDot('#cbd5e0')} /> Empty
                  </span>
                )}
                {beds.some((b) => b.status === 'oos') && (
                  <span>
                    <span style={S.legendDot('#e53e3e')} /> Out of Service
                  </span>
                )}
              </div>

              {bedLoading ? (
                <div style={S.loading}>Loading beds...</div>
              ) : beds.length === 0 ? (
                <p
                  style={{
                    color: '#a0aec0',
                    textAlign: 'center',
                    padding: '30px',
                  }}
                >
                  No bed data available for this ward
                </p>
              ) : (
                <div style={S.bedGrid}>
                  {beds.map((bed, idx) => (
                    <div key={`${bed.roomBed}-${idx}`} style={S.bedCard(bed.status)}>
                      <div style={S.bedRoom}>{bed.roomBed}</div>
                      {bed.status === 'occupied' ? (
                        <>
                          <div style={S.bedInitials}>{bed.patientInitials || '--'}</div>
                          <div style={S.bedName} title={bed.patientName || ''}>
                            {bed.patientName || 'Unknown'}
                          </div>
                        </>
                      ) : bed.status === 'oos' ? (
                        <div style={{ ...S.bedEmpty, color: '#e53e3e' }}>Out of Service</div>
                      ) : (
                        <div style={S.bedEmpty}>Available</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
