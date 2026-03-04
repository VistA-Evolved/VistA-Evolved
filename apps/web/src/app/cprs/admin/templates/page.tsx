'use client';

import { useEffect, useState, useCallback } from 'react';
import { API_BASE as API } from '@/lib/api-config';

/**
 * Phase 158: Template Management Admin Page
 * Manage clinical templates, version history, seed specialty packs, quick text.
 */

interface TemplateSummary {
  id: string;
  name: string;
  specialty: string;
  setting: string;
  version: number;
  status: string;
  updatedAt: string;
}

interface TemplateStats {
  totalTemplates: number;
  bySpecialty: Record<string, number>;
  byStatus: Record<string, number>;
  bySetting: Record<string, number>;
  uniqueSpecialties: number;
}

interface QuickTextItem {
  id: string;
  key: string;
  text: string;
  tags: string[];
  specialty?: string;
}

type Tab = 'templates' | 'quick-text' | 'specialty-packs' | 'stats';

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
  });
  return res.json();
}

export default function TemplateAdminPage() {
  const [tab, setTab] = useState<Tab>('templates');
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [quickTexts, setQuickTexts] = useState<QuickTextItem[]>([]);
  const [stats, setStats] = useState<TemplateStats | null>(null);
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [seedResult, setSeedResult] = useState('');

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    const params = specialtyFilter ? `?specialty=${specialtyFilter}` : '';
    const data = await apiFetch(`/admin/templates${params}`);
    if (data.ok) setTemplates(data.templates || []);
    setLoading(false);
  }, [specialtyFilter]);

  const loadQuickTexts = useCallback(async () => {
    const data = await apiFetch('/admin/templates/quick-text');
    if (data.ok) setQuickTexts(data.quickTexts || []);
  }, []);

  const loadStats = useCallback(async () => {
    const data = await apiFetch('/admin/templates/stats');
    if (data.ok) setStats(data);
  }, []);

  useEffect(() => {
    if (tab === 'templates') loadTemplates();
    if (tab === 'quick-text') loadQuickTexts();
    if (tab === 'stats') loadStats();
  }, [tab, loadTemplates, loadQuickTexts, loadStats]);

  const handleSeed = async () => {
    setSeedResult('Seeding...');
    const data = await apiFetch('/admin/templates/seed', { method: 'POST' });
    if (data.ok) {
      setSeedResult(`Seeded ${data.seeded} templates across ${data.specialties} specialties`);
      loadStats();
      loadTemplates();
    } else {
      setSeedResult('Seed failed');
    }
  };

  const handlePublish = async (id: string) => {
    await apiFetch(`/admin/templates/${id}/publish`, { method: 'POST' });
    loadTemplates();
  };

  const handleArchive = async (id: string) => {
    await apiFetch(`/admin/templates/${id}/archive`, { method: 'POST' });
    loadTemplates();
  };

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 1200 }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Template Management</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        Phase 158: Specialty templates, versioning, quick text, and note builder configuration.
      </p>

      {/* Tab Bar */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 16,
          borderBottom: '1px solid #ddd',
          paddingBottom: 8,
        }}
      >
        {(['templates', 'quick-text', 'specialty-packs', 'stats'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '6px 16px',
              border: tab === t ? '1px solid #0066cc' : '1px solid #ccc',
              background: tab === t ? '#0066cc' : '#fff',
              color: tab === t ? '#fff' : '#333',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: tab === t ? 600 : 400,
            }}
          >
            {t === 'templates'
              ? 'Templates'
              : t === 'quick-text'
                ? 'Quick Text'
                : t === 'specialty-packs'
                  ? 'Specialty Packs'
                  : 'Stats'}
          </button>
        ))}
      </div>

      {/* Templates Tab */}
      {tab === 'templates' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              placeholder="Filter by specialty..."
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              style={{ padding: 6, border: '1px solid #ccc', borderRadius: 4, width: 240 }}
            />
            <button onClick={loadTemplates} style={{ padding: '6px 12px' }}>
              Refresh
            </button>
          </div>
          {loading ? (
            <p>Loading...</p>
          ) : templates.length === 0 ? (
            <p style={{ color: '#999' }}>
              No templates found. Seed specialty packs to get started.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>
                    Name
                  </th>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>
                    Specialty
                  </th>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>
                    Setting
                  </th>
                  <th style={{ textAlign: 'center', padding: 8, borderBottom: '1px solid #ddd' }}>
                    Version
                  </th>
                  <th style={{ textAlign: 'center', padding: 8, borderBottom: '1px solid #ddd' }}>
                    Status
                  </th>
                  <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 8 }}>{t.name}</td>
                    <td style={{ padding: 8 }}>
                      <span
                        style={{
                          background: '#e3f2fd',
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                      >
                        {t.specialty}
                      </span>
                    </td>
                    <td style={{ padding: 8 }}>{t.setting}</td>
                    <td style={{ textAlign: 'center', padding: 8 }}>v{t.version}</td>
                    <td style={{ textAlign: 'center', padding: 8 }}>
                      <span
                        style={{
                          background:
                            t.status === 'published'
                              ? '#e8f5e9'
                              : t.status === 'archived'
                                ? '#fce4ec'
                                : '#fff3e0',
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', padding: 8 }}>
                      {t.status === 'draft' && (
                        <button
                          onClick={() => handlePublish(t.id)}
                          style={{ marginRight: 4, fontSize: 12 }}
                        >
                          Publish
                        </button>
                      )}
                      {t.status !== 'archived' && (
                        <button
                          onClick={() => handleArchive(t.id)}
                          style={{ fontSize: 12, color: '#c62828' }}
                        >
                          Archive
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Quick Text Tab */}
      {tab === 'quick-text' && (
        <div>
          <h3>Quick Text Library</h3>
          {quickTexts.length === 0 ? (
            <p style={{ color: '#999' }}>No quick texts yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>
                    Key
                  </th>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>
                    Text (preview)
                  </th>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>
                    Tags
                  </th>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>
                    Specialty
                  </th>
                </tr>
              </thead>
              <tbody>
                {quickTexts.map((q) => (
                  <tr key={q.id}>
                    <td style={{ padding: 8, fontWeight: 600 }}>{q.key}</td>
                    <td
                      style={{
                        padding: 8,
                        maxWidth: 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {q.text}
                    </td>
                    <td style={{ padding: 8 }}>{q.tags.join(', ')}</td>
                    <td style={{ padding: 8 }}>{q.specialty || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Specialty Packs Tab */}
      {tab === 'specialty-packs' && (
        <div>
          <h3>Specialty Packs</h3>
          <p style={{ color: '#666', marginBottom: 12 }}>
            Seed all 45+ specialty template packs into the current tenant.
          </p>
          <button
            onClick={handleSeed}
            style={{
              padding: '8px 20px',
              background: '#0066cc',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Seed All Specialty Packs
          </button>
          {seedResult && <p style={{ marginTop: 8, fontWeight: 600 }}>{seedResult}</p>}
        </div>
      )}

      {/* Stats Tab */}
      {tab === 'stats' && (
        <div>
          <h3>Template Statistics</h3>
          {stats ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.totalTemplates}</div>
                <div style={{ color: '#666' }}>Total Templates</div>
              </div>
              <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.uniqueSpecialties}</div>
                <div style={{ color: '#666' }}>Unique Specialties</div>
              </div>
              <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 8px' }}>By Status</h4>
                {Object.entries(stats.byStatus).map(([k, v]) => (
                  <div key={k}>
                    {k}: {v}
                  </div>
                ))}
              </div>
              <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 8px' }}>By Setting</h4>
                {Object.entries(stats.bySetting).map(([k, v]) => (
                  <div key={k}>
                    {k}: {v}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p>Loading stats...</p>
          )}
        </div>
      )}
    </div>
  );
}
