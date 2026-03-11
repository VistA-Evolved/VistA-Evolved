'use client';

import { useState, useEffect, useCallback } from 'react';

const API = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://127.0.0.1:3001';

export default function LabServicePanel({ dfn = '46' }: { dfn?: string }) {
  const [labText, setLabText] = useState<string>('');
  const [labData, setLabData] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rpc, setRpc] = useState('');
  const [view, setView] = useState<'interim' | 'cumulative' | 'status'>('interim');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = view === 'status' ? `/vista/labs/status?dfn=${dfn}`
        : view === 'cumulative' ? `/vista/labs/cumulative?dfn=${dfn}`
        : `/vista/labs?dfn=${dfn}`;
      const res = await fetch(`${API}${endpoint}`, { credentials: 'include' });
      const json = await res.json();
      if (json.ok) {
        setLabText(json.rawText || '');
        setLabData(json.data || json.results || []);
        setRpc(Array.isArray(json.rpcUsed) ? json.rpcUsed.join(', ') : json.rpcUsed || '');
      } else {
        setError(json.error || 'Failed to load labs');
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    }
    setLoading(false);
  }, [dfn, view]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="animate-pulse p-6">Loading lab results from VistA...</div>;
  if (error) return <div className="text-red-500 p-6">Error: {error} <button onClick={loadData} className="ml-2 underline">Retry</button></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Laboratory Results</h2>
          <p className="text-sm text-muted-foreground">DFN: {dfn}</p>
        </div>
        <div className="flex gap-2">
          {(['interim', 'cumulative', 'status'] as const).map(v => (
            <button
              key={v}
              className={`px-3 py-1 text-xs rounded-full ${view === v ? 'bg-primary text-primary-foreground' : 'border hover:bg-muted'}`}
              onClick={() => setView(v)}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
          <button onClick={loadData} className="px-3 py-1 text-xs rounded border hover:bg-muted">Refresh</button>
        </div>
      </div>

      <div className="border rounded-lg p-4 bg-card">
        {labText ? (
          <pre className="text-sm font-mono whitespace-pre-wrap max-h-[500px] overflow-y-auto">{labText}</pre>
        ) : labData.length > 0 ? (
          <pre className="text-sm font-mono whitespace-pre-wrap max-h-[500px] overflow-y-auto">
            {labData.map(d => typeof d === 'string' ? d : JSON.stringify(d)).join('\n')}
          </pre>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            No lab results found for this patient
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground border-t pt-2 flex justify-between">
        <span>RPC: {rpc}</span>
        <span>Source: VistA VEHU</span>
      </div>
    </div>
  );
}
