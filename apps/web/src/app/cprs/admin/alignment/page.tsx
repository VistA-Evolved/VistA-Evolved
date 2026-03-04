'use client';

import { useEffect, useState, useCallback } from 'react';
import { API_BASE as API } from '@/lib/api-config';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface PanelScore {
  panel: string;
  score: number;
  totalRpcs: number;
  wiredRpcs: number;
  pendingRpcs: string[];
  depth: string;
}

interface AlignmentScore {
  globalScore: number;
  panels: PanelScore[];
  registry: {
    totalRegistered: number;
    totalExceptions: number;
    liveWired: number;
    registeredOnly: number;
    stubs: number;
    cprsGap: number;
  };
  fullyWiredPanels: number;
  partiallyWiredPanels: number;
  noVistaPanels: number;
  scoredAt: string;
}

interface AlignmentGate {
  id: string;
  name: string;
  description: string;
  status: string;
  detail: string;
}

interface GateReport {
  gates: AlignmentGate[];
  passCount: number;
  failCount: number;
  warnCount: number;
  overallStatus: string;
}

interface Tripwire {
  id: string;
  rpcName: string;
  condition: string;
  enabled: boolean;
  fireCount: number;
  lastFiredAt?: string;
  description: string;
}

interface Snapshot {
  id: string;
  name: string;
  capturedAt: string;
  capturedBy: string;
  registrySize: number;
  passRate: number;
}

/* ------------------------------------------------------------------ */
/*  API                                                                */
/* ------------------------------------------------------------------ */

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

/* ------------------------------------------------------------------ */
/*  Tabs                                                               */
/* ------------------------------------------------------------------ */

