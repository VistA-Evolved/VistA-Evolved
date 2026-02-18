/**
 * Medications Page — Active medications from VistA via ORWPS ACTIVE.
 * Real data with PDF download.
 */

"use client";

import { useEffect, useState } from "react";
import { DataSourceBadge } from "@/components/data-source-badge";
import { fetchMedications, exportSectionUrl } from "@/lib/api";

export default function MedicationsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchMedications().then((r) => {
      setData(r.data);
      setLoading(false);
    });
  }, []);

  const results = data?.results || [];
  const isPending = data?._integration === "pending";

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>My Medications</h1>
          <p style={{ color: "var(--portal-text-muted)", fontSize: "0.875rem" }}>
            Active prescriptions from your health record
          </p>
        </div>
        <a
          href={exportSectionUrl("medications")}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block", padding: "0.375rem 0.75rem",
            fontSize: "0.8125rem", background: "#2563eb", color: "#fff",
            borderRadius: 4, textDecoration: "none",
          }}
        >
          Download PDF
        </a>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <h3 style={{ margin: 0 }}>Active Medications</h3>
          <DataSourceBadge source={isPending ? "pending" : "ehr"} />
        </div>

        {loading ? (
          <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>Loading medications...</p>
        ) : results.length === 0 ? (
          <div className="empty-state" style={{ padding: "1.5rem" }}>
            <p>No active medications on file</p>
          </div>
        ) : (
          <table style={{ width: "100%", fontSize: "0.875rem", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                <th style={{ padding: "0.375rem 0.5rem" }}>Medication</th>
                <th style={{ padding: "0.375rem 0.5rem" }}>Status</th>
                <th style={{ padding: "0.375rem 0.5rem" }}>Sig</th>
              </tr>
            </thead>
            <tbody>
              {results.map((med: any, i: number) => (
                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "0.375rem 0.5rem", fontWeight: 500 }}>{med.drugName}</td>
                  <td style={{ padding: "0.375rem 0.5rem" }}>{med.status || "Active"}</td>
                  <td style={{ padding: "0.375rem 0.5rem", color: "#64748b" }}>{med.sig || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {data?.rpcUsed && (
          <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.5rem" }}>
            Source: VistA RPC {data.rpcUsed} ({results.length} record{results.length !== 1 ? "s" : ""})
          </p>
        )}
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <h3 style={{ margin: 0 }}>Refill Requests</h3>
          <DataSourceBadge source="pending" />
        </div>
        <div style={{ padding: "1rem" }}>
          <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "0.75rem" }}>
            Need a medication refill? Submit a request and track its progress.
          </p>
          <a
            href="/dashboard/refills"
            style={{
              display: "inline-block",
              padding: "0.375rem 0.75rem",
              fontSize: "0.8125rem",
              background: "#2563eb",
              color: "#fff",
              borderRadius: 4,
              textDecoration: "none",
            }}
          >
            Go to Refill Requests
          </a>
        </div>
      </div>
    </div>
  );
}
