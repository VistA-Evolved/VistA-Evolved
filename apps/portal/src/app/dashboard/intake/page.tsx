"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function portalFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  return res.json();
}

/* ================================================================== */
/* Intake Start Page — begin or resume an intake questionnaire          */
/* ================================================================== */

export default function IntakeStartPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    setLoading(true);
    try {
      const res = await portalFetch("/intake/sessions");
      if (res.ok && res.sessions) {
        setSessions(res.sessions.filter((s: any) => s.status !== "filed" && s.status !== "filed_pending_integration"));
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }

  async function startNewIntake() {
    setCreating(true);
    setNotice(null);
    try {
      const res = await portalFetch("/intake/sessions", {
        method: "POST",
        body: JSON.stringify({ language, context: {} }),
      });
      if (res.ok && res.session) {
        router.push(`/dashboard/intake/${res.session.id}`);
      } else {
        setNotice({ type: "error", text: res.error || "Failed to start intake" });
      }
    } catch {
      setNotice({ type: "error", text: "Connection error" });
    }
    setCreating(false);
  }

  const cardStyle: React.CSSProperties = {
    background: "var(--portal-bg-card, #fff)",
    border: "1px solid var(--portal-border, #e5e7eb)",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "16px",
  };

  const btnPrimary: React.CSSProperties = {
    background: "var(--portal-primary, #2563eb)",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "12px 24px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: 600,
  };

  const btnSecondary: React.CSSProperties = {
    background: "transparent",
    color: "var(--portal-primary, #2563eb)",
    border: "1px solid var(--portal-primary, #2563eb)",
    borderRadius: "6px",
    padding: "10px 20px",
    cursor: "pointer",
    fontSize: "14px",
  };

  const statusColors: Record<string, string> = {
    not_started: "#9ca3af",
    in_progress: "#f59e0b",
    submitted: "#10b981",
    clinician_reviewed: "#6366f1",
  };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>
        Pre-Visit Intake
      </h1>
      <p style={{ color: "var(--portal-text-muted, #6b7280)", marginBottom: "24px" }}>
        Complete your health questionnaire before your appointment to save time during your visit.
      </p>

      {notice && (
        <div style={{
          padding: "12px 16px", borderRadius: "6px", marginBottom: "16px",
          background: notice.type === "error" ? "#fef2f2" : "#f0fdf4",
          color: notice.type === "error" ? "#991b1b" : "#166534",
          border: `1px solid ${notice.type === "error" ? "#fecaca" : "#bbf7d0"}`,
        }}>
          {notice.text}
        </div>
      )}

      {/* Start new intake */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px" }}>
          Start New Intake
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <label htmlFor="lang" style={{ fontSize: "14px", color: "var(--portal-text-muted, #6b7280)" }}>
            Language:
          </label>
          <select
            id="lang"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: "4px", border: "1px solid var(--portal-border, #e5e7eb)" }}
          >
            <option value="en">English</option>
            <option value="tl">Tagalog (coming soon)</option>
          </select>
        </div>
        <button style={btnPrimary} onClick={startNewIntake} disabled={creating}>
          {creating ? "Starting..." : "Begin Questionnaire"}
        </button>
      </div>

      {/* Existing sessions */}
      {loading ? (
        <p style={{ color: "var(--portal-text-muted, #6b7280)" }}>Loading...</p>
      ) : sessions.length > 0 ? (
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px" }}>
            Continue In-Progress
          </h2>
          {sessions.map((s) => (
            <div key={s.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{
                    display: "inline-block", padding: "2px 8px", borderRadius: "12px", fontSize: "12px",
                    background: statusColors[s.status] || "#9ca3af", color: "#fff", marginBottom: "4px",
                  }}>
                    {s.status?.replace(/_/g, " ")}
                  </span>
                  <p style={{ fontSize: "14px", color: "var(--portal-text-muted, #6b7280)", marginTop: "4px" }}>
                    Started: {new Date(s.createdAt).toLocaleDateString()}
                    {s.context?.chiefComplaint && ` - ${s.context.chiefComplaint}`}
                  </p>
                </div>
                <button
                  style={btnSecondary}
                  onClick={() => router.push(`/dashboard/intake/${s.id}`)}
                >
                  Continue
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