function ScoreTab() {
  const [score, setScore] = useState<AlignmentScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<{ ok: boolean; score: AlignmentScore }>(
          '/admin/alignment/score'
        );
        setScore(data.score);
      } catch {
        setScore(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p style={{ color: '#94a3b8' }}>Calculating alignment score...</p>;
  if (!score) return <p style={{ color: '#ef4444' }}>Failed to load alignment score.</p>;

  const scoreColor = (s: number) => (s >= 80 ? '#22c55e' : s >= 60 ? '#f59e0b' : '#ef4444');
  const depthColor = (d: string) => {
    if (d === 'full') return '#22c55e';
    if (d === 'partial') return '#f59e0b';
    if (d === 'stub') return '#ef4444';
    return '#64748b';
  };

  return (
    <div>
      {/* Global score */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 64, fontWeight: 800, color: scoreColor(score.globalScore) }}>
          {score.globalScore}
        </div>
        <div style={{ color: '#94a3b8' }}>Global Alignment Score</div>
      </div>

      {/* Registry summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}
      >
        {[
          { label: 'Registered', value: score.registry.totalRegistered },
          { label: 'Exceptions', value: score.registry.totalExceptions },
          { label: 'Live Wired', value: score.registry.liveWired },
          { label: 'CPRS Gap', value: score.registry.cprsGap },
          { label: 'Fully Wired', value: score.fullyWiredPanels },
          { label: 'Partial', value: score.partiallyWiredPanels },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: '#1e293b',
              padding: 12,
              borderRadius: 6,
              border: '1px solid #334155',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{item.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Per-panel scores */}
      <h3 style={{ marginBottom: 12 }}>Panel Alignment Scores</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: 13 }}>
            <th style={{ textAlign: 'left', padding: 8 }}>Panel</th>
            <th style={{ textAlign: 'center', padding: 8 }}>Score</th>
            <th style={{ textAlign: 'center', padding: 8 }}>RPCs</th>
            <th style={{ textAlign: 'center', padding: 8 }}>Depth</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Pending RPCs</th>
          </tr>
        </thead>
        <tbody>
          {score.panels.map((p) => (
            <tr key={p.panel} style={{ borderBottom: '1px solid #1e293b' }}>
              <td style={{ padding: 8, fontWeight: 600 }}>{p.panel}</td>
              <td
                style={{
                  padding: 8,
                  textAlign: 'center',
                  color: scoreColor(p.score),
                  fontWeight: 700,
                }}
              >
                {p.score}
              </td>
              <td style={{ padding: 8, textAlign: 'center' }}>
                {p.wiredRpcs}/{p.totalRpcs}
              </td>
              <td style={{ padding: 8, textAlign: 'center' }}>
                <span style={{ color: depthColor(p.depth), fontWeight: 600 }}>{p.depth}</span>
              </td>
              <td style={{ padding: 8, fontSize: 12, color: '#94a3b8' }}>
                {p.pendingRpcs.length > 0 ? p.pendingRpcs.join(', ') : '--'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GatesTab() {
  const [report, setReport] = useState<GateReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<{ ok: boolean; report: GateReport }>('/admin/alignment/gates');
        setReport(data.report);
      } catch {
        setReport(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p style={{ color: '#94a3b8' }}>Running alignment gates...</p>;
  if (!report) return <p style={{ color: '#ef4444' }}>Failed to run alignment gates.</p>;

  const statusIcon = (s: string) => {
    if (s === 'pass') return '\u2705';
    if (s === 'fail') return '\u274C';
    if (s === 'warn') return '\u26A0\uFE0F';
    return '\u23ED';
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
        <div style={{ color: '#22c55e', fontWeight: 700 }}>Pass: {report.passCount}</div>
        <div style={{ color: '#ef4444', fontWeight: 700 }}>Fail: {report.failCount}</div>
        <div style={{ color: '#f59e0b', fontWeight: 700 }}>Warn: {report.warnCount}</div>
      </div>

      {report.gates.map((g) => (
        <div
          key={g.id}
          style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 8,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: 18, marginRight: 8 }}>{statusIcon(g.status)}</span>
              <strong>{g.name}</strong>
            </div>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{g.id}</span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0' }}>{g.description}</p>
          <p style={{ color: '#cbd5e1', fontSize: 12, margin: 0, fontFamily: 'monospace' }}>
            {g.detail}
          </p>
        </div>
      ))}
    </div>
  );
}

function TripwiresTab() {
  const [tripwires, setTripwires] = useState<Tripwire[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ ok: boolean; tripwires: Tripwire[] }>(
        '/admin/alignment/tripwires'
      );
      setTripwires(data.tripwires ?? []);
    } catch {
      setTripwires([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const seed = async () => {
    await apiFetch('/admin/alignment/tripwires/seed', { method: 'POST' });
    await load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>RPC Tripwires</h3>
        <button
          onClick={seed}
          style={{
            padding: '8px 16px',
            background: '#8b5cf6',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Seed Defaults
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Loading...</p>
      ) : tripwires.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>No tripwires configured. Seed defaults to get started.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: 13 }}>
              <th style={{ textAlign: 'left', padding: 8 }}>RPC</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Condition</th>
              <th style={{ textAlign: 'center', padding: 8 }}>Fires</th>
              <th style={{ textAlign: 'center', padding: 8 }}>Status</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {tripwires.map((tw) => (
              <tr key={tw.id} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 13 }}>{tw.rpcName}</td>
                <td style={{ padding: 8 }}>{tw.condition}</td>
                <td
                  style={{
                    padding: 8,
                    textAlign: 'center',
                    fontWeight: 700,
                    color: tw.fireCount > 0 ? '#ef4444' : '#22c55e',
                  }}
                >
                  {tw.fireCount}
                </td>
                <td style={{ padding: 8, textAlign: 'center' }}>
                  <span style={{ color: tw.enabled ? '#22c55e' : '#94a3b8' }}>
                    {tw.enabled ? 'active' : 'paused'}
                  </span>
                </td>
                <td style={{ padding: 8, fontSize: 12, color: '#94a3b8' }}>{tw.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function SnapshotsTab() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ ok: boolean; snapshots: Snapshot[] }>(
        '/admin/alignment/snapshots'
      );
      setSnapshots(data.snapshots ?? []);
    } catch {
      setSnapshots([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const capture = async () => {
    await apiFetch('/admin/alignment/snapshots', {
      method: 'POST',
      body: JSON.stringify({
        name: `Manual capture ${new Date().toISOString()}`,
        capturedBy: 'admin',
      }),
    });
    await load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Golden Trace Snapshots</h3>
        <button
          onClick={capture}
          style={{
            padding: '8px 16px',
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Capture Now
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Loading...</p>
      ) : snapshots.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>No snapshots captured yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: 13 }}>
              <th style={{ textAlign: 'left', padding: 8 }}>Name</th>
              <th style={{ textAlign: 'center', padding: 8 }}>Registry Size</th>
              <th style={{ textAlign: 'center', padding: 8 }}>Pass Rate</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Captured</th>
              <th style={{ textAlign: 'left', padding: 8 }}>By</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: 8 }}>{s.name}</td>
                <td style={{ padding: 8, textAlign: 'center' }}>{s.registrySize}</td>
                <td style={{ padding: 8, textAlign: 'center', color: '#22c55e', fontWeight: 700 }}>
                  {s.passRate}%
                </td>
                <td style={{ padding: 8, fontSize: 12, color: '#94a3b8' }}>
                  {new Date(s.capturedAt).toLocaleString()}
                </td>
                <td style={{ padding: 8, fontSize: 12 }}>{s.capturedBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */
const TABS = ['score', 'gates', 'tripwires', 'snapshots'] as const;
type Tab = (typeof TABS)[number];

export default function AlignmentAdminPage() {
  const [tab, setTab] = useState<Tab>('score');

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto', color: '#e2e8f0' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        VistA + CPRS Alignment Verification
      </h1>
      <p style={{ color: '#94a3b8', marginBottom: 24 }}>
        Phase 161 -- Golden traces, RPC tripwires, alignment scoring, and verification gates.
      </p>

      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 24,
          borderBottom: '1px solid #334155',
          paddingBottom: 8,
        }}
      >
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: tab === t ? 700 : 400,
              background: tab === t ? '#3b82f6' : 'transparent',
              color: tab === t ? '#fff' : '#94a3b8',
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'score' && <ScoreTab />}
      {tab === 'gates' && <GatesTab />}
      {tab === 'tripwires' && <TripwiresTab />}
      {tab === 'snapshots' && <SnapshotsTab />}
    </div>
  );
}
