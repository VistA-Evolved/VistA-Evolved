'use client';

import { useState, useEffect, useCallback } from 'react';

const API = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://127.0.0.1:3001';

interface VistaHealth {
  ok: boolean;
  vista: string;
  port: number;
}

interface Patient {
  dfn: string;
  name: string;
}

export default function KernelPanel() {
  const [health, setHealth] = useState<VistaHealth | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [provisionStatus, setProvisionStatus] = useState<Record<string, unknown> | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pingRes, ptRes, provRes] = await Promise.all([
        fetch(`${API}/vista/ping`).then(r => r.json()).catch(() => null),
        fetch(`${API}/vista/default-patient-list`, { credentials: 'include' }).then(r => r.json()).catch(() => null),
        fetch(`${API}/vista/provision/status`, { credentials: 'include' }).then(r => r.json()).catch(() => null),
      ]);
      if (pingRes) setHealth(pingRes);
      if (ptRes?.ok) setPatients(ptRes.results || []);
      if (provRes?.ok) setProvisionStatus(provRes);
    } catch (e: unknown) {
      setError((e as Error).message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="animate-pulse p-6">Probing VistA Kernel...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Kernel (XU) System Status</h2>
          <p className="text-sm text-muted-foreground">VistA connectivity and system health</p>
        </div>
        <button onClick={loadData} className="px-3 py-1.5 text-xs rounded border hover:bg-muted">Refresh</button>
      </div>

      {error && <div className="text-red-500 text-sm">Error: {error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 bg-card">
          <h3 className="text-sm font-semibold mb-2">VistA Connection</h3>
          {health ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${health.ok ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm">{health.vista}</span>
              </div>
              <div className="text-xs text-muted-foreground">Port: {health.port}</div>
            </div>
          ) : (
            <div className="text-red-500 text-sm">Unreachable</div>
          )}
        </div>

        <div className="border rounded-lg p-4 bg-card">
          <h3 className="text-sm font-semibold mb-2">Patient Census</h3>
          <div className="text-3xl font-bold">{patients.length}</div>
          <div className="text-xs text-muted-foreground">patients in default list</div>
        </div>

        <div className="border rounded-lg p-4 bg-card">
          <h3 className="text-sm font-semibold mb-2">Provisioning</h3>
          {provisionStatus ? (
            <div className="space-y-1 text-xs">
              <div className={`font-medium ${
                (provisionStatus as { health?: string }).health === 'fully-provisioned'
                  ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {(provisionStatus as { health?: string }).health || 'Unknown'}
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-xs">Login required to check</div>
          )}
        </div>
      </div>

      <div className="border rounded-lg p-4 bg-card">
        <h3 className="text-sm font-semibold mb-2">Patient List (first 20)</h3>
        {patients.length === 0 ? (
          <p className="text-muted-foreground text-sm">No patients loaded. Ensure VistA is connected and you are logged in.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {patients.slice(0, 20).map(p => (
              <div key={p.dfn} className="text-sm px-3 py-2 border rounded hover:bg-muted/50">
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground">DFN: {p.dfn}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
