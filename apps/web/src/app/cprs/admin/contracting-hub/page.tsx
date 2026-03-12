'use client';

import { useEffect, useState, useCallback } from 'react';
import { getCsrfTokenSync } from '@/lib/csrf';
import { API_BASE } from '@/lib/api-config';

/* -- Helpers -------------------------------------------------- */

function getCsrfToken(): string {
  return getCsrfTokenSync();
}

/* -- Types ---------------------------------------------------- */

interface Task {
  id: string;
  payerId: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ContractingSummary {
  payerId: string;
  payerName: string;
  payerType: string;
  tasks: Task[];
  progress: {
    total: number;
    open: number;
    inProgress: number;
    blocked: number;
    done: number;
    pct: number;
  };
}

interface Dashboard {
  totalPayers: number;
  totalTasks: number;
  byStatus: Record<string, number>;
  payers: ContractingSummary[];
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...init,
  });

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || payload?.message || `Request failed: ${response.status}`);
  }

  return payload as T;
}

/* -- Badge ---------------------------------------------------- */

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: '#3b82f6',
    in_progress: '#d97706',
    blocked: '#ef4444',
    done: '#059669',
  };
  return (
    <span
      style={{
        display: 'inline-block',
        background: colors[status] ?? '#475569',
        color: '#fff',
        borderRadius: 4,
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

/* -- Main Page ------------------------------------------------ */

export default function ContractingHubPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayer, setSelectedPayer] = useState<string | null>(null);
  const [initResult, setInitResult] = useState<string | null>(null);

  const loadDashboard = useCallback(() => {
    setLoading(true);
    setError(null);
    apiFetch<{ dashboard: Dashboard }>('/rcm/hmo/contracting')
      .then((resp) => {
        setDashboard(resp.dashboard);
        setLoading(false);
      })
      .catch((e) => {
        setDashboard(null);
        setError(e.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleInit = async (payerId: string) => {
    setInitResult(null);
    try {
      const data = await apiFetch<{ created: number; skipped: number }>(
        `/rcm/hmo/contracting/${payerId}/init`,
        {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify({ actor: 'admin' }),
        }
      );
      setInitResult(`Created ${data.created} tasks, skipped ${data.skipped}`);
      loadDashboard();
    } catch (e: any) {
      setInitResult(`Error: ${e.message}`);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await apiFetch<{ task: Task }>(`/rcm/hmo/contracting/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify({
          status: newStatus,
          reason: `Status changed to ${newStatus}`,
          actor: 'admin',
        }),
      });
      loadDashboard();
    } catch {
      setError('Failed to update task status');
    }
  };

  if (loading)
    return <div style={{ padding: 32, color: '#94a3b8' }}>Loading contracting data...</div>;
  if (error) return <div style={{ padding: 32, color: '#ef4444' }}>Error: {error}</div>;

  const selectedPayerData = dashboard?.payers.find((p) => p.payerId === selectedPayer);

  return (
    <div style={{ padding: '24px 32px', color: '#e2e8f0', maxWidth: 1200 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Contracting Hub</h1>
      <p style={{ color: '#94a3b8', marginBottom: 24, fontSize: 13 }}>
        Manage payer onboarding and contracting tasks for all PH HMOs.
      </p>

      {initResult && (
        <div
          style={{
            background: '#1e3a5f',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 16,
            fontSize: 13,
            color: '#93c5fd',
          }}
        >
          {initResult}
        </div>
      )}

      {/* Summary */}
      {dashboard && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ background: '#1e293b', borderRadius: 8, padding: '12px 20px' }}>
            <div style={{ color: '#94a3b8', fontSize: 11 }}>Payers</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{dashboard.totalPayers}</div>
          </div>
          <div style={{ background: '#1e293b', borderRadius: 8, padding: '12px 20px' }}>
            <div style={{ color: '#94a3b8', fontSize: 11 }}>Total Tasks</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{dashboard.totalTasks}</div>
          </div>
          {Object.entries(dashboard.byStatus).map(([status, count]) => (
            <div
              key={status}
              style={{ background: '#1e293b', borderRadius: 8, padding: '12px 20px' }}
            >
              <div style={{ color: '#94a3b8', fontSize: 11, textTransform: 'capitalize' }}>
                {status.replace('_', ' ')}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{count}</div>
            </div>
          ))}
        </div>
      )}

      {/* Payer list + task detail */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>
        {/* Left: payer list */}
        <div
          style={{
            background: '#1e293b',
            borderRadius: 8,
            padding: 16,
            maxHeight: 600,
            overflowY: 'auto',
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Payers</h3>
          {dashboard?.payers.map((p) => (
            <div
              key={p.payerId}
              onClick={() => setSelectedPayer(p.payerId)}
              style={{
                padding: '10px 12px',
                borderRadius: 6,
                marginBottom: 4,
                cursor: 'pointer',
                background: selectedPayer === p.payerId ? '#334155' : 'transparent',
                borderLeft:
                  selectedPayer === p.payerId ? '3px solid #3b82f6' : '3px solid transparent',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>{p.payerId}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                {p.progress.total > 0
                  ? `${p.progress.done}/${p.progress.total} tasks done (${p.progress.pct}%)`
                  : 'No tasks -- click to init'}
              </div>
            </div>
          ))}
        </div>

        {/* Right: task detail */}
        <div style={{ background: '#1e293b', borderRadius: 8, padding: 20 }}>
          {selectedPayerData ? (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>{selectedPayerData.payerId}</h3>
                <button
                  onClick={() => handleInit(selectedPayerData.payerId)}
                  style={{
                    padding: '6px 14px',
                    background: '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Init Tasks
                </button>
              </div>

              {selectedPayerData.tasks.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: 13 }}>
                  No tasks yet. Click &quot;Init Tasks&quot; to create standard onboarding tasks.
                </p>
              ) : (
                <div>
                  {selectedPayerData.tasks.map((task) => (
                    <div
                      key={task.id}
                      style={{ borderBottom: '1px solid #334155', padding: '12px 0' }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{task.title}</div>
                          {task.description && (
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                              {task.description}
                            </div>
                          )}
                        </div>
                        <StatusBadge status={task.status} />
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        {['open', 'in_progress', 'blocked', 'done']
                          .filter((s) => s !== task.status)
                          .map((s) => (
                            <button
                              key={s}
                              onClick={() => handleStatusChange(task.id, s)}
                              style={{
                                padding: '3px 10px',
                                background: '#475569',
                                color: '#e2e8f0',
                                border: 'none',
                                borderRadius: 4,
                                fontSize: 10,
                                cursor: 'pointer',
                              }}
                            >
                              {s.replace('_', ' ')}
                            </button>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p style={{ color: '#64748b', fontSize: 13 }}>
              Select a payer from the list to view contracting tasks.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
