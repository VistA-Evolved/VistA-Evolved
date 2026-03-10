/**
 * Integration Onboarding Service
 *
 * Phase 325 (W14-P9): Guided onboarding wizard for integration partners.
 * Provides step-by-step setup, prerequisite validation, environment
 * provisioning, and go-live readiness checks.
 *
 * Architecture:
 *  1. OnboardingTemplate -- reusable step-by-step templates per integration type
 *  2. OnboardingSession -- active partner onboarding progress
 *  3. StepValidator -- prerequisite/environment checks per step
 *  4. ReadinessCheck -- final go-live validation before production
 */

import crypto from "node:crypto";

/* ===================================================================
   1. TYPES
   =================================================================== */

export type OnboardingStepStatus = "pending" | "in_progress" | "completed" | "skipped" | "blocked";
export type OnboardingSessionStatus = "active" | "completed" | "abandoned" | "paused";
export type ReadinessGateResult = "pass" | "fail" | "warn" | "skip";

export interface OnboardingStep {
  id: string;
  order: number;
  name: string;
  description: string;
  category: string;
  /** Steps that must be completed before this one */
  prerequisites: string[];
  /** Is this step required or optional? */
  required: boolean;
  /** Automated validation check ID, if any */
  validatorId?: string;
  /** Estimated completion time in minutes */
  estimatedMinutes: number;
  /** Help documentation URL */
  docsUrl?: string;
}

