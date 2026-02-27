"use client";

import React, { useEffect, useState, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PostureGate {
  name: string;
  pass: boolean;
  detail: string;
}

interface CertificationPosture {
  score: number;
  gates: PostureGate[];
  summary: string;
  readinessLevel: "production" | "staging" | "development" | "incomplete";
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const jsonGet = (path: string) =>
  fetch(`${API}${path}`, { credentials: "include" }).then((r) => r.json());

function readinessBadge(level: CertificationPosture["readinessLevel"]): React.ReactNode {
  const colors: Record<string, string> = {
    production: "#22c55e",
    staging: "#3b82f6",
    development: "#eab308",
    incomplete: "#ef4444",
  };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 12px",
        borderRadius: 4,
        fontSize: 13,
        fontWeight: 600,
        color: "#fff",
        backgroundColor: colors[level] ?? "#6b7280",
      }}
    >
      {level.toUpperCase()}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function CertificationPage() {
  const [posture, setPosture] = useState<CertificationPosture | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await jsonGet("/posture/certification");
      setPosture(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load certification posture");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p style={{ padding: 24 }}>Loading certification posture...</p>;
  if (error) return <p style={{ padding: 24, color: "#ef4444" }}>Error: {error}</p>;
  if (!posture) return null;

  const passCount = posture.gates.filter((g) => g.pass).length;
  const failCount = posture.gates.length - passCount;

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ margin: "0 0 16px", fontSize: 24 }}>Certification Readiness</h1>

      {/* Summary card */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          padding: 20,
          border: "1px solid #333",
          borderRadius: 8,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: posture.score >= 70 ? "#22c55e" : posture.score >= 40 ? "#eab308" : "#ef4444",
            color: "#fff",
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          {posture.score}%
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 600 }}>Readiness Level:</span>
            {readinessBadge(posture.readinessLevel)}
          </div>
          <p style={{ margin: 0, color: "#9ca3af" }}>{posture.summary}</p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
            {passCount} pass / {failCount} fail of {posture.gates.length} gates
          </p>
        </div>
        <button
          onClick={load}
          style={{
            marginLeft: "auto",
            padding: "6px 16px",
            border: "none",
            borderRadius: 4,
            color: "#fff",
            backgroundColor: "#374151",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Refresh
        </button>
      </div>

      {/* Gates table */}
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
        <thead>
          <tr>
            <th style={cellStyle}>#</th>
            <th style={cellStyle}>Gate</th>
            <th style={cellStyle}>Status</th>
            <th style={cellStyle}>Detail</th>
          </tr>
        </thead>
        <tbody>
          {posture.gates.map((g, i) => (
            <tr key={g.name}>
              <td style={cellStyle}>{i + 1}</td>
              <td style={{ ...cellStyle, fontFamily: "monospace", fontSize: 13 }}>{g.name}</td>
              <td style={cellStyle}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 10px",
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#fff",
                    backgroundColor: g.pass ? "#22c55e" : "#ef4444",
                  }}
                >
                  {g.pass ? "PASS" : "FAIL"}
                </span>
              </td>
              <td style={{ ...cellStyle, color: "#9ca3af" }}>{g.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const cellStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderBottom: "1px solid #333",
  textAlign: "left",
};
