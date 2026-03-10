'use client';

/**
 * PH HMO Console -- Phase 93: PH HMO Deepening Pack
 *
 * Admin console for billing staff to manage all 27 Philippine
 * Insurance Commission-licensed HMOs.
 *
 * Tabs:
 *   - Registry:     List of all HMOs with status, capabilities, evidence
 *   - Capabilities: Matrix view of capability coverage per HMO
 *   - Packets:      LOA / Claim packet generation for each HMO
 *   - Validation:   Registry data quality report
 */

import { useState, useEffect, useCallback } from 'react';
import { API_BASE as API } from '@/lib/api-config';

/* -- Types ---------------------------------------------------- */

interface HmoCapabilities {
  loa: string;
  eligibility: string;
  claimsSubmission: string;
  claimStatus: string;
  remittance: string;
  memberPortal: string;
  providerPortal: string;
}

interface HmoEvidence {
  kind: string;
  url: string;
  title: string;
  retrievedAt: string;
  notes?: string;
}

interface PhHmo {
  payerId: string;
  legalName: string;
  brandNames: string[];
  type: string;
  country: string;
  canonicalSource: { url: string; asOfDate: string; retrievedAt: string };
  capabilities: HmoCapabilities;
  integrationMode: string;
  evidence: HmoEvidence[];
  status: string;
  contractingTasks?: string[];
}

interface HmoStats {
  total: number;
  byStatus: Record<string, number>;
  byIntegrationMode: Record<string, number>;
  withPortal: number;
  contractingNeeded: number;
  lastUpdated: string | null;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  count: number;
}

interface LoaPacket {
  payerId: string;
  payerName: string;
  integrationMode: string;
  portalUrl?: string;
  requiredFields: string[];
  instructions: string[];
  generatedAt: string;
}

interface ClaimPacket {
  payerId: string;
  payerName: string;
  integrationMode: string;
  portalUrl?: string;
  requiredFields: string[];
  instructions: string[];
  generatedAt: string;
}

/* -- Color Maps ----------------------------------------------- */

const STATUS_COLORS: Record<string, string> = {
  in_progress: '#2563eb',
  contracting_needed: '#d97706',
  active: '#16a34a',
  suspended: '#dc2626',
};

const CAPABILITY_COLORS: Record<string, string> = {
  available: '#16a34a',
  portal: '#2563eb',
  manual: '#d97706',
  unknown_publicly: '#9ca3af',
  unavailable: '#dc2626',
};

const MODE_COLORS: Record<string, string> = {
  manual: '#6b7280',
  portal: '#2563eb',
  api: '#16a34a',
  email: '#d97706',
};

/* -- Main Component ------------------------------------------- */

type Tab = 'registry' | 'capabilities' | 'packets' | 'validation';

export default function PhHmoConsolePage() {
  const [tab, setTab] = useState<Tab>('registry');
  const tabs: { key: Tab; label: string }[] = [
    { key: 'registry', label: 'Registry' },
    { key: 'capabilities', label: 'Capabilities' },
    { key: 'packets', label: 'Packets' },
    { key: 'validation', label: 'Validation' },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>PH HMO Console</h1>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
        Canonical registry of all 27 Insurance Commission-licensed Philippine HMOs
      </p>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #d1d5db', marginBottom: 16 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? '#2563eb' : '#6b7280',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === t.key ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'registry' && <RegistryTab />}
      {tab === 'capabilities' && <CapabilitiesTab />}
      {tab === 'packets' && <PacketsTab />}
      {tab === 'validation' && <ValidationTab />}
    </div>
  );
}

/* -- Registry Tab --------------------------------------------- */

