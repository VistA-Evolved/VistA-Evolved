'use client';

import { useCallback, useEffect, useState } from 'react';
import { API_BASE as API } from '@/lib/api-config';

/**
 * Phase 159: Patient Queue Management -- Front Desk Dashboard
 * Manage tickets, call patients, view department queues, display board.
 */

interface QueueTicketRow {
  id: string;
  department: string;
  ticketNumber: string;
  patientName: string;
  priority: string;
  status: string;
  windowNumber?: string;
  createdAt: string;
  calledAt?: string;
}

interface DepartmentConfig {
  department: string;
  displayName: string;
  prefix: string;
  windows: string[];
  enabled: boolean;
}

interface QueueStatsData {
  department: string;
  totalToday: number;
  waiting: number;
  serving: number;
  completed: number;
  noShow: number;
  averageWaitMinutes: number;
  averageServiceMinutes: number;
  byPriority: Record<string, number>;
}

interface DisplayBoard {
  department: string;
  displayName: string;
  currentlyServing: Array<{ ticketNumber: string; windowNumber: string }>;
  nowCalling: Array<{ ticketNumber: string; windowNumber: string }>;
  waitingCount: number;
  estimatedWaitMinutes: number;
}

type Tab = 'queue' | 'display' | 'departments' | 'stats';

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
  });
  return res.json();
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#d32f2f',
  high: '#f57c00',
  normal: '#1976d2',
  low: '#757575',
};

const STATUS_COLORS: Record<string, string> = {
  waiting: '#fff3e0',
  called: '#e3f2fd',
  serving: '#e8f5e9',
  completed: '#f5f5f5',
  'no-show': '#fce4ec',
  transferred: '#ede7f6',
};

