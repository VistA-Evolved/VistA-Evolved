'use client';

import { useState, useEffect, useCallback } from 'react';

const API = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://127.0.0.1:3001';

interface Patient {
  dfn: string;
  name: string;
}

export default function RegistrationPanel() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedDfn, setSelectedDfn] = useState<string | null>(null);
  const [demographics, setDemographics] = useState<Record<string, string> | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/vista/default-patient-list`, { credentials: 'include' });
      const json = await res.json();
      if (json.ok) setPatients(json.results || []);
      else setError(json.error || 'Failed');
    } catch (e: unknown) { setError((e as Error).message); }
    setLoading(false);
  }, []);

  const loadDemographics = useCallback(async (dfn: string) => {
    setSelectedDfn(dfn);
    setDemoLoading(true);
    try {
      const res = await fetch(`${API}/vista/demographics?dfn=${dfn}`, { credentials: 'include' });
      const json = await res.json();
      setDemographics(json.ok ? json.demographics || json.data || {} : null);
    } catch { setDemographics(null); }
    setDemoLoading(false);
  }, []);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  const filtered = patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="animate-pulse p-6">Loading patient list from VistA...</div>;
  if (error) return <div className="text-red-500 p-6">Error: {error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Patient Registration</h2>
          <p className="text-sm text-muted-foreground">{patients.length} patients in default list</p>
        </div>
        <button onClick={loadPatients} className="px-3 py-1.5 text-xs rounded border hover:bg-muted">Refresh</button>
      </div>

      <input
        type="text"
        placeholder="Search patients..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-3 py-2 border rounded text-sm bg-background"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg max-h-[500px] overflow-y-auto">
          {filtered.map(p => (
            <button
              key={p.dfn}
              onClick={() => loadDemographics(p.dfn)}
              className={`w-full text-left px-4 py-3 border-b text-sm transition-colors ${
                selectedDfn === p.dfn ? 'bg-primary/10' : 'hover:bg-muted/50'
              }`}
            >
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-muted-foreground">DFN: {p.dfn}</div>
            </button>
          ))}
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-3">Patient Demographics</h3>
          {!selectedDfn ? (
            <p className="text-muted-foreground text-sm">Select a patient to view demographics</p>
          ) : demoLoading ? (
            <div className="animate-pulse">Loading...</div>
          ) : demographics ? (
            <dl className="space-y-2 text-sm">
              {Object.entries(demographics).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-muted-foreground text-sm">Demographics not available</p>
          )}
        </div>
      </div>
    </div>
  );
}
