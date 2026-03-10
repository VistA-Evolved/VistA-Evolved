'use client';

import { useState } from 'react';
import { Nav } from '../../components/Nav';
import { Footer } from '../../components/Footer';

type Step = 'org' | 'config' | 'payment' | 'provisioning';

interface OrgData {
  name: string;
  contactEmail: string;
  country: string;
  entityType: string;
}

const entityTypes = [
  { value: 'SOLO_CLINIC', label: 'Solo Practice / Small Clinic' },
  { value: 'MULTI_CLINIC', label: 'Multi-Location Practice' },
  { value: 'SPECIALTY_CENTER', label: 'Specialty Center / ASC' },
  { value: 'HOSPITAL', label: 'Hospital / Medical Center' },
  { value: 'HEALTH_SYSTEM', label: 'Health System / Network' },
];

const countries = [
  { value: 'US', label: 'United States' },
  { value: 'PH', label: 'Philippines' },
  { value: 'AU', label: 'Australia' },
  { value: 'NZ', label: 'New Zealand' },
  { value: 'SG', label: 'Singapore' },
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: '8px',
  border: '1px solid #475569',
  background: '#1e293b',
  color: 'white',
  fontSize: '1rem',
  marginTop: '0.5rem',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: '0.9rem',
  fontWeight: 600,
  display: 'block',
  marginBottom: '1rem',
};

