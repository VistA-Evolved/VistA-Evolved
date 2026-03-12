/**
 * AI Help -- Patient-facing AI assistant for lab education and portal navigation.
 *
 * Rules:
 * - No clinical advice, diagnosis, or treatment recommendations
 * - No VA-specific terminology (no "CPRS", "VistA", "DUZ", "DFN")
 * - All outputs include disclaimer
 * - Plain-language labels only
 */

'use client';

import { useState } from 'react';
import { fetchLabEducation, askPortalSearch } from '@/lib/api';

type Tab = 'education' | 'search';

/* ------------------------------------------------------------------ */
/* Lab Education Sub-Tab                                               */
/* ------------------------------------------------------------------ */

function LabEducationTab() {
  const [labName, setLabName] = useState('');
  const [labValue, setLabValue] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExplain() {
    if (!labName.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetchLabEducation(labName.trim(), labValue.trim() || undefined);
      const body = res.data as
        | { ok?: boolean; explanation?: string; error?: string }
        | undefined;
      if (res.ok && body?.explanation) {
        setResult(body.explanation);
      } else {
        setError(body?.error || res.error || 'Could not generate explanation. Please try again.');
      }
    } catch {
      setError('Network error. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h3 style={{ marginBottom: 8 }}>Understand Your Lab Results</h3>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
        Enter a lab test name and optional value to get a plain-language explanation.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Lab name (e.g. Hemoglobin A1c)"
          value={labName}
          onChange={(e) => setLabName(e.target.value)}
          style={inputStyle}
          onKeyDown={(e) => e.key === 'Enter' && handleExplain()}
        />
        <input
          type="text"
          placeholder="Value (optional, e.g. 6.2%)"
          value={labValue}
          onChange={(e) => setLabValue(e.target.value)}
          style={{ ...inputStyle, maxWidth: 180 }}
          onKeyDown={(e) => e.key === 'Enter' && handleExplain()}
        />
        <button onClick={handleExplain} disabled={loading || !labName.trim()} style={btnStyle}>
          {loading ? 'Explaining...' : 'Explain'}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: 12,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 6,
            color: '#991b1b',
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <div
          style={{
            padding: 16,
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: 8,
          }}
        >
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{result}</div>
          <div style={disclaimerStyle}>
            This explanation is for educational purposes only and does not replace medical advice.
            Always discuss your results with your healthcare provider.
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Portal Search Sub-Tab                                               */
/* ------------------------------------------------------------------ */

function PortalSearchTab() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await askPortalSearch(query.trim());
      const body = res.data as
        | { ok?: boolean; answer?: string; error?: string }
        | undefined;
      if (res.ok && body?.answer) {
        setResult(body.answer);
      } else {
        setError(body?.error || res.error || 'Could not process your question. Please try again.');
      }
    } catch {
      setError('Network error. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h3 style={{ marginBottom: 8 }}>Portal Help</h3>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
        Ask a question about using the portal or finding information.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          placeholder='e.g. "How do I request a refill?"'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch} disabled={loading || !query.trim()} style={btnStyle}>
          {loading ? 'Searching...' : 'Ask'}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: 12,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 6,
            color: '#991b1b',
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <div
          style={{
            padding: 16,
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 8,
          }}
        >
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{result}</div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Page                                                           */
/* ------------------------------------------------------------------ */

export default function AIHelpPage() {
  const [activeTab, setActiveTab] = useState<Tab>('education');

  return (
    <div>
      <h2 style={{ marginBottom: 4 }}>AI Help</h2>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
        Get help understanding your health information
      </p>

      {/* Governance banner (Phase 61: enhanced governance labeling) */}
      <div
        style={{
          padding: 12,
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: 6,
          marginBottom: 16,
          fontSize: 13,
          color: '#92400e',
        }}
      >
        <strong>AI Governance Notice:</strong> AI-generated content is for education only -- not
        medical advice. No diagnoses, treatment plans, or clinical recommendations are provided. No
        patient-identifiable information is sent to AI models. All interactions are logged for
        audit.
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid #e5e7eb' }}>
        {[
          { key: 'education' as Tab, label: 'Lab Education' },
          { key: 'search' as Tab, label: 'Portal Help' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === t.key ? '2px solid #2563eb' : '2px solid transparent',
              background: 'none',
              fontWeight: activeTab === t.key ? 600 : 400,
              color: activeTab === t.key ? '#2563eb' : '#6b7280',
              cursor: 'pointer',
              marginBottom: -2,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'education' && <LabEducationTab />}
      {activeTab === 'search' && <PortalSearchTab />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 14,
  minWidth: 200,
};

const btnStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 14,
};

const disclaimerStyle: React.CSSProperties = {
  marginTop: 12,
  paddingTop: 12,
  borderTop: '1px solid #bae6fd',
  fontSize: 12,
  color: '#6b7280',
  fontStyle: 'italic',
};
