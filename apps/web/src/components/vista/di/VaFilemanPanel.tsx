'use client';

import { useState, useCallback } from 'react';

const API = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://127.0.0.1:3001';

export default function VaFilemanPanel() {
  const [fileNumber, setFileNumber] = useState('');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ ok: boolean; data?: string[]; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const lookupFile = useCallback(async () => {
    if (!fileNumber.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/vista/fileman/file?number=${encodeURIComponent(fileNumber)}`, { credentials: 'include' });
      const json = await res.json();
      setResult(json);
    } catch (e: unknown) {
      setResult({ ok: false, error: (e as Error).message });
    }
    setLoading(false);
  }, [fileNumber]);

  const searchFiles = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/vista/fileman/search?q=${encodeURIComponent(query)}`, { credentials: 'include' });
      const json = await res.json();
      setResult(json);
    } catch (e: unknown) {
      setResult({ ok: false, error: (e as Error).message });
    }
    setLoading(false);
  }, [query]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">VA FileMan (DI)</h2>
        <p className="text-sm text-muted-foreground">VistA database management system -- file dictionary browser</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4 bg-card">
          <h3 className="font-semibold text-sm mb-2">Lookup by File Number</h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. 2 (Patient), 120.5 (Vitals)"
              value={fileNumber}
              onChange={e => setFileNumber(e.target.value)}
              className="flex-1 px-2 py-1.5 border rounded text-sm bg-background"
              onKeyDown={e => e.key === 'Enter' && lookupFile()}
            />
            <button onClick={lookupFile} className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90">
              Lookup
            </button>
          </div>
          <div className="mt-2 text-xs text-muted-foreground space-y-1">
            <div><span className="font-mono">2</span> -- Patient</div>
            <div><span className="font-mono">120.5</span> -- Vitals</div>
            <div><span className="font-mono">200</span> -- New Person</div>
            <div><span className="font-mono">8994</span> -- Remote Procedure</div>
            <div><span className="font-mono">19</span> -- Option</div>
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-card">
          <h3 className="font-semibold text-sm mb-2">Search Files</h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search file names..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 px-2 py-1.5 border rounded text-sm bg-background"
              onKeyDown={e => e.key === 'Enter' && searchFiles()}
            />
            <button onClick={searchFiles} className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90">
              Search
            </button>
          </div>
        </div>
      </div>

      {loading && <div className="animate-pulse text-sm p-4">Querying VistA FileMan...</div>}

      {result && !loading && (
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex gap-2 mb-2">
            <span className={`text-xs px-1.5 py-0.5 rounded ${result.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {result.ok ? 'OK' : 'ERROR'}
            </span>
          </div>
          {result.error && <p className="text-red-500 text-sm mb-2">{result.error}</p>}
          {result.data && result.data.length > 0 ? (
            <pre className="text-xs bg-muted p-3 rounded max-h-[400px] overflow-y-auto whitespace-pre-wrap font-mono">
              {result.data.join('\n')}
            </pre>
          ) : (
            <p className="text-muted-foreground text-sm">No data returned</p>
          )}
        </div>
      )}

      <div className="text-xs text-muted-foreground border-t pt-2">
        VA FileMan is the database engine underlying all VistA applications. Files are VistA's equivalent of database tables.
      </div>
    </div>
  );
}