export default function SignupPage() {
  const [step, setStep] = useState<Step>('org');
  const [org, setOrg] = useState<OrgData>({
    name: '',
    contactEmail: '',
    country: 'US',
    entityType: 'SOLO_CLINIC',
  });
  const [provisioningStatus, setProvisioningStatus] = useState<string>('');

  const handleOrgSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('config');
  };

  const handleConfigSubmit = () => {
    setStep('payment');
  };

  const handlePaymentSubmit = async () => {
    setStep('provisioning');
    setProvisioningStatus('Creating your organization...');

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
      const res = await fetch(`${apiBase}/signup/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: org.name,
          contactEmail: org.contactEmail,
          country: org.country,
          entityType: org.entityType,
        }),
      });

      if (res.status === 429) {
        setProvisioningStatus(
          'Too many signup attempts. Please try again in an hour.'
        );
        return;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        setProvisioningStatus(
          `We encountered an issue (${res.status}). ` +
          (errorData?.error ?? 'Please contact support@vistaevolved.com for assistance.')
        );
        return;
      }

      const data = await res.json();
      if (data.ok) {
        setProvisioningStatus(
          data.message || 'Your organization has been registered! ' +
          'An administrator will complete provisioning and you will receive credentials at ' + org.contactEmail + '.'
        );
      } else {
        setProvisioningStatus(
          `Registration received. ${data.error || 'An administrator will complete setup and contact you.'}`
        );
      }
    } catch (err: unknown) {
      const isNetwork = err instanceof TypeError && (err as TypeError).message.includes('fetch');
      if (isNetwork) {
        setProvisioningStatus(
          'Unable to reach the server. Please check your connection and try again, ' +
          'or contact support@vistaevolved.com.'
        );
      } else {
        setProvisioningStatus(
          'Your signup request has been recorded. An administrator will provision your organization ' +
          'and send login credentials to ' + org.contactEmail + '.'
        );
      }
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
      <Nav showCta={false} />

      <section style={{ maxWidth: '540px', margin: '3rem auto', padding: '0 1.5rem' }}>
        {/* Progress */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          {(['org', 'config', 'payment', 'provisioning'] as Step[]).map((s, i) => (
            <div key={s} style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: step === s ? '#2563eb' : i < ['org', 'config', 'payment', 'provisioning'].indexOf(step) ? '#38bdf8' : '#475569',
            }} />
          ))}
        </div>

        {step === 'org' && (
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '2.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Step 1: Organization</h2>
            <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>Tell us about your healthcare organization.</p>
            <form onSubmit={handleOrgSubmit}>
              <label style={labelStyle}>
                Organization Name
                <input style={inputStyle} type="text" required value={org.name} onChange={e => setOrg({ ...org, name: e.target.value })} placeholder="Acme Medical Group" />
              </label>
              <label style={labelStyle}>
                Contact Email
                <input style={inputStyle} type="email" required value={org.contactEmail} onChange={e => setOrg({ ...org, contactEmail: e.target.value })} placeholder="admin@acmemedical.com" />
              </label>
              <label style={labelStyle}>
                Country
                <select style={inputStyle} value={org.country} onChange={e => setOrg({ ...org, country: e.target.value })}>
                  {countries.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </label>
              <label style={labelStyle}>
                Organization Type
                <select style={inputStyle} value={org.entityType} onChange={e => setOrg({ ...org, entityType: e.target.value })}>
                  {entityTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
              <button type="submit" style={{ width: '100%', background: '#2563eb', color: 'white', padding: '0.85rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', marginTop: '1rem' }}>
                Continue
              </button>
            </form>
          </div>
        )}

        {step === 'config' && (
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '2.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Step 2: Configuration</h2>
            <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>Review the default configuration for your organization type.</p>
            <div style={{ background: '#0f172a', borderRadius: '10px', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ color: '#38bdf8', fontWeight: 600, marginBottom: '1rem' }}>
                {entityTypes.find(t => t.value === org.entityType)?.label}
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.8 }}>
                <div>Country: {countries.find(c => c.value === org.country)?.label}</div>
                <div>Modules: Clinical, Scheduling, Portal, Analytics, RCM{
                  org.entityType === 'MULTI_CLINIC' ? ', Interop, Telehealth' :
                  org.entityType === 'HOSPITAL' ? ', Imaging, Interop, IAM, Telehealth' :
                  org.entityType === 'HEALTH_SYSTEM' ? ', Imaging, Interop, IAM, Telehealth, Intake, AI, Migration, FHIR' :
                  org.entityType === 'SPECIALTY_CENTER' ? ', Imaging' : ''
                }</div>
                <div>Inpatient: {['HOSPITAL', 'HEALTH_SYSTEM'].includes(org.entityType) ? 'Enabled' : 'Disabled'}</div>
              </div>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              You can customize modules and departments after provisioning.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setStep('org')} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: 'white', padding: '0.85rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Back
              </button>
              <button onClick={handleConfigSubmit} style={{ flex: 2, background: '#2563eb', color: 'white', padding: '0.85rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                Continue to Payment
              </button>
            </div>
          </div>
        )}

        {step === 'payment' && (
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '2.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Step 3: Payment</h2>
            <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>30-day free trial. No credit card required to start.</p>
            <div style={{ background: '#0f172a', borderRadius: '10px', padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              <div style={{ color: '#fbbf24', fontWeight: 700, marginBottom: '0.5rem' }}>Stripe Integration Pending</div>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                Payment processing will be enabled when STRIPE_SECRET_KEY is configured.
                For now, provisioning proceeds without payment.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setStep('config')} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: 'white', padding: '0.85rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Back
              </button>
              <button onClick={handlePaymentSubmit} style={{ flex: 2, background: '#2563eb', color: 'white', padding: '0.85rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                Start Free Trial
              </button>
            </div>
          </div>
        )}

        {step === 'provisioning' && (
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '2.5rem', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
            <h2 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '1rem' }}>Step 4: Provisioning</h2>
            <div style={{ width: '48px', height: '48px', border: '4px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 1.5rem', animation: provisioningStatus.includes('complete') ? 'none' : 'spin 1s linear infinite' }} />
            <p style={{ color: '#94a3b8', lineHeight: 1.6 }}>{provisioningStatus}</p>
            {provisioningStatus.includes('complete') || provisioningStatus.includes('registered') ? (
              <a href="/" style={{ display: 'inline-block', marginTop: '1.5rem', background: '#2563eb', color: 'white', padding: '0.75rem 2rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>
                Return to Home
              </a>
            ) : null}
          </div>
        )}
      </section>

      <Footer />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