export interface OnboardingTemplate {
  id: string;
  name: string;
  description: string;
  integrationType: string;
  steps: OnboardingStep[];
  estimatedTotalMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface StepProgress {
  stepId: string;
  status: OnboardingStepStatus;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
  validationResult?: { passed: boolean; messages: string[] };
}

export interface OnboardingSession {
  id: string;
  templateId: string;
  templateName: string;
  partnerId: string;
  partnerName: string;
  tenantId: string;
  status: OnboardingSessionStatus;
  stepProgress: StepProgress[];
  currentStepId?: string;
  completionPercent: number;
  startedAt: string;
  completedAt?: string;
  assignee?: string;
  metadata?: Record<string, string>;
}

export interface ReadinessGate {
  id: string;
  name: string;
  description: string;
  category: string;
  result: ReadinessGateResult;
  message?: string;
  checkedAt: string;
}

export interface ReadinessReport {
  sessionId: string;
  partnerId: string;
  partnerName: string;
  overallReady: boolean;
  gates: ReadinessGate[];
  score: number;
  generatedAt: string;
}

/* ===================================================================
   2. STORES
   =================================================================== */

const templateStore = new Map<string, OnboardingTemplate>();
const sessionStore = new Map<string, OnboardingSession>();
const readinessStore = new Map<string, ReadinessReport>();

/* ===================================================================
   3. TEMPLATES
   =================================================================== */

export function createTemplate(input: {
  name: string;
  description: string;
  integrationType: string;
  steps: Omit<OnboardingStep, "id">[];
}): OnboardingTemplate {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const steps = input.steps.map((s, i) => ({
    ...s,
    id: `step-${i + 1}-${s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  }));
  const totalMinutes = steps.reduce((sum, s) => sum + s.estimatedMinutes, 0);

  const template: OnboardingTemplate = {
    id,
    name: input.name,
    description: input.description,
    integrationType: input.integrationType,
    steps,
    estimatedTotalMinutes: totalMinutes,
    createdAt: now,
    updatedAt: now,
  };
  templateStore.set(id, template);
  return template;
}

export function getTemplate(id: string): OnboardingTemplate | undefined {
  return templateStore.get(id);
}

export function listTemplates(integrationType?: string): OnboardingTemplate[] {
  let results = [...templateStore.values()];
  if (integrationType) results = results.filter((t) => t.integrationType === integrationType);
  return results;
}

/* ===================================================================
   4. SESSIONS
   =================================================================== */

export function startOnboarding(input: {
  templateId: string;
  partnerId: string;
  partnerName: string;
  tenantId: string;
  assignee?: string;
  metadata?: Record<string, string>;
}): OnboardingSession {
  const template = templateStore.get(input.templateId);
  if (!template) throw new Error(`template_not_found: ${input.templateId}`);

  const id = crypto.randomUUID();
  const session: OnboardingSession = {
    id,
    templateId: template.id,
    templateName: template.name,
    partnerId: input.partnerId,
    partnerName: input.partnerName,
    tenantId: input.tenantId,
    status: "active",
    stepProgress: template.steps.map((s) => ({
      stepId: s.id,
      status: "pending",
    })),
    currentStepId: template.steps[0]?.id,
    completionPercent: 0,
    startedAt: new Date().toISOString(),
    assignee: input.assignee,
    metadata: input.metadata,
  };
  sessionStore.set(id, session);
  return session;
}

export function getSessionForTenant(tenantId: string, id: string): OnboardingSession | undefined {
  const session = sessionStore.get(id);
  if (!session || session.tenantId !== tenantId) return undefined;
  return session;
}

export function listSessions(filters?: {
  partnerId?: string;
  tenantId: string;
  status?: string;
}): OnboardingSession[] {
  let results = [...sessionStore.values()];
  const tenantId = filters?.tenantId;
  if (!tenantId) return [];
  if (filters?.partnerId) results = results.filter((s) => s.partnerId === filters.partnerId);
  results = results.filter((s) => s.tenantId === tenantId);
  if (filters?.status) results = results.filter((s) => s.status === filters.status);
  return results.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

function recalcCompletion(session: OnboardingSession): void {
  const total = session.stepProgress.length;
  if (total === 0) { session.completionPercent = 0; return; }
  const done = session.stepProgress.filter(
    (s) => s.status === "completed" || s.status === "skipped",
  ).length;
  session.completionPercent = Math.round((done / total) * 100);
}

export function advanceStepForTenant(
  tenantId: string,
  sessionId: string,
  stepId: string,
  action: "start" | "complete" | "skip",
  notes?: string,
): boolean {
  const session = getSessionForTenant(tenantId, sessionId);
  if (!session || session.status !== "active") return false;

  const sp = session.stepProgress.find((s) => s.stepId === stepId);
  if (!sp) return false;

  const template = templateStore.get(session.templateId);
  if (!template) return false;

  const stepDef = template.steps.find((s) => s.id === stepId);
  if (!stepDef) return false;

  // Check prerequisites
  if (action === "start" || action === "complete") {
    for (const prereqId of stepDef.prerequisites) {
      const prereqProgress = session.stepProgress.find((s) => s.stepId === prereqId);
      if (prereqProgress && prereqProgress.status !== "completed" && prereqProgress.status !== "skipped") {
        return false; // Prerequisite not met
      }
    }
  }

  const now = new Date().toISOString();
  switch (action) {
    case "start":
      sp.status = "in_progress";
      sp.startedAt = now;
      session.currentStepId = stepId;
      break;
    case "complete":
      sp.status = "completed";
      sp.completedAt = now;
      if (notes) sp.notes = notes;
      // Auto-advance currentStepId
      const idx = session.stepProgress.findIndex((s) => s.stepId === stepId);
      const nextPending = session.stepProgress.find((s, i) => i > idx && s.status === "pending");
      session.currentStepId = nextPending?.stepId;
      break;
    case "skip":
      if (stepDef.required) return false; // Cannot skip required steps
      sp.status = "skipped";
      sp.completedAt = now;
      if (notes) sp.notes = notes;
      break;
  }

  recalcCompletion(session);

  // Auto-complete session if all steps done
  if (session.completionPercent === 100) {
    session.status = "completed";
    session.completedAt = now;
  }

  return true;
}

export function pauseSessionForTenant(tenantId: string, sessionId: string): boolean {
  const session = getSessionForTenant(tenantId, sessionId);
  if (!session || session.status !== "active") return false;
  session.status = "paused";
  return true;
}

export function resumeSessionForTenant(tenantId: string, sessionId: string): boolean {
  const session = getSessionForTenant(tenantId, sessionId);
  if (!session || session.status !== "paused") return false;
  session.status = "active";
  return true;
}

export function abandonSessionForTenant(tenantId: string, sessionId: string): boolean {
  const session = getSessionForTenant(tenantId, sessionId);
  if (!session || session.status === "completed") return false;
  session.status = "abandoned";
  return true;
}

/* ===================================================================
   5. READINESS CHECKS
   =================================================================== */

export function runReadinessCheckForTenant(tenantId: string, sessionId: string): ReadinessReport {
  const session = getSessionForTenant(tenantId, sessionId);
  if (!session) throw new Error(`session_not_found: ${sessionId}`);

  const template = templateStore.get(session.templateId);
  const now = new Date().toISOString();

  const gates: ReadinessGate[] = [];

  // Gate 1: All required steps completed
  const requiredSteps = template?.steps.filter((s) => s.required) || [];
  const completedRequired = requiredSteps.filter((s) => {
    const sp = session.stepProgress.find((p) => p.stepId === s.id);
    return sp?.status === "completed";
  });
  gates.push({
    id: "required-steps",
    name: "Required Steps Complete",
    description: "All required onboarding steps must be completed",
    category: "onboarding",
    result: completedRequired.length === requiredSteps.length ? "pass" : "fail",
    message: `${completedRequired.length}/${requiredSteps.length} required steps completed`,
    checkedAt: now,
  });

  // Gate 2: Completion percentage
  gates.push({
    id: "completion-percent",
    name: "Minimum Completion",
    description: "At least 80% of steps should be completed",
    category: "onboarding",
    result: session.completionPercent >= 80 ? "pass" : session.completionPercent >= 60 ? "warn" : "fail",
    message: `${session.completionPercent}% complete`,
    checkedAt: now,
  });

  // Gate 3: No blocked steps
  const blockedSteps = session.stepProgress.filter((s) => s.status === "blocked");
  gates.push({
    id: "no-blocked-steps",
    name: "No Blocked Steps",
    description: "No steps should be in blocked status",
    category: "onboarding",
    result: blockedSteps.length === 0 ? "pass" : "fail",
    message: blockedSteps.length === 0 ? "No blocked steps" : `${blockedSteps.length} steps blocked`,
    checkedAt: now,
  });

  // Gate 4: Partner has endpoints configured (simulated)
  gates.push({
    id: "endpoints-configured",
    name: "Endpoints Configured",
    description: "Partner must have at least one endpoint registered",
    category: "connectivity",
    result: session.metadata?.hasEndpoints === "true" ? "pass" : "warn",
    message: session.metadata?.hasEndpoints === "true" ? "Endpoints configured" : "Endpoint configuration not verified",
    checkedAt: now,
  });

  // Gate 5: Certification status (simulated)
  gates.push({
    id: "certification-status",
    name: "Certification Valid",
    description: "Partner should have a valid integration certificate",
    category: "certification",
    result: session.metadata?.hasCertificate === "true" ? "pass" : "warn",
    message: session.metadata?.hasCertificate === "true" ? "Active certificate found" : "Certification not verified",
    checkedAt: now,
  });

  // Gate 6: Security review
  gates.push({
    id: "security-review",
    name: "Security Review",
    description: "Security review must be completed",
    category: "security",
    result: session.metadata?.securityReviewed === "true" ? "pass" : "fail",
    message: session.metadata?.securityReviewed === "true" ? "Security review passed" : "Security review pending",
    checkedAt: now,
  });

  const passCount = gates.filter((g) => g.result === "pass").length;
  const failCount = gates.filter((g) => g.result === "fail").length;
  const score = gates.length > 0 ? Math.round((passCount / gates.length) * 100) : 0;

  const report: ReadinessReport = {
    sessionId,
    partnerId: session.partnerId,
    partnerName: session.partnerName,
    overallReady: failCount === 0,
    gates,
    score,
    generatedAt: now,
  };
  readinessStore.set(sessionId, report);
  return report;
}

export function getReadinessReportForTenant(
  tenantId: string,
  sessionId: string
): ReadinessReport | undefined {
  const session = getSessionForTenant(tenantId, sessionId);
  if (!session) return undefined;
  return readinessStore.get(sessionId);
}

/* ===================================================================
   6. STATS
   =================================================================== */

export function getOnboardingStats(tenantId: string): {
  templates: number;
  sessions: { total: number; active: number; completed: number; abandoned: number };
  avgCompletionPercent: number;
  avgCompletionDays: number;
} {
  const sessions = [...sessionStore.values()].filter((s) => s.tenantId === tenantId);
  const completed = sessions.filter((s) => s.status === "completed");
  const avgPercent = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + s.completionPercent, 0) / sessions.length)
    : 0;

  let avgDays = 0;
  if (completed.length > 0) {
    const totalDays = completed.reduce((sum, s) => {
      if (!s.completedAt) return sum;
      const start = new Date(s.startedAt).getTime();
      const end = new Date(s.completedAt).getTime();
      return sum + (end - start) / (1000 * 60 * 60 * 24);
    }, 0);
    avgDays = Math.round((totalDays / completed.length) * 10) / 10;
  }

  return {
    templates: templateStore.size,
    sessions: {
      total: sessions.length,
      active: sessions.filter((s) => s.status === "active").length,
      completed: completed.length,
      abandoned: sessions.filter((s) => s.status === "abandoned").length,
    },
    avgCompletionPercent: avgPercent,
    avgCompletionDays: avgDays,
  };
}

/* ===================================================================
   7. SEED TEMPLATES
   =================================================================== */

export function seedOnboardingTemplates(): void {
  if (templateStore.size > 0) return;

  createTemplate({
    name: "HL7v2 Interface Onboarding",
    description: "Step-by-step guide for connecting a new HL7v2 interface partner",
    integrationType: "hl7v2",
    steps: [
      { order: 1, name: "Partner Registration", description: "Register partner in the integration control plane", category: "setup", prerequisites: [], required: true, estimatedMinutes: 15 },
      { order: 2, name: "Endpoint Configuration", description: "Configure MLLP/TLS endpoint and connection parameters", category: "connectivity", prerequisites: ["step-1-partner-registration"], required: true, estimatedMinutes: 30, docsUrl: "/docs/hl7-endpoints" },
      { order: 3, name: "Message Profile Selection", description: "Select HL7v2 message profiles (ADT, ORM, ORU, SIU)", category: "configuration", prerequisites: ["step-2-endpoint-configuration"], required: true, estimatedMinutes: 20 },
      { order: 4, name: "Sandbox Testing", description: "Send test messages through the sandbox environment", category: "testing", prerequisites: ["step-3-message-profile-selection"], required: true, estimatedMinutes: 60 },
      { order: 5, name: "Certification Run", description: "Execute the HL7v2 ADT certification suite", category: "certification", prerequisites: ["step-4-sandbox-testing"], required: true, estimatedMinutes: 45 },
      { order: 6, name: "Security Review", description: "Complete security questionnaire and TLS certificate validation", category: "security", prerequisites: ["step-4-sandbox-testing"], required: true, estimatedMinutes: 30 },
      { order: 7, name: "Production Cutover", description: "Switch to production endpoint and verify live traffic", category: "go-live", prerequisites: ["step-5-certification-run", "step-6-security-review"], required: true, estimatedMinutes: 60 },
    ],
  });

  createTemplate({
    name: "X12/EDI Clearinghouse Onboarding",
    description: "Onboarding guide for connecting to an X12 EDI clearinghouse or payer",
    integrationType: "x12",
    steps: [
      { order: 1, name: "Payer Registration", description: "Register payer/clearinghouse in the payer registry", category: "setup", prerequisites: [], required: true, estimatedMinutes: 15 },
      { order: 2, name: "Transport Setup", description: "Configure SFTP/AS2/REST transport with credentials", category: "connectivity", prerequisites: ["step-1-payer-registration"], required: true, estimatedMinutes: 45 },
      { order: 3, name: "Enrollment & Trading Partner", description: "Complete trading partner agreement and enrollment", category: "compliance", prerequisites: ["step-1-payer-registration"], required: true, estimatedMinutes: 30 },
      { order: 4, name: "Claim Test Submission", description: "Submit test 837P/I claims and verify 999 acknowledgment", category: "testing", prerequisites: ["step-2-transport-setup", "step-3-enrollment---trading-partner"], required: true, estimatedMinutes: 60 },
      { order: 5, name: "Eligibility Test", description: "Send test 270 and verify 271 response", category: "testing", prerequisites: ["step-2-transport-setup"], required: false, estimatedMinutes: 30 },
      { order: 6, name: "Remittance Setup", description: "Configure 835 remittance processing", category: "configuration", prerequisites: ["step-4-claim-test-submission"], required: false, estimatedMinutes: 30 },
      { order: 7, name: "Go Live", description: "Enable production claim submission and monitoring", category: "go-live", prerequisites: ["step-4-claim-test-submission"], required: true, estimatedMinutes: 30 },
    ],
  });

  createTemplate({
    name: "FHIR R4 API Onboarding",
    description: "Partner onboarding for FHIR R4 resource exchange",
    integrationType: "fhir",
    steps: [
      { order: 1, name: "Client Registration", description: "Register SMART on FHIR client application", category: "setup", prerequisites: [], required: true, estimatedMinutes: 20 },
      { order: 2, name: "Scope Definition", description: "Define FHIR resource scopes and permissions", category: "configuration", prerequisites: ["step-1-client-registration"], required: true, estimatedMinutes: 15 },
      { order: 3, name: "OAuth2 Configuration", description: "Configure OAuth2 client credentials and redirect URIs", category: "security", prerequisites: ["step-1-client-registration"], required: true, estimatedMinutes: 30 },
      { order: 4, name: "Sandbox Testing", description: "Execute FHIR API calls against sandbox environment", category: "testing", prerequisites: ["step-2-scope-definition", "step-3-oauth2-configuration"], required: true, estimatedMinutes: 45 },
      { order: 5, name: "Conformance Validation", description: "Run FHIR R4 conformance certification suite", category: "certification", prerequisites: ["step-4-sandbox-testing"], required: true, estimatedMinutes: 30 },
      { order: 6, name: "Production Access", description: "Grant production API access and monitor usage", category: "go-live", prerequisites: ["step-5-conformance-validation"], required: true, estimatedMinutes: 20 },
    ],
  });
}
