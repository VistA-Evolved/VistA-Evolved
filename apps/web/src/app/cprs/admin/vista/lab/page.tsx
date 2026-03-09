'use client';

import React, { useState, useEffect } from 'react';
import styles from '@/components/cprs/cprs.module.css';
import { API_BASE } from '@/lib/api-config';

type Tab = 'tests' | 'samples' | 'urgency';

const tabDefs: { id: Tab; label: string }[] = [
  { id: 'tests', label: 'Tests' },
  { id: 'samples', label: 'Collection Samples' },
  { id: 'urgency', label: 'Urgency' },
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

export default function VistaLabPage() {
  const [tab, setTab] = useState<Tab>('tests');
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
      tests: `/admin/vista/lab-tests?search=${encodeURIComponent(s)}&count=200`,
      samples: '/admin/vista/collection-samples',
      urgency: '/admin/vista/lab-urgency',
    };
    apiFetch(urls[tab])
      .then(r => setData(r.data ?? r.items ?? (Array.isArray(r) ? r : [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  function onSearch(e: React.FormEvent) { e.preventDefault(); load(); }

  function showDetail(ien: string) {
    apiFetch(`/admin/vista/lab-tests/${ien}`)
      .then(r => setDetail(r.data ?? r))
      .catch(e => setError(e.message));
  }

  return (
    <div style={S.page}>
      <h1 style={S.h1}>VistA Laboratory Administration</h1>
      <div style={S.tabBar}>
        {tabDefs.map(t => (
          <button key={t.id} style={tab === t.id ? S.tabActive : S.tab} onClick={() => { setTab(t.id); setSearch(''); }}>{t.label}</button>
        ))}
      </div>

      {tab === 'tests' && (
        <form onSubmit={onSearch}>
          <input style={S.search} placeholder="Search lab tests..." value={search} onChange={e => setSearch(e.target.value)} />
        </form>
      )}

      {loading && <div style={S.loading}>Loading...</div>}
      {error && <div style={S.error}>{error}</div>}

      {!loading && tab === 'tests' && (
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>IEN</th><th style={S.th}>Name</th>
            <th style={S.th}>Type</th><th style={S.th}>Subscript</th>
          </tr></thead>
          <tbody>
            {data.map((t: any, i: number) => (
              <tr key={t.ien ?? i} style={{ ...S.trHover, background: rowBg(i, hov === i) }}
                onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(-1)}
                onClick={() => showDetail(t.ien)}>
                <td style={S.td}>{t.ien}</td>
                <td style={S.td}>{t.name}</td>
                <td style={S.td}>{t.type ?? '-'}</td>
                <td style={S.td}>{t.subscript ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && tab === 'samples' && (
        <table style={S.table}>
          <thead><tr><th style={S.th}>IEN</th><th style={S.th}>Name</th><th style={S.th}>Tube</th></tr></thead>
          <tbody>
            {data.map((s: any, i: number) => (
              <tr key={s.ien ?? i} style={{ background: rowBg(i, hov === i) }}
                onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(-1)}>
                <td style={S.td}>{s.ien}</td><td style={S.td}>{s.name}</td><td style={S.td}>{s.tube ?? s.tubeType ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && tab === 'urgency' && (
        <table style={S.table}>
          <thead><tr><th style={S.th}>IEN</th><th style={S.th}>Name</th><th style={S.th}>Code</th></tr></thead>
          <tbody>
            {data.map((u: any, i: number) => (
              <tr key={u.ien ?? i} style={{ background: rowBg(i, hov === i) }}
                onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(-1)}>
                <td style={S.td}>{u.ien}</td><td style={S.td}>{u.name}</td><td style={S.td}>{u.code ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {detail && (
        <div style={S.detail}>
          <div style={S.detailTitle}>Lab Test Detail: {detail.name ?? detail.ien}</div>
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
