'use client';

/**
 * Admin -- Onboarding Wizard
 *
 * Phase 243 (Wave 6 P6): Guided multi-step facility setup wizard.
 * Steps: Facility Setup -> VistA Connection -> Module Selection -> Users -> Complete
 */

import { useState, useEffect, useCallback } from 'react';
import styles from '@/components/cprs/cprs.module.css';
import { getCsrfToken } from '@/lib/csrf';
import { API_BASE } from '@/lib/api-config';

interface OnboardingStep {
  step: string;
  status: string;
  data?: Record<string, unknown>;
  completedAt?: string;
}

interface OnboardingSession {
  id: string;
  tenantId: string;
  currentStep: string;
  steps: OnboardingStep[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

async function apiFetch(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  return res.json();
}

async function apiPost(path: string, body?: unknown) {
  const csrf = await getCsrfToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

const STEP_LABELS: Record<string, string> = {
  tenant: 'Facility Setup',
  'vista-probe': 'VistA Connection',
  modules: 'Module Selection',
  users: 'User Provisioning',
  complete: 'Review & Complete',
};

const STEP_ICONS: Record<string, string> = {
  tenant: '1',
  'vista-probe': '2',
  modules: '3',
  users: '4',
  complete: '5',
};

export default function OnboardingPage() {
  const [sessions, setSessions] = useState<OnboardingSession[]>([]);
  const [active, setActive] = useState<OnboardingSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Facility form state
  const [facilityName, setFacilityName] = useState('');
  const [facilityStation, setFacilityStation] = useState('');
  const [vistaHost, setVistaHost] = useState('');
  const [vistaPort, setVistaPort] = useState('9430');

  // Probe result
  const [probeResult, setProbeResult] = useState<{
    ok: boolean;
    vista?: string;
    error?: string;
  } | null>(null);

  // Module selection
  const [availableModules, setAvailableModules] = useState<
    Array<{ moduleId: string; name: string; enabled: boolean }>
  >([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  const loadSessions = useCallback(async () => {
    try {
      const data = await apiFetch('/admin/onboarding');
      if (data.ok) setSessions(data.sessions);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const startNew = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiPost('/admin/onboarding', { tenantId: 'default' });
      if (data.ok) {
        setActive(data.session);
        loadSessions();
      } else {
        setError(data.error || 'Failed to start onboarding');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadSession = async (id: string) => {
    try {
      const data = await apiFetch(`/admin/onboarding/${id}`);
      if (data.ok) setActive(data.session);
    } catch {
      /* ignore */
    }
  };

  const advance = async (stepData?: Record<string, unknown>) => {
    if (!active) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiPost(`/admin/onboarding/${active.id}/advance`, { data: stepData });
      if (data.ok) {
        setActive(data.session);
        loadSessions();
      } else {
        setError(data.error || 'Failed to advance step');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const runProbe = async () => {
    if (!active) return;
    setLoading(true);
    try {
      const data = await apiPost(`/admin/onboarding/${active.id}/probe`);
      setProbeResult(data);
    } catch (err) {
      setProbeResult({ ok: false, error: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const loadModules = useCallback(async () => {
    try {
      const data = await apiFetch('/api/modules');
      if (data.ok && data.modules) {
        setAvailableModules(data.modules);
        setSelectedModules(data.modules.filter((m: any) => m.enabled).map((m: any) => m.moduleId));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const toggleModule = (moduleId: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId) ? prev.filter((m) => m !== moduleId) : [...prev, moduleId]
    );
  };

  // Render step content
  const renderStep = () => {
    if (!active) return null;
    const step = active.currentStep;

    switch (step) {
      case 'tenant':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ margin: 0 }}>Facility Setup</h3>
            <p style={{ color: '#666', margin: 0 }}>Configure the basic facility information.</p>
            <label>
              Facility Name
              <input
                type="text"
                value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)}
                style={{
                  width: '100%',
                  padding: 8,
                  marginTop: 4,
                  border: '1px solid #ccc',
                  borderRadius: 4,
                }}
              />
            </label>
            <label>
              Station Number
              <input
                type="text"
                value={facilityStation}
                onChange={(e) => setFacilityStation(e.target.value)}
                style={{
                  width: '100%',
                  padding: 8,
                  marginTop: 4,
                  border: '1px solid #ccc',
                  borderRadius: 4,
                }}
              />
            </label>
            <label>
              VistA Host
              <input
                type="text"
                value={vistaHost}
                onChange={(e) => setVistaHost(e.target.value)}
                placeholder="localhost"
                style={{
                  width: '100%',
                  padding: 8,
                  marginTop: 4,
                  border: '1px solid #ccc',
                  borderRadius: 4,
                }}
              />
            </label>
            <label>
              VistA Port
              <input
                type="text"
                value={vistaPort}
                onChange={(e) => setVistaPort(e.target.value)}
                placeholder="9430"
                style={{
                  width: '100%',
                  padding: 8,
                  marginTop: 4,
                  border: '1px solid #ccc',
                  borderRadius: 4,
                }}
              />
            </label>
            <button
              onClick={() =>
                advance({ facilityName, facilityStation, vistaHost, vistaPort: Number(vistaPort) })
              }
              disabled={loading || !facilityName}
              style={{
                padding: '10px 24px',
                background: '#0066cc',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              {loading ? 'Saving...' : 'Next: VistA Connection'}
            </button>
          </div>
        );

      case 'vista-probe':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ margin: 0 }}>VistA Connection Test</h3>
            <p style={{ color: '#666', margin: 0 }}>Verify that the VistA instance is reachable.</p>
            <button
              onClick={runProbe}
              disabled={loading}
              style={{
                padding: '10px 24px',
                background: '#0066cc',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                alignSelf: 'flex-start',
              }}
            >
              {loading ? 'Probing...' : 'Test Connection'}
            </button>
            {probeResult && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: probeResult.ok ? '#4caf50' : '#f44336',
                  background: probeResult.ok ? '#e8f5e9' : '#ffebee',
                }}
              >
                {probeResult.ok
                  ? `VistA is reachable (${probeResult.vista})`
                  : `Connection failed: ${probeResult.error || 'Unknown error'}`}
              </div>
            )}
            <button
              onClick={() => advance({ probeResult })}
              disabled={loading}
              style={{
                padding: '10px 24px',
                background: '#0066cc',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              {loading ? 'Saving...' : 'Next: Module Selection'}
            </button>
          </div>
        );

      case 'modules':
        // Load modules on first render of this step
        if (availableModules.length === 0) loadModules();
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ margin: 0 }}>Module Selection</h3>
            <p style={{ color: '#666', margin: 0 }}>
              Choose which modules to enable for this facility.
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 8,
              }}
            >
              {availableModules.map((mod) => (
                <label
                  key={mod.moduleId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: 8,
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    cursor: 'pointer',
                    background: selectedModules.includes(mod.moduleId) ? '#e3f2fd' : '#fff',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedModules.includes(mod.moduleId)}
                    onChange={() => toggleModule(mod.moduleId)}
                  />
                  {mod.name || mod.moduleId}
                </label>
              ))}
            </div>
            <button
              onClick={() => advance({ modules: selectedModules })}
              disabled={loading}
              style={{
                padding: '10px 24px',
                background: '#0066cc',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              {loading ? 'Saving...' : 'Next: User Provisioning'}
            </button>
          </div>
        );

      case 'users':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ margin: 0 }}>User Provisioning</h3>
            <p style={{ color: '#666', margin: 0 }}>
              Invite initial users. Requires OIDC/Keycloak integration for production use.
            </p>
            <div
              style={{
                padding: 12,
                background: '#fff3e0',
                borderRadius: 4,
                border: '1px solid #ff9800',
              }}
            >
              User provisioning is pending OIDC integration. You can skip this step and configure
              users later.
            </div>
            <button
              onClick={() => advance({ skipped: true })}
              disabled={loading}
              style={{
                padding: '10px 24px',
                background: '#0066cc',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              {loading ? 'Saving...' : 'Next: Review'}
            </button>
          </div>
        );

      case 'complete':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ margin: 0 }}>Review & Complete</h3>
            <p style={{ color: '#666', margin: 0 }}>
              Review your configuration and finalize the onboarding.
            </p>
            <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 4 }}>
              <h4 style={{ margin: '0 0 8px 0' }}>Configuration Summary</h4>
              {active.steps.map((s) => (
                <div
                  key={s.step}
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}
                >
                  <span>{STEP_LABELS[s.step] || s.step}</span>
                  <span
                    style={{
                      color:
                        s.status === 'completed'
                          ? '#4caf50'
                          : s.status === 'in-progress'
                            ? '#ff9800'
                            : '#999',
                      fontWeight: 600,
                    }}
                  >
                    {s.status === 'completed'
                      ? 'Done'
                      : s.status === 'in-progress'
                        ? 'Current'
                        : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => advance({ finalized: true })}
              disabled={loading}
              style={{
                padding: '10px 24px',
                background: '#4caf50',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {loading ? 'Finalizing...' : 'Complete Onboarding'}
            </button>
          </div>
        );

      default:
        return <p>Unknown step: {step}</p>;
    }
  };

  return (
    <div className={styles.cprsPage} style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>Facility Onboarding Wizard</h2>

      {error && (
        <div
          style={{
            padding: 12,
            background: '#ffebee',
            border: '1px solid #f44336',
            borderRadius: 4,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {!active ? (
        <div>
          <p>Start a new onboarding session to configure a facility, or resume an existing one.</p>
          <button
            onClick={startNew}
            disabled={loading}
            style={{
              padding: '10px 24px',
              background: '#0066cc',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              marginBottom: 24,
            }}
          >
            {loading ? 'Starting...' : 'Start New Onboarding'}
          </button>

          {sessions.length > 0 && (
            <div>
              <h3>Existing Sessions</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
                    <th style={{ padding: 8 }}>ID</th>
                    <th style={{ padding: 8 }}>Tenant</th>
                    <th style={{ padding: 8 }}>Current Step</th>
                    <th style={{ padding: 8 }}>Created</th>
                    <th style={{ padding: 8 }}>Status</th>
                    <th style={{ padding: 8 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>
                        {s.id.slice(0, 16)}
                      </td>
                      <td style={{ padding: 8 }}>{s.tenantId}</td>
                      <td style={{ padding: 8 }}>{STEP_LABELS[s.currentStep] || s.currentStep}</td>
                      <td style={{ padding: 8, fontSize: 12 }}>
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: 8 }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 600,
                            background: s.completedAt ? '#e8f5e9' : '#fff3e0',
                            color: s.completedAt ? '#2e7d32' : '#e65100',
                          }}
                        >
                          {s.completedAt ? 'Completed' : 'In Progress'}
                        </span>
                      </td>
                      <td style={{ padding: 8 }}>
                        {!s.completedAt && (
                          <button
                            onClick={() => loadSession(s.id)}
                            style={{
                              padding: '4px 12px',
                              background: '#0066cc',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: 12,
                            }}
                          >
                            Resume
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {sessions.length === 0 && !loading && (
            <p style={{ color: '#666', fontStyle: 'italic' }}>
              No onboarding sessions yet. Click above to start one.
            </p>
          )}
        </div>
      ) : (
        <div>
          {/* Step indicator */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
            {active.steps.map((s) => (
              <div
                key={s.step}
                style={{
                  flex: 1,
                  padding: 8,
                  textAlign: 'center',
                  borderRadius: 4,
                  background:
                    s.status === 'completed'
                      ? '#e8f5e9'
                      : s.status === 'in-progress'
                        ? '#e3f2fd'
                        : '#f5f5f5',
                  border: s.status === 'in-progress' ? '2px solid #0066cc' : '1px solid #ddd',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 12 }}>{STEP_ICONS[s.step]}</div>
                <div style={{ fontSize: 11, marginTop: 2 }}>{STEP_LABELS[s.step]}</div>
                {s.status === 'completed' && (
                  <div style={{ color: '#4caf50', fontSize: 11 }}>Done</div>
                )}
              </div>
            ))}
          </div>

          {active.completedAt ? (
            <div
              style={{ padding: 24, background: '#e8f5e9', borderRadius: 8, textAlign: 'center' }}
            >
              <h3 style={{ color: '#2e7d32', margin: 0 }}>Onboarding Complete</h3>
              <p style={{ color: '#666' }}>Facility has been configured successfully.</p>
              <button
                onClick={() => setActive(null)}
                style={{
                  padding: '10px 24px',
                  background: '#0066cc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                Back to Sessions
              </button>
            </div>
          ) : (
            renderStep()
          )}

          <div style={{ marginTop: 24 }}>
            <button
              onClick={() => setActive(null)}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid #ccc',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              Back to Sessions
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
