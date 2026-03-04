/**
 * Profile Page — Demographics from VistA + settings + sharing.
 * VistA RPCs: ORWPT SELECT (demographics)
 */

'use client';

import { useEffect, useState } from 'react';
import { DataSourceBadge } from '@/components/data-source-badge';
import {
  fetchDemographics,
  fetchSettings,
  updatePortalSettings,
  fetchShares,
  createShare,
  revokeShareLink,
} from '@/lib/api';

type Tab = 'profile' | 'settings' | 'sharing';

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>('profile');
  const [demo, setDemo] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [languages, setLanguages] = useState<any[]>([]);
  const [shares, setShares] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [newShareToken, setNewShareToken] = useState('');
  const [newShareCode, setNewShareCode] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const [dRes, sRes, shRes] = await Promise.all([
      fetchDemographics(),
      fetchSettings(),
      fetchShares(),
    ]);
    setDemo((dRes.data as any)?.results?.[0] || null);
    setSettings((sRes.data as any)?.settings || null);
    setLanguages((sRes.data as any)?.languages || []);
    setShares((shRes.data as any)?.shares || []);
    setLoading(false);
  }

  async function handleLanguageChange(lang: string) {
    const res = await updatePortalSettings({ language: lang });
    if (res.ok) {
      setSettings((res.data as any)?.settings);
      setNotice('Language preference updated.');
    }
  }

  async function handleNotifToggle(key: string, value: boolean) {
    const res = await updatePortalSettings({ notifications: { [key]: value } });
    if (res.ok) setSettings((res.data as any)?.settings);
  }

  async function handleDisplayChange(key: string, value: unknown) {
    const res = await updatePortalSettings({ display: { [key]: value } });
    if (res.ok) setSettings((res.data as any)?.settings);
  }

  async function handleCreateShare() {
    const res = await createShare({
      sections: ['allergies', 'medications', 'problems', 'vitals', 'demographics'],
      label: 'Full record share',
      ttlHours: 72,
    });
    if (res.ok) {
      const share = (res.data as any)?.share;
      setNewShareToken(share?.token || '');
      setNewShareCode(share?.accessCode || '');
      setNotice('Share link created! Save the access code — it will not be shown again.');
      loadAll();
    }
  }

  async function handleRevoke(id: string) {
    await revokeShareLink(id);
    loadAll();
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'profile', label: 'Demographics' },
    { key: 'settings', label: 'Settings' },
    { key: 'sharing', label: 'Record Sharing' },
  ];

  return (
    <div className="container">
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>My Profile</h1>
      <p style={{ color: 'var(--portal-text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
        Your personal information and preferences
      </p>

      {notice && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: 4,
            marginBottom: '1rem',
            background: '#dcfce7',
            color: '#166534',
            fontSize: '0.8125rem',
          }}
        >
          {notice}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          gap: '0',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '1rem',
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? '#2563eb' : '#64748b',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === t.key ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: '-2px',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Loading...</p>
      ) : (
        <>
          {tab === 'profile' && (
            <div className="grid-2">
              <div className="card">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem',
                  }}
                >
                  <h3 style={{ margin: 0 }}>Demographics</h3>
                  <DataSourceBadge source="ehr" />
                </div>
                {demo ? (
                  <div style={{ fontSize: '0.875rem' }}>
                    <div style={{ marginBottom: '0.375rem' }}>
                      <strong>Name:</strong> {demo.name}
                    </div>
                    <div style={{ marginBottom: '0.375rem' }}>
                      <strong>Sex:</strong> {demo.sex}
                    </div>
                    <div>
                      <strong>Date of Birth:</strong> {demo.dob}
                    </div>
                  </div>
                ) : (
                  <p style={{ color: '#94a3b8' }}>No demographics available</p>
                )}
              </div>
              <div className="card">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem',
                  }}
                >
                  <h3 style={{ margin: 0 }}>Security</h3>
                  <DataSourceBadge source="pending" />
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  {settings?.mfa?.roadmap || 'MFA will be available in a future release.'}
                </p>
              </div>
            </div>
          )}

          {tab === 'settings' && settings && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="card">
                <h3 style={{ margin: '0 0 0.75rem' }}>Language</h3>
                <select
                  value={settings.language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  style={{ padding: '0.375rem', borderRadius: 4, border: '1px solid #cbd5e1' }}
                >
                  {languages.map((l: any) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="card">
                <h3 style={{ margin: '0 0 0.75rem' }}>Notifications</h3>
                {Object.entries(settings.notifications || {}).map(([key, val]) => (
                  <label
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.375rem',
                      fontSize: '0.875rem',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={val as boolean}
                      onChange={(e) => handleNotifToggle(key, e.target.checked)}
                    />
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                  </label>
                ))}
              </div>

              <div className="card">
                <h3 style={{ margin: '0 0 0.75rem' }}>Display</h3>
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 500 }}>Font Size</label>
                  <select
                    value={settings.display?.fontSize || 'medium'}
                    onChange={(e) => handleDisplayChange('fontSize', e.target.value)}
                    style={{
                      display: 'block',
                      padding: '0.375rem',
                      borderRadius: 4,
                      border: '1px solid #cbd5e1',
                      marginTop: '0.25rem',
                    }}
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    marginBottom: '0.375rem',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={settings.display?.highContrast || false}
                    onChange={(e) => handleDisplayChange('highContrast', e.target.checked)}
                  />
                  High Contrast
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={settings.display?.compactView || false}
                    onChange={(e) => handleDisplayChange('compactView', e.target.checked)}
                  />
                  Compact View
                </label>
              </div>
            </div>
          )}

          {tab === 'sharing' && (
            <div>
              <div className="card" style={{ marginBottom: '1rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.75rem',
                  }}
                >
                  <h3 style={{ margin: 0 }}>Share Your Health Record</h3>
                  <button
                    onClick={handleCreateShare}
                    style={{
                      padding: '0.375rem 0.75rem',
                      background: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                    }}
                  >
                    Create Share Link
                  </button>
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  Create a secure, time-limited link to share selected health records with another
                  provider or caregiver. The recipient will need the access code and your date of
                  birth to view the records.
                </p>

                {newShareToken && (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.75rem',
                      background: '#f0f9ff',
                      borderRadius: 6,
                      border: '1px solid #bae6fd',
                    }}
                  >
                    <div
                      style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.375rem' }}
                    >
                      Share Created
                    </div>
                    <div style={{ fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                      <strong>Access Code:</strong>{' '}
                      <code
                        style={{
                          background: '#e0f2fe',
                          padding: '0.125rem 0.375rem',
                          borderRadius: 3,
                          fontWeight: 700,
                        }}
                      >
                        {newShareCode}
                      </code>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#0c4a6e' }}>
                      Save this code now — it will not be shown again. Share the link and code with
                      your recipient.
                    </div>
                  </div>
                )}
              </div>

              <div className="card">
                <h3 style={{ margin: '0 0 0.75rem' }}>
                  Active Shares (
                  {
                    shares.filter((s: any) => !s.revokedAt && new Date(s.expiresAt) > new Date())
                      .length
                  }
                  )
                </h3>
                {shares.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No shares created yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {shares.map((s: any) => {
                      const expired = new Date(s.expiresAt) < new Date();
                      const revoked = !!s.revokedAt;
                      return (
                        <div
                          key={s.id}
                          style={{
                            padding: '0.5rem',
                            background: '#f8fafc',
                            borderRadius: 6,
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{s.label}</span>
                            <span
                              style={{
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                padding: '0.125rem 0.375rem',
                                borderRadius: 4,
                                background: revoked ? '#fef2f2' : expired ? '#f1f5f9' : '#dcfce7',
                                color: revoked ? '#dc2626' : expired ? '#64748b' : '#166534',
                              }}
                            >
                              {revoked ? 'Revoked' : expired ? 'Expired' : 'Active'}
                            </span>
                          </div>
                          <div
                            style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}
                          >
                            Sections: {(s.sections || []).join(', ')} · Expires:{' '}
                            {new Date(s.expiresAt).toLocaleDateString()}· Accessed:{' '}
                            {s.accessCount || 0} time(s)
                          </div>
                          {!revoked && !expired && (
                            <button
                              onClick={() => handleRevoke(s.id)}
                              style={{
                                fontSize: '0.75rem',
                                color: '#dc2626',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                marginTop: '0.25rem',
                                textDecoration: 'underline',
                              }}
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
