/**
 * Phase 396 (W22-P8): Clinical Reasoning + Quality Measures -- Store
 *
 * In-memory stores for:
 *   - CQL library catalog
 *   - Quality measure definitions
 *   - Measure evaluation results
 *   - Patient-level measure results
 *   - PlanDefinition / ActivityDefinition
 *   - Measure reports
 */

import type {
  ActivityDefinition,
  ClinicalReasoningDashboardStats,
  CqlLibrary,
  MeasureEvalResult,
  MeasureReport,
  PatientMeasureResult,
  PlanDefinition,
  QualityMeasure,
} from "./types.js";
import { randomBytes } from "crypto";

const MAX_ITEMS = 10_000;

// ---- CQL Libraries ----

const cqlLibraries = new Map<string, CqlLibrary>();

export function listCqlLibraries(tenantId?: string): CqlLibrary[] {
  const all = [...cqlLibraries.values()];
  return tenantId ? all.filter((l) => l.tenantId === tenantId) : all;
}

export function getCqlLibrary(id: string): CqlLibrary | undefined {
  return cqlLibraries.get(id);
}

export function createCqlLibrary(
  lib: Omit<CqlLibrary, "id" | "createdAt" | "updatedAt">
): CqlLibrary {
  if (cqlLibraries.size >= MAX_ITEMS) throw new Error("CQL library store full");
  // Check for duplicate name+version
  for (const existing of cqlLibraries.values()) {
    if (existing.tenantId === lib.tenantId && existing.name === lib.name && existing.version === lib.version) {
      throw new Error(`CQL library ${lib.name} v${lib.version} already exists`);
    }
  }
  const now = new Date().toISOString();
  const created: CqlLibrary = {
    ...lib,
    id: randomBytes(12).toString("hex"),
    createdAt: now,
    updatedAt: now,
  };
  cqlLibraries.set(created.id, created);
  return created;
}

