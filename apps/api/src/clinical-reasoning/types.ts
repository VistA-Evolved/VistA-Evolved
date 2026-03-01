/**
 * Phase 396 (W22-P8): Clinical Reasoning + Quality Measures -- Types
 *
 * Implements:
 *   - CQL (Clinical Quality Language) library management
 *   - Quality measure definitions (eCQM / HEDIS / UDS)
 *   - Measure evaluation pipeline (initial population -> denominator -> numerator)
 *   - Patient-level measure results
 *   - Clinical reasoning resources (PlanDefinition, ActivityDefinition)
 *   - Measure reporting (QRDA I/III compatible)
 *
 * Dependencies:
 *   - Phase 395 (W22-P7): CDS Hooks + CQF Ruler adapter
 *   - Phase 390 (W22-P2): Content pack CDS rule definitions
 */

// -- CQL Library Management --

export interface CqlLibrary {
  id: string;
  tenantId: string;
  name: string;
  version: string;
  /** CQL source text */
  cqlSource: string;
  /** ELM (Expression Logical Model) JSON -- compiled CQL */
  elmJson: string | null;
  /** Library status */
  status: "draft" | "active" | "retired";
  /** Dependencies (other library references) */
  dependencies: Array<{ name: string; version: string }>;
  /** Value sets referenced */
  valueSetRefs: string[];
  createdAt: string;
  updatedAt: string;
}

// -- Quality Measure Definitions --

export type MeasureScoring = "proportion" | "ratio" | "continuous-variable" | "cohort";

export type MeasureType = "process" | "outcome" | "structure" | "composite" | "patient-reported";

export type ReportingProgram = "eCQM" | "HEDIS" | "UDS" | "MIPS" | "custom";

export interface MeasurePopulation {
  code: "initial-population" | "denominator" | "denominator-exclusion" | "denominator-exception" | "numerator" | "numerator-exclusion" | "measure-population" | "measure-observation";
  /** CQL expression name for this population */
  cqlExpression: string;
  description: string;
}

export interface QualityMeasure {
  id: string;
  tenantId: string;
  /** CMS measure ID (e.g., CMS122v12) or HEDIS code */
  measureId: string;
  name: string;
  description: string;
  /** Scoring type */
  scoring: MeasureScoring;
  /** Measure type */
  type: MeasureType;
  /** Reporting program */
  program: ReportingProgram;
  /** CQL library used for evaluation */
  cqlLibraryId: string;
  /** Population criteria */
  populations: MeasurePopulation[];
  /** Measurement period (ISO date range) */
  measurementPeriodStart: string;
  measurementPeriodEnd: string;
  /** Improvement notation */
  improvementNotation: "increase" | "decrease";
  /** Active / draft / retired */
  status: "draft" | "active" | "retired";
  /** Content pack that installed this measure */
  contentPackId: string | null;
  createdAt: string;
  updatedAt: string;
}

// -- Measure Evaluation Results --

export interface PopulationResult {
  code: string;
  count: number;
  /** Patient DFNs in this population (for patient-level) */
  memberDfns: string[];
}

export interface MeasureEvalResult {
  id: string;
  tenantId: string;
  measureId: string;
  /** Evaluation timestamp */
  evaluatedAt: string;
  /** Measurement period */
  periodStart: string;
  periodEnd: string;
  /** Population results */
  populations: PopulationResult[];
  /** Performance rate (numerator/denominator) */
  performanceRate: number | null;
  /** Total patients evaluated */
  totalPatients: number;
  /** Evaluation status */
  status: "pending" | "running" | "completed" | "failed";
  /** Error message if failed */
  error: string | null;
  /** Duration in ms */
  durationMs: number | null;
}

// -- Patient-Level Measure Result --

export interface PatientMeasureResult {
  id: string;
  tenantId: string;
  measureId: string;
  patientDfn: string;
  /** Which populations this patient falls into */
  populationMembership: Record<string, boolean>;
  /** Evaluation period */
  periodStart: string;
  periodEnd: string;
  /** Evaluation notes */
  notes: string | null;
  evaluatedAt: string;
}

// -- Clinical Reasoning Resources --

export type PlanDefinitionStatus = "draft" | "active" | "retired" | "unknown";

export interface PlanDefinitionAction {
  id: string;
  title: string;
  description: string;
  /** Condition for action (CQL expression ref) */
  conditionExpression: string | null;
  /** Type: create order, recommend, alert */
  type: "create" | "update" | "remove" | "fire-event" | "recommend";
  /** Resource type to act on */
  resourceType: string | null;
  /** Sub-actions */
  subActions: PlanDefinitionAction[];
}

export interface PlanDefinition {
  id: string;
  tenantId: string;
  name: string;
  title: string;
  description: string;
  status: PlanDefinitionStatus;
  /** CQL library for condition evaluation */
  cqlLibraryId: string | null;
  /** Actions in this plan */
  actions: PlanDefinitionAction[];
  /** Goal descriptions */
  goals: Array<{ description: string; priority: "high" | "medium" | "low" }>;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityDefinition {
  id: string;
  tenantId: string;
  name: string;
  title: string;
  description: string;
  status: PlanDefinitionStatus;
  /** What kind of activity */
  kind: "MedicationRequest" | "ServiceRequest" | "CommunicationRequest" | "Task" | "Procedure";
  /** CQL library for dynamic values */
  cqlLibraryId: string | null;
  /** Dynamic value expressions */
  dynamicValues: Array<{ path: string; expression: string }>;
  createdAt: string;
  updatedAt: string;
}

// -- Measure Report (QRDA-compatible output) --

export type ReportType = "individual" | "subject-list" | "summary" | "data-collection";

export interface MeasureReport {
  id: string;
  tenantId: string;
  measureId: string;
  reportType: ReportType;
  /** Period covered */
  periodStart: string;
  periodEnd: string;
  /** Aggregate population counts */
  populations: PopulationResult[];
  /** Performance rate */
  performanceRate: number | null;
  /** Generated timestamp */
  generatedAt: string;
  /** QRDA format version for export */
  qrdaVersion: "QRDA-I" | "QRDA-III" | null;
  /** Export status */
  exportStatus: "pending" | "generated" | "submitted";
}

// -- Dashboard Stats --

export interface ClinicalReasoningDashboardStats {
  totalLibraries: number;
  activeLibraries: number;
  totalMeasures: number;
  activeMeasures: number;
  totalEvaluations: number;
  completedEvaluations: number;
  failedEvaluations: number;
  totalPlanDefinitions: number;
  totalActivityDefinitions: number;
  totalReports: number;
  averagePerformanceRate: number | null;
}
