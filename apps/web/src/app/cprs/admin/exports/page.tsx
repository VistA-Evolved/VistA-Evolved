"use client";

import { useState, useEffect, useCallback } from "react";
import { getCsrfToken } from "@/lib/csrf";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface ExportSource {
  id: string;
  label: string;
  category: string;
  description: string;
  estimatedRows: number;
  containsPhi: boolean;
}

interface ExportJobMeta {
  id: string;
  sourceId: string;
  format: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  rowCount?: number;
  error?: string;
  progress: number;
}

interface ExportStats {
  totalJobs: number;
  completed: number;
  failed: number;
  active: number;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

async function apiFetch(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
  return res.json();
}

async function apiPost(path: string, body: unknown) {
  const csrf = await getCsrfToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (csrf) headers["X-CSRF-Token"] = csrf;
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(body),
  });
  return res.json();
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ExportsPage() {
  const [tab, setTab] = useState<"sources" | "jobs" | "stats">("sources");
  const [sources, setSources] = useState<ExportSource[]>([]);
  const [formats, setFormats] = useState<string[]>([]);
  const [jobs, setJobs] = useState<ExportJobMeta[]>([]);
  const [stats, setStats] = useState<ExportStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("csv");

  const loadSources = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/admin/exports/sources");
      if (data.ok) {
        setSources(data.sources || []);
        setFormats(data.supportedFormats || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/admin/exports/jobs?limit=50");
      if (data.ok) setJobs(data.jobs || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/admin/exports/stats");
      if (data.ok) setStats(data.stats);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "sources") loadSources();
    else if (tab === "jobs") loadJobs();
    else if (tab === "stats") loadStats();
  }, [tab, loadSources, loadJobs, loadStats]);

  const handleCreateExport = async () => {
    if (!selectedSource) return setError("Select a source");
    setError("");
    setLoading(true);
    try {
      const data = await apiPost("/admin/exports/jobs", {
        sourceId: selectedSource,
        format: selectedFormat,
      });
      if (data.ok) {
        setTab("jobs");
        loadJobs();
      } else {
        setError(data.error || "Export failed");
      }
    } catch {
      setError("Request failed");
    }
    setLoading(false);
  };

  const handleDownload = async (jobId: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/exports/jobs/${jobId}?download=true`, {
        credentials: "include",
      });
      if (!res.ok) { setError("Download failed"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export-${jobId}.dat`;
      const disposition = res.headers.get("Content-Disposition");
      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match) a.download = match[1];
      }
      a.click();
      URL.revokeObjectURL(url);
    } catch { setError("Download failed"); }
  };

  const TABS = [
    { id: "sources" as const, label: "Sources" },
    { id: "jobs" as const, label: "Jobs" },
    { id: "stats" as const, label: "Stats" },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
        Data Exports v2
      </h1>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid #e5e7eb" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "8px 16px",
              border: "none",
              background: "none",
              cursor: "pointer",
              borderBottom: tab === t.id ? "2px solid #2563eb" : "2px solid transparent",
              fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? "#2563eb" : "#6b7280",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", padding: 12, borderRadius: 6, marginBottom: 16, color: "#991b1b" }}>
          {error}
        </div>
      )}

      {loading && <p style={{ color: "#6b7280" }}>Loading...</p>}

      {/* ── Sources tab ────────────────────────────────────────── */}
      {tab === "sources" && !loading && (
        <div>
          <div style={{ marginBottom: 20, padding: 16, border: "1px solid #e5e7eb", borderRadius: 8 }}>
            <h3 style={{ fontWeight: 600, marginBottom: 12 }}>Create Export</h3>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <label>
                <span style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Source</span>
                <select
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value)}
                  style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, minWidth: 200 }}
                >
                  <option value="">-- select --</option>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} ({s.category})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Format</span>
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4 }}
                >
                  {formats.map((f) => (
                    <option key={f} value={f}>{f.toUpperCase()}</option>
                  ))}
                </select>
              </label>
              <button
                onClick={handleCreateExport}
                disabled={!selectedSource}
                style={{
                  padding: "8px 20px",
                  background: selectedSource ? "#2563eb" : "#d1d5db",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: selectedSource ? "pointer" : "not-allowed",
                  fontWeight: 500,
                }}
              >
                Export
              </button>
            </div>
          </div>

          <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Available Sources</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                <th style={{ padding: 8 }}>Source</th>
                <th style={{ padding: 8 }}>Category</th>
                <th style={{ padding: 8 }}>Description</th>
                <th style={{ padding: 8 }}>Est. Rows</th>
                <th style={{ padding: 8 }}>PHI</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: 8, fontFamily: "monospace", fontSize: 13 }}>{s.id}</td>
                  <td style={{ padding: 8 }}>
                    <span style={{
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      fontSize: 12,
                    }}>
                      {s.category}
                    </span>
                  </td>
                  <td style={{ padding: 8 }}>{s.description}</td>
                  <td style={{ padding: 8, textAlign: "right" }}>{s.estimatedRows.toLocaleString()}</td>
                  <td style={{ padding: 8 }}>{s.containsPhi ? "Yes" : "No"}</td>
                </tr>
              ))}
              {sources.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 16, textAlign: "center", color: "#9ca3af" }}>No sources registered</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Jobs tab ───────────────────────────────────────────── */}
      {tab === "jobs" && !loading && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ fontWeight: 600 }}>Export Jobs</h3>
            <button
              onClick={loadJobs}
              style={{ padding: "6px 14px", border: "1px solid #d1d5db", borderRadius: 4, cursor: "pointer", background: "#fff" }}
            >
              Refresh
            </button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                <th style={{ padding: 8 }}>ID</th>
                <th style={{ padding: 8 }}>Source</th>
                <th style={{ padding: 8 }}>Format</th>
                <th style={{ padding: 8 }}>Status</th>
                <th style={{ padding: 8 }}>Rows</th>
                <th style={{ padding: 8 }}>Created</th>
                <th style={{ padding: 8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: 8, fontFamily: "monospace", fontSize: 12 }}>{j.id}</td>
                  <td style={{ padding: 8 }}>{j.sourceId}</td>
                  <td style={{ padding: 8 }}>{j.format.toUpperCase()}</td>
                  <td style={{ padding: 8 }}>
                    <span style={{
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                      background: j.status === "completed" ? "#dcfce7" : j.status === "failed" ? "#fef2f2" : "#eff6ff",
                      color: j.status === "completed" ? "#166534" : j.status === "failed" ? "#991b1b" : "#1d4ed8",
                    }}>
                      {j.status}
                    </span>
                  </td>
                  <td style={{ padding: 8, textAlign: "right" }}>{j.rowCount?.toLocaleString() ?? "-"}</td>
                  <td style={{ padding: 8, fontSize: 12 }}>{new Date(j.createdAt).toLocaleString()}</td>
                  <td style={{ padding: 8 }}>
                    {j.status === "completed" && (
                      <button
                        onClick={() => handleDownload(j.id)}
                        style={{
                          padding: "4px 10px",
                          background: "#2563eb",
                          color: "#fff",
                          border: "none",
                          borderRadius: 4,
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                      >
                        Download
                      </button>
                    )}
                    {j.error && <span style={{ color: "#991b1b", fontSize: 12 }}>{j.error}</span>}
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 16, textAlign: "center", color: "#9ca3af" }}>No export jobs</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Stats tab ──────────────────────────────────────────── */}
      {tab === "stats" && !loading && stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {[
            { label: "Total Jobs", val: stats.totalJobs },
            { label: "Completed", val: stats.completed },
            { label: "Failed", val: stats.failed },
            { label: "Active", val: stats.active },
          ].map((c) => (
            <div key={c.label} style={{ padding: 20, border: "1px solid #e5e7eb", borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{c.val}</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{c.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
