/**
 * Certification Pipeline Routes — Phase 323 (W14-P7)
 *
 * 16 REST endpoints for integration certification:
 *  - Suite CRUD: create, list, get, activate, deprecate
 *  - Runs: start, record-result, complete, get, list
 *  - Certificates: issue, get, list, verify, revoke, suspend/reinstate
 *  - Stats dashboard
 */

import { FastifyInstance } from "fastify";
import {
  createSuite,
  getSuite,
  listSuites,
  updateSuiteStatus,
  startCertificationRun,
  recordTestResult,
  completeCertificationRun,
  getCertificationRun,
  listCertificationRuns,
  issueCertificate,
  getCertificate,
  listCertificates,
  verifyCertificate,
  revokeCertificate,
  suspendCertificate,
  reinstateCertificate,
  getCertificationStats,
  seedBuiltInSuites,
  type SuiteCategory,
  type TestResult,
} from "../services/certification-pipeline.js";

export default async function certificationPipelineRoutes(server: FastifyInstance): Promise<void> {
  // Seed built-in suites on first load
  seedBuiltInSuites();

  /* ── Suite endpoints ─────────────────────────────────────────── */

  server.post("/certification/suites", async (request, reply) => {
    const body = (request.body as any) || {};
    const { name, version, description, categories, testCases, passingScore, categoryMinScores } = body;
    if (!name || !version || !testCases?.length) {
      return reply.code(400).send({ ok: false, error: "name, version, and testCases[] required" });
    }
    const suite = createSuite({
      name,
      version,
      description: description || "",
      categories: categories || [],
      testCases,
      passingScore: passingScore ?? 70,
      categoryMinScores: categoryMinScores || {},
      status: "draft",
    });
    return reply.code(201).send({ ok: true, suite });
  });

  server.get("/certification/suites", async (request) => {
    const query = request.query as any;
    return { ok: true, suites: listSuites({ status: query.status, category: query.category }) };
  });

  server.get("/certification/suites/:id", async (request, reply) => {
    const { id } = request.params as any;
    const suite = getSuite(id);
    if (!suite) return reply.code(404).send({ ok: false, error: "suite_not_found" });
    return { ok: true, suite };
  });

  server.post("/certification/suites/:id/activate", async (request, reply) => {
    const { id } = request.params as any;
    if (!updateSuiteStatus(id, "active")) {
      return reply.code(404).send({ ok: false, error: "suite_not_found" });
    }
    return { ok: true, status: "active" };
  });

  server.post("/certification/suites/:id/deprecate", async (request, reply) => {
    const { id } = request.params as any;
    if (!updateSuiteStatus(id, "deprecated")) {
      return reply.code(404).send({ ok: false, error: "suite_not_found" });
    }
    return { ok: true, status: "deprecated" };
  });

  /* ── Certification Run endpoints ─────────────────────────────── */

  server.post("/certification/runs", async (request, reply) => {
    const body = (request.body as any) || {};
    const { suiteId, partnerId, partnerName, endpointId, runBy } = body;
    if (!suiteId || !partnerId || !partnerName) {
      return reply.code(400).send({ ok: false, error: "suiteId, partnerId, and partnerName required" });
    }
    try {
      const run = startCertificationRun({ suiteId, partnerId, partnerName, endpointId, runBy });
      return reply.code(201).send({ ok: true, run });
    } catch (err: any) {
      return reply.code(400).send({ ok: false, error: err.message });
    }
  });

  server.post("/certification/runs/:runId/results", async (request, reply) => {
    const { runId } = request.params as any;
    const body = (request.body as any) || {};
    const { testCaseId, result, message, evidence, durationMs } = body;
    if (!testCaseId || !result) {
      return reply.code(400).send({ ok: false, error: "testCaseId and result required" });
    }
    const validResults: TestResult[] = ["pass", "fail", "skip", "error"];
    if (!validResults.includes(result)) {
      return reply.code(400).send({ ok: false, error: `result must be: ${validResults.join(", ")}` });
    }
    const ok = recordTestResult(runId, testCaseId, result, { message, evidence, durationMs });
    if (!ok) return reply.code(404).send({ ok: false, error: "run_or_test_case_not_found" });
    return { ok: true };
  });

  server.post("/certification/runs/:runId/complete", async (request, reply) => {
    const { runId } = request.params as any;
    const run = completeCertificationRun(runId);
    if (!run) return reply.code(404).send({ ok: false, error: "run_not_found_or_not_running" });
    return { ok: true, run };
  });

  server.get("/certification/runs/:runId", async (request, reply) => {
    const { runId } = request.params as any;
    const run = getCertificationRun(runId);
    if (!run) return reply.code(404).send({ ok: false, error: "run_not_found" });
    return { ok: true, run };
  });

  server.get("/certification/runs", async (request) => {
    const query = request.query as any;
    return {
      ok: true,
      runs: listCertificationRuns({
        partnerId: query.partnerId,
        suiteId: query.suiteId,
        passed: query.passed === "true" ? true : query.passed === "false" ? false : undefined,
      }),
    };
  });

  /* ── Certificate endpoints ────────────────────────────────────── */

  server.post("/certification/certificates", async (request, reply) => {
    const body = (request.body as any) || {};
    const { runId, validityDays } = body;
    if (!runId) return reply.code(400).send({ ok: false, error: "runId required" });
    try {
      const cert = issueCertificate(runId, validityDays);
      return reply.code(201).send({ ok: true, certificate: cert });
    } catch (err: any) {
      return reply.code(400).send({ ok: false, error: err.message });
    }
  });

  server.get("/certification/certificates/:id", async (request, reply) => {
    const { id } = request.params as any;
    const cert = getCertificate(id);
    if (!cert) return reply.code(404).send({ ok: false, error: "certificate_not_found" });
    return { ok: true, certificate: cert };
  });

  server.get("/certification/certificates", async (request) => {
    const query = request.query as any;
    return {
      ok: true,
      certificates: listCertificates({ partnerId: query.partnerId, status: query.status }),
    };
  });

  server.get("/certification/certificates/:id/verify", async (request) => {
    const { id } = request.params as any;
    const result = verifyCertificate(id);
    return { ok: true, verification: result };
  });

  server.post("/certification/certificates/:id/revoke", async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    if (!body.reason) return reply.code(400).send({ ok: false, error: "reason required" });
    if (!revokeCertificate(id, body.reason)) {
      return reply.code(404).send({ ok: false, error: "certificate_not_found_or_not_active" });
    }
    return { ok: true, status: "revoked" };
  });

  server.post("/certification/certificates/:id/suspend", async (request, reply) => {
    const { id } = request.params as any;
    if (!suspendCertificate(id)) {
      return reply.code(404).send({ ok: false, error: "certificate_not_found_or_not_active" });
    }
    return { ok: true, status: "suspended" };
  });

  server.post("/certification/certificates/:id/reinstate", async (request, reply) => {
    const { id } = request.params as any;
    if (!reinstateCertificate(id)) {
      return reply.code(404).send({ ok: false, error: "certificate_not_found_or_not_suspended" });
    }
    return { ok: true, status: "active" };
  });

  /* ── Stats ─────────────────────────────────────────────────────── */

  server.get("/certification/stats", async () => {
    return { ok: true, stats: getCertificationStats() };
  });
}
