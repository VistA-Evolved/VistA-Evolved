/**
 * Telehealth Page — Video visit capability (future).
 * Currently a placeholder with Integration Pending badge.
 *
 * Reference patterns: Ottehr waiting room UX, Jitsi WebRTC (AIOTP observation)
 */

import { DataSourceBadge } from "@/components/data-source-badge";

export default function TelehealthPage() {
  return (
    <div className="container">
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>
        Telehealth
      </h1>
      <p
        style={{
          color: "var(--portal-text-muted)",
          fontSize: "0.875rem",
          marginBottom: "1.5rem",
        }}
      >
        Virtual visits with your care team
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
          <h3 style={{ margin: 0 }}>Video Visit</h3>
          <DataSourceBadge source="pending" />
        </div>
        <div className="empty-state">
          <h3>Coming Soon</h3>
          <p>
            Video visits will allow you to see your provider from the comfort
            of your home. This feature will be available in a future update.
          </p>
          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem",
              background: "#f0f9ff",
              borderRadius: "var(--portal-radius)",
              fontSize: "0.8125rem",
              color: "#1e40af",
            }}
          >
            <strong>How it will work:</strong>
            <br />
            1. Your provider schedules a telehealth appointment
            <br />
            2. You receive a notification when it is time to join
            <br />
            3. Click &quot;Join Visit&quot; to enter the waiting room
            <br />
            4. Your provider connects and the visit begins
          </div>
        </div>
      </div>
    </div>
  );
}
