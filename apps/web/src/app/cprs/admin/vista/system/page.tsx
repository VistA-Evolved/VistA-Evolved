'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/api-config';

type Tab = 'status' | 'taskman' | 'errors' | 'parameters';

export default function SystemAdminPage() {
  const [tab, setTab] = useState<Tab>('status');
  const [systemStatus, setSystemStatus] = useState<Record<string, string>>({});
  const [taskmanTasks, setTaskmanTasks] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [parameters, setParameters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async (endpoint: string, setter: (d: any) => void, isDetail = false) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, { credentials: 'include' });
      const json = await res.json();
      setter(isDetail ? (json.data || {}) : (json.data || []));
    } catch { setter(isDetail ? {} : []); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'status') fetchData('/admin/vista/system/status', setSystemStatus, true);
    if (tab === 'taskman') fetchData('/admin/vista/system/taskman', setTaskmanTasks);
    if (tab === 'errors') fetchData('/admin/vista/system/errors?count=50', setErrors);
    if (tab === 'parameters') fetchData('/admin/vista/system/parameters', setParameters);
  }, [tab, fetchData]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'status', label: 'System Status' },
    { id: 'taskman', label: 'TaskMan' },
    { id: 'errors', label: 'Error Trap' },
    { id: 'parameters', label: 'Parameters' },
  ];

  const filteredParams = parameters.filter((p: any) =>
    !search || (p.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f2744)', color: '#fff', padding: '28px 32px 20px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>System Administration</h1>
        <p style={{ fontSize: 14, color: '#94a3b8', margin: '4px 0 0' }}>TaskMan, error traps, system health, and parameter management</p>
      </div>

      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e2e8f0', background: '#fff', padding: '0 32px' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '12px 20px', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
            background: 'transparent', color: tab === t.id ? '#2563eb' : '#64748b',
            borderBottom: tab === t.id ? '2px solid #2563eb' : '2px solid transparent',
            marginBottom: -2,
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
        {loading && <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading...</div>}

        {!loading && tab === 'status' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {Object.entries(systemStatus).map(([key, value]) => (
              <div key={key} style={{ background: '#fff', borderRadius: 10, padding: '20px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>{key.replace(/_/g, ' ')}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{value || 'N/A'}</div>
              </div>
            ))}
          </div>
        )}

        {!loading && tab === 'taskman' && (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>IEN</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Task Name</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Scheduled</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Namespace</th>
              </tr></thead>
              <tbody>
                {taskmanTasks.length === 0 && <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No TaskMan tasks found</td></tr>}
                {taskmanTasks.map((t: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 14px', color: '#64748b' }}>{t.ien}</td>
                    <td style={{ padding: '8px 14px', fontWeight: 600 }}>{t.name}</td>
                    <td style={{ padding: '8px 14px' }}><span style={{
                      padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                      background: t.status === '2' ? '#dcfce7' : '#fef3c7', color: t.status === '2' ? '#166534' : '#92400e',
                    }}>{t.status || 'Unknown'}</span></td>
                    <td style={{ padding: '8px 14px', color: '#64748b' }}>{t.scheduled}</td>
                    <td style={{ padding: '8px 14px', color: '#64748b' }}>{t.namespace}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && tab === 'errors' && (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Date</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Error</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Routine</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Line</th>
              </tr></thead>
              <tbody>
                {errors.length === 0 && <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No error trap entries</td></tr>}
                {errors.map((e: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 14px', color: '#64748b' }}>{e.date}</td>
                    <td style={{ padding: '8px 14px', fontWeight: 600, color: '#dc2626' }}>{e.errorText}</td>
                    <td style={{ padding: '8px 14px', fontFamily: 'monospace' }}>{e.routine}</td>
                    <td style={{ padding: '8px 14px', fontFamily: 'monospace' }}>{e.line}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && tab === 'parameters' && (
          <>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter parameters..."
              style={{ width: '100%', maxWidth: 400, padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, marginBottom: 16 }} />
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>IEN</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Name</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Value</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Entity</th>
                </tr></thead>
                <tbody>
                  {filteredParams.length === 0 && <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No parameters found</td></tr>}
                  {filteredParams.map((p: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 14px', color: '#64748b' }}>{p.ien}</td>
                      <td style={{ padding: '8px 14px', fontWeight: 600 }}>{p.name}</td>
                      <td style={{ padding: '8px 14px' }}>{p.value}</td>
                      <td style={{ padding: '8px 14px', color: '#64748b' }}>{p.entity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
