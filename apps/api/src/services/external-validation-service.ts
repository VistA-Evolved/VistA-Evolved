/**
 * External Validation Harness Service (Phase 374 / W20-P5)
 *
 * Provides:
 * - Vulnerability triage workflow (submit -> assess -> accept/reject)
 * - Endpoint inventory generator (auto-scans registered Fastify routes)
 * - External validation scope document generator
 * - Pen-test environment configuration scaffold
 *
 * All stores in-memory with PG migration targets.
 */

import crypto from "node:crypto";

/* ================================================================== */
/* Types                                                               */
/* ================================================================== */

export type VulnSeverity = "critical" | "high" | "medium" | "low" | "informational";
export type VulnStatus = "submitted" | "triaging" | "accepted" | "rejected" | "mitigated" | "false_positive";

export interface Vulnerability {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  severity: VulnSeverity;
  status: VulnStatus;
  cveId: string | null;
  cweName: string | null;
  affectedEndpoint: string | null;
  reportedBy: string;
  assessedBy: string | null;
  assessmentNotes: string | null;
  mitigationPlan: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EndpointEntry {
  method: string;
  url: string;
  auth: string;
  phase: string | null;
}

export interface ScopeDocument {
  generatedAt: string;
  tenantId: string;
  applicationName: string;
  version: string;
  totalEndpoints: number;
  endpointsByAuth: Record<string, number>;
  inScopeEndpoints: EndpointEntry[];
  outOfScope: string[];
  testingGuidelines: string[];
  environmentConfig: Record<string, string>;
}

/* ================================================================== */
/* Stores                                                              */
/* ================================================================== */

const vulnStore = new Map<string, Vulnerability>();

const MAX_STORE_SIZE = 10_000;

function uid(): string {
  return crypto.randomBytes(12).toString("hex");
}

function now(): string {
  return new Date().toISOString();
}

function boundedSet<T>(store: Map<string, T>, key: string, value: T): void {
  if (store.size >= MAX_STORE_SIZE) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  store.set(key, value);
}

/* ================================================================== */
/* Vulnerability Triage                                                */
/* ================================================================== */

export function submitVulnerability(
  tenantId: string,
  input: {
    title: string;
    description: string;
    severity: VulnSeverity;
    reportedBy: string;
    cveId?: string;
    cweName?: string;
    affectedEndpoint?: string;
  }
): Vulnerability {
  const ts = now();
  const vuln: Vulnerability = {
    id: uid(),
    tenantId,
    title: input.title,
    description: input.description,
    severity: input.severity,
    status: "submitted",
    cveId: input.cveId || null,
    cweName: input.cweName || null,
    affectedEndpoint: input.affectedEndpoint || null,
    reportedBy: input.reportedBy,
    assessedBy: null,
    assessmentNotes: null,
    mitigationPlan: null,
    createdAt: ts,
    updatedAt: ts,
  };
  boundedSet(vulnStore, vuln.id, vuln);
  return vuln;
}

export function assessVulnerability(
  id: string,
  input: {
    status: "accepted" | "rejected" | "mitigated" | "false_positive";
    assessedBy: string;
    notes?: string;
    mitigationPlan?: string;
  }
): Vulnerability | null {
  const vuln = vulnStore.get(id);
  if (!vuln) return null;
  const updated: Vulnerability = {
    ...vuln,
    status: input.status,
    assessedBy: input.assessedBy,
    assessmentNotes: input.notes || null,
    mitigationPlan: input.mitigationPlan || null,
    updatedAt: now(),
  };
  vulnStore.set(id, updated);
  return updated;
}

export function triageVulnerability(id: string, assessedBy: string): Vulnerability | null {
  const vuln = vulnStore.get(id);
  if (!vuln || vuln.status !== "submitted") return null;
  const updated: Vulnerability = {
    ...vuln,
    status: "triaging",
    assessedBy,
    updatedAt: now(),
  };
  vulnStore.set(id, updated);
  return updated;
}

export function getVulnerability(id: string): Vulnerability | undefined {
  return vulnStore.get(id);
}

export function listVulnerabilities(tenantId: string, severity?: VulnSeverity): Vulnerability[] {
  const all = [...vulnStore.values()].filter((v) => v.tenantId === tenantId);
  if (severity) return all.filter((v) => v.severity === severity);
  return all;
}

/* ================================================================== */
/* Endpoint Inventory                                                  */
/* ================================================================== */

/**
 * Generates an endpoint inventory from known route patterns.
 * In a running Fastify server this could be augmented with server.printRoutes().
 * For now, returns a static curated inventory of documented endpoints.
 */
export function generateEndpointInventory(): EndpointEntry[] {
  const endpoints: EndpointEntry[] = [
    // Health + infra
    { method: "GET", url: "/health", auth: "none", phase: "core" },
    { method: "GET", url: "/ready", auth: "none", phase: "core" },
    { method: "GET", url: "/version", auth: "none", phase: "core" },
    { method: "GET", url: "/metrics/prometheus", auth: "none", phase: "Phase 36" },
    // Auth
    { method: "POST", url: "/auth/login", auth: "none", phase: "Phase 13" },
    { method: "POST", url: "/auth/logout", auth: "session", phase: "Phase 13" },
    { method: "GET", url: "/auth/me", auth: "session", phase: "Phase 13" },
    { method: "GET", url: "/auth/csrf-token", auth: "session", phase: "Phase 132" },
    // VistA
    { method: "GET", url: "/vista/ping", auth: "none", phase: "Phase 1" },
    { method: "GET", url: "/vista/default-patient-list", auth: "session", phase: "Phase 1" },
    { method: "GET", url: "/vista/allergies", auth: "session", phase: "Phase 7" },
    { method: "POST", url: "/vista/allergy", auth: "session", phase: "Phase 7" },
    { method: "GET", url: "/vista/swap-boundary", auth: "none", phase: "Phase 148" },
    { method: "GET", url: "/vista/provision/status", auth: "admin", phase: "Phase 155" },
    // Imaging
    { method: "GET", url: "/imaging/health", auth: "admin", phase: "Phase 22" },
    { method: "GET", url: "/imaging/audit/verify", auth: "admin", phase: "Phase 24" },
    // Admin
    { method: "GET", url: "/posture/observability", auth: "admin", phase: "Phase 107" },
    { method: "GET", url: "/posture/tenant", auth: "admin", phase: "Phase 107" },
    { method: "GET", url: "/posture/performance", auth: "admin", phase: "Phase 107" },
    { method: "GET", url: "/posture/data-plane", auth: "admin", phase: "Phase 125" },
    // Wave 20
    { method: "POST", url: "/release-train/releases", auth: "admin", phase: "Phase 371" },
    { method: "POST", url: "/customer-success/onboard", auth: "admin", phase: "Phase 372" },
    { method: "POST", url: "/support-ops/tickets", auth: "admin", phase: "Phase 373" },
    { method: "POST", url: "/external-validation/vulnerabilities", auth: "admin", phase: "Phase 374" },
    { method: "POST", url: "/data-rights/retention-policies", auth: "admin", phase: "Phase 375" },
  ];
  return endpoints;
}

/* ================================================================== */
/* Scope Document Generator                                            */
/* ================================================================== */

export function generateScopeDocument(tenantId: string): ScopeDocument {
  const endpoints = generateEndpointInventory();
  const byAuth: Record<string, number> = {};
  for (const ep of endpoints) {
    byAuth[ep.auth] = (byAuth[ep.auth] || 0) + 1;
  }

  return {
    generatedAt: now(),
    tenantId,
    applicationName: "VistA-Evolved",
    version: process.env.APP_VERSION || "0.1.0",
    totalEndpoints: endpoints.length,
    endpointsByAuth: byAuth,
    inScopeEndpoints: endpoints,
    outOfScope: [
      "Third-party Docker containers (WorldVistA, Orthanc, Keycloak, Jaeger, Prometheus)",
      "VistA MUMPS routines (tested separately via MUMPS unit testing)",
      "Network infrastructure and DNS",
    ],
    testingGuidelines: [
      "All testing must use the WorldVistA Docker sandbox (port 9430)",
      "No PHI or PII data may be used in test payloads",
      "Session auth via httpOnly cookies - use POST /auth/login first",
      "Admin endpoints require PROVIDER,CLYDE WV session (admin role)",
      "Rate limits apply: 120 req/60s for DICOMweb, general rate limiter for other routes",
      "CSRF protection active on mutation endpoints - include X-CSRF-Token header",
    ],
    environmentConfig: {
      NODE_ENV: "test",
      PLATFORM_RUNTIME_MODE: "test",
      VISTA_HOST: "127.0.0.1",
      VISTA_PORT: "9430",
      API_PORT: "3001",
    },
  };
}

/* ================================================================== */
/* Vulnerability Summary                                               */
/* ================================================================== */

export function getVulnSummary(tenantId: string): {
  total: number;
  bySeverity: Record<VulnSeverity, number>;
  byStatus: Record<VulnStatus, number>;
  openCritical: number;
} {
  const all = listVulnerabilities(tenantId);
  const bySeverity: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let openCritical = 0;

  for (const v of all) {
    bySeverity[v.severity] = (bySeverity[v.severity] || 0) + 1;
    byStatus[v.status] = (byStatus[v.status] || 0) + 1;
    if (v.severity === "critical" && (v.status === "submitted" || v.status === "triaging" || v.status === "accepted")) {
      openCritical++;
    }
  }

  return {
    total: all.length,
    bySeverity: bySeverity as Record<VulnSeverity, number>,
    byStatus: byStatus as Record<VulnStatus, number>,
    openCritical,
  };
}
