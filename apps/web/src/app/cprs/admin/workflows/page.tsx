'use client';

import { useEffect, useState, useCallback } from 'react';
import { API_BASE as API } from '@/lib/api-config';
import { getCsrfToken } from '@/lib/csrf';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface WorkflowStepDef {
  id: string;
  name: string;
  description: string;
  requiredRole?: string;
  estimatedMinutes?: number;
  isOptional?: boolean;
  vistaIntegration?: {
    targetRpc?: string;
    status: string;
  };
}

interface WorkflowStepIntegrationOutcome {
  mode: 'tiu_draft' | 'requires_config' | 'none';
  status: 'completed' | 'failed' | 'not_requested' | 'requires_config';
  targetRpc?: string;
  message: string;
  rpcUsed?: string[];
  docIen?: string;
  resultSummary?: string;
}

interface WorkflowDefinition {
  id: string;
  tenantId: string;
  department: string;
  name: string;
  description: string;
  version: number;
  status: string;
  steps: WorkflowStepDef[];
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowStepInstance {
  stepId: string;
  name: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
  skippedReason?: string;
  integrationOutcome?: WorkflowStepIntegrationOutcome;
}

interface WorkflowInstance {
  id: string;
  tenantId: string;
  definitionId: string;
  department: string;
  patientDfn: string;
  encounterRef?: string;
  queueTicketId?: string;
  status: string;
  steps: WorkflowStepInstance[];
  startedBy: string;
  startedAt: string;
  completedAt?: string;
}

interface DepartmentPack {
  department: string;
  name: string;
  description: string;
  stepCount: number;
  tags: string[];
  vistaReferences: number;
}

interface WorkflowStats {
  totalDefinitions: number;
  activeDefinitions: number;
  totalInstances: number;
  byStatus: Record<string, number>;
  byDepartment: Record<string, number>;
}

interface TiuTitle {
  ien: string;
  name: string;
}

/* ------------------------------------------------------------------ */
/*  API helpers                                                        */
/* ------------------------------------------------------------------ */

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const method = (opts?.method || 'GET').toUpperCase();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((opts?.headers as Record<string, string> | undefined) ?? {}),
  };
  if (method !== 'GET' && method !== 'HEAD') {
    const csrf = await getCsrfToken();
    if (csrf) headers['x-csrf-token'] = csrf;
  }
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    ...opts,
    headers,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

