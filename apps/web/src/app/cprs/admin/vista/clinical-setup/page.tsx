'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/api-config';

type Tab = 'order-sets' | 'consults' | 'tiu-defs' | 'tiu-templates' | 'health-summary';

export default function ClinicalSetupPage() {
  const [tab, setTab] = useState<Tab>('order-sets');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const endpointMap: Record<Tab, string> = {
    'order-sets': '/admin/vista/clinical-setup/order-sets',
    'consults': '/admin/vista/clinical-setup/consult-services',
    'tiu-defs': '/admin/vista/clinical-setup/tiu-definitions',
    'tiu-templates': '/admin/vista/clinical-setup/tiu-templates',
    'health-summary': '/admin/vista/clinical-setup/health-summary-types',
  };

  const fetchList = useCallback(async (endpoint: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, { credentials: 'include' });
      const json = await res.json();
      setData(json.data || []);
    } catch { setData([]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    fetchList(endpointMap[tab] + params);
  }, [tab, search, fetchList]); // eslint-disable-line react-hooks/exhaustive-deps

  const tabs: { id: Tab; label: string }[] = [
    { id: 'order-sets', label: 'Order Sets' },
    { id: 'consults', label: 'Consult Services' },
    { id: 'tiu-defs', label: 'TIU Definitions' },
    { id: 'tiu-templates', label: 'TIU Templates' },
    { id: 'health-summary', label: 'Health Summary' },
  ];

  const columns: Record<Tab, { key: string; label: string }[]> = {
    'order-sets': [{ key: 'ien', label: 'IEN' }, { key: 'name', label: 'Name' }, { key: 'type', label: 'Type' }, { key: 'status', label: 'Status' }],
    'consults': [{ key: 'ien', label: 'IEN' }, { key: 'name', label: 'Service Name' }, { key: 'groupName', label: 'Group' }, { key: 'status', label: 'Status' }],
    'tiu-defs': [{ key: 'ien', label: 'IEN' }, { key: 'name', label: 'Definition' }, { key: 'type', label: 'Type' }, { key: 'status', label: 'Status' }],
    'tiu-templates': [{ key: 'ien', label: 'IEN' }, { key: 'name', label: 'Template Name' }, { key: 'owner', label: 'Owner' }, { key: 'status', label: 'Status' }],
    'health-summary': [{ key: 'ien', label: 'IEN' }, { key: 'name', label: 'Summary Type' }, { key: 'owner', label: 'Owner' }],
  };

  const filteredData = data.filter((d: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return Object.values(d).some((v: any) => String(v || '').toLowerCase().includes(s));
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f2744)', color: '#fff', padding: '28px 32px 20px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Clinical Application Setup</h1>
        <p style={{ fontSize: 14, color: '#94a3b8', margin: '4px 0 0' }}>Order sets, consult services, TIU definitions, templates, and health summaries</p>
      </div>

      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e2e8f0', background: '#fff', padding: '0 32px', overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSearch(''); }} style={{
            padding: '12px 20px', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
            background: 'transparent', color: tab === t.id ? '#2563eb' : '#64748b', whiteSpace: 'nowrap',
            borderBottom: tab === t.id ? '2px solid #2563eb' : '2px solid transparent', marginBottom: -2,
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${tabs.find(t => t.id === tab)?.label || ''}...`}
          style={{ width: '100%', maxWidth: 400, padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, marginBottom: 16 }} />

        {loading && <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading...</div>}

        {!loading && (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 13, color: '#64748b', fontWeight: 600 }}>
              {filteredData.length} {tabs.find(t => t.id === tab)?.label || 'records'} found
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#f8fafc' }}>
                {columns[tab].map(c => (
                  <th key={c.key} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{c.label}</th>
                ))}
              </tr></thead>
              <tbody>
                {filteredData.length === 0 && (
                  <tr><td colSpan={columns[tab].length} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No records found</td></tr>
                )}
                {filteredData.map((row: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {columns[tab].map(c => (
                      <td key={c.key} style={{
                        padding: '8px 14px',
                        fontWeight: c.key === 'name' ? 600 : 400,
                        color: c.key === 'ien' ? '#64748b' : '#1e293b',
                        fontFamily: c.key === 'ien' ? 'monospace' : 'inherit',
                      }}>{row[c.key] || ''}</td>
                    ))}
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
