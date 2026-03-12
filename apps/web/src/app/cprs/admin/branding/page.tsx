'use client';

/**
 * Tenant Branding Admin -- Phase 282
 *
 * Configure per-tenant visual branding: logo URL, accent colors,
 * header/footer text. Also allows setting the tenant default theme pack.
 *
 * Tabs:
 *   - Branding -- Logo, colors, text overrides
 *   - Theme -- Select default theme pack for the facility
 *   - Preview -- Live preview of branding + theme
 */

import React, { useState, useEffect, useCallback } from 'react';
import styles from '@/components/cprs/cprs.module.css';
import { getCsrfTokenSync, getCsrfToken as fetchCsrfToken } from '@/lib/csrf';
import { API_BASE } from '@/lib/api-config';

type Tab = 'branding' | 'theme' | 'preview';

interface BrandingConfig {
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  headerText: string;
  footerText: string;
  enabled: boolean;
}

interface UIDefaults {
  theme: string;
  density: string;
  layoutMode: string;
  initialTab: string;
  enableDragReorder: boolean;
  themePack: string;
}

const EMPTY_BRANDING: BrandingConfig = {
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '',
  secondaryColor: '',
  headerText: '',
  footerText: '',
  enabled: false,
};

const THEME_PACKS = [
  { id: 'modern-default', name: 'Modern Default', category: 'built-in' },
  { id: 'modern-dark', name: 'Modern Dark', category: 'built-in' },
  { id: 'vista-legacy', name: 'VistA Legacy', category: 'built-in' },
  { id: 'openmrs', name: 'OpenMRS-Inspired', category: 'oss-inspired' },
  { id: 'openemr', name: 'OpenEMR-Inspired', category: 'oss-inspired' },
  { id: 'high-contrast', name: 'High Contrast', category: 'built-in' },
];

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include', ...opts });
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.ok === false) {
    throw new Error(body?.error || body?.errors?.join(', ') || `Request failed: ${res.status}`);
  }
  return body;
}

async function apiPut(path: string, body: unknown) {
  const token = getCsrfTokenSync() || (await fetchCsrfToken());
  return apiFetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
    body: JSON.stringify(body),
  });
}

/* -- Color Picker Helper --------------------------------- */

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const displayVal = value || '#ffffff';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <label style={{ minWidth: 130, fontSize: 13 }}>{label}</label>
      <input
        type="color"
        value={displayVal}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 36, height: 28, border: '1px solid #ccc', cursor: 'pointer' }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#003366"
        style={{
          width: 100,
          padding: '4px 8px',
          fontSize: 13,
          border: '1px solid #ccc',
          borderRadius: 3,
          fontFamily: 'monospace',
        }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            fontSize: 11,
            color: '#999',
            cursor: 'pointer',
            border: 'none',
            background: 'none',
          }}
        >
          clear
        </button>
      )}
    </div>
  );
}

/* -- Main Page Component --------------------------------- */

