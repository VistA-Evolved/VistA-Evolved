'use client';

/**
 * HMO Portal Dashboard -- Phase 97
 *
 * Billing staff workspace for HMO LOA + Claim submission via portal adapters.
 *
 * Tabs:
 *   1. Adapters -- View registered HMO portal adapters and health status
 *   2. LOA Builder -- Build LOA packets from clinical data + export for portal upload
 *   3. Claim Builder -- Build HMO claim packets + export for portal submission
 *   4. Submissions -- Track submission lifecycle (12-state FSM w/ timeline)
 *   5. Submission Stats -- Dashboard of submission counts by status
 */

import { useState, useEffect, useCallback } from 'react';
import { csrfHeaders } from '@/lib/csrf';
import { API_BASE as API } from '@/lib/api-config';

/* -- Types ---------------------------------------------------- */

interface PortalAdapterInfo {
  payerId: string;
  adapterName: string;
  mode: string;
  portalBaseUrl: string;
}

interface LoaPacket {
  packetId: string;
  loaRequestId: string;
  payerId: string;
  payerName: string;
  patientName: string;
  encounterDate: string;
  specialty: string;
  contentHash: string;
}

interface HmoClaimPacket {
  packetId: string;
  sourceClaimId: string;
  payerId: string;
  payerName: string;
  patient: { lastName: string; firstName: string; memberId?: string };
  admissionDate: string;
  specialty: string;
  totals: {
    totalCharges: number;
    totalHmoCoverage: number;
    totalPatientShare: number;
    totalProfessionalFees: number;
  };
  contentHash: string;
}

interface SubmissionRecord {
  id: string;
  payerId: string;
  payerName: string;
  claimId?: string;
  loaRequestId?: string;
  loaPacketId?: string;
  claimPacketId?: string;
  status: string;
  portalRef?: string;
  loaReferenceNumber?: string;
  denialReason?: string;
  staffNotes: string[];
  exportFiles: string[];
  timeline: Array<{
    timestamp: string;
    fromStatus: string;
    toStatus: string;
    actor: string;
    detail?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface SubmissionStats {
  [status: string]: number;
}

interface SpecialtyTemplate {
  specialty: string;
  requiredFields: string[];
  recommendedAttachments: string[];
  payerSpecificNotes?: string;
}

/* -- Fetch Helper --------------------------------------------- */

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...csrfHeaders(),
      ...((opts?.headers as Record<string, string>) || {}),
    },
  });

  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok || (payload && payload.ok === false)) {
    const message =
      payload?.error || (res.status === 401 ? 'Authentication required' : `Request failed (${res.status})`);
    throw new Error(message);
  }

  return payload as T;
}

/* -- Tab IDs -------------------------------------------------- */

type TabId = 'adapters' | 'loa' | 'claims' | 'submissions' | 'stats';

const TABS: { id: TabId; label: string }[] = [
  { id: 'adapters', label: 'Adapters' },
  { id: 'loa', label: 'LOA Builder' },
  { id: 'claims', label: 'Claim Builder' },
  { id: 'submissions', label: 'Submissions' },
  { id: 'stats', label: 'Stats' },
];

/* -- Main Page ------------------------------------------------ */

