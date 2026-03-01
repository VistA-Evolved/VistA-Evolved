/**
 * Clinical Writeback Command Bus — Routes
 *
 * Phase 300 (W12-P2): REST endpoints for submitting and querying writeback commands.
 *
 * Endpoints:
 *   POST /writeback/commands       — Submit a command
 *   GET  /writeback/commands       — List commands (filtered)
 *   GET  /writeback/commands/:id   — Get command detail
 *   POST /writeback/commands/:id/process — Process a pending command (admin/worker)
 *   GET  /writeback/gates          — Get feature gate summary
 *   GET  /writeback/stats          — Get command store statistics
 */

import type { FastifyInstance } from "fastify";
import { createHash } from "crypto";
import { submitCommand, processCommand, getCommandDetail, reviewCommand } from "./command-bus.js";
import { listCommands, getCommandStoreStats } from "./command-store.js";
import { getWritebackGateSummary } from "./gates.js";
import { runCertification, getCertificationSummary } from "./certification-runner.js";
import type { WritebackDomain, WritebackIntent, SubmitCommandRequest } from "./types.js";
import { INTENT_DOMAIN_MAP } from "./types.js";

/* ------------------------------------------------------------------ */
/* Valid values for runtime validation                                  */
/* ------------------------------------------------------------------ */

const VALID_DOMAINS = new Set<string>(["TIU", "ORDERS", "PHARM", "LAB", "ADT", "IMG"]);
const VALID_INTENTS = new Set<string>(Object.keys(INTENT_DOMAIN_MAP));

/* ------------------------------------------------------------------ */
/* Plugin                                                               */
/* ------------------------------------------------------------------ */

export default async function writebackRoutes(server: FastifyInstance): Promise<void> {
  /**
   * POST /writeback/commands — Submit a writeback command.
   * Requires session (admin or provider).
   */
  server.post("/writeback/commands", async (request, reply) => {
    const body = (request.body as any) || {};

    // Validate required fields
    const { domain, intent, payload, idempotencyKey, patientDfn, forceDryRun } = body;

    if (!domain || !VALID_DOMAINS.has(domain)) {
      return reply.code(400).send({
        ok: false,
        error: `Invalid domain. Must be one of: ${[...VALID_DOMAINS].join(", ")}`,
      });
    }

    if (!intent || !VALID_INTENTS.has(intent)) {
      return reply.code(400).send({
        ok: false,
        error: `Invalid intent. Must be one of: ${[...VALID_INTENTS].join(", ")}`,
      });
    }

    if (!idempotencyKey || typeof idempotencyKey !== "string") {
      return reply.code(400).send({
        ok: false,
        error: "idempotencyKey is required (string)",
      });
    }

    if (!payload || typeof payload !== "object") {
      return reply.code(400).send({
        ok: false,
        error: "payload is required (object)",
      });
    }

    // Hash the patient DFN (never store raw)
    const patientRefHash = patientDfn
      ? createHash("sha256").update(String(patientDfn)).digest("hex").slice(0, 16)
      : "unknown";

    // Extract session info
    const session = (request as any).session || {};
    const tenantId = session.tenantId || "default";
    const createdBy = session.duz || session.userId || "anon";

    const req: SubmitCommandRequest = {
      tenantId,
      patientRefHash,
      domain: domain as WritebackDomain,
      intent: intent as WritebackIntent,
      payload,
      idempotencyKey,
      createdBy,
      correlationId: (request.headers["x-correlation-id"] as string) || undefined,
      forceDryRun: !!forceDryRun,
    };

    const result = submitCommand(req);

    const statusCode = result.status === "rejected" ? 422 : result.status === "pending" ? 202 : 200;
    return reply.code(statusCode).send({ ok: result.status !== "rejected", ...result });
  });

  /**
   * GET /writeback/commands — List commands with optional filters.
   */
  server.get("/writeback/commands", async (request, reply) => {
    const query = (request.query as any) || {};
    const session = (request as any).session || {};
    const tenantId = session.tenantId || "default";

    const result = listCommands({
      tenantId,
      domain: query.domain,
      status: query.status,
      limit: query.limit ? parseInt(query.limit, 10) : 50,
      offset: query.offset ? parseInt(query.offset, 10) : 0,
    });

    return reply.send({ ok: true, ...result });
  });

  /**
   * GET /writeback/commands/:id — Get command detail (command + attempts + result).
   */
  server.get("/writeback/commands/:id", async (request, reply) => {
    const { id } = request.params as any;
    const detail = getCommandDetail(id);

    if (!detail.command) {
      return reply.code(404).send({ ok: false, error: "Command not found" });
    }

    return reply.send({
      ok: true,
      command: detail.command,
      attempts: detail.attempts,
      result: detail.result,
    });
  });

  /**
   * POST /writeback/commands/:id/process — Process a pending command (admin trigger).
   */
  server.post("/writeback/commands/:id/process", async (request, reply) => {
    const { id } = request.params as any;
    const result = await processCommand(id);

    const statusCode = result.status === "failed" ? 500 : 200;
    return reply.code(statusCode).send({ ok: result.status !== "failed", ...result });
  });

  /**
   * POST /writeback/commands/:id/review — Approve or reject a supervised command (Phase 437).
   * Body: { decision: "approve" | "reject", reason?: string }
   */
  server.post("/writeback/commands/:id/review", async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const { decision, reason } = body;

    if (!decision || (decision !== "approve" && decision !== "reject")) {
      return reply.code(400).send({ ok: false, error: 'decision must be "approve" or "reject"' });
    }

    const session = (request as any).session || {};
    const reviewerDuz = session.duz || session.userId || "anon";

    const result = await reviewCommand(id, decision, reviewerDuz, reason);
    const statusCode = result.status === "failed" || result.status === "rejected" ? 422 : 200;
    return reply.code(statusCode).send({ ok: result.status !== "failed" && result.status !== "rejected", ...result });
  });

  /**
   * GET /writeback/gates — Get feature gate summary.
   */
  server.get("/writeback/gates", async (request, reply) => {
    const session = (request as any).session || {};
    const tenantId = session.tenantId || "default";
    const summary = getWritebackGateSummary(tenantId);
    return reply.send({ ok: true, ...summary });
  });

  /**
   * GET /writeback/stats — Get command store statistics.
   */
  server.get("/writeback/stats", async (request, reply) => {
    const stats = getCommandStoreStats();
    return reply.send({ ok: true, ...stats });
  });

  /**
   * GET /writeback/certification — Run full departmental certification (admin only).
   * Non-destructive: all checks are read-only or dry-run mode.
   */
  server.get("/writeback/certification", async (request, reply) => {
    const report = runCertification();
    return reply.send({ ok: report.overallStatus !== "not_certified", ...report });
  });

  /**
   * GET /writeback/certification/summary — Quick health check (lightweight).
   */
  server.get("/writeback/certification/summary", async (request, reply) => {
    const summary = getCertificationSummary();
    return reply.send({ ok: true, ...summary });
  });
}
