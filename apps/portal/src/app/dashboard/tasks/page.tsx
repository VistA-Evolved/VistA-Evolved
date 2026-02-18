/**
 * Tasks Page — Patient notification/task center (Phase 32).
 * Unified view of pending actions: appointments, messages, refills, etc.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { DataSourceBadge } from "@/components/data-source-badge";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface PortalTask {
  id: string;
  category: string;
  priority: string;
  status: string;
  title: string;
  body: string;
  actionUrl: string | null;
  actionLabel: string | null;
  createdAt: string;
  expiresAt: string | null;
}

interface TaskCounts {
  total: number;
  byCategory: Record<string, number>;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<PortalTask[]>([]);
  const [counts, setCounts] = useState<TaskCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("active");
  const [notice, setNotice] = useState("");

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, cRes] = await Promise.all([
        fetch(`${API}/portal/tasks?status=${statusFilter}`, { credentials: "include" }),
        fetch(`${API}/portal/tasks/counts`, { credentials: "include" }),
      ]);
      if (tRes.ok) {
        const d = await tRes.json();
        setTasks(d.tasks || []);
      }
      if (cRes.ok) {
        const d = await cRes.json();
        setCounts({ total: d.total, byCategory: d.byCategory });
      }
    } catch {
      /* swallow */
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  async function handleDismiss(id: string) {
    try {
      const res = await fetch(`${API}/portal/tasks/${id}/dismiss`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setNotice("Task dismissed.");
        loadTasks();
      }
    } catch {
      /* swallow */
    }
  }

  async function handleComplete(id: string) {
    try {
      const res = await fetch(`${API}/portal/tasks/${id}/complete`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setNotice("Task completed.");
        loadTasks();
      }
    } catch {
      /* swallow */
    }
  }

  const priorityColor = (p: string) => {
    switch (p) {
      case "urgent": return "#ef4444";
      case "high": return "#d97706";
      case "normal": return "#2563eb";
      default: return "#64748b";
    }
  };

  const categoryIcon = (c: string) => {
    switch (c) {
      case "appointment_reminder": return "\u{1F4C5}";  // calendar
      case "message_unread": return "\u{1F4E9}";        // envelope
      case "refill_status": return "\u{1F48A}";          // pill
      case "form_due": return "\u{1F4CB}";               // clipboard
      case "lab_result": return "\u{1F9EA}";             // test tube
      default: return "\u{1F514}";                       // bell
    }
  };

  return (
    <div className="container">
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>Tasks & Notifications</h1>
        <p style={{ color: "var(--portal-text-muted)", fontSize: "0.875rem" }}>
          Your pending actions and health reminders
        </p>
      </div>

      {notice && (
        <div
          style={{
            padding: "0.5rem 0.75rem",
            marginBottom: "1rem",
            borderRadius: 4,
            fontSize: "0.875rem",
            background: "#dcfce7",
            color: "#166534",
          }}
        >
          {notice}
        </div>
      )}

      {/* Badge summary */}
      {counts && counts.total > 0 && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {Object.entries(counts.byCategory)
              .filter(([, v]) => v > 0)
              .map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    fontSize: "0.875rem",
                  }}
                >
                  <span>{categoryIcon(k)}</span>
                  <span style={{ fontWeight: 500 }}>{v}</span>
                  <span style={{ color: "#64748b" }}>{k.replace(/_/g, " ")}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div style={{ marginBottom: "0.75rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <label style={{ fontSize: "0.8125rem", color: "#64748b" }}>Show:</label>
        {["active", "completed", "dismissed"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: "0.25rem 0.625rem",
              borderRadius: 4,
              border: statusFilter === s ? "1px solid #2563eb" : "1px solid #e2e8f0",
              background: statusFilter === s ? "#eff6ff" : "transparent",
              color: statusFilter === s ? "#2563eb" : "#64748b",
              fontSize: "0.8125rem",
              cursor: "pointer",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <h3 style={{ margin: 0 }}>
            {statusFilter === "active" ? "Active Tasks" : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Tasks`}
          </h3>
          <DataSourceBadge source="pending" />
        </div>

        {loading ? (
          <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>Loading tasks...</p>
        ) : tasks.length === 0 ? (
          <div className="empty-state" style={{ padding: "1.5rem" }}>
            <p>No {statusFilter} tasks.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {tasks.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  padding: "0.625rem 0.75rem",
                  borderRadius: 6,
                  border: "1px solid #e2e8f0",
                  background: t.priority === "urgent" ? "#fef2f2" : t.priority === "high" ? "#fffbeb" : "#fff",
                }}
              >
                <span style={{ fontSize: "1.25rem" }}>{categoryIcon(t.category)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{t.title}</span>
                    <span
                      style={{
                        fontSize: "0.6875rem",
                        color: priorityColor(t.priority),
                        textTransform: "uppercase",
                        fontWeight: 600,
                      }}
                    >
                      {t.priority !== "normal" ? t.priority : ""}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.8125rem", color: "#64748b", margin: "0.125rem 0 0" }}>
                    {t.body}
                  </p>
                  {t.actionUrl && t.actionLabel && (
                    <a
                      href={t.actionUrl}
                      style={{
                        display: "inline-block",
                        marginTop: "0.375rem",
                        fontSize: "0.8125rem",
                        color: "#2563eb",
                        textDecoration: "none",
                      }}
                    >
                      {t.actionLabel} &rarr;
                    </a>
                  )}
                </div>
                {t.status === "active" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <button
                      onClick={() => handleComplete(t.id)}
                      style={{
                        fontSize: "0.75rem",
                        color: "#16a34a",
                        background: "transparent",
                        border: "1px solid #16a34a",
                        borderRadius: 4,
                        padding: "2px 8px",
                        cursor: "pointer",
                      }}
                    >
                      Done
                    </button>
                    <button
                      onClick={() => handleDismiss(t.id)}
                      style={{
                        fontSize: "0.75rem",
                        color: "#64748b",
                        background: "transparent",
                        border: "1px solid #e2e8f0",
                        borderRadius: 4,
                        padding: "2px 8px",
                        cursor: "pointer",
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
