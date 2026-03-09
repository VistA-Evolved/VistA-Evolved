'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/api-config';
import { getCsrfTokenSync } from '@/lib/csrf';

/* ─── Types ──────────────────────────────────────────────────────── */

interface VistaConfig {
  divisions: number;
  maxWards: number;
  maxClinics: number;
  schedulingEnabled: boolean;
  inpatientEnabled: boolean;
}

interface EntityType {
  name: string;
  description: string;
  defaultSku: string;
  maxProviders: number;
  defaultModules: string[];
  optionalModules: string[];
  defaultDepartments: string[];
  vistaConfig: VistaConfig;
}

interface SkuDef {
  name: string;
  description: string;
  modules: string[];
}

interface ProvisionedTenant {
  id: string;
  name: string;
  entityType: string;
  country: string;
  contactEmail: string;
  modules: string[];
  config: Record<string, unknown>;
  sku: string;
  status: string;
  createdAt: string;
}

/* ─── Styles ─────────────────────────────────────────────────────── */

const COLOR = {
  bg: '#f8fafc',
  surface: '#ffffff',
  primary: '#1a56db',
  primaryHover: '#1648b8',
  primaryLight: '#eff6ff',
  text: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  border: '#e5e7eb',
  borderFocus: '#1a56db',
  success: '#059669',
  successBg: '#ecfdf5',
  successBorder: '#a7f3d0',
  errorBg: '#fef2f2',
  errorText: '#dc2626',
  cardSelected: '#1a56db',
  disabledBg: '#f3f4f6',
  amber: '#d97706',
  amberBg: '#fffbeb',
};

