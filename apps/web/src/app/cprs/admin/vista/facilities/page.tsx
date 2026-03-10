'use client';

import { useState, useEffect } from 'react';
import { API_BASE } from '@/lib/api-config';

type Tab = 'institutions' | 'divisions' | 'services' | 'stopCodes' | 'specialties' | 'siteParams';

const tabDefs: { id: Tab; label: string }[] = [
  { id: 'institutions', label: 'Institutions' },
  { id: 'divisions', label: 'Divisions' },
  { id: 'services', label: 'Services' },
  { id: 'stopCodes', label: 'Stop Codes' },
  { id: 'specialties', label: 'Specialties' },
  { id: 'siteParams', label: 'Site Parameters' },
];

const S = {
  page: { padding: 24, fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1a1a1a' } as React.CSSProperties,
  h1: { fontSize: 22, fontWeight: 700, marginBottom: 16 } as React.CSSProperties,
  tabBar: { display: 'flex', gap: 0, borderBottom: '2px solid #e0e0e0', marginBottom: 20 } as React.CSSProperties,
  tab: { padding: '10px 20px', cursor: 'pointer', fontSize: 14, border: 'none', background: 'none', color: '#555' } as React.CSSProperties,
  tabActive: { padding: '10px 20px', cursor: 'pointer', fontSize: 14, border: 'none', background: 'none', color: '#1a56db', fontWeight: 700, borderBottom: '3px solid #1a56db', marginBottom: -2 } as React.CSSProperties,
  search: { width: '100%', padding: '10px 14px', fontSize: 14, border: '1px solid #d0d5dd', borderRadius: 6, marginBottom: 16, outline: 'none' } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  th: { textAlign: 'left' as const, padding: '10px 12px', background: '#f8fafc', borderBottom: '2px solid #e0e0e0', fontWeight: 600, color: '#374151' },
  td: { padding: '9px 12px', borderBottom: '1px solid #f0f0f0' },
  error: { color: '#dc2626', padding: 12 } as React.CSSProperties,
  loading: { padding: 20, color: '#888' } as React.CSSProperties,
  kvContainer: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 20 } as React.CSSProperties,
  kvRow: { display: 'flex', padding: '6px 0', fontSize: 13, borderBottom: '1px solid #f0f0f0' } as React.CSSProperties,
  kvLabel: { width: 220, fontWeight: 600, color: '#6b7280' } as React.CSSProperties,
  kvValue: { flex: 1 } as React.CSSProperties,
};

function rowBg(i: number, h: boolean) { return h ? '#e8f0fe' : i % 2 === 0 ? '#fff' : '#f9fafb'; }

async function apiFetch(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  return res.json();
}

export default function VistaFacilitiesPage() {
  const [tab, setTab] = useState<Tab>('institutions');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [kvData, setKvData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hov, setHov] = useState(-1);

  useEffect(() => { load(); }, [tab]);

  function load(q?: string) {
    const s = q ?? search;
    setLoading(true); setError(''); setData([]); setKvData(null);
    const urls: Record<Tab, string> = {
      institutions: `/admin/vista/institutions?search=${encodeURIComponent(s)}&count=100`,
      divisions: '/admin/vista/divisions',
      services: '/admin/vista/services',
      stopCodes: `/admin/vista/stop-codes?search=${encodeURIComponent(s)}`,
      specialties: '/admin/vista/specialties',
      siteParams: '/admin/vista/site-parameters',
    };
    apiFetch(urls[tab])
      .then(r => {
        if (tab === 'siteParams') setKvData(r.data ?? r);
        else setData(r.data ?? r.items ?? (Array.isArray(r) ? r : []));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  function onSearch(e: React.FormEvent) { e.preventDefault(); load(); }

  const searchTabs: Tab[] = ['institutions', 'stopCodes'];

  return (
    <div style={S.page}>
      <h1 style={S.h1}>VistA Facility Setup</h1>
      <div style={S.tabBar}>
        {tabDefs.map(t => (
          <button key={t.id} style={tab === t.id ? S.tabActive : S.tab} onClick={() => { setTab(t.id); setSearch(''); }}>{t.label}</button>
        ))}
      </div>

      {searchTabs.includes(tab) && (
        <form onSubmit={onSearch}>
          <input style={S.search} placeholder={`Search ${tab}...`} value={search} onChange={e => setSearch(e.target.value)} />
        </form>
      )}

      {loading && <div style={S.loading}>Loading...</div>}
      {error && <div style={S.error}>{error}</div>}

      {!loading && tab === 'siteParams' && kvData && (
        <div style={S.kvContainer}>
          {Object.entries(kvData).map(([k, v]) => (
            <div key={k} style={S.kvRow}>
              <span style={S.kvLabel}>{k}</span>
              <span style={S.kvValue}>{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '-')}</span>
            </div>
          ))}
        </div>
      )}

      {!loading && tab !== 'siteParams' && data.length > 0 && (
        <table style={S.table}>
          <thead><tr>
            {Object.keys(data[0]).map(k => <th key={k} style={S.th}>{k}</th>)}
          </tr></thead>
          <tbody>
            {data.map((row: any, i: number) => (
              <tr key={row.ien ?? i} style={{ background: rowBg(i, hov === i) }}
                onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(-1)}>
                {Object.values(row).map((v: any, j: number) => (
                  <td key={j} style={S.td}>{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '-')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && tab !== 'siteParams' && data.length === 0 && !error && <div style={S.loading}>No records found.</div>}
    </div>
  );
}