export default function HmoPortalPage() {
  const [tab, setTab] = useState<TabId>('adapters');

  return (
    <div style={{ padding: '1rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>HMO Portal Dashboard</h1>
      <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.85rem' }}>
        Phase 97 -- Top-5 HMO LOA + Claim Packet + Manual-Assisted Portal Submission
      </p>

      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          gap: '0.25rem',
          borderBottom: '2px solid #e5e7eb',
          marginBottom: '1rem',
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid #2563eb' : '2px solid transparent',
              background: tab === t.id ? '#eff6ff' : 'transparent',
              fontWeight: tab === t.id ? 600 : 400,
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'adapters' && <AdaptersTab />}
      {tab === 'loa' && <LoaBuilderTab />}
      {tab === 'claims' && <ClaimBuilderTab />}
      {tab === 'submissions' && <SubmissionsTab />}
      {tab === 'stats' && <StatsTab />}
    </div>
  );
}

/* -- Adapters Tab --------------------------------------------- */

function AdaptersTab() {
  const [adapters, setAdapters] = useState<PortalAdapterInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ ok: boolean; adapters: PortalAdapterInfo[] }>('/rcm/hmo-portal/adapters')
      .then((r) => {
        setError(null);
        setAdapters(r.adapters ?? []);
      })
      .catch((err) => {
        setAdapters([]);
        setError(err instanceof Error ? err.message : 'Unable to load adapters.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading adapters...</p>;
  if (error) return <p style={{ color: '#dc2626' }}>Unable to load adapters. {error}</p>;

  return (
    <div>
      <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Registered Portal Adapters</h2>
      {adapters.length === 0 ? (
        <p style={{ color: '#999' }}>
          No adapters registered. Ensure the API initialized HMO portal adapters.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem' }}>Payer ID</th>
              <th style={{ padding: '0.5rem' }}>Adapter Name</th>
              <th style={{ padding: '0.5rem' }}>Mode</th>
              <th style={{ padding: '0.5rem' }}>Portal URL</th>
            </tr>
          </thead>
          <tbody>
            {adapters.map((a) => (
              <tr key={a.payerId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{a.payerId}</td>
                <td style={{ padding: '0.5rem' }}>{a.adapterName}</td>
                <td style={{ padding: '0.5rem' }}>
                  <span
                    style={{
                      padding: '0.125rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      background: a.mode === 'manual_assisted' ? '#fef3c7' : '#d1fae5',
                      color: a.mode === 'manual_assisted' ? '#92400e' : '#065f46',
                    }}
                  >
                    {a.mode}
                  </span>
                </td>
                <td style={{ padding: '0.5rem' }}>
                  <a
                    href={a.portalBaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#2563eb' }}
                  >
                    {a.portalBaseUrl}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* -- LOA Builder Tab ------------------------------------------ */

function LoaBuilderTab() {
  const [specialties, setSpecialties] = useState<SpecialtyTemplate[]>([]);
  const [builtPacket, setBuiltPacket] = useState<LoaPacket | null>(null);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ ok: boolean; templates: SpecialtyTemplate[] }>('/rcm/hmo-portal/specialties')
      .then((r) => {
        setLoadError(null);
        setSpecialties(r.templates ?? []);
      })
      .catch((err) => {
        setSpecialties([]);
        setLoadError(err instanceof Error ? err.message : 'Unable to load specialty templates.');
      });
  }, []);

  const handleBuildDemo = useCallback(async () => {
    setError(null);
    setBuiltPacket(null);
    setSubmitResult(null);

    // Demo LOA request matching Phase 94 LoaRequest structure
    const demoLoaRequest = {
      id: 'demo-loa-001',
      tenantId: 'default',
      status: 'draft',
      submissionMode: 'portal',
      patientDfn: '3',
      patientName: 'PATIENT,TEST',
      encounterDate: new Date().toISOString().slice(0, 10),
      diagnosisCodes: [
        { code: 'J06.9', codeSystem: 'ICD10', description: 'Acute upper respiratory infection' },
      ],
      procedureCodes: [
        { code: '99213', codeSystem: 'CPT', description: 'Office visit, established patient' },
      ],
      providerName: 'PROVIDER,CLYDE WV',
      facilityName: 'WorldVistA Sandbox',
      payerId: 'PH-MAXICARE',
      payerName: 'Maxicare',
      memberId: 'MAX-DEMO-001',
      attachments: [],
      checklist: [],
      auditTrail: [],
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const result = await apiFetch<{ ok: boolean; packet?: LoaPacket; errors?: string[] }>(
        '/rcm/hmo-portal/loa/build',
        {
          method: 'POST',
          body: JSON.stringify({
            loaRequest: demoLoaRequest,
            specialty: 'general_medicine',
            admissionType: 'outpatient',
            requestedServices: ['Office visit', 'Lab workup'],
          }),
        }
      );

      setBuiltPacket(result.packet ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Build failed.');
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!builtPacket) return;
    setSubmitResult(null);

    try {
      const result = await apiFetch<{ ok: boolean; submissionId?: string; result?: any }>(
        '/rcm/hmo-portal/loa/submit',
        { method: 'POST', body: JSON.stringify({ packetId: builtPacket.packetId }) }
      );

      setSubmitResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed.');
    }
  }, [builtPacket]);

  return (
    <div>
      <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>LOA Packet Builder</h2>
      <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '1rem' }}>
        Build LOA request packets from clinical data. Generates export files for manual portal
        upload.
      </p>

      <button
        onClick={handleBuildDemo}
        style={{
          padding: '0.5rem 1rem',
          background: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '1rem',
        }}
      >
        Build Demo LOA Packet (Maxicare)
      </button>

      {loadError && <p style={{ color: '#dc2626' }}>Unable to load specialty templates. {loadError}</p>}
      {error && <p style={{ color: '#dc2626' }}>{error}</p>}

      {builtPacket && (
        <div
          style={{
            background: '#f9fafb',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
          }}
        >
          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>Built LOA Packet</h3>
          <table style={{ fontSize: '0.85rem' }}>
            <tbody>
              <tr>
                <td style={{ padding: '0.25rem 0.75rem', fontWeight: 600 }}>Packet ID</td>
                <td style={{ fontFamily: 'monospace' }}>{builtPacket.packetId}</td>
              </tr>
              <tr>
                <td style={{ padding: '0.25rem 0.75rem', fontWeight: 600 }}>Payer</td>
                <td>
                  {builtPacket.payerName} ({builtPacket.payerId})
                </td>
              </tr>
              <tr>
                <td style={{ padding: '0.25rem 0.75rem', fontWeight: 600 }}>Patient</td>
                <td>{builtPacket.patientName}</td>
              </tr>
              <tr>
                <td style={{ padding: '0.25rem 0.75rem', fontWeight: 600 }}>Specialty</td>
                <td>{builtPacket.specialty}</td>
              </tr>
              <tr>
                <td style={{ padding: '0.25rem 0.75rem', fontWeight: 600 }}>Encounter</td>
                <td>{builtPacket.encounterDate}</td>
              </tr>
              <tr>
                <td style={{ padding: '0.25rem 0.75rem', fontWeight: 600 }}>Hash</td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {builtPacket.contentHash}
                </td>
              </tr>
            </tbody>
          </table>

          <button
            onClick={handleSubmit}
            style={{
              marginTop: '0.75rem',
              padding: '0.5rem 1rem',
              background: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Submit to Portal (Manual-Assisted)
          </button>
        </div>
      )}

      {submitResult && (
        <div
          style={{
            background: submitResult.ok ? '#ecfdf5' : '#fef2f2',
            padding: '1rem',
            borderRadius: '8px',
          }}
        >
          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>
            {submitResult.ok ? 'Submission Created' : 'Submission Failed'}
          </h3>
          {submitResult.ok && (
            <>
              <p style={{ fontSize: '0.85rem' }}>
                Submission ID: <code>{submitResult.submissionId}</code>
              </p>
              <p style={{ fontSize: '0.85rem', color: '#666' }}>
                Portal:{' '}
                <a
                  href={submitResult.result?.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#2563eb' }}
                >
                  {submitResult.result?.portalUrl}
                </a>
              </p>
              {submitResult.result?.instructions?.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <strong style={{ fontSize: '0.85rem' }}>Instructions:</strong>
                  <ol style={{ fontSize: '0.85rem', marginTop: '0.25rem', paddingLeft: '1.25rem' }}>
                    {submitResult.result.instructions.map((step: string, i: number) => (
                      <li key={i} style={{ marginBottom: '0.25rem' }}>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {submitResult.result?.exportFiles?.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <strong style={{ fontSize: '0.85rem' }}>Export Files:</strong>
                  <ul style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    {submitResult.result.exportFiles.map((f: any, i: number) => (
                      <li key={i}>
                        {f.filename} ({f.format}, {f.sizeBytes} bytes)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {specialties.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>
            Available Specialty Templates
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Specialty</th>
                <th style={{ padding: '0.5rem' }}>Required Fields</th>
                <th style={{ padding: '0.5rem' }}>Recommended Attachments</th>
              </tr>
            </thead>
            <tbody>
              {specialties.map((s) => (
                <tr key={s.specialty} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.5rem' }}>{s.specialty.replace(/_/g, ' ')}</td>
                  <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {s.requiredFields.join(', ')}
                  </td>
                  <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {s.recommendedAttachments.join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* -- Claim Builder Tab ---------------------------------------- */

function ClaimBuilderTab() {
  const [builtPacket, setBuiltPacket] = useState<HmoClaimPacket | null>(null);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBuildDemo = useCallback(async () => {
    setError(null);
    setBuiltPacket(null);
    setSubmitResult(null);

    // Demo claim matching Phase 38 Claim structure
    const demoClaim = {
      id: 'demo-claim-001',
      tenantId: 'default',
      claimType: 'professional',
      status: 'draft',
      patientDfn: '3',
      patientName: 'PATIENT,TEST',
      patientLastName: 'PATIENT',
      patientFirstName: 'TEST',
      patientGender: 'M',
      payerId: 'PH-MAXICARE',
      payerName: 'Maxicare',
      dateOfService: new Date().toISOString().slice(0, 10),
      diagnoses: [
        { code: 'J06.9', codeSystem: 'ICD10', qualifier: 'principal', description: 'Acute URI' },
      ],
      lines: [
        {
          lineNumber: 1,
          procedure: {
            code: '99213',
            codeSystem: 'CPT',
            units: 1,
            charge: 150000,
            dateOfService: new Date().toISOString().slice(0, 10),
            description: 'Office visit',
          },
          diagnoses: [],
        },
      ],
      totalCharge: 150000,
      isMock: true,
      isDemo: true,
      submissionSafetyMode: 'export_only',
      auditTrail: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const result = await apiFetch<{ ok: boolean; packet?: HmoClaimPacket; errors?: string[] }>(
        '/rcm/hmo-portal/claims/build',
        {
          method: 'POST',
          body: JSON.stringify({
            claim: demoClaim,
            payerName: 'Maxicare',
            memberId: 'MAX-DEMO-001',
            memberType: 'principal',
            specialty: 'general_medicine',
          }),
        }
      );

      setBuiltPacket(result.packet ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Build failed.');
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!builtPacket) return;
    setSubmitResult(null);

    try {
      const result = await apiFetch<{ ok: boolean; submissionId?: string; result?: any }>(
        '/rcm/hmo-portal/claims/submit',
        { method: 'POST', body: JSON.stringify({ packetId: builtPacket.packetId }) }
      );

      setSubmitResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed.');
    }
  }, [builtPacket]);

  return (
    <div>
      <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>HMO Claim Packet Builder</h2>
      <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '1rem' }}>
        Build claim packets for HMO portal submission. Generates JSON and text exports.
      </p>
      <div
        style={{
          marginBottom: '1rem',
          padding: '0.75rem 1rem',
          background: '#fff7ed',
          border: '1px solid #fdba74',
          borderRadius: '8px',
          color: '#9a3412',
          fontSize: '0.85rem',
        }}
      >
        This builder currently creates demo claim packets in export-only safety mode. It does not
        submit live claims directly to an HMO system.
      </div>

      <button
        onClick={handleBuildDemo}
        style={{
          padding: '0.5rem 1rem',
          background: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '1rem',
        }}
      >
        Build Demo Claim Packet (Maxicare)
      </button>

      {error && <p style={{ color: '#dc2626' }}>{error}</p>}

      {builtPacket && (
        <div
          style={{
            background: '#f9fafb',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
          }}
        >
          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>Built Claim Packet</h3>
          <table style={{ fontSize: '0.85rem' }}>
            <tbody>
              <tr>
                <td style={{ padding: '0.25rem 0.75rem', fontWeight: 600 }}>Packet ID</td>
                <td style={{ fontFamily: 'monospace' }}>{builtPacket.packetId}</td>
              </tr>
              <tr>
                <td style={{ padding: '0.25rem 0.75rem', fontWeight: 600 }}>Payer</td>
                <td>
                  {builtPacket.payerName} ({builtPacket.payerId})
                </td>
              </tr>
              <tr>
                <td style={{ padding: '0.25rem 0.75rem', fontWeight: 600 }}>Patient</td>
                <td>
                  {builtPacket.patient?.lastName}, {builtPacket.patient?.firstName}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '0.25rem 0.75rem', fontWeight: 600 }}>Member ID</td>
                <td>{builtPacket.patient?.memberId ?? 'N/A'}</td>
              </tr>
              <tr>
                <td style={{ padding: '0.25rem 0.75rem', fontWeight: 600 }}>Total Charges</td>
                <td>PHP {builtPacket.totals?.totalCharges?.toFixed(2)}</td>
              </tr>
              <tr>
                <td style={{ padding: '0.25rem 0.75rem', fontWeight: 600 }}>HMO Coverage</td>
                <td>PHP {builtPacket.totals?.totalHmoCoverage?.toFixed(2)}</td>
              </tr>
              <tr>
                <td style={{ padding: '0.25rem 0.75rem', fontWeight: 600 }}>Patient Share</td>
                <td>PHP {builtPacket.totals?.totalPatientShare?.toFixed(2)}</td>
              </tr>
              <tr>
                <td style={{ padding: '0.25rem 0.75rem', fontWeight: 600 }}>Hash</td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {builtPacket.contentHash}
                </td>
              </tr>
            </tbody>
          </table>

          <button
            onClick={handleSubmit}
            style={{
              marginTop: '0.75rem',
              padding: '0.5rem 1rem',
              background: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Create Demo Portal Submission (Manual-Assisted)
          </button>
        </div>
      )}

      {submitResult && (
        <div
          style={{
            background: submitResult.ok ? '#ecfdf5' : '#fef2f2',
            padding: '1rem',
            borderRadius: '8px',
          }}
        >
          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>
            {submitResult.ok ? 'Submission Created' : 'Submission Failed'}
          </h3>
          {submitResult.ok && (
            <>
              <p style={{ fontSize: '0.85rem' }}>
                Submission ID: <code>{submitResult.submissionId}</code>
              </p>
              <p style={{ fontSize: '0.85rem', color: '#666' }}>
                Portal:{' '}
                <a
                  href={submitResult.result?.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#2563eb' }}
                >
                  {submitResult.result?.portalUrl}
                </a>
              </p>
              {submitResult.result?.instructions?.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <strong style={{ fontSize: '0.85rem' }}>Instructions:</strong>
                  <ol style={{ fontSize: '0.85rem', marginTop: '0.25rem', paddingLeft: '1.25rem' }}>
                    {submitResult.result.instructions.map((step: string, i: number) => (
                      <li key={i} style={{ marginBottom: '0.25rem' }}>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* -- Submissions Tab ------------------------------------------ */

function SubmissionsTab() {
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SubmissionRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ ok: boolean; submissions: SubmissionRecord[] }>(
        '/rcm/hmo-portal/submissions'
      );
      setError(null);
      setSubmissions(res.submissions ?? []);
    } catch (err) {
      setSubmissions([]);
      setSelected(null);
      setError(err instanceof Error ? err.message : 'Unable to load submissions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const statusColor = (s: string) => {
    if (s.includes('denied')) return { bg: '#fef2f2', fg: '#991b1b' };
    if (s.includes('approved') || s === 'posted_to_vista') return { bg: '#ecfdf5', fg: '#065f46' };
    if (s.includes('exported') || s.includes('submitted')) return { bg: '#eff6ff', fg: '#1e40af' };
    if (s.includes('pending') || s.includes('processing')) return { bg: '#fef3c7', fg: '#92400e' };
    return { bg: '#f3f4f6', fg: '#374151' };
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <h2 style={{ fontSize: '1.1rem' }}>Submission Records</h2>
        <button
          onClick={load}
          style={{
            padding: '0.375rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p>Loading submissions...</p>
      ) : error ? (
        <p style={{ color: '#dc2626' }}>Unable to load submissions. {error}</p>
      ) : submissions.length === 0 ? (
        <p style={{ color: '#999' }}>
          No submissions yet. Build and submit an LOA or claim packet to get started.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem' }}>ID</th>
              <th style={{ padding: '0.5rem' }}>Payer</th>
              <th style={{ padding: '0.5rem' }}>Status</th>
              <th style={{ padding: '0.5rem' }}>Created</th>
              <th style={{ padding: '0.5rem' }}>Updated</th>
              <th style={{ padding: '0.5rem' }}></th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((s) => {
              const sc = statusColor(s.status);
              return (
                <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {s.id.slice(0, 16)}...
                  </td>
                  <td style={{ padding: '0.5rem' }}>{s.payerName}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <span
                      style={{
                        padding: '0.125rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        background: sc.bg,
                        color: sc.fg,
                      }}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem', fontSize: '0.75rem' }}>
                    {s.createdAt.slice(0, 16).replace('T', ' ')}
                  </td>
                  <td style={{ padding: '0.5rem', fontSize: '0.75rem' }}>
                    {s.updatedAt.slice(0, 16).replace('T', ' ')}
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <button
                      onClick={() => setSelected(s)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {selected && (
        <SubmissionDetail record={selected} onClose={() => setSelected(null)} onUpdated={load} />
      )}
    </div>
  );
}

/* -- Submission Detail ---------------------------------------- */

function SubmissionDetail({
  record,
  onClose,
  onUpdated,
}: {
  record: SubmissionRecord;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [note, setNote] = useState('');

  const handleAddNote = useCallback(async () => {
    if (!note.trim()) return;
    await apiFetch(`/rcm/hmo-portal/submissions/${record.id}/note`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
    setNote('');
    onUpdated();
  }, [record.id, note, onUpdated]);

  return (
    <div
      style={{
        marginTop: '1rem',
        background: '#f9fafb',
        padding: '1rem',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1rem' }}>Submission: {record.id.slice(0, 20)}...</h3>
        <button
          onClick={onClose}
          style={{
            cursor: 'pointer',
            border: 'none',
            background: 'transparent',
            fontSize: '1.25rem',
          }}
        >
          x
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.5rem',
          marginTop: '0.75rem',
          fontSize: '0.85rem',
        }}
      >
        <div>
          <strong>Payer:</strong> {record.payerName} ({record.payerId})
        </div>
        <div>
          <strong>Status:</strong> {record.status}
        </div>
        <div>
          <strong>Claim ID:</strong> {record.claimId ?? 'N/A'}
        </div>
        <div>
          <strong>LOA Request:</strong> {record.loaRequestId ?? 'N/A'}
        </div>
        <div>
          <strong>LOA Ref:</strong> {record.loaReferenceNumber ?? 'N/A'}
        </div>
        <div>
          <strong>Portal Ref:</strong> {record.portalRef ?? 'N/A'}
        </div>
      </div>

      {record.timeline.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <strong style={{ fontSize: '0.85rem' }}>Timeline</strong>
          <div
            style={{
              marginTop: '0.25rem',
              fontSize: '0.8rem',
              maxHeight: '200px',
              overflowY: 'auto',
            }}
          >
            {record.timeline.map((t, i) => (
              <div key={i} style={{ padding: '0.25rem 0', borderBottom: '1px dotted #e5e7eb' }}>
                <span style={{ color: '#6b7280' }}>
                  {t.timestamp.slice(0, 19).replace('T', ' ')}
                </span>{' '}
                {t.fromStatus}{' -> '}<strong>{t.toStatus}</strong> by {t.actor}
                {t.detail && <span style={{ color: '#9ca3af' }}> -- {t.detail}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {record.staffNotes.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          <strong style={{ fontSize: '0.85rem' }}>Staff Notes</strong>
          <ul style={{ fontSize: '0.8rem', margin: '0.25rem 0', paddingLeft: '1.25rem' }}>
            {record.staffNotes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      {record.exportFiles.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          <strong style={{ fontSize: '0.85rem' }}>Export Files</strong>
          <ul style={{ fontSize: '0.8rem', margin: '0.25rem 0', paddingLeft: '1.25rem' }}>
            {record.exportFiles.map((f, i) => (
              <li key={i} style={{ fontFamily: 'monospace' }}>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add staff note..."
          style={{
            flex: 1,
            padding: '0.375rem',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '0.85rem',
          }}
        />
        <button
          onClick={handleAddNote}
          style={{
            padding: '0.375rem 0.75rem',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          Add Note
        </button>
      </div>
    </div>
  );
}

/* -- Stats Tab ------------------------------------------------ */

function StatsTab() {
  const [stats, setStats] = useState<SubmissionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ ok: boolean; stats: SubmissionStats }>('/rcm/hmo-portal/submissions/stats')
      .then((r) => {
        setError(null);
        setStats(r.stats ?? null);
      })
      .catch((err) => {
        setStats(null);
        setError(err instanceof Error ? err.message : 'Unable to load stats.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading stats...</p>;
  if (!stats) {
    return <p style={{ color: error ? '#dc2626' : '#999' }}>Unable to load stats.{error ? ` ${error}` : ''}</p>;
  }

  const statusOrder = [
    'draft',
    'loa_pending',
    'loa_approved',
    'loa_denied',
    'claim_prepared',
    'claim_exported',
    'claim_submitted_manual',
    'claim_processing',
    'claim_approved',
    'claim_denied',
    'remittance_received',
    'posted_to_vista',
  ];

  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div>
      <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Submission Statistics</h2>
      <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '1rem' }}>
        Total submissions: <strong>{total}</strong>
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '0.75rem',
        }}
      >
        {statusOrder.map((s) => {
          const count = stats[s] ?? 0;
          return (
            <div
              key={s}
              style={{
                padding: '0.75rem',
                background: count > 0 ? '#eff6ff' : '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>
                {s.replace(/_/g, ' ')}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>
                {count}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
