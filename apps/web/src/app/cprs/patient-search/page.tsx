'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePatient } from '@/stores/patient-context';
import { useSession } from '@/stores/session-context';
import styles from '@/components/cprs/cprs.module.css';
import { API_BASE } from '@/lib/api-config';
import type { PatientSummary } from '@vista-evolved/shared-types';

/** Local alias for backward compat */
type PatientSearchResult = PatientSummary;

/**
 * CPRS Patient Search / Selection page.
 * Mirrors frmPtSel from CPRS Delphi -- patient list + search.
 */
export default function CPRSPatientSearchPage() {
  const router = useRouter();
  const { selectPatient } = usePatient();
  const { authenticated, ready } = useSession();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PatientSearchResult[]>([]);
  const [defaultList, setDefaultList] = useState<PatientSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/cprs/login');
    }
  }, [ready, authenticated, router]);

  // Load default patient list on mount
  useEffect(() => {
    if (!authenticated) return;
    async function loadDefaults() {
      try {
        const res = await fetch(`${API_BASE}/vista/default-patient-list`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (data.ok && Array.isArray(data.patients)) {
          setDefaultList(data.patients);
        }
      } catch {
        // Non-critical
      }
    }
    loadDefaults();
  }, [authenticated]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `${API_BASE}/vista/patient-search?q=${encodeURIComponent(query.trim())}`,
        { credentials: 'include' }
      );
      const data = await res.json();
      if (data.ok && Array.isArray(data.results)) {
        setResults(data.results);
        if (data.results.length === 0) setError('No patients found.');
      } else {
        setError(data.error || 'Search failed.');
      }
    } catch (err: unknown) {
      setError(`Network error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectPatient(dfn: string) {
    setSelected(dfn);
  }

  async function handleOpenChart() {
    if (!selected) return;
    await selectPatient(selected);
    router.push(`/cprs/chart/${selected}/cover`);
  }

  const displayList = results.length > 0 ? results : defaultList;

  // Show loading while checking session, or redirect if not authenticated
  if (!ready || !authenticated) {
    return (
      <div
        className={styles.shell}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <p style={{ color: 'var(--cprs-text-muted)' }}>Checking session...</p>
      </div>
    );
  }

  return (
    <div
      className={styles.shell}
      style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}
    >
      <div className={styles.menuBar}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>EHR &mdash; Evolved</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--cprs-text-muted)' }}>
          Patient Selection
        </span>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: 16,
          maxWidth: 700,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Select a Patient</h2>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            className={styles.formInput}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name (e.g. CARTER)"
            autoFocus
            style={{ flex: 1 }}
          />
          <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={loading} title={loading ? 'Patient search is already in progress.' : undefined}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {error && (
          <div
            style={{
              padding: '6px 10px',
              background: '#f8d7da',
              border: '1px solid #dc3545',
              borderRadius: 4,
              color: '#721c24',
              fontSize: 12,
              marginBottom: 8,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            border: '1px solid var(--cprs-border)',
            borderRadius: 4,
            background: 'var(--cprs-bg)',
          }}
        >
          {displayList.length === 0 ? (
            <p className={styles.emptyText} style={{ padding: 20, textAlign: 'center' }}>
              {results.length === 0 && defaultList.length === 0
                ? 'Enter a name to search for patients.'
                : 'No results.'}
            </p>
          ) : (
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>DFN</th>
                  <th>SSN</th>
                  <th>DOB</th>
                </tr>
              </thead>
              <tbody>
                {displayList.map((p) => (
                  <tr
                    key={p.dfn}
                    onClick={() => handleSelectPatient(p.dfn)}
                    onDoubleClick={() => {
                      handleSelectPatient(p.dfn);
                      setTimeout(handleOpenChart, 50);
                    }}
                    style={selected === p.dfn ? { background: 'var(--cprs-selected)' } : undefined}
                  >
                    <td>{p.name}</td>
                    <td>{p.dfn}</td>
                    <td>{p.ssn || '--'}</td>
                    <td>{p.dob || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
          <button className={styles.btn} onClick={() => router.push('/cprs/login')}>
            Back
          </button>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleOpenChart}
            disabled={!selected}
          >
            Open Chart
          </button>
        </div>
      </div>
    </div>
  );
}