export default function BrandingAdminPage() {
  const [tab, setTab] = useState<Tab>('branding');
  const [tenantId, setTenantId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [branding, setBranding] = useState<BrandingConfig>(EMPTY_BRANDING);
  const [uiDefaults, setUiDefaults] = useState<UIDefaults | null>(null);
  const [selectedTheme, setSelectedTheme] = useState('modern-default');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const tenantRes = await apiFetch('/admin/my-tenant');
      const resolvedTenantId = tenantRes?.tenant?.tenantId || '';
      setTenantId(resolvedTenantId);
      setBranding(tenantRes?.tenant?.branding || EMPTY_BRANDING);
      setUiDefaults(tenantRes?.tenant?.uiDefaults || null);
      setSelectedTheme(tenantRes?.tenant?.uiDefaults?.themePack || 'modern-default');
    } catch (e: any) {
      setError(e.message || 'Failed to load branding data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveBranding = async () => {
    if (!tenantId) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiPut(`/admin/branding/${tenantId}`, branding);
      setSuccess('Branding saved successfully');
      setBranding(res.branding);
    } catch (e: any) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const saveThemePack = async () => {
    if (!tenantId) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiPut(`/admin/ui-defaults/${tenantId}`, { themePack: selectedTheme });
      setSuccess('Default theme pack saved');
      setUiDefaults(res.uiDefaults);
    } catch (e: any) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof BrandingConfig>(key: K, value: BrandingConfig[K]) => {
    setBranding((prev) => ({ ...prev, [key]: value }));
  };

  /* -- Tab: Branding ------------------------------- */

  function renderBrandingTab() {
    return (
      <div style={{ padding: 16 }}>
        <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 600 }}>Facility Branding</h3>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={branding.enabled}
              onChange={(e) => updateField('enabled', e.target.checked)}
            />
            Enable custom branding overrides
          </label>
          <div style={{ fontSize: 11, color: '#888', marginTop: 4, marginLeft: 24 }}>
            When disabled, the facility uses default theme styling
          </div>
        </div>

        <fieldset
          disabled={!branding.enabled}
          style={{
            border: '1px solid #ddd',
            borderRadius: 4,
            padding: 16,
            opacity: branding.enabled ? 1 : 0.5,
          }}
        >
          <legend style={{ fontSize: 13, fontWeight: 600, padding: '0 8px' }}>
            Visual Identity
          </legend>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
              Logo URL (HTTPS required)
            </label>
            <input
              type="url"
              value={branding.logoUrl}
              onChange={(e) => updateField('logoUrl', e.target.value)}
              placeholder="https://example.com/logo.png"
              style={{
                width: '100%',
                maxWidth: 500,
                padding: '6px 8px',
                fontSize: 13,
                border: '1px solid #ccc',
                borderRadius: 3,
              }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
              Favicon URL (HTTPS required)
            </label>
            <input
              type="url"
              value={branding.faviconUrl}
              onChange={(e) => updateField('faviconUrl', e.target.value)}
              placeholder="https://example.com/favicon.ico"
              style={{
                width: '100%',
                maxWidth: 500,
                padding: '6px 8px',
                fontSize: 13,
                border: '1px solid #ccc',
                borderRadius: 3,
              }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <ColorInput
              label="Primary Color"
              value={branding.primaryColor}
              onChange={(v) => updateField('primaryColor', v)}
            />
            <ColorInput
              label="Secondary Color"
              value={branding.secondaryColor}
              onChange={(v) => updateField('secondaryColor', v)}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
              Header Text (max 100 chars)
            </label>
            <input
              type="text"
              value={branding.headerText}
              onChange={(e) => updateField('headerText', e.target.value.slice(0, 100))}
              placeholder="My Health System"
              maxLength={100}
              style={{
                width: '100%',
                maxWidth: 500,
                padding: '6px 8px',
                fontSize: 13,
                border: '1px solid #ccc',
                borderRadius: 3,
              }}
            />
            <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
              {branding.headerText.length}/100
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
              Footer Text (max 200 chars)
            </label>
            <textarea
              value={branding.footerText}
              onChange={(e) => updateField('footerText', e.target.value.slice(0, 200))}
              placeholder="Powered by VistA-Evolved"
              maxLength={200}
              rows={2}
              style={{
                width: '100%',
                maxWidth: 500,
                padding: '6px 8px',
                fontSize: 13,
                border: '1px solid #ccc',
                borderRadius: 3,
                resize: 'vertical',
              }}
            />
            <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
              {branding.footerText.length}/200
            </div>
          </div>
        </fieldset>

        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <button
            onClick={saveBranding}
            disabled={saving}
            className={styles.cprsButton}
            style={{ padding: '6px 20px' }}
          >
            {saving ? 'Saving...' : 'Save Branding'}
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            style={{
              padding: '6px 16px',
              fontSize: 13,
              cursor: 'pointer',
              border: '1px solid #ccc',
              borderRadius: 3,
              background: '#f5f5f5',
            }}
          >
            Reset
          </button>
        </div>
      </div>
    );
  }

  /* -- Tab: Theme ---------------------------------- */

  function renderThemeTab() {
    return (
      <div style={{ padding: 16 }}>
        <h3 style={{ marginBottom: 8, fontSize: 15, fontWeight: 600 }}>Default Theme Pack</h3>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
          Set the default theme pack for new users at this facility. Users can override with their
          own preference.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          {THEME_PACKS.map((tp) => (
            <label
              key={tp.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                border:
                  selectedTheme === tp.id
                    ? '2px solid var(--cprs-primary, #003366)'
                    : '1px solid #ddd',
                borderRadius: 6,
                cursor: 'pointer',
                background: selectedTheme === tp.id ? 'var(--cprs-hover-bg, #f0f7ff)' : '#fff',
              }}
            >
              <input
                type="radio"
                name="theme"
                value={tp.id}
                checked={selectedTheme === tp.id}
                onChange={() => setSelectedTheme(tp.id)}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{tp.name}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{tp.category}</div>
              </div>
            </label>
          ))}
        </div>

        <div style={{ marginTop: 16 }}>
          <button
            onClick={saveThemePack}
            disabled={saving}
            className={styles.cprsButton}
            style={{ padding: '6px 20px' }}
          >
            {saving ? 'Saving...' : 'Save Default Theme'}
          </button>
        </div>
      </div>
    );
  }

  /* -- Tab: Preview -------------------------------- */

  function renderPreviewTab() {
    const previewStyles: React.CSSProperties = {
      border: '1px solid #ddd',
      borderRadius: 6,
      overflow: 'hidden',
      maxWidth: 600,
    };

    const headerStyle: React.CSSProperties = {
      background:
        branding.enabled && branding.primaryColor
          ? branding.primaryColor
          : 'var(--cprs-header-bg, #003366)',
      color: '#fff',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    };

    const footerStyle: React.CSSProperties = {
      background: '#f5f5f5',
      padding: '8px 16px',
      fontSize: 11,
      color: '#666',
      textAlign: 'center',
      borderTop: '1px solid #ddd',
    };

    return (
      <div style={{ padding: 16 }}>
        <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 600 }}>Live Preview</h3>
        <div style={previewStyles}>
          <div style={headerStyle}>
            {branding.enabled && branding.logoUrl && (
              <img
                src={branding.logoUrl}
                alt="Logo"
                style={{ height: 28, width: 'auto' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <span style={{ fontWeight: 600, fontSize: 15 }}>
              {branding.enabled && branding.headerText ? branding.headerText : 'VistA-Evolved'}
            </span>
          </div>
          <div style={{ padding: 16, minHeight: 120 }}>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
              Sample content area with the selected branding applied.
            </div>
            {branding.enabled && branding.secondaryColor && (
              <button
                style={{
                  background: branding.secondaryColor,
                  color: '#fff',
                  border: 'none',
                  padding: '6px 16px',
                  borderRadius: 3,
                  fontSize: 13,
                  cursor: 'default',
                }}
              >
                Accent Button
              </button>
            )}
          </div>
          <div style={footerStyle}>
            {branding.enabled && branding.footerText
              ? branding.footerText
              : 'Powered by VistA-Evolved'}
          </div>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: '#888' }}>
          This is a simplified preview. Actual rendering uses the theme pack CSS variables.
        </div>
      </div>
    );
  }

  /* -- Main Render --------------------------------- */

  const tabs: { id: Tab; label: string }[] = [
    { id: 'branding', label: 'Branding' },
    { id: 'theme', label: 'Theme' },
    { id: 'preview', label: 'Preview' },
  ];

  return (
    <div className={styles.cprsRoot}>
      <div className={styles.cprsHeader}>
        <h2 className={styles.cprsHeaderTitle}>Tenant Branding Admin</h2>
        <span className={styles.cprsBadge} style={{ marginLeft: 8 }}>
          Phase 282
        </span>
      </div>

      {tenantId && (
        <div style={{ margin: '8px 16px 0', fontSize: 12, color: '#666' }}>
          Active tenant: <strong>{tenantId}</strong>
        </div>
      )}

      {error && (
        <div
          style={{
            margin: '8px 16px',
            padding: '8px 12px',
            background: '#fde8e8',
            color: '#b91c1c',
            borderRadius: 4,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          style={{
            margin: '8px 16px',
            padding: '8px 12px',
            background: '#dcfce7',
            color: '#15803d',
            borderRadius: 4,
            fontSize: 13,
          }}
        >
          {success}
        </div>
      )}

      <div className={styles.cprsTabBar}>
        {tabs.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? styles.cprsTabActive : styles.cprsTab}
            onClick={() => {
              setTab(t.id);
              setError('');
              setSuccess('');
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.cprsContent}>
        {loading ? (
          <div style={{ padding: 16, fontSize: 13, color: '#888' }}>Loading...</div>
        ) : (
          <>
            {tab === 'branding' && renderBrandingTab()}
            {tab === 'theme' && renderThemeTab()}
            {tab === 'preview' && renderPreviewTab()}
          </>
        )}
      </div>

      {!loading && uiDefaults && (
        <div style={{ margin: '12px 16px 16px', fontSize: 12, color: '#666' }}>
          Current defaults: theme <strong>{uiDefaults.theme}</strong>, density{' '}
          <strong>{uiDefaults.density}</strong>, layout <strong>{uiDefaults.layoutMode}</strong>.
        </div>
      )}
    </div>
  );
}
