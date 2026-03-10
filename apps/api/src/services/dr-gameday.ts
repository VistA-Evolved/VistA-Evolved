/**
 * dr-gameday.ts -- Multi-Region DR & GameDay Service
 *
 * Phase 333 (W15-P7)
 *
 * Scheduled DR drills, GameDay scenarios, evidence packs for compliance,
 * and automated failover testing with grade-based outcomes.
 */

import { randomUUID } from "node:crypto";

// --- Types ------------------------------------------------------------------

export type DrillType = "failover" | "switchback" | "data_loss_sim" | "network_partition" | "full_gameday";
export type DrillStatus = "scheduled" | "running" | "completed" | "failed" | "cancelled";
export type DrillGrade = "A" | "B" | "C" | "D" | "F";

export interface DrDrill {
  id: string;
  name: string;
  type: DrillType;
  status: DrillStatus;
  grade: DrillGrade | null;
  primaryRegion: string;
  failoverRegion: string;
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  rtoTargetSec: number;          // Recovery Time Objective
  rpoTargetSec: number;          // Recovery Point Objective
  rtoActualSec: number | null;
  rpoActualSec: number | null;
  steps: DrillStep[];
  findings: DrillFinding[];
  createdBy: string;
  createdAt: string;
}

export interface DrillStep {
  seq: number;
  name: string;
  status: "pending" | "running" | "passed" | "failed" | "skipped";
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  detail: string | null;
}

export interface DrillFinding {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  category: string;
  description: string;
  recommendation: string;
  detectedAt: string;
}

export interface GameDayScenario {
  id: string;
  name: string;
  description: string;
  drillTypes: DrillType[];
  targetRegions: string[];
  rtoTargetSec: number;
  rpoTargetSec: number;
  steps: { name: string; description: string }[];
  createdAt: string;
}

export interface EvidencePack {
  id: string;
  drillId: string;
  generatedAt: string;
  complianceFrameworks: string[];    // e.g., ["SOC2", "HIPAA", "HITRUST"]
  summary: {
    drillName: string;
    type: DrillType;
    grade: DrillGrade | null;
    rtoTarget: number;
    rtoActual: number | null;
    rpoTarget: number;
    rpoActual: number | null;
    totalSteps: number;
    passedSteps: number;
    failedSteps: number;
    findings: number;
    criticalFindings: number;
  };
  timeline: Array<{ ts: string; event: string; detail: string }>;
  attestation: string | null;
}

export interface DrSchedule {
  id: string;
  scenarioId: string;
  cronExpression: string;       // e.g., "0 2 * * 6" = Saturdays at 2 AM
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
}

// --- In-Memory Stores -------------------------------------------------------

const drillStore = new Map<string, DrDrill>();
const scenarioStore = new Map<string, GameDayScenario>();
const evidenceStore = new Map<string, EvidencePack>();
const scheduleStore = new Map<string, DrSchedule>();

const auditLog: Array<{ ts: string; action: string; actor: string; detail: Record<string, unknown> }> = [];
const MAX_AUDIT = 10_000;

// --- Default Scenarios ------------------------------------------------------

const FAILOVER_STEPS = [
  { name: "pre_check", description: "Verify source and target region health" },
  { name: "stop_writes", description: "Halt write traffic to primary region" },
  { name: "verify_replication", description: "Confirm replication lag within RPO" },
  { name: "dns_failover", description: "Update DNS to point to failover region" },
  { name: "verify_routing", description: "Confirm traffic routing to new primary" },
  { name: "validate_reads", description: "Run read probes against new primary" },
  { name: "validate_writes", description: "Run write probes against new primary" },
  { name: "measure_rto", description: "Measure total recovery time" },
  { name: "post_check", description: "Run full health check on new primary" },
];

const SWITCHBACK_STEPS = [
  { name: "pre_check", description: "Verify both regions healthy" },
  { name: "sync_verify", description: "Confirm data sync from failover to original" },
  { name: "stop_writes", description: "Halt write traffic to failover region" },
  { name: "dns_switchback", description: "Update DNS to original primary" },
  { name: "verify_routing", description: "Confirm traffic back to original" },
  { name: "validate_data", description: "Data integrity check on original primary" },
  { name: "post_check", description: "Full health check on original primary" },
];

// --- Scenario Management ----------------------------------------------------

