'use client';

import { useState, useEffect } from 'react';
import { API_BASE } from '@/lib/api-config';

type Tab = 'drugs' | 'routes' | 'schedules';

const tabDefs: { id: Tab; label: string }[] = [
  { id: 'drugs', label: 'Drug Formulary' },
  { id: 'routes', label: 'Routes' },
  { id: 'schedules', label: 'Schedules' },
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
  search: { width: '100%', padding: '10px 14px', fontSize: 14, border: '1px solid #d0d5dd', borderRadius: 6, marginBottom: 16, outline: 'none' } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  th: { textAlign: 'left' as const, padding: '10px 12px', background: '#f8fafc', borderBottom: '2px solid #e0e0e0', fontWeight: 600, color: '#374151' },
  td: { padding: '9px 12px', borderBottom: '1px solid #f0f0f0' },
  trHover: { cursor: 'pointer' },
  error: { color: '#dc2626', padding: 12 } as React.CSSProperties,
  loading: { padding: 20, color: '#888' } as React.CSSProperties,
  detail: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 20, marginTop: 16 } as React.CSSProperties,
  detailTitle: { fontSize: 16, fontWeight: 700, marginBottom: 12 } as React.CSSProperties,
  kvRow: { display: 'flex', padding: '5px 0', fontSize: 13, borderBottom: '1px solid #f0f0f0' } as React.CSSProperties,
  kvLabel: { width: 200, fontWeight: 600, color: '#6b7280' } as React.CSSProperties,
  kvValue: { flex: 1 } as React.CSSProperties,
  closeBtn: { marginTop: 12, padding: '6px 16px', fontSize: 13, border: '1px solid #d0d5dd', borderRadius: 4, background: '#fff', cursor: 'pointer' } as React.CSSProperties,
};

function rowBg(i: number, h: boolean) { return h ? '#e8f0fe' : i % 2 === 0 ? '#fff' : '#f9fafb'; }

async function apiFetch(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  return res.json();
}

export default function VistaPharmacyPage() {
  const [tab, setTab] = useState<Tab>('drugs');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [hov, setHov] = useState(-1);

  useEffect(() => { setDetail(null); load(); }, [tab]);

  function load(q?: string) {
    const s = q ?? search;
    setLoading(true); setError(''); setData([]);
    const urls: Record<Tab, string> = {
      drugs: `/admin/vista/drugs?search=${encodeURIComponent(s)}&count=200`,
      routes: '/admin/vista/med-routes',
      schedules: '/admin/vista/med-schedules',
    };
    apiFetch(urls[tab])
      .then(r => setData(r.data ?? r.items ?? (Array.isArray(r) ? r : [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  function onSearch(e: React.FormEvent) { e.preventDefault(); load(); }

  function showDetail(ien: string) {
    apiFetch(`/admin/vista/drugs/${ien}`)
      .then(r => setDetail(r.data ?? r))
      .catch(e => setError(e.message));
  }

  return (
    <div style={S.page}>
      <h1 style={S.h1}>VistA Pharmacy Administration</h1>
      <div style={S.tabBar}>
        {tabDefs.map(t => (
          <button key={t.id} style={tab === t.id ? S.tabActive : S.tab} onClick={() => { setTab(t.id); setSearch(''); }}>{t.label}</button>
        ))}
      </div>

      {tab === 'drugs' && (
        <form onSubmit={onSearch}>
          <input style={S.search} placeholder="Search drug formulary..." value={search} onChange={e => setSearch(e.target.value)} />
        </form>
      )}

      {loading && <div style={S.loading}>Loading...</div>}
      {error && <div style={S.error}>{error}</div>}

      {!loading && tab === 'drugs' && (
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>IEN</th><th style={S.th}>Name</th>
            <th style={S.th}>VA Class Code</th><th style={S.th}>Formulary</th>
          </tr></thead>
          <tbody>
            {data.map((d: any, i: number) => (
              <tr key={d.ien ?? i} style={{ ...S.trHover, background: rowBg(i, hov === i) }}
                onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(-1)}
                onClick={() => showDetail(d.ien)}>
                <td style={S.td}>{d.ien}</td>
                <td style={S.td}>{d.name}</td>
                <td style={S.td}>{d.vaClass ?? '-'}</td>
                <td style={S.td}>{d.formulary ?? d.formularyStatus ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && tab === 'routes' && (
        <table style={S.table}>
          <thead><tr><th style={S.th}>IEN</th><th style={S.th}>Code</th><th style={S.th}>Description</th></tr></thead>
          <tbody>
            {data.map((r: any, i: number) => (
              <tr key={r.ien ?? i} style={{ background: rowBg(i, hov === i) }}
                onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(-1)}>
                <td style={S.td}>{r.ien}</td><td style={S.td}>{r.name}</td><td style={S.td}>{r.abbreviation ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && tab === 'schedules' && (
        <table style={S.table}>
          <thead><tr><th style={S.th}>IEN</th><th style={S.th}>Name</th><th style={S.th}>Admin Times</th></tr></thead>
          <tbody>
            {data.map((s: any, i: number) => (
              <tr key={s.ien ?? i} style={{ background: rowBg(i, hov === i) }}
                onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(-1)}>
                <td style={S.td}>{s.ien}</td><td style={S.td}>{s.name}</td><td style={S.td}>{s.frequency ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {detail && (
        <div style={S.detail}>
          <div style={S.detailTitle}>Drug Detail: {detail.name ?? detail.ien}</div>
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
