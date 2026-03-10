/**
 * scale-performance.ts -- Scale Performance Campaign Service
 *
 * Phase 334 (W15-P8)
 *
 * Multi-region load test profiles, SLO definitions, latency/error budget
 * tracking, performance campaign orchestration, and regression detection.
 */

import { randomUUID } from "node:crypto";

// --- Types ------------------------------------------------------------------

export type LoadTestStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
export type SloStatus = "met" | "at_risk" | "breached" | "unknown";

export interface LoadTestProfile {
  id: string;
  name: string;
  description: string;
  targetRegions: string[];
  endpoints: LoadTestEndpoint[];
  vus: number;                    // virtual users
  durationSec: number;
  rampUpSec: number;
  thresholds: {
    p95LatencyMs: number;
    p99LatencyMs: number;
    maxErrorRate: number;         // 0-1
    minRps: number;
  };
  tags: Record<string, string>;
  createdAt: string;
}

export interface LoadTestEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  weight: number;                 // relative traffic weight
  expectedStatus: number;
  bodyTemplate?: string;
}

export interface LoadTestRun {
  id: string;
  profileId: string;
  profileName: string;
  status: LoadTestStatus;
  region: string;
  startedAt: string | null;
  completedAt: string | null;
  results: LoadTestResults | null;
  verdict: "pass" | "fail" | "degraded" | null;
  notes: string | null;
  runBy: string;
  createdAt: string;
}

export interface LoadTestResults {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  errorRate: number;
  rps: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  maxLatencyMs: number;
  durationSec: number;
  byEndpoint: Array<{
    path: string;
    requests: number;
    errorRate: number;
    p95LatencyMs: number;
  }>;
}

export interface SloDefinition {
  id: string;
  name: string;
  description: string;
  service: string;
  metric: string;                 // e.g., "latency_p95", "error_rate", "availability"
  target: number;                 // e.g., 0.999 for 99.9% or 200 for 200ms p95
  unit: string;                   // "percent", "ms", "ratio"
  window: string;                 // "30d", "7d", "24h"
  status: SloStatus;
  currentValue: number | null;
  errorBudgetTotal: number;       // total allowed error budget
  errorBudgetRemaining: number;
  lastEvaluatedAt: string | null;
  createdAt: string;
}

export interface PerformanceCampaign {
  id: string;
  name: string;
  description: string;
  status: "planning" | "active" | "completed" | "paused";
  profileIds: string[];
  sloIds: string[];
  targetRegions: string[];
  startDate: string;
  endDate: string | null;
  milestones: CampaignMilestone[];
  createdAt: string;
}

export interface CampaignMilestone {
  id: string;
  name: string;
  targetDate: string;
  completedAt: string | null;
  status: "pending" | "completed" | "missed";
  criteria: string;
}

export interface PerformanceRegression {
  id: string;
  runId: string;
  metric: string;
  previousValue: number;
  currentValue: number;
  regressionPct: number;       // % degradation
  severity: "minor" | "moderate" | "severe";
  detectedAt: string;
}

// --- In-Memory Stores -------------------------------------------------------

const profileStore = new Map<string, LoadTestProfile>();
const runStore = new Map<string, LoadTestRun>();
const sloStore = new Map<string, SloDefinition>();
const campaignStore = new Map<string, PerformanceCampaign>();
const regressionStore = new Map<string, PerformanceRegression>();

const auditLog: Array<{ ts: string; action: string; actor: string; detail: Record<string, unknown> }> = [];
const MAX_AUDIT = 10_000;

// --- Load Test Profiles -----------------------------------------------------

