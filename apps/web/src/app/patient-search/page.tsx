"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import styles from "./page.module.css";

interface Patient {
  dfn: string;
  name: string;
}

interface SearchResult {
  ok: boolean;
  count: number;
  results: Patient[];
  rpcUsed: string;
  error?: string;
}

const API_BASE = "http://127.0.0.1:3001";
const DEBOUNCE_MS = 400;

export default function PatientSearchPage() {
  const [query, setQuery] = useState("SMI");
  const [debouncedQuery, setDebouncedQuery] = useState("SMI");
  const [results, setResults] = useState<Patient[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Patient | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce the query input
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  // Fetch results when debounced query changes
  const fetchPatients = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setCount(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE}/vista/patient-search?q=${encodeURIComponent(trimmed)}`
      );
      const data: SearchResult = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || `Server error (${res.status})`);
        setResults([]);
        setCount(null);
      } else {
        setResults(data.results);
        setCount(data.count);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reach API server"
      );
      setResults([]);
      setCount(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients(debouncedQuery);
  }, [debouncedQuery, fetchPatients]);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href="/" className={styles.backLink}>
          ← Home
        </Link>

        <h1 className={styles.title}>Patient Search</h1>
        <p className={styles.subtitle}>
          Search VistA patients by last name (via ORWPT LIST ALL)
        </p>

        <div className={styles.searchBox}>
          <label htmlFor="patient-query" className={styles.label}>
            Search patients
          </label>
          <input
            id="patient-query"
            className={styles.input}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a last name prefix…"
            autoFocus
          />
        </div>

        {selected && (
          <div className={styles.selected}>
            <span className={styles.selectedLabel}>Selected:</span>
            DFN {selected.dfn} — {selected.name}
          </div>
        )}

        {loading && <p className={styles.loading}>Searching…</p>}

        {error && <div className={styles.error}>{error}</div>}

        {!loading && !error && count !== null && (
          <>
            <p className={styles.resultCount}>
              {count} result{count !== 1 ? "s" : ""}
            </p>
            {count === 0 ? (
              <p className={styles.empty}>No patients found.</p>
            ) : (
              <ul className={styles.resultList}>
                {results.map((pt) => (
                  <li
                    key={pt.dfn}
                    className={styles.resultItem}
                    onClick={() => setSelected(pt)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setSelected(pt);
                    }}
                  >
                    <span className={styles.resultName}>{pt.name}</span>
                    <span className={styles.resultDfn}>DFN {pt.dfn}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
