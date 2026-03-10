'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/api-config';

async function kioskFetch(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  return res.json();
}

/* ================================================================== */
/* Kiosk Start Page -- large touch-friendly intake launcher              */
/* ================================================================== */

export default function KioskStartPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'start' | 'resume'>('start');
  const [resumeToken, setResumeToken] = useState('');
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function startNewSession() {
    setLoading(true);
    setError('');
    try {
      const res = await kioskFetch('/kiosk/sessions', {
        method: 'POST',
        body: JSON.stringify({ language, context: {} }),
      });
      if (res.ok && res.session) {
        // Store resume token in localStorage for QR code
        if (res.resumeToken) {
          localStorage.setItem(`kiosk_resume_${res.session.id}`, res.resumeToken);
        }
        router.push(`/kiosk/intake/${res.session.id}`);
      } else {
        setError(res.error || 'Failed to start session');
      }
    } catch {
      setError('Connection error. Please try again.');
    }
    setLoading(false);
  }

  async function resumeSession() {
    if (!resumeToken.trim()) {
      setError('Please enter a resume code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await kioskFetch('/kiosk/sessions', {
        method: 'POST',
        body: JSON.stringify({ resumeToken: resumeToken.trim() }),
      });
      if (res.ok && res.session) {
        router.push(`/kiosk/intake/${res.session.id}`);
      } else {
        setError('Invalid or expired code. Please try again or start a new session.');
      }
    } catch {
      setError('Connection error. Please try again.');
    }
    setLoading(false);
  }

  /* ---- Kiosk-optimized styles (large touch targets) ---- */
  const containerStyle: React.CSSProperties = {
    maxWidth: 600,
    margin: '0 auto',
    padding: '48px 24px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  };

  const bigBtn: React.CSSProperties = {
    width: '100%',
    padding: '20px 32px',
    borderRadius: '12px',
    fontSize: '20px',
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
    marginTop: '16px',
    minHeight: '64px', // 44px min touch target exceeded
  };

  const bigInput: React.CSSProperties = {
    width: '100%',
    padding: '18px 20px',
    borderRadius: '12px',
    border: '2px solid #e5e7eb',
    fontSize: '20px',
    textAlign: 'center',
    letterSpacing: '2px',
    marginTop: '12px',
  };

  const tabBtn = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '16px',
    fontSize: '18px',
    fontWeight: 600,
    border: 'none',
    borderBottom: active ? '3px solid #2563eb' : '3px solid transparent',
    background: active ? '#eff6ff' : 'transparent',
    cursor: 'pointer',
    borderRadius: '8px 8px 0 0',
  });

  return (
    <div style={containerStyle}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>Welcome</h1>
        <p style={{ fontSize: '18px', color: '#6b7280' }}>
          Please complete your health questionnaire
        </p>
      </div>

      {/* Tab toggle */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
        <button style={tabBtn(mode === 'start')} onClick={() => setMode('start')}>
          New Patient
        </button>
        <button style={tabBtn(mode === 'resume')} onClick={() => setMode('resume')}>
          Resume
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px',
            background: '#fef2f2',
            color: '#991b1b',
            border: '1px solid #fecaca',
            fontSize: '16px',
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}

      {mode === 'start' ? (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{ fontSize: '16px', fontWeight: 500, display: 'block', marginBottom: '8px' }}
            >
              Preferred Language
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              {[
                { value: 'en', label: 'English' },
                { value: 'tl', label: 'Tagalog' },
              ].map((lang) => (
                <button
                  key={lang.value}
                  onClick={() => setLanguage(lang.value)}
                  style={{
                    flex: 1,
                    padding: '16px',
                    borderRadius: '8px',
                    fontSize: '18px',
                    border: language === lang.value ? '3px solid #2563eb' : '2px solid #e5e7eb',
                    background: language === lang.value ? '#eff6ff' : '#fff',
                    cursor: 'pointer',
                    fontWeight: language === lang.value ? 700 : 400,
                  }}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          <button
            style={{ ...bigBtn, background: '#2563eb', color: '#fff' }}
            onClick={startNewSession}
            disabled={loading}
          >
            {loading ? 'Starting...' : 'Start Questionnaire'}
          </button>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '4px' }}>
            Enter the code from your phone or previous session:
          </p>
          <input
            type="text"
            style={bigInput}
            value={resumeToken}
            onChange={(e) => setResumeToken(e.target.value)}
            placeholder="Enter resume code"
            autoFocus
          />
          <button
            style={{ ...bigBtn, background: '#2563eb', color: '#fff' }}
            onClick={resumeSession}
            disabled={loading}
          >
            {loading ? 'Resuming...' : 'Resume Session'}
          </button>
        </div>
      )}

      <div style={{ marginTop: '48px', textAlign: 'center' }}>
        <p style={{ fontSize: '12px', color: '#9ca3af' }}>VistA-Evolved Patient Intake System</p>
      </div>
    </div>
  );
}
