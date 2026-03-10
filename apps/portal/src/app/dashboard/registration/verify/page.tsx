'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/api-config';

type Phase = 'form' | 'submitting' | 'success' | 'error';

export default function VerifyRegistrationPage() {
  const router = useRouter();
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [dob, setDob] = useState('');
  const [last4ssn, setLast4ssn] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<Phase>('form');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!lastName.trim() || !firstName.trim() || !dob) {
      setError('Last name, first name, and date of birth are required.');
      return;
    }
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setPhase('submitting');

    try {
      const res = await fetch(`${API_BASE}/portal/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastName: lastName.trim(),
          firstName: firstName.trim(),
          dob,
          last4ssn: last4ssn.trim() || undefined,
          email: email.trim(),
          password,
        }),
      });

      const body = await res.json().catch(() => ({ error: 'Registration failed' }));

      if (res.ok && body.ok) {
        setPhase('success');
        setTimeout(() => router.push('/dashboard'), 2000);
        return;
      }

      setError(body.error || `Registration failed (HTTP ${res.status})`);
      setPhase('error');
    } catch {
      setError('Unable to connect to server. Please try again.');
      setPhase('error');
    }
  }

  if (phase === 'success') {
    return (
      <div className="container" style={{ maxWidth: 480, margin: '4rem auto', padding: '0 1rem' }}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', color: '#059669', marginBottom: '1rem' }}>&#10003;</div>
            <h2 style={{ fontSize: '1.25rem', color: '#059669', marginBottom: '0.5rem' }}>
              Registration Complete
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Your identity has been verified and your account is active.
              Redirecting to your dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 480, margin: '4rem auto', padding: '0 1rem' }}>
      <div style={cardStyle}>
        <h1 style={{ fontSize: '1.375rem', marginBottom: '0.25rem', color: '#1e293b' }}>
          Patient Registration
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Verify your identity to access your health records online.
        </p>

        <form onSubmit={handleSubmit}>
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend style={sectionStyle}>Identity Verification</legend>

            <div style={fieldRow}>
              <div>
                <label style={labelStyle}>Last Name *</label>
                <input
                  style={inputStyle}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="SMITH"
                  autoComplete="family-name"
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>First Name *</label>
                <input
                  style={inputStyle}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="JOHN"
                  autoComplete="given-name"
                  required
                />
              </div>
            </div>

            <div style={fieldRow}>
              <div>
                <label style={labelStyle}>Date of Birth *</label>
                <input
                  type="date"
                  style={inputStyle}
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Last 4 of SSN</label>
                <input
                  style={inputStyle}
                  value={last4ssn}
                  onChange={(e) => setLast4ssn(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="1234"
                  maxLength={4}
                  inputMode="numeric"
                  autoComplete="off"
                />
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  Recommended for faster verification
                </div>
              </div>
            </div>
          </fieldset>

          <fieldset style={{ border: 'none', padding: 0, margin: '1.25rem 0 0 0' }}>
            <legend style={sectionStyle}>Account Setup</legend>

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={labelStyle}>Email *</label>
              <input
                type="email"
                style={inputStyle}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div style={fieldRow}>
              <div>
                <label style={labelStyle}>Password *</label>
                <input
                  type="password"
                  style={inputStyle}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Confirm Password *</label>
                <input
                  type="password"
                  style={inputStyle}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
          </fieldset>

          {(error || phase === 'error') && (
            <div style={errorBox}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={phase === 'submitting'}
            style={{
              ...btnPrimary,
              width: '100%',
              marginTop: '1rem',
              opacity: phase === 'submitting' ? 0.7 : 1,
            }}
          >
            {phase === 'submitting' ? 'Verifying identity...' : 'Verify & Create Account'}
          </button>

          <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>
            <span style={{ color: '#64748b' }}>Already have an account? </span>
            <a href="/" style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 500 }}>
              Sign in
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  padding: '2rem',
};

const sectionStyle: React.CSSProperties = {
  fontSize: '0.8125rem',
  fontWeight: 600,
  color: '#475569',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '1rem',
  paddingBottom: '0.5rem',
  borderBottom: '1px solid #e2e8f0',
  width: '100%',
};

const fieldRow: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '0.75rem',
  marginBottom: '0.75rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8125rem',
  fontWeight: 500,
  color: '#334155',
  marginBottom: '0.25rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  outline: 'none',
  background: '#fff',
  color: '#1e293b',
  boxSizing: 'border-box',
};

const btnPrimary: React.CSSProperties = {
  padding: '0.625rem 1.5rem',
  fontSize: '0.875rem',
  fontWeight: 600,
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
};

const errorBox: React.CSSProperties = {
  marginTop: '1rem',
  padding: '0.75rem 1rem',
  background: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: 6,
  fontSize: '0.8125rem',
  color: '#991b1b',
};
