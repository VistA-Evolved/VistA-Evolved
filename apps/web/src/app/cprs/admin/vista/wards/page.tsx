'use client';

import { useState, useEffect } from 'react';
import { API_BASE } from '@/lib/api-config';

type Tab = 'wards' | 'census';

const tabDefs: { id: Tab; label: string }[] = [
  { id: 'wards', label: 'Wards' },
  { id: 'census', label: 'Census' },
];

const S = {
  page: { padding: 24, fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1a1a1a' } as React.CSSProperties,
  h1: { fontSize: 22, fontWeight: 700, marginBottom: 16 } as React.CSSProperties,
  tabBar: { display: 'flex', gap: 0, borderBottom: '2px solid #e0e0e0', marginBottom: 20 } as React.CSSProperties,
  tab: {
    padding: '10px 20px',
    cursor: 'pointer',
    fontSize: 14,
    borderTop: 'none',
    borderRight: 'none',
    borderBottom: 'none',
    borderLeft: 'none',
    background: 'none',
    color: '#555',
  } as React.CSSProperties,
  tabActive: {
    padding: '10px 20px',
    cursor: 'pointer',
    fontSize: 14,
    borderTop: 'none',
    borderRight: 'none',
    borderBottom: '3px solid #1a56db',
    borderLeft: 'none',
    background: 'none',
    color: '#1a56db',
    fontWeight: 700,
    marginBottom: -2,
  } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  th: { textAlign: 'left' as const, padding: '10px 12px', background: '#f8fafc', borderBottom: '2px solid #e0e0e0', fontWeight: 600, color: '#374151' },
  td: { padding: '9px 12px', borderBottom: '1px solid #f0f0f0' },
  trHover: { cursor: 'pointer' },
  error: { color: '#dc2626', padding: 12 } as React.CSSProperties,
  loading: { padding: 20, color: '#888' } as React.CSSProperties,
  detail: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 20, marginTop: 16 } as React.CSSProperties,
  detailTitle: { fontSize: 16, fontWeight: 700, marginBottom: 12 } as React.CSSProperties,
  kvRow: { display: 'flex', padding: '5px 0', fontSize: 13, borderBottom: '1px solid #f0f0f0' } as React.CSSProperties,
  kvLabel: { width: 180, fontWeight: 600, color: '#6b7280' } as React.CSSProperties,
  kvValue: { flex: 1 } as React.CSSProperties,
  closeBtn: { marginTop: 12, padding: '6px 16px', fontSize: 13, border: '1px solid #d0d5dd', borderRadius: 4, background: '#fff', cursor: 'pointer' } as React.CSSProperties,
};

function rowBg(i: number, h: boolean) { return h ? '#e8f0fe' : i % 2 === 0 ? '#fff' : '#f9fafb'; }

function formatOccupancy(count: unknown, beds: unknown) {
  const patientCount = Number.parseInt(String(count ?? ''), 10);
  const bedCount = Number.parseInt(String(beds ?? ''), 10);
  if (!Number.isFinite(patientCount) || !Number.isFinite(bedCount) || bedCount <= 0) {
    return '-';
  }
  return `${Math.round((patientCount / bedCount) * 100)}%`;
}

async function apiFetch(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  return res.json();
}

export default function VistaWardsPage() {
  const [tab, setTab] = useState<Tab>('wards');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [hov, setHov] = useState(-1);

  useEffect(() => { setDetail(null); load(); }, [tab]);

  function load() {
    setLoading(true); setError(''); setData([]);
    const url = tab === 'wards' ? '/admin/vista/wards' : '/admin/vista/census';
    apiFetch(url)
      .then(r => setData(r.data ?? r.items ?? (Array.isArray(r) ? r : [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  function showDetail(ien: string) {
    apiFetch(`/admin/vista/wards/${ien}`)
      .then(r => setDetail(r.data ?? r))
      .catch(e => setError(e.message));
  }

  return (
    <div style={S.page}>
      <h1 style={S.h1}>VistA Ward &amp; Bed Management</h1>
      <div style={S.tabBar}>
        {tabDefs.map(t => (
          <button key={t.id} style={tab === t.id ? S.tabActive : S.tab} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {loading && <div style={S.loading}>Loading...</div>}
      {error && <div style={S.error}>{error}</div>}

      {!loading && tab === 'wards' && (
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>IEN</th><th style={S.th}>Name</th><th style={S.th}>Service</th>
            <th style={S.th}>Beds</th><th style={S.th}>Occupancy</th>
          </tr></thead>
          <tbody>
            {data.map((w: any, i: number) => (
              <tr key={w.ien ?? i} style={{ ...S.trHover, background: rowBg(i, hov === i) }}
                onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(-1)}
                onClick={() => showDetail(w.ien)}>
                <td style={S.td}>{w.ien}</td>
                <td style={S.td}>{w.name}</td>
                <td style={S.td}>{w.service ?? '-'}</td>
                <td style={S.td}>{w.beds ?? '-'}</td>
                <td style={S.td}>{w.occupancy ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && tab === 'census' && (
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>Ward</th><th style={S.th}>Patients</th><th style={S.th}>Beds</th><th style={S.th}>Occupancy</th>
          </tr></thead>
          <tbody>
            {data.map((c: any, i: number) => (
              <tr key={c.wardIen ?? i} style={{ background: rowBg(i, hov === i) }}
                onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(-1)}>
                <td style={S.td}>{c.wardName ?? c.wardIen ?? '-'}</td>
                <td style={S.td}>{c.count ?? '-'}</td>
                <td style={S.td}>{c.beds ?? '-'}</td>
                <td style={S.td}>{formatOccupancy(c.count, c.beds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {detail && (
        <div style={S.detail}>
          <div style={S.detailTitle}>Ward Detail: {detail.name ?? detail.ien}</div>
          {Object.entries(detail).map(([k, v]) => (
            <div key={k} style={S.kvRow}>
              <span style={S.kvLabel}>{k}</span>
              <span style={S.kvValue}>{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '-')}</span>
            </div>
          ))}
          <button style={S.closeBtn} onClick={() => setDetail(null)}>Close</button>
        </div>
      )}
    </div>
  );
}
