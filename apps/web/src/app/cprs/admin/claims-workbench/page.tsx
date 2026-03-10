'use client';

/**
 * Claims Workbench -- Phase 94: PH HMO Workflow Automation
 *
 * Unified claims management dashboard for PH HMO payers.
 *
 * Tabs:
 *   - Status Board:  Claims by lifecycle state
 *   - Create Claim:  HMO-aware claim creation with submission plan
 *   - VistA Sources: Field-by-field VistA source mapping
 *   - Rulepacks:     Payer-specific rules (LOA, claims, denials)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { csrfHeaders } from '@/lib/csrf';
import { API_BASE as API } from '@/lib/api-config';

/* -- Styles --------------------------------------------------- */

const PAGE: React.CSSProperties = {
  padding: '24px',
  fontFamily: 'Inter, system-ui, sans-serif',
  color: '#e0e0e0',
  background: '#0a0a0a',
  minHeight: '100vh',
};
const TABS: React.CSSProperties = {
  display: 'flex',
  gap: 0,
  borderBottom: '1px solid #333',
  marginBottom: 24,
};
const TAB_BASE: React.CSSProperties = {
  padding: '10px 20px',
  cursor: 'pointer',
  border: 'none',
  background: 'transparent',
  color: '#888',
  fontSize: 14,
  borderBottom: '2px solid transparent',
};
const TAB_ACTIVE: React.CSSProperties = {
  ...TAB_BASE,
  color: '#60a5fa',
  borderBottomColor: '#60a5fa',
};
const CARD: React.CSSProperties = {
  background: '#111',
  border: '1px solid #262626',
  borderRadius: 8,
  padding: 16,
  marginBottom: 12,
};
const INPUT: React.CSSProperties = {
  background: '#1a1a1a',
  border: '1px solid #333',
  borderRadius: 4,
  padding: '8px 12px',
  color: '#e0e0e0',
  width: '100%',
  fontSize: 14,
};
const BTN: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 4,
  border: 'none',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
};
const BTN_PRIMARY: React.CSSProperties = { ...BTN, background: '#2563eb', color: '#fff' };
const BADGE: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 12,
  fontSize: 11,
  fontWeight: 600,
};
const TABLE: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  fontSize: 13,
};
const TH: React.CSSProperties = {
  textAlign: 'left' as const,
  padding: '8px 12px',
  borderBottom: '1px solid #333',
  color: '#888',
  fontWeight: 500,
};
const TD: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid #1a1a1a' };

const STATUS_COLORS: Record<string, string> = {
  draft: '#666',
  validated: '#8b5cf6',
  ready_to_submit: '#f59e0b',
  submitted: '#3b82f6',
  accepted: '#06b6d4',
  rejected: '#ef4444',
  paid: '#22c55e',
  denied: '#dc2626',
  appealed: '#a855f7',
  closed: '#888',
};

/* -- Types ---------------------------------------------------- */

interface StatusBoard {
  total: number;
  byStatus: Record<string, number>;
  recentDenials: Array<{
    claimId: string;
    reasonText: string;
    deniedAt: string;
    recordedBy: string;
  }>;
}

interface VistaSourceEntry {
  field: string;
  category: string;
  vistaFile?: string;
  vistaSource?: string;
  rpcName?: string;
  status: string;
  sandboxNote?: string;
}

interface Rulepack {
  payerId: string;
  payerName: string;
  loa: { requiredFields: string[]; turnaroundSla?: string; notes: string };
  claims: {
    requiredFields: string[];
    requiredDocuments: string[];
    filingDeadlineDays?: number;
    notes: string;
  };
  denials: {
    knownPatterns: Array<{ description: string; suggestedAction: string }>;
    notes: string;
  };
  exclusions: { known: string[]; notes: string };
}