export function createScenario(input: {
  name: string;
  description: string;
  drillTypes: DrillType[];
  targetRegions: string[];
  rtoTargetSec?: number;
  rpoTargetSec?: number;
  steps?: { name: string; description: string }[];
}): GameDayScenario {
  const scenario: GameDayScenario = {
    id: randomUUID(),
    name: input.name,
    description: input.description,
    drillTypes: input.drillTypes,
    targetRegions: input.targetRegions,
    rtoTargetSec: input.rtoTargetSec || 300,
    rpoTargetSec: input.rpoTargetSec || 60,
    steps: input.steps || FAILOVER_STEPS,
    createdAt: new Date().toISOString(),
  };
  scenarioStore.set(scenario.id, scenario);
  return scenario;
}

export function getScenario(id: string): GameDayScenario | undefined {
  return scenarioStore.get(id);
}

export function listScenarios(): GameDayScenario[] {
  return Array.from(scenarioStore.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// --- Drill Lifecycle --------------------------------------------------------

export function scheduleDrill(input: {
  name: string;
  type: DrillType;
  primaryRegion: string;
  failoverRegion: string;
  scheduledAt?: string;
  rtoTargetSec?: number;
  rpoTargetSec?: number;
}, actor: string): DrDrill {
  const stepTemplates = input.type === "switchback" ? SWITCHBACK_STEPS : FAILOVER_STEPS;

  const drill: DrDrill = {
    id: randomUUID(),
    name: input.name,
    type: input.type,
    status: "scheduled",
    grade: null,
    primaryRegion: input.primaryRegion,
    failoverRegion: input.failoverRegion,
    scheduledAt: input.scheduledAt || new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    rtoTargetSec: input.rtoTargetSec || 300,
    rpoTargetSec: input.rpoTargetSec || 60,
    rtoActualSec: null,
    rpoActualSec: null,
    steps: stepTemplates.map((s, i) => ({
      seq: i + 1,
      name: s.name,
      status: "pending" as const,
      startedAt: null,
      completedAt: null,
      durationMs: null,
      detail: null,
    })),
    findings: [],
    createdBy: actor,
    createdAt: new Date().toISOString(),
  };

  drillStore.set(drill.id, drill);
  appendAudit("drill.scheduled", actor, { drillId: drill.id, type: drill.type, primary: drill.primaryRegion, failover: drill.failoverRegion });
  return drill;
}

export function startDrill(drillId: string, actor: string): DrDrill {
  const drill = drillStore.get(drillId);
  if (!drill) throw Object.assign(new Error("Drill not found"), { statusCode: 404 });
  if (drill.status !== "scheduled") {
    throw Object.assign(new Error(`Cannot start drill in status: ${drill.status}`), { statusCode: 400 });
  }

  drill.status = "running";
  drill.startedAt = new Date().toISOString();
  drillStore.set(drillId, drill);
  appendAudit("drill.started", actor, { drillId });
  return drill;
}

export function advanceDrillStep(drillId: string, stepSeq: number, result: {
  status: "passed" | "failed" | "skipped";
  durationMs?: number;
  detail?: string;
}, actor: string): DrDrill {
  const drill = drillStore.get(drillId);
  if (!drill) throw Object.assign(new Error("Drill not found"), { statusCode: 404 });
  if (drill.status !== "running") {
    throw Object.assign(new Error("Drill is not running"), { statusCode: 400 });
  }

  const step = drill.steps.find((s) => s.seq === stepSeq);
  if (!step) throw Object.assign(new Error("Step not found"), { statusCode: 404 });

  step.status = result.status;
  step.startedAt = step.startedAt || new Date().toISOString();
  step.completedAt = new Date().toISOString();
  step.durationMs = result.durationMs ?? null;
  step.detail = result.detail ?? null;

  drillStore.set(drillId, drill);
  appendAudit("drill.step.advanced", actor, { drillId, stepSeq, status: result.status });
  return drill;
}

export function completeDrill(drillId: string, input: {
  rtoActualSec?: number;
  rpoActualSec?: number;
}, actor: string): DrDrill {
  const drill = drillStore.get(drillId);
  if (!drill) throw Object.assign(new Error("Drill not found"), { statusCode: 404 });
  if (drill.status !== "running") {
    throw Object.assign(new Error("Drill is not running"), { statusCode: 400 });
  }

  drill.status = "completed";
  drill.completedAt = new Date().toISOString();
  drill.rtoActualSec = input.rtoActualSec ?? null;
  drill.rpoActualSec = input.rpoActualSec ?? null;

  // Grade the drill
  drill.grade = gradeDrill(drill);

  drillStore.set(drillId, drill);
  appendAudit("drill.completed", actor, { drillId, grade: drill.grade, rtoActual: drill.rtoActualSec, rpoActual: drill.rpoActualSec });
  return drill;
}

function gradeDrill(drill: DrDrill): DrillGrade {
  const passedSteps = drill.steps.filter((s) => s.status === "passed").length;
  const totalSteps = drill.steps.length;
  const failedSteps = drill.steps.filter((s) => s.status === "failed").length;
  const criticalFindings = drill.findings.filter((f) => f.severity === "critical").length;

  // Immediate F for critical findings or >50% failed steps
  if (criticalFindings > 0 || failedSteps > totalSteps / 2) return "F";

  // RTO/RPO check -- null means not measured, treat as N/A (skip check)
  const rtoMet = drill.rtoActualSec === null || drill.rtoActualSec <= drill.rtoTargetSec;
  const rpoMet = drill.rpoActualSec === null || drill.rpoActualSec <= drill.rpoTargetSec;

  if (!rtoMet || !rpoMet) {
    // D if RTO/RPO missed but steps mostly passed
    if (passedSteps >= totalSteps * 0.8) return "D";
    return "F";
  }

  const passRate = passedSteps / totalSteps;
  if (passRate >= 1.0 && drill.findings.length === 0) return "A";
  if (passRate >= 0.9) return "B";
  if (passRate >= 0.7) return "C";
  return "D";
}

export function addDrillFinding(drillId: string, input: {
  severity: "low" | "medium" | "high" | "critical";
  category: string;
  description: string;
  recommendation: string;
}, actor: string): DrDrill {
  const drill = drillStore.get(drillId);
  if (!drill) throw Object.assign(new Error("Drill not found"), { statusCode: 404 });

  drill.findings.push({
    id: randomUUID(),
    severity: input.severity,
    category: input.category,
    description: input.description,
    recommendation: input.recommendation,
    detectedAt: new Date().toISOString(),
  });

  drillStore.set(drillId, drill);
  appendAudit("drill.finding.added", actor, { drillId, severity: input.severity, category: input.category });
  return drill;
}

export function cancelDrill(drillId: string, actor: string): DrDrill {
  const drill = drillStore.get(drillId);
  if (!drill) throw Object.assign(new Error("Drill not found"), { statusCode: 404 });
  if (drill.status === "completed" || drill.status === "cancelled") {
    throw Object.assign(new Error(`Cannot cancel drill in status: ${drill.status}`), { statusCode: 400 });
  }
  drill.status = "cancelled";
  drill.completedAt = new Date().toISOString();
  drillStore.set(drillId, drill);
  appendAudit("drill.cancelled", actor, { drillId });
  return drill;
}

export function getDrill(id: string): DrDrill | undefined {
  return drillStore.get(id);
}

export function listDrills(filters?: {
  type?: DrillType;
  status?: DrillStatus;
  region?: string;
}, limit = 50): DrDrill[] {
  let results = Array.from(drillStore.values());
  if (filters?.type) results = results.filter((d) => d.type === filters.type);
  if (filters?.status) results = results.filter((d) => d.status === filters.status);
  if (filters?.region) results = results.filter((d) => d.primaryRegion === filters.region || d.failoverRegion === filters.region);
  return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

// --- Evidence Packs ---------------------------------------------------------

export function generateEvidencePack(drillId: string, frameworks?: string[]): EvidencePack {
  const drill = drillStore.get(drillId);
  if (!drill) throw Object.assign(new Error("Drill not found"), { statusCode: 404 });
  if (drill.status !== "completed" && drill.status !== "failed") {
    throw Object.assign(new Error("Can only generate evidence for completed/failed drills"), { statusCode: 400 });
  }

  const passedSteps = drill.steps.filter((s) => s.status === "passed").length;
  const failedSteps = drill.steps.filter((s) => s.status === "failed").length;
  const criticalFindings = drill.findings.filter((f) => f.severity === "critical").length;

  const timeline: EvidencePack["timeline"] = [];
  if (drill.startedAt) timeline.push({ ts: drill.startedAt, event: "drill_started", detail: `Type: ${drill.type}` });
  for (const step of drill.steps) {
    if (step.completedAt) {
      timeline.push({ ts: step.completedAt, event: `step_${step.name}`, detail: `Status: ${step.status}${step.detail ? ` - ${step.detail}` : ""}` });
    }
  }
  for (const finding of drill.findings) {
    timeline.push({ ts: finding.detectedAt, event: "finding_detected", detail: `[${finding.severity}] ${finding.description}` });
  }
  if (drill.completedAt) timeline.push({ ts: drill.completedAt, event: "drill_completed", detail: `Grade: ${drill.grade}` });
  timeline.sort((a, b) => a.ts.localeCompare(b.ts));

  const pack: EvidencePack = {
    id: randomUUID(),
    drillId,
    generatedAt: new Date().toISOString(),
    complianceFrameworks: frameworks || ["SOC2", "HIPAA"],
    summary: {
      drillName: drill.name,
      type: drill.type,
      grade: drill.grade,
      rtoTarget: drill.rtoTargetSec,
      rtoActual: drill.rtoActualSec,
      rpoTarget: drill.rpoTargetSec,
      rpoActual: drill.rpoActualSec,
      totalSteps: drill.steps.length,
      passedSteps,
      failedSteps,
      findings: drill.findings.length,
      criticalFindings,
    },
    timeline,
    attestation: null,
  };

  evidenceStore.set(pack.id, pack);
  appendAudit("evidence.generated", "system", { packId: pack.id, drillId, frameworks: pack.complianceFrameworks });
  return pack;
}

export function getEvidencePack(id: string): EvidencePack | undefined {
  return evidenceStore.get(id);
}

export function listEvidencePacks(drillId?: string): EvidencePack[] {
  let results = Array.from(evidenceStore.values());
  if (drillId) results = results.filter((p) => p.drillId === drillId);
  return results.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
}

// --- Schedules --------------------------------------------------------------

export function createSchedule(input: {
  scenarioId: string;
  cronExpression: string;
  enabled?: boolean;
}): DrSchedule {
  const scenario = scenarioStore.get(input.scenarioId);
  if (!scenario) throw Object.assign(new Error("Scenario not found"), { statusCode: 404 });

  const schedule: DrSchedule = {
    id: randomUUID(),
    scenarioId: input.scenarioId,
    cronExpression: input.cronExpression,
    enabled: input.enabled ?? true,
    lastRunAt: null,
    nextRunAt: null,
    createdAt: new Date().toISOString(),
  };
  scheduleStore.set(schedule.id, schedule);
  return schedule;
}

export function listSchedules(): DrSchedule[] {
  return Array.from(scheduleStore.values());
}

export function toggleSchedule(scheduleId: string, enabled: boolean): DrSchedule {
  const schedule = scheduleStore.get(scheduleId);
  if (!schedule) throw Object.assign(new Error("Schedule not found"), { statusCode: 404 });
  schedule.enabled = enabled;
  scheduleStore.set(scheduleId, schedule);
  return schedule;
}

// --- Summary ----------------------------------------------------------------

export function getDrSummary(): {
  totalDrills: number;
  drillsByStatus: Record<string, number>;
  gradeDistribution: Record<string, number>;
  scenarios: number;
  evidencePacks: number;
  schedules: number;
  enabledSchedules: number;
} {
  const drillsByStatus: Record<string, number> = {};
  const gradeDistribution: Record<string, number> = {};
  for (const d of drillStore.values()) {
    drillsByStatus[d.status] = (drillsByStatus[d.status] || 0) + 1;
    if (d.grade) gradeDistribution[d.grade] = (gradeDistribution[d.grade] || 0) + 1;
  }

  let enabledSchedules = 0;
  for (const s of scheduleStore.values()) if (s.enabled) enabledSchedules++;

  return {
    totalDrills: drillStore.size,
    drillsByStatus,
    gradeDistribution,
    scenarios: scenarioStore.size,
    evidencePacks: evidenceStore.size,
    schedules: scheduleStore.size,
    enabledSchedules,
  };
}

// --- Audit ------------------------------------------------------------------

function appendAudit(action: string, actor: string, detail: Record<string, unknown>): void {
  auditLog.push({ ts: new Date().toISOString(), action, actor, detail });
  if (auditLog.length > MAX_AUDIT) auditLog.splice(0, auditLog.length - MAX_AUDIT);
}

export function getDrAuditLog(limit = 100, offset = 0): typeof auditLog {
  return auditLog.slice().reverse().slice(offset, offset + limit);
}