export default function QueueAdminPage() {
  const [tab, setTab] = useState<Tab>('queue');
  const [selectedDept, setSelectedDept] = useState('primary-care');
  const [tickets, setTickets] = useState<QueueTicketRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentConfig[]>([]);
  const [stats, setStats] = useState<QueueStatsData | null>(null);
  const [board, setBoard] = useState<DisplayBoard | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newPatientDfn, setNewPatientDfn] = useState('');
  const [newPatientName, setNewPatientName] = useState('');
  const [newPriority, setNewPriority] = useState('normal');

  const loadDepartments = useCallback(async () => {
    const data = await apiFetch('/queue/departments');
    if (data.ok) setDepartments(data.departments || []);
  }, []);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    const data = await apiFetch(`/queue/tickets?dept=${selectedDept}`);
    if (data.ok) setTickets(data.tickets || []);
    setLoading(false);
  }, [selectedDept]);

  const loadStats = useCallback(async () => {
    const data = await apiFetch(`/queue/stats/${selectedDept}`);
    if (data.ok) setStats(data.stats);
  }, [selectedDept]);

  const loadBoard = useCallback(async () => {
    const data = await apiFetch(`/queue/display/${selectedDept}`);
    if (data.ok) setBoard(data.board);
  }, [selectedDept]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    if (tab === 'queue') loadTickets();
    if (tab === 'stats') loadStats();
    if (tab === 'display') loadBoard();
  }, [tab, selectedDept, loadTickets, loadStats, loadBoard]);

  // Auto-refresh queue every 10 seconds
  useEffect(() => {
    if (tab !== 'queue' && tab !== 'display') return;
    const interval = setInterval(() => {
      if (tab === 'queue') loadTickets();
      if (tab === 'display') loadBoard();
    }, 10000);
    return () => clearInterval(interval);
  }, [tab, loadTickets, loadBoard]);

  const handleCallNext = async () => {
    const dept = departments.find((d) => d.department === selectedDept);
    const windowNumber = dept?.windows[0] || 'Window-1';
    await apiFetch('/queue/call-next', {
      method: 'POST',
      body: JSON.stringify({ department: selectedDept, windowNumber }),
    });
    loadTickets();
  };

  const handleAction = async (ticketId: string, action: string) => {
    await apiFetch(`/queue/tickets/${ticketId}/${action}`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    loadTickets();
  };

  const handleSeedDepts = async () => {
    await apiFetch('/queue/departments/seed', { method: 'POST' });
    loadDepartments();
  };

  const handleCreateTicket = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const data = await apiFetch('/queue/tickets', {
        method: 'POST',
        body: JSON.stringify({
          department: selectedDept,
          patientDfn: newPatientDfn.trim(),
          patientName: newPatientName.trim(),
          priority: newPriority,
        }),
      });
      if (!data.ok) {
        setCreateError(data.error || 'Ticket creation failed');
        return;
      }
      setNewPatientDfn('');
      setNewPatientName('');
      setNewPriority('normal');
      await loadTickets();
      await loadStats();
      await loadBoard();
    } catch (err: any) {
      setCreateError(err.message || 'Ticket creation failed');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 1200 }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Patient Queue Management</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        Phase 159: Ticket numbering, priority triage, calling display, and department routing.
      </p>

      {/* Department Selector */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <label style={{ fontWeight: 600 }}>Department:</label>
        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          style={{ padding: 6, border: '1px solid #ccc', borderRadius: 4, minWidth: 200 }}
        >
          {departments.length === 0 && <option value="">-- Seed departments first --</option>}
          {departments.map((d) => (
            <option key={d.department} value={d.department}>
              {d.displayName}
            </option>
          ))}
        </select>
        {departments.length === 0 && (
          <button
            onClick={handleSeedDepts}
            style={{
              padding: '6px 16px',
              background: '#0066cc',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
            }}
          >
            Seed Departments
          </button>
        )}
      </div>

      {/* Tab Bar */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 16,
          borderBottom: '1px solid #ddd',
          paddingBottom: 8,
        }}
      >
        {(['queue', 'display', 'departments', 'stats'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t satisfies Tab)}
            style={{
              padding: '6px 16px',
              border: tab === t ? '1px solid #0066cc' : '1px solid #ccc',
              background: tab === t ? '#0066cc' : '#fff',
              color: tab === t ? '#fff' : '#333',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: tab === t ? 600 : 400,
            }}
          >
            {t === 'queue'
              ? 'Active Queue'
              : t === 'display'
                ? 'Display Board'
                : t === 'departments'
                  ? 'Departments'
                  : 'Statistics'}
          </button>
        ))}
      </div>

      {/* Active Queue Tab */}
      {tab === 'queue' && (
        <div>
          <div
            style={{
              border: '1px solid #d7e3f4',
              background: '#f7fbff',
              padding: 16,
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Create Queue Ticket</div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1.8fr 1fr auto',
                gap: 12,
                alignItems: 'end',
              }}
            >
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#555' }}>Patient DFN</span>
                <input
                  value={newPatientDfn}
                  onChange={(e) => setNewPatientDfn(e.target.value)}
                  placeholder="46"
                  style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#555' }}>Patient Name</span>
                <input
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  placeholder="PROGRAMMER,ONE"
                  style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#555' }}>Priority</span>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </label>
              <button
                onClick={handleCreateTicket}
                disabled={creating || !selectedDept || !newPatientDfn.trim() || !newPatientName.trim()}
                style={{
                  padding: '10px 18px',
                  background: creating ? '#90a4ae' : '#1565c0',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor:
                    creating || !selectedDept || !newPatientDfn.trim() || !newPatientName.trim()
                      ? 'not-allowed'
                      : 'pointer',
                  fontWeight: 600,
                }}
              >
                {creating ? 'Creating...' : 'Create Ticket'}
              </button>
            </div>
            {createError && (
              <div style={{ marginTop: 10, color: '#b71c1c', fontSize: 13 }}>{createError}</div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button
              onClick={handleCallNext}
              style={{
                padding: '8px 20px',
                background: '#2e7d32',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Call Next Patient
            </button>
            <button onClick={loadTickets} style={{ padding: '6px 12px' }}>
              Refresh
            </button>
          </div>
          {loading ? (
            <p>Loading...</p>
          ) : tickets.length === 0 ? (
            <p style={{ color: '#999' }}>No active tickets in this department.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>
                    Ticket
                  </th>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>
                    Patient
                  </th>
                  <th style={{ textAlign: 'center', padding: 8, borderBottom: '1px solid #ddd' }}>
                    Priority
                  </th>
                  <th style={{ textAlign: 'center', padding: 8, borderBottom: '1px solid #ddd' }}>
                    Status
                  </th>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>
                    Window
                  </th>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>
                    Created
                  </th>
                  <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ddd' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    style={{
                      borderBottom: '1px solid #eee',
                      background: STATUS_COLORS[t.status] || '#fff',
                    }}
                  >
                    <td style={{ padding: 8, fontWeight: 700, fontFamily: 'monospace' }}>
                      {t.ticketNumber}
                    </td>
                    <td style={{ padding: 8 }}>{t.patientName}</td>
                    <td style={{ textAlign: 'center', padding: 8 }}>
                      <span
                        style={{
                          color: PRIORITY_COLORS[t.priority] || '#333',
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                      >
                        {t.priority.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', padding: 8 }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td style={{ padding: 8 }}>{t.windowNumber || '-'}</td>
                    <td style={{ padding: 8, fontSize: 12, color: '#666' }}>
                      {new Date(t.createdAt).toLocaleTimeString()}
                    </td>
                    <td style={{ textAlign: 'right', padding: 8 }}>
                      {t.status === 'called' && (
                        <button
                          onClick={() => handleAction(t.id, 'serve')}
                          style={{ marginRight: 4, fontSize: 12 }}
                        >
                          Serve
                        </button>
                      )}
                      {(t.status === 'serving' || t.status === 'called') && (
                        <button
                          onClick={() => handleAction(t.id, 'complete')}
                          style={{ marginRight: 4, fontSize: 12, color: '#2e7d32' }}
                        >
                          Complete
                        </button>
                      )}
                      {(t.status === 'waiting' || t.status === 'called') && (
                        <button
                          onClick={() => handleAction(t.id, 'no-show')}
                          style={{ fontSize: 12, color: '#c62828' }}
                        >
                          No-Show
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Display Board Tab */}
      {tab === 'display' && board && (
        <div
          style={{
            background: '#1a237e',
            color: '#fff',
            padding: 32,
            borderRadius: 12,
            minHeight: 300,
          }}
        >
          <h2 style={{ textAlign: 'center', fontSize: 24, marginBottom: 24 }}>
            {board.displayName}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <h3 style={{ color: '#ffeb3b', fontSize: 18, marginBottom: 12 }}>NOW SERVING</h3>
              {board.currentlyServing.length === 0 ? (
                <p style={{ color: '#90caf9' }}>---</p>
              ) : (
                board.currentlyServing.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 36,
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      marginBottom: 8,
                    }}
                  >
                    {s.ticketNumber}{' -> '}{s.windowNumber}
                  </div>
                ))
              )}
            </div>
            <div>
              <h3 style={{ color: '#76ff03', fontSize: 18, marginBottom: 12 }}>NOW CALLING</h3>
              {board.nowCalling.length === 0 ? (
                <p style={{ color: '#90caf9' }}>---</p>
              ) : (
                board.nowCalling.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 36,
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      marginBottom: 8,
                      animation: 'blink 1s infinite',
                    }}
                  >
                    {c.ticketNumber}{' -> '}{c.windowNumber}
                  </div>
                ))
              )}
            </div>
          </div>
          <div
            style={{
              textAlign: 'center',
              marginTop: 32,
              borderTop: '1px solid #3949ab',
              paddingTop: 16,
            }}
          >
            <span style={{ fontSize: 18, color: '#90caf9' }}>
              Waiting: {board.waitingCount} | Est. Wait: {board.estimatedWaitMinutes} min
            </span>
          </div>
        </div>
      )}

      {/* Departments Tab */}
      {tab === 'departments' && (
        <div>
          <h3>Department Configurations</h3>
          {departments.length === 0 ? (
            <p style={{ color: '#999' }}>No departments configured. Click Seed to initialize.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>
                    Department
                  </th>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}>
                    Display Name
                  </th>
                  <th style={{ textAlign: 'center', padding: 8, borderBottom: '1px solid #ddd' }}>
                    Prefix
                  </th>
                  <th style={{ textAlign: 'center', padding: 8, borderBottom: '1px solid #ddd' }}>
                    Windows
                  </th>
                  <th style={{ textAlign: 'center', padding: 8, borderBottom: '1px solid #ddd' }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {departments.map((d) => (
                  <tr key={d.department} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 8 }}>{d.department}</td>
                    <td style={{ padding: 8 }}>{d.displayName}</td>
                    <td
                      style={{
                        textAlign: 'center',
                        padding: 8,
                        fontFamily: 'monospace',
                        fontWeight: 700,
                      }}
                    >
                      {d.prefix}
                    </td>
                    <td style={{ textAlign: 'center', padding: 8 }}>{d.windows.join(', ')}</td>
                    <td style={{ textAlign: 'center', padding: 8 }}>
                      <span
                        style={{
                          background: d.enabled ? '#e8f5e9' : '#fce4ec',
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                      >
                        {d.enabled ? 'active' : 'disabled'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Stats Tab */}
      {tab === 'stats' && stats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.totalToday}</div>
            <div style={{ color: '#666' }}>Total Today</div>
          </div>
          <div style={{ background: '#fff3e0', padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.waiting}</div>
            <div style={{ color: '#666' }}>Waiting</div>
          </div>
          <div style={{ background: '#e8f5e9', padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.serving}</div>
            <div style={{ color: '#666' }}>Serving</div>
          </div>
          <div style={{ background: '#e3f2fd', padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.completed}</div>
            <div style={{ color: '#666' }}>Completed</div>
          </div>
          <div style={{ background: '#fce4ec', padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.noShow}</div>
            <div style={{ color: '#666' }}>No-Show</div>
          </div>
          <div style={{ background: '#f3e5f5', padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.averageWaitMinutes}m</div>
            <div style={{ color: '#666' }}>Avg Wait</div>
          </div>
        </div>
      )}
    </div>
  );
}
