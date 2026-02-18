/**
 * Health Records — Multi-section view of clinical data from VistA.
 * Fetches real EHR data via portal health proxy routes.
 * PDF download buttons for each section and full record.
 *
 * VistA RPCs backing this page:
 *   ORQQAL LIST, ORWCH PROBLEM LIST, ORQQVI VITALS,
 *   ORWPS ACTIVE, ORWPT SELECT,
 *   ORWLRR INTERIM (pending), ORQQCN LIST (pending),
 *   ORWSR LIST (pending), TIU DOCUMENTS BY CONTEXT (pending)
 */

"use client";

import { useEffect, useState } from "react";
import { DataSourceBadge } from "@/components/data-source-badge";
import {
  fetchAllergies,
  fetchProblems,
  fetchVitals,
  fetchMedications,
  fetchDemographics,
  fetchLabs,
  fetchConsults,
  fetchSurgery,
  fetchDischargeSummaries,
  exportSectionUrl,
  exportFullRecordUrl,
} from "@/lib/api";

interface SectionState {
  loading: boolean;
  data: any;
  error?: string;
}

function DownloadButton({ url, label }: { url: string; label: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-block",
        padding: "0.25rem 0.5rem",
        fontSize: "0.75rem",
        background: "#2563eb",
        color: "#fff",
        borderRadius: 4,
        textDecoration: "none",
        cursor: "pointer",
      }}
    >
      {label}
    </a>
  );
}

