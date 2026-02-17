'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/stores/session-context';
import styles from '@/components/cprs/cprs.module.css';

/**
 * CPRS Login page — Phase 13: real VistA authentication.
 *
 * Sends access/verify codes to POST /auth/login which authenticates
 * against the VistA RPC Broker and creates a server-side session.
 */
export default function CPRSLoginPage() {
  const router = useRouter();
  const { authenticated, ready, login } = useSession();
  const [accessCode, setAccessCode] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (ready && authenticated) {
      router.push('/cprs/patient-search');
    }
  }, [ready, authenticated, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!accessCode.trim() || !verifyCode.trim()) {
      setError('Both access code and verify code are required.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(accessCode.trim(), verifyCode.trim());
      if (result.ok) {
        router.push('/cprs/patient-search');
      } else {
        setError(result.error || 'Authentication failed. Check your credentials.');
      }
    } catch {
      setError('Cannot reach API server. Ensure the API is running on port 3001.');
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <div className={styles.shell} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: 'var(--cprs-text-muted)' }}>Checking session...</p>
      </div>
    );
  }

  return (
    <div className={styles.shell} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ width: 380, padding: 32, border: '1px solid var(--cprs-border)', borderRadius: 8, background: 'var(--cprs-surface)' }}>
        <h1 style={{ fontSize: 20, margin: '0 0 4px', textAlign: 'center' }}>EHR &mdash; Evolved</h1>
        <p style={{ fontSize: 12, color: 'var(--cprs-text-muted)', textAlign: 'center', margin: '0 0 20px' }}>
          CPRS Web Replica &bull; Sign On
        </p>

        {error && (
          <div style={{ padding: '8px 12px', background: '#f8d7da', border: '1px solid #dc3545', borderRadius: 4, color: '#721c24', fontSize: 12, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className={styles.formGroup}>
            <label>Access Code</label>
            <input
              className={styles.formInput}
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder={process.env.NODE_ENV !== 'production' ? 'PROV123' : 'Access Code'}
              autoFocus
            />
          </div>
          <div className={styles.formGroup}>
            <label>Verify Code</label>
            <input
              className={styles.formInput}
              type="password"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              placeholder={process.env.NODE_ENV !== 'production' ? 'PROV123!!' : 'Verify Code'}
            />
          </div>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            type="submit"
            disabled={loading}
            style={{ width: '100%', marginTop: 8 }}
          >
            {loading ? 'Authenticating...' : 'Sign On'}
          </button>
        </form>

        {process.env.NODE_ENV !== 'production' && (
          <div style={{ marginTop: 16, padding: 8, background: 'var(--cprs-bg)', borderRadius: 4, fontSize: 11, color: 'var(--cprs-text-muted)' }}>
            <strong>Sandbox accounts:</strong>
            <table style={{ width: '100%', marginTop: 4, fontSize: 10 }}>
              <tbody>
                <tr><td>PROV123 / PROV123!!</td><td>Provider (Clyde)</td></tr>
                <tr><td>NURSE123 / NURSE123!!</td><td>Nurse (Helen)</td></tr>
                <tr><td>PHARM123 / PHARM123!!</td><td>Pharmacist (Linda)</td></tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
