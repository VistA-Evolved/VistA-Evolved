'use client';

import { useEffect, useState } from 'react';
import { API_BASE } from '@/lib/api-config';

/* -- Types ---------------------------------------------------- */

interface MarketSummary {
  generatedAt: string;
  totalHmos: number;
  byPayerType: Record<string, number>;
  integration: {
    portalAdapterAvailable: number;
    genericManualAdapter: number;
    manualOnly: number;
    totalWithAdapter: number;
    adapterCoveragePct: number;
  };
  capabilities: {
    totalCapabilitySlots: number;
    knownSlots: number;
    unknownSlots: number;
    coveragePct: number;
  };
  loaTemplates: {
    total: number;
    withPortalSubmission: number;
    withManualSubmission: number;
    withTurnaroundEstimate: number;
  };
  claimPackets: {
    total: number;
    withPortalUpload: number;
    withFilingDeadline: number;
    withAppealWindow: number;
  };
  contracting: {
    totalTasks: number;
    completedTasks: number;
    progressPct: number;
    byStatus: Record<string, number>;
  };
}

interface ManifestEntry {
  payerId: string;
  legalName: string;
  payerType: string;
  caNumber: string | null;
  adapterStatus: string;
  adapterName: string | null;
  integrationMode: string;
  capabilityCoverage: { known: number; unknown: number; total: number; pct: number };
  contractingStatus: string;
}

/* -- Stat Card ------------------------------------------------ */

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div style={{ background: '#1e293b', borderRadius: 8, padding: '16px 20px', minWidth: 160 }}>
      <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#f1f5f9', fontSize: 24, fontWeight: 700 }}>{value}</div>
      {detail && <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>{detail}</div>}
    </div>
  );
}

/* -- Progress Bar --------------------------------------------- */

function ProgressBar({ pct, color = '#3b82f6' }: { pct: number; color?: string }) {
  return (
    <div style={{ background: '#334155', borderRadius: 4, height: 8, width: '100%' }}>
      <div
        style={{
          background: color,
          borderRadius: 4,
          height: 8,
          width: `${Math.min(pct, 100)}%`,
          transition: 'width 0.3s',
        }}
      />
    </div>
  );
}

/* -- Badge ---------------------------------------------------- */

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        background: color,
        color: '#fff',
        borderRadius: 4,
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {text}
    </span>
  );
}

function adapterStatusBadge(status: string) {
  switch (status) {
    case 'portal_adapter_available':
      return <Badge text="Portal Adapter" color="#059669" />;
    case 'generic_manual_adapter':
      return <Badge text="Generic Manual" color="#d97706" />;
    case 'manual_only':
      return <Badge text="Manual Only" color="#64748b" />;
    default:
      return <Badge text={status} color="#475569" />;
  }
}

function payerTypeBadge(type: string) {
  switch (type) {
    case 'hmo_l1':
      return <Badge text="L1" color="#3b82f6" />;
    case 'hmo_l3':
      return <Badge text="L3" color="#8b5cf6" />;
    default:
      return <Badge text={type} color="#475569" />;
  }
}

/* -- Main Page ------------------------------------------------ */

