'use client';

import { useEffect, useState, useCallback } from 'react';
import { API_BASE } from '@/lib/api-config';

/* ------------------------------------------------------------------ */
/* Types (mirror server types)                                          */
/* ------------------------------------------------------------------ */

interface FrameworkDef {
  id: string;
  name: string;
  countryCodes: string[];
  phiElements: string[];
  defaultRetention: {
    minYears: number;
    maxYears?: number | null;
  };
}

interface AttestationSummary {
  framework: string;
  total: number;
  attested: number;
  expired: number;
  revoked: number;
  pendingReview: number;
  coveragePercent: number;
}

interface TenantRegulatoryConfig {
  tenantId: string;
  countryCode: string;
  frameworks: string[];
  packAvailable: boolean;
  consentModel: string;
  retentionMinYears: number;
  crossBorderPolicy: string;
  breachNotificationHours: number;
}

interface ValidatorInfo {
  countryCode: string;
  name: string;
  domains: string[];
}

interface PostureData {
  tenantId: string;
  regulatory: TenantRegulatoryConfig;
  attestations: AttestationSummary[];
  validatorCount: number;
  supportedCountries: string[];
  chainIntegrity: {
    attestations: boolean;
    countryAssignments: boolean;
  };
}

type Tab = 'posture' | 'frameworks' | 'attestations' | 'validators';

