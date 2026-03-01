/**
 * Phase 416 (W24-P8): SRE Monitoring Types
 *
 * Domain types for post-go-live SRE monitoring, incident tracking,
 * and SLO budget management.
 */

// ---------- SLO ----------

export type SloId =
  | "slo_availability"
  | "slo_latency_p99"
  | "slo_rpc_success"
  | "slo_error_rate"
  | "slo_login_success"
  | "slo_data_plane";

export interface SloDefinition {
  id: SloId;
  name: string;
  target: number;          // e.g., 0.995 for 99.5%
  windowMinutes: number;   // measurement window
  budgetFraction: number;  // 1 - target
  severity: "P0" | "P1" | "P2" | "P3";
}

export type BudgetTier = "green" | "yellow" | "red" | "exhausted";

export interface SloSnapshot {
  sloId: SloId;
  currentValue: number;      // e.g., 0.997
  budgetRemaining: number;   // fraction, e.g., 0.65
  budgetTier: BudgetTier;
  measuredAt: string;        // ISO 8601
}

// ---------- Incidents ----------

export type IncidentSeverity = "P0" | "P1" | "P2" | "P3";
export type IncidentStatus = "open" | "investigating" | "mitigating" | "resolved" | "postmortem";

export interface Incident {
  id: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  triggerSloId?: SloId;
  description: string;
  impactSummary: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  assignee?: string;
  timelineEntries: TimelineEntry[];
}

export interface TimelineEntry {
  timestamp: string;
  author: string;
  action: string;
  detail: string;
}

// ---------- SRE Dashboard ----------

export interface SreDashboard {
  sloSnapshots: SloSnapshot[];
  activeIncidents: Incident[];
  recentIncidents: Incident[];     // last 30 days, resolved
  overallHealth: "healthy" | "degraded" | "critical";
  lastUpdated: string;
}

// ---------- SLO Definitions (canonical) ----------

export const SLO_DEFINITIONS: SloDefinition[] = [
  {
    id: "slo_availability",
    name: "API Availability",
    target: 0.995,
    windowMinutes: 43200,     // 30 days
    budgetFraction: 0.005,
    severity: "P1",
  },
  {
    id: "slo_latency_p99",
    name: "Request Latency (p99)",
    target: 0.99,
    windowMinutes: 60,
    budgetFraction: 0.01,
    severity: "P2",
  },
  {
    id: "slo_rpc_success",
    name: "VistA RPC Success Rate",
    target: 0.99,
    windowMinutes: 60,
    budgetFraction: 0.01,
    severity: "P1",
  },
  {
    id: "slo_error_rate",
    name: "Error Rate (5xx)",
    target: 0.99,
    windowMinutes: 15,
    budgetFraction: 0.01,
    severity: "P1",
  },
  {
    id: "slo_login_success",
    name: "Login Success Rate",
    target: 0.995,
    windowMinutes: 60,
    budgetFraction: 0.005,
    severity: "P1",
  },
  {
    id: "slo_data_plane",
    name: "Data Plane Integrity",
    target: 1.0,
    windowMinutes: 0,        // continuous
    budgetFraction: 0.0,
    severity: "P0",
  },
];
