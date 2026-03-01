/**
 * integration-control-plane.ts -- Integration Control Plane v2
 *
 * Phase 318 (W14-P2): Makes integrations first-class platform objects.
 * Partners, endpoints, credential refs, routing rules, and test runs.
 *
 * In-memory stores with PG migration tables for rc/prod.
 */

import { randomUUID } from "node:crypto";

// ─── Types ───────────────────────────────────────────────────────────

export type IntegrationPartnerType = "HL7" | "X12" | "FHIR" | "PACS" | "OTHER";
export type PartnerStatus = "draft" | "testing" | "certified" | "active" | "suspended" | "decommissioned";
export type EndpointDirection = "IN" | "OUT" | "BIDIRECTIONAL";
export type EndpointProtocol = "MLLP" | "SFTP" | "AS2" | "HTTPS" | "DICOM";
export type TlsMode = "none" | "tls" | "mtls";
export type TestRunStatus = "pending" | "running" | "passed" | "failed" | "aborted";

/** Valid partner state transitions */
const VALID_TRANSITIONS: Record<PartnerStatus, PartnerStatus[]> = {
  draft: ["testing", "decommissioned"],
  testing: ["certified", "draft", "decommissioned"],
  certified: ["active", "testing", "decommissioned"],
  active: ["suspended", "decommissioned"],
  suspended: ["active", "decommissioned"],
  decommissioned: [],
};