export default function HealthRecordsPage() {
  const [allergies, setAllergies] = useState<SectionState>({ loading: true, data: null });
  const [problems, setProblems] = useState<SectionState>({ loading: true, data: null });
  const [vitals, setVitals] = useState<SectionState>({ loading: true, data: null });
  const [medications, setMeds] = useState<SectionState>({ loading: true, data: null });
  const [demographics, setDemo] = useState<SectionState>({ loading: true, data: null });
  const [labs, setLabs] = useState<SectionState>({ loading: true, data: null });
  const [consults, setConsults] = useState<SectionState>({ loading: true, data: null });
  const [surgery, setSurgery] = useState<SectionState>({ loading: true, data: null });
  const [dcSummaries, setDcSummaries] = useState<SectionState>({ loading: true, data: null });

  useEffect(() => {
    fetchAllergies().then((r) => setAllergies({ loading: false, data: r.data }));
    fetchProblems().then((r) => setProblems({ loading: false, data: r.data }));
    fetchVitals().then((r) => setVitals({ loading: false, data: r.data }));
    fetchMedications().then((r) => setMeds({ loading: false, data: r.data }));
    fetchDemographics().then((r) => setDemo({ loading: false, data: r.data }));
    fetchLabs().then((r) => setLabs({ loading: false, data: r.data }));
    fetchConsults().then((r) => setConsults({ loading: false, data: r.data }));
    fetchSurgery().then((r) => setSurgery({ loading: false, data: r.data }));
    fetchDischargeSummaries().then((r) => setDcSummaries({ loading: false, data: r.data }));
  }, []);

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>Health Records</h1>
          <p style={{ color: "var(--portal-text-muted)", fontSize: "0.875rem" }}>
            Your complete health information from the health system
          </p>
        </div>
        <DownloadButton url={exportFullRecordUrl()} label="Download Full Record (PDF)" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* Demographics */}
        <HealthSection
          title="Demographics"
          loading={demographics.loading}
          data={demographics.data}
          source={demographics.data?._integration === "pending" ? "pending" : "ehr"}
          downloadUrl={exportSectionUrl("demographics")}
          renderData={(d) => {
            const results = d.results || [];
            if (!results.length) return <p>No demographic data available</p>;
            const p = results[0];
            return (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                <div><strong>Name:</strong> {p.name}</div>
                <div><strong>Sex:</strong> {p.sex}</div>
                <div><strong>DOB:</strong> {p.dob}</div>
              </div>
            );
          }}
        />

        {/* Allergies */}
        <HealthSection
          title="Allergies"
          loading={allergies.loading}
          data={allergies.data}
          source={allergies.data?._integration === "pending" ? "pending" : "ehr"}
          downloadUrl={exportSectionUrl("allergies")}
          renderData={(d) => {
            const results = d.results || [];
            if (!results.length) return <p>No known allergies</p>;
            return (
              <table style={{ width: "100%", fontSize: "0.875rem", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                    <th style={{ padding: "0.25rem 0.5rem" }}>Allergen</th>
                    <th style={{ padding: "0.25rem 0.5rem" }}>Severity</th>
                    <th style={{ padding: "0.25rem 0.5rem" }}>Reactions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((a: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "0.25rem 0.5rem" }}>{a.allergen}</td>
                      <td style={{ padding: "0.25rem 0.5rem" }}>{a.severity || "—"}</td>
                      <td style={{ padding: "0.25rem 0.5rem" }}>{a.reactions || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          }}
        />

        {/* Problems */}
        <HealthSection
          title="Problem List"
          loading={problems.loading}
          data={problems.data}
          source={problems.data?._integration === "pending" ? "pending" : "ehr"}
          downloadUrl={exportSectionUrl("problems")}
          renderData={(d) => {
            const results = d.results || [];
            if (!results.length) return <p>No problems on file</p>;
            return (
              <table style={{ width: "100%", fontSize: "0.875rem", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                    <th style={{ padding: "0.25rem 0.5rem" }}>Problem</th>
                    <th style={{ padding: "0.25rem 0.5rem" }}>Status</th>
                    <th style={{ padding: "0.25rem 0.5rem" }}>Onset</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((p: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "0.25rem 0.5rem" }}>{p.text}</td>
                      <td style={{ padding: "0.25rem 0.5rem" }}>
                        <span style={{
                          display: "inline-block", padding: "0.125rem 0.375rem", borderRadius: 4,
                          fontSize: "0.75rem", fontWeight: 600,
                          background: p.status === "active" ? "#dcfce7" : "#f1f5f9",
                          color: p.status === "active" ? "#166534" : "#64748b",
                        }}>{p.status}</span>
                      </td>
                      <td style={{ padding: "0.25rem 0.5rem" }}>{p.onset || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          }}
        />

        {/* Vitals */}
        <HealthSection
          title="Vital Signs"
          loading={vitals.loading}
          data={vitals.data}
          source={vitals.data?._integration === "pending" ? "pending" : "ehr"}
          downloadUrl={exportSectionUrl("vitals")}
          renderData={(d) => {
            const results = d.results || [];
            if (!results.length) return <p>No vitals recorded</p>;
            return (
              <table style={{ width: "100%", fontSize: "0.875rem", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                    <th style={{ padding: "0.25rem 0.5rem" }}>Type</th>
                    <th style={{ padding: "0.25rem 0.5rem" }}>Value</th>
                    <th style={{ padding: "0.25rem 0.5rem" }}>Taken At</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((v: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "0.25rem 0.5rem" }}>{v.type}</td>
                      <td style={{ padding: "0.25rem 0.5rem" }}>{v.value}</td>
                      <td style={{ padding: "0.25rem 0.5rem" }}>{v.takenAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          }}
        />

        {/* Labs, Consults, Surgery, DC Summaries — pending integration */}
        <HealthSection
          title="Lab Results"
          loading={labs.loading}
          data={labs.data}
          source="pending"
          renderData={(d) => (
            <div className="empty-state" style={{ padding: "0.75rem" }}>
              <p>Lab result integration is in progress.</p>
              <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Target RPC: {d._rpc || "ORWLRR INTERIM"}</p>
            </div>
          )}
        />

        <HealthSection
          title="Consult History"
          loading={consults.loading}
          data={consults.data}
          source="pending"
          renderData={(d) => (
            <div className="empty-state" style={{ padding: "0.75rem" }}>
              <p>Consult history integration is in progress.</p>
              <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Target RPC: {d._rpc || "ORQQCN LIST"}</p>
            </div>
          )}
        />

        <HealthSection
          title="Surgery History"
          loading={surgery.loading}
          data={surgery.data}
          source="pending"
          renderData={(d) => (
            <div className="empty-state" style={{ padding: "0.75rem" }}>
              <p>Surgery records integration is in progress.</p>
              <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Target RPC: {d._rpc || "ORWSR LIST"}</p>
            </div>
          )}
        />

        <HealthSection
          title="Discharge Summaries"
          loading={dcSummaries.loading}
          data={dcSummaries.data}
          source="pending"
          renderData={(d) => (
            <div className="empty-state" style={{ padding: "0.75rem" }}>
              <p>Discharge summary integration is in progress.</p>
              <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Target RPC: {d._rpc || "TIU DOCUMENTS BY CONTEXT"}</p>
            </div>
          )}
        />
      </div>
    </div>
  );
}

function HealthSection({
  title,
  loading,
  data,
  source,
  downloadUrl,
  renderData,
}: {
  title: string;
  loading: boolean;
  data: any;
  source: "ehr" | "pending";
  downloadUrl?: string;
  renderData: (data: any) => React.ReactNode;
}) {
  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {downloadUrl && <DownloadButton url={downloadUrl} label="PDF" />}
          <DataSourceBadge source={source} />
        </div>
      </div>
      {loading ? (
        <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>Loading...</p>
      ) : (
        renderData(data || {})
      )}
    </div>
  );
}
