'use client';

import { useState, useEffect, useCallback } from 'react';

const API = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://127.0.0.1:3001';

interface Problem {
  id: string;
  text: string;
  status: string;
  icdCode: string;
  onset: string;
}

export default function ProblemListPanel({ dfn = '46' }: { dfn?: string }) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rpc, setRpc] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/vista/problems?dfn=${dfn}`, { credentials: 'include' });
      const json = await res.json();
      if (json.ok) {
        setProblems(json.results || []);
        setRpc(json.rpcUsed || '');
      } else {
        setError(json.error || 'Failed to load problems');
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    }
    setLoading(false);
  }, [dfn]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = filter === 'all' ? problems
    : problems.filter(p => filter === 'active' ? p.status === 'active' : p.status !== 'active');

  if (loading) return <div className="animate-pulse p-6">Loading problem list from VistA...</div>;
  if (error) return <div className="text-red-500 p-6">Error: {error} <button onClick={loadData} className="ml-2 underline">Retry</button></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Problem List</h2>
          <p className="text-sm text-muted-foreground">DFN: {dfn} &middot; {problems.length} problem(s)</p>
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button
              key={f}
              className={`px-3 py-1 text-xs rounded-full ${filter === f ? 'bg-primary text-primary-foreground' : 'border hover:bg-muted'}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <button onClick={loadData} className="px-3 py-1 text-xs rounded border hover:bg-muted ml-2">Refresh</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
          No {filter !== 'all' ? filter : ''} problems found
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Problem</th>
                <th className="px-4 py-2.5 text-left font-medium w-24">Status</th>
                <th className="px-4 py-2.5 text-left font-medium w-28">ICD Code</th>
                <th className="px-4 py-2.5 text-left font-medium w-28">Onset</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-t hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium">{p.text}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      p.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{p.icdCode}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.onset}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-xs text-muted-foreground border-t pt-2 flex justify-between">
        <span>RPC: {rpc}</span>
        <span>Source: VistA VEHU</span>
      </div>
    </div>
  );
}