export interface IntegrationPartner {
  id: string;
  tenantId: string;
  name: string;
  type: IntegrationPartnerType;
  status: PartnerStatus;
  description?: string;
  contactEmail?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface IntegrationEndpoint {
  id: string;
  partnerId: string;
  tenantId: string;
  direction: EndpointDirection;
  protocol: EndpointProtocol;
  address: string;
  port?: number;
  path?: string;
  tlsMode: TlsMode;
  enabled: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationCredentialRef {
  id: string;
  partnerId: string;
  tenantId: string;
  secretRef: string;     // pointer to KMS/vault — NEVER raw credentials
  label: string;
  rotatedAt: string;
  createdAt: string;
}

export interface IntegrationRoute {
  id: string;
  partnerId: string;
  tenantId: string;
  messageType: string;   // e.g. "ADT^A01", "837P", "ORU^R01"
  routeTo: string;       // handler key
  priority: number;
  enabled: boolean;
  createdAt: string;
}

export interface IntegrationTestRun {
  id: string;
  partnerId: string;
  tenantId: string;
  status: TestRunStatus;
  startedAt: string;
  completedAt?: string;
  triggeredBy: string;
  results: TestRunResult[];
  summary?: string;
}

export interface TestRunResult {
  check: string;
  passed: boolean;
  detail: string;
  durationMs: number;
}

// ─── State Transition Validation ─────────────────────────────────────

export function isValidTransition(from: PartnerStatus, to: PartnerStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getValidTransitions(status: PartnerStatus): PartnerStatus[] {
  return VALID_TRANSITIONS[status] ?? [];
}

// ─── In-Memory Stores ────────────────────────────────────────────────

const partners = new Map<string, IntegrationPartner>();
const endpoints = new Map<string, IntegrationEndpoint>();
const credentialRefs = new Map<string, IntegrationCredentialRef>();
const routes = new Map<string, IntegrationRoute>();
const testRuns = new Map<string, IntegrationTestRun>();

// ─── Partner CRUD ────────────────────────────────────────────────────

export function createPartner(
  tenantId: string,
  input: { name: string; type: IntegrationPartnerType; description?: string; contactEmail?: string; tags?: string[] },
  createdBy: string
): IntegrationPartner {
  const id = randomUUID();
  const now = new Date().toISOString();
  const partner: IntegrationPartner = {
    id,
    tenantId,
    name: input.name,
    type: input.type,
    status: "draft",
    description: input.description,
    contactEmail: input.contactEmail,
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
    createdBy,
  };
  partners.set(id, partner);
  return partner;
}

export function getPartner(tenantId: string, partnerId: string): IntegrationPartner | undefined {
  const p = partners.get(partnerId);
  return p && p.tenantId === tenantId ? p : undefined;
}

export function listPartners(tenantId: string): IntegrationPartner[] {
  return [...partners.values()].filter((p) => p.tenantId === tenantId);
}

export function updatePartnerStatus(
  tenantId: string,
  partnerId: string,
  newStatus: PartnerStatus
): { ok: boolean; error?: string; partner?: IntegrationPartner } {
  const partner = getPartner(tenantId, partnerId);
  if (!partner) return { ok: false, error: "partner_not_found" };
  if (!isValidTransition(partner.status, newStatus)) {
    return { ok: false, error: `invalid_transition: ${partner.status} -> ${newStatus}` };
  }
  partner.status = newStatus;
  partner.updatedAt = new Date().toISOString();
  return { ok: true, partner };
}

// ─── Endpoint CRUD ───────────────────────────────────────────────────

export function addEndpoint(
  tenantId: string,
  partnerId: string,
  input: { direction: EndpointDirection; protocol: EndpointProtocol; address: string; port?: number; path?: string; tlsMode?: TlsMode; description?: string }
): IntegrationEndpoint | undefined {
  if (!getPartner(tenantId, partnerId)) return undefined;
  const id = randomUUID();
  const now = new Date().toISOString();
  const ep: IntegrationEndpoint = {
    id,
    partnerId,
    tenantId,
    direction: input.direction,
    protocol: input.protocol,
    address: input.address,
    port: input.port,
    path: input.path,
    tlsMode: input.tlsMode ?? "tls",
    enabled: true,
    description: input.description,
    createdAt: now,
    updatedAt: now,
  };
  endpoints.set(id, ep);
  return ep;
}

export function listEndpoints(tenantId: string, partnerId: string): IntegrationEndpoint[] {
  return [...endpoints.values()].filter((e) => e.tenantId === tenantId && e.partnerId === partnerId);
}

export function getEndpoint(tenantId: string, endpointId: string): IntegrationEndpoint | undefined {
  const ep = endpoints.get(endpointId);
  return ep && ep.tenantId === tenantId ? ep : undefined;
}

export function toggleEndpoint(tenantId: string, endpointId: string, enabled: boolean): boolean {
  const ep = getEndpoint(tenantId, endpointId);
  if (!ep) return false;
  ep.enabled = enabled;
  ep.updatedAt = new Date().toISOString();
  return true;
}

// ─── Credential Refs ─────────────────────────────────────────────────

export function addCredentialRef(
  tenantId: string,
  partnerId: string,
  input: { secretRef: string; label: string }
): IntegrationCredentialRef | undefined {
  if (!getPartner(tenantId, partnerId)) return undefined;
  const id = randomUUID();
  const now = new Date().toISOString();
  const cred: IntegrationCredentialRef = {
    id,
    partnerId,
    tenantId,
    secretRef: input.secretRef,
    label: input.label,
    rotatedAt: now,
    createdAt: now,
  };
  credentialRefs.set(id, cred);
  return cred;
}

export function listCredentialRefs(tenantId: string, partnerId: string): IntegrationCredentialRef[] {
  return [...credentialRefs.values()].filter((c) => c.tenantId === tenantId && c.partnerId === partnerId);
}

export function rotateCredential(tenantId: string, credentialId: string, newSecretRef: string): boolean {
  const cred = credentialRefs.get(credentialId);
  if (!cred || cred.tenantId !== tenantId) return false;
  cred.secretRef = newSecretRef;
  cred.rotatedAt = new Date().toISOString();
  return true;
}

// ─── Routing Rules ───────────────────────────────────────────────────

export function addRoute(
  tenantId: string,
  partnerId: string,
  input: { messageType: string; routeTo: string; priority?: number; enabled?: boolean }
): IntegrationRoute | undefined {
  if (!getPartner(tenantId, partnerId)) return undefined;
  const id = randomUUID();
  const route: IntegrationRoute = {
    id,
    partnerId,
    tenantId,
    messageType: input.messageType,
    routeTo: input.routeTo,
    priority: input.priority ?? 100,
    enabled: input.enabled !== false,
    createdAt: new Date().toISOString(),
  };
  routes.set(id, route);
  return route;
}

export function listRoutes(tenantId: string, partnerId: string): IntegrationRoute[] {
  return [...routes.values()]
    .filter((r) => r.tenantId === tenantId && r.partnerId === partnerId)
    .sort((a, b) => a.priority - b.priority);
}

// ─── Test Runs ───────────────────────────────────────────────────────

export function startTestRun(
  tenantId: string,
  partnerId: string,
  triggeredBy: string
): IntegrationTestRun | undefined {
  const partner = getPartner(tenantId, partnerId);
  if (!partner) return undefined;
  const id = randomUUID();
  const run: IntegrationTestRun = {
    id,
    partnerId,
    tenantId,
    status: "running",
    startedAt: new Date().toISOString(),
    triggeredBy,
    results: [],
  };

  // Run connectivity checks
  const partnerEndpoints = listEndpoints(tenantId, partnerId);
  const partnerCredentials = listCredentialRefs(tenantId, partnerId);
  const partnerRoutes = listRoutes(tenantId, partnerId);

  // Check 1: Has at least one endpoint
  run.results.push({
    check: "has_endpoint",
    passed: partnerEndpoints.length > 0,
    detail: partnerEndpoints.length > 0
      ? `${partnerEndpoints.length} endpoint(s) configured`
      : "No endpoints configured",
    durationMs: 0,
  });

  // Check 2: Has at least one credential ref
  run.results.push({
    check: "has_credentials",
    passed: partnerCredentials.length > 0,
    detail: partnerCredentials.length > 0
      ? `${partnerCredentials.length} credential ref(s) configured`
      : "No credential refs configured",
    durationMs: 0,
  });

  // Check 3: Has at least one route
  run.results.push({
    check: "has_routes",
    passed: partnerRoutes.length > 0,
    detail: partnerRoutes.length > 0
      ? `${partnerRoutes.length} route(s) configured`
      : "No routes configured",
    durationMs: 0,
  });

  // Check 4: Endpoint addresses are not empty
  const validAddresses = partnerEndpoints.every((e) => e.address && e.address.trim().length > 0);
  run.results.push({
    check: "valid_addresses",
    passed: validAddresses,
    detail: validAddresses ? "All endpoint addresses are non-empty" : "Some endpoints have empty addresses",
    durationMs: 0,
  });

  // Summarize
  const passed = run.results.every((r) => r.passed);
  run.status = passed ? "passed" : "failed";
  run.completedAt = new Date().toISOString();
  run.summary = passed
    ? `All ${run.results.length} checks passed`
    : `${run.results.filter((r) => !r.passed).length} of ${run.results.length} checks failed`;

  testRuns.set(id, run);
  return run;
}

export function getTestRun(tenantId: string, runId: string): IntegrationTestRun | undefined {
  const run = testRuns.get(runId);
  return run && run.tenantId === tenantId ? run : undefined;
}

export function listTestRuns(tenantId: string, partnerId: string): IntegrationTestRun[] {
  return [...testRuns.values()]
    .filter((r) => r.tenantId === tenantId && r.partnerId === partnerId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

// ─── Store Stats (for store-policy) ──────────────────────────────────

export function getControlPlaneStats() {
  return {
    partners: partners.size,
    endpoints: endpoints.size,
    credentialRefs: credentialRefs.size,
    routes: routes.size,
    testRuns: testRuns.size,
  };
}
