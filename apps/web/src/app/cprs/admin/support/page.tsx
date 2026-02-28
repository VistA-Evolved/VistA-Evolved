'use client';

/**
 * Admin — Support Tooling
 *
 * Phase 244 (Wave 6 P7): System diagnostics and support ticket management.
 * Tabs: Diagnostics | Tickets
 */

import React, { useState, useEffect, useCallback } from 'react';
import styles from '@/components/cprs/cprs.module.css';
import { getCsrfToken } from '@/lib/csrf';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type Tab = 'diagnostics' | 'tickets';

interface DiagnosticReport {
  timestamp: string;
  runtime: { nodeVersion: string; uptimeSeconds: number; memoryMb: { heapUsed: number; heapTotal: number } };
  vista: { reachable: boolean; host: string; port: number; latencyMs?: number; error?: string };
  modules: { sku: string; totalModules: number; enabledModules: number };
  adapters: { totalAdapters: number; healthyAdapters: number };
  stores: { total: number };
  hl7: { enabled: boolean; status?: string };
}

interface SupportTicket {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
}

async function apiFetch(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  return res.json();
}

async function apiPost(path: string, body?: unknown) {
  const csrf = await getCsrfToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#d32f2f',
  high: '#f57c00',
  medium: '#fbc02d',
  low: '#66bb6a',
};