export function updateCqlLibrary(
  id: string,
  patch: Partial<Omit<CqlLibrary, "id" | "createdAt" | "updatedAt" | "tenantId">>
): CqlLibrary | undefined {
  const existing = cqlLibraries.get(id);
  if (!existing) return undefined;
  const updated: CqlLibrary = {
    ...existing,
    ...patch,
    id: existing.id,
    tenantId: existing.tenantId,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  cqlLibraries.set(id, updated);
  return updated;
}

export function deleteCqlLibrary(id: string): boolean {
  return cqlLibraries.delete(id);
}

// ---- Quality Measures ----

const qualityMeasures = new Map<string, QualityMeasure>();

export function listQualityMeasures(tenantId?: string): QualityMeasure[] {
  const all = [...qualityMeasures.values()];
  return tenantId ? all.filter((m) => m.tenantId === tenantId) : all;
}

export function getQualityMeasure(id: string): QualityMeasure | undefined {
  return qualityMeasures.get(id);
}

export function createQualityMeasure(
  measure: Omit<QualityMeasure, "id" | "createdAt" | "updatedAt">
): QualityMeasure {
  if (qualityMeasures.size >= MAX_ITEMS) throw new Error("Quality measure store full");
  const now = new Date().toISOString();
  const created: QualityMeasure = {
    ...measure,
    id: randomBytes(12).toString("hex"),
    createdAt: now,
    updatedAt: now,
  };
  qualityMeasures.set(created.id, created);
  return created;
}

export function updateQualityMeasure(
  id: string,
  patch: Partial<Omit<QualityMeasure, "id" | "createdAt" | "updatedAt" | "tenantId">>
): QualityMeasure | undefined {
  const existing = qualityMeasures.get(id);
  if (!existing) return undefined;
  const updated: QualityMeasure = {
    ...existing,
    ...patch,
    id: existing.id,
    tenantId: existing.tenantId,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  qualityMeasures.set(id, updated);
  return updated;
}

export function deleteQualityMeasure(id: string): boolean {
  return qualityMeasures.delete(id);
}

// ---- Measure Evaluation Results ----

const measureEvalResults = new Map<string, MeasureEvalResult>();

export function listMeasureEvalResults(tenantId?: string): MeasureEvalResult[] {
  const all = [...measureEvalResults.values()];
  return tenantId ? all.filter((r) => r.tenantId === tenantId) : all;
}

export function getMeasureEvalResult(id: string): MeasureEvalResult | undefined {
  return measureEvalResults.get(id);
}

/**
 * Start a measure evaluation (simulated).
 * In production: this would call CQF Ruler or the native engine.
 */
export function startMeasureEvaluation(
  tenantId: string,
  measureId: string,
  periodStart: string,
  periodEnd: string
): MeasureEvalResult {
  if (measureEvalResults.size >= MAX_ITEMS) throw new Error("Measure eval store full");
  const now = new Date().toISOString();
  const result: MeasureEvalResult = {
    id: randomBytes(12).toString("hex"),
    tenantId,
    measureId,
    evaluatedAt: now,
    periodStart,
    periodEnd,
    populations: [],
    performanceRate: null,
    totalPatients: 0,
    status: "pending",
    error: null,
    durationMs: null,
  };
  measureEvalResults.set(result.id, result);

  // Simulate async evaluation
  const startMs = Date.now();
  setTimeout(() => {
    const existing = measureEvalResults.get(result.id);
    if (!existing || existing.status !== "pending") return;

    const measure = qualityMeasures.get(measureId);
    if (!measure) {
      measureEvalResults.set(result.id, {
        ...existing,
        status: "failed",
        error: "Measure not found",
        durationMs: Date.now() - startMs,
      });
      return;
    }

    // Stub evaluation: generate placeholder population counts
    const totalPop = Math.floor(Math.random() * 500) + 100;
    const denominator = Math.floor(totalPop * 0.8);
    const numerator = Math.floor(denominator * (0.5 + Math.random() * 0.4));
    const denomExclusion = Math.floor(totalPop * 0.05);

    const populations = measure.populations.map((pop) => {
      switch (pop.code) {
        case "initial-population":
          return { code: pop.code, count: totalPop, memberDfns: [] };
        case "denominator":
          return { code: pop.code, count: denominator, memberDfns: [] };
        case "denominator-exclusion":
          return { code: pop.code, count: denomExclusion, memberDfns: [] };
        case "numerator":
          return { code: pop.code, count: numerator, memberDfns: [] };
        default:
          return { code: pop.code, count: 0, memberDfns: [] };
      }
    });

    measureEvalResults.set(result.id, {
      ...existing,
      status: "completed",
      populations,
      totalPatients: totalPop,
      performanceRate: denominator > 0 ? numerator / denominator : null,
      durationMs: Date.now() - startMs,
    });
  }, 500);

  return result;
}

// ---- Patient-Level Measure Results ----

const patientMeasureResults = new Map<string, PatientMeasureResult>();

export function listPatientMeasureResults(
  tenantId: string,
  filters?: { measureId?: string; patientDfn?: string }
): PatientMeasureResult[] {
  let results = [...patientMeasureResults.values()].filter(
    (r) => r.tenantId === tenantId
  );
  if (filters?.measureId) {
    results = results.filter((r) => r.measureId === filters.measureId);
  }
  if (filters?.patientDfn) {
    results = results.filter((r) => r.patientDfn === filters.patientDfn);
  }
  return results;
}

export function createPatientMeasureResult(
  result: Omit<PatientMeasureResult, "id" | "evaluatedAt">
): PatientMeasureResult {
  if (patientMeasureResults.size >= MAX_ITEMS) throw new Error("Patient measure result store full");
  const created: PatientMeasureResult = {
    ...result,
    id: randomBytes(12).toString("hex"),
    evaluatedAt: new Date().toISOString(),
  };
  patientMeasureResults.set(created.id, created);
  return created;
}

// ---- Plan Definitions ----

const planDefinitions = new Map<string, PlanDefinition>();

export function listPlanDefinitions(tenantId?: string): PlanDefinition[] {
  const all = [...planDefinitions.values()];
  return tenantId ? all.filter((p) => p.tenantId === tenantId) : all;
}

export function getPlanDefinition(id: string): PlanDefinition | undefined {
  return planDefinitions.get(id);
}

export function createPlanDefinition(
  plan: Omit<PlanDefinition, "id" | "createdAt" | "updatedAt">
): PlanDefinition {
  if (planDefinitions.size >= MAX_ITEMS) throw new Error("PlanDefinition store full");
  const now = new Date().toISOString();
  const created: PlanDefinition = {
    ...plan,
    id: randomBytes(12).toString("hex"),
    createdAt: now,
    updatedAt: now,
  };
  planDefinitions.set(created.id, created);
  return created;
}

export function updatePlanDefinition(
  id: string,
  patch: Partial<Omit<PlanDefinition, "id" | "createdAt" | "updatedAt" | "tenantId">>
): PlanDefinition | undefined {
  const existing = planDefinitions.get(id);
  if (!existing) return undefined;
  const updated: PlanDefinition = {
    ...existing,
    ...patch,
    id: existing.id,
    tenantId: existing.tenantId,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  planDefinitions.set(id, updated);
  return updated;
}

export function deletePlanDefinition(id: string): boolean {
  return planDefinitions.delete(id);
}

// ---- Activity Definitions ----

const activityDefinitions = new Map<string, ActivityDefinition>();

export function listActivityDefinitions(tenantId?: string): ActivityDefinition[] {
  const all = [...activityDefinitions.values()];
  return tenantId ? all.filter((a) => a.tenantId === tenantId) : all;
}

export function getActivityDefinition(id: string): ActivityDefinition | undefined {
  return activityDefinitions.get(id);
}

export function createActivityDefinition(
  def: Omit<ActivityDefinition, "id" | "createdAt" | "updatedAt">
): ActivityDefinition {
  if (activityDefinitions.size >= MAX_ITEMS) throw new Error("ActivityDefinition store full");
  const now = new Date().toISOString();
  const created: ActivityDefinition = {
    ...def,
    id: randomBytes(12).toString("hex"),
    createdAt: now,
    updatedAt: now,
  };
  activityDefinitions.set(created.id, created);
  return created;
}

export function updateActivityDefinition(
  id: string,
  patch: Partial<Omit<ActivityDefinition, "id" | "createdAt" | "updatedAt" | "tenantId">>
): ActivityDefinition | undefined {
  const existing = activityDefinitions.get(id);
  if (!existing) return undefined;
  const updated: ActivityDefinition = {
    ...existing,
    ...patch,
    id: existing.id,
    tenantId: existing.tenantId,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  activityDefinitions.set(id, updated);
  return updated;
}

export function deleteActivityDefinition(id: string): boolean {
  return activityDefinitions.delete(id);
}

// ---- Measure Reports ----

const measureReports = new Map<string, MeasureReport>();

export function listMeasureReports(tenantId?: string): MeasureReport[] {
  const all = [...measureReports.values()];
  return tenantId ? all.filter((r) => r.tenantId === tenantId) : all;
}

export function getMeasureReport(id: string): MeasureReport | undefined {
  return measureReports.get(id);
}

export function generateMeasureReport(
  tenantId: string,
  evalResultId: string,
  reportType: MeasureReport["reportType"],
  qrdaVersion: MeasureReport["qrdaVersion"]
): MeasureReport | undefined {
  const evalResult = measureEvalResults.get(evalResultId);
  if (!evalResult || evalResult.status !== "completed") return undefined;

  if (measureReports.size >= MAX_ITEMS) throw new Error("Measure report store full");

  const report: MeasureReport = {
    id: randomBytes(12).toString("hex"),
    tenantId,
    measureId: evalResult.measureId,
    reportType,
    periodStart: evalResult.periodStart,
    periodEnd: evalResult.periodEnd,
    populations: evalResult.populations,
    performanceRate: evalResult.performanceRate,
    generatedAt: new Date().toISOString(),
    qrdaVersion,
    exportStatus: "generated",
  };
  measureReports.set(report.id, report);
  return report;
}

// ---- Dashboard Stats ----

export function getClinicalReasoningDashboardStats(
  tenantId: string
): ClinicalReasoningDashboardStats {
  const libs = listCqlLibraries(tenantId);
  const measures = listQualityMeasures(tenantId);
  const evals = listMeasureEvalResults(tenantId);
  const plans = listPlanDefinitions(tenantId);
  const activities = listActivityDefinitions(tenantId);
  const reports = listMeasureReports(tenantId);

  const completedEvals = evals.filter((e) => e.status === "completed");
  const rates = completedEvals
    .map((e) => e.performanceRate)
    .filter((r): r is number => r !== null);

  return {
    totalLibraries: libs.length,
    activeLibraries: libs.filter((l) => l.status === "active").length,
    totalMeasures: measures.length,
    activeMeasures: measures.filter((m) => m.status === "active").length,
    totalEvaluations: evals.length,
    completedEvaluations: completedEvals.length,
    failedEvaluations: evals.filter((e) => e.status === "failed").length,
    totalPlanDefinitions: plans.length,
    totalActivityDefinitions: activities.length,
    totalReports: reports.length,
    averagePerformanceRate:
      rates.length > 0
        ? rates.reduce((a, b) => a + b, 0) / rates.length
        : null,
  };
}
