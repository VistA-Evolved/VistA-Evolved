'use client';

/**
 * Remote Data Viewer -- Phase 18E enhanced.
 *
 * View clinical data from remote facilities and external systems.
 * Phase 18 upgrades:
 *   - Lists configured external FHIR and interop sources from the integration registry
 *   - Shows C0FHIR Suite, external FHIR servers, HL7v2 feeds alongside VistA CIRN
 *   - Architecture hooks for ORWCIRN FACLIST + ORWCIRN HDRA remain
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePatient } from '@/stores/patient-context';
import { useSession } from '@/stores/session-context';
import { useTenant } from '@/stores/tenant-context';
import CPRSMenuBar from '@/components/cprs/CPRSMenuBar';
import PatientBanner from '@/components/cprs/PatientBanner';
import styles from '@/components/cprs/cprs.module.css';
import { API_BASE } from '@/lib/api-config';

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

interface ExternalSource {
  id: string;
  label: string;
  type: string;
  status: string;
  enabled: boolean;
  host: string;
  port: number;
}

interface ApiError extends Error {
  status?: number;
  payload?: unknown;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const REMOTE_DOMAINS: RemoteDataDomain[] = [
  {
    id: 'allergies',
    label: 'Allergies',
    description: 'Allergy data from remote facilities',
    rpcContract: 'ORWCIRN HDRA',
  },
  {
    id: 'problems',
    label: 'Active Problems',
    description: 'Problem list from remote facilities',
    rpcContract: 'ORWCIRN HDRA',
  },
  {
    id: 'vitals',
    label: 'Vitals',
    description: 'Recent vital signs from remote facilities',
    rpcContract: 'ORWCIRN HDRA',
  },
  {
    id: 'labs',
    label: 'Lab Results',
    description: 'Laboratory results from remote facilities',
    rpcContract: 'ORWCIRN HDRA',
  },
  {
    id: 'meds',
    label: 'Medications',
    description: 'Active medications from remote facilities',
    rpcContract: 'ORWCIRN HDRA',
  },
  {
    id: 'notes',
    label: 'Progress Notes',
    description: 'Clinical notes from remote facilities',
    rpcContract: 'ORWCIRN HDRA',
  },
  {
    id: 'radiology',
    label: 'Radiology',
    description: 'Imaging reports from remote facilities',
    rpcContract: 'ORWCIRN HDRA',
  },
  {
    id: 'surgery',
    label: 'Surgery',
    description: 'Surgical procedures from remote facilities',
    rpcContract: 'ORWCIRN HDRA',
  },
];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function RemoteDataViewerPage() {
  const router = useRouter();
  const { dfn, demographics } = usePatient();
  const { ready, authenticated } = useSession();
  const { tenant } = useTenant();
  const [facilities, setFacilities] = useState<RemoteFacility[]>([]);
  const [externalSources, setExternalSources] = useState<ExternalSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [facilitiesError, setFacilitiesError] = useState<string | null>(null);
  const [registryError, setRegistryError] = useState<string | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>('allergies');
  const [queryResult, setQueryResult] = useState<string | null>(null);
  const [querying, setQuerying] = useState(false);

  useEffect(() => {
    if (ready && !authenticated) {
      router.replace('/cprs/login?redirect=%2Fcprs%2Fremote-data-viewer');
    }
  }, [authenticated, ready, router]);

  async function apiFetch(path: string) {
    const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
    let payload: any = null;
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }
    if (!res.ok) {
      const error = new Error(payload?.error || payload?.message || `Request failed (${res.status})`) as ApiError;
      error.status = res.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  function describeRemoteFacilitiesError(error: unknown): string {
    const status = (error as ApiError | undefined)?.status;
    if (status === 401) return 'Authentication required to inspect remote facilities.';
    if (status === 404) return 'Remote facilities route is not registered on this stack.';
    return 'Remote facilities could not be loaded on this stack.';
  }

  function describeRegistryError(error: unknown): string {
    const status = (error as ApiError | undefined)?.status;
    const message = error instanceof Error ? error.message : 'External source registry unavailable.';
    if (status === 401) return 'Authentication required to inspect external registry sources.';
    if (status === 404) return 'Integration registry route is not registered on this stack.';
    return message;
  }

  useEffect(() => {
    if (!ready || !authenticated) return;

    async function init() {
      setLoading(true);
      setFacilitiesError(null);
      setRegistryError(null);

      // 1. Attempt real CIRN facility fetch (sandbox will return empty/error)
      try {
        const facData = await apiFetch('/vista/remote-facilities');
        if (facData.ok && facData.facilities?.length > 0) {
          setFacilities(facData.facilities);
        } else {
          setFacilities([]);
        }
      } catch (error) {
        setFacilities([]);
        setFacilitiesError(describeRemoteFacilitiesError(error));
      }

      // 2. Fetch external sources from integration registry (Phase 18E)
      if (tenant?.tenantId) {
        try {
          const data = await apiFetch(`/admin/registry/${tenant.tenantId}`);
          if (data.ok && data.integrations) {
            const external = data.integrations.filter(
              (i: any) =>
                i.enabled && ['fhir', 'fhir-c0fhir', 'fhir-vpr', 'hl7v2', 'external'].includes(i.type)
            );
            setExternalSources(external);
          } else {
            setExternalSources([]);
          }
        } catch (error) {
          setExternalSources([]);
          setRegistryError(describeRegistryError(error));
        }
      } else {
        setExternalSources([]);
        setRegistryError('Tenant context did not load, so external registry sources cannot be resolved on this stack.');
      }

      setLoading(false);
    }
    init();
  }, [authenticated, ready, tenant?.tenantId]);

  function handleQuery() {
    if (!selectedFacility || !dfn) return;
    setQuerying(true);
    setQueryResult(null);

    // Attempt real API call; fall back to unavailable notice
    (async () => {
      try {
        const data = await apiFetch(
          `/vista/remote-data?facility=${encodeURIComponent(selectedFacility)}&domain=${encodeURIComponent(selectedDomain)}&dfn=${encodeURIComponent(dfn)}`
        );
        if (data.ok && data.result) {
          setQueryResult(data.result);
        } else {
          setQueryResult(integrationPendingMessage(selectedFacility));
        }
      } catch (error) {
        const status = (error as ApiError | undefined)?.status;
        if (status === 404) {
          setQueryResult('--- ROUTE UNAVAILABLE ---\n\nGET /vista/remote-data is not registered on this stack. Remote patient query cannot run from this page.');
        } else if (status === 401) {
          setQueryResult('--- AUTHENTICATION REQUIRED ---\n\nSign in again before querying remote data.');
        } else {
        setQueryResult(integrationPendingMessage(selectedFacility));
        }
      } finally {
        setQuerying(false);
      }
    })();
  }

  function integrationPendingMessage(facilityId: string): string {
    const source = externalSources.find((s) => s.id === facilityId);
    const domainLabel =
      REMOTE_DOMAINS.find((d) => d.id === selectedDomain)?.label || selectedDomain;
    const lines = [
      '--- DATA UNAVAILABLE ---',
      '',
      `Domain: ${domainLabel}`,
      `Source: ${source ? `${source.label} (${source.type})` : `CIRN Facility ${facilityId}`}`,
      '',
      'This query requires one of the following RPCs to be available:',
      '  - ORWCIRN FACLIST (discover remote VistA facilities)',
      '  - ORWCIRN HDRA (retrieve remote patient data by facility + domain)',
      '',
      'Neither is functional in the Docker sandbox.',
      'For external FHIR sources, a C0FHIR Suite or FHIR R4 endpoint is required.',
      '',
      'Blocker: VistA CIRN/HDRA package not installed in WorldVistA Docker image.',
      'Migration: Install VistA CIRN patch or configure external FHIR endpoint.',
    ];
    return lines.join('\n');
  }

  if (!ready || !authenticated) {
    return (
      <div
        className={styles.shell}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}
      >
        <p style={{ color: 'var(--cprs-text-muted)' }}>Checking session...</p>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <CPRSMenuBar dfn={dfn || undefined} />
      <PatientBanner />

      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 18, margin: '0 0 4px' }}>Remote Data Viewer</h1>
        <p style={{ fontSize: 12, color: 'var(--cprs-text-muted)', margin: '0 0 16px' }}>
          View clinical data from other connected facilities and external systems via Health
          Information Exchange. Contract: ORWCIRN FACLIST, ORWCIRN HDRA | Phase 18: Integration
          Registry sources
        </p>

        {(facilitiesError || registryError) && (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              border: '1px solid #c6b36a',
              borderRadius: 6,
              background: '#fff8df',
              color: '#6b5600',
            }}
          >
            <strong>Remote data integration unavailable on this stack.</strong>
            <div style={{ marginTop: 6 }}>
              {facilitiesError && <div>CIRN facilities: {facilitiesError}</div>}
              {registryError && <div>External registry: {registryError}</div>}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, minHeight: 400 }}>
          {/* Left: Facilities + External Sources + Domains */}
          <div>
            <div className={styles.panelTitle}>Connected Facilities (CIRN)</div>
            {loading ? (
              <p style={{ fontSize: 12, color: 'var(--cprs-text-muted)' }}>
                Querying remote facilities...
              </p>
            ) : facilitiesError ? (
              <div
                style={{
                  padding: 12,
                  border: '1px dashed var(--cprs-border)',
                  borderRadius: 6,
                  marginBottom: 12,
                }}
              >
                <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 4px' }}>
                  CIRN Facilities Unavailable
                </p>
                <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', margin: 0 }}>
                  {facilitiesError}
                </p>
              </div>
            ) : facilities.length === 0 ? (
              <div
                style={{
                  padding: 12,
                  border: '1px dashed var(--cprs-border)',
                  borderRadius: 6,
                  marginBottom: 12,
                }}
              >
                <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 4px' }}>
                  No Remote Facilities
                </p>
                <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', margin: 0 }}>
                  Docker sandbox has no CIRN connections. In production, discovered via ORWCIRN
                  FACLIST.
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
                      ...(selectedFacility === f.id
                        ? { background: 'var(--cprs-selected)', fontWeight: 600 }
                        : {}),
                    }}
                    onClick={() => setSelectedFacility(f.id)}
                  >
                    {f.name} ({f.station})
                    <span
                      style={{
                        float: 'right',
                        fontSize: 10,
                        color: f.status === 'connected' ? '#28a745' : '#dc3545',
                      }}
                    >
                      {f.status}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Phase 18E: External integration sources from registry */}
            {registryError ? (
              <div
                style={{
                  padding: 12,
                  border: '1px dashed var(--cprs-border)',
                  borderRadius: 6,
                  marginBottom: 12,
                }}
              >
                <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 4px' }}>
                  External Sources Unavailable
                </p>
                <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', margin: 0 }}>
                  {registryError}
                </p>
              </div>
            ) : externalSources.length > 0 && (
              <>
                <div className={styles.panelTitle} style={{ marginTop: 12 }}>
                  External Sources (Registry)
                </div>
                <div style={{ marginBottom: 12 }}>
                  {externalSources.map((s) => (
                    <button
                      key={s.id}
                      className={styles.btn}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        marginBottom: 4,
                        fontSize: 12,
                        ...(selectedFacility === s.id
                          ? { background: 'var(--cprs-selected)', fontWeight: 600 }
                          : {}),
                      }}
                      onClick={() => setSelectedFacility(s.id)}
                    >
                      {s.label}
                      <span style={{ float: 'right', fontSize: 10 }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '1px 4px',
                            borderRadius: 4,
                            background: s.status === 'connected' ? '#dcfce7' : '#fef2f2',
                            color: s.status === 'connected' ? '#16a34a' : '#dc2626',
                            fontSize: 9,
                          }}
                        >
                          {s.type}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className={styles.panelTitle} style={{ marginTop: 16 }}>
              Data Domains
            </div>
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
                  ...(selectedDomain === d.id
                    ? { background: 'var(--cprs-selected)', fontWeight: 600 }
                    : {}),
                }}
                onClick={() => setSelectedDomain(d.id)}
              >
                {d.label}
              </button>
            ))}

            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              style={{ width: '100%', marginTop: 12 }}
              disabled={!selectedFacility || !dfn || querying}
              onClick={handleQuery}
            >
              {querying ? 'Querying...' : !dfn ? 'Select Patient To Query' : 'Query Remote Data'}
            </button>
          </div>

          {/* Right: Results */}
          <div style={{ border: '1px solid var(--cprs-border)', borderRadius: 6, padding: 16 }}>
            <div className={styles.panelTitle}>
              {REMOTE_DOMAINS.find((d) => d.id === selectedDomain)?.label || 'Results'}
              {selectedFacility && (
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--cprs-text-muted)' }}>
                  {' -- '}
                  {facilities.find((f) => f.id === selectedFacility)?.name ||
                    externalSources.find((s) => s.id === selectedFacility)?.label ||
                    selectedFacility}
                </span>
              )}
            </div>

            {queryResult ? (
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: 12,
                  whiteSpace: 'pre-wrap',
                  background: 'var(--cprs-bg)',
                  padding: 12,
                  borderRadius: 4,
                }}
              >
                {queryResult}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--cprs-text-muted)' }}>
                  {facilitiesError || registryError
                    ? 'Remote source contracts unavailable'
                    : facilities.length === 0 && externalSources.length === 0
                    ? 'No Remote Sources Available'
                    : 'Select a source and domain, then click Query'}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: 'var(--cprs-text-muted)',
                    maxWidth: 400,
                    margin: '8px auto',
                  }}
                >
                  Patient: {demographics?.name || (dfn ? `DFN ${dfn}` : 'No patient selected')}
                  {demographics?.name && (
                    <>
                      <br />
                      Remote correlation requires ICN (Integration Control Number)
                    </>
                  )}
                </p>
              </div>
            )}

            <div
              style={{
                marginTop: 16,
                padding: 8,
                background: 'var(--cprs-bg)',
                borderRadius: 4,
                fontSize: 11,
                color: 'var(--cprs-text-muted)',
              }}
            >
              <strong>Architecture (Phase 18E):</strong>
              <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                <li>ORWCIRN FACLIST -- Lists connected remote VistA facilities</li>
                <li>ORWCIRN HDRA -- Retrieves remote patient data by facility + domain</li>
                <li>C0FHIR Suite -- FHIR R4 via MUMPS-native RPC (WorldVistA)</li>
                <li>External FHIR servers and HL7v2 feeds from Integration Registry</li>
                <li>Patient correlation via ICN (Integration Control Number)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
