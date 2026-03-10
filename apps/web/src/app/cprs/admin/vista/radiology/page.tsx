'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/api-config';

type Tab = 'procedures' | 'locations' | 'divparams';

export default function RadiologyAdminPage() {
  const [tab, setTab] = useState<Tab>('procedures');
  const [procedures, setProcedures] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [divParams, setDivParams] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchList = useCallback(async (endpoint: string, setter: (d: any) => void) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, { credentials: 'include' });
      const json = await res.json();
      setter(json.data || []);
    } catch { setter([]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    setSelected(null);
    if (tab === 'procedures') fetchList('/admin/vista/radiology/procedures', setProcedures);
    if (tab === 'locations') fetchList('/admin/vista/radiology/imaging-locations', setLocations);
    if (tab === 'divparams') fetchList('/admin/vista/radiology/division-params', setDivParams);
  }, [tab, fetchList]);

  const fetchDetail = async (ien: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/vista/radiology/procedures/${ien}`, { credentials: 'include' });
      const json = await res.json();
      setSelected(json.data || null);
    } catch { setSelected(null); }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'procedures', label: 'Procedures' },
    { id: 'locations', label: 'Imaging Locations' },
    { id: 'divparams', label: 'Division Params' },
  ];

  const filtered = tab === 'procedures'
    ? procedures.filter((p: any) => !search || (p.name || '').toLowerCase().includes(search.toLowerCase()))
    : [];

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f2744)', color: '#fff', padding: '28px 32px 20px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Radiology Administration</h1>
        <p style={{ fontSize: 14, color: '#94a3b8', margin: '4px 0 0' }}>Procedures, imaging locations, and division parameters</p>
      </div>

      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e2e8f0', background: '#fff', padding: '0 32px' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSearch(''); }} style={{
            padding: '12px 20px', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
            background: 'transparent', color: tab === t.id ? '#2563eb' : '#64748b',
            borderBottom: tab === t.id ? '2px solid #2563eb' : '2px solid transparent', marginBottom: -2,
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
        {tab === 'procedures' && (
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search procedures..."
            style={{ width: '100%', maxWidth: 400, padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, marginBottom: 16 }} />
        )}

        {loading && <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading...</div>}

        {!loading && tab === 'procedures' && (
          <div style={{ display: 'flex', gap: 20 }}>
            <div style={{ flex: 1, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>IEN</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Name</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Type</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>CPT</th>
                </tr></thead>
                <tbody>
                  {filtered.length === 0 && <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No procedures found</td></tr>}
                  {filtered.map((p: any) => (
                    <tr key={p.ien} onClick={() => fetchDetail(p.ien)} style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 14px', color: '#64748b' }}>{p.ien}</td>
                      <td style={{ padding: '8px 14px', fontWeight: 600 }}>{p.name}</td>
                      <td style={{ padding: '8px 14px' }}>{p.type}</td>
                      <td style={{ padding: '8px 14px', fontFamily: 'monospace' }}>{p.cpt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selected && (
              <div style={{ width: 340, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>Procedure Detail</h3>
                {Object.entries(selected).map(([k, v]) => (
                  <div key={k} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{k.replace(/_/g, ' ')}</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{String(v) || 'N/A'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && tab === 'locations' && (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>IEN</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Name</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Type</th>
              </tr></thead>
              <tbody>
                {locations.length === 0 && <tr><td colSpan={3} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No imaging locations found</td></tr>}
                {locations.map((l: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 14px', color: '#64748b' }}>{l.ien}</td>
                    <td style={{ padding: '8px 14px', fontWeight: 600 }}>{l.name}</td>
                    <td style={{ padding: '8px 14px' }}>{l.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && tab === 'divparams' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {divParams.length === 0 && <div style={{ padding: 20, color: '#94a3b8' }}>No radiology division parameters found</div>}
            {divParams.map((d: any, i: number) => (
              <div key={i} style={{ background: '#fff', borderRadius: 10, padding: 20, border: '1px solid #e2e8f0' }}>
                {Object.entries(d).map(([k, v]) => (
                  <div key={k} style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{k.replace(/_/g, ' ')}: </span>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{String(v) || 'N/A'}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
