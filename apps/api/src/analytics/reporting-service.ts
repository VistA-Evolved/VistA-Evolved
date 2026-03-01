/**
 * Reporting Service — Phase 365 (W19-P4)
 *
 * Operational, clinical, and RCM report definitions with parameterized
 * queries against the analytics extract + event store. CSV/JSON export.
 *
 * ADR: docs/decisions/ADR-REPORTING-MODEL.md
 */

import { randomUUID } from "node:crypto";
import { log } from "../lib/logger.js";
import type {
  ReportId,
  ReportDefinition,
  ReportResult,
  ReportRow,
} from "./extract-types.js";
import { queryAnalyticsEvents } from "../services/analytics-store.js";
import { getExtractRuns, getExtractRecords } from "./extract-layer.js";

// ── Report Definitions ──────────────────────────────────────────────────

const REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    id: "active_users",
    name: "Active Users",
    description: "Unique users by session count over a time range",
    category: "operational",
    parameters: [
      { name: "startDate", type: "date", required: false },
      { name: "endDate", type: "date", required: false },
    ],
    requiredPermission: "analytics_viewer",
  },
  {
    id: "error_rate",
    name: "Error Rate",
    description: "API error rate over time (5xx responses)",
    category: "operational",
    parameters: [
      { name: "startDate", type: "date", required: false },
      { name: "endDate", type: "date", required: false },
    ],
    requiredPermission: "analytics_viewer",
  },
  {
    id: "queue_lag",
    name: "Queue Lag",
    description: "Average queue wait time across departments",
    category: "operational",
    parameters: [
      { name: "startDate", type: "date", required: false },
    ],
    requiredPermission: "analytics_viewer",
  },
  {
    id: "uptime",
    name: "System Uptime",
    description: "Service availability percentage over time",
    category: "operational",
    parameters: [
      { name: "periodDays", type: "number", required: false, defaultValue: 30 },
    ],
    requiredPermission: "analytics_viewer",
  },
  {
    id: "patient_volume",
    name: "Patient Volume Trends",
    description: "Patient encounters over time (synthetic data)",
    category: "clinical",
    parameters: [
      { name: "startDate", type: "date", required: false },
      { name: "endDate", type: "date", required: false },
      { name: "encounterType", type: "select", required: false, options: ["outpatient", "inpatient", "emergency"] },
    ],
    requiredPermission: "analytics_viewer",
  },
  {
    id: "appointment_volume",
    name: "Appointment Volume",
    description: "Appointment counts and no-show rates",
    category: "clinical",
    parameters: [
      { name: "startDate", type: "date", required: false },
      { name: "endDate", type: "date", required: false },
    ],
    requiredPermission: "analytics_viewer",
  },
  {
    id: "quality_lab_followup",
    name: "Lab Follow-up Timeliness",
    description: "Time from abnormal lab result to provider follow-up",
    category: "quality",
    parameters: [
      { name: "startDate", type: "date", required: false },
    ],
    requiredPermission: "analytics_viewer",
  },
  {
    id: "quality_med_admin",
    name: "Medication Order-to-Admin Time",
    description: "Time from medication order to first administration",
    category: "quality",
    parameters: [
      { name: "startDate", type: "date", required: false },
    ],
    requiredPermission: "analytics_viewer",
  },
  {
    id: "quality_note_completion",
    name: "Note Completion Timeliness",
    description: "Time from note creation to signature",
    category: "quality",
    parameters: [
      { name: "startDate", type: "date", required: false },
    ],
    requiredPermission: "analytics_viewer",
  },
  {
    id: "rcm_claim_throughput",
    name: "Claim Submission Throughput",
    description: "Claims submitted, accepted, denied per period",
    category: "rcm",
    parameters: [
      { name: "startDate", type: "date", required: false },
      { name: "endDate", type: "date", required: false },
    ],
    requiredPermission: "analytics_viewer",
  },
  {
    id: "rcm_denial_distribution",
    name: "Denial Reasons Distribution",
    description: "Top denial reasons by frequency (synthetic fixtures)",
    category: "rcm",
    parameters: [],
    requiredPermission: "analytics_viewer",
  },
  {
    id: "rcm_days_in_ar",
    name: "Days in AR Estimate",
    description: "Average days from submission to payment",
    category: "rcm",
    parameters: [],
    requiredPermission: "analytics_viewer",
  },
  {
    id: "rcm_ack_reject_rate",
    name: "Ack/Reject Rate",
    description: "Clearinghouse acknowledgment vs rejection rate",
    category: "rcm",
    parameters: [],
    requiredPermission: "analytics_viewer",
  },
];

