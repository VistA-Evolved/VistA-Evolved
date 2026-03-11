'use client';

import { useState, useEffect, useCallback } from 'react';

const API = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://127.0.0.1:3001';

export default function OutpatientPharmacyPanel({ dfn = '46' }: { dfn?: string }) {
  const [meds, setMeds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rpc, setRpc] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/vista/meds/coversheet?dfn=${dfn}`, { credentials: 'include' });
      const json = await res.json();
      if (json.ok) {
        setMeds(json.data || []);
        setRpc(Array.isArray(json.rpcUsed) ? json.rpcUsed.join(', ') : json.rpcUsed || '');
      } else {
        setError(json.error || 'Failed to load medications');
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    }
    setLoading(false);
  }, [dfn]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="animate-pulse p-6">Loading medications from VistA...</div>;
  if (error) return <div className="text-red-500 p-6">Error: {error} <button onClick={loadData} className="ml-2 underline">Retry</button></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Outpatient Pharmacy / Medications</h2>
          <p className="text-sm text-muted-foreground">DFN: {dfn} &middot; {meds.length} medication(s)</p>
        </div>
        <button onClick={loadData} className="px-3 py-1.5 text-xs rounded border hover:bg-muted">Refresh</button>
      </div>

      {meds.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
          No active medications found for this patient
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          {meds.map((med, i) => (
            <div key={i} className="px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors">
              <div className="text-sm">{med}</div>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-muted-foreground border-t pt-2 flex justify-between">
        <span>RPC: {rpc}</span>
        <span>Source: VistA VEHU</span>
      </div>
    </div>
  );
}
