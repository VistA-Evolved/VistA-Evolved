/**
 * Document Center — Phase 140
 *
 * Allows portal users to:
 * - Browse available document types (VistA-backed)
 * - Generate documents with signed download tokens
 * - Download generated documents
 */

'use client';

import { useEffect, useState } from 'react';
import { DataSourceBadge } from '@/components/data-source-badge';
import { API_BASE } from '@/lib/api-config';

interface DocumentType {
  id: string;
  label: string;
  description: string;
  source: string;
}

interface GenerateResult {
  token: string;
  expiresIn: number;
  downloadUrl: string;
}

function toBadgeSource(source: string): 'ehr' | 'pending' | 'local' {
  const normalized = source.toLowerCase();
  if (normalized.includes('vista') || normalized.includes('ehr') || normalized.includes('health system')) {
    return 'ehr';
  }
  if (
    normalized.includes('pending') ||
    normalized.includes('scaffold') ||
    normalized.includes('manual') ||
    normalized.includes('mixed')
  ) {
    return 'pending';
  }
  return 'local';
}

async function portalFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export default function DocumentsPage() {
  const [loading, setLoading] = useState(true);
  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);
  const [lastToken, setLastToken] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pageBadgeSource =
    docTypes.length === 0
      ? 'pending'
      : docTypes.every((dt) => toBadgeSource(dt.source) === 'ehr')
        ? 'ehr'
        : docTypes.every((dt) => toBadgeSource(dt.source) === 'local')
          ? 'local'
          : 'pending';
  const pageBadgeLabel =
    docTypes.length === 0
      ? 'Document Source Pending'
      : pageBadgeSource === 'pending'
        ? 'Mixed / Pending Sources'
        : undefined;
  const footerText =
    pageBadgeSource === 'ehr'
      ? 'Documents are generated from your live health-system record. Download links expire in 5 minutes.'
      : pageBadgeSource === 'local'
        ? 'Documents are currently generated from local portal data, not directly from the live health-system record. Download links expire in 5 minutes.'
        : 'Document sources vary by type. Some are generated from the live health-system record while others remain local or integration-pending. Download links expire in 5 minutes.';

  useEffect(() => {
    portalFetch('/portal/documents')
      .then((data: any) => {
        setDocTypes(data.documentTypes || []);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleGenerate = async (typeId: string) => {
    setGenerating(typeId);
    setError(null);
    setLastToken(null);
    try {
      const data = await portalFetch('/portal/documents/generate', {
        method: 'POST',
        body: JSON.stringify({ documentType: typeId }),
      });
      setLastToken(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate document');
    } finally {
      setGenerating(null);
    }
  };

  const handleDownload = () => {
    if (!lastToken) return;
    window.open(`${API_BASE}${lastToken.downloadUrl}`, '_blank');
    setLastToken(null);
  };

  return (
    <div className="container">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Document Center</h1>
          <p style={{ color: 'var(--portal-text-muted)', fontSize: '0.875rem' }}>
            Generate and download health documents from your medical record
          </p>
        </div>
        <DataSourceBadge source={pageBadgeSource} label={pageBadgeLabel} />
      </div>

      {error && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: 6,
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            color: '#991b1b',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      {lastToken && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: 6,
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <strong style={{ color: '#166534' }}>Document ready!</strong>
            <span style={{ color: '#15803d', fontSize: '0.875rem', marginLeft: '0.5rem' }}>
              Expires in {lastToken.expiresIn}s
            </span>
          </div>
          <button
            onClick={handleDownload}
            style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.8125rem',
              background: '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Download Now
          </button>
        </div>
      )}

      <div className="card">
        <h3 style={{ margin: '0 0 1rem' }}>Available Documents</h3>

        {loading ? (
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Loading document types...</p>
        ) : docTypes.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <p>No document types available</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {docTypes.map((dt) => (
              <div
                key={dt.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  border: '1px solid var(--portal-border, #e2e8f0)',
                  borderRadius: 6,
                  background: '#fff',
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '0.9375rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <span>{dt.label}</span>
                    <DataSourceBadge source={toBadgeSource(dt.source)} label={dt.source} />
                  </div>
                  <div
                    style={{
                      color: 'var(--portal-text-muted)',
                      fontSize: '0.8125rem',
                      marginTop: '0.125rem',
                    }}
                  >
                    {dt.description}
                  </div>
                </div>
                <button
                  onClick={() => handleGenerate(dt.id)}
                  disabled={generating === dt.id}
                  style={{
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.8125rem',
                    background: generating === dt.id ? '#94a3b8' : '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    cursor: generating === dt.id ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {generating === dt.id ? 'Generating...' : 'Generate'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1rem' }}>
        {footerText}
      </p>
    </div>
  );
}