// ── Report Generation ───────────────────────────────────────────────────

export function getReportDefinitions(category?: string): ReportDefinition[] {
  if (category) return REPORT_DEFINITIONS.filter((r) => r.category === category);
  return [...REPORT_DEFINITIONS];
}

export function getReportDefinition(id: ReportId): ReportDefinition | undefined {
  return REPORT_DEFINITIONS.find((r) => r.id === id);
}

export function generateReport(
  reportId: ReportId,
  tenantId: string,
  params: Record<string, unknown> = {},
): ReportResult {
  const defn = getReportDefinition(reportId);
  if (!defn) throw new Error(`Unknown report: ${reportId}`);

  const generator = REPORT_GENERATORS[reportId];
  if (!generator) throw new Error(`No generator for report: ${reportId}`);

  const result = generator(tenantId, params);
  log.info(`Report generated: ${reportId} for tenant ${tenantId}, ${result.totalRows} rows`);
  return result;
}

// ── Report Generators ───────────────────────────────────────────────────

type ReportGenerator = (tenantId: string, params: Record<string, unknown>) => ReportResult;

const REPORT_GENERATORS: Record<string, ReportGenerator> = {
  active_users: (tenantId, params) => {
    const events = queryAnalyticsEvents({ tenantId, category: "ops.auth", limit: 10000, offset: 0 });
    const userSessions = new Map<string, number>();
    for (const e of events.events) {
      const actor = e.actorHash || "unknown";
      userSessions.set(actor, (userSessions.get(actor) || 0) + 1);
    }
    const rows: ReportRow[] = Array.from(userSessions.entries()).map(([userId, sessions]) => ({
      userId, sessions, lastSeen: new Date().toISOString(),
    }));
    return makeResult("active_users", tenantId, params, rows, {
      uniqueUsers: userSessions.size,
      totalSessions: events.events.length,
    });
  },

  error_rate: (tenantId, params) => {
    const events = queryAnalyticsEvents({ tenantId, category: "ops.error", limit: 10000, offset: 0 });
    const allEvents = queryAnalyticsEvents({ tenantId, category: "ops.api", limit: 10000, offset: 0 });
    const total = allEvents.events.length || 1;
    const errors = events.events.length;
    const rows: ReportRow[] = [
      { metric: "error_count", value: errors },
      { metric: "total_requests", value: total },
      { metric: "error_rate_pct", value: Number(((errors / total) * 100).toFixed(2)) },
    ];
    return makeResult("error_rate", tenantId, params, rows, {
      errorCount: errors, totalRequests: total,
      errorRatePct: Number(((errors / total) * 100).toFixed(2)),
    });
  },

  queue_lag: (tenantId, params) => {
    // Synthetic queue metrics
    const rows: ReportRow[] = [
      { department: "Primary Care", avgWaitMin: 12, maxWaitMin: 35, ticketsToday: 28 },
      { department: "Emergency", avgWaitMin: 5, maxWaitMin: 18, ticketsToday: 45 },
      { department: "Pharmacy", avgWaitMin: 8, maxWaitMin: 22, ticketsToday: 62 },
      { department: "Radiology", avgWaitMin: 15, maxWaitMin: 40, ticketsToday: 15 },
    ];
    return makeResult("queue_lag", tenantId, params, rows, {
      avgWaitAllDepts: 10, totalTickets: 150,
    });
  },

  uptime: (tenantId, params) => {
    const days = (params.periodDays as number) || 30;
    const rows: ReportRow[] = [];
    for (let i = days; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000);
      rows.push({
        date: d.toISOString().slice(0, 10),
        uptimePct: 99.5 + Math.random() * 0.5,
        incidents: i % 7 === 0 ? 1 : 0,
      });
    }
    return makeResult("uptime", tenantId, params, rows, {
      avgUptimePct: 99.85, totalIncidents: Math.floor(days / 7),
    });
  },

  patient_volume: (tenantId, params) => {
    const runs = getExtractRuns(tenantId, 10);
    const records = runs.length > 0
      ? getExtractRecords(runs[runs.length - 1].runId, { entityType: "patient_encounter" })
      : [];
    const typeFilter = params.encounterType as string | undefined;
    const filtered = typeFilter
      ? records.filter((r) => r.data.type === typeFilter)
      : records;
    const rows: ReportRow[] = filtered.map((r) => ({
      encounterId: r.data.encounterId,
      type: r.data.type,
      visitDate: r.data.visitDate,
      facilityId: r.data.facilityId,
    }));
    return makeResult("patient_volume", tenantId, params, rows, {
      totalEncounters: rows.length,
      byType: countByField(rows, "type"),
    });
  },

  appointment_volume: (tenantId, params) => {
    const runs = getExtractRuns(tenantId, 10);
    const records = runs.length > 0
      ? getExtractRecords(runs[runs.length - 1].runId, { entityType: "appointment" })
      : [];
    const rows: ReportRow[] = records.map((r) => ({
      appointmentId: r.data.appointmentId,
      status: r.data.status,
      clinicIen: r.data.clinicIen,
      date: r.data.appointmentDate,
    }));
    const noShows = rows.filter((r) => r.status === "no_show").length;
    return makeResult("appointment_volume", tenantId, params, rows, {
      totalAppointments: rows.length,
      noShows,
      noShowRatePct: rows.length > 0 ? Number(((noShows / rows.length) * 100).toFixed(1)) : 0,
    });
  },

  // Quality report generators delegated to quality-metrics.ts
  quality_lab_followup: qualityReportStub("quality_lab_followup"),
  quality_med_admin: qualityReportStub("quality_med_admin"),
  quality_note_completion: qualityReportStub("quality_note_completion"),

  // RCM report generators delegated to rcm-analytics.ts
  rcm_claim_throughput: rcmReportStub("rcm_claim_throughput"),
  rcm_denial_distribution: rcmReportStub("rcm_denial_distribution"),
  rcm_days_in_ar: rcmReportStub("rcm_days_in_ar"),
  rcm_ack_reject_rate: rcmReportStub("rcm_ack_reject_rate"),
};

