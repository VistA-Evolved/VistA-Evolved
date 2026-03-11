'use client';

import { useState, useEffect, useCallback } from 'react';

const API = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://127.0.0.1:3001';

interface Vital {
  type: string;
  value: string;
  takenAt: string;
}

const VITAL_LABELS: Record<string, { label: string; unit: string; icon: string }> = {
  T: { label: 'Temperature', unit: '°F', icon: '🌡' },
  P: { label: 'Pulse', unit: 'bpm', icon: '💓' },
  R: { label: 'Respiration', unit: '/min', icon: '🫁' },
  BP: { label: 'Blood Pressure', unit: 'mmHg', icon: '🩸' },
  PN: { label: 'Pain', unit: '/10', icon: '⚡' },
  WT: { label: 'Weight', unit: 'lbs', icon: '⚖' },
  HT: { label: 'Height', unit: 'in', icon: '📏' },
  PO2: { label: 'Pulse Ox', unit: '%', icon: '🫀' },
};

export default function VitalsPanel({ dfn = '46' }: { dfn?: string }) {
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rpc, setRpc] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/vista/vitals?dfn=${dfn}`, { credentials: 'include' });
      const json = await res.json();
      if (json.ok) {
        setVitals(json.results || []);
        setRpc(json.rpcUsed || '');
      } else {
        setError(json.error || 'Failed to load vitals');
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    }
    setLoading(false);
  }, [dfn]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="animate-pulse p-6">Loading vitals from VistA...</div>;
  if (error) return <div className="text-red-500 p-6">Error: {error} <button onClick={loadData} className="ml-2 underline">Retry</button></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Vitals</h2>
          <p className="text-sm text-muted-foreground">DFN: {dfn} &middot; {vitals.length} measurement(s)</p>
        </div>
        <button onClick={loadData} className="px-3 py-1.5 text-xs rounded border hover:bg-muted">Refresh</button>
      </div>

      {vitals.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
          No vitals recorded for this patient
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {vitals.map((v, i) => {
            const meta = VITAL_LABELS[v.type] || { label: v.type, unit: '', icon: '📊' };
            return (
              <div key={i} className="border rounded-lg p-4 bg-card text-center">
                <div className="text-2xl mb-1">{meta.icon}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">{meta.label}</div>
                <div className="text-2xl font-bold mt-1">
                  {v.value} <span className="text-sm font-normal text-muted-foreground">{meta.unit}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-2">{v.takenAt}</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-xs text-muted-foreground border-t pt-2 flex justify-between">
        <span>RPC: {rpc}</span>
        <span>Source: VistA VEHU</span>
      </div>
    </div>
  );
}
