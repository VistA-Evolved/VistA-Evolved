'use client';

import { useState, useEffect, useCallback } from 'react';

const API = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://127.0.0.1:3001';

interface Note {
  id: string;
  title: string;
  date: string;
  author: string;
  location: string;
  status: string;
}

export default function TextIntegrationUtilityPanel({ dfn = '46' }: { dfn?: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rpc, setRpc] = useState('');
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<string>('');
  const [textLoading, setTextLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/vista/notes?dfn=${dfn}`, { credentials: 'include' });
      const json = await res.json();
      if (json.ok) {
        setNotes(json.results || []);
        setRpc(json.rpcUsed || '');
      } else {
        setError(json.error || 'Failed to load notes');
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    }
    setLoading(false);
  }, [dfn]);

  const loadNoteText = useCallback(async (noteId: string) => {
    setSelectedNote(noteId);
    setTextLoading(true);
    try {
      const res = await fetch(`${API}/vista/cprs/notes/text?dfn=${dfn}&noteIen=${noteId}`, { credentials: 'include' });
      const json = await res.json();
      setNoteText(json.ok ? (json.text || json.data?.join('\n') || 'No text content') : 'Failed to load note text');
    } catch {
      setNoteText('Error loading note text');
    }
    setTextLoading(false);
  }, [dfn]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="animate-pulse p-6">Loading clinical notes from VistA...</div>;
  if (error) return <div className="text-red-500 p-6">Error: {error} <button onClick={loadData} className="ml-2 underline">Retry</button></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Clinical Notes (TIU)</h2>
          <p className="text-sm text-muted-foreground">DFN: {dfn} &middot; {notes.length} note(s)</p>
        </div>
        <button onClick={loadData} className="px-3 py-1.5 text-xs rounded border hover:bg-muted">Refresh</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-2 border rounded-lg max-h-[500px] overflow-y-auto">
          {notes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No notes found</div>
          ) : (
            notes.map(n => (
              <button
                key={n.id}
                onClick={() => loadNoteText(n.id)}
                className={`w-full text-left px-4 py-3 border-b transition-colors ${
                  selectedNote === n.id ? 'bg-primary/10' : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate">{n.title}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    n.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {n.status}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {n.date} &middot; {n.author}
                </div>
                {n.location && <div className="text-xs text-muted-foreground">{n.location}</div>}
              </button>
            ))
          )}
        </div>

        <div className="md:col-span-3 border rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-2">Note Text</h3>
          {!selectedNote ? (
            <p className="text-muted-foreground text-sm">Select a note to view its content</p>
          ) : textLoading ? (
            <div className="animate-pulse text-sm">Loading note text...</div>
          ) : (
            <pre className="text-sm whitespace-pre-wrap font-mono bg-muted p-3 rounded max-h-[400px] overflow-y-auto">
              {noteText}
            </pre>
          )}
        </div>
      </div>

      <div className="text-xs text-muted-foreground border-t pt-2 flex justify-between">
        <span>RPC: {rpc}</span>
        <span>Source: VistA VEHU</span>
      </div>
    </div>
  );
}