export function createProfile(input: {
  name: string;
  description?: string;
  targetRegions: string[];
  endpoints: LoadTestEndpoint[];
  vus?: number;
  durationSec?: number;
  rampUpSec?: number;
  thresholds?: Partial<LoadTestProfile["thresholds"]>;
  tags?: Record<string, string>;
}, actor: string): LoadTestProfile {
  const profile: LoadTestProfile = {
    id: randomUUID(),
    name: input.name,
    description: input.description || "",
    targetRegions: input.targetRegions,
    endpoints: input.endpoints,
    vus: input.vus || 50,
    durationSec: input.durationSec || 300,
    rampUpSec: input.rampUpSec || 30,
    thresholds: {
      p95LatencyMs: input.thresholds?.p95LatencyMs || 500,
      p99LatencyMs: input.thresholds?.p99LatencyMs || 1000,
      maxErrorRate: input.thresholds?.maxErrorRate || 0.01,
      minRps: input.thresholds?.minRps || 100,
    },
    tags: input.tags || {},
    createdAt: new Date().toISOString(),
  };
  profileStore.set(profile.id, profile);
  appendAudit("profile.created", actor, { profileId: profile.id, name: profile.name });
  return profile;
}

export function getProfile(id: string): LoadTestProfile | undefined {
  return profileStore.get(id);
}

export function listProfiles(): LoadTestProfile[] {
  return Array.from(profileStore.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// --- Load Test Runs ---------------------------------------------------------

export function startRun(profileId: string, region: string, actor: string): LoadTestRun {
  const profile = profileStore.get(profileId);
  if (!profile) throw Object.assign(new Error("Profile not found"), { statusCode: 404 });

  const run: LoadTestRun = {
    id: randomUUID(),
    profileId,
    profileName: profile.name,
    status: "running",
    region,
    startedAt: new Date().toISOString(),
    completedAt: null,
    results: null,
    verdict: null,
    notes: null,
    runBy: actor,
    createdAt: new Date().toISOString(),
  };

  runStore.set(run.id, run);
  appendAudit("run.started", actor, { runId: run.id, profileId, region });
  return run;
}

export function completeRun(runId: string, results: LoadTestResults, actor: string): LoadTestRun {
  const run = runStore.get(runId);
  if (!run) throw Object.assign(new Error("Run not found"), { statusCode: 404 });
  if (run.status !== "running") {
    throw Object.assign(new Error(`Cannot complete run in status: ${run.status}`), { statusCode: 400 });
  }

  const profile = profileStore.get(run.profileId);
  run.status = "completed";
  run.completedAt = new Date().toISOString();
  run.results = results;

  // Determine verdict
  if (profile) {
    const t = profile.thresholds;
    const p95Ok = results.p95LatencyMs <= t.p95LatencyMs;
    const p99Ok = results.p99LatencyMs <= t.p99LatencyMs;
    const errorOk = results.errorRate <= t.maxErrorRate;
    const rpsOk = results.rps >= t.minRps;

    if (p95Ok && p99Ok && errorOk && rpsOk) {
      run.verdict = "pass";
    } else if (errorOk && rpsOk) {
      run.verdict = "degraded";
    } else {
      run.verdict = "fail";
    }
  } else {
    run.verdict = "pass";
  }

  runStore.set(runId, run);

  // Check for regressions against previous runs
  detectRegressions(run);

  appendAudit("run.completed", actor, { runId, verdict: run.verdict, rps: results.rps, p95: results.p95LatencyMs, errorRate: results.errorRate });
  return run;
}

export function cancelRun(runId: string, actor: string): LoadTestRun {
  const run = runStore.get(runId);
  if (!run) throw Object.assign(new Error("Run not found"), { statusCode: 404 });
  run.status = "cancelled";
  run.completedAt = new Date().toISOString();
  runStore.set(runId, run);
  appendAudit("run.cancelled", actor, { runId });
  return run;
}

export function getRun(id: string): LoadTestRun | undefined {
  return runStore.get(id);
}

export function listRuns(filters?: {
  profileId?: string;
  status?: LoadTestStatus;
  region?: string;
}, limit = 50): LoadTestRun[] {
  let results = Array.from(runStore.values());
  if (filters?.profileId) results = results.filter((r) => r.profileId === filters.profileId);
  if (filters?.status) results = results.filter((r) => r.status === filters.status);
  if (filters?.region) results = results.filter((r) => r.region === filters.region);
  return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

// --- Regression Detection ---------------------------------------------------

function detectRegressions(run: LoadTestRun): void {
  if (!run.results) return;

  // Find previous completed run for same profile+region
  const previous = Array.from(runStore.values())
    .filter((r) => r.id !== run.id && r.profileId === run.profileId && r.region === run.region && r.status === "completed" && r.results)
    .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""))
    [0];

  if (!previous?.results) return;

  const checks: Array<{ metric: string; prev: number; curr: number }> = [
    { metric: "p95_latency_ms", prev: previous.results.p95LatencyMs, curr: run.results.p95LatencyMs },
    { metric: "p99_latency_ms", prev: previous.results.p99LatencyMs, curr: run.results.p99LatencyMs },
    { metric: "error_rate", prev: previous.results.errorRate, curr: run.results.errorRate },
  ];

  for (const c of checks) {
    if (c.prev === 0) continue;
    const pct = ((c.curr - c.prev) / c.prev) * 100;
    if (pct <= 10) continue; // less than 10% degradation is noise

    const severity = pct >= 50 ? "severe" : pct >= 25 ? "moderate" : "minor";

    const regression: PerformanceRegression = {
      id: randomUUID(),
      runId: run.id,
      metric: c.metric,
      previousValue: c.prev,
      currentValue: c.curr,
      regressionPct: Math.round(pct * 100) / 100,
      severity,
      detectedAt: new Date().toISOString(),
    };
    regressionStore.set(regression.id, regression);
  }
}

export function listRegressions(filters?: { runId?: string; severity?: string }, limit = 100): PerformanceRegression[] {
  let results = Array.from(regressionStore.values());
  if (filters?.runId) results = results.filter((r) => r.runId === filters.runId);
  if (filters?.severity) results = results.filter((r) => r.severity === filters.severity);
  return results.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt)).slice(0, limit);
}