function RegistryTab() {
  const [hmos, setHmos] = useState<PhHmo[]>([]);
  const [stats, setStats] = useState<HmoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<PhHmo | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const [listRes, statsRes] = await Promise.all([
        fetch(`${API}/rcm/payers/ph/hmos?${params}`, { credentials: 'include' }),
        fetch(`${API}/rcm/payers/ph/hmos/stats`, { credentials: 'include' }),
      ]);

      if (listRes.ok) {
        const data = await listRes.json();
        setHmos(data.hmos || []);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats || null);
      }
    } catch {
      /* network error */
    }
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading)
    return (
      <div style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>Loading registry...</div>
    );

  return (
    <div>
      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <StatCard label="Total HMOs" value={stats.total} />
          <StatCard label="With Portal" value={stats.withPortal} color="#2563eb" />
          <StatCard label="Contracting Needed" value={stats.contractingNeeded} color="#d97706" />
          <StatCard label="Last Updated" value={stats.lastUpdated || 'N/A'} small />
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Search HMOs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '6px 10px',
            fontSize: 13,
            border: '1px solid #d1d5db',
            borderRadius: 4,
            width: 220,
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '6px 10px',
            fontSize: 13,
            border: '1px solid #d1d5db',
            borderRadius: 4,
          }}
        >
          <option value="">All Statuses</option>
          <option value="in_progress">In Progress</option>
          <option value="contracting_needed">Contracting Needed</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
            <th style={{ padding: '8px 6px' }}>HMO</th>
            <th style={{ padding: '8px 6px' }}>Brand</th>
            <th style={{ padding: '8px 6px' }}>Mode</th>
            <th style={{ padding: '8px 6px' }}>Status</th>
            <th style={{ padding: '8px 6px' }}>Portal</th>
            <th style={{ padding: '8px 6px' }}>Evidence</th>
            <th style={{ padding: '8px 6px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {hmos.map((hmo) => (
            <tr key={hmo.payerId} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '8px 6px' }}>
                <div style={{ fontWeight: 500 }}>{hmo.legalName}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>{hmo.payerId}</div>
              </td>
              <td style={{ padding: '8px 6px' }}>{hmo.brandNames.join(', ')}</td>
              <td style={{ padding: '8px 6px' }}>
                <Badge
                  text={hmo.integrationMode}
                  color={MODE_COLORS[hmo.integrationMode] || '#6b7280'}
                />
              </td>
              <td style={{ padding: '8px 6px' }}>
                <Badge
                  text={hmo.status.replace(/_/g, ' ')}
                  color={STATUS_COLORS[hmo.status] || '#6b7280'}
                />
              </td>
              <td style={{ padding: '8px 6px' }}>
                {hmo.capabilities.providerPortal === 'available' ? (
                  <span style={{ color: '#16a34a' }}>Yes</span>
                ) : (
                  <span style={{ color: '#9ca3af' }}>--</span>
                )}
              </td>
              <td style={{ padding: '8px 6px' }}>
                {hmo.evidence.length} source{hmo.evidence.length !== 1 ? 's' : ''}
              </td>
              <td style={{ padding: '8px 6px' }}>
                <button
                  onClick={() => setSelected(hmo)}
                  style={{
                    padding: '4px 8px',
                    fontSize: 12,
                    border: '1px solid #d1d5db',
                    borderRadius: 4,
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Detail
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {hmos.length === 0 && (
        <div style={{ textAlign: 'center', color: '#9ca3af', padding: 24 }}>
          No HMOs match the current filter
        </div>
      )}

      {/* Detail Modal */}
      {selected && <HmoDetailPanel hmo={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

/* -- HMO Detail Panel ----------------------------------------- */

function HmoDetailPanel({ hmo, onClose }: { hmo: PhHmo; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 480,
        background: '#fff',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
        overflowY: 'auto',
        padding: 24,
        zIndex: 100,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>{hmo.legalName}</h2>
        <button
          onClick={onClose}
          style={{
            border: 'none',
            background: 'none',
            fontSize: 18,
            cursor: 'pointer',
            color: '#6b7280',
          }}
        >
          x
        </button>
      </div>

      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>
        {hmo.payerId} | {hmo.brandNames.join(', ')} |{' '}
        <Badge
          text={hmo.status.replace(/_/g, ' ')}
          color={STATUS_COLORS[hmo.status] || '#6b7280'}
        />
      </div>

      {/* Capabilities */}
      <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, marginTop: 16 }}>
        Capabilities
      </h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <tbody>
          {Object.entries(hmo.capabilities).map(([key, val]) => (
            <tr key={key} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '6px 4px', fontWeight: 500 }}>{key}</td>
              <td style={{ padding: '6px 4px' }}>
                <Badge
                  text={String(val).replace(/_/g, ' ')}
                  color={CAPABILITY_COLORS[val] || '#6b7280'}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Evidence */}
      <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, marginTop: 16 }}>
        Evidence Sources
      </h3>
      {hmo.evidence.length === 0 ? (
        <p style={{ fontSize: 12, color: '#9ca3af' }}>No public evidence collected yet</p>
      ) : (
        <ul style={{ fontSize: 12, paddingLeft: 16, margin: 0 }}>
          {hmo.evidence.map((ev, i) => (
            <li key={i} style={{ marginBottom: 8 }}>
              <a
                href={ev.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#2563eb' }}
              >
                {ev.title}
              </a>
              <span style={{ color: '#9ca3af' }}> ({ev.kind})</span>
              {ev.notes && (
                <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>{ev.notes}</div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Contracting Tasks */}
      {hmo.contractingTasks && hmo.contractingTasks.length > 0 && (
        <>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, marginTop: 16 }}>
            Contracting Tasks
          </h3>
          <ul style={{ fontSize: 12, paddingLeft: 16, margin: 0 }}>
            {hmo.contractingTasks.map((task, i) => (
              <li key={i} style={{ marginBottom: 4, color: '#374151' }}>
                {task}
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Canonical Source */}
      <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, marginTop: 16 }}>
        Canonical Source
      </h3>
      <div style={{ fontSize: 12 }}>
        <a
          href={hmo.canonicalSource.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#2563eb' }}
        >
          Insurance Commission License Registry
        </a>
        <div style={{ color: '#9ca3af', marginTop: 2 }}>As of {hmo.canonicalSource.asOfDate}</div>
      </div>
    </div>
  );
}

/* -- Capabilities Tab ----------------------------------------- */

function CapabilitiesTab() {
  const [hmos, setHmos] = useState<PhHmo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/rcm/payers/ph/hmos`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setHmos(data.hmos || []);
        }
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, []);

  if (loading)
    return (
      <div style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>
        Loading capabilities...
      </div>
    );

  const capKeys: (keyof HmoCapabilities)[] = [
    'loa',
    'eligibility',
    'claimsSubmission',
    'claimStatus',
    'remittance',
    'memberPortal',
    'providerPortal',
  ];

  return (
    <div style={{ overflowX: 'auto' }}>
      <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
        Capability matrix for all 27 IC-licensed HMOs. Colors indicate evidence-backed status.
      </p>
      <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: 900 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
            <th style={{ padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>HMO</th>
            <th style={{ padding: '6px 8px', textAlign: 'left' }}>Mode</th>
            {capKeys.map((k) => (
              <th key={k} style={{ padding: '6px 4px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                {k.replace(/([A-Z])/g, ' $1').trim()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hmos.map((hmo) => (
            <tr key={hmo.payerId} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td
                style={{
                  padding: '6px 8px',
                  whiteSpace: 'nowrap',
                  maxWidth: 200,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {hmo.brandNames[0] || hmo.legalName}
              </td>
              <td style={{ padding: '6px 8px' }}>
                <Badge
                  text={hmo.integrationMode}
                  color={MODE_COLORS[hmo.integrationMode] || '#6b7280'}
                />
              </td>
              {capKeys.map((k) => {
                const val = hmo.capabilities[k];
                return (
                  <td key={k} style={{ padding: '4px', textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: CAPABILITY_COLORS[val] || '#d1d5db',
                      }}
                      title={val}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: 11, color: '#6b7280' }}>
        {Object.entries(CAPABILITY_COLORS).map(([key, color]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: color,
              }}
            />
            {key.replace(/_/g, ' ')}
          </div>
        ))}
      </div>
    </div>
  );
}

/* -- Packets Tab ---------------------------------------------- */

function PacketsTab() {
  const [hmos, setHmos] = useState<PhHmo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayerId, setSelectedPayerId] = useState('');
  const [packet, setPacket] = useState<LoaPacket | ClaimPacket | null>(null);
  const [packetType, setPacketType] = useState<'loa' | 'claim'>('loa');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/rcm/payers/ph/hmos`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setHmos(data.hmos || []);
        }
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, []);

  const generatePacket = useCallback(async () => {
    if (!selectedPayerId) return;
    try {
      const endpoint =
        packetType === 'loa'
          ? `${API}/rcm/payers/ph/hmos/${selectedPayerId}/loa-packet`
          : `${API}/rcm/payers/ph/hmos/${selectedPayerId}/claim-packet`;
      const res = await fetch(endpoint, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPacket(data.packet || null);
      }
    } catch {
      /* ignore */
    }
  }, [selectedPayerId, packetType]);

  if (loading)
    return <div style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>Loading...</div>;

  return (
    <div>
      <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
        Generate LOA request or claim submission packets for any HMO. Packets include required
        fields, portal links (if available), and step-by-step instructions.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <select
          value={selectedPayerId}
          onChange={(e) => {
            setSelectedPayerId(e.target.value);
            setPacket(null);
          }}
          style={{
            padding: '6px 10px',
            fontSize: 13,
            border: '1px solid #d1d5db',
            borderRadius: 4,
            flex: 1,
            maxWidth: 400,
          }}
        >
          <option value="">Select HMO...</option>
          {hmos.map((h) => (
            <option key={h.payerId} value={h.payerId}>
              {h.brandNames[0] || h.legalName} ({h.payerId})
            </option>
          ))}
        </select>

        <select
          value={packetType}
          onChange={(e) => {
            setPacketType(e.target.value as 'loa' | 'claim');
            setPacket(null);
          }}
          style={{
            padding: '6px 10px',
            fontSize: 13,
            border: '1px solid #d1d5db',
            borderRadius: 4,
          }}
        >
          <option value="loa">LOA Request</option>
          <option value="claim">Claim Submission</option>
        </select>

        <button
          onClick={generatePacket}
          disabled={!selectedPayerId}
          style={{
            padding: '6px 16px',
            fontSize: 13,
            background: selectedPayerId ? '#2563eb' : '#d1d5db',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: selectedPayerId ? 'pointer' : 'default',
          }}
        >
          Generate
        </button>
      </div>

      {packet && (
        <div
          style={{
            border: '1px solid #d1d5db',
            borderRadius: 8,
            padding: 16,
            background: '#f9fafb',
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            {packetType === 'loa' ? 'LOA Request' : 'Claim Submission'} Packet: {packet.payerName}
          </h3>
          <div style={{ fontSize: 12, marginBottom: 8 }}>
            <Badge
              text={packet.integrationMode}
              color={MODE_COLORS[packet.integrationMode] || '#6b7280'}
            />
            {packet.portalUrl && (
              <span style={{ marginLeft: 8 }}>
                <a
                  href={packet.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#2563eb', fontSize: 12 }}
                >
                  Open Portal
                </a>
              </span>
            )}
          </div>

          <h4 style={{ fontSize: 12, fontWeight: 600, marginTop: 12, marginBottom: 4 }}>
            Instructions
          </h4>
          <ol style={{ fontSize: 12, paddingLeft: 16, margin: 0 }}>
            {packet.instructions.map((inst, i) => (
              <li key={i} style={{ marginBottom: 4, color: '#374151' }}>
                {inst}
              </li>
            ))}
          </ol>

          <h4 style={{ fontSize: 12, fontWeight: 600, marginTop: 12, marginBottom: 4 }}>
            Required Fields
          </h4>
          <ul style={{ fontSize: 12, paddingLeft: 16, margin: 0, columns: 2 }}>
            {packet.requiredFields.map((f, i) => (
              <li key={i} style={{ marginBottom: 2, color: '#374151' }}>
                {f}
              </li>
            ))}
          </ul>

          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 12 }}>
            Generated at: {packet.generatedAt}
          </div>
        </div>
      )}
    </div>
  );
}

/* -- Validation Tab ------------------------------------------- */

function ValidationTab() {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/rcm/payers/ph/hmos/validate`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setValidation(data.validation || null);
        }
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, []);

  if (loading)
    return <div style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>Validating...</div>;
  if (!validation)
    return (
      <div style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>
        Validation data unavailable
      </div>
    );

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <StatCard
          label="Registry Valid"
          value={validation.valid ? 'YES' : 'NO'}
          color={validation.valid ? '#16a34a' : '#dc2626'}
        />
        <StatCard label="HMO Count" value={validation.count} />
        <StatCard
          label="Errors"
          value={validation.errors.length}
          color={validation.errors.length > 0 ? '#dc2626' : '#16a34a'}
        />
        <StatCard
          label="Warnings"
          value={validation.warnings.length}
          color={validation.warnings.length > 0 ? '#d97706' : '#16a34a'}
        />
      </div>

      {validation.errors.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>
            Errors
          </h3>
          <ul style={{ fontSize: 12, color: '#dc2626', paddingLeft: 16 }}>
            {validation.errors.map((e, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#d97706', marginBottom: 8 }}>
            Warnings
          </h3>
          <ul style={{ fontSize: 12, color: '#d97706', paddingLeft: 16 }}>
            {validation.warnings.map((w, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {validation.errors.length === 0 && validation.warnings.length === 0 && (
        <div style={{ textAlign: 'center', color: '#16a34a', padding: 24, fontSize: 14 }}>
          Registry is valid with no errors or warnings
        </div>
      )}
    </div>
  );
}

/* -- Shared Components ---------------------------------------- */

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 500,
        borderRadius: 9999,
        background: `${color}15`,
        color,
        border: `1px solid ${color}40`,
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </span>
  );
}

function StatCard({
  label,
  value,
  color,
  small,
}: {
  label: string;
  value: string | number;
  color?: string;
  small?: boolean;
}) {
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: '12px 16px',
        minWidth: 120,
        background: '#fff',
      }}
    >
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: small ? 13 : 20, fontWeight: 700, color: color || '#1f2937' }}>
        {value}
      </div>
    </div>
  );
}
