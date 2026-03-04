'use client';

import { useEffect, useState } from 'react';
import { fetchNotes } from '@/lib/api';
import type { Note } from '@/lib/chart-types';
import styles from './panels.module.css';

interface NotesPanelProps {
  dfn: string;
}

export default function NotesPanel({ dfn }: NotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchNotes(dfn)
      .then((n) => {
        if (!cancelled) {
          setNotes(n);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [dfn]);

  return (
    <div className={styles.listPanel}>
      <div className={styles.panelTitle}>Progress Notes</div>
      {loading && <p className={styles.loadingText}>Loading notes...</p>}
      {error && <p className={styles.errorText}>{error}</p>}
      {!loading && !error && notes.length === 0 && (
        <p className={styles.emptyText}>No notes on record</p>
      )}
      {!loading && !error && notes.length > 0 && (
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Date</th>
              <th>Author</th>
              <th>Location</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {notes.map((n) => (
              <tr key={n.id}>
                <td>{n.title}</td>
                <td>{n.date}</td>
                <td>{n.author}</td>
                <td>{n.location}</td>
                <td>
                  <span className={styles.listBadge}>{n.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