// --- SLO Management ---------------------------------------------------------

export function defineSlo(input: {
  name: string;
  description?: string;
  service: string;
  metric: string;
  target: number;
  unit: string;
  window?: string;
  errorBudgetTotal?: number;
}, actor: string): SloDefinition {
  const slo: SloDefinition = {
    id: randomUUID(),
    name: input.name,
    description: input.description || "",
    service: input.service,
    metric: input.metric,
    target: input.target,
    unit: input.unit,
    window: input.window || "30d",
    status: "unknown",
    currentValue: null,
    errorBudgetTotal: input.errorBudgetTotal || 100,
    errorBudgetRemaining: input.errorBudgetTotal || 100,
    lastEvaluatedAt: null,
    createdAt: new Date().toISOString(),
  };
  sloStore.set(slo.id, slo);
  appendAudit("slo.defined", actor, { sloId: slo.id, name: slo.name, target: slo.target });
  return slo;
}

export function evaluateSlo(sloId: string, currentValue: number): SloDefinition {
  const slo = sloStore.get(sloId);
  if (!slo) throw Object.assign(new Error("SLO not found"), { statusCode: 404 });

  slo.currentValue = currentValue;
  slo.lastEvaluatedAt = new Date().toISOString();

  // Status determination depends on metric type
  // For "availability" or "ratio" metrics: higher is better, target is minimum
  // For "latency" metrics: lower is better, target is maximum
  const isLatencyMetric = slo.metric.includes("latency") || slo.unit === "ms";
  const meetsTarget = isLatencyMetric ? currentValue <= slo.target : currentValue >= slo.target;

  if (meetsTarget) {
    slo.status = "met";
  } else {
    // Check error budget
    const budgetUsed = isLatencyMetric
      ? ((currentValue - slo.target) / slo.target) * 100
      : ((slo.target - currentValue) / slo.target) * 100;
    slo.errorBudgetRemaining = Math.max(0, slo.errorBudgetTotal - budgetUsed);

    if (slo.errorBudgetRemaining <= 0) {
      slo.status = "breached";
    } else if (slo.errorBudgetRemaining < slo.errorBudgetTotal * 0.2) {
      slo.status = "at_risk";
    } else {
      slo.status = "met";
    }
  }

  sloStore.set(sloId, slo);
  return slo;
}

