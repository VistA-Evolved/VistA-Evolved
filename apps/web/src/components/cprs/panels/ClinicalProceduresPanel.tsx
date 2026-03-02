"use client";
/**
 * ClinicalProceduresPanel -- Phase 537: CP/MD v1
 *
 * Tabs: Results | Medicine | Consult Link
 * All integration-pending until MD package RPCs are wired in production.
 */

import React, { useCallback, useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type CpTab = "results" | "medicine" | "consult-link";

interface VistaGrounding {
  vistaFiles: string[];
  targetRoutines: string[];
  targetRpcs: string[];
  migrationPath: string;
  sandboxNote: string;
}

interface PendingResponse {
  ok: boolean;
  status: string;
  count: number;
  results: any[];
  vistaGrounding?: VistaGrounding;
  hint?: string;
}

/* ------------------------------------------------------------------ */
/* Integration-pending info card                                       */
/* ------------------------------------------------------------------ */
function PendingCard({ grounding }: { grounding: VistaGrounding }) {
  return (
    <div style={{
      border: "1px solid #f59e0b",
      borderRadius: 8,
      padding: 16,
      background: "#fffbeb",
      marginTop: 8,
    }}>
      <div style={{ fontWeight: 600, color: "#b45309", marginBottom: 8 }}>
        Integration Pending
      </div>
      <div style={{ fontSize: 13, marginBottom: 6 }}>
        <strong>VistA Files:</strong> {grounding.vistaFiles.join(", ")}
      </div>
      <div style={{ fontSize: 13, marginBottom: 6 }}>
        <strong>Target RPCs:</strong> {grounding.targetRpcs.join(", ")}
      </div>
      <div style={{ fontSize: 13, marginBottom: 6 }}>
        <strong>Routines:</strong> {grounding.targetRoutines.join(", ")}
      </div>
      <div style={{ fontSize: 13, marginBottom: 6 }}>
        <strong>Migration:</strong> {grounding.migrationPath}
      </div>
      <div style={{ fontSize: 12, color: "#92400e", fontStyle: "italic" }}>
        {grounding.sandboxNote}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main panel                                                          */
/* ------------------------------------------------------------------ */
export default function ClinicalProceduresPanel({ dfn }: { dfn?: string }) {
  const [tab, setTab] = useState<CpTab>("results");
  const [resultsData, setResultsData] = useState<PendingResponse | null>(null);
  const [medicineData, setMedicineData] = useState<PendingResponse | null>(null);
  const [consultData, setConsultData] = useState<PendingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (endpoint: string, params: string) => {
    try {
      setLoading(true);
      setError(null);
      const resp = await fetch(`${API_BASE}${endpoint}?${params}`, {
        credentials: "include",
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.json();
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!dfn) return;
    if (tab === "results") {
      fetchData("/vista/clinical-procedures", `dfn=${dfn}`).then(setResultsData);
    } else if (tab === "medicine") {
      fetchData("/vista/clinical-procedures/medicine", `dfn=${dfn}`).then(setMedicineData);
    } else if (tab === "consult-link") {
      fetchData("/vista/clinical-procedures/consult-link", `consultId=0`).then(setConsultData);
    }
  }, [dfn, tab, fetchData]);

  const tabs: { key: CpTab; label: string }[] = [
    { key: "results", label: "Results" },
    { key: "medicine", label: "Medicine" },
    { key: "consult-link", label: "Consult Link" },
  ];

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
          Clinical Procedures
        </h2>
        <span style={{
          background: "#fef3c7",
          color: "#b45309",
          padding: "2px 8px",
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 600,
        }}>
          INTEGRATION PENDING
        </span>
      </div>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
        Contract: MD CLIO / MD TMD* / ORQQCN (Medicine &amp; CP Package)
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e5e7eb", marginBottom: 12 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 16px",
              border: "none",
              background: tab === t.key ? "#fff" : "transparent",
              borderBottom: tab === t.key ? "2px solid #2563eb" : "2px solid transparent",
              color: tab === t.key ? "#2563eb" : "#6b7280",
              fontWeight: tab === t.key ? 600 : 400,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!dfn && (
        <div style={{ color: "#9ca3af", fontStyle: "italic" }}>
          Select a patient to view clinical procedures.
        </div>
      )}

      {loading && <div style={{ color: "#6b7280" }}>Loading...</div>}
      {error && <div style={{ color: "#ef4444" }}>Error: {error}</div>}

      {/* Results tab */}
      {tab === "results" && dfn && resultsData && (
        <div>
          {resultsData.status === "integration-pending" && resultsData.vistaGrounding ? (
            <PendingCard grounding={resultsData.vistaGrounding} />
          ) : (
            <div>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>
                {resultsData.count} result(s)
              </div>
              {resultsData.results.length === 0 && (
                <div style={{ color: "#9ca3af" }}>No results found.</div>
              )}
              {resultsData.results.map((r: any, i: number) => (
                <div key={i} style={{
                  padding: 8,
                  borderBottom: "1px solid #f3f4f6",
                  fontSize: 13,
                }}>
                  {r.procedureName} -- {r.status} ({r.datePerformed})
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Medicine tab */}
      {tab === "medicine" && dfn && medicineData && (
        <div>
          {medicineData.status === "integration-pending" && medicineData.vistaGrounding ? (
            <PendingCard grounding={medicineData.vistaGrounding} />
          ) : (
            <div>
              {medicineData.results.length === 0 && (
                <div style={{ color: "#9ca3af" }}>No medicine data found.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Consult Link tab */}
      {tab === "consult-link" && dfn && consultData && (
        <div>
          {consultData.status === "integration-pending" && consultData.vistaGrounding ? (
            <PendingCard grounding={consultData.vistaGrounding} />
          ) : (
            <div>
              {consultData.results.length === 0 && (
                <div style={{ color: "#9ca3af" }}>No consult-procedure links found.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
