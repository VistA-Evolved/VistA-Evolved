/**
 * Appointments Page — View and manage appointments (future).
 * Currently a placeholder with Integration Pending badge.
 */

import { DataSourceBadge } from "@/components/data-source-badge";

export default function AppointmentsPage() {
  return (
    <div className="container">
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>
        My Appointments
      </h1>
      <p
        style={{
          color: "var(--portal-text-muted)",
          fontSize: "0.875rem",
          marginBottom: "1.5rem",
        }}
      >
        Upcoming and past appointments
      </p>

      <div className="grid-2">
        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
            }}
          >
            <h3 style={{ margin: 0 }}>Upcoming</h3>
            <DataSourceBadge source="pending" />
          </div>
          <div className="empty-state">
            <h3>Coming Soon</h3>
            <p>
              Your upcoming appointments will appear here once scheduling
              integration is active.
            </p>
          </div>
        </div>

        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
            }}
          >
            <h3 style={{ margin: 0 }}>Past Visits</h3>
            <DataSourceBadge source="pending" />
          </div>
          <div className="empty-state">
            <h3>Coming Soon</h3>
            <p>
              Your visit history will appear here once scheduling integration
              is active.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