/* ------------------------------------------------------------------ */
/*  Tab components                                                     */
/* ------------------------------------------------------------------ */
function DefinitionsTab({ onStarted }: { onStarted: () => void }) {
  const [defs, setDefs] = useState<WorkflowDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [patientDfn, setPatientDfn] = useState('46');
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ ok: boolean; definitions: WorkflowDefinition[] }>(
        '/admin/workflows/definitions'
      );
      setDefs(data.definitions ?? []);
    } catch {
      setDefs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = defs.filter(
    (d) =>
      !filter ||
      d.name.toLowerCase().includes(filter.toLowerCase()) ||
      d.department.toLowerCase().includes(filter.toLowerCase())
  );

  const statusColor = (s: string) => {
    if (s === 'active') return '#22c55e';
    if (s === 'archived') return '#94a3b8';
    return '#f59e0b';
  };

  const startWorkflow = async (definitionId: string) => {
    setStartingId(definitionId);
    setError(null);
    try {
      await apiFetch('/workflows/start', {
        method: 'POST',
        body: JSON.stringify({ definitionId, patientDfn: patientDfn.trim() }),
      });
      onStarted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start workflow');
    } finally {
      setStartingId(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input
          placeholder="Filter by name or department..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            flex: 1,
            padding: 8,
            border: '1px solid #334155',
            borderRadius: 6,
            background: '#1e293b',
            color: '#e2e8f0',
          }}
        />
        <button
          onClick={load}
          style={{
            padding: '8px 16px',
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Refresh
        </button>
        <input
          placeholder="Patient DFN"
          value={patientDfn}
          onChange={(e) => setPatientDfn(e.target.value)}
          style={{
            width: 140,
            padding: 8,
            border: '1px solid #334155',
            borderRadius: 6,
            background: '#1e293b',
            color: '#e2e8f0',
          }}
        />
      </div>
      {error && <div style={{ color: '#fca5a5', marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Loading definitions...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>
          No workflow definitions found. Seed department packs first.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: 13 }}>
              <th style={{ textAlign: 'left', padding: 8 }}>Department</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Name</th>
              <th style={{ textAlign: 'center', padding: 8 }}>Steps</th>
              <th style={{ textAlign: 'center', padding: 8 }}>Version</th>
              <th style={{ textAlign: 'center', padding: 8 }}>Status</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Tags</th>
              <th style={{ textAlign: 'center', padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: 8, fontWeight: 600 }}>{d.department}</td>
                <td style={{ padding: 8 }}>{d.name}</td>
                <td style={{ padding: 8, textAlign: 'center' }}>{d.steps?.length ?? 0}</td>
                <td style={{ padding: 8, textAlign: 'center' }}>v{d.version}</td>
                <td style={{ padding: 8, textAlign: 'center' }}>
                  <span style={{ color: statusColor(d.status), fontWeight: 600 }}>{d.status}</span>
                </td>
                <td style={{ padding: 8, fontSize: 12, color: '#94a3b8' }}>
                  {(d.tags ?? []).slice(0, 3).join(', ')}
                </td>
                <td style={{ padding: 8, textAlign: 'center' }}>
                  <button
                    onClick={() => startWorkflow(d.id)}
                    disabled={startingId === d.id || !patientDfn.trim()}
                    style={{
                      padding: '6px 12px',
                      background: startingId === d.id ? '#475569' : '#16a34a',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      cursor: startingId === d.id || !patientDfn.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {startingId === d.id ? 'Starting...' : 'Start'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function InstancesTab({ refreshToken }: { refreshToken: number }) {
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [definitions, setDefinitions] = useState<Record<string, WorkflowDefinition>>({});
  const [titles, setTitles] = useState<TiuTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dept, setDept] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notesByStep, setNotesByStep] = useState<Record<string, string>>({});
  const [titleByStep, setTitleByStep] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = dept ? `?department=${dept}` : '';
      const [instanceData, defData, titleData] = await Promise.all([
        apiFetch<{ ok: boolean; instances: WorkflowInstance[] }>(`/workflows/instances${q}`),
        apiFetch<{ ok: boolean; definitions: WorkflowDefinition[] }>('/admin/workflows/definitions'),
        apiFetch<{
          ok: boolean;
          titles?: TiuTitle[];
          defaultTitles?: TiuTitle[];
        }>('/vista/cprs/notes/titles'),
      ]);
      setInstances(instanceData.instances ?? []);
      setDefinitions(
        Object.fromEntries((defData.definitions ?? []).map((definition) => [definition.id, definition]))
      );
      setTitles(titleData.titles ?? titleData.defaultTitles ?? [{ ien: '10', name: 'GENERAL NOTE' }]);
    } catch {
      setInstances([]);
      setDefinitions({});
      setTitles([{ ien: '10', name: 'GENERAL NOTE' }]);
    } finally {
      setLoading(false);
    }
  }, [dept]);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  const stepKey = (instanceId: string, stepId: string) => `${instanceId}:${stepId}`;
  const getStepDef = (instance: WorkflowInstance, step: WorkflowStepInstance) =>
    definitions[instance.definitionId]?.steps.find((candidate) => candidate.id === step.stepId);

  const mutateStep = async (
    instance: WorkflowInstance,
    step: WorkflowStepInstance,
    action: 'complete' | 'skip'
  ) => {
    const key = stepKey(instance.id, step.stepId);
    const stepDef = getStepDef(instance, step);
    const noteText = notesByStep[key]?.trim() || '';
    const titleIen = titleByStep[key] || titles[0]?.ien || '10';
    if (
      action === 'complete' &&
      stepDef?.vistaIntegration?.targetRpc === 'TIU CREATE RECORD' &&
      !noteText
    ) {
      setError('TIU-backed workflow steps require note text before completion.');
      return;
    }

    setBusyKey(key);
    setError(null);
    try {
      await apiFetch(`/workflows/instances/${instance.id}/step/${step.stepId}`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          notes: noteText,
          integration:
            action === 'complete' && stepDef?.vistaIntegration?.targetRpc === 'TIU CREATE RECORD'
              ? { tiu: { titleIen, text: noteText } }
              : undefined,
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to advance workflow step');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input
          placeholder="Filter by department..."
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          style={{
            flex: 1,
            padding: 8,
            border: '1px solid #334155',
            borderRadius: 6,
            background: '#1e293b',
            color: '#e2e8f0',
          }}
        />
        <button
          onClick={load}
          style={{
            padding: '8px 16px',
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Refresh
        </button>
      </div>
      {error && <div style={{ color: '#fca5a5', marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Loading instances...</p>
      ) : instances.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>No active workflow instances.</p>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {instances.map((inst) => {
            const total = inst.steps?.length ?? 0;
            const done = inst.steps?.filter((s) => s.status === 'completed').length ?? 0;
            return (
              <div
                key={inst.id}
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  padding: 16,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{definitions[inst.definitionId]?.name || inst.department}</div>
                    <div style={{ color: '#94a3b8', fontSize: 13 }}>
                      {inst.department} * patient DFN {inst.patientDfn}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, color: '#94a3b8' }}>
                    <div>Status: <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{inst.status}</span></div>
                    <div>Started: {new Date(inst.startedAt).toLocaleString()}</div>
                    <div>{done}/{total} steps completed</div>
                  </div>
                </div>

                <div style={{ background: '#334155', borderRadius: 4, height: 8, marginBottom: 14 }}>
                  <div
                    style={{
                      background: '#22c55e',
                      borderRadius: 4,
                      height: 8,
                      width: total > 0 ? `${(done / total) * 100}%` : '0%',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  {inst.steps.map((step) => {
                    const key = stepKey(inst.id, step.stepId);
                    const stepDef = getStepDef(inst, step);
                    const isActive = step.status === 'active';
                    const isTiu = stepDef?.vistaIntegration?.targetRpc === 'TIU CREATE RECORD';
                    return (
                      <div
                        key={step.stepId}
                        style={{
                          border: '1px solid #334155',
                          borderRadius: 6,
                          padding: 12,
                          background: isActive ? '#0f2f4a' : '#0f172a',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                          <div>
                            <div style={{ fontWeight: 600 }}>{step.name}</div>
                            <div style={{ fontSize: 12, color: '#94a3b8' }}>
                              {stepDef?.requiredRole ? `${stepDef.requiredRole} * ` : ''}
                              {stepDef?.vistaIntegration?.targetRpc || 'No direct VistA writeback'}
                            </div>
                          </div>
                          <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 700 }}>{step.status}</div>
                        </div>

                        {step.integrationOutcome && (
                          <div style={{ marginTop: 8, fontSize: 12, color: '#cbd5e1' }}>
                            {step.integrationOutcome.message}
                            {step.integrationOutcome.docIen ? ` (IEN ${step.integrationOutcome.docIen})` : ''}
                          </div>
                        )}

                        {isActive && (
                          <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                            {isTiu && (
                              <>
                                <select
                                  value={titleByStep[key] || titles[0]?.ien || '10'}
                                  onChange={(e) => setTitleByStep((current) => ({ ...current, [key]: e.target.value }))}
                                  style={{
                                    padding: 8,
                                    border: '1px solid #334155',
                                    borderRadius: 6,
                                    background: '#1e293b',
                                    color: '#e2e8f0',
                                  }}
                                >
                                  {titles.map((title) => (
                                    <option key={title.ien} value={title.ien}>
                                      {title.name}
                                    </option>
                                  ))}
                                </select>
                                <textarea
                                  value={notesByStep[key] || ''}
                                  onChange={(e) => setNotesByStep((current) => ({ ...current, [key]: e.target.value }))}
                                  placeholder="Enter TIU note text to create a VistA draft for this workflow step"
                                  rows={4}
                                  style={{
                                    width: '100%',
                                    padding: 10,
                                    border: '1px solid #334155',
                                    borderRadius: 6,
                                    background: '#1e293b',
                                    color: '#e2e8f0',
                                  }}
                                />
                              </>
                            )}
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                onClick={() => mutateStep(inst, step, 'complete')}
                                disabled={busyKey === key}
                                style={{
                                  padding: '8px 14px',
                                  background: '#16a34a',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: 6,
                                  cursor: busyKey === key ? 'not-allowed' : 'pointer',
                                }}
                              >
                                {busyKey === key ? 'Working...' : isTiu ? 'Complete + TIU Draft' : 'Complete Step'}
                              </button>
                              <button
                                onClick={() => mutateStep(inst, step, 'skip')}
                                disabled={busyKey === key}
                                style={{
                                  padding: '8px 14px',
                                  background: '#475569',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: 6,
                                  cursor: busyKey === key ? 'not-allowed' : 'pointer',
                                }}
                              >
                                Skip Step
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PacksTab() {
  const [packs, setPacks] = useState<DepartmentPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ ok: boolean; packs: DepartmentPack[] }>(
        '/admin/workflows/packs'
      );
      setPacks(data.packs ?? []);
    } catch {
      setPacks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const seed = async () => {
    setSeeding(true);
    try {
      await apiFetch('/admin/workflows/seed', { method: 'POST' });
      await load();
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: '#e2e8f0' }}>Department Workflow Packs</h3>
        <button
          onClick={seed}
          disabled={seeding}
          style={{
            padding: '8px 16px',
            background: seeding ? '#475569' : '#8b5cf6',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: seeding ? 'not-allowed' : 'pointer',
          }}
        >
          {seeding ? 'Seeding...' : 'Seed All Packs'}
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Loading packs...</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          {packs.map((p) => (
            <div
              key={p.department}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: 8,
                padding: 16,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{p.name}</div>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>{p.department}</div>
              <p style={{ color: '#cbd5e1', fontSize: 13, marginBottom: 8 }}>{p.description}</p>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#94a3b8' }}>
                <span>{p.stepCount} steps</span>
                <span>{p.vistaReferences} VistA refs</span>
              </div>
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(p.tags ?? []).map((t) => (
                  <span
                    key={t}
                    style={{
                      background: '#334155',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      color: '#94a3b8',
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatsTab() {
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<{ ok: boolean; stats: WorkflowStats }>(
          '/admin/workflows/stats'
        );
        setStats(data.stats ?? null);
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p style={{ color: '#94a3b8' }}>Loading stats...</p>;
  if (!stats) return <p style={{ color: '#94a3b8' }}>No stats available.</p>;

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <StatCard label="Total Definitions" value={stats.totalDefinitions} />
        <StatCard label="Active Definitions" value={stats.activeDefinitions} />
        <StatCard label="Total Instances" value={stats.totalInstances} />
      </div>

      <h3 style={{ color: '#e2e8f0', marginBottom: 12 }}>By Department</h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 12,
        }}
      >
        {Object.entries(stats.byDepartment).map(([dept, count]) => (
          <div
            key={dept}
            style={{
              background: '#1e293b',
              padding: 12,
              borderRadius: 6,
              border: '1px solid #334155',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14 }}>{dept}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>{count}</div>
          </div>
        ))}
      </div>

      <h3 style={{ color: '#e2e8f0', margin: '24px 0 12px' }}>By Status</h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 12,
        }}
      >
        {Object.entries(stats.byStatus).map(([status, count]) => (
          <div
            key={status}
            style={{
              background: '#1e293b',
              padding: 12,
              borderRadius: 6,
              border: '1px solid #334155',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14 }}>{status}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#8b5cf6' }}>{count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: '#1e293b',
        padding: 16,
        borderRadius: 8,
        border: '1px solid #334155',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#e2e8f0' }}>{value}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Switchboard Tab (Phase 533)                                        */
/* ------------------------------------------------------------------ */
interface SwitchboardWorkflow {
  name: string;
  description: string;
  domain: string;
  phase?: number;
  stateCount: number;
  transitionCount: number;
  initialState: string;
  terminalStates: string[];
}

interface SwitchboardDetail {
  name: string;
  description: string;
  domain: string;
  phase?: number;
  states: string[];
  transitions: Record<string, string[]>;
  mermaid: string;
}

function SwitchboardTab() {
  const [workflows, setWorkflows] = useState<SwitchboardWorkflow[]>([]);
  const [selected, setSelected] = useState<SwitchboardDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await apiFetch<{
          registeredWorkflows: number;
          workflows: SwitchboardWorkflow[];
        }>('/workflow/switchboard');
        setWorkflows(data.workflows ?? []);
      } catch {
        setWorkflows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectWorkflow = async (name: string) => {
    try {
      const detail = await apiFetch<SwitchboardDetail>(`/workflow/switchboard/${name}`);
      setSelected(detail);
    } catch {
      setSelected(null);
    }
  };

  if (loading) return <div style={{ color: '#94a3b8' }}>Loading switchboard...</div>;

  return (
    <div>
      <p style={{ color: '#94a3b8', marginBottom: 16 }}>
        Phase 533 -- Centralized view of all registered finite state machines across the system.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Left: workflow list */}
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
            Registered FSMs ({workflows.length})
          </h3>
          {workflows.map((w) => (
            <div
              key={w.name}
              onClick={() => selectWorkflow(w.name)}
              style={{
                padding: 12,
                marginBottom: 8,
                background: selected?.name === w.name ? '#1e3a5f' : '#1e293b',
                borderRadius: 8,
                border: selected?.name === w.name ? '1px solid #3b82f6' : '1px solid #334155',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 600 }}>{w.name}</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>{w.description}</div>
              <div
                style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12, color: '#64748b' }}
              >
                <span>Domain: {w.domain}</span>
                <span>States: {w.stateCount}</span>
                <span>Transitions: {w.transitionCount}</span>
                {w.phase && <span>Phase: {w.phase}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Right: detail + mermaid */}
        <div>
          {selected ? (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>{selected.name}</h3>
              <div
                style={{
                  background: '#0f172a',
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 12,
                  fontSize: 13,
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {selected.mermaid}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                <strong>States:</strong> {selected.states.join(', ')}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
                <strong>Transitions:</strong>
                <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                  {Object.entries(selected.transitions).map(([from, tos]) => (
                    <li key={from}>
                      {from} &rarr; {(tos as string[]).join(', ') || '(terminal)'}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div style={{ color: '#64748b', padding: 24 }}>
              Select a workflow to view its state diagram and transitions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */
const TABS = ['definitions', 'instances', 'packs', 'stats', 'switchboard'] as const;
type Tab = (typeof TABS)[number];

export default function WorkflowsAdminPage() {
  const [tab, setTab] = useState<Tab>('definitions');
  const [refreshToken, setRefreshToken] = useState(0);

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto', color: '#e2e8f0' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        Department Workflow Manager
      </h1>
      <p style={{ color: '#94a3b8', marginBottom: 24 }}>
        Phase 160 -- Configure and monitor clinical department workflows. 8 department packs with
        VistA alignment.
      </p>

      {/* Tab bar */}
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

      {/* Tab content */}
      {tab === 'definitions' && (
        <DefinitionsTab onStarted={() => {
          setRefreshToken((current) => current + 1);
          setTab('instances');
        }} />
      )}
      {tab === 'instances' && <InstancesTab refreshToken={refreshToken} />}
      {tab === 'packs' && <PacksTab />}
      {tab === 'stats' && <StatsTab />}
      {tab === 'switchboard' && <SwitchboardTab />}
    </div>
  );
}
