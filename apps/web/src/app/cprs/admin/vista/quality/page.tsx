'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/api-config';

type Tab = 'reminders' | 'qa-params';

export default function QualityAdminPage() {
  const [tab, setTab] = useState<Tab>('reminders');
  const [reminders, setReminders] = useState<any[]>([]);
  const [qaParams, setQaParams] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchList = useCallback(async (endpoint: string, setter: (d: any) => void, isObj = false) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, { credentials: 'include' });
      const json = await res.json();
      setter(isObj ? (json.data || {}) : (json.data || []));
    } catch { setter(isObj ? {} : []); }
    setLoading(false);
  }, []);

  useEffect(() => {
    setSelected(null);
    if (tab === 'reminders') fetchList('/admin/vista/quality/reminders', setReminders);
    if (tab === 'qa-params') fetchList('/admin/vista/quality/qa-site-params', setQaParams, true);
  }, [tab, fetchList]);

  const fetchDetail = async (ien: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/vista/quality/reminders/${ien}`, { credentials: 'include' });
      const json = await res.json();
      setSelected(json.data || null);
    } catch { setSelected(null); }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'reminders', label: 'Clinical Reminders' },
    { id: 'qa-params', label: 'QA Site Parameters' },
  ];

  const filteredReminders = reminders.filter((r: any) => !search || (r.name || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f2744)', color: '#fff', padding: '28px 32px 20px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Quality & Compliance</h1>
        <p style={{ fontSize: 14, color: '#94a3b8', margin: '4px 0 0' }}>Clinical reminders, QA parameters, and compliance tracking</p>
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
        {tab === 'reminders' && (
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reminders..."
            style={{ width: '100%', maxWidth: 400, padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, marginBottom: 16 }} />
        )}
        {loading && <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading...</div>}

        {!loading && tab === 'reminders' && (
          <div style={{ display: 'flex', gap: 20 }}>
            <div style={{ flex: 1, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>IEN</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Reminder Name</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Class</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Sponsor</th>
                </tr></thead>
                <tbody>
                  {filteredReminders.length === 0 && <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No reminders found</td></tr>}
                  {filteredReminders.map((r: any) => (
                    <tr key={r.ien} onClick={() => fetchDetail(r.ien)} style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 14px', color: '#64748b' }}>{r.ien}</td>
                      <td style={{ padding: '8px 14px', fontWeight: 600 }}>{r.name}</td>
                      <td style={{ padding: '8px 14px' }}>{r.reminderClass || '-'}</td>
                      <td style={{ padding: '8px 14px' }}>{r.sponsor || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selected && (
              <div style={{ width: 360, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>Reminder Detail</h3>
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

        {!loading && tab === 'qa-params' && qaParams && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {Object.entries(qaParams).length === 0 && <div style={{ padding: 20, color: '#94a3b8' }}>No QA site parameters found in this VistA instance</div>}
            {Object.entries(qaParams).map(([key, value]) => (
              <div key={key} style={{ background: '#fff', borderRadius: 10, padding: 20, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>{key.replace(/_/g, ' ')}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{String(value) || 'N/A'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
