'use client';

import { useState, useEffect } from 'react';
import { usePatient } from '@/stores/patient-context';
import CPRSMenuBar from '@/components/cprs/CPRSMenuBar';
import PatientBanner from '@/components/cprs/PatientBanner';
import styles from '@/components/cprs/cprs.module.css';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface RemoteFacility {
  id: string;
  name: string;
  station: string;
  status: 'connected' | 'timeout' | 'unavailable';
}

interface RemoteDataDomain {
  id: string;
  label: string;
  description: string;
  rpcContract: string;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const REMOTE_DOMAINS: RemoteDataDomain[] = [
  { id: 'allergies', label: 'Allergies', description: 'Allergy data from remote facilities', rpcContract: 'ORWCIRN HDRA' },
  { id: 'problems', label: 'Active Problems', description: 'Problem list from remote facilities', rpcContract: 'ORWCIRN HDRA' },
  { id: 'vitals', label: 'Vitals', description: 'Recent vital signs from remote facilities', rpcContract: 'ORWCIRN HDRA' },
  { id: 'labs', label: 'Lab Results', description: 'Laboratory results from remote facilities', rpcContract: 'ORWCIRN HDRA' },
  { id: 'meds', label: 'Medications', description: 'Active medications from remote facilities', rpcContract: 'ORWCIRN HDRA' },
  { id: 'notes', label: 'Progress Notes', description: 'Clinical notes from remote facilities', rpcContract: 'ORWCIRN HDRA' },
  { id: 'radiology', label: 'Radiology', description: 'Imaging reports from remote facilities', rpcContract: 'ORWCIRN HDRA' },
  { id: 'surgery', label: 'Surgery', description: 'Surgical procedures from remote facilities', rpcContract: 'ORWCIRN HDRA' },
];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function RemoteDataViewerPage() {
  const { dfn, demographics } = usePatient();
  const [facilities, setFacilities] = useState<RemoteFacility[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>('allergies');
  const [queryResult, setQueryResult] = useState<string | null>(null);
  const [querying, setQuerying] = useState(false);

  useEffect(() => {
    // In Docker sandbox, no remote facilities exist.
    // Architecture hook: would call ORWCIRN FACLIST RPC here.
    const timer = setTimeout(() => {
      setFacilities([]);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  function handleQuery() {
    if (!selectedFacility) return;
    setQuerying(true);
    setQueryResult(null);
    // Simulated delay — in production, would call ORWCIRN HDRA
    setTimeout(() => {
      setQueryResult('No remote data available in Docker sandbox. This endpoint would call ORWCIRN HDRA with the selected facility station number and data domain.');
      setQuerying(false);
    }, 800);
  }

  return (
    <div className={styles.shell}>
      <CPRSMenuBar dfn={dfn || undefined} />
      <PatientBanner />

      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 18, margin: '0 0 4px' }}>Remote Data Viewer</h1>
        <p style={{ fontSize: 12, color: 'var(--cprs-text-muted)', margin: '0 0 16px' }}>
          View clinical data from other connected facilities via Health Information Exchange.
          Contract: ORWCIRN FACLIST, ORWCIRN HDRA
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, minHeight: 400 }}>
          {/* Left: Facilities + Domains */}
          <div>
            <div className={styles.panelTitle}>Connected Facilities</div>
            {loading ? (
              <p style={{ fontSize: 12, color: 'var(--cprs-text-muted)' }}>Querying remote facilities...</p>
            ) : facilities.length === 0 ? (
              <div style={{ padding: 16, border: '1px dashed var(--cprs-border)', borderRadius: 6, marginBottom: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 4px' }}>No Remote Facilities</p>
                <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', margin: 0 }}>
                  The Docker sandbox does not have remote facility connections.
                  In production, facilities are discovered via ORWCIRN FACLIST.
                </p>
              </div>
            ) : (
              <div style={{ marginBottom: 12 }}>
                {facilities.map((f) => (
                  <button
                    key={f.id}
                    className={styles.btn}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      marginBottom: 4,
                      ...(selectedFacility === f.id ? { background: 'var(--cprs-selected)', fontWeight: 600 } : {}),
                    }}
                    onClick={() => setSelectedFacility(f.id)}
                  >
                    {f.name} ({f.station})
                    <span style={{ float: 'right', fontSize: 10, color: f.status === 'connected' ? '#28a745' : '#dc3545' }}>
                      {f.status}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className={styles.panelTitle} style={{ marginTop: 16 }}>Data Domains</div>
            {REMOTE_DOMAINS.map((d) => (
              <button
                key={d.id}
                className={styles.btn}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  marginBottom: 4,
                  fontSize: 12,
                  ...(selectedDomain === d.id ? { background: 'var(--cprs-selected)', fontWeight: 600 } : {}),
                }}
                onClick={() => setSelectedDomain(d.id)}
              >
                {d.label}
              </button>
            ))}

            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              style={{ width: '100%', marginTop: 12 }}
              disabled={!selectedFacility || querying}
              onClick={handleQuery}
            >
              {querying ? 'Querying...' : 'Query Remote Data'}
            </button>
          </div>

          {/* Right: Results */}
          <div style={{ border: '1px solid var(--cprs-border)', borderRadius: 6, padding: 16 }}>
            <div className={styles.panelTitle}>
              {REMOTE_DOMAINS.find((d) => d.id === selectedDomain)?.label || 'Results'}
              {selectedFacility && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--cprs-text-muted)' }}> — {facilities.find((f) => f.id === selectedFacility)?.name}</span>}
            </div>

            {queryResult ? (
              <div style={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', background: 'var(--cprs-bg)', padding: 12, borderRadius: 4 }}>
                {queryResult}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--cprs-text-muted)' }}>
                  {facilities.length === 0 ? 'No Remote Facilities Available' : 'Select a facility and domain, then click Query'}
                </p>
                <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', maxWidth: 400, margin: '8px auto' }}>
                  Patient: {demographics?.name || `DFN ${dfn}`}
                  {demographics?.name && <><br />Remote correlation requires ICN (Integration Control Number)</>}
                </p>
              </div>
            )}

            <div style={{ marginTop: 16, padding: 8, background: 'var(--cprs-bg)', borderRadius: 4, fontSize: 11, color: 'var(--cprs-text-muted)' }}>
              <strong>Architecture:</strong>
              <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                <li>ORWCIRN FACLIST — Lists connected remote facilities</li>
                <li>ORWCIRN HDRA — Retrieves remote patient data by facility + domain</li>
                <li>Patient correlation via ICN (Integration Control Number)</li>
                <li>FHIR R4 bridge available for modern interoperability</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