export default function PhMarketPage() {
  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [manifest, setManifest] = useState<ManifestEntry[]>([]);
  const [tab, setTab] = useState<'overview' | 'hmos' | 'contracting'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [summaryResponse, manifestResponse] = await Promise.all([
          fetch(`${API_BASE}/rcm/hmo/market-summary`, { credentials: 'include' }),
          fetch(`${API_BASE}/rcm/hmo/manifest`, { credentials: 'include' }),
        ]);

        const [summaryData, manifestData] = await Promise.all([
          summaryResponse.json(),
          manifestResponse.json(),
        ]);

        if (!summaryResponse.ok || summaryData?.ok === false) {
          throw new Error(
            summaryData?.error || summaryData?.message || 'Unable to load PH market summary.',
          );
        }

        if (!manifestResponse.ok || manifestData?.ok === false) {
          throw new Error(
            manifestData?.error || manifestData?.message || 'Unable to load PH market manifest.',
          );
        }

        setSummary(summaryData.summary);
        setManifest(manifestData.manifest?.entries ?? []);
      } catch (e) {
        setSummary(null);
        setManifest([]);
        setError(e instanceof Error ? e.message : 'Unable to load PH market data.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading)
    return <div style={{ padding: 32, color: '#94a3b8' }}>Loading PH market data...</div>;
  if (error) {
    return (
      <div style={{ padding: 32, color: '#ef4444' }}>
        Unable to load PH market data. {error}
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', color: '#e2e8f0', maxWidth: 1200 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>PH HMO Market Dashboard</h1>
      <p style={{ color: '#94a3b8', marginBottom: 24, fontSize: 13 }}>
        All 27 Insurance Commission-licensed HMOs -- integration status, capabilities, and
        contracting progress.
      </p>

      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 24,
          borderBottom: '1px solid #334155',
          paddingBottom: 8,
        }}
      >
        {(['overview', 'hmos', 'contracting'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 16px',
              background: tab === t ? '#3b82f6' : 'transparent',
              color: tab === t ? '#fff' : '#94a3b8',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && summary && (
        <div>
          {/* Summary cards */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
            <StatCard label="IC-Licensed HMOs" value={summary.totalHmos} />
            <StatCard
              label="Portal Adapters"
              value={summary.integration.portalAdapterAvailable}
              detail={`${summary.integration.adapterCoveragePct}% coverage`}
            />
            <StatCard
              label="Capability Coverage"
              value={`${summary.capabilities.coveragePct}%`}
              detail={`${summary.capabilities.knownSlots}/${summary.capabilities.totalCapabilitySlots} slots`}
            />
            <StatCard
              label="LOA Templates"
              value={summary.loaTemplates.total}
              detail={`${summary.loaTemplates.withPortalSubmission} portal`}
            />
            <StatCard
              label="Claim Configs"
              value={summary.claimPackets.total}
              detail={`${summary.claimPackets.withPortalUpload} portal upload`}
            />
            <StatCard
              label="Contracting"
              value={`${summary.contracting.progressPct}%`}
              detail={`${summary.contracting.completedTasks}/${summary.contracting.totalTasks} tasks`}
            />
          </div>

          {/* Integration progress */}
          <div style={{ background: '#1e293b', borderRadius: 8, padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
              Integration Progress
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '200px 1fr 60px',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 12, color: '#94a3b8' }}>Adapter Coverage</span>
              <ProgressBar pct={summary.integration.adapterCoveragePct} color="#059669" />
              <span style={{ fontSize: 12, color: '#94a3b8', textAlign: 'right' }}>
                {summary.integration.adapterCoveragePct}%
              </span>

              <span style={{ fontSize: 12, color: '#94a3b8' }}>Capability Matrix</span>
              <ProgressBar pct={summary.capabilities.coveragePct} color="#3b82f6" />
              <span style={{ fontSize: 12, color: '#94a3b8', textAlign: 'right' }}>
                {summary.capabilities.coveragePct}%
              </span>

              <span style={{ fontSize: 12, color: '#94a3b8' }}>Contracting</span>
              <ProgressBar pct={summary.contracting.progressPct} color="#d97706" />
              <span style={{ fontSize: 12, color: '#94a3b8', textAlign: 'right' }}>
                {summary.contracting.progressPct}%
              </span>
            </div>
          </div>

          {/* Payer type breakdown */}
          <div style={{ background: '#1e293b', borderRadius: 8, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>By Payer Type</h3>
            <div style={{ display: 'flex', gap: 24 }}>
              {Object.entries(summary.byPayerType).map(([type, count]) => (
                <div key={type} style={{ textAlign: 'center' }}>
                  {payerTypeBadge(type)}
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'hmos' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <th
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    color: '#94a3b8',
                    fontWeight: 600,
                  }}
                >
                  HMO
                </th>
                <th
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    color: '#94a3b8',
                    fontWeight: 600,
                  }}
                >
                  Type
                </th>
                <th
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    color: '#94a3b8',
                    fontWeight: 600,
                  }}
                >
                  CA #
                </th>
                <th
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    color: '#94a3b8',
                    fontWeight: 600,
                  }}
                >
                  Adapter
                </th>
                <th
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    color: '#94a3b8',
                    fontWeight: 600,
                  }}
                >
                  Capabilities
                </th>
                <th
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    color: '#94a3b8',
                    fontWeight: 600,
                  }}
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {manifest.map((entry) => (
                <tr key={entry.payerId} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ fontWeight: 600 }}>{entry.legalName}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{entry.payerId}</div>
                  </td>
                  <td style={{ padding: '8px 12px' }}>{payerTypeBadge(entry.payerType)}</td>
                  <td style={{ padding: '8px 12px', fontSize: 11, color: '#94a3b8' }}>
                    {entry.caNumber ?? '--'}
                  </td>
                  <td style={{ padding: '8px 12px' }}>{adapterStatusBadge(entry.adapterStatus)}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ProgressBar pct={entry.capabilityCoverage.pct} />
                      <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {entry.capabilityCoverage.pct}%
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 11, color: '#94a3b8' }}>
                    {entry.contractingStatus}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'contracting' && (
        <div style={{ padding: 8 }}>
          <p style={{ color: '#94a3b8', marginBottom: 16, fontSize: 13 }}>
            Contracting tasks are managed via the Contracting Hub. Initialize tasks for a payer to
            begin the onboarding workflow.
          </p>
          <div style={{ background: '#1e293b', borderRadius: 8, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
              Contracting Task Summary
            </h3>
            {summary ? (
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <StatCard label="Total Tasks" value={summary.contracting.totalTasks} />
                <StatCard label="Completed" value={summary.contracting.completedTasks} />
                <StatCard label="Open" value={summary.contracting.byStatus.open ?? 0} />
                <StatCard
                  label="In Progress"
                  value={summary.contracting.byStatus.in_progress ?? 0}
                />
                <StatCard label="Blocked" value={summary.contracting.byStatus.blocked ?? 0} />
              </div>
            ) : (
              <p style={{ color: '#64748b' }}>No contracting data available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
