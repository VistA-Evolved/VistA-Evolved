/**
 * Export Health Records Page — Phase 31
 *
 * Allows portal users to:
 * - Download full health record as PDF
 * - Download individual sections as PDF
 * - Download structured JSON export (FHIR-mappable)
 * - Generate SMART Health Cards (if enabled)
 */

'use client';

import { useEffect, useState } from 'react';
import { API_BASE } from '@/lib/api-config';

async function downloadBlob(path: string, filename: string) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const SECTIONS = [
  { id: 'allergies', label: 'Allergies', icon: '⚠️' },
  { id: 'medications', label: 'Medications', icon: '💊' },
  { id: 'problems', label: 'Active Problems', icon: '📋' },
  { id: 'vitals', label: 'Vitals', icon: '❤️' },
  { id: 'demographics', label: 'Demographics', icon: '👤' },
  { id: 'immunizations', label: 'Immunizations', icon: '💉' },
  { id: 'labs', label: 'Lab Results', icon: '🧪' },
] as const;

export default function ExportPage() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [shcCapabilities, setShcCapabilities] = useState<{
    enabled: boolean;
    datasets: { id: string; label: string; available: boolean }[];
  } | null>(null);
  const [shcResult, setShcResult] = useState<any>(null);

  useEffect(() => {
    fetch(`${API_BASE}/portal/shc/capabilities`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setShcCapabilities(d))
      .catch(() => {});
  }, []);

  const handleSectionPdf = async (sectionId: string) => {
    setDownloading(sectionId);
    setError('');
    try {
      await downloadBlob(`/portal/export/section/${sectionId}`, `${sectionId}-${Date.now()}.pdf`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDownloading(null);
    }
  };

  const handleFullPdf = async () => {
    setDownloading('full');
    setError('');
    try {
      await downloadBlob('/portal/export/full', `health-record-${Date.now()}.pdf`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDownloading(null);
    }
  };

  const handleJsonExport = async () => {
    setDownloading('json');
    setError('');
    try {
      const res = await fetch(`${API_BASE}/portal/export/json`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Export failed: ${res.status}`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `health-record-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDownloading(null);
    }
  };

  const handleShcExport = async (dataset: string) => {
    setDownloading(`shc-${dataset}`);
    setError('');
    setShcResult(null);
    try {
      const res = await fetch(`${API_BASE}/portal/export/shc/${dataset}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'SHC export failed');
      setShcResult(data.credential);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Export Health Records</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        Download your health records in various formats. All exports are audited and logged.
      </p>

      {error && (
        <div
          style={{
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: 6,
            padding: 12,
            marginBottom: 16,
            color: '#c33',
          }}
        >
          {error}
          <button
            onClick={() => setError('')}
            style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            x
          </button>
        </div>
      )}

      {/* Full Record Exports */}
      <div
        style={{
          background: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: 8,
          padding: 20,
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 18, margin: '0 0 12px' }}>Complete Health Record</h2>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
          Download all sections in a single file.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={handleFullPdf}
            disabled={downloading === 'full'}
            style={{
              padding: '10px 20px',
              borderRadius: 6,
              border: 'none',
              background: downloading === 'full' ? '#6c757d' : '#007bff',
              color: '#fff',
              cursor: downloading ? 'not-allowed' : 'pointer',
              fontSize: 14,
            }}
          >
            {downloading === 'full' ? 'Generating...' : 'Download PDF'}
          </button>
          <button
            onClick={handleJsonExport}
            disabled={downloading === 'json'}
            style={{
              padding: '10px 20px',
              borderRadius: 6,
              border: '1px solid #007bff',
              background: '#fff',
              color: '#007bff',
              cursor: downloading ? 'not-allowed' : 'pointer',
              fontSize: 14,
            }}
          >
            {downloading === 'json' ? 'Generating...' : 'Download JSON (Structured)'}
          </button>
        </div>
      </div>

      {/* Section-by-Section PDF */}
      <div
        style={{
          background: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: 8,
          padding: 20,
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 18, margin: '0 0 12px' }}>Individual Sections</h2>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
          Download specific sections as separate PDF files.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 8,
          }}
        >
          {SECTIONS.map((sec) => (
            <button
              key={sec.id}
              onClick={() => handleSectionPdf(sec.id)}
              disabled={downloading === sec.id}
              style={{
                padding: '10px 16px',
                borderRadius: 6,
                border: '1px solid #dee2e6',
                background: '#fff',
                cursor: downloading ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>{sec.icon}</span>
              {downloading === sec.id ? '...' : sec.label}
            </button>
          ))}
        </div>
      </div>

      {/* SMART Health Cards */}
      <div
        style={{ background: '#f0f7ff', border: '1px solid #b8daff', borderRadius: 8, padding: 20 }}
      >
        <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>
          SMART Health Cards
          <span
            style={{
              fontSize: 12,
              marginLeft: 8,
              color: '#856404',
              background: '#fff3cd',
              padding: '2px 8px',
              borderRadius: 12,
            }}
          >
            Preview
          </span>
        </h2>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
          Generate verifiable health credentials for sharing with pharmacies and providers.
        </p>

        {shcCapabilities && !shcCapabilities.enabled && (
          <div
            style={{
              padding: 12,
              background: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: 6,
              marginBottom: 12,
              fontSize: 13,
            }}
          >
            SMART Health Cards are not currently enabled. Contact your administrator to enable this
            feature.
          </div>
        )}

        {shcCapabilities?.datasets.map((ds) => (
          <div key={ds.id} style={{ marginBottom: 12 }}>
            <button
              onClick={() => handleShcExport(ds.id)}
              disabled={!ds.available || downloading === `shc-${ds.id}`}
              style={{
                padding: '10px 20px',
                borderRadius: 6,
                border: '1px solid #28a745',
                background: ds.available ? '#28a745' : '#ccc',
                color: '#fff',
                cursor: ds.available ? 'pointer' : 'not-allowed',
                fontSize: 14,
              }}
            >
              {downloading === `shc-${ds.id}` ? 'Generating...' : `Generate ${ds.label}`}
            </button>
          </div>
        ))}

        {shcResult && (
          <div
            style={{
              marginTop: 16,
              background: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: 8,
              padding: 16,
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 16, color: '#155724' }}>
              Health Card Generated
            </h3>
            {shcResult.meta?.devMode && (
              <p
                style={{
                  margin: '0 0 8px',
                  fontSize: 12,
                  color: '#856404',
                  background: '#fff3cd',
                  padding: '4px 8px',
                  borderRadius: 4,
                  display: 'inline-block',
                }}
              >
                Development mode — not a production credential
              </p>
            )}
            <div style={{ marginTop: 8 }}>
              <label style={{ fontWeight: 600, fontSize: 13 }}>SHC URI (for QR code):</label>
              <pre
                style={{
                  background: '#fff',
                  padding: 8,
                  borderRadius: 4,
                  fontSize: 11,
                  wordBreak: 'break-all',
                  maxHeight: 100,
                  overflow: 'auto',
                  margin: '4px 0',
                }}
              >
                {shcResult.shcUri?.slice(0, 200)}...
              </pre>
            </div>
            <div style={{ marginTop: 8, fontSize: 13, color: '#666' }}>
              <span>Records: {shcResult.meta?.recordCount || 0}</span>
              <span style={{ margin: '0 8px' }}>|</span>
              <span>
                Issued:{' '}
                {shcResult.meta?.issuedAt
                  ? new Date(shcResult.meta.issuedAt).toLocaleString()
                  : 'N/A'}
              </span>
            </div>
            <button
              onClick={() => setShcResult(null)}
              style={{ marginTop: 8, padding: '4px 12px', cursor: 'pointer', fontSize: 13 }}
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
