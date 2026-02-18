/**
 * Medications Page — Active medications from the health system.
 *
 * VistA RPCs: ORWPS ACTIVE, ORWORR GETTXT
 */

import { DataSourceBadge } from "@/components/data-source-badge";

export default function MedicationsPage() {
  return (
    <div className="container">
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>
        My Medications
      </h1>
      <p
        style={{
          color: "var(--portal-text-muted)",
          fontSize: "0.875rem",
          marginBottom: "1.5rem",
        }}
      >
        Active prescriptions and medication history
      </p>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.5rem",
          }}
        >
          <h3 style={{ margin: 0 }}>Active Medications</h3>
          <DataSourceBadge source="ehr" />
        </div>
        <div className="empty-state" style={{ padding: "1.5rem" }}>
          <p>No active medications on file</p>
          <p style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
            Your current prescriptions will appear here when connected to the
            health system.
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
          <h3 style={{ margin: 0 }}>Refill Requests</h3>
          <DataSourceBadge source="pending" />
        </div>
        <div className="empty-state" style={{ padding: "1.5rem" }}>
          <h3>Coming Soon</h3>
          <p>
            Medication refill requests will be available in a future update.
          </p>
        </div>
      </div>
    </div>
  );
}
