/**
 * Share Viewer -- External access to shared health records.
 * Token in URL, access code + DOB verification required.
 * No portal session needed -- this is a public page.
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { previewShare, verifyShare } from '@/lib/api';

export default function ShareViewerPage() {
  const params = useParams();
  const token = params?.token as string;

  const [preview, setPreview] = useState<any>(null);
  const [accessCode, setAccessCode] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    previewShare(token).then((res) => {
      if (res.ok && res.data) {
        setPreview((res.data as any).preview);
      } else {
        setNotFound(true);
      }
    });
  }, [token]);

  async function handleVerify() {
    if (!accessCode || !dob) {
      setError('Access code and date of birth are required.');
      return;
    }
    setVerifying(true);
    setError('');
    const res = await verifyShare(token, { accessCode, patientDob: dob });
    setVerifying(false);
    if (res.ok && res.data) {
      setData(res.data);
    } else {
      const errData = res.error;
      try {
        const parsed = JSON.parse(errData || '{}');
        setError(parsed.error || 'Verification failed.');
      } catch {
        setError(errData || 'Verification failed.');
      }
    }
  }

  if (notFound) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h1 style={{ fontSize: '1.25rem' }}>Share Not Found</h1>
          <p style={{ color: '#64748b' }}>
            This share link is invalid, expired, or has been revoked.
          </p>
        </div>
      </div>
    );
  }

  if (data) {
    return (
      <div style={pageStyle}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ ...cardStyle, marginBottom: '1rem' }}>
            <h1 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Shared Health Record</h1>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              Patient: {(data as any).patientName} * Expires:{' '}
              {new Date((data as any).expiresAt).toLocaleDateString()}
            </p>
          </div>

          {Object.entries((data as any).data || {}).map(([section, records]: [string, any]) => (
            <div key={section} style={{ ...cardStyle, marginBottom: '0.75rem' }}>
              <h3 style={{ textTransform: 'capitalize', marginBottom: '0.5rem' }}>{section}</h3>
              {!records || (records as any[]).length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No data available.</p>
              ) : (
                <pre style={{ fontSize: '0.8125rem', whiteSpace: 'pre-wrap', color: '#334155' }}>
                  {JSON.stringify(records, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Verify Access</h1>
        {preview && (
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Shared by: {preview.patientName} * Sections: {preview.sections?.join(', ')}* Expires:{' '}
            {new Date(preview.expiresAt).toLocaleDateString()}
          </p>
        )}

        {error && (
          <div
            style={{
              padding: '0.375rem 0.75rem',
              background: '#fef2f2',
              color: '#dc2626',
              borderRadius: 4,
              marginBottom: '0.75rem',
              fontSize: '0.8125rem',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 500 }}>Access Code</label>
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              placeholder="6-character code"
              maxLength={6}
              style={{
                display: 'block',
                width: '100%',
                padding: '0.375rem',
                borderRadius: 4,
                border: '1px solid #cbd5e1',
                marginTop: '0.25rem',
                fontSize: '1rem',
                letterSpacing: '0.15em',
                fontWeight: 600,
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 500 }}>Patient Date of Birth</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              style={{
                display: 'block',
                width: '100%',
                padding: '0.375rem',
                borderRadius: 4,
                border: '1px solid #cbd5e1',
                marginTop: '0.25rem',
              }}
            />
          </div>
          <button
            onClick={handleVerify}
            disabled={verifying}
            style={{
              padding: '0.5rem',
              background: verifying ? '#94a3b8' : '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              fontWeight: 600,
              cursor: verifying ? 'not-allowed' : 'pointer',
            }}
          >
            {verifying ? 'Verifying...' : 'View Records'}
          </button>
        </div>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#f8fafc',
  padding: '2rem 1rem',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-start',
};

const cardStyle: React.CSSProperties = {
  maxWidth: 440,
  width: '100%',
  background: '#fff',
  borderRadius: 8,
  padding: '1.5rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
};
