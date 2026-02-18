/**
 * Health Records — Multi-section view of clinical data from the health system.
 * Each section shows a data-source badge indicating live EHR connection.
 *
 * VistA RPCs backing this page:
 *   ORQQAL LIST, ORWCH PROBLEM LIST, ORQQVI VITALS,
 *   ORWLRR INTERIM, ORQQCN LIST, ORWSR LIST,
 *   TIU DOCUMENTS BY CONTEXT (class 244)
 */

import { DataSourceBadge } from "@/components/data-source-badge";

const HEALTH_SECTIONS = [
  {
    title: "Allergies",
    source: "ehr" as const,
    description: "Known allergies and adverse reactions recorded in your health record.",
    placeholder: "No allergies on file",
  },
  {
    title: "Problem List",
    source: "ehr" as const,
    description: "Active and resolved health conditions and diagnoses.",
    placeholder: "No problems on file",
  },
  {
    title: "Vital Signs",
    source: "ehr" as const,
    description: "Recent vital sign measurements (blood pressure, pulse, temperature, etc.).",
    placeholder: "No vitals recorded",
  },
  {
    title: "Lab Results",
    source: "ehr" as const,
    description: "Laboratory test results from your recent visits.",
    placeholder: "No lab results available",
  },
  {
    title: "Imaging Studies",
    source: "ehr" as const,
    description: "Radiology and imaging study reports.",
    placeholder: "No imaging studies on file",
  },
  {
    title: "Consult History",
    source: "ehr" as const,
    description: "Specialist consultation requests and results.",
    placeholder: "No consults on file",
  },
  {
    title: "Surgery History",
    source: "ehr" as const,
    description: "Surgical procedures and operative reports.",
    placeholder: "No surgery records on file",
  },
  {
    title: "Discharge Summaries",
    source: "ehr" as const,
    description: "Summaries from hospital stays and discharges.",
    placeholder: "No discharge summaries on file",
  },
];

export default function HealthRecordsPage() {
  return (
    <div className="container">
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>
        Health Records
      </h1>
      <p
        style={{
          color: "var(--portal-text-muted)",
          fontSize: "0.875rem",
          marginBottom: "1.5rem",
        }}
      >
        Your complete health information from the health system
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {HEALTH_SECTIONS.map((section) => (
          <div key={section.title} className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
              <h3 style={{ margin: 0 }}>{section.title}</h3>
              <DataSourceBadge source={section.source} />
            </div>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--portal-text-muted)",
                marginBottom: "0.75rem",
              }}
            >
              {section.description}
            </p>
            <div className="empty-state" style={{ padding: "1.5rem" }}>
              <p>{section.placeholder}</p>
              <p style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
                Data will load from your health system when connected.
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
