'use client';

import { useState, useEffect, useCallback } from 'react';

const API = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://127.0.0.1:3001';

interface Allergy {
  id: string;
  allergen: string;
  severity: string;
  reactions: string;
}

export default function AdverseReactionTrackingPanel({ dfn = '46' }: { dfn?: string }) {
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rpc, setRpc] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/vista/allergies?dfn=${dfn}`, { credentials: 'include' });
      const json = await res.json();
      if (json.ok) {
        setAllergies(json.results || []);
        setRpc(json.rpcUsed || '');
      } else {
        setError(json.error || 'Failed to load allergies');
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    }
    setLoading(false);
  }, [dfn]);

  useEffect(() => { loadData(); }, [loadData]);

  const severityColor = (sev: string) => {
    if (!sev) return 'bg-gray-100 text-gray-600';
    const s = sev.toLowerCase();
    if (s.includes('severe') || s.includes('high')) return 'bg-red-100 text-red-800';
    if (s.includes('moderate')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  if (loading) return <div className="animate-pulse p-6">Loading allergies from VistA...</div>;
  if (error) return <div className="text-red-500 p-6">Error: {error} <button onClick={loadData} className="ml-2 underline">Retry</button></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Allergies / Adverse Reactions</h2>
          <p className="text-sm text-muted-foreground">DFN: {dfn} &middot; {allergies.length} record(s)</p>
        </div>
        <button onClick={loadData} className="px-3 py-1.5 text-xs rounded border hover:bg-muted">Refresh</button>
      </div>

      {allergies.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <div className="text-2xl mb-2">No Known Allergies</div>
          <p className="text-sm text-muted-foreground">No adverse reactions recorded for this patient</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {allergies.map(a => (
            <div key={a.id} className="border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-base">{a.allergen}</div>
                  {a.reactions && (
                    <div className="text-sm text-muted-foreground mt-1">
                      Reactions: <span className="text-foreground">{a.reactions}</span>
                    </div>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityColor(a.severity)}`}>
                  {a.severity || 'Unknown severity'}
                </span>
              </div>
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
