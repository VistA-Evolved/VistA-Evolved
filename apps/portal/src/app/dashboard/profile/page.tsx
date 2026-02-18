/**
 * Profile Page — Patient demographics and preferences.
 *
 * VistA RPCs: ORWPT SELECT (demographics)
 */

import { DataSourceBadge } from "@/components/data-source-badge";

export default function ProfilePage() {
  return (
    <div className="container">
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>
        My Profile
      </h1>
      <p
        style={{
          color: "var(--portal-text-muted)",
          fontSize: "0.875rem",
          marginBottom: "1.5rem",
        }}
      >
        Your personal and contact information
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
            <h3 style={{ margin: 0 }}>Demographics</h3>
            <DataSourceBadge source="ehr" />
          </div>
          <div className="empty-state" style={{ padding: "1.5rem" }}>
            <p>Your demographic information will load from the health system.</p>
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
            <h3 style={{ margin: 0 }}>Contact Information</h3>
            <DataSourceBadge source="ehr" />
          </div>
          <div className="empty-state" style={{ padding: "1.5rem" }}>
            <p>
              Your contact details will appear here from your health record.
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
            <h3 style={{ margin: 0 }}>Notification Preferences</h3>
            <DataSourceBadge source="pending" />
          </div>
          <div className="empty-state" style={{ padding: "1.5rem" }}>
            <h3 style={{ color: "var(--portal-text)" }}>Coming Soon</h3>
            <p>
              Manage how you receive appointment reminders and health
              notifications.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
