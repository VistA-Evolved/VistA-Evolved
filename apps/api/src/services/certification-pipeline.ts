/**
 * Integration Certification Pipeline
 *
 * Phase 323 (W14-P7): End-to-end certification framework for integration
 * partners. Validates that partner integrations meet conformance requirements
 * before promotion to production.
 *
 * Architecture:
 *  1. CertificationSuite -- reusable test suite definitions (HL7, X12, FHIR)
 *  2. CertificationRun -- execution of suites against a partner endpoint
 *  3. ConformanceScore -- weighted scoring across test categories
 *  4. CertificationWorkflow -- draft->submitted->in_review->certified|failed
 *  5. CertificateStore -- issued certificates with expiry and revocation
 *
 * Depends on:
 *  - services/integration-control-plane.ts -- IntegrationPartner, IntegrationEndpoint
 */

import crypto from "node:crypto";

/* ===================================================================
   1. CERTIFICATION SUITE DEFINITIONS
   =================================================================== */

export type SuiteCategory = "hl7v2" | "x12" | "fhir" | "transport" | "security" | "performance";

export interface CertificationTestCase {
  id: string;
  name: string;
  description: string;
  category: SuiteCategory;
  /** Weight for scoring (0-100) */
  weight: number;
  /** Is this test blocking (must pass for certification)? */
  blocking: boolean;
  /** Expected behavior description for evaluators */
  expectedBehavior: string;
  /** Automated or manual evaluation */
  evaluationMode: "automated" | "manual" | "hybrid";
}

export interface CertificationSuite {
  id: string;
  name: string;
  version: string;
  description: string;
  categories: SuiteCategory[];
  testCases: CertificationTestCase[];
  /** Minimum overall score to pass (0-100) */
  passingScore: number;
  /** Minimum per-category scores */
  categoryMinScores: Partial<Record<SuiteCategory, number>>;
  status: "draft" | "active" | "deprecated";
  createdAt: string;
  updatedAt: string;
}

// Store
const suiteStore = new Map<string, CertificationSuite>();

export function createSuite(input: Omit<CertificationSuite, "id" | "createdAt" | "updatedAt">): CertificationSuite {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const suite: CertificationSuite = { ...input, id, createdAt: now, updatedAt: now };
  suiteStore.set(id, suite);
  return suite;
}

export function getSuite(id: string): CertificationSuite | undefined {
  return suiteStore.get(id);
}

export function listSuites(filters?: { status?: string; category?: string }): CertificationSuite[] {
  let results = [...suiteStore.values()];
  if (filters?.status) results = results.filter((s) => s.status === filters.status);
  if (filters?.category) results = results.filter((s) => s.categories.includes(filters.category as SuiteCategory));
  return results;
}

export function updateSuiteStatus(id: string, status: CertificationSuite["status"]): boolean {
  const suite = suiteStore.get(id);
  if (!suite) return false;
  suite.status = status;
  suite.updatedAt = new Date().toISOString();
  return true;
}

/* ===================================================================
   2. CERTIFICATION RUN -- Execute suites against partner endpoints
   =================================================================== */

export type TestResult = "pass" | "fail" | "skip" | "error" | "pending";

export interface TestCaseResult {
  testCaseId: string;
  testCaseName: string;
  category: SuiteCategory;
  result: TestResult;
  score: number;
  maxScore: number;
  durationMs: number;
  message?: string;
  evidence?: string;
}

export interface CertificationRun {
  id: string;
  suiteId: string;
  suiteName: string;
  partnerId: string;
  partnerName: string;
  endpointId?: string;
  status: "pending" | "running" | "completed" | "cancelled";
  testResults: TestCaseResult[];
  overallScore: number;
  categoryScores: Record<string, number>;
  passed: boolean;
  startedAt: string;
  completedAt?: string;
  runBy?: string;
  notes?: string;
}

const runStore = new Map<string, CertificationRun>();

export function startCertificationRun(input: {
  suiteId: string;
  partnerId: string;
  partnerName: string;
  endpointId?: string;
  runBy?: string;
}): CertificationRun {
  const suite = suiteStore.get(input.suiteId);
  if (!suite) throw new Error(`suite_not_found: ${input.suiteId}`);
  if (suite.status !== "active") throw new Error(`suite_not_active: ${suite.status}`);

  const id = crypto.randomUUID();
  const run: CertificationRun = {
    id,
    suiteId: suite.id,
    suiteName: suite.name,
    partnerId: input.partnerId,
    partnerName: input.partnerName,
    endpointId: input.endpointId,
    status: "running",
    testResults: suite.testCases.map((tc) => ({
      testCaseId: tc.id,
      testCaseName: tc.name,
      category: tc.category,
      result: "pending",
      score: 0,
      maxScore: tc.weight,
      durationMs: 0,
    })),
    overallScore: 0,
    categoryScores: {},
    passed: false,
    startedAt: new Date().toISOString(),
    runBy: input.runBy,
  };

  runStore.set(id, run);
  return run;
}