export function getSlo(id: string): SloDefinition | undefined {
  return sloStore.get(id);
}

export function listSlos(filters?: { service?: string; status?: SloStatus }): SloDefinition[] {
  let results = Array.from(sloStore.values());
  if (filters?.service) results = results.filter((s) => s.service === filters.service);
  if (filters?.status) results = results.filter((s) => s.status === filters.status);
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

// --- Campaigns --------------------------------------------------------------

export function createCampaign(input: {
  name: string;
  description?: string;
  profileIds: string[];
  sloIds: string[];
  targetRegions: string[];
  startDate: string;
  endDate?: string;
  milestones?: Array<{ name: string; targetDate: string; criteria: string }>;
}, actor: string): PerformanceCampaign {
  const campaign: PerformanceCampaign = {
    id: randomUUID(),
    name: input.name,
    description: input.description || "",
    status: "planning",
    profileIds: input.profileIds,
    sloIds: input.sloIds,
    targetRegions: input.targetRegions,
    startDate: input.startDate,
    endDate: input.endDate || null,
    milestones: (input.milestones || []).map((m) => ({
      id: randomUUID(),
      name: m.name,
      targetDate: m.targetDate,
      completedAt: null,
      status: "pending" as const,
      criteria: m.criteria,
    })),
    createdAt: new Date().toISOString(),
  };
  campaignStore.set(campaign.id, campaign);
  appendAudit("campaign.created", actor, { campaignId: campaign.id, name: campaign.name });
  return campaign;
}

export function updateCampaignStatus(campaignId: string, status: PerformanceCampaign["status"], actor: string): PerformanceCampaign {
  const campaign = campaignStore.get(campaignId);
  if (!campaign) throw Object.assign(new Error("Campaign not found"), { statusCode: 404 });
  campaign.status = status;
  campaignStore.set(campaignId, campaign);
  appendAudit("campaign.status.updated", actor, { campaignId, status });
  return campaign;
}

export function getCampaign(id: string): PerformanceCampaign | undefined {
  return campaignStore.get(id);
}

export function listCampaigns(): PerformanceCampaign[] {
  return Array.from(campaignStore.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// --- Summary ----------------------------------------------------------------

export function getPerformanceSummary(): {
  profiles: number;
  totalRuns: number;
  runsByVerdict: Record<string, number>;
  slos: number;
  slosByStatus: Record<string, number>;
  campaigns: number;
  activeCampaigns: number;
  regressions: number;
  severeRegressions: number;
} {
  const runsByVerdict: Record<string, number> = {};
  for (const r of runStore.values()) {
    const v = r.verdict || "pending";
    runsByVerdict[v] = (runsByVerdict[v] || 0) + 1;
  }

  const slosByStatus: Record<string, number> = {};
  for (const s of sloStore.values()) {
    slosByStatus[s.status] = (slosByStatus[s.status] || 0) + 1;
  }

  let activeCampaigns = 0;
  for (const c of campaignStore.values()) if (c.status === "active") activeCampaigns++;

  let severeRegressions = 0;
  for (const r of regressionStore.values()) if (r.severity === "severe") severeRegressions++;

  return {
    profiles: profileStore.size,
    totalRuns: runStore.size,
    runsByVerdict,
    slos: sloStore.size,
    slosByStatus,
    campaigns: campaignStore.size,
    activeCampaigns,
    regressions: regressionStore.size,
    severeRegressions,
  };
}

// --- Audit ------------------------------------------------------------------

function appendAudit(action: string, actor: string, detail: Record<string, unknown>): void {
  auditLog.push({ ts: new Date().toISOString(), action, actor, detail });
  if (auditLog.length > MAX_AUDIT) auditLog.splice(0, auditLog.length - MAX_AUDIT);
}

export function getPerformanceAuditLog(limit = 100, offset = 0): typeof auditLog {
  return auditLog.slice().reverse().slice(offset, offset + limit);
}
