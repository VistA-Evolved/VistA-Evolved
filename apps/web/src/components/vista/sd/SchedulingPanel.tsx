'use client';

import { useState, useEffect, useCallback } from 'react';

const API = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://127.0.0.1:3001';

interface SchedulingMode {
  mode: string;
  sdesInstalled: boolean;
  sdoeInstalled: boolean;
}

export default function SchedulingPanel({ dfn = '46' }: { dfn?: string }) {
  const [mode, setMode] = useState<SchedulingMode | null>(null);
  const [apptTypes, setApptTypes] = useState<Array<{ ien: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [modeRes, typesRes] = await Promise.all([
        fetch(`${API}/scheduling/mode`, { credentials: 'include' }).then(r => r.json()).catch(() => null),
        fetch(`${API}/scheduling/appointment-types`, { credentials: 'include' }).then(r => r.json()).catch(() => null),
      ]);
      if (modeRes?.ok) setMode(modeRes);
      if (typesRes?.ok) setApptTypes(typesRes.data || []);
    } catch (e: unknown) {
      setError((e as Error).message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="animate-pulse p-6">Loading scheduling data...</div>;
  if (error) return <div className="text-red-500 p-6">Error: {error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Scheduling</h2>
          <p className="text-sm text-muted-foreground">DFN: {dfn}</p>
        </div>
        <button onClick={loadData} className="px-3 py-1.5 text-xs rounded border hover:bg-muted">Refresh</button>
      </div>

      {mode && (
        <div className="border rounded-lg p-4 bg-card">
          <h3 className="font-semibold text-sm mb-2">Scheduling Mode</h3>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Mode: </span>
              <span className={`px-2 py-0.5 rounded text-xs ${
                mode.mode === 'sdes_partial' ? 'bg-yellow-100 text-yellow-800'
                  : mode.mode === 'vista_direct' ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>{mode.mode}</span>
            </div>
            <div>
              <span className="text-muted-foreground">SDES: </span>
              <span className={mode.sdesInstalled ? 'text-green-600' : 'text-red-500'}>
                {mode.sdesInstalled ? 'Installed' : 'Not installed'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">SDOE: </span>
              <span className={mode.sdoeInstalled ? 'text-green-600' : 'text-red-500'}>
                {mode.sdoeInstalled ? 'Installed' : 'Not installed'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="border rounded-lg p-4 bg-card">
        <h3 className="font-semibold text-sm mb-2">Appointment Types ({apptTypes.length})</h3>
        {apptTypes.length === 0 ? (
          <p className="text-muted-foreground text-sm">No appointment types available. Run ZVESDSEED.m to seed scheduling data.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {apptTypes.map(t => (
              <div key={t.ien} className="text-sm px-3 py-2 border rounded hover:bg-muted/50">
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground">IEN: {t.ien}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground border-t pt-2">
        Source: VistA VEHU &middot; SDES/SDOE scheduling RPCs
      </div>
    </div>
  );
}