async function apiFetch<T>(path: string, tenantId?: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (tenantId) headers['X-Tenant-Id'] = tenantId;

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers,
  });

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || payload?.message || `Request failed: ${response.status}`);
  }

  return payload as T;
}

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export default function ComplianceDashboardPage() {
  const [tab, setTab] = useState<Tab>('posture');
  const [posture, setPosture] = useState<PostureData | null>(null);
  const [frameworks, setFrameworks] = useState<FrameworkDef[]>([]);
  const [attestations, setAttestations] = useState<AttestationSummary[]>([]);
  const [validators, setValidators] = useState<ValidatorInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tenantData = await apiFetch<{ tenant: { tenantId: string } }>('/admin/my-tenant');
      const tenantId = tenantData.tenant?.tenantId;
      if (!tenantId) {
        throw new Error('Tenant context required');
      }

      const [postureData, frameworkData, attestationData, validatorData] = await Promise.all([
        apiFetch<{ posture: PostureData }>('/regulatory/posture', tenantId),
        apiFetch<{ frameworks: FrameworkDef[] }>('/regulatory/frameworks', tenantId),
        apiFetch<{ summary: AttestationSummary[] }>('/regulatory/attestations/summary', tenantId),
        apiFetch<{ validators: ValidatorInfo[] }>('/regulatory/validators', tenantId),
      ]);

      setPosture(postureData.posture);
      setFrameworks(frameworkData.frameworks || []);
      setAttestations(attestationData.summary || []);
      setValidators(validatorData.validators || []);
    } catch (err: any) {
      setPosture(null);
      setFrameworks([]);
      setAttestations([]);
      setValidators([]);
      setError(`Unable to load compliance dashboard. ${err.message || 'Failed to load compliance data'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'posture', label: 'Posture' },
    { key: 'frameworks', label: 'Frameworks' },
    { key: 'attestations', label: 'Attestations' },
    { key: 'validators', label: 'Validators' },
  ];

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Compliance Dashboard
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.875rem' }}>
        Regulatory classification, attestation coverage, and compliance posture.
      </p>

      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          gap: '0.25rem',
          borderBottom: '1px solid #e5e7eb',
          marginBottom: '1rem',
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              background: tab === t.key ? '#2563eb' : 'transparent',
              color: tab === t.key ? '#fff' : '#374151',
              borderRadius: '0.375rem 0.375rem 0 0',
              cursor: 'pointer',
              fontWeight: tab === t.key ? 600 : 400,
              fontSize: '0.875rem',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: '#6b7280' }}>Loading...</p>}
      {error && <p style={{ color: '#dc2626' }}>{error}</p>}

      {!loading && !error && (
        <>
          {tab === 'posture' && posture && <PostureTab posture={posture} />}
          {tab === 'frameworks' && <FrameworksTab frameworks={frameworks} />}
          {tab === 'attestations' && <AttestationsTab attestations={attestations} />}
          {tab === 'validators' && <ValidatorsTab validators={validators} />}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Posture Tab                                                          */
/* ------------------------------------------------------------------ */

function PostureTab({ posture }: { posture: PostureData }) {
  const reg = posture.regulatory;
  return (
    <div>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>
        Tenant: {posture.tenantId}
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <InfoCard label="Country" value={reg.countryCode} />
        <InfoCard label="Frameworks" value={reg.frameworks.join(', ')} />
        <InfoCard label="Consent Model" value={reg.consentModel} />
        <InfoCard label="Retention" value={`${reg.retentionMinYears} years min`} />
        <InfoCard label="Cross-Border" value={reg.crossBorderPolicy} />
        <InfoCard label="Breach Notif." value={`${reg.breachNotificationHours}h`} />
        <InfoCard label="Pack Available" value={reg.packAvailable ? 'Yes' : 'No'} />
        <InfoCard label="Validators" value={String(posture.validatorCount)} />
      </div>

      <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Chain Integrity</h3>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <ChainBadge label="Attestations" valid={posture.chainIntegrity.attestations} />
        <ChainBadge label="Country Assignments" valid={posture.chainIntegrity.countryAssignments} />
      </div>

      <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
        Supported countries: {posture.supportedCountries.join(', ')}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Frameworks Tab                                                       */
/* ------------------------------------------------------------------ */

function FrameworksTab({ frameworks }: { frameworks: FrameworkDef[] }) {
  if (frameworks.length === 0) return <p style={{ color: '#6b7280' }}>No frameworks loaded.</p>;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
          <th style={{ padding: '0.5rem' }}>ID</th>
          <th style={{ padding: '0.5rem' }}>Name</th>
          <th style={{ padding: '0.5rem' }}>Countries</th>
          <th style={{ padding: '0.5rem' }}>PHI Elements</th>
          <th style={{ padding: '0.5rem' }}>Retention</th>
        </tr>
      </thead>
      <tbody>
        {frameworks.map((fw) => (
          <tr key={fw.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
            <td style={{ padding: '0.5rem', fontWeight: 600 }}>{fw.id}</td>
            <td style={{ padding: '0.5rem' }}>{fw.name}</td>
            <td style={{ padding: '0.5rem' }}>{fw.countryCodes.join(', ')}</td>
            <td style={{ padding: '0.5rem' }}>{fw.phiElements.length}</td>
            <td style={{ padding: '0.5rem' }}>
              {fw.defaultRetention.minYears}-{fw.defaultRetention.maxYears ?? 'Infinity'} yr
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ------------------------------------------------------------------ */
/* Attestations Tab                                                     */
/* ------------------------------------------------------------------ */

function AttestationsTab({ attestations }: { attestations: AttestationSummary[] }) {
  if (attestations.length === 0) {
    return <p style={{ color: '#6b7280' }}>No attestations recorded yet.</p>;
  }
  return (
    <div>
      {attestations.map((a) => (
        <div
          key={a.framework}
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '0.75rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem',
            }}
          >
            <span style={{ fontWeight: 600 }}>{a.framework}</span>
            <CoverageBadge percent={a.coveragePercent} />
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
            <span>Total: {a.total}</span>
            <span style={{ color: '#16a34a' }}>Attested: {a.attested}</span>
            <span style={{ color: '#dc2626' }}>Expired: {a.expired}</span>
            <span style={{ color: '#ea580c' }}>Revoked: {a.revoked}</span>
            <span style={{ color: '#2563eb' }}>Pending: {a.pendingReview}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Validators Tab                                                       */
/* ------------------------------------------------------------------ */

function ValidatorsTab({ validators }: { validators: ValidatorInfo[] }) {
  if (validators.length === 0) return <p style={{ color: '#6b7280' }}>No validators registered.</p>;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
          <th style={{ padding: '0.5rem' }}>Country</th>
          <th style={{ padding: '0.5rem' }}>Name</th>
          <th style={{ padding: '0.5rem' }}>Domains</th>
        </tr>
      </thead>
      <tbody>
        {validators.map((v) => (
          <tr key={v.countryCode} style={{ borderBottom: '1px solid #f3f4f6' }}>
            <td style={{ padding: '0.5rem', fontWeight: 600 }}>{v.countryCode}</td>
            <td style={{ padding: '0.5rem' }}>{v.name}</td>
            <td style={{ padding: '0.5rem' }}>{v.domains.join(', ')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ------------------------------------------------------------------ */
/* Small Components                                                     */
/* ------------------------------------------------------------------ */

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#f9fafb', borderRadius: '0.5rem', padding: '0.75rem' }}>
      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{value}</div>
    </div>
  );
}

function ChainBadge({ label, valid }: { label: string; valid: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        background: valid ? '#dcfce7' : '#fee2e2',
        color: valid ? '#166534' : '#991b1b',
      }}
    >
      {valid ? 'VALID' : 'BROKEN'} -- {label}
    </span>
  );
}

function CoverageBadge({ percent }: { percent: number }) {
  const color = percent >= 80 ? '#16a34a' : percent >= 50 ? '#ea580c' : '#dc2626';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.125rem 0.5rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        background: `${color}20`,
        color,
      }}
    >
      {percent}% coverage
    </span>
  );
}
