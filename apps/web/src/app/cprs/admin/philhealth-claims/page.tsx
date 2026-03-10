'use client';

/**
 * PhilHealth Claims -- Phase 90
 *
 * Admin page for managing PhilHealth eClaims 3.0 claim drafts:
 *  - List/filter claims
 *  - Create new claim draft
 *  - View claim detail (demographics, diagnoses, charges, timeline)
 *  - Validate, export, and simulate test upload
 *
 * NOT CERTIFIED: This module generates eClaims 3.0-structured export packages
 * for review. It does NOT submit claims to PhilHealth.
 */

import { useEffect, useState, useCallback } from 'react';
import { csrfHeaders } from '@/lib/csrf';
import { API_BASE as API } from '@/lib/api-config';

/* -- Types ------------------------------------------------------ */

type ClaimStatus =
  | 'draft'
  | 'ready_for_submission'
  | 'exported'
  | 'test_uploaded'
  | 'submitted_pending'
  | 'returned_to_hospital'
  | 'paid'
  | 'denied';

interface ClaimDraft {
  id: string;
  patientLastName: string;
  patientFirstName: string;
  philhealthPin: string;
  admissionDate: string;
  dischargeDate?: string;
  patientType: 'O' | 'I';
  status: ClaimStatus;
  diagnoses: Array<{ icdCode: string; description?: string; type: string }>;
  charges: Array<{
    category: string;
    description: string;
    netAmount: number;
    quantity: number;
    unitCharge: number;
    discount: number;
    phicCoverage: number;
    patientShare: number;
  }>;
  procedures: Array<{ code: string; description?: string }>;
  professionalFees: Array<{
    physicianName: string;
    physicianLicense: string;
    feeAmount: number;
    serviceDate: string;
  }>;
  soaElectronic?: Record<string, unknown>;
  lastExportManifest?: Record<string, unknown>;
  testUploadResult?: {
    simulated: boolean;
    transmittalControlNumber: string;
    validationPassed: boolean;
    validationErrors: string[];
    nextSteps: string[];
  };
  timeline: Array<{ timestamp: string; action: string; actor: string; detail?: string }>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ValidationResult {
  valid: boolean;
  errors: Array<{ field: string; code: string; message: string; severity: string }>;
  warnings: Array<{ field: string; code: string; message: string; severity: string }>;
  eclaims3Compliance: {
    electronicSoaRequired: boolean;
    electronicSoaPresent: boolean;
    scannedPdfDetected: boolean;
    admissionDateRequiresEsoa: boolean;
  };
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280',
  ready_for_submission: '#2563eb',
  exported: '#7c3aed',
  test_uploaded: '#059669',
  submitted_pending: '#d97706',
  returned_to_hospital: '#dc2626',
  paid: '#16a34a',
  denied: '#dc2626',
};

/* -- Component ------------------------------------------------- */

export default function PhilHealthClaimsPage() {
  const [claims, setClaims] = useState<ClaimDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ClaimDraft | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [fLastName, setFLastName] = useState('');
  const [fFirstName, setFFirstName] = useState('');
  const [fPin, setFPin] = useState('');
  const [fAdmission, setFAdmission] = useState('');
  const [fType, setFType] = useState<'O' | 'I'>('O');

  const fetchClaims = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/rcm/philhealth/claims`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setClaims(data.drafts);
      else setError(data.error);
    } catch {
      setError('Failed to connect to API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  const fetchDetail = async (id: string) => {
    try {
      const res = await fetch(`${API}/rcm/philhealth/claims/${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setDetail(data.draft);
        setSelectedId(id);
        setValidation(null);
      }
    } catch {
      setError('Failed to load claim detail');
    }
  };

  const handleCreate = async () => {
    if (!fLastName || !fFirstName || !fPin || !fAdmission) return;
    try {
      const res = await fetch(`${API}/rcm/philhealth/claims`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({
          patientLastName: fLastName,
          patientFirstName: fFirstName,
          philhealthPin: fPin,
          admissionDate: fAdmission,
          patientType: fType,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setShowCreate(false);
        setFLastName('');
        setFFirstName('');
        setFPin('');
        setFAdmission('');
        fetchClaims();
        fetchDetail(data.draft.id);
      } else {
        setError(data.error);
      }
    } catch {
      setError('Create failed');
    }
  };

  const handleValidate = async () => {
    if (!selectedId) return;
    try {
      const res = await fetch(`${API}/rcm/philhealth/claims/${selectedId}/validate`, {
        method: 'POST',
        credentials: 'include',
        headers: { ...csrfHeaders() },
      });
      const data = await res.json();
      if (data.ok) setValidation(data.validation);
    } catch {
      setError('Validation failed');
    }
  };

  const handleTransition = async (status: string) => {
    if (!selectedId) return;
    try {
      const res = await fetch(`${API}/rcm/philhealth/claims/${selectedId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.ok) {
        setDetail(data.draft);
        fetchClaims();
      } else {
        setError(data.error);
      }
    } catch {
      setError('Transition failed');
    }
  };

  const handleExport = async () => {
    if (!selectedId) return;
    try {
      const res = await fetch(`${API}/rcm/philhealth/claims/${selectedId}/export`, {
        method: 'POST',
        credentials: 'include',
        headers: { ...csrfHeaders() },
      });
      const data = await res.json();
      if (data.ok) {
        setDetail(data.draft);
        fetchClaims();
      } else {
        setError(data.error);
      }
    } catch {
      setError('Export failed');
    }
  };

  const handleTestUpload = async () => {
    if (!selectedId) return;
    try {
      const res = await fetch(`${API}/rcm/philhealth/claims/${selectedId}/test-upload`, {
        method: 'POST',
        credentials: 'include',
        headers: { ...csrfHeaders() },
      });
      const data = await res.json();
      if (data.ok) {
        setDetail(data.draft);
        fetchClaims();
      } else {
        setError(data.error);
      }
    } catch {
      setError('Test upload failed');
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Loading PhilHealth claims...</div>;

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      {/* NOT CERTIFIED banner */}
      <div
        style={{
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: 6,
          padding: '12px 16px',
          marginBottom: 16,
          fontSize: 13,
        }}
      >
        <strong>NOT CERTIFIED</strong> -- This module generates eClaims 3.0-structured export
        packages for review. It does NOT submit claims to PhilHealth. All test uploads are{' '}
        <strong>SIMULATED</strong>.
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>PhilHealth Claim Drafts</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            padding: '6px 16px',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          + New Claim
        </button>
      </div>

      {error && (
        <div
          style={{
            background: '#fee2e2',
            border: '1px solid #ef4444',
            borderRadius: 4,
            padding: '8px 12px',
            marginBottom: 12,
            fontSize: 13,
          }}
        >
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: 8,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            x
          </button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div
          style={{
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
            New PhilHealth Claim Draft
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <input
              placeholder="Last Name *"
              value={fLastName}
              onChange={(e) => setFLastName(e.target.value)}
              style={{
                padding: '6px 8px',
                border: '1px solid #d1d5db',
                borderRadius: 4,
                fontSize: 12,
              }}
            />
            <input
              placeholder="First Name *"
              value={fFirstName}
              onChange={(e) => setFFirstName(e.target.value)}
              style={{
                padding: '6px 8px',
                border: '1px solid #d1d5db',
                borderRadius: 4,
                fontSize: 12,
              }}
            />
            <input
              placeholder="PhilHealth PIN *"
              value={fPin}
              onChange={(e) => setFPin(e.target.value)}
              style={{
                padding: '6px 8px',
                border: '1px solid #d1d5db',
                borderRadius: 4,
                fontSize: 12,
              }}
            />
            <input
              type="date"
              value={fAdmission}
              onChange={(e) => setFAdmission(e.target.value)}
              style={{
                padding: '6px 8px',
                border: '1px solid #d1d5db',
                borderRadius: 4,
                fontSize: 12,
              }}
            />
            <select
              value={fType}
              onChange={(e) => setFType(e.target.value as 'O' | 'I')}
              style={{
                padding: '6px 8px',
                border: '1px solid #d1d5db',
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              <option value="O">Outpatient</option>
              <option value="I">Inpatient</option>
            </select>
            <button
              onClick={handleCreate}
              style={{
                padding: '6px 12px',
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Create Draft
            </button>
          </div>
        </div>
      )}

      {/* Layout: list + detail */}
      <div style={{ display: 'flex', gap: 16 }}>
        {/* Claims List */}
        <div style={{ flex: '0 0 380px', maxHeight: 600, overflowY: 'auto' }}>
          {claims.length === 0 ? (
            <p style={{ fontSize: 13, color: '#6b7280' }}>
              No claim drafts yet. Create one to get started.
            </p>
          ) : (
            claims.map((c) => (
              <div
                key={c.id}
                onClick={() => fetchDetail(c.id)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 4,
                  marginBottom: 6,
                  cursor: 'pointer',
                  border: selectedId === c.id ? '2px solid #2563eb' : '1px solid #e5e7eb',
                  background: selectedId === c.id ? '#eff6ff' : '#fff',
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {c.patientLastName}, {c.patientFirstName}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 3,
                      fontWeight: 600,
                      color: '#fff',
                      background: STATUS_COLORS[c.status] || '#6b7280',
                    }}
                  >
                    {c.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                  PIN: {c.philhealthPin} | {c.patientType === 'I' ? 'Inpatient' : 'Outpatient'} |
                  Adm: {c.admissionDate}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail Panel */}
        {detail && (
          <div
            style={{
              flex: 1,
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              padding: 16,
              maxHeight: 600,
              overflowY: 'auto',
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
              {detail.patientLastName}, {detail.patientFirstName}
            </h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <span
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 3,
                  fontWeight: 600,
                  color: '#fff',
                  background: STATUS_COLORS[detail.status] || '#6b7280',
                }}
              >
                {detail.status.replace(/_/g, ' ')}
              </span>
              <span style={{ fontSize: 11, color: '#6b7280' }}>ID: {detail.id}</span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              <button
                onClick={handleValidate}
                style={{
                  padding: '4px 10px',
                  background: '#7c3aed',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 3,
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                Validate
              </button>
              {detail.status === 'draft' && (
                <button
                  onClick={() => handleTransition('ready_for_submission')}
                  style={{
                    padding: '4px 10px',
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 3,
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  Mark Ready
                </button>
              )}
              {(detail.status === 'ready_for_submission' || detail.status === 'exported') && (
                <button
                  onClick={handleExport}
                  style={{
                    padding: '4px 10px',
                    background: '#059669',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 3,
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  Export Package
                </button>
              )}
              {detail.status === 'exported' && (
                <button
                  onClick={handleTestUpload}
                  style={{
                    padding: '4px 10px',
                    background: '#d97706',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 3,
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  Test Upload (Simulated)
                </button>
              )}
            </div>

            {/* Validation Results */}
            {validation && (
              <div style={{ marginBottom: 12 }}>
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 4,
                    fontSize: 12,
                    background: validation.valid ? '#dcfce7' : '#fee2e2',
                    border: `1px solid ${validation.valid ? '#86efac' : '#fca5a5'}`,
                  }}
                >
                  <strong>{validation.valid ? 'VALID' : 'INVALID'}</strong>
                  {' -- '}
                  {validation.errors.length} error(s), {validation.warnings.length} warning(s)
                </div>
                {validation.eclaims3Compliance.admissionDateRequiresEsoa && (
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 11,
                      padding: '4px 8px',
                      background: '#fef3c7',
                      borderRadius: 3,
                    }}
                  >
                    eClaims 3.0: Admission date requires electronic SOA.
                    {validation.eclaims3Compliance.scannedPdfDetected && ' Scanned PDF REJECTED.'}
                    {validation.eclaims3Compliance.electronicSoaPresent
                      ? ' eSOA present.'
                      : ' eSOA will be generated on export.'}
                  </div>
                )}
                {validation.errors.length > 0 && (
                  <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: 11 }}>
                    {validation.errors.map((e, i) => (
                      <li key={i} style={{ color: '#dc2626', marginBottom: 2 }}>
                        <strong>{e.field}</strong>: {e.message}
                      </li>
                    ))}
                  </ul>
                )}
                {validation.warnings.length > 0 && (
                  <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: 11 }}>
                    {validation.warnings.map((w, i) => (
                      <li key={i} style={{ color: '#d97706', marginBottom: 2 }}>
                        <strong>{w.field}</strong>: {w.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Test Upload Result */}
            {detail.testUploadResult && (
              <div
                style={{
                  marginBottom: 12,
                  padding: '8px 12px',
                  borderRadius: 4,
                  fontSize: 12,
                  background: '#eff6ff',
                  border: '1px solid #93c5fd',
                }}
              >
                <div>
                  <strong>Test Upload Result</strong> (SIMULATED)
                </div>
                <div style={{ fontSize: 11, marginTop: 4 }}>
                  Passed: {detail.testUploadResult.validationPassed ? 'Yes' : 'No'}
                  {detail.testUploadResult.transmittalControlNumber && (
                    <>
                      {' '}
                      | TCN: <code>{detail.testUploadResult.transmittalControlNumber}</code>
                    </>
                  )}
                </div>
                {detail.testUploadResult.nextSteps.length > 0 && (
                  <div style={{ marginTop: 6, fontSize: 11, color: '#4b5563' }}>
                    <strong>Next steps for real submission:</strong>
                    <ol style={{ margin: '4px 0 0 16px', padding: 0 }}>
                      {detail.testUploadResult.nextSteps.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}

            {/* Export Manifest */}
            {detail.lastExportManifest && (
              <div
                style={{
                  marginBottom: 12,
                  padding: '8px 12px',
                  background: '#f3e8ff',
                  border: '1px solid #c4b5fd',
                  borderRadius: 4,
                  fontSize: 12,
                }}
              >
                <strong>Export Package</strong>
                <div style={{ fontSize: 11 }}>
                  Files: {(detail.lastExportManifest as any).files?.length ?? 0}
                  {' | '}Total charges: PHP{' '}
                  {(
                    (detail.lastExportManifest as any).claimSummary?.totalCharges ?? 0
                  ).toLocaleString()}
                  {' | '}Version: {(detail.lastExportManifest as any).version ?? '3.0'}
                </div>
              </div>
            )}

            {/* Diagnoses */}
            <div style={{ marginBottom: 8 }}>
              <strong style={{ fontSize: 12 }}>Diagnoses ({detail.diagnoses.length})</strong>
              {detail.diagnoses.length === 0 ? (
                <p style={{ fontSize: 11, color: '#9ca3af' }}>None -- add via PATCH</p>
              ) : (
                <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: 11 }}>
                  {detail.diagnoses.map((d, i) => (
                    <li key={i}>
                      {d.icdCode} ({d.type}){d.description ? ` -- ${d.description}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Charges */}
            <div style={{ marginBottom: 8 }}>
              <strong style={{ fontSize: 12 }}>Charges ({detail.charges.length})</strong>
              {detail.charges.length === 0 ? (
                <p style={{ fontSize: 11, color: '#9ca3af' }}>None -- add via PATCH</p>
              ) : (
                <table
                  style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', marginTop: 4 }}
                >
                  <thead>
                    <tr style={{ borderBottom: '1px solid #d1d5db' }}>
                      <th style={{ textAlign: 'left', padding: '2px 4px' }}>Description</th>
                      <th style={{ textAlign: 'right', padding: '2px 4px' }}>Qty</th>
                      <th style={{ textAlign: 'right', padding: '2px 4px' }}>Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.charges.map((ch, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '2px 4px' }}>{ch.description}</td>
                        <td style={{ textAlign: 'right', padding: '2px 4px' }}>{ch.quantity}</td>
                        <td style={{ textAlign: 'right', padding: '2px 4px' }}>
                          {ch.netAmount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Timeline */}
            <div>
              <strong style={{ fontSize: 12 }}>Timeline</strong>
              <div style={{ marginTop: 4 }}>
                {detail.timeline.map((t, i) => (
                  <div
                    key={i}
                    style={{ fontSize: 11, padding: '3px 0', borderBottom: '1px solid #f3f4f6' }}
                  >
                    <span style={{ color: '#6b7280' }}>
                      {new Date(t.timestamp).toLocaleString()}
                    </span>{' '}
                    <strong>{t.action}</strong> by {t.actor}
                    {t.detail && <span style={{ color: '#4b5563' }}> -- {t.detail}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
