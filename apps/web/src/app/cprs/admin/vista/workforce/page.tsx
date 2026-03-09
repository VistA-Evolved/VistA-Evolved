'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/api-config';

type Tab = 'providers' | 'person-classes';

export default function WorkforceAdminPage() {
  const [tab, setTab] = useState<Tab>('providers');
  const [providers, setProviders] = useState<any[]>([]);
  const [personClasses, setPersonClasses] = useState<any[]>([]);
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
    if (tab === 'providers') fetchList('/admin/vista/workforce/providers', setProviders);
    if (tab === 'person-classes') fetchList('/admin/vista/workforce/person-classes', setPersonClasses);
  }, [tab, fetchList]);

  const fetchDetail = async (ien: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/vista/workforce/providers/${ien}`, { credentials: 'include' });
      const json = await res.json();
      setSelected(json.data || null);
    } catch { setSelected(null); }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'providers', label: 'Providers' },
    { id: 'person-classes', label: 'Person Classes' },
  ];

  const filteredProviders = providers.filter((p: any) => !search || (p.name || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f2744)', color: '#fff', padding: '28px 32px 20px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Workforce Management</h1>
        <p style={{ fontSize: 14, color: '#94a3b8', margin: '4px 0 0' }}>Provider credentials, person classes, and privileges</p>
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
        {tab === 'providers' && (
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search providers..."
            style={{ width: '100%', maxWidth: 400, padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, marginBottom: 16 }} />
        )}
        {loading && <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading...</div>}

        {!loading && tab === 'providers' && (
          <div style={{ display: 'flex', gap: 20 }}>
            <div style={{ flex: 1, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>IEN</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Name</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>NPI</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>DEA</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Taxonomy</th>
                </tr></thead>
                <tbody>
                  {filteredProviders.length === 0 && <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No providers found</td></tr>}
                  {filteredProviders.map((p: any) => (
                    <tr key={p.ien} onClick={() => fetchDetail(p.ien)} style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 14px', color: '#64748b' }}>{p.ien}</td>
                      <td style={{ padding: '8px 14px', fontWeight: 600 }}>{p.name}</td>
                      <td style={{ padding: '8px 14px', fontFamily: 'monospace' }}>{p.npi}</td>
                      <td style={{ padding: '8px 14px', fontFamily: 'monospace' }}>{p.dea}</td>
                      <td style={{ padding: '8px 14px' }}>{p.taxonomy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selected && (
              <div style={{ width: 360, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>Provider Detail</h3>
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

        {!loading && tab === 'person-classes' && (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>IEN</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Name</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Classification</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Area</th>
              </tr></thead>
              <tbody>
                {personClasses.length === 0 && <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No person classes found</td></tr>}
                {personClasses.map((pc: any) => (
                  <tr key={pc.ien} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 14px', color: '#64748b' }}>{pc.ien}</td>
                    <td style={{ padding: '8px 14px', fontWeight: 600 }}>{pc.name}</td>
                    <td style={{ padding: '8px 14px' }}>{pc.classification}</td>
                    <td style={{ padding: '8px 14px' }}>{pc.area}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