export function recordTestResult(
  runId: string,
  testCaseId: string,
  result: TestResult,
  opts?: { message?: string; evidence?: string; durationMs?: number },
): boolean {
  const run = runStore.get(runId);
  if (!run || run.status !== "running") return false;

  const tcr = run.testResults.find((r) => r.testCaseId === testCaseId);
  if (!tcr) return false;

  tcr.result = result;
  tcr.score = result === "pass" ? tcr.maxScore : result === "skip" ? Math.floor(tcr.maxScore * 0.5) : 0;
  tcr.durationMs = opts?.durationMs || 0;
  tcr.message = opts?.message;
  tcr.evidence = opts?.evidence;

  return true;
}

export function completeCertificationRun(runId: string): CertificationRun | undefined {
  const run = runStore.get(runId);
  if (!run || run.status !== "running") return undefined;

  const suite = suiteStore.get(run.suiteId);
  if (!suite) return undefined;

  // Calculate scores
  const totalWeight = run.testResults.reduce((sum, r) => sum + r.maxScore, 0);
  const earnedWeight = run.testResults.reduce((sum, r) => sum + r.score, 0);
  run.overallScore = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

  // Category scores
  const catTotals: Record<string, number> = {};
  const catEarned: Record<string, number> = {};
  for (const r of run.testResults) {
    catTotals[r.category] = (catTotals[r.category] || 0) + r.maxScore;
    catEarned[r.category] = (catEarned[r.category] || 0) + r.score;
  }
  for (const cat of Object.keys(catTotals)) {
    run.categoryScores[cat] = catTotals[cat] > 0 ? Math.round((catEarned[cat] / catTotals[cat]) * 100) : 0;
  }

  // Check pass/fail
  const overallPasses = run.overallScore >= suite.passingScore;

  const categoryPasses = Object.entries(suite.categoryMinScores).every(
    ([cat, minScore]) => (run.categoryScores[cat] || 0) >= (minScore || 0),
  );

  // Check blocking tests
  const blockingPasses = run.testResults
    .filter((r) => {
      const tc = suite.testCases.find((t) => t.id === r.testCaseId);
      return tc?.blocking;
    })
    .every((r) => r.result === "pass");

  run.passed = overallPasses && categoryPasses && blockingPasses;
  run.status = "completed";
  run.completedAt = new Date().toISOString();

  return run;
}

export function getCertificationRun(id: string): CertificationRun | undefined {
  return runStore.get(id);
}

export function listCertificationRuns(filters?: { partnerId?: string; suiteId?: string; passed?: boolean }): CertificationRun[] {
  let results = [...runStore.values()];
  if (filters?.partnerId) results = results.filter((r) => r.partnerId === filters.partnerId);
  if (filters?.suiteId) results = results.filter((r) => r.suiteId === filters.suiteId);
  if (filters?.passed !== undefined) results = results.filter((r) => r.passed === filters.passed);
  return results.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}


/* ===================================================================
   3. CERTIFICATE ISSUANCE & LIFECYCLE
   =================================================================== */

export interface IntegrationCertificate {
  id: string;
  partnerId: string;
  partnerName: string;
  suiteId: string;
  suiteName: string;
  suiteVersion: string;
  runId: string;
  score: number;
  categoryScores: Record<string, number>;
  status: "active" | "expired" | "revoked" | "suspended";
  issuedAt: string;
  expiresAt: string;
  revokedAt?: string;
  revokedReason?: string;
  /** Fingerprint for tamper detection */
  fingerprint: string;
  metadata?: Record<string, string>;
}

const certStore = new Map<string, IntegrationCertificate>();
const DEFAULT_CERT_VALIDITY_DAYS = 365;

