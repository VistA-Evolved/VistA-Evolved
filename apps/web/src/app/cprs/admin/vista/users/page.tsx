'use client';

import { useState, useEffect } from 'react';
import { API_BASE } from '@/lib/api-config';

type Tab = 'users' | 'keys' | 'menus';

const tabDefs: { id: Tab; label: string }[] = [
  { id: 'users', label: 'Users' },
  { id: 'keys', label: 'Security Keys' },
  { id: 'menus', label: 'Menus' },
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
  trHover: { cursor: 'pointer' },
  error: { color: '#dc2626', padding: 12 } as React.CSSProperties,
  loading: { padding: 20, color: '#888' } as React.CSSProperties,
  detail: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 20, marginTop: 16 } as React.CSSProperties,
  detailTitle: { fontSize: 16, fontWeight: 700, marginBottom: 12 } as React.CSSProperties,
  kvRow: { display: 'flex', padding: '4px 0', fontSize: 13 } as React.CSSProperties,
  kvLabel: { width: 160, fontWeight: 600, color: '#6b7280' } as React.CSSProperties,
  kvValue: { flex: 1 } as React.CSSProperties,
  closeBtn: { marginTop: 12, padding: '6px 16px', fontSize: 13, border: '1px solid #d0d5dd', borderRadius: 4, background: '#fff', cursor: 'pointer' } as React.CSSProperties,
};

function rowBg(i: number, hovered: boolean) {
  if (hovered) return '#e8f0fe';
  return i % 2 === 0 ? '#fff' : '#f9fafb';
}

async function apiFetch(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  return res.json();
}

export default function VistaUsersPage() {
  const [tab, setTab] = useState<Tab>('users');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [hoveredRow, setHoveredRow] = useState(-1);

  useEffect(() => {
    setData([]);
    setDetail(null);
    setError('');
    if (tab === 'menus' && search.trim().length < 2) return;
    load();
  }, [tab]);

  function load(q?: string) {
    const s = q ?? search;
    setLoading(true);
    setError('');
    let url = '';
    if (tab === 'users') url = `/admin/vista/users?search=${encodeURIComponent(s)}&count=100`;
    else if (tab === 'keys') url = `/admin/vista/keys?search=${encodeURIComponent(s)}`;
    else if (tab === 'menus') {
      if (s.trim().length < 2) { setLoading(false); return; }
      url = `/admin/vista/menus?search=${encodeURIComponent(s)}`;
    }
    apiFetch(url)
      .then(r => setData(r.data ?? r.items ?? r.results ?? (Array.isArray(r) ? r : [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  function showUserDetail(ien: string) {
    apiFetch(`/admin/vista/users/${ien}`)
      .then(r => setDetail(r.data ?? r))
      .catch(e => setError(e.message));
  }

  return (
    <div style={S.page}>
      <h1 style={S.h1}>VistA User Management</h1>
      <div style={S.tabBar}>
        {tabDefs.map(t => (
          <button key={t.id} style={tab === t.id ? S.tabActive : S.tab} onClick={() => { setTab(t.id); setSearch(''); }}>
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={onSearch}>
        <input
          style={S.search}
          placeholder={tab === 'menus' ? 'Search menus (min 2 chars)...' : `Search ${tab}...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </form>

      {loading && <div style={S.loading}>Loading...</div>}
      {error && <div style={S.error}>{error}</div>}

      {!loading && tab === 'users' && (
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>IEN</th><th style={S.th}>Name</th><th style={S.th}>Status</th><th style={S.th}>Title</th><th style={S.th}>Service</th>
          </tr></thead>
          <tbody>
            {data.map((u: any, i: number) => (
              <tr key={u.ien ?? i} style={{ ...S.trHover, background: rowBg(i, hoveredRow === i) }}
                onMouseEnter={() => setHoveredRow(i)} onMouseLeave={() => setHoveredRow(-1)}
                onClick={() => showUserDetail(u.ien)}>
                <td style={S.td}>{u.ien}</td>
                <td style={S.td}>{u.name}</td>
                <td style={S.td}>{u.status ?? '-'}</td>
                <td style={S.td}>{u.title ?? '-'}</td>
                <td style={S.td}>{u.service ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && tab === 'keys' && (
        <table style={S.table}>
          <thead><tr><th style={S.th}>IEN</th><th style={S.th}>Name</th><th style={S.th}>Description</th></tr></thead>
          <tbody>
            {data.map((k: any, i: number) => (
              <tr key={k.ien ?? i} style={{ background: rowBg(i, hoveredRow === i) }}
                onMouseEnter={() => setHoveredRow(i)} onMouseLeave={() => setHoveredRow(-1)}>
                <td style={S.td}>{k.ien}</td><td style={S.td}>{k.name}</td><td style={S.td}>{k.description ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && tab === 'menus' && (
        <table style={S.table}>
          <thead><tr><th style={S.th}>IEN</th><th style={S.th}>Name</th><th style={S.th}>Type</th></tr></thead>
          <tbody>
            {data.map((m: any, i: number) => (
              <tr key={m.ien ?? i} style={{ background: rowBg(i, hoveredRow === i) }}
                onMouseEnter={() => setHoveredRow(i)} onMouseLeave={() => setHoveredRow(-1)}>
                <td style={S.td}>{m.ien}</td><td style={S.td}>{m.name}</td><td style={S.td}>{m.type ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {detail && (
        <div style={S.detail}>
          <div style={S.detailTitle}>User Detail: {detail.name ?? detail.ien}</div>
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
