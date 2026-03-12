'use client';

/**
 * PayerOps Admin -- Phase 87: Philippines RCM Foundation
 *
 * 4-tab interface:
 *   1. Enrollments -- facility-payer enrollment lifecycle
 *   2. LOA Cases -- Letter of Authorization request tracking
 *   3. Credential Vault -- document storage for accreditation artifacts
 *   4. Adapters -- view manual/portal adapter status
 *
 * Accessible at /cprs/admin/payerops. Requires session + RCM module enabled.
 */

import { useState, useEffect, useCallback } from 'react';
import { csrfHeaders } from '@/lib/csrf';
import styles from '@/components/cprs/cprs.module.css';
import { API_BASE } from '@/lib/api-config';

type Tab = 'enrollments' | 'loa' | 'credentials' | 'adapters';

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...opts,
    headers: { ...csrfHeaders(), ...(opts?.headers || {}) },
  });
  const data = await res.json();
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || data?.message || 'Request failed');
  }
  return data;
}

export default function PayerOpsPage() {
  const [tab, setTab] = useState<Tab>('enrollments');
  const [health, setHealth] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/rcm/payerops/health')
      .then((data) => {
        setHealth(data);
        setHealthError(null);
      })
      .catch((error) => {
        setHealth(null);
        setHealthError(error instanceof Error ? error.message : 'Unable to load payer operations health.');
      });
    apiFetch('/rcm/payerops/stats')
      .then((d) => {
        setStats(d?.stats);
        setStatsError(null);
      })
      .catch((error) => {
        setStats(null);
        setStatsError(error instanceof Error ? error.message : 'Unable to load payer operations stats.');
      });
  }, []);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'enrollments', label: 'Enrollments' },
    { id: 'loa', label: 'LOA Cases' },
    { id: 'credentials', label: 'Credential Vault' },
    { id: 'adapters', label: 'Adapters' },
  ];

  return (
    <div className={styles.cprsPage}>
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid #dee2e6',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18 }}>Payer Operations</h2>
        {health && (
          <span style={{ fontSize: 11, color: health.ok ? '#198754' : '#dc3545', fontWeight: 600 }}>
            {health.ok ? 'ONLINE' : 'OFFLINE'}
          </span>
        )}
        {health?.encryption === 'degraded' && (
          <span style={{ fontSize: 11, color: '#dc3545', fontWeight: 600 }}>
            ENCRYPTION DEGRADED
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6c757d' }}>
          Phase 87 -- PayerOps
        </span>
      </div>

      {(healthError || statsError) && (
        <div
          style={{
            margin: '12px 24px 0',
            padding: '10px 12px',
            background: '#fef2f2',
            color: '#991b1b',
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          <strong>Unable to load payer operations status.</strong>
          <div>{healthError || statsError}</div>
        </div>
      )}

      {/* Stats Summary */}
      {stats && (
        <div
          style={{
            display: 'flex',
            gap: 24,
            padding: '10px 24px',
            borderBottom: '1px solid #dee2e6',
            background: '#f8f9fa',
            fontSize: 12,
          }}
        >
          <span>
            Enrollments: <strong>{stats.enrollments?.total ?? 0}</strong>
          </span>
          <span>
            LOA Cases: <strong>{stats.loaCases?.total ?? 0}</strong>
          </span>
          <span>
            Credentials: <strong>{stats.credentials?.total ?? 0}</strong>
          </span>
          {(stats.credentials?.expiringSoon ?? 0) > 0 && (
            <span style={{ color: '#dc3545' }}>
              Expiring Soon: <strong>{stats.credentials.expiringSoon}</strong>
            </span>
          )}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #dee2e6', background: '#f8f9fa' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: tab === t.id ? '#fff' : 'transparent',
              borderBottom: tab === t.id ? '2px solid #0d6efd' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? '#0d6efd' : '#495057',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ padding: 16, overflow: 'auto', flex: 1 }}>
        {tab === 'enrollments' && <EnrollmentsTab />}
        {tab === 'loa' && <LOATab />}
        {tab === 'credentials' && <CredentialsTab />}
        {tab === 'adapters' && <AdaptersTab />}
      </div>
    </div>
  );
}

/* -- Enrollments Tab ------------------------------------------ */

function EnrollmentsTab() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiFetch('/rcm/payerops/enrollments')
      .then((d) => setEnrollments(d?.enrollments || []))
      .catch((err) => {
        setEnrollments([]);
        setError(err instanceof Error ? err.message : 'Unable to load enrollments.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 15 }}>Facility-Payer Enrollments</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}
        >
          {showForm ? 'Cancel' : '+ New Enrollment'}
        </button>
      </div>

      {showForm && (
        <EnrollmentForm
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {loading ? (
        <p style={{ fontSize: 13, color: '#6c757d' }}>Loading...</p>
      ) : error ? (
        <p style={{ fontSize: 13, color: '#991b1b' }}>Unable to load enrollments. {error}</p>
      ) : enrollments.length === 0 ? (
        <p style={{ fontSize: 13, color: '#6c757d' }}>
          No enrollments yet. Create one to start tracking payer accreditation.
        </p>
      ) : (
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>
              <th style={{ padding: '6px 8px' }}>Payer</th>
              <th style={{ padding: '6px 8px' }}>Facility</th>
              <th style={{ padding: '6px 8px' }}>Status</th>
              <th style={{ padding: '6px 8px' }}>Mode</th>
              <th style={{ padding: '6px 8px' }}>Credentials</th>
              <th style={{ padding: '6px 8px' }}>Updated</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map((e: any) => (
              <tr key={e.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: '6px 8px' }}>{e.payerName}</td>
                <td style={{ padding: '6px 8px' }}>{e.facilityName}</td>
                <td style={{ padding: '6px 8px' }}>
                  <StatusBadge status={e.status} />
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <span
                    style={{
                      fontSize: 11,
                      padding: '2px 6px',
                      background: '#e9ecef',
                      borderRadius: 3,
                    }}
                  >
                    {e.integrationMode}
                  </span>
                </td>
                <td style={{ padding: '6px 8px' }}>{e.credentialVaultRefs?.length ?? 0}</td>
                <td style={{ padding: '6px 8px', fontSize: 11, color: '#6c757d' }}>
                  {new Date(e.updatedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function EnrollmentForm({ onCreated }: { onCreated: () => void }) {
  const [facilityId, setFacilityId] = useState('facility-01');
  const [facilityName, setFacilityName] = useState('');
  const [payerId, setPayerId] = useState('');
  const [payerName, setPayerName] = useState('');
  const [mode, setMode] = useState<'manual' | 'portal'>('manual');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await apiFetch('/rcm/payerops/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilityId,
          facilityName: facilityName || facilityId,
          payerId,
          payerName,
          integrationMode: mode,
        }),
      });
      onCreated();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        background: '#f8f9fa',
        padding: 12,
        borderRadius: 4,
        marginBottom: 12,
        fontSize: 12,
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <label>
          Facility ID
          <input
            value={facilityId}
            onChange={(e) => setFacilityId(e.target.value)}
            style={{ width: '100%', padding: 4, fontSize: 12 }}
          />
        </label>
        <label>
          Facility Name
          <input
            value={facilityName}
            onChange={(e) => setFacilityName(e.target.value)}
            style={{ width: '100%', padding: 4, fontSize: 12 }}
          />
        </label>
        <label>
          Payer ID
          <input
            value={payerId}
            onChange={(e) => setPayerId(e.target.value)}
            style={{ width: '100%', padding: 4, fontSize: 12 }}
          />
        </label>
        <label>
          Payer Name
          <input
            value={payerName}
            onChange={(e) => setPayerName(e.target.value)}
            style={{ width: '100%', padding: 4, fontSize: 12 }}
          />
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="radio" checked={mode === 'manual'} onChange={() => setMode('manual')} />{' '}
          Manual
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="radio" checked={mode === 'portal'} onChange={() => setMode('portal')} />{' '}
          Portal
        </label>
        <button
          onClick={submit}
          disabled={submitting || !payerId || !payerName}
          style={{ marginLeft: 'auto', padding: '4px 16px', fontSize: 12, cursor: 'pointer' }}
        >
          {submitting ? 'Creating...' : 'Create'}
        </button>
      </div>
    </div>
  );
}

/* -- LOA Cases Tab -------------------------------------------- */

function LOATab() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPack, setSelectedPack] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiFetch('/rcm/payerops/loa')
      .then((d) => setCases(d?.loaCases || []))
      .catch((err) => {
        setCases([]);
        setError(err instanceof Error ? err.message : 'Unable to load LOA cases.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const generatePack = async (id: string) => {
    const data = await apiFetch(`/rcm/payerops/loa/${id}/pack`, { method: 'POST' });
    if (data?.ok) setSelectedPack(data.pack);
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 15 }}>Letter of Authorization (LOA) Cases</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}
        >
          {showForm ? 'Cancel' : '+ New LOA'}
        </button>
      </div>

      {showForm && (
        <LOAForm
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {loading ? (
        <p style={{ fontSize: 13, color: '#6c757d' }}>Loading...</p>
      ) : error ? (
        <p style={{ fontSize: 13, color: '#991b1b' }}>Unable to load LOA cases. {error}</p>
      ) : cases.length === 0 ? (
        <p style={{ fontSize: 13, color: '#6c757d' }}>
          No LOA cases yet. Create one to begin tracking payer authorizations.
        </p>
      ) : (
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>
              <th style={{ padding: '6px 8px' }}>ID</th>
              <th style={{ padding: '6px 8px' }}>Patient DFN</th>
              <th style={{ padding: '6px 8px' }}>Payer</th>
              <th style={{ padding: '6px 8px' }}>Type</th>
              <th style={{ padding: '6px 8px' }}>Status</th>
              <th style={{ padding: '6px 8px' }}>Mode</th>
              <th style={{ padding: '6px 8px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c: any) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: 11 }}>
                  {c.id.slice(0, 16)}...
                </td>
                <td style={{ padding: '6px 8px' }}>{c.patientDfn}</td>
                <td style={{ padding: '6px 8px' }}>{c.payerName}</td>
                <td style={{ padding: '6px 8px' }}>{c.requestType?.replace(/_/g, ' ')}</td>
                <td style={{ padding: '6px 8px' }}>
                  <StatusBadge status={c.status} />
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <span
                    style={{
                      fontSize: 11,
                      padding: '2px 6px',
                      background: '#e9ecef',
                      borderRadius: 3,
                    }}
                  >
                    {c.submissionMode}
                  </span>
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <button
                    onClick={() => generatePack(c.id)}
                    style={{ fontSize: 11, padding: '2px 8px', cursor: 'pointer' }}
                  >
                    Pack
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Submission Pack Modal */}
      {selectedPack && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: 24,
              maxWidth: 600,
              maxHeight: '80vh',
              overflow: 'auto',
              width: '90%',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>{selectedPack.title}</h3>
              <button
                onClick={() => setSelectedPack(null)}
                style={{ cursor: 'pointer', border: 'none', background: 'none', fontSize: 18 }}
              >
                X
              </button>
            </div>
            {selectedPack.sections?.map((s: any, i: number) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <h4 style={{ margin: '0 0 4px', fontSize: 13, color: '#495057' }}>{s.heading}</h4>
                <pre
                  style={{
                    margin: 0,
                    fontSize: 12,
                    whiteSpace: 'pre-wrap',
                    background: '#f8f9fa',
                    padding: 8,
                    borderRadius: 4,
                  }}
                >
                  {s.content}
                </pre>
              </div>
            ))}
            <h4 style={{ fontSize: 13, color: '#495057', marginBottom: 4 }}>Checklist</h4>
            <ul style={{ fontSize: 12, paddingLeft: 20 }}>
              {selectedPack.checklist?.map((item: string, i: number) => (
                <li key={i} style={{ marginBottom: 2 }}>
                  {item}
                </li>
              ))}
            </ul>
            <h4 style={{ fontSize: 13, color: '#495057', marginBottom: 4 }}>Email Template</h4>
            <pre
              style={{
                fontSize: 11,
                whiteSpace: 'pre-wrap',
                background: '#f8f9fa',
                padding: 8,
                borderRadius: 4,
              }}
            >
              Subject: {selectedPack.emailTemplate?.subject}
              {'\n\n'}
              {selectedPack.emailTemplate?.body}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function LOAForm({ onCreated }: { onCreated: () => void }) {
  const [facilityId, setFacilityId] = useState('facility-01');
  const [patientDfn, setPatientDfn] = useState('');
  const [payerId, setPayerId] = useState('');
  const [payerName, setPayerName] = useState('');
  const [requestType, setRequestType] = useState('initial_loa');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await apiFetch('/rcm/payerops/loa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilityId,
          patientDfn,
          payerId,
          payerName,
          requestType,
          requestedServices: [],
          diagnosisCodes: [],
        }),
      });
      onCreated();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        background: '#f8f9fa',
        padding: 12,
        borderRadius: 4,
        marginBottom: 12,
        fontSize: 12,
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <label>
          Facility ID
          <input
            value={facilityId}
            onChange={(e) => setFacilityId(e.target.value)}
            style={{ width: '100%', padding: 4, fontSize: 12 }}
          />
        </label>
        <label>
          Patient DFN
          <input
            value={patientDfn}
            onChange={(e) => setPatientDfn(e.target.value)}
            placeholder="VistA DFN"
            style={{ width: '100%', padding: 4, fontSize: 12 }}
          />
        </label>
        <label>
          Payer ID
          <input
            value={payerId}
            onChange={(e) => setPayerId(e.target.value)}
            style={{ width: '100%', padding: 4, fontSize: 12 }}
          />
        </label>
        <label>
          Payer Name
          <input
            value={payerName}
            onChange={(e) => setPayerName(e.target.value)}
            style={{ width: '100%', padding: 4, fontSize: 12 }}
          />
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label>
          Type:
          <select
            value={requestType}
            onChange={(e) => setRequestType(e.target.value)}
            style={{ marginLeft: 4, fontSize: 12, padding: 2 }}
          >
            <option value="initial_loa">Initial LOA</option>
            <option value="extension">Extension</option>
            <option value="upgrade">Upgrade</option>
            <option value="pre_auth">Pre-Authorization</option>
            <option value="guarantee_letter">Guarantee Letter</option>
            <option value="second_opinion">Second Opinion</option>
          </select>
        </label>
        <button
          onClick={submit}
          disabled={submitting || !patientDfn || !payerId || !payerName}
          style={{ marginLeft: 'auto', padding: '4px 16px', fontSize: 12, cursor: 'pointer' }}
        >
          {submitting ? 'Creating...' : 'Create LOA'}
        </button>
      </div>
    </div>
  );
}

/* -- Credentials Tab ------------------------------------------ */

function CredentialsTab() {
  const [credentials, setCredentials] = useState<any[]>([]);
  const [expiring, setExpiring] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      apiFetch('/rcm/payerops/credentials'),
      apiFetch('/rcm/payerops/credentials/expiring?days=60'),
    ])
      .then(([creds, exp]) => {
        setCredentials(creds?.credentials || []);
        setExpiring(exp?.credentials || []);
      })
      .catch((err) => {
        setCredentials([]);
        setExpiring([]);
        setError(err instanceof Error ? err.message : 'Unable to load credentials.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Credential Vault</h3>

      {expiring.length > 0 && (
        <div
          style={{
            padding: '8px 12px',
            background: '#fff3cd',
            borderRadius: 4,
            marginBottom: 12,
            fontSize: 12,
            color: '#664d03',
          }}
        >
          <strong>Expiring Soon:</strong> {expiring.length} credential(s) expiring within 60 days.
          {expiring.map((c: any) => (
            <div key={c.id} style={{ marginTop: 4 }}>
              {c.title} ({c.docType}) -- expires {c.expiryDate?.split('T')[0] || 'unknown'}
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: 13, color: '#6c757d' }}>Loading...</p>
      ) : error ? (
        <p style={{ fontSize: 13, color: '#991b1b' }}>Unable to load credential vault. {error}</p>
      ) : credentials.length === 0 ? (
        <p style={{ fontSize: 13, color: '#6c757d' }}>
          No credentials stored. Upload facility licenses, accreditation documents, and insurance
          certificates here.
        </p>
      ) : (
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>
              <th style={{ padding: '6px 8px' }}>Title</th>
              <th style={{ padding: '6px 8px' }}>Type</th>
              <th style={{ padding: '6px 8px' }}>Facility</th>
              <th style={{ padding: '6px 8px' }}>Issued By</th>
              <th style={{ padding: '6px 8px' }}>Expiry</th>
              <th style={{ padding: '6px 8px' }}>Payers</th>
            </tr>
          </thead>
          <tbody>
            {credentials.map((c: any) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: '6px 8px' }}>{c.title}</td>
                <td style={{ padding: '6px 8px' }}>
                  <span
                    style={{
                      fontSize: 11,
                      padding: '2px 6px',
                      background: '#e9ecef',
                      borderRadius: 3,
                    }}
                  >
                    {c.docType?.replace(/_/g, ' ')}
                  </span>
                </td>
                <td style={{ padding: '6px 8px' }}>{c.facilityId}</td>
                <td style={{ padding: '6px 8px' }}>{c.issuedBy || '--'}</td>
                <td
                  style={{
                    padding: '6px 8px',
                    color: isExpiringSoon(c.expiryDate) ? '#dc3545' : undefined,
                  }}
                >
                  {c.expiryDate?.split('T')[0] || '--'}
                </td>
                <td style={{ padding: '6px 8px' }}>{c.associatedPayerIds?.length ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* -- Adapters Tab --------------------------------------------- */

function AdaptersTab() {
  const [adapters, setAdapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/rcm/payerops/adapters')
      .then((d) => setAdapters(d?.adapters || []))
      .catch((err) => {
        setAdapters([]);
        setError(err instanceof Error ? err.message : 'Unable to load adapters.');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>PayerOps Adapters</h3>
      <p style={{ fontSize: 12, color: '#6c757d', marginBottom: 12 }}>
        All payer operations begin in MANUAL mode. Portal and API modes are available per-payer when
        the payer provides integration capabilities.
      </p>

      {loading ? (
        <p style={{ fontSize: 13, color: '#6c757d' }}>Loading...</p>
      ) : error ? (
        <p style={{ fontSize: 13, color: '#991b1b' }}>Unable to load adapters. {error}</p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {adapters.map((a: any) => (
            <div
              key={a.id}
              style={{
                border: '1px solid #dee2e6',
                borderRadius: 4,
                padding: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <strong style={{ fontSize: 14 }}>{a.name}</strong>
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 3,
                    background:
                      a.mode === 'manual' ? '#fff3cd' : a.mode === 'portal' ? '#d1ecf1' : '#d4edda',
                    color:
                      a.mode === 'manual' ? '#664d03' : a.mode === 'portal' ? '#0c5460' : '#155724',
                  }}
                >
                  {a.mode.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: 12, display: 'flex', gap: 16 }}>
                {Object.entries(a.capabilities || {}).map(([k, v]) => (
                  <span key={k}>
                    {k}: {v ? 'Yes' : 'No'}
                  </span>
                ))}
              </div>
              {a.portalConfigs !== undefined && (
                <div style={{ fontSize: 11, color: '#6c757d', marginTop: 4 }}>
                  Portal configs registered: {a.portalConfigs}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          marginTop: 24,
          padding: 12,
          background: '#f8f9fa',
          borderRadius: 4,
          fontSize: 12,
          color: '#6c757d',
        }}
      >
        <strong>Integration Roadmap</strong>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
          <li>
            <strong>Manual</strong> (current) -- Print packs, checklists, email templates for all
            payers
          </li>
          <li>
            <strong>Portal</strong> (current) -- URL + step-by-step portal navigation guides
          </li>
          <li>
            <strong>API</strong> (future) -- Direct payer API integration when available (e.g.,
            PhilHealth eClaims API)
          </li>
        </ul>
      </div>
    </div>
  );
}

/* -- Shared Components ---------------------------------------- */

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    active: { bg: '#d4edda', fg: '#155724' },
    approved: { bg: '#d4edda', fg: '#155724' },
    draft: { bg: '#e9ecef', fg: '#495057' },
    submitted: { bg: '#cce5ff', fg: '#004085' },
    under_review: { bg: '#d1ecf1', fg: '#0c5460' },
    pending_submission: { bg: '#fff3cd', fg: '#664d03' },
    pending_accreditation: { bg: '#fff3cd', fg: '#664d03' },
    application_submitted: { bg: '#d1ecf1', fg: '#0c5460' },
    renewal_required: { bg: '#fff3cd', fg: '#664d03' },
    partially_approved: { bg: '#fff3cd', fg: '#664d03' },
    denied: { bg: '#f8d7da', fg: '#721c24' },
    suspended: { bg: '#f8d7da', fg: '#721c24' },
    terminated: { bg: '#f8d7da', fg: '#721c24' },
    cancelled: { bg: '#f8d7da', fg: '#721c24' },
    expired: { bg: '#e9ecef', fg: '#6c757d' },
    not_enrolled: { bg: '#e9ecef', fg: '#6c757d' },
  };
  const c = colors[status] || { bg: '#e9ecef', fg: '#495057' };
  return (
    <span
      style={{
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 3,
        fontWeight: 600,
        background: c.bg,
        color: c.fg,
      }}
    >
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

function isExpiringSoon(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const daysUntil = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return daysUntil <= 60;
}
