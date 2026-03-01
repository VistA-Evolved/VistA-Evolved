/**
 * External Validation Routes (Phase 374 / W20-P5)
 *
 * Admin endpoints for external validation harness:
 * - Vulnerability triage workflow
 * - Endpoint inventory generation
 * - Scope document generation
 * - Vulnerability summary dashboard
 */

import type { FastifyInstance } from "fastify";
import {
  submitVulnerability,
  assessVulnerability,
  triageVulnerability,
  getVulnerability,
  listVulnerabilities,
  generateEndpointInventory,
  generateScopeDocument,
  getVulnSummary,
} from "../services/external-validation-service.js";
import type { VulnSeverity } from "../services/external-validation-service.js";

const DEFAULT_TENANT = "default";

function getTenantId(request: { headers: Record<string, string | string[] | undefined> }): string {
  return (request.headers["x-tenant-id"] as string) || DEFAULT_TENANT;
}

export default async function externalValidationRoutes(server: FastifyInstance): Promise<void> {
  /* ============================================================= */
  /* Vulnerabilities                                                */
  /* ============================================================= */

  server.post("/external-validation/vulnerabilities", async (request, reply) => {
    const tenantId = getTenantId(request);
    const body = (request.body as Record<string, unknown>) || {};
    if (!body.title || !body.description || !body.severity || !body.reportedBy) {
      return reply.code(400).send({ ok: false, error: "title, description, severity, reportedBy required" });
    }
    const vuln = submitVulnerability(tenantId, {
      title: body.title as string,
      description: body.description as string,
      severity: body.severity as VulnSeverity,
      reportedBy: body.reportedBy as string,
      cveId: body.cveId as string | undefined,
      cweName: body.cweName as string | undefined,
      affectedEndpoint: body.affectedEndpoint as string | undefined,
    });
    return reply.code(201).send({ ok: true, vulnerability: vuln });
  });

  server.get("/external-validation/vulnerabilities", async (request, reply) => {
    const tenantId = getTenantId(request);
    const q = request.query as Record<string, string>;
    const vulns = listVulnerabilities(tenantId, q.severity as VulnSeverity | undefined);
    return reply.send({ ok: true, vulnerabilities: vulns, count: vulns.length });
  });

  server.get("/external-validation/vulnerabilities/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const vuln = getVulnerability(id);
    if (!vuln) return reply.code(404).send({ ok: false, error: "Vulnerability not found" });
    return reply.send({ ok: true, vulnerability: vuln });
  });

  server.post("/external-validation/vulnerabilities/:id/triage", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as Record<string, unknown>) || {};
    if (!body.assessedBy) return reply.code(400).send({ ok: false, error: "assessedBy required" });
    const vuln = triageVulnerability(id, body.assessedBy as string);
    if (!vuln) return reply.code(400).send({ ok: false, error: "Cannot triage vulnerability" });
    return reply.send({ ok: true, vulnerability: vuln });
  });

  server.post("/external-validation/vulnerabilities/:id/assess", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as Record<string, unknown>) || {};
    if (!body.status || !body.assessedBy) {
      return reply.code(400).send({ ok: false, error: "status, assessedBy required" });
    }
    const vuln = assessVulnerability(id, {
      status: body.status as "accepted" | "rejected" | "mitigated" | "false_positive",
      assessedBy: body.assessedBy as string,
      notes: body.notes as string | undefined,
      mitigationPlan: body.mitigationPlan as string | undefined,
    });
    if (!vuln) return reply.code(404).send({ ok: false, error: "Vulnerability not found" });
    return reply.send({ ok: true, vulnerability: vuln });
  });

  /* ============================================================= */
  /* Endpoint Inventory                                             */
  /* ============================================================= */

  server.get("/external-validation/endpoint-inventory", async (_request, reply) => {
    const endpoints = generateEndpointInventory();
    return reply.send({ ok: true, endpoints, count: endpoints.length });
  });

  /* ============================================================= */
  /* Scope Document                                                 */
  /* ============================================================= */

  server.get("/external-validation/scope-document", async (request, reply) => {
    const tenantId = getTenantId(request);
    const doc = generateScopeDocument(tenantId);
    return reply.send({ ok: true, scopeDocument: doc });
  });

  /* ============================================================= */
  /* Summary                                                        */
  /* ============================================================= */

  server.get("/external-validation/summary", async (request, reply) => {
    const tenantId = getTenantId(request);
    const summary = getVulnSummary(tenantId);
    return reply.send({ ok: true, summary });
  });
}
