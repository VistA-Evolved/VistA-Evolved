/**
 * Phase 416 (W24-P8): SRE Incident Store
 *
 * In-memory incident tracking with SLO snapshot management.
 * Matches the imaging worklist pattern (Phase 23) -- resets on API restart.
 */
import crypto from "node:crypto";
import {
  type Incident,
  type IncidentSeverity,
  type IncidentStatus,
  type SloSnapshot,
  type SloId,
  type BudgetTier,
  type SreDashboard,
  type TimelineEntry,
  SLO_DEFINITIONS,
} from "./types.js";

const MAX_INCIDENTS = 1000;
const incidents = new Map<string, Incident>();
const sloSnapshots = new Map<SloId, SloSnapshot>();

// ---------- SLO Snapshots ----------

export function updateSloSnapshot(
  sloId: SloId,
  currentValue: number,
): SloSnapshot {
  const def = SLO_DEFINITIONS.find((d) => d.id === sloId);
  if (!def) throw new Error(`Unknown SLO: ${sloId}`);

  const budgetRemaining = def.budgetFraction === 0
    ? (currentValue >= def.target ? 1 : 0)
    : Math.max(0, Math.min(1, (currentValue - def.target) / def.budgetFraction + 1));

  let budgetTier: BudgetTier;
  if (budgetRemaining <= 0) budgetTier = "exhausted";
  else if (budgetRemaining < 0.25) budgetTier = "red";
  else if (budgetRemaining < 0.5) budgetTier = "yellow";
  else budgetTier = "green";

  const snapshot: SloSnapshot = {
    sloId,
    currentValue,
    budgetRemaining,
    budgetTier,
    measuredAt: new Date().toISOString(),
  };
  sloSnapshots.set(sloId, snapshot);
  return snapshot;
}

export function getSloSnapshot(sloId: SloId): SloSnapshot | undefined {
  return sloSnapshots.get(sloId);
}

export function getAllSloSnapshots(): SloSnapshot[] {
  return Array.from(sloSnapshots.values());
}

// ---------- Incidents ----------

function enforceMax(): void {
  if (incidents.size > MAX_INCIDENTS) {
    const sorted = Array.from(incidents.entries())
      .sort((a, b) => a[1].createdAt.localeCompare(b[1].createdAt));
    const toRemove = sorted.slice(0, incidents.size - MAX_INCIDENTS);
    for (const [id] of toRemove) incidents.delete(id);
  }
}

export function createIncident(params: {
  title: string;
  severity: IncidentSeverity;
  description: string;
  impactSummary: string;
  triggerSloId?: SloId;
  assignee?: string;
}): Incident {
  const id = `INC-${crypto.randomBytes(6).toString("hex")}`;
  const now = new Date().toISOString();
  const incident: Incident = {
    id,
    title: params.title,
    severity: params.severity,
    status: "open",
    triggerSloId: params.triggerSloId,
    description: params.description,
    impactSummary: params.impactSummary,
    createdAt: now,
    updatedAt: now,
    assignee: params.assignee,
    timelineEntries: [
      {
        timestamp: now,
        author: "system",
        action: "created",
        detail: `Incident created: ${params.title}`,
      },
    ],
  };
  incidents.set(id, incident);
  enforceMax();
  return incident;
}

export function getIncident(id: string): Incident | undefined {
  return incidents.get(id);
}

export function listIncidents(filter?: {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
}): Incident[] {
  let result = Array.from(incidents.values());
  if (filter?.status) result = result.filter((i) => i.status === filter.status);
  if (filter?.severity) result = result.filter((i) => i.severity === filter.severity);
  return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function transitionIncident(
  id: string,
  newStatus: IncidentStatus,
  author: string,
  detail: string,
): Incident | undefined {
  const incident = incidents.get(id);
  if (!incident) return undefined;

  const entry: TimelineEntry = {
    timestamp: new Date().toISOString(),
    author,
    action: `status -> ${newStatus}`,
    detail,
  };
  incident.status = newStatus;
  incident.updatedAt = entry.timestamp;
  if (newStatus === "resolved") incident.resolvedAt = entry.timestamp;
  incident.timelineEntries.push(entry);
  return incident;
}

// ---------- Dashboard ----------

export function getSreDashboard(): SreDashboard {
  const all = listIncidents();
  const active = all.filter((i) => i.status !== "resolved" && i.status !== "postmortem");
  const recent = all.filter((i) => {
    if (!i.resolvedAt) return false;
    const resolved = new Date(i.resolvedAt).getTime();
    return Date.now() - resolved < 30 * 24 * 60 * 60 * 1000;
  });

  const snapshots = getAllSloSnapshots();
  const hasRed = snapshots.some((s) => s.budgetTier === "red" || s.budgetTier === "exhausted");
  const hasYellow = snapshots.some((s) => s.budgetTier === "yellow");
  const hasP0 = active.some((i) => i.severity === "P0");

  let overallHealth: "healthy" | "degraded" | "critical" = "healthy";
  if (hasP0 || hasRed) overallHealth = "critical";
  else if (active.length > 0 || hasYellow) overallHealth = "degraded";

  return {
    sloSnapshots: snapshots,
    activeIncidents: active,
    recentIncidents: recent,
    overallHealth,
    lastUpdated: new Date().toISOString(),
  };
}