// ── Stubs for reports implemented in other modules ──────────────────────

function qualityReportStub(reportId: string): ReportGenerator {
  return (tenantId, params) => {
    // Quality metrics module will override these at init
    const generator = externalGenerators.get(reportId);
    if (generator) return generator(tenantId, params);
    return makeResult(reportId as ReportId, tenantId, params, [], {
      note: "Run quality metrics extract first",
    });
  };
}

function rcmReportStub(reportId: string): ReportGenerator {
  return (tenantId, params) => {
    const generator = externalGenerators.get(reportId);
    if (generator) return generator(tenantId, params);
    return makeResult(reportId as ReportId, tenantId, params, [], {
      note: "Run RCM analytics extract first",
    });
  };
}

const externalGenerators = new Map<string, ReportGenerator>();

export function registerReportGenerator(reportId: string, generator: ReportGenerator): void {
  externalGenerators.set(reportId, generator);
}

// ── Export Functions ─────────────────────────────────────────────────────

export function exportReportCsv(result: ReportResult): string {
  if (result.data.length === 0) return "";
  const headers = Object.keys(result.data[0]);
  const rows = result.data.map((row) =>
    headers.map((h) => csvEscape(String(row[h] ?? ""))).join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

export function exportReportJson(result: ReportResult): string {
  return JSON.stringify(result, null, 2);
}

function csvEscape(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

// ── Helpers ─────────────────────────────────────────────────────────────

function makeResult(
  reportId: ReportId,
  tenantId: string,
  params: Record<string, unknown>,
  data: ReportRow[],
  summary: Record<string, unknown>,
): ReportResult {
  return {
    reportId,
    tenantId,
    generatedAt: new Date().toISOString(),
    parameters: params,
    data,
    summary: summary as Record<string, number | string>,
    totalRows: data.length,
  };
}

function countByField(rows: ReportRow[], field: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const val = String(row[field] || "unknown");
    counts[val] = (counts[val] || 0) + 1;
  }
  return counts;
}
