'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/components/cprs/cprs.module.css';

/**
 * CPRS Login page — simulates the CPRS access/verify code entry.
 * In this sandbox mode, credentials are fixed (PROV123 / PROV123!!).
 * The login page authenticates the UI context; actual RPC auth happens server-side.
 */
export default function CPRSLoginPage() {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Verify the API is reachable
      const res = await fetch('http://127.0.0.1:3001/vista/ping');
      const data = await res.json();
      if (data.ok) {
        // Navigate to patient selection
        router.push('/cprs/patient-search');
      } else {
        setError('EHR system is not responding. Check that VistA Docker is running.');
      }
    } catch {
      setError('Cannot reach API server. Ensure the API is running on port 3001.');
    } finally {
      setLoading(false);
    }
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
              placeholder="PROV123"
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
              placeholder="PROV123!!"
            />
          </div>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            type="submit"
            disabled={loading}
            style={{ width: '100%', marginTop: 8 }}
          >
            {loading ? 'Connecting...' : 'Sign On'}
          </button>
        </form>

        <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', textAlign: 'center', marginTop: 16 }}>
          Sandbox mode &mdash; credentials are handled server-side via .env.local
        </p>
      </div>
    </div>
  );
}