const S = {
  page: {
    minHeight: '100vh',
    background: COLOR.bg,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: COLOR.text,
    padding: '32px 24px',
  } as React.CSSProperties,
  container: {
    maxWidth: 900,
    margin: '0 auto',
  } as React.CSSProperties,
  header: {
    textAlign: 'center' as const,
    marginBottom: 40,
  } as React.CSSProperties,
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: COLOR.text,
    margin: 0,
    marginBottom: 8,
  } as React.CSSProperties,
  subtitle: {
    fontSize: 15,
    color: COLOR.textSecondary,
    margin: 0,
  } as React.CSSProperties,
  progress: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 0,
    marginBottom: 40,
  } as React.CSSProperties,
  stepDot: (active: boolean, completed: boolean) => ({
    width: 36,
    height: 36,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 600,
    background: completed ? COLOR.success : active ? COLOR.primary : COLOR.surface,
    color: completed || active ? '#fff' : COLOR.textMuted,
    border: `2px solid ${completed ? COLOR.success : active ? COLOR.primary : COLOR.border}`,
    transition: 'all 0.2s',
    flexShrink: 0,
  } as React.CSSProperties),
  stepLine: (completed: boolean) => ({
    width: 60,
    height: 2,
    background: completed ? COLOR.success : COLOR.border,
    transition: 'background 0.2s',
  } as React.CSSProperties),
  stepLabel: (active: boolean) => ({
    fontSize: 11,
    color: active ? COLOR.primary : COLOR.textMuted,
    textAlign: 'center' as const,
    marginTop: 6,
    fontWeight: active ? 600 : 400,
  } as React.CSSProperties),
  card: {
    background: COLOR.surface,
    borderRadius: 16,
    padding: 32,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    border: `1px solid ${COLOR.border}`,
  } as React.CSSProperties,
  stepTitle: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 8,
  } as React.CSSProperties,
  stepDesc: {
    fontSize: 14,
    color: COLOR.textSecondary,
    marginBottom: 28,
  } as React.CSSProperties,
  entityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 16,
  } as React.CSSProperties,
  entityCard: (selected: boolean) => ({
    padding: 20,
    borderRadius: 12,
    border: `2px solid ${selected ? COLOR.cardSelected : COLOR.border}`,
    background: selected ? COLOR.primaryLight : COLOR.surface,
    cursor: 'pointer',
    transition: 'all 0.15s',
    textAlign: 'left' as const,
  } as React.CSSProperties),
  entityName: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 6,
  } as React.CSSProperties,
  entityDesc: {
    fontSize: 13,
    color: COLOR.textSecondary,
    lineHeight: 1.5,
    marginBottom: 10,
  } as React.CSSProperties,
  entityMeta: {
    fontSize: 12,
    color: COLOR.textMuted,
    display: 'flex',
    gap: 12,
  } as React.CSSProperties,
  badge: (color: string) => ({
    display: 'inline-block',
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 999,
    background: color === 'blue' ? COLOR.primaryLight : color === 'green' ? COLOR.successBg : COLOR.amberBg,
    color: color === 'blue' ? COLOR.primary : color === 'green' ? COLOR.success : COLOR.amber,
  } as React.CSSProperties),
  formGroup: {
    marginBottom: 20,
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: COLOR.text,
    marginBottom: 6,
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '10px 14px',
    fontSize: 14,
    border: `1px solid ${COLOR.border}`,
    borderRadius: 8,
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  } as React.CSSProperties,
  select: {
    width: '100%',
    padding: '10px 14px',
    fontSize: 14,
    border: `1px solid ${COLOR.border}`,
    borderRadius: 8,
    outline: 'none',
    background: COLOR.surface,
    cursor: 'pointer',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  } as React.CSSProperties,
  moduleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
  } as React.CSSProperties,
  moduleItem: (checked: boolean, locked: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    borderRadius: 8,
    border: `1px solid ${checked ? COLOR.primary : COLOR.border}`,
    background: locked ? COLOR.disabledBg : checked ? COLOR.primaryLight : COLOR.surface,
    cursor: locked ? 'not-allowed' : 'pointer',
    transition: 'all 0.12s',
    fontSize: 13,
    fontWeight: checked ? 600 : 400,
    color: locked ? COLOR.textMuted : COLOR.text,
    opacity: locked ? 0.7 : 1,
  } as React.CSSProperties),
  checkbox: {
    width: 16,
    height: 16,
    accentColor: COLOR.primary,
    cursor: 'inherit',
  } as React.CSSProperties,
  reviewSection: {
    marginBottom: 20,
    padding: 16,
    background: COLOR.bg,
    borderRadius: 10,
    border: `1px solid ${COLOR.border}`,
  } as React.CSSProperties,
  reviewLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: COLOR.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: 4,
  } as React.CSSProperties,
  reviewValue: {
    fontSize: 15,
    color: COLOR.text,
    fontWeight: 500,
  } as React.CSSProperties,
  moduleTags: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 6,
    marginTop: 6,
  } as React.CSSProperties,
  moduleTag: {
    fontSize: 12,
    padding: '3px 10px',
    borderRadius: 999,
    background: COLOR.primaryLight,
    color: COLOR.primary,
    fontWeight: 500,
  } as React.CSSProperties,
  btnRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 32,
    gap: 12,
  } as React.CSSProperties,
  btnPrimary: {
    padding: '12px 28px',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    background: COLOR.primary,
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'background 0.15s',
    fontFamily: 'inherit',
  } as React.CSSProperties,
  btnSecondary: {
    padding: '12px 28px',
    fontSize: 14,
    fontWeight: 600,
    color: COLOR.textSecondary,
    background: COLOR.surface,
    border: `1px solid ${COLOR.border}`,
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: 'inherit',
  } as React.CSSProperties,
  successCard: {
    textAlign: 'center' as const,
    padding: 48,
  } as React.CSSProperties,
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: COLOR.successBg,
    border: `3px solid ${COLOR.successBorder}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    fontSize: 28,
    color: COLOR.success,
  } as React.CSSProperties,
  tenantId: {
    fontFamily: 'monospace',
    fontSize: 13,
    background: COLOR.bg,
    padding: '8px 16px',
    borderRadius: 8,
    border: `1px solid ${COLOR.border}`,
    display: 'inline-block',
    marginTop: 12,
    wordBreak: 'break-all' as const,
  } as React.CSSProperties,
  error: {
    padding: 14,
    background: COLOR.errorBg,
    color: COLOR.errorText,
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 13,
  } as React.CSSProperties,
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 60,
    color: COLOR.textSecondary,
    fontSize: 14,
  } as React.CSSProperties,
  spinner: {
    width: 22,
    height: 22,
    border: '3px solid #e5e7eb',
    borderTopColor: COLOR.primary,
    borderRadius: '50%',
  } as React.CSSProperties,
};

const STEP_LABELS = ['Entity Type', 'Organization', 'Modules', 'Review', 'Done'];

const COUNTRIES = [
  { code: 'US', label: 'United States' },
  { code: 'PH', label: 'Philippines' },
  { code: 'GH', label: 'Ghana' },
  { code: 'UK', label: 'United Kingdom' },
  { code: 'AU', label: 'Australia' },
];

const MODULE_LABELS: Record<string, string> = {
  kernel: 'Kernel (Core)',
  clinical: 'Clinical',
  scheduling: 'Scheduling',
  portal: 'Patient Portal',
  analytics: 'Analytics',
  rcm: 'Revenue Cycle',
  imaging: 'Imaging / PACS',
  interop: 'Interop (HL7/FHIR)',
  iam: 'Identity & Access',
  telehealth: 'Telehealth',
  intake: 'Patient Intake',
  ai: 'AI Gateway',
  migration: 'Migration Toolkit',
  fhir: 'FHIR R4 Gateway',
};

const LOCKED_MODULES = new Set(['kernel']);

/* ─── Progress Bar ───────────────────────────────────────────────── */

function ProgressBar({ step }: { step: number }) {
  return (
    <div>
      <div style={S.progress}>
        {STEP_LABELS.map((label, i) => (
          <React.Fragment key={label}>
            {i > 0 && <div style={S.stepLine(i <= step)} />}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={S.stepDot(i === step, i < step)}>
                {i < step ? '\u2713' : i + 1}
              </div>
              <div style={S.stepLabel(i === step)}>{label}</div>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ─── Step 1: Entity Type ────────────────────────────────────────── */

function StepEntityType({
  entityTypes,
  selected,
  onSelect,
}: {
  entityTypes: Record<string, EntityType>;
  selected: string;
  onSelect: (key: string) => void;
}) {
  const providerLabel = (et: EntityType) => {
    if (et.maxProviders <= 10) return '1-10 providers';
    if (et.maxProviders <= 100) return '5-100 providers';
    if (et.maxProviders <= 1000) return '50-1,000 providers';
    return '500+ providers';
  };

  return (
    <div>
      <div style={S.stepTitle}>Select Your Organization Type</div>
      <div style={S.stepDesc}>Choose the type that best describes your healthcare organization.</div>
      <div style={S.entityGrid}>
        {Object.entries(entityTypes).map(([key, et]) => (
          <div
            key={key}
            style={S.entityCard(selected === key)}
            onClick={() => onSelect(key)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSelect(key)}
          >
            <div style={S.entityName}>{et.name}</div>
            <div style={S.entityDesc}>{et.description}</div>
            <div style={S.entityMeta}>
              <span style={S.badge('blue')}>{providerLabel(et)}</span>
              <span style={S.badge(et.vistaConfig.inpatientEnabled ? 'green' : 'amber')}>
                {et.vistaConfig.inpatientEnabled ? 'Inpatient' : 'Outpatient'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Step 2: Organization Details ───────────────────────────────── */

function StepOrgDetails({
  orgName,
  setOrgName,
  email,
  setEmail,
  country,
  setCountry,
}: {
  orgName: string;
  setOrgName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  country: string;
  setCountry: (v: string) => void;
}) {
  return (
    <div>
      <div style={S.stepTitle}>Organization Details</div>
      <div style={S.stepDesc}>Enter your organization information for tenant setup.</div>
      <div style={S.formGroup}>
        <label style={S.label}>Organization Name</label>
        <input
          style={S.input}
          type="text"
          placeholder="e.g., Metro Health Partners"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          onFocus={(e) => (e.target.style.borderColor = COLOR.borderFocus)}
          onBlur={(e) => (e.target.style.borderColor = COLOR.border)}
        />
      </div>
      <div style={S.formGroup}>
        <label style={S.label}>Contact Email</label>
        <input
          style={S.input}
          type="email"
          placeholder="admin@organization.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={(e) => (e.target.style.borderColor = COLOR.borderFocus)}
          onBlur={(e) => (e.target.style.borderColor = COLOR.border)}
        />
      </div>
      <div style={S.formGroup}>
        <label style={S.label}>Country</label>
        <select style={S.select} value={country} onChange={(e) => setCountry(e.target.value)}>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

/* ─── Step 3: Module Selection ───────────────────────────────────── */

function StepModules({
  entityType,
  selectedModules,
  onToggle,
}: {
  entityType: EntityType;
  selectedModules: Set<string>;
  onToggle: (mod: string) => void;
}) {
  const allModules = [
    ...entityType.defaultModules,
    ...entityType.optionalModules.filter((m) => !entityType.defaultModules.includes(m)),
  ];

  return (
    <div>
      <div style={S.stepTitle}>Configure Modules</div>
      <div style={S.stepDesc}>
        Select the modules for your deployment. Defaults are pre-selected based on your entity type.
        Kernel is always required.
      </div>
      <div style={S.moduleGrid}>
        {allModules.map((mod) => {
          const locked = LOCKED_MODULES.has(mod);
          const checked = selectedModules.has(mod);
          return (
            <div
              key={mod}
              style={S.moduleItem(checked, locked)}
              onClick={() => !locked && onToggle(mod)}
              role="checkbox"
              aria-checked={checked}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && !locked && onToggle(mod)}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={locked}
                readOnly
                style={S.checkbox}
                tabIndex={-1}
              />
              <span>{MODULE_LABELS[mod] || mod}</span>
              {locked && (
                <span style={{ marginLeft: 'auto', fontSize: 10, color: COLOR.textMuted }}>Required</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Step 4: Review ─────────────────────────────────────────────── */

function StepReview({
  entityTypes,
  selectedEntityType,
  orgName,
  email,
  country,
  selectedModules,
}: {
  entityTypes: Record<string, EntityType>;
  selectedEntityType: string;
  orgName: string;
  email: string;
  country: string;
  selectedModules: Set<string>;
}) {
  const et = entityTypes[selectedEntityType];
  const countryLabel = COUNTRIES.find((c) => c.code === country)?.label || country;
  const modules = Array.from(selectedModules);

  return (
    <div>
      <div style={S.stepTitle}>Review & Submit</div>
      <div style={S.stepDesc}>Confirm the details below before provisioning your tenant.</div>

      <div style={S.reviewSection}>
        <div style={S.reviewLabel}>Organization Type</div>
        <div style={S.reviewValue}>{et?.name || selectedEntityType}</div>
      </div>
      <div style={S.reviewSection}>
        <div style={S.reviewLabel}>Organization Name</div>
        <div style={S.reviewValue}>{orgName}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={S.reviewSection}>
          <div style={S.reviewLabel}>Contact Email</div>
          <div style={S.reviewValue}>{email}</div>
        </div>
        <div style={S.reviewSection}>
          <div style={S.reviewLabel}>Country</div>
          <div style={S.reviewValue}>{countryLabel}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={S.reviewSection}>
          <div style={S.reviewLabel}>SKU</div>
          <div style={S.reviewValue}>{et?.defaultSku || '—'}</div>
        </div>
        <div style={S.reviewSection}>
          <div style={S.reviewLabel}>Max Providers</div>
          <div style={S.reviewValue}>{et?.maxProviders?.toLocaleString() || '—'}</div>
        </div>
      </div>
      <div style={S.reviewSection}>
        <div style={S.reviewLabel}>Modules ({modules.length})</div>
        <div style={S.moduleTags}>
          {modules.map((m) => (
            <span key={m} style={S.moduleTag}>{MODULE_LABELS[m] || m}</span>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div style={S.reviewSection}>
          <div style={S.reviewLabel}>Divisions</div>
          <div style={S.reviewValue}>{et?.vistaConfig.divisions ?? '—'}</div>
        </div>
        <div style={S.reviewSection}>
          <div style={S.reviewLabel}>Max Clinics</div>
          <div style={S.reviewValue}>{et?.vistaConfig.maxClinics ?? '—'}</div>
        </div>
        <div style={S.reviewSection}>
          <div style={S.reviewLabel}>Max Wards</div>
          <div style={S.reviewValue}>{et?.vistaConfig.maxWards ?? '—'}</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 5: Confirmation ───────────────────────────────────────── */

function StepConfirmation({
  tenant,
  onReset,
}: {
  tenant: ProvisionedTenant;
  onReset: () => void;
}) {
  return (
    <div style={S.successCard}>
      <div style={S.successIcon}>{'\u2713'}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Tenant Created Successfully</div>
      <div style={{ fontSize: 14, color: COLOR.textSecondary, marginBottom: 16 }}>
        Your organization <strong>{tenant.name}</strong> has been provisioned and is in <strong>{tenant.status}</strong> state.
      </div>
      <div style={S.tenantId}>Tenant ID: {tenant.id}</div>
      <div style={{ marginTop: 28 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: COLOR.text }}>Next Steps</div>
        <div style={{ fontSize: 13, color: COLOR.textSecondary, lineHeight: 2, textAlign: 'left' as const, maxWidth: 480, margin: '0 auto' }}>
          1. Configure VistA instance connectivity for this tenant<br />
          2. Set up administrator accounts and RBAC policies<br />
          3. Install required VistA routines via the provisioning toolkit<br />
          4. Activate the tenant when ready for use
        </div>
      </div>
      <div style={{ marginTop: 32 }}>
        <button style={S.btnPrimary} onClick={onReset}>
          Provision Another Tenant
        </button>
      </div>
    </div>
  );
}

/* ─── Main Wizard ────────────────────────────────────────────────── */

export default function ProvisioningWizardPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [entityTypes, setEntityTypes] = useState<Record<string, EntityType>>({});
  const [_skus, setSkus] = useState<Record<string, SkuDef>>({});

  const [selectedEntityType, setSelectedEntityType] = useState('');
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('US');
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
  const [createdTenant, setCreatedTenant] = useState<ProvisionedTenant | null>(null);

  const fetchCatalogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [etRes, skuRes] = await Promise.all([
        fetch(`${API_BASE}/admin/provisioning/entity-types`, { credentials: 'include' }),
        fetch(`${API_BASE}/admin/provisioning/skus`, { credentials: 'include' }),
      ]);
      const etJson = await etRes.json();
      const skuJson = await skuRes.json();
      if (!etJson.ok) throw new Error(etJson.error || 'Failed to load entity types');
      if (!skuJson.ok) throw new Error(skuJson.error || 'Failed to load SKUs');
      setEntityTypes(etJson.entityTypes);
      setSkus(skuJson.skus);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalogs();
  }, [fetchCatalogs]);

  const handleEntitySelect = useCallback((key: string) => {
    setSelectedEntityType(key);
    const et = entityTypes[key];
    if (et) {
      setSelectedModules(new Set(et.defaultModules));
    }
  }, [entityTypes]);

  const handleModuleToggle = useCallback((mod: string) => {
    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (next.has(mod)) next.delete(mod);
      else next.add(mod);
      return next;
    });
  }, []);

  const canProceed = useCallback((): boolean => {
    if (step === 0) return !!selectedEntityType;
    if (step === 1) return orgName.trim().length >= 2 && email.includes('@');
    if (step === 2) return selectedModules.size > 0;
    if (step === 3) return true;
    return false;
  }, [step, selectedEntityType, orgName, email, selectedModules]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError('');
    try {
      const et = entityTypes[selectedEntityType];
      const body = {
        name: orgName.trim(),
        entityType: selectedEntityType,
        country,
        contactEmail: email.trim(),
        modules: Array.from(selectedModules),
        config: et?.vistaConfig || {},
      };

      const csrf = getCsrfTokenSync();
      const res = await fetch(`${API_BASE}/admin/provisioning/tenants`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrf ? { 'x-csrf-token': csrf } : {}),
        },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Provisioning failed');

      setCreatedTenant(json.tenant);
      setStep(4);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to create tenant');
    } finally {
      setSubmitting(false);
    }
  }, [entityTypes, selectedEntityType, orgName, country, email, selectedModules]);

  const handleNext = useCallback(() => {
    if (step === 3) {
      handleSubmit();
    } else {
      setStep((s) => s + 1);
    }
  }, [step, handleSubmit]);

  const handleBack = useCallback(() => {
    setError('');
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const handleReset = useCallback(() => {
    setStep(0);
    setSelectedEntityType('');
    setOrgName('');
    setEmail('');
    setCountry('US');
    setSelectedModules(new Set());
    setCreatedTenant(null);
    setError('');
  }, []);

  if (loading) {
    return (
      <div style={S.page}>
        <style>{`@keyframes prov-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={S.container}>
          <div style={S.header}>
            <h1 style={S.title}>Tenant Provisioning</h1>
            <p style={S.subtitle}>SaaS Signup Wizard</p>
          </div>
          <div style={S.loading}>
            <div style={{ ...S.spinner, animation: 'prov-spin 0.8s linear infinite' }} />
            <span>Loading configuration...</span>
          </div>
        </div>
      </div>
    );
  }

  const et = selectedEntityType ? entityTypes[selectedEntityType] : null;

  return (
    <div style={S.page}>
      <style>{`@keyframes prov-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={S.container}>
        <div style={S.header}>
          <h1 style={S.title}>Tenant Provisioning</h1>
          <p style={S.subtitle}>Configure and deploy a new healthcare organization</p>
        </div>

        <ProgressBar step={step} />

        {error && <div style={S.error}>{error}</div>}

        <div style={S.card}>
          {step === 0 && (
            <StepEntityType
              entityTypes={entityTypes}
              selected={selectedEntityType}
              onSelect={handleEntitySelect}
            />
          )}
          {step === 1 && (
            <StepOrgDetails
              orgName={orgName}
              setOrgName={setOrgName}
              email={email}
              setEmail={setEmail}
              country={country}
              setCountry={setCountry}
            />
          )}
          {step === 2 && et && (
            <StepModules
              entityType={et}
              selectedModules={selectedModules}
              onToggle={handleModuleToggle}
            />
          )}
          {step === 3 && (
            <StepReview
              entityTypes={entityTypes}
              selectedEntityType={selectedEntityType}
              orgName={orgName}
              email={email}
              country={country}
              selectedModules={selectedModules}
            />
          )}
          {step === 4 && createdTenant && (
            <StepConfirmation tenant={createdTenant} onReset={handleReset} />
          )}

          {step < 4 && (
            <div style={S.btnRow}>
              {step > 0 ? (
                <button style={S.btnSecondary} onClick={handleBack}>Back</button>
              ) : (
                <div />
              )}
              <button
                style={{
                  ...S.btnPrimary,
                  opacity: canProceed() && !submitting ? 1 : 0.5,
                  cursor: canProceed() && !submitting ? 'pointer' : 'not-allowed',
                }}
                disabled={!canProceed() || submitting}
                onClick={handleNext}
              >
                {submitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ ...S.spinner, width: 16, height: 16, borderWidth: 2, animation: 'prov-spin 0.8s linear infinite' }} />
                    Provisioning...
                  </span>
                ) : step === 3 ? 'Create Tenant' : 'Continue'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