export default function SupportPage() {
  const [tab, setTab] = useState<Tab>('diagnostics');
  const [diag, setDiag] = useState<DiagnosticReport | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New ticket form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [priority, setPriority] = useState('medium');

  const loadDiagnostics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/admin/support/diagnostics');
      if (data.ok) setDiag(data.report);
    } catch { setError('Failed to load diagnostics'); }
    setLoading(false);
  }, []);

  const loadTickets = useCallback(async () => {
    setError(null);
    try {
      const data = await apiFetch('/admin/support/tickets');
      if (data.ok) setTickets(data.tickets);
    } catch { setError('Failed to load tickets'); }
  }, []);

  useEffect(() => {
    if (tab === 'diagnostics') loadDiagnostics();
    if (tab === 'tickets') loadTickets();
  }, [tab, loadDiagnostics, loadTickets]);

  const createNewTicket = async () => {
    if (!title || !description) return;
    setLoading(true);
    try {
      await apiPost('/admin/support/tickets', { title, description, category, priority });
      setTitle(''); setDescription('');
      loadTickets();
    } catch { setError('Failed to create ticket'); }
    setLoading(false);
  };

  return (
    <div className={styles.cprsPage} style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>Support Tooling</h2>

      {error && (
        <div style={{ background: '#fee', color: '#c00', padding: '8px 12px', borderRadius: 4, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {(['diagnostics', 'tickets'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: '8px 16px', border: 'none', borderRadius: 4, cursor: 'pointer',
              background: tab === t ? '#0066cc' : '#e0e0e0', color: tab === t ? '#fff' : '#333',
              fontWeight: tab === t ? 600 : 400,
            }}>
            {t === 'diagnostics' ? 'System Diagnostics' : 'Support Tickets'}
          </button>
        ))}
      </div>

      {tab === 'diagnostics' && (
        <div>
          <button onClick={loadDiagnostics} disabled={loading}
            style={{ padding: '8px 16px', background: '#0066cc', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', marginBottom: 16 }}>
            {loading ? 'Collecting...' : 'Refresh Diagnostics'}
          </button>

          {diag && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {/* Runtime */}
              <div style={{ padding: 16, border: '1px solid #ddd', borderRadius: 8, background: '#fafafa' }}>
                <h4 style={{ margin: '0 0 8px 0' }}>Runtime</h4>
                <div>Node: {diag.runtime.nodeVersion}</div>
                <div>Uptime: {Math.round(diag.runtime.uptimeSeconds / 60)}m</div>
                <div>Heap: {diag.runtime.memoryMb.heapUsed}/{diag.runtime.memoryMb.heapTotal} MB</div>
              </div>

              {/* VistA */}
              <div style={{
                padding: 16, border: '1px solid', borderRadius: 8,
                borderColor: diag.vista.reachable ? '#4caf50' : '#f44336',
                background: diag.vista.reachable ? '#e8f5e9' : '#ffebee',
              }}>
                <h4 style={{ margin: '0 0 8px 0' }}>VistA Connection</h4>
                <div>Status: {diag.vista.reachable ? 'Reachable' : 'Unreachable'}</div>
                <div>Host: {diag.vista.host}:{diag.vista.port}</div>
                {diag.vista.latencyMs != null && <div>Latency: {diag.vista.latencyMs}ms</div>}
                {diag.vista.error && <div style={{ color: '#d32f2f' }}>{diag.vista.error}</div>}
              </div>

              {/* Modules */}
              <div style={{ padding: 16, border: '1px solid #ddd', borderRadius: 8, background: '#fafafa' }}>
                <h4 style={{ margin: '0 0 8px 0' }}>Modules</h4>
                <div>SKU: {diag.modules.sku}</div>
                <div>Enabled: {diag.modules.enabledModules}/{diag.modules.totalModules}</div>
              </div>

              {/* Adapters */}
              <div style={{ padding: 16, border: '1px solid #ddd', borderRadius: 8, background: '#fafafa' }}>
                <h4 style={{ margin: '0 0 8px 0' }}>Adapters</h4>
                <div>Total: {diag.adapters.totalAdapters}</div>
                <div>Healthy: {diag.adapters.healthyAdapters}</div>
              </div>

              {/* Stores */}
              <div style={{ padding: 16, border: '1px solid #ddd', borderRadius: 8, background: '#fafafa' }}>
                <h4 style={{ margin: '0 0 8px 0' }}>Data Stores</h4>
                <div>Total: {diag.stores.total}</div>
              </div>

              {/* HL7 */}
              <div style={{ padding: 16, border: '1px solid #ddd', borderRadius: 8, background: '#fafafa' }}>
                <h4 style={{ margin: '0 0 8px 0' }}>HL7 Engine</h4>
                <div>Enabled: {diag.hl7.enabled ? 'Yes' : 'No'}</div>
                {diag.hl7.status && <div>Status: {diag.hl7.status}</div>}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'tickets' && (
        <div>
          {/* Create ticket form */}
          <div style={{ padding: 16, border: '1px solid #ddd', borderRadius: 8, marginBottom: 16, background: '#fafafa' }}>
            <h4 style={{ margin: '0 0 12px 0' }}>Create Support Ticket</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)}
                style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }} />
              <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)}
                rows={3} style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={category} onChange={(e) => setCategory(e.target.value)}
                  style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }}>
                  {['vista', 'adapter', 'module', 'performance', 'data', 'security', 'other'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select value={priority} onChange={(e) => setPriority(e.target.value)}
                  style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }}>
                  {['low', 'medium', 'high', 'critical'].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <button onClick={createNewTicket} disabled={loading || !title || !description}
                  style={{ padding: '8px 16px', background: '#0066cc', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                  Create
                </button>
              </div>
            </div>
          </div>

          {/* Ticket list */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
                <th style={{ padding: 8 }}>ID</th>
                <th style={{ padding: 8 }}>Title</th>
                <th style={{ padding: 8 }}>Category</th>
                <th style={{ padding: 8 }}>Priority</th>
                <th style={{ padding: 8 }}>Status</th>
                <th style={{ padding: 8 }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 16, textAlign: 'center', color: '#999' }}>No tickets yet</td></tr>
              ) : tickets.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>{t.id.slice(0, 16)}</td>
                  <td style={{ padding: 8 }}>{t.title}</td>
                  <td style={{ padding: 8 }}>{t.category}</td>
                  <td style={{ padding: 8 }}>
                    <span style={{ color: PRIORITY_COLORS[t.priority] || '#333', fontWeight: 600 }}>
                      {t.priority}
                    </span>
                  </td>
                  <td style={{ padding: 8 }}>{t.status}</td>
                  <td style={{ padding: 8, fontSize: 12 }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
