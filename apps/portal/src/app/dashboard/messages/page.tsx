/**
 * Messages Page — Secure messaging with care team (future).
 * Currently a placeholder with Integration Pending badge.
 */

import { DataSourceBadge } from "@/components/data-source-badge";

export default function MessagesPage() {
  return (
    <div className="container">
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>
        Messages
      </h1>
      <p
        style={{
          color: "var(--portal-text-muted)",
          fontSize: "0.875rem",
          marginBottom: "1.5rem",
        }}
      >
        Secure messaging with your care team
      </p>

      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.5rem",
          }}
        >
          <h3 style={{ margin: 0 }}>Inbox</h3>
          <DataSourceBadge source="pending" />
        </div>
        <div className="empty-state">
          <h3>Coming Soon</h3>
          <p>
            Secure messaging with your providers will be available in a future
            update. You will be able to ask non-urgent questions and receive
            replies directly in this portal.
          </p>
        </div>
      </div>
    </div>
  );
}