export default function ClaimsWorkbenchPage() {
  const [tab, setTab] = useState<'board' | 'create' | 'sources' | 'rulepacks'>('board');
  const [board, setBoard] = useState<StatusBoard | null>(null);
  const [sources, setSources] = useState<VistaSourceEntry[]>([]);
  const [sourceStats, setSourceStats] = useState<{
    total: number;
    available: number;
    integrationPending: number;
    notApplicable: number;
  }>({ total: 0, available: 0, integrationPending: 0, notApplicable: 0 });
  const [rulepacks, setRulepacks] = useState<Rulepack[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  /* Form state */
  const [formDfn, setFormDfn] = useState('');
  const [formName, setFormName] = useState('');
  const [formPayer, setFormPayer] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formCharge, setFormCharge] = useState('');

  const fetchBoard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/rcm/claims/hmo/board`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setBoard(data);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch(`${API}/rcm/claims/source-map`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setSources(data.entries ?? []);
        setSourceStats(data.stats ?? {});
      }
    } catch {
      /* ignore */
    }
  }, []);

  const fetchRulepacks = useCallback(async () => {
    try {
      const res = await fetch(`${API}/rcm/payers/rulepacks`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setRulepacks(data.rulepacks ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchBoard();
    fetchSources();
    fetchRulepacks();
  }, [fetchBoard, fetchSources, fetchRulepacks]);

  const handleCreate = async () => {
    if (!formDfn || !formPayer || !formDate) {
      setMessage('Patient DFN, Payer ID, and Date of Service required');
      return;
    }
    try {
      const res = await fetch(`${API}/rcm/claims/hmo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({
          patientDfn: formDfn,
          patientName: formName || undefined,
          payerId: formPayer,
          dateOfService: formDate,
          totalCharge: formCharge ? parseInt(formCharge, 10) : undefined,
          actor: 'billing-staff',
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage(
          `Claim created: ${data.claim?.id?.slice(0, 8)}... Mode: ${data.submissionPlan?.mode}`
        );
        setTab('board');
        fetchBoard();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setMessage(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div style={PAGE}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Claims Workbench</h1>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
        PH HMO claims submission -- lifecycle, VistA sources, payer rules -- Phase 94
      </p>

      {message && (
        <div style={{ ...CARD, background: '#1a1a2e', borderColor: '#2563eb', marginBottom: 16 }}>
          <span style={{ fontSize: 13 }}>{message}</span>
          <button
            onClick={() => setMessage('')}
            style={{
              ...BTN,
              background: '#333',
              color: '#ccc',
              marginLeft: 12,
              padding: '4px 8px',
              fontSize: 11,
            }}
          >
            dismiss
          </button>
        </div>
      )}

      <div style={TABS}>
        {(['board', 'create', 'sources', 'rulepacks'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={tab === t ? TAB_ACTIVE : TAB_BASE}>
            {t === 'board'
              ? 'Status Board'
              : t === 'create'
                ? 'Create Claim'
                : t === 'sources'
                  ? 'VistA Sources'
                  : 'Rulepacks'}
          </button>
        ))}
      </div>

      {/* -- Status Board --------------------------------------- */}
      {tab === 'board' && (
        <div>
          {loading ? (
            <p style={{ color: '#888' }}>Loading...</p>
          ) : board ? (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div style={CARD}>
                  <div style={{ fontSize: 11, color: '#888' }}>Total Claims</div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{board.total}</div>
                </div>
                {Object.entries(board.byStatus).map(([status, count]) => (
                  <div key={status} style={CARD}>
                    <div style={{ fontSize: 11, color: '#888' }}>{status.replace(/_/g, ' ')}</div>
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 700,
                        color: STATUS_COLORS[status] ?? '#ccc',
                      }}
                    >
                      {count}
                    </div>
                  </div>
                ))}
              </div>

              {board.recentDenials.length > 0 && (
                <div style={CARD}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Recent Denials</h3>
                  <table style={TABLE}>
                    <thead>
                      <tr>
                        <th style={TH}>Claim</th>
                        <th style={TH}>Reason</th>
                        <th style={TH}>Date</th>
                        <th style={TH}>Recorded By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {board.recentDenials.map((d, i) => (
                        <tr key={i}>
                          <td style={TD}>
                            <code style={{ fontSize: 11 }}>{d.claimId.slice(0, 8)}</code>
                          </td>
                          <td style={TD}>{d.reasonText}</td>
                          <td style={TD}>{new Date(d.deniedAt).toLocaleDateString()}</td>
                          <td style={TD}>{d.recordedBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div style={CARD}>
              <p style={{ color: '#888' }}>No claims data yet.</p>
            </div>
          )}
        </div>
      )}

      {/* -- Create Claim --------------------------------------- */}
      {tab === 'create' && (
        <div style={{ maxWidth: 600 }}>
          <div style={CARD}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>New HMO Claim</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>Patient DFN *</label>
                <input
                  style={INPUT}
                  value={formDfn}
                  onChange={(e) => setFormDfn(e.target.value)}
                  placeholder="e.g. 3"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>Patient Name</label>
                <input
                  style={INPUT}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. EIGHT,PATIENT"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>HMO Payer ID *</label>
                <input
                  style={INPUT}
                  value={formPayer}
                  onChange={(e) => setFormPayer(e.target.value)}
                  placeholder="e.g. PH-MAXICARE"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>Date of Service *</label>
                <input
                  style={INPUT}
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888' }}>Total Charge (cents)</label>
                <input
                  style={INPUT}
                  type="number"
                  value={formCharge}
                  onChange={(e) => setFormCharge(e.target.value)}
                  placeholder="e.g. 50000"
                />
              </div>
              <button onClick={handleCreate} style={BTN_PRIMARY}>
                Create Claim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -- VistA Sources -------------------------------------- */}
      {tab === 'sources' && (
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div style={CARD}>
              <div style={{ fontSize: 11, color: '#888' }}>Total Fields</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{sourceStats.total}</div>
            </div>
            <div style={CARD}>
              <div style={{ fontSize: 11, color: '#888' }}>Available</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>
                {sourceStats.available}
              </div>
            </div>
            <div style={CARD}>
              <div style={{ fontSize: 11, color: '#888' }}>Awaiting Config</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>
                {sourceStats.integrationPending}
              </div>
            </div>
            <div style={CARD}>
              <div style={{ fontSize: 11, color: '#888' }}>Not Applicable</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#888' }}>
                {sourceStats.notApplicable}
              </div>
            </div>
          </div>

          <table style={TABLE}>
            <thead>
              <tr>
                <th style={TH}>Field</th>
                <th style={TH}>Category</th>
                <th style={TH}>Status</th>
                <th style={TH}>VistA File</th>
                <th style={TH}>RPC</th>
                <th style={TH}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s, i) => (
                <tr key={i}>
                  <td style={TD}>
                    <strong>{s.field}</strong>
                  </td>
                  <td style={TD}>{s.category}</td>
                  <td style={TD}>
                    <span
                      style={{
                        ...BADGE,
                        background:
                          s.status === 'available'
                            ? '#16a34a'
                            : s.status === 'requires_config'
                              ? '#d97706'
                              : '#666',
                        color: '#fff',
                      }}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td style={TD}>
                    <code style={{ fontSize: 11 }}>{s.vistaFile ?? '-'}</code>
                  </td>
                  <td style={TD}>
                    <code style={{ fontSize: 11 }}>{s.rpcName ?? '-'}</code>
                  </td>
                  <td style={{ ...TD, fontSize: 11, color: '#888' }}>{s.sandboxNote ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* -- Rulepacks ------------------------------------------ */}
      {tab === 'rulepacks' && (
        <div>
          {rulepacks.length === 0 ? (
            <div style={CARD}>
              <p style={{ color: '#888' }}>
                No rulepacks loaded. Check data/payers/ph-hmo-rulepacks.json
              </p>
            </div>
          ) : (
            rulepacks.map((rp) => (
              <div key={rp.payerId} style={CARD}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{rp.payerName}</h3>
                <p style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>{rp.payerId}</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {/* LOA Rules */}
                  <div>
                    <h4
                      style={{ fontSize: 12, fontWeight: 600, color: '#60a5fa', marginBottom: 4 }}
                    >
                      LOA Requirements
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
                      {rp.loa.requiredFields.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                    <p style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                      SLA: {rp.loa.turnaroundSla ?? 'unknown'}
                    </p>
                  </div>

                  {/* Claims Rules */}
                  <div>
                    <h4
                      style={{ fontSize: 12, fontWeight: 600, color: '#22c55e', marginBottom: 4 }}
                    >
                      Claim Requirements
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
                      {rp.claims.requiredDocuments.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                    <p style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                      Filing deadline:{' '}
                      {rp.claims.filingDeadlineDays
                        ? `${rp.claims.filingDeadlineDays} days`
                        : 'unknown'}
                    </p>
                  </div>
                </div>

                {rp.denials.knownPatterns.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <h4
                      style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', marginBottom: 4 }}
                    >
                      Known Denial Patterns
                    </h4>
                    {rp.denials.knownPatterns.map((p, i) => (
                      <div key={i} style={{ fontSize: 12, padding: '2px 0' }}>
                        <strong>{p.description}</strong> -- {p.suggestedAction}
                      </div>
                    ))}
                  </div>
                )}

                <p style={{ fontSize: 11, color: '#666', marginTop: 8, fontStyle: 'italic' }}>
                  {rp.loa.notes}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