function computeFingerprint(cert: Omit<IntegrationCertificate, "fingerprint">): string {
  const payload = JSON.stringify({
    id: cert.id,
    partnerId: cert.partnerId,
    suiteId: cert.suiteId,
    runId: cert.runId,
    score: cert.score,
    issuedAt: cert.issuedAt,
    expiresAt: cert.expiresAt,
  });
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

export function issueCertificate(runId: string, validityDays?: number): IntegrationCertificate {
  const run = runStore.get(runId);
  if (!run) throw new Error(`run_not_found: ${runId}`);
  if (!run.passed) throw new Error("cannot_certify_failed_run");
  if (run.status !== "completed") throw new Error("run_not_completed");

  const suite = suiteStore.get(run.suiteId);
  if (!suite) throw new Error(`suite_not_found: ${run.suiteId}`);

  const id = crypto.randomUUID();
  const now = new Date();
  const expiry = new Date(now);
  expiry.setDate(expiry.getDate() + (validityDays || DEFAULT_CERT_VALIDITY_DAYS));

  const certBase = {
    id,
    partnerId: run.partnerId,
    partnerName: run.partnerName,
    suiteId: suite.id,
    suiteName: suite.name,
    suiteVersion: suite.version,
    runId: run.id,
    score: run.overallScore,
    categoryScores: { ...run.categoryScores },
    status: "active" as const,
    issuedAt: now.toISOString(),
    expiresAt: expiry.toISOString(),
  };

  const cert: IntegrationCertificate = {
    ...certBase,
    fingerprint: computeFingerprint(certBase),
  };

  certStore.set(id, cert);
  return cert;
}

export function getCertificate(id: string): IntegrationCertificate | undefined {
  return certStore.get(id);
}

export function listCertificates(filters?: { partnerId?: string; status?: string }): IntegrationCertificate[] {
  let results = [...certStore.values()];
  if (filters?.partnerId) results = results.filter((c) => c.partnerId === filters.partnerId);
  if (filters?.status) results = results.filter((c) => c.status === filters.status);
  return results.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

export function revokeCertificate(id: string, reason: string): boolean {
  const cert = certStore.get(id);
  if (!cert || cert.status !== "active") return false;
  cert.status = "revoked";
  cert.revokedAt = new Date().toISOString();
  cert.revokedReason = reason;
  return true;
}

export function suspendCertificate(id: string): boolean {
  const cert = certStore.get(id);
  if (!cert || cert.status !== "active") return false;
  cert.status = "suspended";
  return true;
}

export function reinstateCertificate(id: string): boolean {
  const cert = certStore.get(id);
  if (!cert || cert.status !== "suspended") return false;
  // Check if expired
  if (new Date(cert.expiresAt) < new Date()) {
    cert.status = "expired";
    return false;
  }
  cert.status = "active";
  return true;
}

export function verifyCertificate(id: string): { valid: boolean; reason?: string } {
  const cert = certStore.get(id);
  if (!cert) return { valid: false, reason: "certificate_not_found" };
  if (cert.status === "revoked") return { valid: false, reason: "certificate_revoked" };
  if (cert.status === "suspended") return { valid: false, reason: "certificate_suspended" };
  if (cert.status === "expired" || new Date(cert.expiresAt) < new Date()) {
    cert.status = "expired";
    return { valid: false, reason: "certificate_expired" };
  }

  // Verify fingerprint
  const expected = computeFingerprint(cert);
  if (cert.fingerprint !== expected) {
    return { valid: false, reason: "fingerprint_mismatch" };
  }

  return { valid: true };
}


/* ===================================================================
   4. BUILT-IN TEST SUITES (seed data)
   =================================================================== */

export function seedBuiltInSuites(): void {
  // Only seed if empty
  if (suiteStore.size > 0) return;

  createSuite({
    name: "HL7v2 ADT Conformance",
    version: "1.0.0",
    description: "Validates HL7v2 ADT message sending and receiving conformance",
    categories: ["hl7v2", "transport", "security"],
    testCases: [
      { id: "hl7-adt-01", name: "ADT^A01 Admit", description: "Send valid ADT A01", category: "hl7v2", weight: 20, blocking: true, expectedBehavior: "ACK with AA", evaluationMode: "automated" },
      { id: "hl7-adt-02", name: "ADT^A08 Update", description: "Send valid ADT A08", category: "hl7v2", weight: 15, blocking: false, expectedBehavior: "ACK with AA", evaluationMode: "automated" },
      { id: "hl7-adt-03", name: "ADT^A03 Discharge", description: "Send valid ADT A03", category: "hl7v2", weight: 15, blocking: true, expectedBehavior: "ACK with AA", evaluationMode: "automated" },
      { id: "hl7-adt-04", name: "Invalid MSH Handling", description: "Send malformed MSH", category: "hl7v2", weight: 10, blocking: false, expectedBehavior: "NAK with AE/AR", evaluationMode: "automated" },
      { id: "hl7-adt-05", name: "MLLP Framing", description: "Verify MLLP start/end bytes", category: "transport", weight: 20, blocking: true, expectedBehavior: "0x0B prefix, 0x1C 0x0D suffix", evaluationMode: "automated" },
      { id: "hl7-adt-06", name: "TLS Encryption", description: "MLLP over TLS", category: "security", weight: 20, blocking: true, expectedBehavior: "TLS 1.2+ negotiated", evaluationMode: "hybrid" },
    ],
    passingScore: 70,
    categoryMinScores: { hl7v2: 60, security: 80 },
    status: "active",
  });

  createSuite({
    name: "X12 837 Claim Submission",
    version: "1.0.0",
    description: "Validates X12 5010 837P/I claim submission and 999 acknowledgment",
    categories: ["x12", "transport", "security"],
    testCases: [
      { id: "x12-837-01", name: "837P Professional Claim", description: "Submit valid 837P", category: "x12", weight: 25, blocking: true, expectedBehavior: "999 with AK9 A (accepted)", evaluationMode: "automated" },
      { id: "x12-837-02", name: "837I Institutional Claim", description: "Submit valid 837I", category: "x12", weight: 25, blocking: true, expectedBehavior: "999 with AK9 A", evaluationMode: "automated" },
      { id: "x12-837-03", name: "ISA Envelope Validation", description: "Verify ISA/IEA structure", category: "x12", weight: 15, blocking: true, expectedBehavior: "Valid ISA13, matching IEA02", evaluationMode: "automated" },
      { id: "x12-837-04", name: "Duplicate Control Number", description: "Submit duplicate ISA13", category: "x12", weight: 10, blocking: false, expectedBehavior: "TA1 rejection with error 025", evaluationMode: "automated" },
      { id: "x12-837-05", name: "Transport Security", description: "TLS or SFTP for transmission", category: "transport", weight: 15, blocking: true, expectedBehavior: "Encrypted channel verified", evaluationMode: "hybrid" },
      { id: "x12-837-06", name: "Credential Rotation", description: "Handle credential refresh", category: "security", weight: 10, blocking: false, expectedBehavior: "Reconnect with new credentials", evaluationMode: "manual" },
    ],
    passingScore: 70,
    categoryMinScores: { x12: 60, transport: 80 },
    status: "active",
  });

  createSuite({
    name: "FHIR R4 Conformance",
    version: "1.0.0",
    description: "Validates FHIR R4 resource exchange conformance",
    categories: ["fhir", "security", "performance"],
    testCases: [
      { id: "fhir-01", name: "Patient Read", description: "GET /Patient/:id", category: "fhir", weight: 15, blocking: true, expectedBehavior: "200 with valid FHIR Patient", evaluationMode: "automated" },
      { id: "fhir-02", name: "Patient Search", description: "GET /Patient?name=...", category: "fhir", weight: 15, blocking: true, expectedBehavior: "200 with FHIR Bundle", evaluationMode: "automated" },
      { id: "fhir-03", name: "Observation Create", description: "POST /Observation", category: "fhir", weight: 15, blocking: false, expectedBehavior: "201 with Location header", evaluationMode: "automated" },
      { id: "fhir-04", name: "CapabilityStatement", description: "GET /metadata", category: "fhir", weight: 10, blocking: true, expectedBehavior: "200 with CapabilityStatement", evaluationMode: "automated" },
      { id: "fhir-05", name: "SMART Auth", description: "OAuth2 authorization flow", category: "security", weight: 25, blocking: true, expectedBehavior: "Valid token exchange", evaluationMode: "hybrid" },
      { id: "fhir-06", name: "Response Time", description: "P95 latency < 2s", category: "performance", weight: 20, blocking: false, expectedBehavior: "95th percentile under 2000ms", evaluationMode: "automated" },
    ],
    passingScore: 70,
    categoryMinScores: { fhir: 60, security: 80 },
    status: "active",
  });
}


/* ===================================================================
   5. STATS & DASHBOARD
   =================================================================== */

export function getCertificationStats(): {
  suites: { total: number; active: number };
  runs: { total: number; passed: number; failed: number; running: number };
  certificates: { total: number; active: number; expired: number; revoked: number };
} {
  const suites = [...suiteStore.values()];
  const runs = [...runStore.values()];
  const certs = [...certStore.values()];

  // Check for expired certs
  const now = new Date();
  for (const cert of certs) {
    if (cert.status === "active" && new Date(cert.expiresAt) < now) {
      cert.status = "expired";
    }
  }

  return {
    suites: {
      total: suites.length,
      active: suites.filter((s) => s.status === "active").length,
    },
    runs: {
      total: runs.length,
      passed: runs.filter((r) => r.passed && r.status === "completed").length,
      failed: runs.filter((r) => !r.passed && r.status === "completed").length,
      running: runs.filter((r) => r.status === "running").length,
    },
    certificates: {
      total: certs.length,
      active: certs.filter((c) => c.status === "active").length,
      expired: certs.filter((c) => c.status === "expired").length,
      revoked: certs.filter((c) => c.status === "revoked").length,
    },
  };
}
